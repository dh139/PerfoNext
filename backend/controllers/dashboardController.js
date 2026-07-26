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

const getDashboardData = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { role, id: userId } = req.user;
    
    // Fetch active review cycles
    const activeCycles = await ReviewCycle.find({ status: 'active' });
    const activeCycleIds = activeCycles.map(c => c._id);

    const user = await User.findById(userId)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName email' });

    const pendingSelfAssessments = [];
    
    if (user && user.role !== 'executive' && user.role !== 'admin') {
      for (const cycle of activeCycles) {
        // Filter by targetRole eligibility
        if (cycle.targetRole === 'manager' && user.role === 'employee') {
          continue;
        }
        if (cycle.targetRole === 'employee' && (user.role === 'manager' || user.role === 'executive')) {
          continue;
        }

        if (user.joiningDate && !isEmployeeEligibleForCycle(user.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
          continue;
        }

        const template = await KpiTemplate.findById(cycle.kpiTemplateId);
        if (template && template.departmentId) {
          const empDeptId = user.departmentId?._id || user.departmentId;
          if (empDeptId && template.departmentId.toString() !== empDeptId.toString()) {
            continue;
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
    }

    if (role === 'employee') {
      // 1. Employee Dashboard Data

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
        if (cycle.targetRole === 'manager') {
          continue; // Skip manager-targeted cycles for employee role
        }

        // Filter by joining date eligibility
        if (!isEmployeeEligibleForCycle(user.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
          continue; // Skip this cycle for this employee as they are not eligible
        }

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

      // Pending manager reviews for active cycles (for manager/executive/hr who have reportees)
      let subordinates;
      if (role === 'executive') {
        subordinates = await User.find({
          $or: [
            { managerId: userId },
            { role: { $in: ['manager', 'hr'] } }
          ],
          employmentStatus: 'active'
        }).populate('departmentId designationId');
      } else {
        subordinates = await User.find({ managerId: userId, employmentStatus: 'active' }).populate('departmentId designationId');
      }
      const subordinateIds = subordinates.map(s => s._id);

      const pendingManagerReviews = [];
      const pendingSelfAssessmentsFromSubordinates = [];

      // Batch fetch all self-assessments and manager-reviews for active cycles & subordinates
      const allSelfAsses = await SelfAssessment.find({
        reviewCycleId: { $in: activeCycleIds },
        employeeId: { $in: subordinateIds }
      });
      const allManRevs = await ManagerReview.find({
        reviewCycleId: { $in: activeCycleIds },
        employeeId: { $in: subordinateIds }
      });

      const selfAssMap = new Map();
      allSelfAsses.forEach(sa => selfAssMap.set(`${sa.reviewCycleId.toString()}_${sa.employeeId.toString()}`, sa));

      const manRevMap = new Map();
      allManRevs.forEach(mr => manRevMap.set(`${mr.reviewCycleId.toString()}_${mr.employeeId.toString()}`, mr));

      for (const cycle of activeCycles) {
        const template = await KpiTemplate.findById(cycle.kpiTemplateId);
        const targetDeptId = template?.departmentId || null;

        for (const sub of subordinates) {
          if (cycle.targetRole === 'manager' && sub.role === 'employee') {
            continue;
          }
          if (cycle.targetRole === 'employee' && (sub.role === 'manager' || sub.role === 'hr')) {
            continue;
          }

          if (!isEmployeeEligibleForCycle(sub.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)) {
            continue;
          }

          if (targetDeptId) {
            const subDeptId = sub.departmentId?._id || sub.departmentId;
            if (subDeptId && targetDeptId.toString() !== subDeptId.toString()) {
              continue;
            }
          }

          const key = `${cycle._id.toString()}_${sub._id.toString()}`;
          const selfAss = selfAssMap.get(key);
          
          if (!selfAss || selfAss.status !== 'submitted') {
            pendingSelfAssessmentsFromSubordinates.push({
              employee: sub,
              cycleMonth: cycle.reviewMonth
            });
          }

          const manRev = manRevMap.get(key);
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

      const teamScores = await ReviewScore.find({ employeeId: { $in: subordinateIds } })
        .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' })
        .populate({ path: 'reviewCycleId', select: 'reviewMonth' })
        .sort('-createdAt');

      if (role === 'manager') {
        return res.json({
          role,
          teamCount: subordinates.length,
          pendingManagerReviews,
          pendingSelfAssessmentsFromSubordinates,
          teamScores,
          pendingSelfAssessments
        });
      }

    if (role === 'hr' || role === 'admin' || role === 'executive') {
      // 3. HR & Admin & Executive Dashboard Data
      const totalDepartments = await Department.countDocuments({ status: 'active' });
      const departmentsList = await Department.find({ status: 'active' }).select('departmentName code').sort('departmentName');
      const totalTemplates = await KpiTemplate.countDocuments({ status: 'active' });
      const totalUsers = await User.countDocuments({ employmentStatus: 'active' });
      const totalManagers = await User.countDocuments({ role: 'manager', employmentStatus: 'active' });

      // Completion metrics for active cycles
      const activeCycleMetrics = [];
      for (const cycle of activeCycles) {
        // Resolve department eligibility from KPI Template
        const template = await KpiTemplate.findById(cycle.kpiTemplateId).populate('departmentId');
        const targetDeptId = template?.departmentId?._id || template?.departmentId || null;

        const employeeFilter = { employmentStatus: 'active' };
        if (cycle.targetRole === 'manager') {
          employeeFilter.role = { $in: ['manager', 'hr'] };
        } else {
          employeeFilter.role = 'employee';
        }
        if (targetDeptId) {
          employeeFilter.departmentId = targetDeptId;
        }

        // Detailed employee submission status & timestamps
        const eligibleUserListFull = await User.find(employeeFilter)
          .populate('departmentId designationId')
          .populate({ path: 'managerId', select: 'firstName lastName' });

        const eligibleUserList = eligibleUserListFull.filter(emp =>
          isEmployeeEligibleForCycle(emp.joiningDate, cycle.cycleType, cycle.reviewMonth, cycle.startDate)
        );

        const totalEmployees = eligibleUserList.length > 0 ? eligibleUserList.length : 1;

        const submissions = await Promise.all(eligibleUserList.map(async (emp) => {
          const selfDoc = await SelfAssessment.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          const mgrDoc = await ManagerReview.findOne({ reviewCycleId: cycle._id, employeeId: emp._id });
          return {
            employeeId: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeCode: emp.employeeCode,
            role: emp.role,
            departmentName: emp.departmentId?.departmentName || '-',
            designationName: emp.designationId?.designationName || '-',
            managerName: emp.managerId ? `${emp.managerId.firstName} ${emp.managerId.lastName}` : 'No Manager',
            selfSubmitted: selfDoc?.status === 'submitted',
            selfSubmittedAt: selfDoc?.submittedAt || null,
            managerSubmitted: mgrDoc?.status === 'submitted',
            managerSubmittedAt: mgrDoc?.submittedAt || null
          };
        }));

        const totalUsersCount = submissions.length;
        const employeeSubmissions = submissions.filter(s => s.role === 'employee');
        const managerSubmissions = submissions.filter(s => s.role === 'manager' || s.role === 'hr');

        const selfSubmitted = submissions.filter(s => s.selfSubmitted).length;
        const managerSubmitted = submissions.filter(s => s.managerSubmitted).length;
        const bothCompleted = submissions.filter(s => s.selfSubmitted && s.managerSubmitted).length;

        activeCycleMetrics.push({
          cycleId: cycle._id,
          reviewMonth: cycle.reviewMonth,
          cycleType: cycle.cycleType,
          targetRole: cycle.targetRole || 'employee',
          templateName: template?.templateName || 'General Template',
          departmentName: template?.departmentId?.departmentName || 'All Departments',
          totalEmployees: totalUsersCount,
          employeeCount: employeeSubmissions.length,
          managerCount: managerSubmissions.length,
          selfSubmittedPercent: totalUsersCount > 0 ? Math.round((selfSubmitted / totalUsersCount) * 100) : 0,
          managerSubmittedPercent: totalUsersCount > 0 ? Math.round((managerSubmitted / totalUsersCount) * 100) : 0,
          completedPercent: totalUsersCount > 0 ? Math.round((bothCompleted / totalUsersCount) * 100) : 0,
          
          // Employee specific stats
          empSelfSubmittedPercent: employeeSubmissions.length > 0 ? Math.round((employeeSubmissions.filter(s => s.selfSubmitted).length / employeeSubmissions.length) * 100) : 0,
          empManagerSubmittedPercent: employeeSubmissions.length > 0 ? Math.round((employeeSubmissions.filter(s => s.managerSubmitted).length / employeeSubmissions.length) * 100) : 0,
          empCompletedPercent: employeeSubmissions.length > 0 ? Math.round((employeeSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / employeeSubmissions.length) * 100) : 0,
          
          // Manager/HR specific stats
          mgrSelfSubmittedPercent: managerSubmissions.length > 0 ? Math.round((managerSubmissions.filter(s => s.selfSubmitted).length / managerSubmissions.length) * 100) : 0,
          mgrManagerSubmittedPercent: managerSubmissions.length > 0 ? Math.round((managerSubmissions.filter(s => s.managerSubmitted).length / managerSubmissions.length) * 100) : 0,
          mgrCompletedPercent: managerSubmissions.length > 0 ? Math.round((managerSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / managerSubmissions.length) * 100) : 0,
          
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

      // Fetch performance rankings for Management & HR (Unique user per ranking)
      const allReviewScores = await ReviewScore.find()
        .populate({ path: 'employeeId', populate: 'departmentId designationId' })
        .populate({ path: 'reviewCycleId', select: 'reviewMonth cycleType' })
        .sort('-createdAt');

      const uniqueEmployeeLatestScores = new Map();
      allReviewScores.forEach(s => {
        if (s.employeeId && s.employeeId._id) {
          const empIdStr = s.employeeId._id.toString();
          if (!uniqueEmployeeLatestScores.has(empIdStr)) {
            uniqueEmployeeLatestScores.set(empIdStr, s);
          }
        }
      });

      const uniqueScores = Array.from(uniqueEmployeeLatestScores.values());

      const employeeScores = uniqueScores.filter(s => s.employeeId?.role === 'employee');
      const managerScores = uniqueScores.filter(s => ['manager', 'hr'].includes(s.employeeId?.role));

      const topEmployeesRanking = [...employeeScores].sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);
      const topManagersRanking = [...managerScores].sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);

      const lowestEmployeesRanking = [...employeeScores].sort((a, b) => a.finalScore - b.finalScore).slice(0, 10);
      const lowestManagersRanking = [...managerScores].sort((a, b) => a.finalScore - b.finalScore).slice(0, 10);

      return res.json({
        role,
        stats: {
          totalDepartments,
          totalTemplates,
          totalUsers,
          totalManagers,
          departmentsList
        },
        activeCycleMetrics,
        scoreDistribution,
        recentAudits,
        teamCount: subordinates.length,
        pendingManagerReviews,
        pendingSelfAssessmentsFromSubordinates,
        teamScores,
        pendingSelfAssessments,
        topEmployeesRanking,
        topManagersRanking,
        lowestEmployeesRanking,
        lowestManagersRanking,
        allEmployeeScores: employeeScores,
        allManagerScores: managerScores
      });
    }

    res.status(400).json({ message: 'Role dashboard not defined.' });
  } catch (error) {
    console.error('getDashboardData error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDashboardData };
