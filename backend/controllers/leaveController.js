const LeaveRequest = require('../models/LeaveRequest');
const AttendancePunch = require('../models/AttendancePunch');
const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('../services/emailService');

/**
 * Submit a leave request
 */
const submitLeave = async (req, res) => {
  try {
    const { title, reason, type, fromDate, toDate } = req.body;

    if (!title || !reason || !type || !fromDate || !toDate) {
      return res.status(400).json({ message: 'All fields (title, reason, type, fromDate, toDate) are required.' });
    }

    const leave = await LeaveRequest.create({
      employeeId: req.user.id,
      title: title.trim(),
      reason: reason.trim(),
      type,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      status: 'pending'
    });

    // Fetch employee detail to get their name
    const employee = await User.findById(req.user.id);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'An employee';

    // Find all HR Managers and Administrators
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });

    // Send notifications & emails to HR/Admin users
    for (const hr of hrUsers) {
      // In-app alert
      await Notification.create({
        userId: hr._id,
        type: 'leave_submitted',
        message: `New leave request "${title.trim()}" submitted by ${employeeName}.`
      }).catch(err => console.error('Failed to create HR in-app leave notification:', err));

      // Email alert
      await emailService.sendLeaveSubmittedEmail(
        hr.email,
        employeeName,
        title.trim(),
        fromDate,
        toDate,
        reason.trim()
      ).catch(err => console.error(`Failed to send HR leave email to ${hr.email}:`, err));
    }

    res.status(201).json(leave);
  } catch (error) {
    console.error('submitLeave error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get logged-in user's leave requests
 */
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ employeeId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    console.error('getMyLeaves error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get all pending leave requests (HR only)
 */
const getPendingLeaves = async (req, res) => {
  try {
    if (req.user.role !== 'hr' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only HR can review leaves.' });
    }

    const leaves = await LeaveRequest.find({ status: 'pending' })
      .populate('employeeId', 'firstName lastName employeeCode role')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error('getPendingLeaves error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Approve or reject a leave request (HR only)
 */
const reviewLeave = async (req, res) => {
  try {
    if (req.user.role !== 'hr' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only HR can review leaves.' });
    }

    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'This leave request has already been reviewed.' });
    }

    leave.status = status;
    leave.approvedBy = req.user.id;
    if (status === 'rejected') {
      leave.rejectionReason = rejectionReason || '';
    }

    await leave.save();

    // Fetch employee details to get email & name
    const employee = await User.findById(leave.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';
    const employeeEmail = employee ? employee.email : '';

    // Notify Employee
    const fromStr = new Date(leave.fromDate).toLocaleDateString('en-GB');
    const toStr = new Date(leave.toDate).toLocaleDateString('en-GB');
    
    let notifyMessage = '';
    let notifyType = '';

    if (status === 'approved') {
      notifyType = 'leave_approved';
      notifyMessage = `Your leave request "${leave.title}" from ${fromStr} to ${toStr} has been approved.`;

      // Upsert AttendancePunch status as 'Leave' for all dates in the range
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dateObj = new Date(dateStr);
        const monthStr = dateStr.substring(0, 7);

        await AttendancePunch.findOneAndUpdate(
          { employeeId: leave.employeeId, date: dateObj },
          {
            employeeId: leave.employeeId,
            date: dateObj,
            month: monthStr,
            status: 'Leave'
          },
          { upsert: true, new: true }
        );
      }
    } else {
      notifyType = 'leave_rejected';
      notifyMessage = `Your leave request "${leave.title}" from ${fromStr} to ${toStr} was rejected. Reason: ${rejectionReason || 'N/A'}`;
    }

    // Save in-app notification for the employee
    await Notification.create({
      userId: leave.employeeId,
      type: notifyType,
      message: notifyMessage
    }).catch(err => console.error('Failed to create employee in-app notification:', err));

    // Send decision email to the employee
    if (employeeEmail) {
      await emailService.sendLeaveReviewedEmail(
        employeeEmail,
        employeeName,
        leave.title,
        leave.fromDate,
        leave.toDate,
        status,
        rejectionReason || ''
      ).catch(err => console.error('Failed to send employee leave decision email:', err));
    }

    res.json({ message: `Leave request ${status} successfully.`, leave });
  } catch (error) {
    console.error('reviewLeave error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get all leave requests across the company (HR, Admin, CEO only)
 */
const getAllLeaves = async (req, res) => {
  try {
    if (!['hr', 'admin', 'executive'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only HR, Admin, and CEO can view the leave dashboard.' });
    }

    const leaves = await LeaveRequest.find()
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode role departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentName'
        }
      })
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error('getAllLeaves error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  submitLeave,
  getMyLeaves,
  getPendingLeaves,
  reviewLeave,
  getAllLeaves
};
