const WorkJournal = require('../models/WorkJournal');
const User = require('../models/User');
const ProjectStatus = require('../models/ProjectStatus');
const ReviewCycle = require('../models/ReviewCycle');
const { logAction } = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryHelper');
const fs = require('fs');

/**
 * Get Work Journal achievements for logged in user or target employee
 */
const getWorkJournalItems = async (req, res) => {
  try {
    let employeeId = req.query.employeeId;
    const isMgmt = ['admin', 'hr', 'manager', 'executive'].includes(req.user.role);

    if (!employeeId) {
      if (!isMgmt) {
        employeeId = req.user.id;
      }
    }

    // Security: Employee can only view their own work journal unless manager/HR/admin/executive
    if (req.user.role === 'employee' && employeeId && employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, category, project, impactScore, search, startDate, endDate } = req.query;
    const query = {};

    if (employeeId && employeeId !== 'all') {
      if (req.user.role === 'manager') {
        const targetUser = await User.findById(employeeId);
        const managerUser = await User.findById(req.user.id);
        if (targetUser && managerUser && targetUser.departmentId && managerUser.departmentId && targetUser.departmentId.toString() !== managerUser.departmentId.toString()) {
          return res.status(403).json({ message: 'Access denied. You can only view logs of users in your department.' });
        }
      }
      query.employeeId = employeeId;
    } else {
      if (req.user.role === 'manager') {
        const managerUser = await User.findById(req.user.id);
        if (managerUser && managerUser.departmentId) {
          const deptUsers = await User.find({ departmentId: managerUser.departmentId }).select('_id');
          const deptUserIds = deptUsers.map(u => u._id);
          query.employeeId = { $in: deptUserIds };
        }
      }
    }

    if (startDate || endDate) {
      query.completedDate = {};
      if (startDate) query.completedDate.$gte = new Date(startDate);
      if (endDate) query.completedDate.$lte = new Date(endDate);
    }

    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (project && project !== 'all') {
      query.project = { $regex: `^${project}$`, $options: 'i' };
    }
    if (impactScore && impactScore !== 'all') {
      query.impactScore = impactScore;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { project: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { businessImpact: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await WorkJournal.find(query)
      .populate({
        path: 'employeeId',
        select: 'firstName lastName email role employeeCode departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentName'
        }
      })
      .populate('reviewedBy', 'firstName lastName email role')
      .sort({ completedDate: -1, createdAt: -1 });

    res.json(items);
  } catch (error) {
    console.error('getWorkJournalItems error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Create a new Work Journal achievement entry
 */
const createWorkJournalItem = async (req, res) => {
  try {
    const {
      title,
      project,
      client,
      category,
      resultSummary,
      description,
      hoursSpent,
      evidenceType,
      evidenceRef,
      evidenceUrl,
      completedDate,
      tags,
      customFieldsData
    } = req.body;

    let parsedCustomFieldsData = {};
    if (customFieldsData) {
      try {
        parsedCustomFieldsData = typeof customFieldsData === 'string' ? JSON.parse(customFieldsData) : customFieldsData;
      } catch (e) {
        parsedCustomFieldsData = {};
      }
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Achievement title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Category is required.' });
    }
    if (!project || !project.trim()) {
      return res.status(400).json({ message: 'Project / Client / Account name is required.' });
    }
    if (!hoursSpent || isNaN(Number(hoursSpent)) || Number(hoursSpent) <= 0) {
      return res.status(400).json({ message: 'Hours Spent is required and must be a positive number.' });
    }
    if (!resultSummary || !resultSummary.trim()) {
      return res.status(400).json({ message: 'Work Summary & Output Result is required.' });
    }
    if (!evidenceRef || !evidenceRef.trim()) {
      return res.status(400).json({ message: 'Proof Link / Reference ID is required.' });
    }

    // Closed Review Cycle Isolation Check
    const targetDate = completedDate ? new Date(completedDate) : new Date();
    const closedCycles = await ReviewCycle.find({ status: 'closed' });
    const user = await User.findById(req.user.id);
    const userDeptId = user?.departmentId?.toString();
    const userRole = user?.role;

    const isInClosedCycle = closedCycles.some(c => {
      const cycleDeptId = c.departmentId?.toString();
      const deptMatches = !cycleDeptId || (userDeptId && cycleDeptId === userDeptId);

      let roleMatches = true;
      if (c.targetRole === 'manager') {
        roleMatches = userRole === 'manager' || userRole === 'hr';
      } else if (c.targetRole === 'employee') {
        roleMatches = userRole === 'employee';
      }

      if (deptMatches && roleMatches) {
        const cStart = new Date(c.startDate);
        const cEnd = new Date(c.endDate);
        cStart.setUTCHours(0, 0, 0, 0);
        cEnd.setUTCHours(23, 59, 59, 999);
        return targetDate >= cStart && targetDate <= cEnd;
      }
      return false;
    });

    if (isInClosedCycle && req.user.role === 'employee') {
      return res.status(400).json({ message: 'Cannot submit work logs for a date that falls within a closed review cycle.' });
    }

    let finalEvidenceUrl = (evidenceUrl || '').trim();
    if (req.file) {
      try {
        const publicId = `evidence/${user.employeeCode.toLowerCase()}-${Date.now()}`;
        const uploadResult = await uploadToCloudinary(req.file.path, publicId);
        finalEvidenceUrl = uploadResult.secure_url;
      } catch (err) {
        console.error('Cloudinary work journal upload error:', err);
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(500).json({ message: 'Failed to upload evidence file to Cloudinary.' });
      }
    }

    const item = await WorkJournal.create({
      employeeId: req.user.id,
      title: title.trim(),
      project: (project || '').trim(),
      category,
      customFieldsData: parsedCustomFieldsData,
      resultSummary: (resultSummary || description || '').trim(),
      hoursSpent: Number(hoursSpent) || 0,
      evidenceType: evidenceType || 'Screenshot Upload',
      evidenceRef: (evidenceRef || '').trim(),
      evidenceUrl: finalEvidenceUrl,
      completedDate: completedDate ? new Date(completedDate) : new Date(),
      status: 'submitted',
      isLocked: false
    });

    await logAction({
      req,
      userId: req.user.id,
      action: 'CREATE_WORK_JOURNAL',
      module: 'WorkJournal',
      entityType: 'WorkJournal',
      entityId: item._id,
      after: { title: item.title, category: item.category }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('createWorkJournalItem error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

/**
 * Update Work Journal achievement entry
 */
const updateWorkJournalItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await WorkJournal.findById(id);

    if (!item) {
      return res.status(404).json({ message: 'Work Journal entry not found.' });
    }

    if (item.isLocked && req.user.role === 'employee') {
      return res.status(400).json({ message: 'Verified evidence is locked and cannot be edited.' });
    }

    if (item.employeeId.toString() !== req.user.id.toString() && !['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const updateData = { ...req.body };

    if (updateData.title !== undefined && (!updateData.title || !updateData.title.trim())) {
      return res.status(400).json({ message: 'Achievement title is required.' });
    }
    if (updateData.category !== undefined && (!updateData.category || !updateData.category.trim())) {
      return res.status(400).json({ message: 'Category is required.' });
    }
    if (updateData.project !== undefined && (!updateData.project || !updateData.project.trim())) {
      return res.status(400).json({ message: 'Project / Client / Account name is required.' });
    }
    if (updateData.hoursSpent !== undefined && (!updateData.hoursSpent || isNaN(Number(updateData.hoursSpent)) || Number(updateData.hoursSpent) <= 0)) {
      return res.status(400).json({ message: 'Hours Spent is required and must be a positive number.' });
    }
    if (updateData.resultSummary !== undefined && (!updateData.resultSummary || !updateData.resultSummary.trim())) {
      return res.status(400).json({ message: 'Work Summary & Output Result is required.' });
    }
    if (updateData.evidenceRef !== undefined && (!updateData.evidenceRef || !updateData.evidenceRef.trim())) {
      return res.status(400).json({ message: 'Proof Link / Reference ID is required.' });
    }
    if (updateData.customFieldsData) {
      try {
        updateData.customFieldsData = typeof updateData.customFieldsData === 'string'
          ? JSON.parse(updateData.customFieldsData)
          : updateData.customFieldsData;
      } catch (e) {
        updateData.customFieldsData = {};
      }
    }

    // Closed Review Cycle Isolation Check for Edits
    const targetDate = updateData.completedDate ? new Date(updateData.completedDate) : new Date(item.completedDate);
    const closedCycles = await ReviewCycle.find({ status: 'closed' });
    const user = await User.findById(req.user.id);
    const userDeptId = user?.departmentId?.toString();
    const userRole = user?.role;

    const isInClosedCycle = closedCycles.some(c => {
      const cycleDeptId = c.departmentId?.toString();
      const deptMatches = !cycleDeptId || (userDeptId && cycleDeptId === userDeptId);

      let roleMatches = true;
      if (c.targetRole === 'manager') {
        roleMatches = userRole === 'manager' || userRole === 'hr';
      } else if (c.targetRole === 'employee') {
        roleMatches = userRole === 'employee';
      }

      if (deptMatches && roleMatches) {
        const cStart = new Date(c.startDate);
        const cEnd = new Date(c.endDate);
        cStart.setUTCHours(0, 0, 0, 0);
        cEnd.setUTCHours(23, 59, 59, 999);
        return targetDate >= cStart && targetDate <= cEnd;
      }
      return false;
    });

    if (isInClosedCycle && req.user.role === 'employee') {
      return res.status(400).json({ message: 'Cannot edit work logs for a date that falls within a closed review cycle.' });
    }

    if (req.file) {
      try {
        if (item.evidenceUrl && item.evidenceUrl.includes('cloudinary')) {
          await deleteFromCloudinary(item.evidenceUrl);
        }
        const publicId = `evidence/${user.employeeCode.toLowerCase()}-${Date.now()}`;
        const uploadResult = await uploadToCloudinary(req.file.path, publicId);
        updateData.evidenceUrl = uploadResult.secure_url;
      } catch (err) {
        console.error('Cloudinary work journal edit upload error:', err);
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(500).json({ message: 'Failed to upload new evidence file to Cloudinary.' });
      }
    }

    if (item.status === 'approved' || item.status === 'needs_changes') {
      updateData.status = 'submitted';
      updateData.isLocked = false;
    }

    const updated = await WorkJournal.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updated);
  } catch (error) {
    console.error('updateWorkJournalItem error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Delete Work Journal achievement entry
 */
const deleteWorkJournalItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await WorkJournal.findById(id);

    if (!item) {
      return res.status(404).json({ message: 'Work Journal entry not found.' });
    }

    if (item.isLocked && req.user.role === 'employee') {
      return res.status(400).json({ message: 'Verified evidence is locked and cannot be deleted.' });
    }

    if (item.employeeId.toString() !== req.user.id.toString() && !['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (item.evidenceUrl && item.evidenceUrl.includes('cloudinary')) {
      try {
        await deleteFromCloudinary(item.evidenceUrl);
      } catch (err) {
        console.error('Failed to delete work journal evidence from Cloudinary on delete:', err);
      }
    }

    await WorkJournal.findByIdAndDelete(id);
    res.json({ message: 'Achievement evidence deleted successfully.' });
  } catch (error) {
    console.error('deleteWorkJournalItem error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Manager Evidence Verification Desk: Get direct reportees' pending achievement evidence
 */
const getPendingManagerItems = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = req.user.id;

    let reporteeIds = [];

    const showAll = req.query.all === 'true' && ['admin', 'hr', 'executive'].includes(req.user.role);

    if (showAll) {
      const allUsers = await User.find({ employmentStatus: 'active' }).select('_id');
      reporteeIds = allUsers.map(u => u._id);
    } else {
      let query = {
        employmentStatus: 'active'
      };

      if (req.user.role === 'executive') {
        // CEO gets all managers, HR managers, admins, and anyone explicitly reporting to them
        query.$or = [
          { managerId: userId },
          { managerId: new mongoose.Types.ObjectId(userId) },
          { role: { $in: ['manager', 'hr', 'admin'] } }
        ];
      } else {
        // Standard manager gets only their explicit reportees
        query.$or = [
          { managerId: userId },
          { managerId: new mongoose.Types.ObjectId(userId) }
        ];
      }

      const directReports = await User.find(query).select('_id');
      reporteeIds = directReports.map(u => u._id);

      // Admin org-wide fallback if they don't have direct reportees assigned
      if (reporteeIds.length === 0 && req.user.role === 'admin') {
        const allUsers = await User.find({ employmentStatus: 'active' }).select('_id');
        reporteeIds = allUsers.map(u => u._id);
      }
    }

    // Exclude the current user from their own reportees so they cannot approve their own logs
    reporteeIds = reporteeIds.filter(id => id.toString() !== userId.toString());

    const pendingItems = await WorkJournal.find({
      employeeId: { $in: reporteeIds }
    })
      .populate('employeeId', 'firstName lastName email employeeCode role departmentId designationId')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(pendingItems);
  } catch (error) {
    console.error('getPendingManagerItems error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Manager Evidence Review Action: Approve / Reject / Need Changes
 */
const reviewWorkJournalItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerFeedback, impactScore, businessImpact } = req.body;

    if (!['approved', 'rejected', 'needs_changes'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved, rejected, or needs_changes.' });
    }

    const item = await WorkJournal.findById(id).populate('employeeId');
    if (!item) {
      return res.status(404).json({ message: 'Work Journal entry not found.' });
    }

    if (item.employeeId?._id.toString() === req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied. You cannot review your own work evidence.' });
    }

    const isManagerOfEmployee = item.employeeId?.managerId?.toString() === req.user.id.toString();
    const isAdminOrExec = ['admin', 'executive'].includes(req.user.role);

    if (!isManagerOfEmployee && !isAdminOrExec) {
      return res.status(403).json({ message: 'Access denied. You can only review evidence for your direct reportees.' });
    }

    if (item.isLocked || item.status === 'approved') {
      return res.status(400).json({ message: 'This work log is already approved and locked. Status cannot be changed.' });
    }

    item.status = status;
    item.managerFeedback = (managerFeedback || '').trim();
    if (businessImpact) {
      item.businessImpact = businessImpact.trim();
    }
    if (impactScore) {
      item.impactScore = impactScore;
    }
    if (status === 'approved') {
      item.isLocked = true; // Lock evidence permanently on approval
    }
    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();

    await item.save();

    await logAction({
      req,
      userId: req.user.id,
      action: 'REVIEW_WORK_JOURNAL',
      module: 'WorkJournal',
      entityType: 'WorkJournal',
      entityId: item._id,
      after: {
        title: item.title,
        status: item.status,
        employeeId: item.employeeId?._id
      }
    });

    res.json(item);
  } catch (error) {
    console.error('reviewWorkJournalItem error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get Work Journal Metrics, Category Breakdown, and Work Streaks
 */
const getWorkJournalStats = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;
    const allItems = await WorkJournal.find({ employeeId });

    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.ceil((currentMonth + 1) / 3);

    let todayLogsCount = 0;
    let monthLogsCount = 0;
    let quarterLogsCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let totalHoursSpent = 0;

    allItems.forEach(i => {
      const d = new Date(i.completedDate || i.createdAt);
      if (d.toDateString() === todayStr) todayLogsCount++;
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) monthLogsCount++;
      const itemQuarter = Math.ceil((d.getMonth() + 1) / 3);
      if (itemQuarter === currentQuarter && d.getFullYear() === currentYear) quarterLogsCount++;

      if (i.status === 'submitted') pendingCount++;
      if (i.status === 'approved' || i.isLocked) approvedCount++;
      totalHoursSpent += (i.hoursSpent || 0);
    });

    res.json({
      todayLogsCount,
      monthLogsCount,
      quarterLogsCount,
      pendingCount,
      approvedCount,
      totalHoursSpent: Math.round(totalHoursSpent * 10) / 10,
      totalSubmitted: allItems.length,
      totalApproved: approvedCount,
      totalPending: pendingCount
    });
  } catch (error) {
    console.error('getWorkJournalStats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get Interactive AI Timeline (Chronological growth progression by month)
 */
const getWorkJournalTimeline = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;
    const items = await WorkJournal.find({ employeeId, status: 'approved' })
      .sort({ completedDate: 1 });

    const timelineByMonth = {};

    items.forEach(item => {
      const d = new Date(item.completedDate);
      const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (!timelineByMonth[monthKey]) {
        timelineByMonth[monthKey] = [];
      }
      timelineByMonth[monthKey].push(item);
    });

    res.json(timelineByMonth);
  } catch (error) {
    console.error('getWorkJournalTimeline error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==================== WEEKLY & MONTHLY REFLECTIONS ====================

const getWeeklyReflections = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;
    const reflections = await WeeklyReflection.find({ employeeId }).sort({ weekStartDate: -1 });
    res.json(reflections);
  } catch (error) {
    console.error('getWeeklyReflections error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createWeeklyReflection = async (req, res) => {
  try {
    const {
      topAchievements,
      biggestChallenge,
      teammateHelp,
      learnedSomething,
      nextWeekPriority
    } = req.body;

    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStartDate = new Date(now.setDate(diffToMonday));
    const weekEndDate = new Date(now.setDate(diffToMonday + 6));

    const reflection = await WeeklyReflection.create({
      employeeId: req.user.id,
      weekStartDate,
      weekEndDate,
      topAchievements: (topAchievements || '').trim(),
      biggestChallenge: (biggestChallenge || '').trim(),
      teammateHelp: (teammateHelp || '').trim(),
      learnedSomething: (learnedSomething || '').trim(),
      nextWeekPriority: (nextWeekPriority || '').trim(),
      status: 'submitted'
    });

    res.status(201).json(reflection);
  } catch (error) {
    console.error('createWeeklyReflection error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getMonthlyReflections = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;
    const reflections = await MonthlyReflection.find({ employeeId }).sort({ monthYear: -1 });
    res.json(reflections);
  } catch (error) {
    console.error('getMonthlyReflections error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createMonthlyReflection = async (req, res) => {
  try {
    const {
      monthYear,
      achievementsSummary,
      challenges,
      learning,
      innovation,
      clientAppreciation,
      suggestions
    } = req.body;

    const mYear = monthYear || new Date().toISOString().slice(0, 7);

    const reflection = await MonthlyReflection.findOneAndUpdate(
      { employeeId: req.user.id, monthYear: mYear },
      {
        employeeId: req.user.id,
        monthYear: mYear,
        achievementsSummary: (achievementsSummary || '').trim(),
        challenges: (challenges || '').trim(),
        learning: (learning || '').trim(),
        innovation: (innovation || '').trim(),
        clientAppreciation: (clientAppreciation || '').trim(),
        suggestions: (suggestions || '').trim(),
        status: 'submitted'
      },
      { upsert: true, new: true }
    );

    res.status(201).json(reflection);
  } catch (error) {
    console.error('createMonthlyReflection error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Batch Review Work Journal entries (e.g. approve all pending logs for an employee)
 */
const batchReviewWorkJournalItems = async (req, res) => {
  try {
    const { itemIds, status, managerFeedback } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'itemIds array is required.' });
    }

    if (!['approved', 'rejected', 'needs_changes'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const items = await WorkJournal.find({ _id: { $in: itemIds } }).populate('employeeId');

    const updatedIds = [];
    for (const item of items) {
      const isManagerOfEmployee = item.employeeId?.managerId?.toString() === req.user.id.toString();
      const isAdminOrExec = ['admin', 'executive'].includes(req.user.role);

      if (!isManagerOfEmployee && !isAdminOrExec) continue;
      if (item.isLocked || item.status === 'approved') continue;

      item.status = status;
      if (managerFeedback) item.managerFeedback = managerFeedback.trim();
      if (status === 'approved') item.isLocked = true;
      item.reviewedBy = req.user.id;
      item.reviewedAt = new Date();

      await item.save();
      updatedIds.push(item._id);
    }

    res.json({ message: `${updatedIds.length} work logs updated to ${status}.`, updatedIds });
  } catch (error) {
    console.error('batchReviewWorkJournalItems error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getProjectStatuses = async (req, res) => {
  try {
    const statuses = await ProjectStatus.find().populate('updatedBy', 'firstName lastName');
    res.json(statuses);
  } catch (error) {
    console.error('getProjectStatuses error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateProjectStatus = async (req, res) => {
  try {
    const { projectName, status } = req.body;
    if (!projectName || !status) {
      return res.status(400).json({ message: 'projectName and status are required.' });
    }

    if (!['Active', 'Inactive', 'Stale', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Active, Inactive, Stale, or Completed.' });
    }

    // Upsert the status for this project name
    const projectStatus = await ProjectStatus.findOneAndUpdate(
      { projectName: projectName.trim() },
      { 
        projectName: projectName.trim(), 
        status, 
        updatedBy: req.user.id 
      },
      { new: true, upsert: true }
    );

    res.json(projectStatus);
  } catch (error) {
    console.error('updateProjectStatus error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getWorkJournalItems,
  createWorkJournalItem,
  updateWorkJournalItem,
  deleteWorkJournalItem,
  getPendingManagerItems,
  reviewWorkJournalItem,
  batchReviewWorkJournalItems,
  getWorkJournalStats,
  getWorkJournalTimeline,
  getWeeklyReflections,
  createWeeklyReflection,
  getMonthlyReflections,
  createMonthlyReflection,
  getProjectStatuses,
  updateProjectStatus
};
