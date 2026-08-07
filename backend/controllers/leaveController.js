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

    // Fetch employee detail to get their name and role
    const employee = await User.findById(req.user.id);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'An employee';
    const employeeRole = employee ? employee.role : 'employee';

    // Determine target notification users (hierarchy-based)
    let targetUsers = [];
    if (['hr', 'manager'].includes(employeeRole)) {
      // HR and Reporting Managers are approved by CEO (role: executive)
      targetUsers = await User.find({ role: 'executive' });
    } else {
      // Standard employees are approved by HR/Admin
      targetUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    }

    // Send notifications & emails to reviewers
    for (const user of targetUsers) {
      // In-app alert
      await Notification.create({
        userId: user._id,
        type: 'leave_submitted',
        message: `New leave request "${title.trim()}" submitted by ${employeeName}.`
      }).catch(err => console.error('Failed to create in-app leave notification:', err));

      // Email alert
      await emailService.sendLeaveSubmittedEmail(
        user.email,
        employeeName,
        title.trim(),
        fromDate,
        toDate,
        reason.trim()
      ).catch(err => console.error(`Failed to send leave email to ${user.email}:`, err));
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
 * Get all pending leave requests filtered by hierarchy (HR only sees employees, CEO only sees HR/Managers)
 */
const getPendingLeaves = async (req, res) => {
  try {
    const reviewerRole = req.user.role;
    if (!['hr', 'admin', 'executive'].includes(reviewerRole)) {
      return res.status(403).json({ message: 'Access denied. Only HR, Admin, and CEO can review leaves.' });
    }

    let leaves = await LeaveRequest.find({ status: 'pending' })
      .populate('employeeId', 'firstName lastName employeeCode role')
      .sort({ createdAt: -1 });

    if (reviewerRole === 'executive') {
      // CEO only sees HR and Manager applications
      leaves = leaves.filter(l => l.employeeId && ['hr', 'manager'].includes(l.employeeId.role));
    } else {
      // HR and Admin only see employee applications
      leaves = leaves.filter(l => l.employeeId && l.employeeId.role === 'employee');
    }

    res.json(leaves);
  } catch (error) {
    console.error('getPendingLeaves error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Approve or reject a leave request
 */
const reviewLeave = async (req, res) => {
  try {
    const reviewerRole = req.user.role;
    if (!['hr', 'admin', 'executive'].includes(reviewerRole)) {
      return res.status(403).json({ message: 'Access denied.' });
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

    // Fetch employee details to verify role
    const employee = await User.findById(leave.employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const employeeRole = employee.role;

    // Hierarchy validation:
    // HR and Manager leaves must be reviewed by CEO ('executive')
    // Employee leaves must be reviewed by HR/Admin ('hr', 'admin')
    if (['hr', 'manager'].includes(employeeRole)) {
      if (reviewerRole !== 'executive') {
        return res.status(403).json({ message: 'Access denied. HR and Manager leaves can only be reviewed by the CEO.' });
      }
    } else {
      if (reviewerRole !== 'hr' && reviewerRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Employee leaves can only be reviewed by HR Managers.' });
      }
    }

    leave.status = status;
    leave.approvedBy = req.user.id;
    if (status === 'rejected') {
      leave.rejectionReason = rejectionReason || '';
    }

    await leave.save();

    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const employeeEmail = employee.email;

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
