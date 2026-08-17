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

    const { checkAndCalculateScores } = require('./cycleController');
    const submittedReviews = await ManagerReview.find({ employeeId, status: 'submitted' });
    for (const mr of submittedReviews) {
      if (mr.reviewCycleId) {
        await checkAndCalculateScores(mr.reviewCycleId, employeeId);
      }
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
      employeeFilter.role = { $in: ['manager', 'hr', 'admin'] };
    } else if (targetRole === 'employee') {
      employeeFilter.role = 'employee';
    } else {
      // Include all departmental roles including admin
      employeeFilter.role = { $in: ['employee', 'manager', 'hr', 'admin'] };
    }

    // Get all eligible employees of the department for this target role
    const employees = await User.find(employeeFilter)
      .populate('designationId departmentId')
      .select('firstName lastName employeeCode designationId departmentId role profilePhoto gender');

    const employeeIds = employees.map(emp => emp._id);

    const matchFilter = { employeeId: { $in: employeeIds } };
    if (reviewCycleId) {
      matchFilter.reviewCycleId = reviewCycleId;
    }

    // Get scores for these employees
    const scores = await ReviewScore.find(matchFilter)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode designationId role profilePhoto gender' })
      .populate({ path: 'reviewCycleId', select: 'reviewMonth targetRole' });

    // Build map of existing scores
    const scoreMap = new Map();
    scores.forEach(s => {
      if (s.employeeId?._id) {
        scoreMap.set(s.employeeId._id.toString(), s);
      }
    });

    // Merge employees without scores as Pending Evaluation
    const allScores = employees.map(emp => {
      const existingScore = scoreMap.get(emp._id.toString());
      if (existingScore) {
        return existingScore;
      }
      return {
        _id: `pending-${emp._id}`,
        employeeId: emp,
        reviewCycleId: reviewCycleId || null,
        finalScore: null,
        rating: 'Pending Evaluation',
        isPending: true,
        categoryScores: {
          communication: 0,
          ownership: 0,
          leadership: 0,
          teamwork: 0,
          learning: 0,
          problemSolving: 0
        }
      };
    });

    // Calculate aggregated department averages based on computed scores
    let avgFinalScore = 0;
    let avgCommunication = 0;
    let avgOwnership = 0;
    let avgLeadership = 0;
    let avgTeamwork = 0;
    let avgLearning = 0;
    let avgProblemSolving = 0;

    if (scores.length > 0) {
      scores.forEach(s => {
        avgFinalScore += s.finalScore;
        avgCommunication += s.categoryScores?.communication || s.finalScore || 0;
        avgOwnership += s.categoryScores?.ownership || s.finalScore || 0;
        avgLeadership += s.categoryScores?.leadership || s.categoryScores?.productivity || s.finalScore || 0;
        avgTeamwork += s.categoryScores?.teamwork || s.categoryScores?.workQuality || s.finalScore || 0;
        avgLearning += s.categoryScores?.learning || s.finalScore || 0;
        avgProblemSolving += s.categoryScores?.problemSolving || s.categoryScores?.technical || s.finalScore || 0;
      });

      const count = scores.length;
      avgFinalScore = Math.round((avgFinalScore / count) * 100) / 100;
      avgCommunication = Math.round((avgCommunication / count) * 100) / 100;
      avgOwnership = Math.round((avgOwnership / count) * 100) / 100;
      avgLeadership = Math.round((avgLeadership / count) * 100) / 100;
      avgTeamwork = Math.round((avgTeamwork / count) * 100) / 100;
      avgLearning = Math.round((avgLearning / count) * 100) / 100;
      avgProblemSolving = Math.round((avgProblemSolving / count) * 100) / 100;
    }

    res.json({
      department: dept,
      employeeCount: employees.length,
      scoresCount: scores.length,
      scores: allScores,
      averages: {
        finalScore: avgFinalScore,
        categoryScores: {
          communication: avgCommunication,
          ownership: avgOwnership,
          leadership: avgLeadership,
          teamwork: avgTeamwork,
          learning: avgLearning,
          problemSolving: avgProblemSolving
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

    const cycle = await ReviewCycle.findById(reviewCycleId).populate('departmentId kpiTemplateId');
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const template = cycle.kpiTemplateId;
    const filter = { employmentStatus: 'active' };
    if (cycle.targetRole === 'manager') {
      filter.role = { $in: ['manager', 'hr', 'admin'] };
    } else {
      filter.role = 'employee';
    }

    const targetDeptId = cycle.departmentId?._id || cycle.departmentId || (template && (template.departmentId?._id || template.departmentId));
    if (targetDeptId) {
      filter.departmentId = targetDeptId;
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
