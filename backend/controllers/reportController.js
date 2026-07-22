const User = require('../models/User');
const Department = require('../models/Department');
const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');

const getEmployeeReport = async (req, res) => {
  try {
    const { id: employeeId } = req.params;
    
    // Auth Check: Employees can only view their own report
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ message: 'Forbidden. You can only view your own report.' });
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
      .populate({ path: 'reviewCycleId', select: 'reviewMonth status startDate endDate' })
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

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Get all employees of the department
    const employees = await User.find({ departmentId, employmentStatus: 'active' });
    const employeeIds = employees.map(emp => emp._id);

    const matchFilter = { employeeId: { $in: employeeIds } };
    if (reviewCycleId) {
      matchFilter.reviewCycleId = reviewCycleId;
    }

    // Get scores for these employees
    const scores = await ReviewScore.find(matchFilter)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode designationId' })
      .populate({ path: 'reviewCycleId', select: 'reviewMonth' });

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
    const { reviewCycleId } = req.query;

    if (!reviewCycleId) {
      return res.status(400).json({ message: 'reviewCycleId query param is required.' });
    }

    const cycle = await ReviewCycle.findById(reviewCycleId).populate('kpiTemplateId');
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const template = cycle.kpiTemplateId;
    const filter = { employmentStatus: 'active', role: { $ne: 'admin' } };
    if (template && template.departmentId) {
      filter.departmentId = template.departmentId;
    }

    // Get all active employees in target department (excluding admins)
    const employees = await User.find(filter)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName email' })
      .select('-passwordHash -refreshToken');

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
