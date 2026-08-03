const AttendancePunch = require('../models/AttendancePunch');
const User = require('../models/User');
const Department = require('../models/Department');
const { logAction } = require('../utils/logger');
const mongoose = require('mongoose');

// POST /attendance/punch-in
const punchIn = async (req, res) => {
  try {
    if (req.user.role === 'executive' || req.user.role === 'admin') {
      return res.status(403).json({ message: 'CEO and Admins are not allowed to punch attendance.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    let punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: todayDate });
    if (punch && punch.punchIn) {
      return res.status(400).json({ message: 'You have already punched in for today.' });
    }

    const now = new Date();
    const shiftStart = new Date(todayDate);
    shiftStart.setHours(9, 0, 0, 0);

    let lateMinutes = 0;
    if (now > shiftStart) {
      lateMinutes = Math.round((now.getTime() - shiftStart.getTime()) / (1000 * 60));
    }

    if (!punch) {
      punch = new AttendancePunch({
        employeeId: req.user.id,
        date: todayDate,
        month: todayStr.substring(0, 7),
        punchIn: now,
        status: 'Incomplete',
        lateMinutes,
        ipAddress: req.ip || '',
        browser: req.headers['user-agent'] || '',
        device: req.headers['sec-ch-ua-platform'] || 'Unknown',
        location: req.body.location || 'Office'
      });
    } else {
      punch.punchIn = now;
      punch.status = 'Incomplete';
      punch.lateMinutes = lateMinutes;
    }

    await punch.save();

    await logAction({
      req,
      userId: req.user.id,
      action: 'EMPLOYEE_PUNCH_IN',
      module: 'Attendance',
      status: 'SUCCESS',
      entityType: 'AttendancePunch',
      entityId: punch._id
    });

    res.json({ message: 'Punched in successfully.', punch });
  } catch (error) {
    console.error('punchIn error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /attendance/punch-out
const punchOut = async (req, res) => {
  try {
    if (req.user.role === 'executive' || req.user.role === 'admin') {
      return res.status(403).json({ message: 'CEO and Admins are not allowed to punch attendance.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: todayDate });
    if (!punch || !punch.punchIn) {
      return res.status(400).json({ message: 'You must punch in first before punching out.' });
    }
    if (punch.punchOut) {
      return res.status(400).json({ message: 'You have already punched out for today.' });
    }

    const now = new Date();
    punch.punchOut = now;

    const totalDurationMinutes = Math.round((now.getTime() - punch.punchIn.getTime()) / (1000 * 60));
    punch.totalDurationMinutes = totalDurationMinutes;
    punch.lunchDeductionMinutes = 60;
    
    const workingMinutes = Math.max(0, totalDurationMinutes - 60);
    punch.workingMinutes = workingMinutes;

    const shiftEnd = new Date(todayDate);
    shiftEnd.setHours(18, 0, 0, 0);

    let earlyExitMinutes = 0;
    if (now < shiftEnd) {
      earlyExitMinutes = Math.round((shiftEnd.getTime() - now.getTime()) / (1000 * 60));
    }
    punch.earlyExitMinutes = earlyExitMinutes;

    let overtimeMinutes = 0;
    if (workingMinutes > 480) {
      overtimeMinutes = workingMinutes - 480;
    }
    punch.overtimeMinutes = overtimeMinutes;

    if (workingMinutes >= 480) {
      punch.status = 'Present';
    } else if (workingMinutes >= 240) {
      punch.status = 'Half Day';
    } else {
      punch.status = 'Absent';
    }

    await punch.save();

    await logAction({
      req,
      userId: req.user.id,
      action: 'EMPLOYEE_PUNCH_OUT',
      module: 'Attendance',
      status: 'SUCCESS',
      entityType: 'AttendancePunch',
      entityId: punch._id
    });

    res.json({ message: 'Punched out successfully.', punch });
  } catch (error) {
    console.error('punchOut error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: todayDate });
    res.json(punch || { status: 'Not Punched Yet' });
  } catch (error) {
    console.error('getTodayAttendance error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /attendance/history
const getHistory = async (req, res) => {
  try {
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

// GET /attendance/calendar
const getCalendar = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) return res.status(400).json({ message: 'month parameter is required.' });

    const punches = await AttendancePunch.find({ employeeId: req.user.id, month }).sort('date');
    res.json(punches);
  } catch (error) {
    console.error('getCalendar error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /attendance/regularization
const submitRegularization = async (req, res) => {
  try {
    const { date, requestedPunchIn, requestedPunchOut, reason } = req.body;
    if (!date || !requestedPunchIn || !requestedPunchOut || !reason) {
      return res.status(400).json({ message: 'date, requestedPunchIn, requestedPunchOut, and reason are required.' });
    }

    const targetDate = new Date(date.split('T')[0]);

    let punch = await AttendancePunch.findOne({ employeeId: req.user.id, date: targetDate });
    if (!punch) {
      punch = new AttendancePunch({
        employeeId: req.user.id,
        date: targetDate,
        month: date.split('T')[0].substring(0, 7),
        status: 'Absent'
      });
    }

    punch.requestedPunchIn = new Date(requestedPunchIn);
    punch.requestedPunchOut = new Date(requestedPunchOut);
    punch.regularizationStatus = 'pending';
    punch.regularizationReason = reason;

    await punch.save();

    await logAction({
      req,
      userId: req.user.id,
      action: 'REGULARIZATION_SUBMITTED',
      module: 'Attendance',
      status: 'SUCCESS',
      entityType: 'AttendancePunch',
      entityId: punch._id
    });

    res.json({ message: 'Regularization request submitted successfully.', punch });
  } catch (error) {
    console.error('submitRegularization error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /attendance/pending-regularization
const getPendingRegularizations = async (req, res) => {
  try {
    let filter = { 
      regularizationStatus: 'pending',
      employeeId: { $ne: req.user.id } // Never allow viewing one's own regularization request for review
    };

    if (req.user.role === 'manager') {
      const reports = await User.find({ managerId: req.user.id }).select('_id');
      const reportIds = reports.map(r => r._id);
      filter.employeeId = { $in: reportIds, $ne: req.user.id };
    } else if (req.user.role === 'hr') {
      // HR only reviews standard employees (cannot review managers or other HR/themselves)
      const users = await User.find({ role: 'employee' }).select('_id');
      const employeeIds = users.map(u => u._id);
      filter.employeeId = { $in: employeeIds, $ne: req.user.id };
    } else if (req.user.role === 'executive') {
      // CEO (executive) reviews Managers and HR Managers (and optionally employees if needed)
      const users = await User.find({ role: { $in: ['manager', 'hr', 'employee'] } }).select('_id');
      const userIds = users.map(u => u._id);
      filter.employeeId = { $in: userIds, $ne: req.user.id };
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

// POST /attendance/review-regularization
const reviewRegularization = async (req, res) => {
  try {
    const { id, status } = req.body; // status: 'approved' or 'rejected'
    if (!id || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'id and status (approved/rejected) are required.' });
    }

    const punch = await AttendancePunch.findById(id);
    if (!punch) return res.status(404).json({ message: 'Punch record not found.' });

    // Prevent self-approval/rejection under all circumstances
    if (punch.employeeId.toString() === req.user.id.toString()) {
      return res.status(403).json({ message: 'You cannot review your own regularization request.' });
    }

    const requester = await User.findById(punch.employeeId);
    if (!requester) {
      return res.status(404).json({ message: 'Requester user record not found.' });
    }

    // Role-based routing: Managers/HR requests can ONLY be reviewed by the CEO (executive)
    if (['manager', 'hr'].includes(requester.role)) {
      if (req.user.role !== 'executive') {
        return res.status(403).json({ message: 'Regularization requests for managers and HR can only be approved/rejected by the CEO.' });
      }
    } else if (requester.role === 'employee') {
      // Standard employees can be reviewed by HR, Manager, or CEO
      if (req.user.role !== 'hr' && req.user.role !== 'manager' && req.user.role !== 'executive' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized to review employee regularization.' });
      }
      // If manager, verify they are the direct reporting manager of this employee
      if (req.user.role === 'manager' && requester.managerId?.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'You can only review regularization requests of your direct reportees.' });
      }
    }

    if (status === 'approved') {
      punch.punchIn = punch.requestedPunchIn;
      punch.punchOut = punch.requestedPunchOut;
      
      const totalDurationMinutes = Math.round((punch.punchOut.getTime() - punch.punchIn.getTime()) / (1000 * 60));
      punch.totalDurationMinutes = totalDurationMinutes;
      punch.lunchDeductionMinutes = 60;
      
      const workingMinutes = Math.max(0, totalDurationMinutes - 60);
      punch.workingMinutes = workingMinutes;

      const shiftStart = new Date(punch.date);
      shiftStart.setHours(9, 0, 0, 0);
      let lateMinutes = 0;
      if (punch.punchIn > shiftStart) {
        lateMinutes = Math.round((punch.punchIn.getTime() - shiftStart.getTime()) / (1000 * 60));
      }
      punch.lateMinutes = lateMinutes;

      const shiftEnd = new Date(punch.date);
      shiftEnd.setHours(18, 0, 0, 0);
      let earlyExitMinutes = 0;
      if (punch.punchOut < shiftEnd) {
        earlyExitMinutes = Math.round((shiftEnd.getTime() - punch.punchOut.getTime()) / (1000 * 60));
      }
      punch.earlyExitMinutes = earlyExitMinutes;

      let overtimeMinutes = 0;
      if (workingMinutes > 480) {
        overtimeMinutes = workingMinutes - 480;
      }
      punch.overtimeMinutes = overtimeMinutes;

      if (workingMinutes >= 480) {
        punch.status = 'Present';
      } else if (workingMinutes >= 240) {
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

    await logAction({
      req,
      userId: req.user.id,
      action: `REGULARIZATION_${status.toUpperCase()}`,
      module: 'Attendance',
      status: 'SUCCESS',
      entityType: 'AttendancePunch',
      entityId: punch._id
    });

    res.json({ message: `Regularization request ${status} successfully.`, punch });
  } catch (error) {
    console.error('reviewRegularization error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /ceo/attendance-summary
const getCeoSummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const eligibleRoles = ['employee', 'manager', 'hr'];
    const totalUsers = await User.countDocuments({ role: { $in: eligibleRoles } });

    const punches = await AttendancePunch.find({ date: todayDate }).populate('employeeId', 'firstName lastName role departmentId');

    let present = 0;
    let late = 0;
    let halfDay = 0;
    let absent = 0;
    const lateEmployees = [];
    const absentEmployees = [];

    // Map punched employees
    const punchedUserIds = punches.map(p => {
      const idStr = p.employeeId?._id?.toString() || p.employeeId?.toString();
      if (p.status === 'Present') present++;
      if (p.status === 'Half Day') halfDay++;
      if (p.status === 'Absent') absent++;
      if (p.lateMinutes > 0) {
        late++;
        lateEmployees.push({
          name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
          lateMinutes: p.lateMinutes
        });
      }
      return idStr;
    });

    // Find users who haven't punched yet
    const unpunchedUsers = await User.find({
      role: { $in: eligibleRoles },
      _id: { $nin: punchedUserIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('departmentId', 'departmentName');

    const notPunchedYet = unpunchedUsers.length;

    // Attendance percentage based on active punches vs total eligible
    const totalActivePunches = present + halfDay + absent;
    const attendancePercentage = totalUsers > 0 ? Math.round(((present + halfDay * 0.5) / totalUsers) * 100) : 0;
    const latePercentage = totalActivePunches > 0 ? Math.round((late / totalActivePunches) * 100) : 0;

    // Calculate dynamic average login / logout
    let totalLoginMs = 0;
    let loginCount = 0;
    let totalLogoutMs = 0;
    let logoutCount = 0;

    punches.forEach(p => {
      if (p.punchIn) {
        const pin = new Date(p.punchIn);
        totalLoginMs += pin.getHours() * 3600000 + pin.getMinutes() * 60000 + pin.getSeconds() * 1000;
        loginCount++;
      }
      if (p.punchOut) {
        const pout = new Date(p.punchOut);
        totalLogoutMs += pout.getHours() * 3600000 + pout.getMinutes() * 60000 + pout.getSeconds() * 1000;
        logoutCount++;
      }
    });

    const formatMsToTime = (ms) => {
      if (ms === 0) return '--:--';
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    };

    const avgLoginTime = loginCount > 0 ? formatMsToTime(totalLoginMs / loginCount) : '--:--';
    const avgLogoutTime = logoutCount > 0 ? formatMsToTime(totalLogoutMs / logoutCount) : '--:--';

    // Department Breakdown
    const depts = await Department.find();
    const deptBreakdown = [];

    for (const d of depts) {
      const dUsers = await User.find({ departmentId: d._id, role: { $in: eligibleRoles } });
      if (dUsers.length > 0) {
        const dUserIds = dUsers.map(u => u._id.toString());
        const dPunches = await AttendancePunch.find({
          date: todayDate,
          employeeId: { $in: dUsers.map(u => u._id) }
        });
        
        let dPresent = 0;
        dPunches.forEach(p => {
          if (p.status === 'Present') dPresent += 1;
          else if (p.status === 'Half Day') dPresent += 0.5;
        });
        
        const dPct = Math.round((dPresent / dUsers.length) * 100);
        deptBreakdown.push({
          departmentName: d.departmentName,
          percentage: dPct,
          active: dUsers.length
        });
      }
    }

    res.json({
      present,
      late,
      halfDay,
      absent,
      notPunchedYet,
      attendancePercentage,
      latePercentage,
      avgLoginTime,
      avgLogoutTime,
      lateEmployees,
      absentEmployees: unpunchedUsers.map(u => `${u.firstName} ${u.lastName}`),
      deptBreakdown
    });
  } catch (error) {
    console.error('getCeoSummary error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /hr/attendance-summary
const getHrSummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const eligibleRoles = ['employee', 'manager', 'hr'];
    const totalUsers = await User.countDocuments({ role: { $in: eligibleRoles } });

    const punches = await AttendancePunch.find({ date: todayDate }).populate('employeeId', 'firstName lastName employeeCode email');

    let present = 0;
    let late = 0;
    let halfDay = 0;
    let absent = 0;
    const working = [];
    const lateEmployees = [];

    const punchedUserIds = punches.map(p => {
      if (p.status === 'Present') present++;
      if (p.status === 'Half Day') halfDay++;
      if (p.status === 'Absent') absent++;
      if (p.punchIn && !p.punchOut) {
        working.push({
          name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
          code: p.employeeId?.employeeCode || 'N/A',
          punchIn: p.punchIn
        });
      }
      if (p.lateMinutes > 0) {
        late++;
        lateEmployees.push({
          name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
          lateMinutes: p.lateMinutes
        });
      }
      return p.employeeId?._id?.toString() || p.employeeId?.toString();
    });

    const unpunchedUsers = await User.find({
      role: { $in: eligibleRoles },
      _id: { $nin: punchedUserIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(id)) }
    });

    const pendingRegularizationCount = await AttendancePunch.countDocuments({ regularizationStatus: 'pending' });

    res.json({
      present,
      late,
      halfDay,
      absent,
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
  getAttendanceByDate
};

// GET /attendance/by-date?date=YYYY-MM-DD  (HR / CEO / Admin only)
async function getAttendanceByDate(req, res) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD).' });

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) return res.status(400).json({ message: 'Invalid date format.' });

    const eligibleRoles = ['employee', 'manager', 'hr'];

    // Fetch all punches for that date
    const punches = await AttendancePunch.find({ date: targetDate })
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode departmentId designationId',
        populate: {
          path: 'departmentId',
          select: 'departmentName'
        }
      })
      .sort('punchIn')
      .lean();

    // Fetch all eligible employees to identify those with no record
    const allUsers = await User.find({ role: { $in: eligibleRoles } })
      .populate('departmentId', 'departmentName')
      .populate('designationId', 'designationName')
      .lean();

    const punchedIds = new Set(punches.map(p => (p.employeeId?._id || p.employeeId)?.toString()));

    const targetDateStr = date;
    const todayStr = new Date().toISOString().split('T')[0];
    const isTargetToday = targetDateStr === todayStr;
    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;

    const formatTime = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      const h = dt.getHours();
      const m = dt.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const records = punches.map(p => {
      let workingMinutes = p.workingMinutes || 0;
      // If employee punched in but not punched out, and the date is today, calculate current elapsed working minutes
      if (p.punchIn && !p.punchOut && isTargetToday) {
        workingMinutes = Math.max(0, Math.round((new Date().getTime() - new Date(p.punchIn).getTime()) / 60000));
      }

      return {
        employeeId: p.employeeId?._id,
        name: `${p.employeeId?.firstName || 'Unknown'} ${p.employeeId?.lastName || ''}`,
        code: p.employeeId?.employeeCode || 'N/A',
        department: p.employeeId?.departmentId?.departmentName || 'N/A',
        punchIn: formatTime(p.punchIn),
        punchOut: formatTime(p.punchOut),
        workingMinutes,
        lateMinutes: p.lateMinutes || 0,
        overtimeMinutes: p.overtimeMinutes || 0,
        status: p.status || 'Unknown',
        regularizationStatus: p.regularizationStatus || null,
      };
    });

    // Add absent entries for employees with no punch record
    allUsers.forEach(u => {
      if (!punchedIds.has(u._id.toString())) {
        records.push({
          employeeId: u._id,
          name: `${u.firstName} ${u.lastName}`,
          code: u.employeeCode || 'N/A',
          department: u.departmentId?.departmentName || 'N/A',
          punchIn: null,
          punchOut: null,
          workingMinutes: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          status: isWeekend ? 'Weekly Off' : 'Absent',
          regularizationStatus: null,
        });
      }
    });

    res.json({ date, totalEmployees: allUsers.length, records });
  } catch (error) {
    console.error('getAttendanceByDate error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}
