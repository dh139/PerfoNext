/**
 * PerfoNext - Configurable Rate Limiting Middleware Suite
 * 
 * Features:
 * 1. Configurable thresholds via environment variables (with fallback defaults).
 * 2. Auth Routes: Stricter limits with Per-IP & Per-Account tracking + Exponential Backoff (no hard lockout).
 * 3. Public Routes: Moderate limits for public metadata endpoints.
 * 4. Authenticated Actions: Looser limits for authenticated user actions.
 */

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown_ip'
  );
};

const getAccountKey = (req) => {
  const identifier = (
    req.body?.email ||
    req.body?.toEmail ||
    req.body?.employeeCode ||
    req.body?.identifier ||
    req.body?.username ||
    ''
  ).toString().toLowerCase().trim();

  return identifier || 'anonymous_account';
};

// In-memory stores
const authStore = new Map(); // key -> { failures, totalAttempts, lastAttemptTime, windowStart }
const publicStore = new Map(); // ip -> { count, windowStart }
const userActionStore = new Map(); // key -> { count, windowStart }

// Periodic cleanup of expired store entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const authWindow = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10);
  const publicWindow = parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || '900000', 10);
  const userWindow = parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '900000', 10);

  for (const [key, record] of authStore.entries()) {
    if (now - record.windowStart > authWindow) {
      authStore.delete(key);
    }
  }
  for (const [key, record] of publicStore.entries()) {
    if (now - record.windowStart > publicWindow) {
      publicStore.delete(key);
    }
  }
  for (const [key, record] of userActionStore.entries()) {
    if (now - record.windowStart > userWindow) {
      userActionStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Stricter Auth Limiter with Per-IP & Per-Account tracking + Exponential Backoff
 */
const authLimiter = (req, res, next) => {
  const windowMs = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10); // Default: 15 min
  const maxAttempts = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10); // Default: 10 attempts
  const baseBackoffMs = parseInt(process.env.AUTH_BACKOFF_BASE_MS || '1000', 10); // Default: 1 sec
  const backoffFactor = parseFloat(process.env.AUTH_BACKOFF_FACTOR || '2'); // Default: 2x multiplier
  const maxBackoffMs = parseInt(process.env.AUTH_MAX_BACKOFF_MS || '60000', 10); // Default: 60 sec max

  const ip = getClientIp(req);
  const account = getAccountKey(req);
  const compositeKey = `${ip}:${account}`;

  const now = Date.now();
  let record = authStore.get(compositeKey);

  if (!record || (now - record.windowStart > windowMs)) {
    record = { failures: 0, totalAttempts: 0, lastAttemptTime: now, windowStart: now };
    authStore.set(compositeKey, record);
  }

  // Check Exponential Backoff delay based on previous failures
  if (record.failures > 0) {
    const exponent = Math.min(record.failures - 1, 10);
    const requiredBackoffMs = Math.min(maxBackoffMs, Math.round(baseBackoffMs * Math.pow(backoffFactor, exponent)));
    const timeSinceLast = now - record.lastAttemptTime;

    if (timeSinceLast < requiredBackoffMs) {
      const retryAfterSec = Math.ceil((requiredBackoffMs - timeSinceLast) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Reset', new Date(now + (requiredBackoffMs - timeSinceLast)).toISOString());
      return res.status(429).json({
        message: `Too many auth attempts. Please wait ${retryAfterSec} second(s) before retrying (exponential backoff enforced).`,
        retryAfterSeconds: retryAfterSec,
        backoffDelayMs: requiredBackoffMs
      });
    }
  }

  // Check Total Attempts limit in current window
  if (record.totalAttempts >= maxAttempts) {
    const windowRemainingSec = Math.ceil((windowMs - (now - record.windowStart)) / 1000);
    res.setHeader('Retry-After', windowRemainingSec);
    return res.status(429).json({
      message: `Authentication attempt limit reached. Please try again in ${windowRemainingSec} seconds.`,
      retryAfterSeconds: windowRemainingSec
    });
  }

  // Track attempt
  record.totalAttempts += 1;
  record.lastAttemptTime = now;

  // Intercept response finish to update failure vs success
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Successful auth -> Reset failure count for this IP + Account
      authStore.delete(compositeKey);
    } else if (res.statusCode >= 400 && res.statusCode < 500) {
      // Failed auth attempt -> Increment failure count for exponential backoff
      const current = authStore.get(compositeKey);
      if (current) {
        current.failures += 1;
        current.lastAttemptTime = Date.now();
      }
    }
  });

  next();
};

/**
 * Moderate Public Endpoint Limiter (Per-IP)
 */
const publicLimiter = (req, res, next) => {
  const windowMs = parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || '900000', 10); // Default: 15 min
  const maxRequests = parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '60', 10); // Default: 60 req

  const ip = getClientIp(req);
  const now = Date.now();

  let record = publicStore.get(ip);
  if (!record || (now - record.windowStart > windowMs)) {
    record = { count: 0, windowStart: now };
    publicStore.set(ip, record);
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((windowMs - (now - record.windowStart)) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      message: `Public endpoint rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
      retryAfterSeconds: retryAfterSec
    });
  }

  record.count += 1;
  next();
};

/**
 * Looser Authenticated User Action Limiter (Per-User / Per-IP)
 */
const userActionLimiter = (req, res, next) => {
  // Read-only GET requests are exempt from user action rate limiting to allow seamless background polling
  if (req.method === 'GET') {
    return next();
  }

  const windowMs = parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '900000', 10); // Default: 15 min
  const maxRequests = parseInt(process.env.RATE_LIMIT_USER_MAX || '300', 10); // Default: 300 req

  const userKey = req.user?.id ? `user:${req.user.id}` : `ip:${getClientIp(req)}`;
  const now = Date.now();

  let record = userActionStore.get(userKey);
  if (!record || (now - record.windowStart > windowMs)) {
    record = { count: 0, windowStart: now };
    userActionStore.set(userKey, record);
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((windowMs - (now - record.windowStart)) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      message: `Action rate limit exceeded. Please slow down. Retry in ${retryAfterSec} seconds.`,
      retryAfterSeconds: retryAfterSec
    });
  }

  record.count += 1;
  next();
};

module.exports = {
  authLimiter,
  publicLimiter,
  userActionLimiter
};
