const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const { calculateReviewScores } = require('../utils/scoring');
const { logAction } = require('../utils/logger');
const {
  sendReviewCycleStartedEmail,
  sendReviewCycleUpdatedEmail,
  sendSelfAssessmentSubmittedEmail,
  sendFinalReportGeneratedEmail,
  sendIndividualExtensionEmail
} = require('../services/emailService');
const { isEmployeeEligibleForCycle } = require('../utils/eligibility');

// ==================== REVIEW CYCLE CONTROLLERS ====================

const getReviewCycles = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    let query = {};
    if (req.user && req.user.role === 'manager') {
      const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
      if (mgrDeptId) {
        query = { $or: [{ departmentId: mgrDeptId }, { departmentId: null }] };
      }
    }
    const cycles = await ReviewCycle.find(query)
      .populate('departmentId')
      .populate({ path: 'unlockedUserIds', select: 'firstName lastName email employeeCode role departmentId' })
      .sort({ createdAt: -1 });
    res.json(cycles);
  } catch (error) {
    console.error('getReviewCycles error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getReviewCycleById = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const cycle = await ReviewCycle.findById(req.params.id)
      .populate('departmentId')
      .populate({ path: 'unlockedUserIds', select: 'firstName lastName email employeeCode role departmentId' });
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }
    res.json(cycle);
  } catch (error) {
    console.error('getReviewCycleById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const normalizeReviewMonth = (reviewMonth, cycleType) => {
  if (!reviewMonth) return reviewMonth;
  reviewMonth = reviewMonth.trim();
  
  if (cycleType === 'quarterly') {
    if (/^\d{4}-Q[1-4]$/.test(reviewMonth)) {
      return reviewMonth;
    }
    const match = reviewMonth.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = match[1];
      const month = parseInt(match[2], 10);
      const q = Math.ceil(month / 3);
      return `${year}-Q${q}`;
    }
  }

  if (cycleType === 'half_yearly') {
    if (/^\d{4}-H[1-2]$/.test(reviewMonth)) {
      return reviewMonth;
    }
    const match = reviewMonth.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = match[1];
      const month = parseInt(match[2], 10);
      const h = month <= 6 ? 1 : 2;
      return `${year}-H${h}`;
    }
  }

  if (['yearly', 'annual'].includes(cycleType)) {
    if (/^\d{4}$/.test(reviewMonth)) {
      return reviewMonth;
    }
    const match = reviewMonth.match(/^(\d{4})/);
    if (match) {
      return match[1];
    }
  }

  return reviewMonth;
};

