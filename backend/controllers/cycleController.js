const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const User = require('../models/User');
const KpiTemplate = require('../models/KpiTemplate');
const Notification = require('../models/Notification');
const { calculateReviewScores } = require('../utils/scoring');
const { logAction } = require('../utils/logger');
const {
  sendReviewCycleStartedEmail,
  sendSelfAssessmentSubmittedEmail,
  sendFinalReportGeneratedEmail
} = require('../services/emailService');

const isEmployeeEligibleForCycle = (joiningDate, cycleType, reviewMonth, startDate) => {
  if (!joiningDate) return false;
  
  const jd = new Date(joiningDate);
  const cycleStart = startDate ? new Date(startDate) : new Date();
  const diffTime = cycleStart - jd;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (cycleType === 'quarterly') {
    // Must have at least 90 days of experience
    return diffDays >= 90;
  }

  if (cycleType === 'annual') {
    // Must have at least 365 days of experience
    return diffDays >= 365;
  }

  // default 'monthly'
  const yearMatch = reviewMonth.match(/^(\d{4})/);
  if (!yearMatch) return true;
  const year = parseInt(yearMatch[1], 10);

  const monthMatch = reviewMonth.match(/-(\d{2})/);
  if (!monthMatch) return true;
  const month = parseInt(monthMatch[1], 10);
  const startOfMonth = new Date(year, month - 1, 1);
  return jd <= startOfMonth;
};

// ==================== REVIEW CYCLE CONTROLLERS ====================

