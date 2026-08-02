const WorkJournal = require('../models/WorkJournal');
const User = require('../models/User');
const { logAction } = require('../utils/logger');

/**
 * Get Work Journal achievements for logged in user or target employee
 */
const getWorkJournalItems = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;

    // Security: Employee can only view their own work journal unless manager/HR/admin
    if (req.user.role === 'employee' && employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, category, project, impactScore, search, startDate, endDate } = req.query;
    const query = { employeeId };

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

    if (!title || !category) {
      return res.status(400).json({ message: 'Achievement title and category are required.' });
    }

    let finalEvidenceUrl = (evidenceUrl || '').trim();
    if (req.file) {
      finalEvidenceUrl = `/uploads/${req.file.filename}`;
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

    await logAction(req.user.id, 'CREATE_WORK_JOURNAL', 'WorkJournal', item._id, { title: item.title, category: item.category });

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

    // Fetch direct reportees where managerId is this user's ID
    const directReports = await User.find({
      $or: [
        { managerId: userId },
        { managerId: new mongoose.Types.ObjectId(userId) }
      ],
      employmentStatus: 'active'
    }).select('_id');

    let reporteeIds = directReports.map(u => u._id);

    // Admin/Executive org-wide fallback if they don't have direct reportees assigned
    if (reporteeIds.length === 0 && ['admin', 'executive'].includes(req.user.role)) {
      const allUsers = await User.find({ employmentStatus: 'active' }).select('_id');
      reporteeIds = allUsers.map(u => u._id);
    }

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

    await logAction(req.user.id, 'REVIEW_WORK_JOURNAL', 'WorkJournal', item._id, {
      title: item.title,
      status: item.status,
      employeeId: item.employeeId?._id
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
  createMonthlyReflection
};
