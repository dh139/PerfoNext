const AttendancePunch = require('../models/AttendancePunch');
const AttendanceSettings = require('../models/AttendanceSettings');
const AttendanceSettingsHistory = require('../models/AttendanceSettingsHistory');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/logger');
const mongoose = require('mongoose');

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

const parseTimeStr = (str) => {
  if (!str) return { hours: 9, minutes: 0 };
  const match = str.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return { hours: 9, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
};

const getDateWithTime = (baseDate, timeStr) => {
  const d = new Date(baseDate);
  const { hours, minutes } = parseTimeStr(timeStr);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

// Singleton Settings Fetcher
const getActiveSettings = async () => {
  let settings = await AttendanceSettings.findOne();
  if (!settings) {
    settings = new AttendanceSettings();
    await settings.save();
  }
  
  if (settings && settings.attendanceRules) {
    const rules = settings.attendanceRules;
    const start = parseTimeStr(rules.officeStartTime || '09:00 AM');
    const end = parseTimeStr(rules.officeEndTime || '06:00 PM');
    const startMins = start.hours * 60 + start.minutes;
    const endMins = end.hours * 60 + end.minutes;
    
    let dur = endMins - startMins;
    if (dur < 0) dur += 24 * 60;
    
    const lunch = rules.lunchDeductionEnabled ? (rules.lunchDeductionMinutes || 0) : 0;
    const netMins = Math.max(0, dur - lunch);
    const netHours = parseFloat((netMins / 60).toFixed(2));
    
    rules.presentHours = Math.min(rules.presentHours || 8, netHours);
    rules.halfDayHours = Math.min(rules.halfDayHours || 4, rules.presentHours);
  }
  
  return settings;
};

// Auto Punch-Out helper
const autoCloseIncompletePunches = async (settings) => {
  if (!settings.attendanceRules?.autoPunchOut?.enable) return;

  const autoTimeStr = settings.attendanceRules.autoPunchOut.time || '11:59 PM';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayDate = new Date(todayStr);
  const sixteenHoursAgo = new Date(now.getTime() - 16 * 60 * 60 * 1000);

  // Find all punches from previous days that don't have punchOut, aren't Auto Closed / Unusual yet, and were punched in more than 16 hours ago
  const incompletePunches = await AttendancePunch.find({
    date: { $lt: todayDate },
    punchIn: { $exists: true, $lt: sixteenHoursAgo },
    punchOut: { $exists: null },
    status: { $nin: ['Auto Closed', 'Unusual'] }
  });

  if (incompletePunches.length === 0) return;

  const rules = settings.attendanceRules;
  for (const punch of incompletePunches) {
    const punchDateStr = punch.date.toISOString().split('T')[0];
    const outTime = getDateWithTime(new Date(punchDateStr), autoTimeStr);
    
    punch.punchOut = outTime;
    
    const totalDurationMinutes = Math.round((outTime.getTime() - punch.punchIn.getTime()) / 60000);
    punch.totalDurationMinutes = totalDurationMinutes;
    const minMinsForLunch = 300;
    punch.lunchDeductionMinutes = (rules.lunchDeductionEnabled && totalDurationMinutes >= minMinsForLunch) ? rules.lunchDeductionMinutes : 0;
    
    const workingMinutes = Math.max(0, totalDurationMinutes - punch.lunchDeductionMinutes);
    punch.workingMinutes = workingMinutes;
    
    const targetEndTimeStr = (rules.allowEarlyExit && rules.earlyExitTime) ? rules.earlyExitTime : rules.officeEndTime;
    const earlyExitLimit = getDateWithTime(punch.date, targetEndTimeStr);
    punch.earlyExitMinutes = outTime < earlyExitLimit ? Math.round((earlyExitLimit.getTime() - outTime.getTime()) / 60000) : 0;
    
    let overtimeMinutes = 0;
    if (rules.enableOvertime) {
      const shiftEnd = getDateWithTime(punch.date, rules.officeEndTime);
      const extraMins = Math.round((outTime.getTime() - shiftEnd.getTime()) / 60000);
      if (extraMins >= (rules.overtimeMinMinutes || 30)) {
        overtimeMinutes = Math.floor(extraMins / (rules.overtimeRoundMinutes || 15)) * (rules.overtimeRoundMinutes || 15);
      }
    }
    punch.overtimeMinutes = overtimeMinutes;
    punch.status = 'Unusual';

    await punch.save();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUNCH IN
// ─────────────────────────────────────────────────────────────────────────────
const punchIn = async (req, res) => {
  try {
    if (req.user.role === 'executive' || req.user.role === 'admin') {
      return res.status(403).json({ message: 'CEO and Admins are not allowed to punch attendance.' });
    }

    const settings = await getActiveSettings();
    const rules = settings.attendanceRules;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    // 1. Holiday Check
    const holiday = await Holiday.findOne({ date: todayStr });
    if (holiday) {
      return res.status(400).json({ message: `Today is ${holiday.name} (${holiday.type} Holiday). Punching is disabled.` });
    }

    // 2. Weekend Check
    if (rules.weekends && rules.weekends.includes(todayDate.getUTCDay())) {
      return res.status(400).json({ message: 'Today is configured as a weekend. Attendance punching is not available.' });
    }

    // 3. Duplicate Punch In check
    let punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: todayDate });
    if (!punch) {
      const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
      const openYesterdayPunch = await AttendancePunch.findOne({
        employeeId: req.user.id,
        date: yesterdayDate,
        punchIn: { $exists: true },
        punchOut: { $exists: null }
      });
      if (openYesterdayPunch) {
        return res.status(400).json({ message: 'You have an active open punch session from yesterday. Please punch out first.' });
      }
    }
    if (punch && punch.punchIn && rules.multiplePunchPrevention?.onePunchInPerDay) {
      return res.status(400).json({ message: 'You have already punched in for today.' });
    }

    // 4. Late calculations
    const shiftStart = getDateWithTime(todayDate, rules.officeStartTime);
    const graceEnd = new Date(shiftStart.getTime() + (rules.graceMinutes || 0) * 60000);
    const lateMinutes = now > graceEnd ? Math.round((now.getTime() - shiftStart.getTime()) / 60000) : 0;

    if (!punch) {
      punch = new AttendancePunch({
        employeeId: req.user.id,
        date: todayDate,
        month: todayStr.substring(0, 7),
        punchIn: now,
        status: lateMinutes > 0 ? 'Late' : 'Incomplete',
        lateMinutes,
        ipAddress: req.ip || '',
        browser: req.headers['user-agent'] || '',
        device: req.headers['sec-ch-ua-platform'] || 'Unknown',
        location: req.body.location || 'Office'
      });
    } else {
      punch.punchIn = now;
      punch.status = lateMinutes > 0 ? 'Late' : 'Incomplete';
      punch.lateMinutes = lateMinutes;
    }

    await punch.save();
    await logAction({ req, userId: req.user.id, action: 'EMPLOYEE_PUNCH_IN', module: 'Attendance', status: 'SUCCESS', entityType: 'AttendancePunch', entityId: punch._id });

    res.json({ message: 'Punched in successfully.', punch });
  } catch (error) {
    console.error('punchIn error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUNCH OUT
// ─────────────────────────────────────────────────────────────────────────────
const punchOut = async (req, res) => {
  try {
    if (req.user.role === 'executive' || req.user.role === 'admin') {
      return res.status(403).json({ message: 'CEO and Admins are not allowed to punch attendance.' });
    }

    const settings = await getActiveSettings();
    const rules = settings.attendanceRules;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    let punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: todayDate });
    if (!punch) {
      const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
      const openYesterdayPunch = await AttendancePunch.findOne({
        employeeId: req.user.id,
        date: yesterdayDate,
        punchIn: { $exists: true },
        punchOut: { $exists: null }
      });
      if (openYesterdayPunch) {
        punch = openYesterdayPunch;
      }
    }

    if (!punch || !punch.punchIn) {
      return res.status(400).json({ message: 'You must punch in first before punching out.' });
    }
    if (punch.punchOut && rules.multiplePunchPrevention?.onePunchOutPerDay) {
      return res.status(400).json({ message: 'You have already punched out for today.' });
    }

    const shiftEnd = getDateWithTime(punch.date, rules.officeEndTime);
    punch.punchOut = now;

    const totalDurationMinutes = Math.round((now.getTime() - punch.punchIn.getTime()) / 60000);
    punch.totalDurationMinutes = totalDurationMinutes;
    const minMinsForLunch = 300;
    punch.lunchDeductionMinutes = (rules.lunchDeductionEnabled && totalDurationMinutes >= minMinsForLunch) ? rules.lunchDeductionMinutes : 0;

    const workingMinutes = Math.max(0, totalDurationMinutes - punch.lunchDeductionMinutes);
    punch.workingMinutes = workingMinutes;

    // Early exit check
    const targetEndTimeStr = (rules.allowEarlyExit && rules.earlyExitTime) ? rules.earlyExitTime : rules.officeEndTime;
    const earlyExitLimit = getDateWithTime(punch.date, targetEndTimeStr);
    punch.earlyExitMinutes = now < earlyExitLimit ? Math.round((earlyExitLimit.getTime() - now.getTime()) / 60000) : 0;

    // Overtime check
    let overtimeMinutes = 0;
    if (rules.enableOvertime) {
      const extraMins = Math.round((now.getTime() - shiftEnd.getTime()) / 60000);
      if (extraMins >= (rules.overtimeMinMinutes || 30)) {
        overtimeMinutes = Math.floor(extraMins / (rules.overtimeRoundMinutes || 15)) * (rules.overtimeRoundMinutes || 15);
      }
    }
    punch.overtimeMinutes = overtimeMinutes;

    // Status assignment
    const presentMins = (rules.presentHours || 8) * 60;
    const halfDayMins = (rules.halfDayHours || 4) * 60;

    let isEarlyExitPresent = false;
    if (rules.allowEarlyExit && rules.earlyExitTime) {
      const earlyExitTarget = getDateWithTime(punch.date, rules.earlyExitTime);
      if (now >= earlyExitTarget) {
        isEarlyExitPresent = true;
      }
    }

    if (workingMinutes >= presentMins || isEarlyExitPresent) {
      // If punchIn was late, maintain Late status or set Present
      punch.status = punch.lateMinutes > 0 ? 'Late' : 'Present';
    } else if (workingMinutes >= halfDayMins) {
      punch.status = 'Half Day';
    } else {
      punch.status = 'Absent';
    }

    await punch.save();
    await logAction({ req, userId: req.user.id, action: 'EMPLOYEE_PUNCH_OUT', module: 'Attendance', status: 'SUCCESS', entityType: 'AttendancePunch', entityId: punch._id });

    res.json({ message: 'Punched out successfully.', punch });
  } catch (error) {
    console.error('punchOut error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TODAY'S ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
const getTodayAttendance = async (req, res) => {
  try {
    const settings = await getActiveSettings();
    await autoCloseIncompletePunches(settings);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const holiday = await Holiday.findOne({ date: todayStr });
    const isWeekend = settings.attendanceRules.weekends.includes(todayDate.getUTCDay());

    let punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: todayDate });
    if (!punch) {
      const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
      const openYesterdayPunch = await AttendancePunch.findOne({
        employeeId: req.user.id,
        date: yesterdayDate,
        punchIn: { $exists: true },
        punchOut: { $exists: null }
      });
      if (openYesterdayPunch) {
        punch = openYesterdayPunch;
      }
    }
    
    res.json({
      punch: punch || { status: 'Not Punched Yet' },
      isHoliday: !!holiday,
      holidayName: holiday ? holiday.name : null,
      isWeekend,
      settings: settings.attendanceRules
    });
  } catch (error) {
    console.error('getTodayAttendance error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const settings = await getActiveSettings();
    await autoCloseIncompletePunches(settings);

    let targetEmployeeId = req.user.id;
    if (req.query.employeeId && ['hr', 'admin', 'manager', 'executive'].includes(req.user.role)) {
      targetEmployeeId = req.query.employeeId;
    }
    const punches = await AttendancePunch.find({ employeeId: targetEmployeeId })
      .sort('-date')
      .limit(30);
    res.json(punches);
  } catch (error) {
    console.error('getHistory error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
const getCalendar = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month parameter is required.' });
    const punches = await AttendancePunch.find({ employeeId: req.user.id, month }).sort('date');
    res.json(punches);
  } catch (error) {
    console.error('getCalendar error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGULARIZATION — SUBMIT
// ─────────────────────────────────────────────────────────────────────────────
const submitRegularization = async (req, res) => {
  try {
    const { date, requestedPunchIn, requestedPunchOut, reason } = req.body;
    if (!date || !requestedPunchIn || !requestedPunchOut || !reason) {
      return res.status(400).json({ message: 'date, requestedPunchIn, requestedPunchOut, and reason are required.' });
    }

    const settings = await getActiveSettings();
    const rules = settings.attendanceRules;
    const targetDateStr = date.split('T')[0];
    const targetDate = new Date(targetDateStr);

    // Block regularization on weekends
    const isWeekend = rules.weekends?.includes(targetDate.getUTCDay());
    if (isWeekend) {
      return res.status(400).json({ message: 'Attendance regularization is not allowed on weekly off days (weekends).' });
    }

    // Block regularization on public holidays
    const holiday = await Holiday.findOne({ date: targetDateStr });
    if (holiday) {
      return res.status(400).json({ message: `Attendance regularization is not allowed on public holidays (${holiday.name}).` });
    }

    let punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: targetDate });
    if (!punch) {
      punch = new AttendancePunch({
        employeeId: req.user.id,
        date: targetDate,
        month: targetDateStr.substring(0, 7),
        status: 'Absent'
      });
    }

    if (punch.regularizationStatus === 'pending' && rules.multiplePunchPrevention?.preventDuplicateRequests) {
      return res.status(400).json({ message: 'A regularization request for this date is already pending.' });
    }

    punch.requestedPunchIn = new Date(requestedPunchIn);
    punch.requestedPunchOut = new Date(requestedPunchOut);
    punch.regularizationStatus = 'pending';
    punch.regularizationReason = reason;

    await punch.save();

    // Notify the employee's reporting manager and/or CEO
    try {
      const employee = await User.findById(req.user.id);
      if (employee) {
        const targetUserIds = new Set();

        if (employee.role === 'employee') {
          // Employee request -> notify only HR manager
          const hrManagers = await User.find({ role: 'hr' });
          hrManagers.forEach(hr => targetUserIds.add(hr._id.toString()));
        } else if (employee.role === 'manager' || employee.role === 'hr') {
          // Manager or HR request -> notify only CEO (role: executive)
          const ceos = await User.find({ role: 'executive' });
          ceos.forEach(ceo => targetUserIds.add(ceo._id.toString()));
        }

        // Send notifications to all unique target IDs
        if (targetUserIds.size > 0) {
          await Promise.all(
            Array.from(targetUserIds).map(userId =>
              Notification.create({
                userId,
                type: 'regularization_submitted',
                message: `${employee.firstName} ${employee.lastName} has submitted an attendance regularization request for ${targetDateStr}.`
              })
            )
          );
        }
      }
    } catch (notifError) {
      console.error('Failed to create regularization notification:', notifError);
    }

    await logAction({ req, userId: req.user.id, action: 'REGULARIZATION_SUBMITTED', module: 'Attendance', status: 'SUCCESS', entityType: 'AttendancePunch', entityId: punch._id });

    res.json({ message: 'Regularization request submitted successfully.', punch });
  } catch (error) {
    console.error('submitRegularization error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGULARIZATION — PENDING LIST
// ─────────────────────────────────────────────────────────────────────────────
const getPendingRegularizations = async (req, res) => {
  try {
    let filter = {
      regularizationStatus: 'pending',
      employeeId: { $ne: req.user.id }
    };

    if (req.user.role === 'manager') {
      // Reporting managers do not receive regularization requests (employee requests go to HR; manager requests go to CEO)
      filter.employeeId = null;
    } else if (req.user.role === 'hr') {
      // HR managers receive requests only from standard employees
      const employees = await User.find({ role: 'employee' }).select('_id');
      filter.employeeId = { $in: employees.map(u => u._id), $ne: req.user.id };
    } else if (req.user.role === 'executive') {
      // CEO / Executives receive requests only from managers and HR
      const managersAndHr = await User.find({ role: { $in: ['manager', 'hr'] } }).select('_id');
      filter.employeeId = { $in: managersAndHr.map(u => u._id), $ne: req.user.id };
    } else if (req.user.role === 'admin') {
      // Admins can see everything
      const allUsers = await User.find({ role: { $in: ['manager', 'hr', 'employee'] } }).select('_id');
      filter.employeeId = { $in: allUsers.map(u => u._id), $ne: req.user.id };
    } else if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const pending = await AttendancePunch.find(filter)
      .populate('employeeId', 'firstName lastName employeeCode email')
      .sort('-createdAt');

    res.json(pending);
  } catch (error) {
    console.error('getPendingRegularizations error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGULARIZATION — REVIEW
// ─────────────────────────────────────────────────────────────────────────────
const reviewRegularization = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'id and status (approved/rejected) are required.' });
    }

    const punch = await AttendancePunch.findById(id);
    if (!punch) return res.status(404).json({ message: 'Punch record not found.' });

    if (punch.employeeId.toString() === req.user.id.toString()) {
      return res.status(403).json({ message: 'You cannot review your own regularization request.' });
    }

    const requester = await User.findById(punch.employeeId);
    if (!requester) return res.status(404).json({ message: 'Requester not found.' });

    if (['manager', 'hr'].includes(requester.role)) {
      if (!['executive', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only the CEO can approve regularization for managers and HR.' });
      }
    } else if (requester.role === 'employee') {
      if (!['hr', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Employee regularization requests can only be approved by the HR Manager.' });
      }
    } else {
      return res.status(403).json({ message: 'Unauthorized review role.' });
    }

    if (status === 'approved') {
      const settings = await getActiveSettings();
      const rules = settings.attendanceRules;

      punch.punchIn = punch.requestedPunchIn;
      punch.punchOut = punch.requestedPunchOut;

      const shiftStart = getDateWithTime(punch.date, rules.officeStartTime);
      const shiftEnd = getDateWithTime(punch.date, rules.officeEndTime);
      const graceEnd = new Date(shiftStart.getTime() + (rules.graceMinutes || 0) * 60000);

      punch.lateMinutes = punch.punchIn > graceEnd ? Math.round((punch.punchIn.getTime() - shiftStart.getTime()) / 60000) : 0;

      const total = Math.round((punch.punchOut.getTime() - punch.punchIn.getTime()) / 60000);
      punch.totalDurationMinutes = total;
      const minMinsForLunch = 300;
      punch.lunchDeductionMinutes = (rules.lunchDeductionEnabled && total >= minMinsForLunch) ? rules.lunchDeductionMinutes : 0;

      const working = Math.max(0, total - punch.lunchDeductionMinutes);
      punch.workingMinutes = working;
      const targetEndTimeStr = (rules.allowEarlyExit && rules.earlyExitTime) ? rules.earlyExitTime : rules.officeEndTime;
      const earlyExitLimit = getDateWithTime(punch.date, targetEndTimeStr);
      punch.earlyExitMinutes = punch.punchOut < earlyExitLimit ? Math.round((earlyExitLimit.getTime() - punch.punchOut.getTime()) / 60000) : 0;

      const presentMins = (rules.presentHours || 8) * 60;
      const halfDayMins = (rules.halfDayHours || 4) * 60;

      let isEarlyExitPresent = false;
      if (rules.allowEarlyExit && rules.earlyExitTime) {
        const earlyExitTarget = getDateWithTime(punch.date, rules.earlyExitTime);
        if (punch.punchOut >= earlyExitTarget) {
          isEarlyExitPresent = true;
        }
      }

      if (working >= presentMins || isEarlyExitPresent) {
        punch.status = 'Regularized';
      } else if (working >= halfDayMins) {
        punch.status = 'Half Day';
      } else {
        punch.status = 'Absent';
      }

      punch.regularizationStatus = 'approved';
    } else {
      punch.regularizationStatus = 'rejected';
    }

    punch.requestedPunchIn = null;
    punch.requestedPunchOut = null;
    await punch.save();
    await logAction({ req, userId: req.user.id, action: `REGULARIZATION_${status.toUpperCase()}`, module: 'Attendance', status: 'SUCCESS', entityType: 'AttendancePunch', entityId: punch._id });

    // Notify the employee about the outcome
    const punchDateStr = new Date(punch.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const reviewerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Your manager';
    const notifMessage = status === 'approved'
      ? `Your attendance regularization request for ${punchDateStr} has been approved by ${reviewerName}.`
      : `Your attendance regularization request for ${punchDateStr} has been rejected by ${reviewerName}.`;

    await Notification.create({
      userId: punch.employeeId,
      message: notifMessage,
      type: status === 'approved' ? 'regularization_approved' : 'regularization_rejected'
    });

    res.json({ message: `Regularization ${status} successfully.`, punch });
  } catch (error) {
    console.error('reviewRegularization error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CEO ATTENDANCE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
const getCeoSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDateStr = date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(targetDateStr);

    const eligibleRoles = ['employee', 'manager', 'hr'];
    const totalUsers = await User.countDocuments({ role: { $in: eligibleRoles } });
    const punches = await AttendancePunch.find({ date: targetDate })
      .populate('employeeId', 'firstName lastName role departmentId');

    let present = 0, halfDay = 0, absent = 0, late = 0, autoClosed = 0, leave = 0;
    const lateEmployees = [];
    const punchedUserIds = punches.map(p => {
      if (p.status === 'Present' || p.status === 'Regularized' || p.status === 'Incomplete') present++;
      else if (p.status === 'Late') { 
        present++; 
        late++; 
      }
      else if (p.status === 'Half Day') halfDay++;
      else if (p.status === 'Absent') absent++;
      else if (p.status === 'Auto Closed' || p.status === 'Unusual') autoClosed++;
      else if (p.status === 'Leave') leave++;

      if (p.lateMinutes > 0) {
        lateEmployees.push({
          name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
          lateMinutes: p.lateMinutes
        });
      }
      return (p.employeeId?._id || p.employeeId)?.toString();
    });

    const unpunchedUsers = await User.find({
      role: { $in: eligibleRoles },
      _id: { $nin: punchedUserIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('departmentId', 'departmentName');

    const attendancePercentage = totalUsers > 0
      ? Math.round(((present + halfDay * 0.5) / totalUsers) * 100) : 0;

    const latePercentage = totalUsers > 0
      ? Math.round((late / totalUsers) * 100) : 0;

    let totalLoginMs = 0, loginCount = 0, totalLogoutMs = 0, logoutCount = 0;
    punches.forEach(p => {
      if (p.punchIn) { const t = new Date(p.punchIn); totalLoginMs += t.getHours() * 3600000 + t.getMinutes() * 60000; loginCount++; }
      if (p.punchOut) { const t = new Date(p.punchOut); totalLogoutMs += t.getHours() * 3600000 + t.getMinutes() * 60000; logoutCount++; }
    });
    const fmt = ms => { if (!ms) return '--:--'; const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), ap = h >= 12 ? 'PM' : 'AM'; return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`; };

    const depts = await Department.find();
    const deptBreakdown = [];
    for (const d of depts) {
      const dUsers = await User.find({ departmentId: d._id, role: { $in: eligibleRoles } });
      if (dUsers.length > 0) {
        const dPunches = await AttendancePunch.find({ date: targetDate, employeeId: { $in: dUsers.map(u => u._id) } });
        let dPresent = 0;
        dPunches.forEach(p => { if (p.status === 'Present' || p.status === 'Late' || p.status === 'Regularized' || p.status === 'Incomplete') dPresent++; else if (p.status === 'Half Day') dPresent += 0.5; });
        deptBreakdown.push({ departmentName: d.departmentName, percentage: Math.round((dPresent / dUsers.length) * 100), active: dUsers.length });
      }
    }

    res.json({
      present, halfDay, absent, late, autoClosed, leave,
      notPunchedYet: unpunchedUsers.length,
      attendancePercentage,
      latePercentage,
      avgLoginTime: loginCount > 0 ? fmt(totalLoginMs / loginCount) : '--:--',
      avgLogoutTime: logoutCount > 0 ? fmt(totalLogoutMs / logoutCount) : '--:--',
      absentEmployees: unpunchedUsers.map(u => `${u.firstName} ${u.lastName}`),
      lateEmployees,
      deptBreakdown
    });
  } catch (error) {
    console.error('getCeoSummary error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HR ATTENDANCE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
const getHrSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDateStr = date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(targetDateStr);

    const eligibleRoles = ['employee', 'manager', 'hr'];
    const totalUsers = await User.countDocuments({ role: { $in: eligibleRoles } });
    const punches = await AttendancePunch.find({ date: targetDate })
      .populate('employeeId', 'firstName lastName employeeCode email');

    let present = 0, halfDay = 0, absent = 0, late = 0, earlyExit = 0, autoClosed = 0;
    const working = [];
    const lateEmployees = [];
    const punchedUserIds = punches.map(p => {
      if (p.status === 'Present' || p.status === 'Regularized' || p.status === 'Incomplete') present++;
      else if (p.status === 'Late') { present++; late++; }
      else if (p.status === 'Half Day') halfDay++;
      else if (p.status === 'Absent') absent++;
      else if (p.status === 'Auto Closed' || p.status === 'Unusual') autoClosed++;

      if (p.earlyExitMinutes > 0) earlyExit++;

      if (p.punchIn && !p.punchOut) {
        working.push({ name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`, code: p.employeeId?.employeeCode || 'N/A', punchIn: p.punchIn });
      }

      if (p.lateMinutes > 0) {
        lateEmployees.push({
          name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
          lateMinutes: p.lateMinutes
        });
      }
      return (p.employeeId?._id || p.employeeId)?.toString();
    });

    const unpunchedUsers = await User.find({
      role: { $in: eligibleRoles },
      _id: { $nin: punchedUserIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(id)) }
    });

    let regFilter = {
      regularizationStatus: 'pending',
      employeeId: { $ne: req.user.id }
    };

    if (req.user.role === 'manager') {
      regFilter.employeeId = null;
    } else if (req.user.role === 'hr') {
      const employees = await User.find({ role: 'employee' }).select('_id');
      regFilter.employeeId = { $in: employees.map(u => u._id), $ne: req.user.id };
    } else if (req.user.role === 'executive') {
      const managersAndHr = await User.find({ role: { $in: ['manager', 'hr'] } }).select('_id');
      regFilter.employeeId = { $in: managersAndHr.map(u => u._id), $ne: req.user.id };
    } else if (req.user.role === 'admin') {
      const allUsers = await User.find({ role: { $in: ['manager', 'hr', 'employee'] } }).select('_id');
      regFilter.employeeId = { $in: allUsers.map(u => u._id), $ne: req.user.id };
    }

    const pendingRegularizationCount = await AttendancePunch.countDocuments(regFilter);
    const attendancePct = totalUsers > 0 ? Math.round(((present + halfDay * 0.5) / totalUsers) * 100) : 0;

    res.json({
      present, halfDay, absent, late, earlyExit, autoClosed,
      attendancePct,
      workingCount: working.length,
      notPunchedCount: unpunchedUsers.length,
      pendingRegularizationCount,
      workingList: working,
      lateEmployees,
      absentEmployees: unpunchedUsers.map(u => `${u.firstName} ${u.lastName}`)
    });
  } catch (error) {
    console.error('getHrSummary error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE BY DATE
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceByDate(req, res) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD).' });

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) return res.status(400).json({ message: 'Invalid date format.' });

    const settings = await getActiveSettings();
    const rules = settings.attendanceRules;

    const eligibleRoles = ['employee', 'manager', 'hr'];
    const isWeekend = rules.weekends?.includes(targetDate.getUTCDay());
    const holiday = await Holiday.findOne({ date });

    const punches = await AttendancePunch.find({ date: targetDate })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode departmentId designationId', populate: { path: 'departmentId', select: 'departmentName' } })
      .sort('punchIn')
      .lean();

    const allUsers = await User.find({ role: { $in: eligibleRoles } })
      .populate('departmentId', 'departmentName')
      .lean();

    const punchedIds = new Set(punches.map(p => (p.employeeId?._id || p.employeeId)?.toString()));
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;

    const fmt = (d) => {
      if (!d) return null;
      const dt = new Date(d), h = dt.getHours(), m = dt.getMinutes(), ap = h >= 12 ? 'PM' : 'AM';
      return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
    };

    const records = punches.map(p => {
      let workingMinutes = p.workingMinutes || 0;
      if (p.punchIn && !p.punchOut && isToday) {
        const totalDurationMinutes = Math.max(0, Math.round((new Date().getTime() - new Date(p.punchIn).getTime()) / 60000));
        const activeLunchDeduction = (rules.lunchDeductionEnabled && totalDurationMinutes >= 300) ? (rules.lunchDeductionMinutes || 60) : 0;
        workingMinutes = Math.max(0, totalDurationMinutes - activeLunchDeduction);
      }
      return {
        employeeId: p.employeeId?._id,
        name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
        code: p.employeeId?.employeeCode || 'N/A',
        department: p.employeeId?.departmentId?.departmentName || 'N/A',
        punchIn: fmt(p.punchIn),
        punchOut: fmt(p.punchOut),
        workingMinutes,
        lateMinutes: p.lateMinutes || 0,
        overtimeMinutes: p.overtimeMinutes || 0,
        status: p.status === 'Auto Closed' ? 'Unusual' : (p.status || 'Unknown'),
        regularizationStatus: p.regularizationStatus || null,
      };
    });

    allUsers.forEach(u => {
      if (!punchedIds.has(u._id.toString())) {
        records.push({
          employeeId: u._id,
          name: `${u.firstName} ${u.lastName}`,
          code: u.employeeCode || 'N/A',
          department: u.departmentId?.departmentName || 'N/A',
          punchIn: null, punchOut: null, workingMinutes: 0,
          lateMinutes: 0, overtimeMinutes: 0,
          status: holiday ? 'Holiday' : isWeekend ? 'Weekly Off' : (isToday ? 'Not Punched Yet' : 'Absent'),
          regularizationStatus: null,
        });
      }
    });

    res.json({ date, totalEmployees: allUsers.length, records, isWeekend, isHoliday: !!holiday, holidayName: holiday?.name });
  } catch (error) {
    console.error('getAttendanceByDate error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SETTINGS CRUD
// ─────────────────────────────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const settings = await getActiveSettings();
    res.json({ settings });
  } catch (e) {
    console.error('getSettings error:', e);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { attendanceRules, changeNote } = req.body;
    if (!attendanceRules) {
      return res.status(400).json({ message: 'attendanceRules is required.' });
    }

    const current = await getActiveSettings();
    const oldSnapshot = JSON.parse(JSON.stringify(current.attendanceRules));

    // Update active settings doc
    current.attendanceRules = { ...oldSnapshot, ...attendanceRules };
    current.updatedBy = req.user.id;
    await current.save();

    // Recalculate today's punches under the new rules
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);
    const todayPunches = await AttendancePunch.find({ date: todayDate });
    const rules = current.attendanceRules;

    for (const punch of todayPunches) {
      if (!punch.punchIn) continue;

      // Recalculate late minutes
      const shiftStart = getDateWithTime(punch.date, rules.officeStartTime);
      const graceEnd = new Date(shiftStart.getTime() + (rules.graceMinutes || 0) * 60000);
      const lateMinutes = punch.punchIn > graceEnd ? Math.round((punch.punchIn.getTime() - shiftStart.getTime()) / 60000) : 0;
      punch.lateMinutes = lateMinutes;

      if (punch.punchOut) {
        const totalDurationMinutes = Math.round((punch.punchOut.getTime() - punch.punchIn.getTime()) / 60000);
        punch.totalDurationMinutes = totalDurationMinutes;
        const minMinsForLunch = 300;
        punch.lunchDeductionMinutes = (rules.lunchDeductionEnabled && totalDurationMinutes >= minMinsForLunch) ? rules.lunchDeductionMinutes : 0;
        
        const workingMinutes = Math.max(0, totalDurationMinutes - punch.lunchDeductionMinutes);
        punch.workingMinutes = workingMinutes;

        const targetEndTimeStr = (rules.allowEarlyExit && rules.earlyExitTime) ? rules.earlyExitTime : rules.officeEndTime;
        const earlyExitLimit = getDateWithTime(punch.date, targetEndTimeStr);
        punch.earlyExitMinutes = punch.punchOut < earlyExitLimit ? Math.round((earlyExitLimit.getTime() - punch.punchOut.getTime()) / 60000) : 0;

        const shiftEnd = getDateWithTime(punch.date, rules.officeEndTime);
        let overtimeMinutes = 0;
        if (rules.enableOvertime) {
          const extraMins = Math.round((punch.punchOut.getTime() - shiftEnd.getTime()) / 60000);
          if (extraMins >= (rules.overtimeMinMinutes || 30)) {
            overtimeMinutes = Math.floor(extraMins / (rules.overtimeRoundMinutes || 15)) * (rules.overtimeRoundMinutes || 15);
          }
        }
        punch.overtimeMinutes = overtimeMinutes;

        const presentMins = (rules.presentHours || 8) * 60;
        const halfDayMins = (rules.halfDayHours || 4) * 60;

        let isEarlyExitPresent = false;
        if (rules.allowEarlyExit && rules.earlyExitTime) {
          const earlyExitTarget = getDateWithTime(punch.date, rules.earlyExitTime);
          if (punch.punchOut >= earlyExitTarget) {
            isEarlyExitPresent = true;
          }
        }

        if (workingMinutes >= presentMins || isEarlyExitPresent) {
          punch.status = lateMinutes > 0 ? 'Late' : 'Present';
        } else if (workingMinutes >= halfDayMins) {
          punch.status = 'Half Day';
        } else {
          punch.status = 'Absent';
        }
      } else {
        punch.status = lateMinutes > 0 ? 'Late' : 'Incomplete';
      }

      await punch.save();
    }

    // Write audit log history
    const history = new AttendanceSettingsHistory({
      changedBy: req.user.id,
      oldValues: oldSnapshot,
      newValues: current.attendanceRules,
      changeNote: changeNote || 'Settings updated',
    });
    await history.save();

    await logAction({ req, userId: req.user.id, action: 'UPDATE_ATTENDANCE_SETTINGS', module: 'Settings', status: 'SUCCESS', entityType: 'AttendanceSettings', entityId: current._id });

    res.json({ message: 'Attendance settings updated successfully.', settings: current });
  } catch (e) {
    console.error('updateSettings error:', e);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getSettingsHistory = async (req, res) => {
  try {
    const history = await AttendanceSettingsHistory.find()
      .populate('changedBy', 'firstName lastName employeeCode')
      .sort('-createdAt')
      .limit(20);
    res.json(history);
  } catch (e) {
    console.error('getSettingsHistory error:', e);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  punchIn,
  punchOut,
  getTodayAttendance,
  getHistory,
  getCalendar,
  submitRegularization,
  getPendingRegularizations,
  reviewRegularization,
  getCeoSummary,
  getHrSummary,
  getAttendanceByDate,
  getSettings,
  updateSettings,
  getSettingsHistory
};
