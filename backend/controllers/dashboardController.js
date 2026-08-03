const User = require('../models/User');
const Department = require('../models/Department');
const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const EmployeeSkill = require('../models/EmployeeSkill');
const Certification = require('../models/Certification');
const WorkJournal = require('../models/WorkJournal');
const { isEmployeeEligibleForCycle } = require('../utils/eligibility');

const getDashboardData = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { role, id: userId } = req.user;
    
    // Fetch active review cycles
    const activeCycles = await ReviewCycle.find({
      $or: [
        { status: 'active' },
        { unlockedUserIds: { $exists: true, $not: { $size: 0 } } }
      ]
    });
    const activeCycleIds = activeCycles.map(c => c._id);

    const user = await User.findById(userId)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName email' });

    const pendingSelfAssessments = [];
    
    if (user) {
      for (const cycle of activeCycles) {
        const isUnlockedForUser = cycle.unlockedUserIds?.some(uid => uid.toString() === userId.toString());
        if (cycle.status !== 'active' && !isUnlockedForUser) {
          continue;
        }

        if (cycle.targetRole === 'manager' && user.role === 'employee') {
          continue;
        }
        if (cycle.targetRole === 'employee' && (user.role === 'manager' || user.role === 'hr' || user.role === 'executive')) {
          continue;
        }

        if (user.joiningDate && !isEmployeeEligibleForCycle(user.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
          continue;
        }

        if (cycle.departmentId) {
          const cycleDeptId = cycle.departmentId._id ? cycle.departmentId._id.toString() : cycle.departmentId.toString();
          const empDeptId = user.departmentId?._id ? user.departmentId._id.toString() : (user.departmentId ? user.departmentId.toString() : '');

          if (!empDeptId || empDeptId !== cycleDeptId) {
            continue;
          }
        }

        const existingSelf = await SelfAssessment.findOne({
          reviewCycleId: cycle._id,
          employeeId: userId
        });

        if (!existingSelf || existingSelf.status !== 'submitted') {
          pendingSelfAssessments.push({
            cycleId: cycle._id,
            reviewMonth: cycle.reviewMonth,
            endDate: cycle.endDate,
            cycleType: cycle.cycleType,
            status: existingSelf ? existingSelf.status : 'not_started'
          });
        }
      }
    }

    const reviewScores = await ReviewScore.find({ employeeId: userId })
      .populate('reviewCycleId')
      .sort({ calculatedAt: -1 });

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    const skillsCount = await EmployeeSkill.countDocuments({ employeeId: userId });
    const certificationsCount = await Certification.countDocuments({ employeeId: userId });

    let selfAssessmentStatus = 'none';
    let managerReviewStatus = 'none';
    let finalScoreFinalized = false;
    let finalScore = null;
    let ratingBand = null;
    let activeCycleId = null;
    let activeCycleType = null;

    // Filter activeCycles that apply to this user's department and targetRole
    const relevantActiveCycles = activeCycles.filter(cycle => {
      if (cycle.status !== 'active') {
        const isUnlocked = cycle.unlockedUserIds?.some(uid => uid.toString() === userId.toString());
        if (!isUnlocked) return false;
      }

      if (cycle.targetRole === 'manager' && user.role === 'employee') return false;
      if (cycle.targetRole === 'employee' && ['manager', 'hr', 'executive'].includes(user.role)) return false;

      if (cycle.departmentId) {
        const cycleDeptId = cycle.departmentId._id ? cycle.departmentId._id.toString() : cycle.departmentId.toString();
        const empDeptId = user.departmentId?._id ? user.departmentId._id.toString() : (user.departmentId ? user.departmentId.toString() : '');

        if (!empDeptId || empDeptId !== cycleDeptId) return false;
      }

      if (user.joiningDate && !isEmployeeEligibleForCycle(user.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
        return false;
      }

      return true;
    });

    if (relevantActiveCycles.length > 0) {
      let currentCycle = relevantActiveCycles[0];
      activeCycleId = currentCycle._id;
      activeCycleType = currentCycle.cycleType;

      const self = await SelfAssessment.findOne({ reviewCycleId: currentCycle._id, employeeId: userId });
      if (self) {
        selfAssessmentStatus = self.status;
      } else {
        selfAssessmentStatus = 'pending';
      }

      const mgrRev = await ManagerReview.findOne({ reviewCycleId: currentCycle._id, employeeId: userId });
      if (mgrRev) {
        managerReviewStatus = mgrRev.status === 'submitted' ? 'complete' : 'waiting';
      } else if (selfAssessmentStatus === 'submitted') {
        managerReviewStatus = 'waiting';
      }

      const score = await ReviewScore.findOne({ reviewCycleId: currentCycle._id, employeeId: userId });
      if (score) {
        finalScoreFinalized = true;
        finalScore = score.finalScore;
        ratingBand = score.rating;
      }
    }

    // Role-specific stats
    if (role === 'employee') {
      const dailyWorkLogs = await WorkJournal.find({ employeeId: userId }).sort({ completedDate: -1 });
      const todayLogs = dailyWorkLogs.filter(i => new Date(i.completedDate).toDateString() === new Date().toDateString());
      const monthLogs = dailyWorkLogs.filter(i => new Date(i.completedDate).getMonth() === new Date().getMonth());

      return res.json({
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
        activeCycleId,
        activeCycleType,
        dailyWorkLogsCount: dailyWorkLogs.length,
        todayLogsCount: todayLogs.length,
        monthLogsCount: monthLogs.length
      });
    }

    if (role === 'manager') {
      const mongoose = require('mongoose');
      const team = await User.find({
        $or: [
          { managerId: userId },
          { managerId: new mongoose.Types.ObjectId(userId) }
        ],
        employmentStatus: 'active'
      }).select('firstName lastName email employeeCode designationId departmentId avatar role joiningDate');

      const teamIds = team.map(t => t._id);

      const pendingWorkLogs = await WorkJournal.countDocuments({
        employeeId: { $in: teamIds },
        status: 'submitted'
      });

      const pendingManagerReviews = [];
      const pendingSelfAssessmentsFromSubordinates = [];

      for (const cycle of activeCycles) {
        if (cycle.status !== 'active') continue;

        // Reporting Managers only evaluate employee cycles (targetRole === 'employee').
        // Manager target cycles (targetRole === 'manager') are evaluated by CEO/Executive/Admin.
        if (cycle.targetRole === 'manager') continue;

        for (const member of team) {
          // Department scoping check
          if (cycle.departmentId) {
            const cycleDeptId = cycle.departmentId._id ? cycle.departmentId._id.toString() : cycle.departmentId.toString();
            const memberDeptId = member.departmentId?._id ? member.departmentId._id.toString() : (member.departmentId ? member.departmentId.toString() : '');

            if (!memberDeptId || memberDeptId !== cycleDeptId) {
              continue;
            }
          }

          // Target role check
          if (cycle.targetRole === 'manager' && member.role === 'employee') continue;
          if (cycle.targetRole === 'employee' && ['manager', 'hr', 'executive'].includes(member.role)) continue;

          // Eligibility check
          if (member.joiningDate && !isEmployeeEligibleForCycle(member.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
            continue;
          }

          const self = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: member._id });
          const mgrRev = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: member._id });

          if (!self || self.status !== 'submitted') {
            pendingSelfAssessmentsFromSubordinates.push({
              employee: member,
              cycleMonth: cycle.reviewMonth,
              cycleId: cycle._id
            });
          }

          if (!mgrRev || mgrRev.status !== 'submitted') {
            pendingManagerReviews.push({
              employee: member,
              cycleMonth: cycle.reviewMonth,
              cycleId: cycle._id,
              isEmployeeSubmitted: self ? self.status === 'submitted' : false
            });
          }
        }
      }

      return res.json({
        profile: user,
        teamSize: team.length,
        teamCount: team.length,
        team,
        pendingWorkLogs,
        pendingManagerReviews,
        pendingSelfAssessmentsFromSubordinates,
        pendingSelfAssessments,
        activeCyclesCount: activeCycles.length,
        notifications,
        selfAssessmentStatus,
        managerReviewStatus,
        finalScoreFinalized,
        finalScore,
        ratingBand,
        activeCycleId,
        activeCycleType
      });
    }

    if (role === 'hr' || role === 'admin' || role === 'executive') {
      const totalEmployees = await User.countDocuments({ employmentStatus: 'active' });
      const totalDepartments = await Department.countDocuments();
      const totalTemplates = await ReviewCycle.countDocuments();
      const totalManagers = await User.countDocuments({ role: { $in: ['manager', 'hr', 'admin'] }, employmentStatus: 'active' });

      const stats = {
        totalUsers: totalEmployees,
        totalEmployees,
        totalDepartments,
        totalTemplates,
        totalManagers,
        activeCyclesCount: activeCycles.length
      };

      // 1. Build Active Cycle Metrics for HR Submission Progress
      const activeCycleMetrics = [];
      for (const cycle of activeCycles) {
        const cycleDept = cycle.departmentId ? await Department.findById(cycle.departmentId) : null;
        const deptName = cycleDept ? cycleDept.departmentName : 'All Departments';
        const cycleDeptId = cycle.departmentId ? (cycle.departmentId._id || cycle.departmentId).toString() : null;

        const allActiveUsers = await User.find({ employmentStatus: 'active' }).populate('departmentId managerId designationId');

        const eligibleUsers = allActiveUsers.filter(emp => {
          if (cycle.targetRole === 'manager' && emp.role === 'employee') return false;
          if (cycle.targetRole === 'employee' && ['manager', 'hr', 'executive'].includes(emp.role)) return false;

          if (cycleDeptId) {
            const empDeptId = emp.departmentId?._id ? emp.departmentId._id.toString() : (emp.departmentId ? emp.departmentId.toString() : '');
            if (!empDeptId || empDeptId !== cycleDeptId) {
              return false;
            }
          }

          if (emp.joiningDate && !isEmployeeEligibleForCycle(emp.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
            return false;
          }

          return true;
        });
        
        let submittedSelfCount = 0;
        let submittedMgrCount = 0;
        let finalizedScoreCount = 0;

        const cycleSubmissions = [];

        for (const emp of eligibleUsers) {
          const self = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          const mgrRev = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          const score = await ReviewScore.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });

          if (self && self.status === 'submitted') submittedSelfCount++;
          if (mgrRev && mgrRev.status === 'submitted') submittedMgrCount++;
          if (score) finalizedScoreCount++;

          const mgrName = emp.managerId ? `${emp.managerId.firstName || ''} ${emp.managerId.lastName || ''}`.trim() : 'N/A';
          const desName = emp.designationId?.title || '';

          cycleSubmissions.push({
            employee: emp,
            employeeId: emp._id.toString(),
            firstName: emp.firstName,
            lastName: emp.lastName,
            designationName: desName,
            managerName: mgrName,
            role: emp.role || 'employee',
            selfSubmitted: self?.status === 'submitted',
            managerSubmitted: mgrRev?.status === 'submitted',
            finalized: !!score,
            finalScore: score?.finalScore || null,
            ratingBand: score?.rating || null
          });
        }

        activeCycleMetrics.push({
          cycle,
          cycleId: cycle._id.toString(),
          reviewMonth: cycle.reviewMonth,
          targetRole: cycle.targetRole || 'employee',
          departmentName: deptName,
          totalEligible: eligibleUsers.length,
          submittedSelfCount,
          submittedMgrCount,
          finalizedScoreCount,
          submissions: cycleSubmissions
        });
      }

      // 2. Fetch all review scores for HR organizational leaderboards
      const allScores = await ReviewScore.find()
        .populate('reviewCycleId')
        .populate({
          path: 'employeeId',
          select: 'firstName lastName email employeeCode role designationId departmentId avatar',
          populate: { path: 'departmentId designationId' }
        })
        .sort({ calculatedAt: -1 });

      const allEmployeeScores = allScores.filter(s => s.employeeId?.role === 'employee');
      const allManagerScores = allScores.filter(s => s.employeeId?.role === 'manager' || s.employeeId?.role === 'hr');

      // 3. Pending Manager Reviews for Executive / Admin / HR evaluation desk
      const pendingManagerReviews = [];
      const mongoose = require('mongoose');
      const teamQuery = {
        $or: [
          { managerId: userId },
          { managerId: new mongoose.Types.ObjectId(userId) }
        ],
        employmentStatus: 'active'
      };

      if (user.role === 'executive') {
        teamQuery.$or.push({ role: { $in: ['manager', 'hr'] } });
      }

      const team = await User.find(teamQuery).populate('departmentId');
      for (const cycle of activeCycles) {
        if (cycle.status !== 'active') continue;

        for (const member of team) {
          // Department scoping check
          if (cycle.departmentId) {
            const cycleDeptId = cycle.departmentId._id ? cycle.departmentId._id.toString() : cycle.departmentId.toString();
            const memberDeptId = member.departmentId?._id ? member.departmentId._id.toString() : (member.departmentId ? member.departmentId.toString() : '');

            if (!memberDeptId || memberDeptId !== cycleDeptId) {
              continue;
            }
          }

          // Target role check
          if (cycle.targetRole === 'manager' && member.role === 'employee') continue;
          if (cycle.targetRole === 'employee' && ['manager', 'hr', 'executive'].includes(member.role)) continue;

          // Eligibility check
          if (member.joiningDate && !isEmployeeEligibleForCycle(member.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
            continue;
          }

          const self = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: member._id });
          const mgrRev = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: member._id });
          if (!mgrRev || mgrRev.status !== 'submitted') {
            pendingManagerReviews.push({
              employee: member,
              cycleMonth: cycle.reviewMonth,
              cycleId: cycle._id,
              isEmployeeSubmitted: self ? self.status === 'submitted' : false
            });
          }
        }
      }

      // 4. Audit logs for audit trail tab
      const recentAudits = await AuditLog.find().populate('userId', 'firstName lastName email role').sort({ createdAt: -1 }).limit(30);

      return res.json({
        profile: user,
        stats,
        totalEmployees,
        totalDepartments,
        totalTemplates,
        totalManagers,
        activeCyclesCount: activeCycles.length,
        activeCycleMetrics,
        pendingManagerReviews,
        allEmployeeScores,
        allManagerScores,
        recentAudits,
        notifications,
        pendingSelfAssessments,
        selfAssessmentStatus,
        managerReviewStatus,
        finalScoreFinalized,
        finalScore,
        ratingBand,
        activeCycleId
      });
    }

    return res.json({
      profile: user,
      notifications
    });
  } catch (error) {
    console.error('getDashboardData error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getDashboardData
};
