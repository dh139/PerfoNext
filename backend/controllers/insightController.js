const { getAiInsights, regenerateAiInsights } = require('../services/insightService');
const User = require('../models/User');

const checkManagerAccess = async (reqUser, targetEmployeeId) => {
  if (reqUser.role === 'manager') {
    const targetEmp = await User.findById(targetEmployeeId);
    if (!targetEmp) return false;
    const targetDeptId = targetEmp.departmentId?._id || targetEmp.departmentId;
    const mgrDeptId = reqUser.departmentId?._id || reqUser.departmentId;
    if (!targetDeptId || !mgrDeptId || targetDeptId.toString() !== mgrDeptId.toString()) {
      return false;
    }
  }
  return true;
};

const getEmployeeInsights = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { cycleId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required.' });
    }

    if (!(await checkManagerAccess(req.user, employeeId))) {
      return res.status(403).json({ message: 'Forbidden. You can only view AI insights for employees in your assigned department.' });
    }

    const insights = await getAiInsights(employeeId, cycleId);
    res.json(insights);
  } catch (error) {
    console.error('getEmployeeInsights controller error:', error);
    res.status(500).json({ message: error.message || 'Failed to compile AI insights.' });
  }
};

const getEmployeeCycleInsights = async (req, res) => {
  try {
    const { cycleId, employeeId } = req.params;
    if (!employeeId || !cycleId) {
      return res.status(400).json({ message: 'Employee ID and Cycle ID are required.' });
    }

    if (!(await checkManagerAccess(req.user, employeeId))) {
      return res.status(403).json({ message: 'Forbidden. You can only view AI insights for employees in your assigned department.' });
    }

    const insights = await getAiInsights(employeeId, cycleId);
    res.json(insights);
  } catch (error) {
    console.error('getEmployeeCycleInsights controller error:', error);
    res.status(500).json({ message: error.message || 'Failed to compile AI insights.' });
  }
};

const regenerateEmployeeCycleInsights = async (req, res) => {
  try {
    const { cycleId, employeeId } = req.params;
    if (!employeeId || !cycleId) {
      return res.status(400).json({ message: 'Employee ID and Cycle ID are required.' });
    }

    if (!(await checkManagerAccess(req.user, employeeId))) {
      return res.status(403).json({ message: 'Forbidden. You can only regenerate AI insights for employees in your assigned department.' });
    }

    const insights = await regenerateAiInsights(employeeId, cycleId);
    res.json(insights);
  } catch (error) {
    console.error('regenerateEmployeeCycleInsights controller error:', error);
    res.status(500).json({ message: error.message || 'Failed to regenerate AI insights.' });
  }
};

module.exports = {
  getEmployeeInsights,
  getEmployeeCycleInsights,
  regenerateEmployeeCycleInsights
};
