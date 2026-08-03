const Attendance = require('../models/Attendance');
const AttendancePunch = require('../models/AttendancePunch');
const IntegrationLog = require('../models/IntegrationLog');
const User = require('../models/User');

// Helper to calculate total weekdays (excluding Saturday and Sunday) in a given month.
// For the current month, we limit the counting up to today's date.
function getWeekdayCount(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = (now.getFullYear() === year && (now.getMonth() + 1) === month);
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = isCurrentMonth ? now : new Date(year, month, 0);
  
  let count = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // Exclude Sunday (0) and Saturday (6)
      count++;
    }
  }
  return Math.max(1, count); // Avoid division by zero
}

// ==================== ATTENDANCE INTEGRATION ====================
const getAttendance = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    
    // Setup filter for user queries
    const userQuery = {};
    if (req.user.role === 'employee') {
      userQuery._id = req.user.id;
    } else if (employeeId) {
      userQuery._id = employeeId;
    } else {
      userQuery.role = { $in: ['employee', 'manager', 'hr'] };
    }

    const users = await User.find(userQuery)
      .populate('departmentId designationId')
      .lean();

    // Setup filter for daily punches
    const punchQuery = {};
    if (req.user.role === 'employee') {
      punchQuery.employeeId = req.user.id;
    } else if (employeeId) {
      punchQuery.employeeId = employeeId;
    }

    if (month) {
      punchQuery.month = month;
    }

    const punches = await AttendancePunch.find(punchQuery).lean();

    // Get list of unique months to calculate summaries for
    const uniqueMonths = month ? [month] : Array.from(new Set(punches.map(p => p.month)));
    if (uniqueMonths.length === 0) {
      const now = new Date();
      uniqueMonths.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }

    const records = [];

    // For every user and month, compile dynamic monthly summaries
    users.forEach(user => {
      uniqueMonths.forEach(m => {
        const userMonthPunches = punches.filter(p => p.employeeId.toString() === user._id.toString() && p.month === m);
        
        let daysPresent = 0;
        userMonthPunches.forEach(p => {
          if (p.status === 'Present') daysPresent += 1;
          else if (p.status === 'Half Day') daysPresent += 0.5;
        });

        const totalWorkingDays = getWeekdayCount(m);
        const attendancePercentage = +((daysPresent / totalWorkingDays) * 100).toFixed(2);

        records.push({
          _id: `${user._id}_${m}`,
          employeeId: user,
          month: m,
          totalWorkingDays,
          daysPresent,
          attendancePercentage
        });
      });
    });

    // Sort records descending by month, then employee name
    records.sort((a, b) => b.month.localeCompare(a.month));

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
      "summary": title || "PerfoNext Review Reminder",
      "sections": [{
        "activityTitle": title || "PerfoNext System Notification",
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
    res.json([]);
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

    const log = await IntegrationLog.create({
      system: 'lms',
      eventType: 'lms_course_completion',
      payload: { employeeId, courseName, provider, score },
      status: 'success',
      responseMessage: `Logged completed course: ${courseName}`
    });

    res.status(201).json({ message: `Logged completed course: ${courseName}`, log });
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
