const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const { isEmployeeEligibleForCycle } = require('../utils/eligibility');

const getEmployeeReport = async (req, res) => {
  try {
    const { id: employeeId } = req.params;
    
    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format.' });
    }
    
    // Auth Check: Employees can only view their own report
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ message: 'Forbidden. You can only view your own report.' });
    }

    // Auth Check: Reporting Managers can only view reports for employees in their assigned department
    if (req.user.role === 'manager') {
      const targetEmp = await User.findById(employeeId);
      if (!targetEmp) return res.status(404).json({ message: 'Employee not found.' });
      const targetDeptId = targetEmp.departmentId?._id || targetEmp.departmentId;
      const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
      if (!targetDeptId || !mgrDeptId || targetDeptId.toString() !== mgrDeptId.toString()) {
        return res.status(403).json({ message: 'Forbidden. You can only view reports for employees in your assigned department.' });
      }
    }

    const employee = await User.findById(employeeId)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName email employeeCode' })
      .select('-passwordHash -refreshToken');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Get all review scores
    const scores = await ReviewScore.find({ employeeId })
      .populate({ path: 'reviewCycleId', select: 'reviewMonth status startDate endDate cycleType' })
      .sort('reviewCycleId.reviewMonth');

    // Get all assessments & reviews for detail mapping
    const selfAssessments = await SelfAssessment.find({ employeeId });
    const managerReviews = await ManagerReview.find({ employeeId })
      .populate({ path: 'managerId', select: 'firstName lastName' });

    res.json({
      employee,
      scores,
      selfAssessments,
      managerReviews
    });
  } catch (error) {
    console.error('getEmployeeReport error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getDepartmentReport = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const { reviewCycleId } = req.query;

    if (!mongoose.isValidObjectId(departmentId)) {
      return res.status(400).json({ message: 'Invalid department ID format.' });
    }
    if (reviewCycleId && !mongoose.isValidObjectId(reviewCycleId)) {
      return res.status(400).json({ message: 'Invalid review cycle ID format.' });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Role boundary check: Reporting Managers can ONLY view reports for their assigned department
    if (req.user.role === 'manager') {
      const userDeptId = req.user.departmentId?._id || req.user.departmentId;
      if (!userDeptId || userDeptId.toString() !== departmentId.toString()) {
        return res.status(403).json({ message: 'Forbidden. You can only view reports for your assigned department.' });
      }
    }

    let targetRole = null;
    if (reviewCycleId) {
      const cycle = await ReviewCycle.findById(reviewCycleId);
      if (cycle) targetRole = cycle.targetRole;
    }

    const employeeFilter = { departmentId, employmentStatus: 'active' };
    if (targetRole === 'manager') {
      employeeFilter.role = { $in: ['manager', 'hr'] };
    } else if (targetRole === 'employee') {
      employeeFilter.role = 'employee';
    } else {
      employeeFilter.role = { $ne: 'admin' };
    }

    // Get all eligible employees of the department for this target role
    const employees = await User.find(employeeFilter);
    const employeeIds = employees.map(emp => emp._id);

    const matchFilter = { employeeId: { $in: employeeIds } };
    if (reviewCycleId) {
      matchFilter.reviewCycleId = reviewCycleId;
    }

    // Get scores for these employees
    const scores = await ReviewScore.find(matchFilter)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode designationId role' })
      .populate({ path: 'reviewCycleId', select: 'reviewMonth targetRole' });

    // Calculate aggregated department averages
    let avgFinalScore = 0;
    let avgWorkQuality = 0;
    let avgProductivity = 0;
    let avgTechnical = 0;
    let avgCommunication = 0;
    let avgOwnership = 0;
    let avgLearning = 0;

    if (scores.length > 0) {
      scores.forEach(s => {
        avgFinalScore += s.finalScore;
        avgWorkQuality += s.categoryScores.workQuality || 0;
        avgProductivity += s.categoryScores.productivity || 0;
        avgTechnical += s.categoryScores.technical || 0;
        avgCommunication += s.categoryScores.communication || 0;
        avgOwnership += s.categoryScores.ownership || 0;
        avgLearning += s.categoryScores.learning || 0;
      });

      const count = scores.length;
      avgFinalScore = Math.round((avgFinalScore / count) * 100) / 100;
      avgWorkQuality = Math.round((avgWorkQuality / count) * 100) / 100;
      avgProductivity = Math.round((avgProductivity / count) * 100) / 100;
      avgTechnical = Math.round((avgTechnical / count) * 100) / 100;
      avgCommunication = Math.round((avgCommunication / count) * 100) / 100;
      avgOwnership = Math.round((avgOwnership / count) * 100) / 100;
      avgLearning = Math.round((avgLearning / count) * 100) / 100;
    }

    res.json({
      department: dept,
      employeeCount: employees.length,
      scoresCount: scores.length,
      scores,
      averages: {
        finalScore: avgFinalScore,
        categoryScores: {
          workQuality: avgWorkQuality,
          productivity: avgProductivity,
          technical: avgTechnical,
          communication: avgCommunication,
          ownership: avgOwnership,
          learning: avgLearning
        }
      }
    });
  } catch (error) {
    console.error('getDepartmentReport error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getReviewCompletionReport = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { reviewCycleId } = req.query;

    if (!reviewCycleId) {
      return res.status(400).json({ message: 'reviewCycleId query param is required.' });
    }
    if (!mongoose.isValidObjectId(reviewCycleId)) {
      return res.status(400).json({ message: 'Invalid review cycle ID format.' });
    }

    const cycle = await ReviewCycle.findById(reviewCycleId).populate('kpiTemplateId');
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const template = cycle.kpiTemplateId;
    const filter = { employmentStatus: 'active' };
    if (cycle.targetRole === 'manager') {
      filter.role = { $in: ['manager', 'hr'] };
    } else {
      filter.role = 'employee';
    }
    if (template && template.departmentId) {
      filter.departmentId = template.departmentId;
    }

    // Get all active eligible employees in target department
    let employees = await User.find(filter)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName email' })
      .select('-passwordHash -refreshToken');

    employees = employees.filter(emp =>
      isEmployeeEligibleForCycle(emp.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)
    );

    const completionDetails = [];

    for (const emp of employees) {
      const selfAssessment = await SelfAssessment.findOne({ reviewCycleId, employeeId: emp._id });
      const managerReview = await ManagerReview.findOne({ reviewCycleId, employeeId: emp._id });
      const score = await ReviewScore.findOne({ reviewCycleId, employeeId: emp._id });

      completionDetails.push({
        employee: emp,
        selfAssessmentStatus: selfAssessment ? selfAssessment.status : 'not_started',
        selfAssessmentSubmittedAt: selfAssessment?.submittedAt || null,
        managerReviewStatus: managerReview ? managerReview.status : 'not_started',
        managerReviewSubmittedAt: managerReview?.submittedAt || null,
        isCompleted: !!score,
        finalScore: score?.finalScore || null,
        rating: score?.rating || null
      });
    }

    res.json({
      reviewCycle: cycle,
      completionDetails
    });
  } catch (error) {
    console.error('getReviewCompletionReport error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getEmployeeReport,
  getDepartmentReport,
  getReviewCompletionReport
};
