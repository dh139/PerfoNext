const AttendancePunch = require('../models/AttendancePunch');
// const AttendanceSettings = require('../models/AttendanceSettings'); // removed
const AttendanceSyncLog = require('../models/AttendanceSyncLog');
const User = require('../models/User');

// Helper to calculate total working days in a given month,
// excluding configured weekends. Falls back to Sat+Sun if settings unavailable.
function getWeekdayCount(monthStr, configWeekends, holidayDates, joiningDate) {
  const [year, month] = monthStr.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = (now.getFullYear() === year && (now.getMonth() + 1) === month);

  let startDate = new Date(year, month - 1, 1);
  const endDate = isCurrentMonth ? now : new Date(year, month, 0);

  // If joiningDate is in this month, start counting from joiningDate!
  if (joiningDate) {
    const joinDateObj = new Date(joiningDate);
    if (joinDateObj.getFullYear() === year && (joinDateObj.getMonth() + 1) === month) {
      startDate = new Date(year, month - 1, joinDateObj.getDate());
    }
  }

  const weekends = configWeekends || [0, 6];
  const holidays = holidayDates || new Set();

  let count = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (!weekends.includes(d.getDay()) && !holidays.has(dateStr)) count++;
  }
  return Math.max(1, count);
}

function getMonthsBetweenDates(startDate, endDate) {
  const months = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (curr <= last) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    curr.setMonth(curr.getMonth() + 1);
  }
  
  return months;
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

    // Collect all months to calculate holidays for across users' active tenures
    const allQueryMonths = new Set();
    const now = new Date();
    users.forEach(user => {
      const joiningDate = user.joiningDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const userMonths = getMonthsBetweenDates(joiningDate, now);
      userMonths.forEach(m => allQueryMonths.add(m));
    });
    
    // Intersect with requested month if provided
    let uniqueMonthsList = Array.from(allQueryMonths);
    if (month) {
      uniqueMonthsList = uniqueMonthsList.filter(m => m === month);
    }

    const records = [];

    // Load configurable weekends and holidays
    let configWeekends = [0, 6];
    try {
      const AttendanceSettings = require('../models/AttendanceSettings');
      const attSettings = await AttendanceSettings.findOne().sort('-version');
      if (attSettings?.attendanceRules?.weekends?.length > 0) {
        configWeekends = attSettings.attendanceRules.weekends;
      }
    } catch (_) {}

    const holidayDates = new Set();
    try {
      const Holiday = require('../models/Holiday');
      const activeHolidays = await Holiday.find({
        ...(uniqueMonthsList.length > 0 ? { month: { $in: uniqueMonthsList } } : {})
      }).lean();
      activeHolidays.forEach(h => {
        if (h.date) holidayDates.add(h.date);
      });
    } catch (_) {}

    // For every user and month, compile dynamic monthly summaries
    users.forEach(user => {
      const joiningDate = user.joiningDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const userMonths = getMonthsBetweenDates(joiningDate, now);
      const targetMonths = month ? userMonths.filter(m => m === month) : userMonths;

      targetMonths.forEach(m => {
        const userMonthPunches = punches.filter(p => p.employeeId.toString() === user._id.toString() && p.month === m);
        
        let daysPresent = 0;
        userMonthPunches.forEach(p => {
          if (p.status === 'Present' || p.status === 'Late' || p.status === 'Regularized') daysPresent += 1;
          else if (p.status === 'Half Day') daysPresent += 0.5;
        });

        const totalWorkingDays = getWeekdayCount(m, configWeekends, holidayDates, joiningDate);
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
  res.json({ message: 'Attendance sync is now handled dynamically in real-time.' });
};

const batchSyncAttendance = async (req, res) => {
  res.json({ message: 'Batch attendance sync is now handled dynamically in real-time.' });
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

    // Log to AttendanceSyncLog
    const log = await AttendanceSyncLog.create({
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

    const log = await AttendanceSyncLog.create({
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
    const logs = await AttendanceSyncLog.find().sort('-createdAt').limit(50);
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
