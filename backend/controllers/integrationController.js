const Attendance = require('../models/Attendance');
const LmsRecord = require('../models/LmsRecord');
const IntegrationLog = require('../models/IntegrationLog');
const User = require('../models/User');

// ==================== ATTENDANCE INTEGRATION ====================
const getAttendance = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (month) filter.month = month;

    const records = await Attendance.find(filter)
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode email departmentId designationId profilePhoto gender role',
        populate: { path: 'departmentId designationId' }
      })
      .sort('-month');

    res.json(records);
  } catch (error) {
    console.error('getAttendance error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const syncAttendance = async (req, res) => {
  try {
    const { employeeId, month, totalWorkingDays, daysPresent } = req.body;

    if (!employeeId || !month || !totalWorkingDays || daysPresent === undefined) {
      return res.status(400).json({ message: 'employeeId, month, totalWorkingDays, and daysPresent are required.' });
    }

    const percentage = +((daysPresent / totalWorkingDays) * 100).toFixed(2);

    let record = await Attendance.findOne({ employeeId, month });
    if (record) {
      record.totalWorkingDays = totalWorkingDays;
      record.daysPresent = daysPresent;
      record.attendancePercentage = percentage;
      await record.save();
    } else {
      record = await Attendance.create({
        employeeId,
        month,
        totalWorkingDays,
        daysPresent,
        attendancePercentage: percentage
      });
    }

    // Log integration event
    await IntegrationLog.create({
      system: 'attendance',
      eventType: 'attendance_sync',
      payload: { employeeId, month, totalWorkingDays, daysPresent, percentage },
      status: 'success',
      responseMessage: `Synced attendance for ${month}: ${percentage}%`
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('syncAttendance error:', error);
    await IntegrationLog.create({
      system: 'attendance',
      eventType: 'attendance_sync',
      payload: req.body,
      status: 'failed',
      responseMessage: error.message
    });
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const batchSyncAttendance = async (req, res) => {
  try {
    const { departmentId, month, totalWorkingDays, daysPresent } = req.body;

    if (!month || !totalWorkingDays || daysPresent === undefined) {
      return res.status(400).json({ message: 'Month, totalWorkingDays, and daysPresent are required.' });
    }

    const userFilter = { employmentStatus: 'active' };
    if (departmentId && departmentId !== 'all') {
      userFilter.departmentId = departmentId;
    }

    const targetUsers = await User.find(userFilter);
    if (targetUsers.length === 0) {
      return res.status(404).json({ message: 'No eligible active employees found for batch sync.' });
    }

    let syncedCount = 0;
    const percentage = +((daysPresent / totalWorkingDays) * 100).toFixed(2);

    for (const emp of targetUsers) {
      let record = await Attendance.findOne({ employeeId: emp._id, month });
      if (record) {
        record.totalWorkingDays = totalWorkingDays;
        record.daysPresent = daysPresent;
        record.attendancePercentage = percentage;
        await record.save();
      } else {
        await Attendance.create({
          employeeId: emp._id,
          month,
          totalWorkingDays,
          daysPresent,
          attendancePercentage: percentage
        });
      }
      syncedCount++;
    }

    await IntegrationLog.create({
      system: 'attendance',
      eventType: 'batch_attendance_sync',
      payload: { departmentId: departmentId || 'all', month, totalWorkingDays, daysPresent, syncedCount },
      status: 'success',
      responseMessage: `Batch synced attendance for ${syncedCount} employees for ${month}.`
    });

    res.status(200).json({ message: `Successfully batch synced attendance for ${syncedCount} employees!`, syncedCount });
  } catch (error) {
    console.error('batchSyncAttendance error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// ==================== TEAMS INTEGRATION ====================
const sendTeamsWebhook = async (req, res) => {
  try {
    const { webhookUrl, message, title } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    // Construct Adaptive Card payload structure
    const payload = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "0076D7",
      "summary": title || "PerformNext Review Reminder",
      "sections": [{
        "activityTitle": title || "PerformNext System Notification",
        "activitySubtitle": "Enterprise Performance Platform",
        "text": message
      }]
    };

    let status = 'success';
    let responseMessage = 'Teams Adaptive Card dispatched successfully (simulated webhook delivery).';

    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        const fetchRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        responseMessage = `Teams Webhook HTTP status ${fetchRes.status}`;
      } catch (err) {
        status = 'failed';
        responseMessage = `Webhook delivery failed: ${err.message}`;
      }
    }

    // Log to IntegrationLog
    const log = await IntegrationLog.create({
      system: 'teams',
      eventType: 'webhook_dispatch',
      payload: { webhookUrl, title, message },
      status,
      responseMessage
    });

    res.json({ message: responseMessage, log });
  } catch (error) {
    console.error('sendTeamsWebhook error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// ==================== LMS INTEGRATION ====================
const getLmsRecords = async (req, res) => {
  try {
    const { employeeId } = req.query;
    const filter = {};

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const records = await LmsRecord.find(filter)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode email profilePhoto gender role departmentId designationId', populate: { path: 'departmentId designationId' } })
      .sort('-completionDate');

    res.json(records);
  } catch (error) {
    console.error('getLmsRecords error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const syncLmsRecord = async (req, res) => {
  try {
    const { employeeId, courseName, provider, completionDate, score } = req.body;

    if (!employeeId || !courseName || !provider || !completionDate) {
      return res.status(400).json({ message: 'employeeId, courseName, provider, and completionDate are required.' });
    }

    const record = await LmsRecord.create({
      employeeId,
      courseName,
      provider,
      completionDate,
      score: score || 100,
      status: 'completed'
    });

    await IntegrationLog.create({
      system: 'lms',
      eventType: 'lms_course_completion',
      payload: { employeeId, courseName, provider, score },
      status: 'success',
      responseMessage: `Logged completed course: ${courseName}`
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('syncLmsRecord error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// ==================== INTEGRATION LOGS ====================
const getIntegrationLogs = async (req, res) => {
  try {
    const logs = await IntegrationLog.find().sort('-createdAt').limit(50);
    res.json(logs);
  } catch (error) {
    console.error('getIntegrationLogs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getAttendance,
  syncAttendance,
  batchSyncAttendance,
  sendTeamsWebhook,
  getLmsRecords,
  syncLmsRecord,
  getIntegrationLogs
};
