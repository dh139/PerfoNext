const User = require('../models/User');
const Department = require('../models/Department');
const KpiTemplate = require('../models/KpiTemplate');
const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const getDashboardData = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    
    // Fetch active review cycles
    const activeCycles = await ReviewCycle.find({ status: 'active' });
    const activeCycleIds = activeCycles.map(c => c._id);

    if (role === 'employee') {
      // 1. Employee Dashboard Data
      const pendingSelfAssessments = [];
      
      for (const cycle of activeCycles) {
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

      // Team / Manager Profile
      const user = await User.findById(userId)
        .populate('departmentId designationId')
        .populate({ path: 'managerId', select: 'firstName lastName email' });

      return res.json({
        role,
        profile: user,
        pendingSelfAssessments,
        reviewScores,
        notifications
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
        for (const sub of subordinates) {
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
        // Count active employees eligible for self-assessments (role: 'employee')
        const eligibleEmployees = await User.countDocuments({ role: 'employee', employmentStatus: 'active' });
        const totalEmployees = eligibleEmployees > 0 
          ? eligibleEmployees 
          : await User.countDocuments({ role: { $ne: 'admin' }, employmentStatus: 'active' });
        
        const selfSubmitted = await SelfAssessment.countDocuments({ reviewCycleId: cycle._id, status: 'submitted' });
        const managerSubmitted = await ManagerReview.countDocuments({ reviewCycleId: cycle._id, status: 'submitted' });
        const bothCompleted = await ReviewScore.countDocuments({ reviewCycleId: cycle._id });

        // Detailed employee submission status & timestamps
        const eligibleUserList = await User.find({ role: 'employee', employmentStatus: 'active' })
          .select('firstName lastName employeeCode');

        const submissions = await Promise.all(eligibleUserList.map(async (emp) => {
          const selfDoc = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          const mgrDoc = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          return {
            employeeId: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeCode: emp.employeeCode,
            selfSubmitted: selfDoc?.status === 'submitted',
            selfSubmittedAt: selfDoc?.submittedAt || null,
            managerSubmitted: mgrDoc?.status === 'submitted',
            managerSubmittedAt: mgrDoc?.submittedAt || null
          };
        }));

        activeCycleMetrics.push({
          cycleId: cycle._id,
          reviewMonth: cycle.reviewMonth,
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
