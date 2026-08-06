const Recognition = require('../models/Recognition');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ReviewCycle = require('../models/ReviewCycle');
const { logAction } = require('../utils/logger');

const getRecognitions = async (req, res) => {
  try {
    const { employeeId, cycleId } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (cycleId) filter.cycleId = cycleId;

    const recognitions = await Recognition.find(filter)
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId' })
      .populate('cycleId')
      .populate({ path: 'awardedBy', select: 'firstName lastName email' });

    res.json(recognitions);
  } catch (error) {
    console.error('getRecognitions error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createRecognition = async (req, res) => {
  try {
    const { employeeId, cycleId, category, comments, awardedAt } = req.body;
    const targetEmp = await User.findById(employeeId);
    if (!targetEmp) return res.status(404).json({ message: 'Target employee not found.' });

    // Validate Award Permission Matrix:
    // 1. Employee -> Awarded by Reporting Manager (in assigned dept), HR, or CEO/Admin
    // 2. Reporting Manager -> Awarded by CEO / Management or HR
    // 3. HR Manager -> Awarded by CEO / Management
    const giverRole = req.user.role;
    const recipientRole = targetEmp.role;

    if (recipientRole === 'employee') {
      if (giverRole === 'manager') {
        const targetDeptId = targetEmp.departmentId?._id || targetEmp.departmentId;
        const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
        if (!targetDeptId || !mgrDeptId || targetDeptId.toString() !== mgrDeptId.toString()) {
          return res.status(403).json({ message: 'Forbidden. Reporting Managers can only award employees in their assigned department.' });
        }
      } else if (!['hr', 'executive', 'admin'].includes(giverRole)) {
        return res.status(403).json({ message: 'Forbidden. You are not authorized to award employees.' });
      }
    } else if (recipientRole === 'manager') {
      if (!['hr', 'executive', 'admin'].includes(giverRole)) {
        return res.status(403).json({ message: 'Forbidden. Reporting Managers can only be awarded by CEO / Management or HR.' });
      }
    } else if (recipientRole === 'hr') {
      if (!['executive', 'admin'].includes(giverRole)) {
        return res.status(403).json({ message: 'Forbidden. HR Managers can only be awarded by CEO / Management.' });
      }
    } else {
      return res.status(403).json({ message: 'Forbidden. Cannot grant awards to this role.' });
    }

    // Check if there is an active review cycle
    await ReviewCycle.autoCloseExpiredCycles();
    const activeCycle = await ReviewCycle.findOne({ status: 'active' });
    const isUserAdminOrCEO = req.user.role === 'admin' || req.user.role === 'executive';
    if (!isUserAdminOrCEO && !activeCycle && !cycleId) {
      return res.status(400).json({ message: 'Cannot award recognition when there is no active review cycle.' });
    }

    const recognition = await Recognition.create({
      employeeId,
      cycleId: cycleId || activeCycle?._id || null,
      category,
      comments,
      awardedBy: req.user.id,
      awardedAt: awardedAt ? new Date(awardedAt) : new Date()
    });



    const populated = await Recognition.findById(recognition._id)
      .populate({ path: 'employeeId', select: 'firstName lastName' });

    // Notify Employee
    await Notification.create({
      userId: employeeId,
      type: 'review_completed', // Reused type for accolade updates
      message: `Congratulations! You have been awarded the "${category}" recognition by ${req.user.firstName} ${req.user.lastName}!`
    });

    await logAction({
      userId: req.user.id,
      action: 'review_update',
      entityType: 'Recognition',
      entityId: recognition._id,
      after: recognition.toObject(),
      ipAddress: req.ip || ''
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('createRecognition error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getRecognitions,
  createRecognition
};
