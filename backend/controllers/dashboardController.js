const User = require('../models/User');
const Department = require('../models/Department');
const KpiTemplate = require('../models/KpiTemplate');
const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const EmployeeSkill = require('../models/EmployeeSkill');
const Certification = require('../models/Certification');

const getDashboardData = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    
    // Fetch active review cycles
    const activeCycles = await ReviewCycle.find({ status: 'active' });
    const activeCycleIds = activeCycles.map(c => c._id);

    if (role === 'employee') {
      // 1. Employee Dashboard Data
      const user = await User.findById(userId)
        .populate('departmentId designationId')
        .populate({ path: 'managerId', select: 'firstName lastName email' });

      const pendingSelfAssessments = [];
      
      for (const cycle of activeCycles) {
        // Filter by KPI Template's department
        const template = await KpiTemplate.findById(cycle.kpiTemplateId);
        if (template && template.departmentId) {
          const empDeptId = user.departmentId?._id || user.departmentId;
          if (empDeptId && template.departmentId.toString() !== empDeptId.toString()) {
            continue; // Skip this cycle for this employee
          }
        }

        const assessment = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: userId });
        if (!assessment || assessment.status === 'draft') {
          pendingSelfAssessments.push({
            cycleId: cycle._id,
            reviewMonth: cycle.reviewMonth,
            endDate: cycle.endDate,
            assessmentId: assessment?._id || null,
            status: assessment ? 'draft' : 'not_started'
          });
        }
      }

      // Past review scores
      const reviewScores = await ReviewScore.find({ employeeId: userId })
        .populate({ path: 'reviewCycleId', select: 'reviewMonth' })
        .sort('-createdAt');

      // Unread notifications
      const notifications = await Notification.find({ userId, isRead: false })
        .sort('-createdAt')
        .limit(5);

      // Setup/journey metrics
      const skillsCount = await EmployeeSkill.countDocuments({ employeeId: userId });
      const certificationsCount = await Certification.countDocuments({ employeeId: userId });

      let selfAssessmentStatus = 'none'; // 'pending', 'submitted', 'none'
      let managerReviewStatus = 'none'; // 'waiting', 'complete', 'none'
      let finalScoreFinalized = false;
      let finalScore = null;
      let ratingBand = null;
      let activeCycleId = null;

      for (const cycle of activeCycles) {
        // Filter by KPI Template's department
        const template = await KpiTemplate.findById(cycle.kpiTemplateId);
        if (template && template.departmentId) {
          const empDeptId = user.departmentId?._id || user.departmentId;
          if (empDeptId && template.departmentId.toString() !== empDeptId.toString()) {
            continue; // Skip this cycle for this employee
          }
        }
        
        activeCycleId = cycle._id;
        const assessment = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: userId });
        if (!assessment) {
          selfAssessmentStatus = 'pending';
        } else if (assessment.status === 'draft') {
          selfAssessmentStatus = 'pending';
        } else {
          selfAssessmentStatus = 'submitted';
        }

        const mgrReview = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: userId });
        if (selfAssessmentStatus === 'submitted') {
          if (!mgrReview || mgrReview.status === 'draft') {
            managerReviewStatus = 'waiting';
          } else {
            managerReviewStatus = 'complete';
          }
        }

        const score = await ReviewScore.findOne({ reviewCycleId: cycle._id, employeeId: userId });
        if (score) {
          finalScoreFinalized = true;
          finalScore = score.finalScore;
          ratingBand = score.rating;
        }
      }

      return res.json({
        role,
        profile: user,
        pendingSelfAssessments,
        reviewScores,
        notifications,
        skillsCount,
        certificationsCount,
        managerVerified: !!user.managerId,
        selfAssessmentStatus,
        managerReviewStatus,
        finalScoreFinalized,
        finalScore,
        ratingBand,
        activeCycleId
      });
    }

    if (role === 'manager') {
      // 2. Manager Dashboard Data
      // Subordinates
      const subordinates = await User.find({ managerId: userId, employmentStatus: 'active' });
      const subordinateIds = subordinates.map(s => s._id);

      // Pending manager reviews for active cycles
      const pendingManagerReviews = [];
      const pendingSelfAssessmentsFromSubordinates = [];

      for (const cycle of activeCycles) {
        // Resolve KPI Template department
        const template = await KpiTemplate.findById(cycle.kpiTemplateId);
        const targetDeptId = template?.departmentId || null;

        for (const sub of subordinates) {
          // Subordinate's department must match cycle template's department (if template has one)
          if (targetDeptId) {
            const subDeptId = sub.departmentId?._id || sub.departmentId;
            if (subDeptId && targetDeptId.toString() !== subDeptId.toString()) {
              continue; // Subordinate does not belong to this cycle's department
            }
          }

          // Check if employee submitted self assessment
          const selfAss = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: sub._id });
          
          if (!selfAss || selfAss.status !== 'submitted') {
            pendingSelfAssessmentsFromSubordinates.push({
              employee: sub,
              cycleMonth: cycle.reviewMonth
            });
          }

          // Check if manager submitted review
          const manRev = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: sub._id });
          if (!manRev || manRev.status === 'draft') {
            pendingManagerReviews.push({
              employee: sub,
              cycleId: cycle._id,
              cycleMonth: cycle.reviewMonth,
              reviewId: manRev?._id || null,
              status: manRev ? 'draft' : 'not_started',
              isEmployeeSubmitted: selfAss?.status === 'submitted'
            });
          }
        }
      }

      // Team scores
      const teamScores = await ReviewScore.find({ employeeId: { $in: subordinateIds } })
        .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' })
        .populate({ path: 'reviewCycleId', select: 'reviewMonth' })
        .sort('-createdAt');

      return res.json({
        role,
        teamCount: subordinates.length,
        pendingManagerReviews,
        pendingSelfAssessmentsFromSubordinates,
        teamScores
      });
    }

    if (role === 'hr' || role === 'admin' || role === 'executive') {
      // 3. HR & Admin Dashboard Data
      const totalDepartments = await Department.countDocuments({ status: 'active' });
      const totalTemplates = await KpiTemplate.countDocuments({ status: 'active' });
      const totalUsers = await User.countDocuments({ employmentStatus: 'active' });
      const totalManagers = await User.countDocuments({ role: 'manager', employmentStatus: 'active' });

      // Completion metrics for active cycles
      const activeCycleMetrics = [];
      for (const cycle of activeCycles) {
        // Resolve department eligibility from KPI Template
        const template = await KpiTemplate.findById(cycle.kpiTemplateId).populate('departmentId');
        const targetDeptId = template?.departmentId?._id || template?.departmentId || null;

        const employeeFilter = { role: 'employee', employmentStatus: 'active' };
        if (targetDeptId) {
          employeeFilter.departmentId = targetDeptId;
        }

        // Count active employees eligible for self-assessments (role: 'employee') in this department
        const eligibleEmployees = await User.countDocuments(employeeFilter);
        const totalEmployees = eligibleEmployees > 0 
          ? eligibleEmployees 
          : await User.countDocuments({ role: { $ne: 'admin' }, employmentStatus: 'active' });
        
        const selfSubmitted = await SelfAssessment.countDocuments({ reviewCycleId: cycle._id, status: 'submitted' });
        const managerSubmitted = await ManagerReview.countDocuments({ reviewCycleId: cycle._id, status: 'submitted' });
        const bothCompleted = await ReviewScore.countDocuments({ reviewCycleId: cycle._id });

        // Detailed employee submission status & timestamps
        const eligibleUserList = await User.find(employeeFilter)
          .populate('departmentId designationId')
          .populate({ path: 'managerId', select: 'firstName lastName' });

        const submissions = await Promise.all(eligibleUserList.map(async (emp) => {
          const selfDoc = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          const mgrDoc = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          return {
            employeeId: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeCode: emp.employeeCode,
            departmentName: emp.departmentId?.departmentName || '-',
            designationName: emp.designationId?.designationName || '-',
            managerName: emp.managerId ? `${emp.managerId.firstName} ${emp.managerId.lastName}` : 'No Manager',
            selfSubmitted: selfDoc?.status === 'submitted',
            selfSubmittedAt: selfDoc?.submittedAt || null,
            managerSubmitted: mgrDoc?.status === 'submitted',
            managerSubmittedAt: mgrDoc?.submittedAt || null
          };
        }));

        activeCycleMetrics.push({
          cycleId: cycle._id,
          reviewMonth: cycle.reviewMonth,
          templateName: template?.templateName || 'General Template',
          departmentName: template?.departmentId?.departmentName || 'All Departments',
          totalEmployees,
          selfSubmittedPercent: totalEmployees > 0 ? Math.round((selfSubmitted / totalEmployees) * 100) : 0,
          managerSubmittedPercent: totalEmployees > 0 ? Math.round((managerSubmitted / totalEmployees) * 100) : 0,
          completedPercent: totalEmployees > 0 ? Math.round((bothCompleted / totalEmployees) * 100) : 0,
          submissions
        });
      }

      // Average score per rating category overall
      const scoreDistribution = await ReviewScore.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        }
      ]);

      // Recent audit logs
      const recentAudits = await AuditLog.find()
        .populate({ path: 'userId', select: 'firstName lastName email' })
        .sort('-createdAt')
        .limit(5);

      return res.json({
        role,
        stats: {
          totalDepartments,
          totalTemplates,
          totalUsers,
          totalManagers
        },
        activeCycleMetrics,
        scoreDistribution,
        recentAudits
      });
    }

    res.status(400).json({ message: 'Role dashboard not defined.' });
  } catch (error) {
    console.error('getDashboardData error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDashboardData };
