const AuditLog = require('../models/AuditLog');

const logAction = async ({ userId, action, entityType, entityId, before = null, after = null, ipAddress = '' }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      before,
      after,
      ipAddress
    });
  } catch (error) {
    console.error('Audit Log Error:', error.message);
  }
};

module.exports = { logAction };
