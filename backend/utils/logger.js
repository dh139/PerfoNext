const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Enterprise Audit Logger Utility
 * Accepts req or explicit parameters and creates immutable self-contained audit entries.
 */
const logAction = async ({
  req = null,
  userId = null,
  actor = null,
  action,
  module = 'General',
  status = 'SUCCESS',
  reason = '',
  entityType = 'System',
  entityId = null,
  reviewCycleId = null,
  departmentId = null,
  departmentName = '',
  before = null,
  after = null,
  ipAddress = '',
  userAgent = '',
  endpoint = '',
  method = ''
}) => {
  try {
    // Determine IP address (support proxy headers and Express req)
    let reqIp = ipAddress;
    if (!reqIp && req) {
      reqIp = req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || '';
    }

    // Determine User Agent
    let reqAgent = userAgent;
    if (!reqAgent && req) {
      reqAgent = req.headers['user-agent'] || '';
    }

    // Determine Request Telemetry
    let reqEndpoint = endpoint || (req ? req.originalUrl || req.url || '' : '');
    let reqMethod = method || (req ? req.method || '' : '');
    let reqId = req?.requestId || `REQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    let effectiveUserId = userId || (req?.user?.id || req?.user?._id);
    let actorSnapshot = actor;

    // Fetch Actor Snapshot if not provided explicitly
    if (!actorSnapshot && effectiveUserId) {
      const u = await User.findById(effectiveUserId).populate('departmentId');
      if (u) {
        actorSnapshot = {
          id: u._id,
          employeeCode: u.employeeCode || '',
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role
        };
        if (!departmentId && u.departmentId) {
          departmentId = u.departmentId._id;
          departmentName = u.departmentId.name || '';
        }
      }
    }

    // Fallback actor for system operations
    if (!actorSnapshot) {
      actorSnapshot = {
        name: 'System Automated Engine',
        role: 'system',
        employeeCode: 'SYS'
      };
    }

    await AuditLog.create({
      userId: effectiveUserId || null,
      actor: actorSnapshot,
      action: action || 'UNKNOWN_ACTION',
      module,
      status: status ? status.toUpperCase() : 'SUCCESS',
      reason,
      entityType: entityType || 'System',
      entityId,
      reviewCycleId,
      departmentId,
      departmentName,
      endpoint: reqEndpoint,
      method: reqMethod,
      ipAddress: reqIp,
      userAgent: reqAgent,
      requestId: reqId,
      before,
      after
    });
  } catch (error) {
    console.error('Audit Log Error:', error.message);
  }
};

module.exports = { logAction };