const createReviewCycle = async (req, res) => {
  try {
    let { reviewMonth, startDate, endDate, status, departmentId, cycleType, targetRole } = req.body;
    reviewMonth = normalizeReviewMonth(reviewMonth, cycleType);

    // Default targetRole: if created by executive (CEO), target managers; otherwise target employees
    if (!targetRole) {
      if (req.user?.role === 'executive') {
        targetRole = 'manager';
      } else {
        targetRole = 'employee';
      }
    }

    // Duplicate check: check if cycle already exists for the same reviewMonth, cycleType, targetRole, and department
    const existingCycles = await ReviewCycle.find({ reviewMonth, cycleType, targetRole });
    const isDuplicate = existingCycles.some(c => {
      const existingDeptId = c.departmentId?.toString();
      return departmentId ? (existingDeptId === departmentId?.toString()) : true;
    });

    if (isDuplicate && existingCycles.length > 0) {
      return res.status(400).json({ message: 'A review cycle for this month, cycle type, and target role already exists.' });
    }

    let initialStatus = status || 'draft';
    if (startDate) {
      const now = new Date();
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      if (new Date(startDate) <= endOfToday) {
        initialStatus = 'active';
      }
    }

    const cycle = await ReviewCycle.create({
      reviewMonth,
      startDate,
      endDate,
      status: initialStatus,
      departmentId,
      cycleType,
      targetRole
    });

    if (cycle.status === 'active') {
      await notifyAllEmployeesOfNewCycle(cycle);
    }

    res.status(201).json(cycle);
  } catch (error) {
    console.error('createReviewCycle error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateReviewCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const oldCycle = await ReviewCycle.findById(id);
    if (!oldCycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    if (req.body.reviewMonth) {
      const type = req.body.cycleType || oldCycle.cycleType;
      req.body.reviewMonth = normalizeReviewMonth(req.body.reviewMonth, type);
    }

    const now = new Date();
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    if (req.body.status === undefined) {
      const checkStartDate = req.body.startDate ? new Date(req.body.startDate) : new Date(oldCycle.startDate);
      const checkEndDate = req.body.endDate ? new Date(req.body.endDate) : new Date(oldCycle.endDate);

      if (checkStartDate > endOfToday) {
        req.body.status = 'draft';
      } else if (checkEndDate >= startOfToday) {
        req.body.status = 'active';
      } else {
        req.body.status = 'closed';
      }
    }

    const updatedCycle = await ReviewCycle.findByIdAndUpdate(id, req.body, { new: true });

    // Send update/reschedule notifications (in-app and email) to target users
    await notifyAllEmployeesOfUpdatedCycle(updatedCycle, oldCycle);

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
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Helper: notify targeted department members and managers of new cycle
const notifyAllEmployeesOfNewCycle = async (cycle) => {
  try {
    const targetDeptId = cycle.departmentId;

    const baseFilter = { employmentStatus: 'active' };
    if (targetDeptId) {
      baseFilter.departmentId = targetDeptId;
    }

    if (cycle.targetRole === 'manager') {
      // CEO created cycle -> Reporting Managers, HR Managers, and Admins of that department
      baseFilter.role = { $in: ['manager', 'hr', 'admin'] };
    } else {
      // HR/Manager created cycle -> ONLY regular employees of that department
      baseFilter.role = 'employee';
    }

    let targetUsers = await User.find(baseFilter);

    // Filter by eligibility if joiningDate exists; keep active members if joiningDate not specified
    targetUsers = targetUsers.filter(u => {
      if (!u.joiningDate) return true;
      return isEmployeeEligibleForCycle(u.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate);
    });

    if (targetUsers.length === 0) return;

    let deptName = 'All Departments';
    if (targetDeptId) {
      const dept = await Department.findById(targetDeptId);
      if (dept) {
        deptName = dept.departmentName;
      }
    }

    // In-app notifications for targeted users
    const notifications = targetUsers.map(u => ({
      userId: u._id,
      type: 'review_assigned',
      message: `Performance review cycle "${cycle.reviewMonth}" (${deptName}) has been launched! Please submit your self-assessment before evaluation due date (${new Date(cycle.endDate).toLocaleDateString()}).`
    }));
    await Notification.insertMany(notifications);

    // Email notifications specifically to targeted users
    for (const emp of targetUsers) {
      if (emp.email) {
        sendReviewCycleStartedEmail(emp.email, emp.firstName, cycle.reviewMonth, cycle.endDate)
          .catch(err => console.error('Review cycle email failed:', err.message || err));
      }
    }
  } catch (err) {
    console.error('Notification seeding failed:', err);
  }
};

const notifyAllEmployeesOfUpdatedCycle = async (cycle, oldCycle) => {
  try {
    const startDateChanged = new Date(cycle.startDate).getTime() !== new Date(oldCycle.startDate).getTime();
    const endDateChanged = new Date(cycle.endDate).getTime() !== new Date(oldCycle.endDate).getTime();
    const statusChanged = cycle.status !== oldCycle.status;

    if (!startDateChanged && !endDateChanged && !statusChanged) return;

    const targetDeptId = cycle.departmentId;
    const baseFilter = { employmentStatus: 'active' };
    if (targetDeptId) {
      baseFilter.departmentId = targetDeptId;
    }

    if (cycle.targetRole === 'manager') {
      baseFilter.role = { $in: ['manager', 'hr', 'admin'] };
    } else {
      baseFilter.role = 'employee';
    }

    let targetUsers = await User.find(baseFilter);
    targetUsers = targetUsers.filter(u => {
      if (!u.joiningDate) return true;
      return isEmployeeEligibleForCycle(u.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate);
    });

    if (targetUsers.length === 0) return;

    let deptName = 'All Departments';
    if (targetDeptId) {
      const dept = await Department.findById(targetDeptId);
      if (dept) {
        deptName = dept.departmentName;
      }
    }

    // 1. Delete old notifications for this cycle to keep it clean
    await Notification.deleteMany({
      userId: { $in: targetUsers.map(u => u._id) },
      message: { $regex: new RegExp(`"${cycle.reviewMonth}"`) }
    });

    const startFmt = new Date(cycle.startDate).toLocaleDateString('en-GB');
    const endFmt = new Date(cycle.endDate).toLocaleDateString('en-GB');

    // 2. Insert new notifications depending on status
    let notifications = [];
    if (cycle.status === 'active') {
      notifications = targetUsers.map(u => ({
        userId: u._id,
        type: 'review_assigned',
        message: `Performance review cycle "${cycle.reviewMonth}" (${deptName}) has been launched! Please submit your self-assessment before evaluation due date (${endFmt}).`
      }));
    } else if (cycle.status === 'draft') {
      notifications = targetUsers.map(u => ({
        userId: u._id,
        type: 'review_assigned',
        message: `Performance review cycle "${cycle.reviewMonth}" (${deptName}) has been updated. New start date is ${startFmt} and new evaluation due date is ${endFmt}.`
      }));
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // 3. Email notifications specifically to targeted users
    for (const emp of targetUsers) {
      if (emp.email) {
        sendReviewCycleUpdatedEmail(emp.email, emp.firstName, cycle.reviewMonth, cycle.startDate, cycle.endDate)
          .catch(err => console.error('Review cycle update email failed:', err.message || err));
      }
    }
  } catch (err) {
    console.error('Updated cycle notification seeding failed:', err);
  }
};

// ==================== SELF ASSESSMENT CONTROLLERS ====================

const getSelfAssessments = async (req, res) => {
  try {
    const { employeeId, reviewCycleId, status } = req.query;
    const filter = {};

    let targetEmpId = employeeId;

    if (req.user.role === 'employee') {
      // Employees can only fetch their own self-assessments
      targetEmpId = req.user.id;
    } else if (req.user.role === 'manager') {
      // Managers can only fetch assessments for employees in their department or their own
      if (targetEmpId && targetEmpId !== req.user.id) {
        const targetEmp = await User.findById(targetEmpId);
        if (!targetEmp) return res.status(404).json({ message: 'Employee not found.' });
        const targetDeptId = targetEmp.departmentId?._id || targetEmp.departmentId;
        const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
        if (!targetDeptId || !mgrDeptId || targetDeptId.toString() !== mgrDeptId.toString()) {
          return res.status(403).json({ message: 'Forbidden. You can only view self-assessments for employees in your department.' });
        }
      } else if (!targetEmpId) {
        // If query is broad, restrict to department employees
        const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
        if (mgrDeptId) {
          const deptUsers = await User.find({ departmentId: mgrDeptId }).select('_id');
          filter.employeeId = { $in: deptUsers.map(u => u._id) };
        } else {
          filter.employeeId = req.user.id;
        }
      }
    }

    if (targetEmpId) {
      filter.employeeId = targetEmpId;
    }

    if (reviewCycleId) {
      const cycle = await ReviewCycle.findById(reviewCycleId);
      if (cycle) {
        const empId = filter.employeeId || req.user.id;
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
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode profilePhoto gender' });

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
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId profilePhoto gender' });

    if (!assessment) {
      return res.status(404).json({ message: 'Self-assessment not found.' });
    }

    // Auth validation:
    if (req.user.role === 'employee' && assessment.employeeId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden. Access denied.' });
    }

    if (req.user.role === 'manager') {
      const targetDeptId = assessment.employeeId.departmentId?._id || assessment.employeeId.departmentId;
      const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
      if (assessment.employeeId._id.toString() !== req.user.id && (!targetDeptId || !mgrDeptId || targetDeptId.toString() !== mgrDeptId.toString())) {
        return res.status(403).json({ message: 'Forbidden. Access denied.' });
      }
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

    // Check if review cycle is active or user has individual extension unlocked
    const cycle = await ReviewCycle.findById(reviewCycleId);
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }
    const isUnlockedForUser = cycle.unlockedUserIds?.some(uid => uid.toString() === employeeId.toString());
    if (cycle.status !== 'active' && !isUnlockedForUser) {
      return res.status(400).json({ message: 'Self assessment can only be submitted for active review cycles unless an individual extension is granted.' });
    }

    // Verify user eligibility based on joining date & target role
    const emp = await User.findById(employeeId);
    if (emp) {
      if (cycle.targetRole === 'employee' && emp.role !== 'employee') {
        return res.status(403).json({ message: 'Only standard employees can submit self-assessments for employee review cycles.' });
      }
      if (cycle.targetRole === 'manager' && !['manager', 'hr', 'admin'].includes(emp.role)) {
        return res.status(403).json({ message: 'Only managers, HR, and admins can submit self-assessments for manager review cycles.' });
      }
      if (!isEmployeeEligibleForCycle(emp.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
        return res.status(403).json({ message: 'You are not eligible for this review cycle due to joining date constraints.' });
      }
    }

    if (status === 'submitted') {
      if (!details || !Array.isArray(details) || details.length === 0) {
        return res.status(400).json({ message: 'Submission details are required.' });
      }

      // Ensure employee has at least 1 verified Work Journal achievement logged
      const WorkJournal = require('../models/WorkJournal');
      const approvedCount = await WorkJournal.countDocuments({
        employeeId,
        status: 'approved'
      });

      if (approvedCount === 0) {
        return res.status(400).json({
          message: 'Cannot submit appraisal without work journal evidence. Please log at least 1 work achievement in your Work Journal and get it verified by your manager.'
        });
      }

      for (const d of details) {
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

      // If user is a manager/HR/admin or cycle targets managers, evaluator is the CEO / Executive
      if (!evaluator || user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin' || cycle?.targetRole === 'manager') {
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
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') || 'Validation failed.' });
    }
    res.status(400).json({ message: 'Validation or DB error.' });
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
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId profilePhoto gender' })
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
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId profilePhoto gender' })
      .populate({ path: 'managerId', select: 'firstName lastName email' });

    if (!review) {
      return res.status(404).json({ message: 'Manager review not found.' });
    }

    // Auth check:
    if (req.user.role === 'employee' && review.employeeId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden. Access denied.' });
    }

    if (req.user.role === 'manager') {
      const targetDeptId = review.employeeId.departmentId?._id || review.employeeId.departmentId;
      const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
      if (review.employeeId._id.toString() !== req.user.id && review.managerId._id.toString() !== req.user.id && (!targetDeptId || !mgrDeptId || targetDeptId.toString() !== mgrDeptId.toString())) {
        return res.status(403).json({ message: 'Forbidden. Access denied.' });
      }
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
    const { reviewCycleId, employeeId, competencyRatings, overallComments, overallRating, details, status } = req.body;
    const managerId = req.user.id;

    // Check if review cycle is active or target employee has an individual extension unlocked
    const cycle = await ReviewCycle.findById(reviewCycleId);
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const isUnlockedForEmployee = cycle.unlockedUserIds?.some(uid => uid.toString() === employeeId.toString());
    if (cycle.status !== 'active' && !isUnlockedForEmployee) {
      return res.status(400).json({ message: 'Manager review can only be submitted for active review cycles unless an individual extension is granted.' });
    }

    // Verify manager assignment or HR/Admin/Executive access
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const isManagerOrHRReview = employee.role === 'manager' || employee.role === 'hr' || employee.role === 'admin' || cycle.targetRole === 'manager';
    if (isManagerOrHRReview) {
      if (req.user.role !== 'executive' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only the CEO (Executive) or Admin can evaluate managers, HR, and admins.' });
      }
    } else {
      if (employee.managerId?.toString() !== managerId.toString() && !['hr', 'admin', 'executive'].includes(req.user.role)) {
        return res.status(403).json({ message: 'You are not the designated manager for this employee.' });
      }
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
      if (competencyRatings) review.competencyRatings = competencyRatings;
      if (overallComments !== undefined) review.overallComments = overallComments;
      if (overallRating !== undefined) review.overallRating = overallRating;
      if (details) review.details = details;
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
        competencyRatings: competencyRatings || {},
        overallComments: overallComments || '',
        overallRating: overallRating || 4,
        details: details || [],
        status: status || 'draft',
        submittedAt: status === 'submitted' ? new Date() : null
      });
    }

    if (status === 'submitted') {
      await checkAndCalculateScores(reviewCycleId, employeeId, req.ip || '');
    }

    res.json(review);
  } catch (error) {
    console.error('submitManagerReview error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') || 'Validation failed.' });
    }
    res.status(400).json({ message: 'Validation or DB error.' });
  }
};

// ==================== SCORE CALCULATION SERVICE ====================

const checkAndCalculateScores = async (reviewCycleId, employeeId, ipAddress) => {
  try {
    const managerReview = await ManagerReview.findOne({ reviewCycleId, employeeId, status: 'submitted' });

    if (managerReview) {
      const cycle = await ReviewCycle.findById(reviewCycleId);
      const WorkJournal = require('../models/WorkJournal');
      const Certification = require('../models/Certification');
      const Recognition = require('../models/Recognition');

      const monthStr = cycle?.reviewMonth || '';
      const qMatch = monthStr.match(/^(\d{4})-Q([1-4])$/i);
      const hMatch = monthStr.match(/^(\d{4})-H([1-2])$/i);
      const yMatch = monthStr.match(/^(\d{4})$/);
      const mMatch = monthStr.match(/^(\d{4})-(\d{2})$/);

      let cycleStart = cycle?.startDate;
      let cycleEnd = cycle?.endDate;

      if (qMatch) {
        const year = parseInt(qMatch[1], 10);
        const q = parseInt(qMatch[2], 10);
        const startMonth = (q - 1) * 3;
        cycleStart = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
        cycleEnd = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
      } else if (hMatch) {
        const year = parseInt(hMatch[1], 10);
        const h = parseInt(hMatch[2], 10);
        const startMonth = (h - 1) * 6;
        cycleStart = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
        cycleEnd = new Date(Date.UTC(year, startMonth + 6, 0, 23, 59, 59, 999));
      } else if (yMatch) {
        const year = parseInt(yMatch[1], 10);
        cycleStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        cycleEnd = new Date(Date.UTC(year, 12, 0, 23, 59, 59, 999));
      } else if (mMatch) {
        const year = parseInt(mMatch[1], 10);
        const month = parseInt(mMatch[2], 10);
        cycleStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        cycleEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      }

      const approvedWorkLogs = await WorkJournal.find({
        employeeId,
        status: { $in: ['approved', 'verified'] },
        completedDate: { $gte: cycleStart, $lte: cycleEnd }
      });

      const certifications = await Certification.find({
        employeeId,
        issueDate: { $gte: cycleStart, $lte: cycleEnd }
      });

      const awards = await Recognition.find({
        employeeId,
        awardedAt: { $gte: cycleStart, $lte: cycleEnd }
      });

      const AttendancePunch = require('../models/AttendancePunch');
      let monthKeys = [];
      if (qMatch) {
        const year = parseInt(qMatch[1], 10);
        const q = parseInt(qMatch[2], 10);
        const startMonth = (q - 1) * 3;
        monthKeys = [
          `${year}-${String(startMonth + 1).padStart(2, '0')}`,
          `${year}-${String(startMonth + 2).padStart(2, '0')}`,
          `${year}-${String(startMonth + 3).padStart(2, '0')}`
        ];
      } else if (hMatch) {
        const year = parseInt(hMatch[1], 10);
        const h = parseInt(hMatch[2], 10);
        const startMonth = (h - 1) * 6;
        monthKeys = [];
        for (let i = 1; i <= 6; i++) {
          monthKeys.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
        }
      } else if (yMatch) {
        const year = parseInt(yMatch[1], 10);
        monthKeys = [];
        for (let i = 1; i <= 12; i++) {
          monthKeys.push(`${year}-${String(i).padStart(2, '0')}`);
        }
      } else if (mMatch) {
        const year = parseInt(mMatch[1], 10);
        const month = parseInt(mMatch[2], 10);
        monthKeys = [`${year}-${String(month).padStart(2, '0')}`];
      }

      const attendancePunches = await AttendancePunch.find({
        employeeId,
        ...(monthKeys.length > 0 ? { month: { $in: monthKeys } } : {})
      });

      // Load configurable weekends and holidays
      let configWeekends = [0, 6];
      try {
        const AttendanceSettings = require('../models/AttendanceSettings');
        const attSettings = await AttendanceSettings.findOne().sort('-version');
        if (attSettings?.attendanceRules?.weekends?.length > 0) {
          configWeekends = attSettings.attendanceRules.weekends;
        }
      } catch (_) {}

      let holidayDates = new Set();
      try {
        const Holiday = require('../models/Holiday');
        const activeHolidays = await Holiday.find({
          ...(monthKeys.length > 0 ? { month: { $in: monthKeys } } : {})
        }).lean();
        activeHolidays.forEach(h => {
          if (h.date) holidayDates.add(h.date);
        });
      } catch (_) {}

       function getWeekdayCount(monthStr) {
        const [yr, mo] = monthStr.split('-').map(Number);
        const now = new Date();
        const isCurrentMonth = (now.getUTCFullYear() === yr && (now.getUTCMonth() + 1) === mo);
        const startDate = new Date(Date.UTC(yr, mo - 1, 1, 0, 0, 0, 0));
        let endDate;
        if (isCurrentMonth) {
          endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        } else {
          endDate = new Date(Date.UTC(yr, mo, 0, 23, 59, 59, 999));
        }

        let count = 0;
        for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (!configWeekends.includes(d.getUTCDay()) && !holidayDates.has(dateStr)) {
            count++;
          }
        }
        return Math.max(1, count);
      }

      let computedAttendancePct = 0;
      const hasAttendanceRecords = attendancePunches.length > 0;
      if (hasAttendanceRecords) {
        let totalPresent = 0;
        attendancePunches.forEach(p => {
          if (p.status === 'Present' || p.status === 'Late' || p.status === 'Regularized' || p.status === 'Incomplete') totalPresent += 1;
          else if (p.status === 'Half Day') totalPresent += 0.5;
        });
        const totalWorking = monthKeys.reduce((sum, mk) => sum + getWeekdayCount(mk), 0);
        computedAttendancePct = totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100 * 10) / 10 : 0;
      }

      const extraMetrics = {
        approvedWorkLogs,
        certifications,
        awards,
        attendancePercentage: computedAttendancePct,
        hasAttendanceRecords,
        attendanceRecordsCount: attendancePunches.length
      };

      const { finalScore, rating } = calculateReviewScores(managerReview, extraMetrics);

      let reviewScore = await ReviewScore.findOne({ reviewCycleId, employeeId });
      const before = reviewScore ? reviewScore.toObject() : null;

      const comp = managerReview.competencyRatings || {};
      const categoryScores = {
        communication: Number(comp.communication) || 4.0,
        ownership: Number(comp.ownership) || 4.0,
        leadership: Number(comp.leadership) || 4.0,
        teamwork: Number(comp.teamwork) || 4.0,
        learning: Number(comp.learningAbility) || 4.0,
        problemSolving: Number(comp.problemSolving) || 4.0
      };

      let isNewScore = false;
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
        isNewScore = true;
      }

      if (isNewScore) {
        await Notification.create({
          userId: employeeId,
          type: 'final_score_ready',
          message: `Your performance review for ${cycle.reviewMonth} is complete. Your final score is ${finalScore} (${rating}).`
        });

        const emp = await User.findById(employeeId);
        if (emp && emp.email) {
          sendFinalReportGeneratedEmail(
            emp.email,
            emp.firstName,
            cycle.reviewMonth,
            finalScore,
            rating
          ).catch(err => console.error('Final score email failed:', err));
        }
      }
    }
  } catch (error) {
    console.error('checkAndCalculateScores error:', error);
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
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId profilePhoto gender' });

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
    communication: 0,
    ownership: 0,
    leadership: 0,
    teamwork: 0,
    learning: 0,
    problemSolving: 0
  };
  let sumFinal = 0;
  
  scoresList.forEach(s => {
    sumFinal += s.finalScore;
    sumScores.communication += s.categoryScores?.communication || 0;
    sumScores.ownership += s.categoryScores?.ownership || 0;
    sumScores.leadership += s.categoryScores?.leadership || 0;
    sumScores.teamwork += s.categoryScores?.teamwork || 0;
    sumScores.learning += s.categoryScores?.learning || 0;
    sumScores.problemSolving += s.categoryScores?.problemSolving || 0;
  });
  
  const count = scoresList.length;
  const categoryScores = {
    communication: Math.round((sumScores.communication / count) * 100) / 100,
    ownership: Math.round((sumScores.ownership / count) * 100) / 100,
    leadership: Math.round((sumScores.leadership / count) * 100) / 100,
    teamwork: Math.round((sumScores.teamwork / count) * 100) / 100,
    learning: Math.round((sumScores.learning / count) * 100) / 100,
    problemSolving: Math.round((sumScores.problemSolving / count) * 100) / 100
  };
  
  const finalScore = Math.round((sumFinal / count) * 100) / 100;
  const { getRatingBand } = require('../utils/scoring');
  const rating = getRatingBand(finalScore);
  
  return { categoryScores, finalScore, rating };
};

const deleteReviewCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const cycle = await ReviewCycle.findById(id);
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    // Role Security: Only Reporting Managers are department-scoped (Admin, HR, Executive have org-wide cycle rights)
    if (req.user.role === 'manager') {
      const userDeptId = req.user.departmentId?._id || req.user.departmentId;
      const cycleDeptId = cycle.departmentId?._id || cycle.departmentId;
      if (userDeptId && cycleDeptId && userDeptId.toString() !== cycleDeptId.toString()) {
        return res.status(403).json({ message: 'Forbidden. Reporting Managers can only delete review cycles for their assigned department.' });
      }
    }

    // Delete cycle & related evaluation records
    await ReviewCycle.findByIdAndDelete(id);
    await SelfAssessment.deleteMany({ reviewCycleId: id });
    await ManagerReview.deleteMany({ reviewCycleId: id });
    await ReviewScore.deleteMany({ reviewCycleId: id });

    try {
      const AIReport = require('../models/AIReport');
      if (AIReport) {
        await AIReport.deleteMany({ reviewCycleId: id });
      }
    } catch (e) {
      // AIReport optional cleanup
    }

    await logAction({
      req,
      userId: req.user.id,
      action: 'DELETE_REVIEW_CYCLE',
      module: 'ReviewCycle',
      entityType: 'ReviewCycle',
      entityId: id,
      after: { reviewMonth: cycle.reviewMonth }
    });

    res.json({ message: 'Review cycle and all associated evaluation data deleted successfully.' });
  } catch (error) {
    console.error('deleteReviewCycle error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const unlockUserForCycle = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const cycleId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: 'Target Employee User ID is required.' });
    }

    const cycle = await ReviewCycle.findById(cycleId);
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target employee not found.' });
    }

    // Block re-open if the employee already submitted their self-assessment for this cycle
    const existingSubmission = await SelfAssessment.findOne({
      reviewCycleId: cycleId,
      employeeId: userId,
      status: 'submitted'
    });
    if (existingSubmission) {
      return res.status(400).json({
        message: `${targetUser.firstName} ${targetUser.lastName} has already submitted their self-assessment for this cycle and does not need a re-open.`
      });
    }

    // Add to unlockedUserIds if not present
    if (!cycle.unlockedUserIds.some(id => id.toString() === userId.toString())) {
      cycle.unlockedUserIds.push(userId);
      await cycle.save();
    }

    // In-app notification to the employee
    await Notification.create({
      userId: targetUser._id,
      type: 'review_assigned',
      message: `Individual Extension Granted! The performance review cycle for "${cycle.reviewMonth}" has been specially re-opened/unlocked for you.`
    });

    // Send email notification to employee
    if (targetUser.email) {
      sendIndividualExtensionEmail(
        targetUser.email,
        targetUser.firstName,
        cycle.reviewMonth,
        cycle.endDate
      ).catch(err => console.error('Individual extension email failed:', err));
    }

    logAction({
      req,
      userId: req.user.id,
      action: 'CYCLE_INDIVIDUAL_UNLOCKED',
      module: 'Review Cycle',
      status: 'SUCCESS',
      reason: reason || 'Individual review extension granted',
      reviewCycleId: cycle._id,
      entityType: 'ReviewCycle',
      entityId: cycle._id,
      after: { unlockedUserId: userId, reason: reason || 'Individual self-assessment extension' }
    });

    const updatedCycle = await ReviewCycle.findById(cycleId)
      .populate('departmentId')
      .populate({ path: 'unlockedUserIds', select: 'firstName lastName email employeeCode role departmentId' });

    res.json(updatedCycle);
  } catch (error) {
    console.error('unlockUserForCycle error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const relockUserForCycle = async (req, res) => {
  try {
    const { userId } = req.body;
    const cycleId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: 'Target Employee User ID is required.' });
    }

    const cycle = await ReviewCycle.findById(cycleId);
    if (!cycle) {
      return res.status(404).json({ message: 'Review cycle not found.' });
    }

    cycle.unlockedUserIds = cycle.unlockedUserIds.filter(id => id.toString() !== userId.toString());
    await cycle.save();

    logAction({
      req,
      userId: req.user.id,
      action: 'CYCLE_INDIVIDUAL_RELOCKED',
      module: 'Review Cycle',
      status: 'SUCCESS',
      reason: 'Individual review extension closed/relocked',
      reviewCycleId: cycle._id,
      entityType: 'ReviewCycle',
      entityId: cycle._id,
      after: { relockedUserId: userId }
    });

    const updatedCycle = await ReviewCycle.findById(cycleId)
      .populate('departmentId')
      .populate({ path: 'unlockedUserIds', select: 'firstName lastName email employeeCode role departmentId' });

    res.json(updatedCycle);
  } catch (error) {
    console.error('relockUserForCycle error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getReviewCycles,
  getReviewCycleById,
  createReviewCycle,
  updateReviewCycle,
  deleteReviewCycle,
  unlockUserForCycle,
  relockUserForCycle,
  getSelfAssessments,
  getSelfAssessmentById,
  submitSelfAssessment,
  getManagerReviews,
  getManagerReviewById,
  submitManagerReview,
  getReviewScores,
  calculateAggregateScores,
  checkAndCalculateScores
};
