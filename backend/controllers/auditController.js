const AuditLog = require('../models/AuditLog');

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate({ path: 'userId', select: 'firstName lastName email employeeCode role' })
      .populate({ path: 'reviewCycleId', select: 'title reviewMonth' })
      .populate({ path: 'departmentId', select: 'name' })
      .sort('-createdAt');
    res.json(logs);
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getAuditLogs };