const getReviewCycles = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const cycles = await ReviewCycle.find().populate({
      path: 'kpiTemplateId',
      populate: { path: 'departmentId' }
    });
    res.json(cycles);
  } catch (error) {
    console.error('getReviewCycles error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getReviewCycleById = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const cycle = await ReviewCycle.findById(req.params.id).populate('kpiTemplateId');
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }
    res.json(cycle);
  } catch (error) {
    console.error('getReviewCycleById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createReviewCycle = async (req, res) => {
  try {
    let { reviewMonth, startDate, endDate, status, kpiTemplateId, cycleType, targetRole } = req.body;

    // Default targetRole: if created by executive (CEO), target managers; otherwise target employees
    if (!targetRole) {
      if (req.user?.role === 'executive') {
        targetRole = 'manager';
      } else {
        targetRole = 'employee';
      }
    }

    // Fetch the KPI template to get its departmentId
    const template = await KpiTemplate.findById(kpiTemplateId);
    const departmentId = template ? template.departmentId : null;

    // Duplicate check: check if cycle already exists for the same reviewMonth, cycleType, targetRole, and department
    const existingCycles = await ReviewCycle.find({ reviewMonth, cycleType, targetRole }).populate('kpiTemplateId');
    const isDuplicate = existingCycles.some(c => {
      const existingDeptId = c.kpiTemplateId?.departmentId?.toString();
      return existingDeptId === departmentId?.toString();
    });

    if (isDuplicate) {
      return res.status(400).json({ message: 'A review cycle for this month, cycle type, target role, and department already exists.' });
    }

    const cycle = await ReviewCycle.create({
      reviewMonth,
      startDate,
      endDate,
      status: status || 'draft',
      kpiTemplateId,
      cycleType,
      targetRole
    });

    if (cycle.status === 'active') {
      await notifyAllEmployeesOfNewCycle(cycle);
    }

    res.status(201).json(cycle);
  } catch (error) {
    console.error('createReviewCycle error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const updateReviewCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const oldCycle = await ReviewCycle.findById(id);
    if (!oldCycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const updatedCycle = await ReviewCycle.findByIdAndUpdate(id, req.body, { new: true });

    // Trigger notification if status transitioned from draft -> active
    if (oldCycle.status === 'draft' && updatedCycle.status === 'active') {
      await notifyAllEmployeesOfNewCycle(updatedCycle);
    }

    // Notify HR/Admin when a review cycle is closed
    if (oldCycle.status !== 'closed' && updatedCycle.status === 'closed') {
      const hrAndAdmins = await User.find({ role: { $in: ['hr', 'admin'] }, employmentStatus: 'active' });
      await Notification.insertMany(hrAndAdmins.map(u => ({
        userId: u._id,
        type: 'review_completed',
        message: `The review cycle for ${updatedCycle.reviewMonth} has been closed.`
      })));
    }

    res.json(updatedCycle);
  } catch (error) {
    console.error('updateReviewCycle error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// Helper: notify targeted department members and managers of new cycle
const notifyAllEmployeesOfNewCycle = async (cycle) => {
  try {
    // Resolve KPI Template department
    const template = await KpiTemplate.findById(cycle.kpiTemplateId);
    const targetDeptId = template?.departmentId || null;

    const baseFilter = { employmentStatus: 'active' };
    if (targetDeptId) {
      baseFilter.departmentId = targetDeptId;
    }

    if (cycle.targetRole === 'manager') {
      // CEO created cycle -> ONLY Reporting Managers and HR Managers of that department
      baseFilter.role = { $in: ['manager', 'hr'] };
    } else {
      // HR/Manager created cycle -> ONLY regular employees of that department
      baseFilter.role = 'employee';
    }

    const targetUsers = await User.find(baseFilter);
    if (targetUsers.length === 0) return;

    // In-app notifications for targeted users
    const notifications = targetUsers.map(u => ({
      userId: u._id,
      type: 'review_assigned',
      message: `A new performance review cycle (${cycle.reviewMonth}) has been started for your department.`
    }));
    await Notification.insertMany(notifications);

    // Email notifications specifically to targeted users
    for (const emp of targetUsers) {
      if (emp.email) {
        sendReviewCycleStartedEmail(emp.email, emp.firstName, cycle.reviewMonth, cycle.endDate)
          .catch(err => console.error(`Review cycle email failed for ${emp.email}:`, err));
      }
    }
  } catch (err) {
    console.error('Notification seeding failed:', err);
  }
};

// ==================== SELF ASSESSMENT CONTROLLERS ====================

const getSelfAssessments = async (req, res) => {
  try {
    const { employeeId, reviewCycleId, status } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else if (employeeId) {
      filter.employeeId = employeeId;
    }
    if (reviewCycleId) {
      const cycle = await ReviewCycle.findById(reviewCycleId);
      if (cycle) {
        const empId = req.user.role === 'employee' ? req.user.id : employeeId;
        if (empId) {
          const emp = await User.findById(empId);
          if (emp && !isEmployeeEligibleForCycle(emp.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
            return res.status(403).json({ message: 'Employee is not eligible for this review cycle.' });
          }
        }
      }
      filter.reviewCycleId = reviewCycleId;
    }
    if (status) filter.status = status;

    const assessments = await SelfAssessment.find(filter)
      .populate('reviewCycleId')
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode' });

    res.json(assessments);
  } catch (error) {
    console.error('getSelfAssessments error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getSelfAssessmentById = async (req, res) => {
  try {
    const assessment = await SelfAssessment.findById(req.params.id)
      .populate('reviewCycleId')
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode' });

    if (!assessment) {
      return res.status(404).json({ message: 'Self-assessment not found.' });
    }
    res.json(assessment);
  } catch (error) {
    console.error('getSelfAssessmentById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const submitSelfAssessment = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { reviewCycleId, details, status } = req.body;
    const employeeId = req.user.id;

    if (req.user.role === 'executive') {
      return res.status(400).json({ message: 'Executives / CEOs do not submit self-assessments.' });
    }

    // Check if review cycle is active
    const cycle = await ReviewCycle.findById(reviewCycleId);
    if (!cycle || cycle.status !== 'active') {
      return res.status(400).json({ message: 'Self assessment can only be submitted for active review cycles.' });
    }

    // Verify user eligibility based on joining date
    const emp = await User.findById(employeeId);
    if (emp && !isEmployeeEligibleForCycle(emp.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
      return res.status(403).json({ message: 'You are not eligible for this review cycle due to joining date constraints.' });
    }

    if (status === 'submitted') {
      if (!details || !Array.isArray(details) || details.length === 0) {
        return res.status(400).json({ message: 'Submission details are required.' });
      }
      for (const d of details) {
        if (!d.score || d.score < 1 || d.score > 5) {
          return res.status(400).json({ message: 'A score between 1 and 5 is required for all KPIs.' });
        }
        if (!d.comment || !d.comment.trim()) {
          return res.status(400).json({ message: 'A justification comment is required for all evaluated items.' });
        }
      }
    }

    // Look for existing assessment
    let assessment = await SelfAssessment.findOne({ reviewCycleId, employeeId });

    if (assessment && assessment.status === 'submitted') {
      return res.status(400).json({ message: 'Self assessment has already been submitted and cannot be modified.' });
    }

    if (assessment) {
      assessment.details = details;
      assessment.status = status || 'draft';
      if (status === 'submitted') {
        assessment.submittedAt = new Date();
      }
      await assessment.save();
    } else {
      assessment = await SelfAssessment.create({
        reviewCycleId,
        employeeId,
        details,
        status: status || 'draft',
        submittedAt: status === 'submitted' ? new Date() : null
      });
    }

    // If submitted, notify Manager or CEO
    if (status === 'submitted') {
      const user = await User.findById(employeeId).populate('managerId');
      let evaluator = user?.managerId;

      // If user is a manager/HR or cycle targets managers, evaluator is the CEO / Executive
      if (!evaluator || user?.role === 'manager' || user?.role === 'hr' || cycle?.targetRole === 'manager') {
        evaluator = await User.findOne({ role: 'executive', employmentStatus: 'active' });
      }

      if (evaluator) {
        await Notification.create({
          userId: evaluator._id,
          type: 'manager_review_pending',
          message: `${user.firstName} ${user.lastName} has submitted their self-assessment for ${cycle.reviewMonth}. Please complete your evaluation.`
        });

        if (evaluator.email) {
          sendSelfAssessmentSubmittedEmail(
            evaluator.email,
            evaluator.firstName,
            `${user.firstName} ${user.lastName}`,
            cycle.reviewMonth
          ).catch(err => console.error('Evaluator email notification failed:', err));
        }
      }

      // Check if we can trigger calculation immediately
      await checkAndCalculateScores(reviewCycleId, employeeId, req.ip || '');
    }

    res.json(assessment);
  } catch (error) {
    console.error('submitSelfAssessment error:', error);
    res.status(400).json({ message: error.message || 'Validation or DB error.' });
  }
};

// ==================== MANAGER REVIEW CONTROLLERS ====================

const getManagerReviews = async (req, res) => {
  try {
    const { managerId, employeeId, reviewCycleId, status } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else {
      if (managerId) filter.managerId = managerId;
      if (employeeId) filter.employeeId = employeeId;
    }
    if (reviewCycleId) filter.reviewCycleId = reviewCycleId;
    if (status) filter.status = status;

    const reviews = await ManagerReview.find(filter)
      .populate('reviewCycleId')
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId' })
      .populate({ path: 'managerId', select: 'firstName lastName email' });

    res.json(reviews);
  } catch (error) {
    console.error('getManagerReviews error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getManagerReviewById = async (req, res) => {
  try {
    const review = await ManagerReview.findById(req.params.id)
      .populate('reviewCycleId')
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode' })
      .populate({ path: 'managerId', select: 'firstName lastName email' });

    if (!review) {
      return res.status(404).json({ message: 'Manager review not found.' });
    }
    res.json(review);
  } catch (error) {
    console.error('getManagerReviewById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const submitManagerReview = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { reviewCycleId, employeeId, details, status } = req.body;
    const managerId = req.user.id;

    // Check if review cycle is active
    const cycle = await ReviewCycle.findById(reviewCycleId);
    if (!cycle || cycle.status !== 'active') {
      return res.status(400).json({ message: 'Manager review can only be submitted for active review cycles.' });
    }

    // Verify manager assignment or HR/Admin/Executive access
    const employee = await User.findById(employeeId);
    if (!employee || (employee.managerId?.toString() !== managerId.toString() && !['hr', 'admin', 'executive'].includes(req.user.role))) {
      return res.status(403).json({ message: 'You are not the designated manager for this employee.' });
    }

    // Verify employee eligibility based on joining date
    if (!isEmployeeEligibleForCycle(employee.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
      return res.status(403).json({ message: 'Employee is not eligible for this review cycle due to joining date constraints.' });
    }

    let review = await ManagerReview.findOne({ reviewCycleId, employeeId });

    if (review && review.status === 'submitted') {
      return res.status(400).json({ message: 'Manager review has already been submitted and cannot be modified.' });
    }

    if (review) {
      review.details = details;
      review.status = status || 'draft';
      if (status === 'submitted') {
        review.submittedAt = new Date();
      }
      await review.save();
    } else {
      review = await ManagerReview.create({
        reviewCycleId,
        employeeId,
        managerId,
        details,
        status: status || 'draft',
        submittedAt: status === 'submitted' ? new Date() : null
      });
    }

    if (status === 'submitted') {
      // Check if we can trigger calculation immediately
      await checkAndCalculateScores(reviewCycleId, employeeId, req.ip || '');
    }

    res.json(review);
  } catch (error) {
    console.error('submitManagerReview error:', error);
    res.status(400).json({ message: error.message || 'Validation or DB error.' });
  }
};

// ==================== SCORE CALCULATION SERVICE ====================

const checkAndCalculateScores = async (reviewCycleId, employeeId, ipAddress) => {
  try {
    const selfAssessment = await SelfAssessment.findOne({ reviewCycleId, employeeId, status: 'submitted' });
    const managerReview = await ManagerReview.findOne({ reviewCycleId, employeeId, status: 'submitted' });

    if (selfAssessment && managerReview) {
      // Both submitted, calculate score
      const cycle = await ReviewCycle.findById(reviewCycleId);
      const template = await KpiTemplate.findById(cycle.kpiTemplateId);

      const { categoryScores, finalScore, rating } = calculateReviewScores(managerReview, template);

      // Check if ReviewScore already exists
      let reviewScore = await ReviewScore.findOne({ reviewCycleId, employeeId });
      
      const before = reviewScore ? reviewScore.toObject() : null;

      if (reviewScore) {
        reviewScore.categoryScores = categoryScores;
        reviewScore.finalScore = finalScore;
        reviewScore.rating = rating;
        reviewScore.calculatedAt = new Date();
        await reviewScore.save();
      } else {
        reviewScore = await ReviewScore.create({
          reviewCycleId,
          employeeId,
          categoryScores,
          finalScore,
          rating,
          calculatedAt: new Date()
        });
      }

      // Log score change
      await logAction({
        userId: managerReview.managerId, // Manager submitted the triggering action
        action: 'score_change',
        entityType: 'ReviewScore',
        entityId: reviewScore._id,
        before,
        after: reviewScore.toObject(),
        ipAddress
      });

      // Send notification to Employee
      await Notification.create({
        userId: employeeId,
        type: 'final_score_ready',
        message: `Your performance review for ${cycle.reviewMonth} is complete. Your final score is ${finalScore} (${rating}).`
      });

      // Send email notification to Employee when report is published
      const emp = await User.findById(employeeId);
      if (emp && emp.email) {
        sendFinalReportGeneratedEmail(emp.email, emp.firstName, cycle.reviewMonth, finalScore, rating)
          .catch(err => console.error('Final report email notification failed:', err));
      }

      console.log(`Scores calculated successfully for Employee: ${employeeId} in Cycle: ${reviewCycleId}`);
    }
  } catch (err) {
    console.error('Error auto-calculating scores:', err);
  }
};

// Explicit calculate endpoint for HR / Manager recalculations if needed
const getReviewScores = async (req, res) => {
  try {
    const { employeeId, reviewCycleId } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else if (employeeId) {
      filter.employeeId = employeeId;
    }
    if (reviewCycleId) filter.reviewCycleId = reviewCycleId;

    const scores = await ReviewScore.find(filter)
      .populate('reviewCycleId')
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId' });

    res.json(scores);
  } catch (error) {
    console.error('getReviewScores error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const calculateAggregateScores = async (req, res) => {
  try {
    const { reviewCycleId, employeeId } = req.body;
    
    if (!reviewCycleId || !employeeId) {
      return res.status(400).json({ message: 'reviewCycleId and employeeId are required.' });
    }

    const cycle = await ReviewCycle.findById(reviewCycleId);
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const { cycleType, reviewMonth } = cycle;

    if (cycleType === 'monthly') {
      await checkAndCalculateScores(reviewCycleId, employeeId, req.ip || '');
      const score = await ReviewScore.findOne({ reviewCycleId, employeeId });
      if (!score) {
        return res.status(400).json({ message: 'Monthly assessments not fully submitted yet.' });
      }
      return res.json(score);
    }

    let aggregated = null;

    if (cycleType === 'quarterly') {
      // Format "YYYY-QX", e.g. "2026-Q3"
      const match = reviewMonth.match(/^(\d{4})-Q([1-4])$/);
      if (!match) {
        return res.status(400).json({ message: 'Quarterly cycle month must be in format YYYY-QX (e.g. 2026-Q3)' });
      }
      
      const year = match[1];
      const q = parseInt(match[2]);
      const startMonthNum = (q - 1) * 3 + 1;
      const months = [
        `${year}-${String(startMonthNum).padStart(2, '0')}`,
        `${year}-${String(startMonthNum + 1).padStart(2, '0')}`,
        `${year}-${String(startMonthNum + 2).padStart(2, '0')}`
      ];

      const monthlyCycles = await ReviewCycle.find({ reviewMonth: { $in: months }, cycleType: 'monthly' });
      const cycleIds = monthlyCycles.map(c => c._id);

      const monthlyScores = await ReviewScore.find({ employeeId, reviewCycleId: { $in: cycleIds } });
      if (monthlyScores.length === 0) {
        return res.status(400).json({ message: 'No monthly scores found for this quarter to aggregate.' });
      }

      aggregated = calculateAverages(monthlyScores);
    }

    if (cycleType === 'annual') {
      // Format "YYYY", e.g. "2026"
      const year = reviewMonth.trim();
      if (!/^\d{4}$/.test(year)) {
        return res.status(400).json({ message: 'Annual cycle month must be in format YYYY (e.g. 2026)' });
      }
      
      const quarters = [`${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`];

      const quarterlyCycles = await ReviewCycle.find({ reviewMonth: { $in: quarters }, cycleType: 'quarterly' });
      const cycleIds = quarterlyCycles.map(c => c._id);

      const quarterlyScores = await ReviewScore.find({ employeeId, reviewCycleId: { $in: cycleIds } });
      if (quarterlyScores.length === 0) {
        return res.status(400).json({ message: 'No quarterly scores found for this year to aggregate.' });
      }

      aggregated = calculateAverages(quarterlyScores);
    }

    if (!aggregated) {
      return res.status(400).json({ message: 'Aggregation failed.' });
    }

    const { categoryScores, finalScore, rating } = aggregated;

    let reviewScore = await ReviewScore.findOne({ reviewCycleId, employeeId });
    const before = reviewScore ? reviewScore.toObject() : null;

    if (reviewScore) {
      reviewScore.categoryScores = categoryScores;
      reviewScore.finalScore = finalScore;
      reviewScore.rating = rating;
      reviewScore.calculatedAt = new Date();
      await reviewScore.save();
    } else {
      reviewScore = await ReviewScore.create({
        reviewCycleId,
        employeeId,
        categoryScores,
        finalScore,
        rating,
        calculatedAt: new Date()
      });
    }

    await logAction({
      userId: req.user.id,
      action: 'score_change',
      entityType: 'ReviewScore',
      entityId: reviewScore._id,
      before,
      after: reviewScore.toObject(),
      ipAddress: req.ip || ''
    });

    await Notification.create({
      userId: employeeId,
      type: 'final_score_ready',
      message: `Your aggregated ${cycleType} performance review for ${reviewMonth} is complete. Final Score: ${finalScore} (${rating}).`
    });

    res.json(reviewScore);
  } catch (error) {
    console.error('calculateAggregateScores error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const calculateAverages = (scoresList) => {
  const sumScores = {
    workQuality: 0, productivity: 0, technical: 0, communication: 0, ownership: 0, learning: 0
  };
  let sumFinal = 0;
  
  scoresList.forEach(s => {
    sumFinal += s.finalScore;
    sumScores.workQuality += s.categoryScores?.workQuality || 0;
    sumScores.productivity += s.categoryScores?.productivity || 0;
    sumScores.technical += s.categoryScores?.technical || 0;
    sumScores.communication += s.categoryScores?.communication || 0;
    sumScores.ownership += s.categoryScores?.ownership || 0;
    sumScores.learning += s.categoryScores?.learning || 0;
  });
  
  const count = scoresList.length;
  const categoryScores = {
    workQuality: Math.round((sumScores.workQuality / count) * 100) / 100,
    productivity: Math.round((sumScores.productivity / count) * 100) / 100,
    technical: Math.round((sumScores.technical / count) * 100) / 100,
    communication: Math.round((sumScores.communication / count) * 100) / 100,
    ownership: Math.round((sumScores.ownership / count) * 100) / 100,
    learning: Math.round((sumScores.learning / count) * 100) / 100
  };
  
  const finalScore = Math.round((sumFinal / count) * 100) / 100;
  const { getRatingBand } = require('../utils/scoring');
  const rating = getRatingBand(finalScore);
  
  return { categoryScores, finalScore, rating };
};

module.exports = {
  getReviewCycles,
  getReviewCycleById,
  createReviewCycle,
  updateReviewCycle,
  getSelfAssessments,
  getSelfAssessmentById,
  submitSelfAssessment,
  getManagerReviews,
  getManagerReviewById,
  submitManagerReview,
  getReviewScores,
  calculateAggregateScores
};
