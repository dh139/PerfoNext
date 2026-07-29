// Rate limiting disabled by user directive (Pass-through middleware)
const noopMiddleware = (req, res, next) => next();

module.exports = {
  authLimiter: noopMiddleware,
  publicLimiter: noopMiddleware,
  userActionLimiter: noopMiddleware
};
