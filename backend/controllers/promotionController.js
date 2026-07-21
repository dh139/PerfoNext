const Promotion = require('../models/Promotion');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/logger');

const getPromotions = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    }

    const promotions = await Promotion.find(filter)
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId' })
      .populate('currentDesignationId proposedDesignationId')
      .populate({ path: 'recommendedBy', select: 'firstName lastName email role' })
      .populate({ path: 'approvedBy', select: 'firstName lastName email role' });

    res.json(promotions);
  } catch (error) {
    console.error('getPromotions error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createPromotion = async (req, res) => {
  try {
    const { employeeId, currentDesignationId, proposedDesignationId, salaryIncrementPercent, effectiveDate, supportingReviewScores } = req.body;
    const recommendedBy = req.user.id;

    // Check if a promotion recommendation is already pending approval for this employee
    const existingPending = await Promotion.findOne({
      employeeId,
      status: 'proposed'
    });

    if (existingPending) {
      return res.status(400).json({
        message: 'A promotion recommendation for this employee is already pending HR/Admin approval.'
      });
    }

    const promotion = await Promotion.create({
      employeeId,
      currentDesignationId,
      proposedDesignationId,
      salaryIncrementPercent: salaryIncrementPercent || 0,
      effectiveDate,
      supportingReviewScores: supportingReviewScores || [],
      recommendedBy,
      status: 'proposed'
    });

    const populated = await Promotion.findById(promotion._id)
      .populate({ path: 'employeeId', select: 'firstName lastName' })
      .populate('proposedDesignationId');

    // Notify HR / Admins
    const hrUsers = await User.find({ role: 'hr', employmentStatus: 'active' });
    const notifications = hrUsers.map(hr => ({
      userId: hr._id,
      type: 'assessment_pending',
      message: `A promotion recommendation for ${populated.employeeId.firstName} ${populated.employeeId.lastName} to ${populated.proposedDesignationId.designationName} is pending your approval.`
    }));
    await Notification.insertMany(notifications);

    await logAction({
      userId: req.user.id,
      action: 'user_modification', // Promotion proposal
      entityType: 'Promotion',
      entityId: promotion._id,
      after: promotion.toObject(),
      ipAddress: req.ip || ''
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('createPromotion error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const approvePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const approvedBy = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion recommendation not found.' });
    }

    if (promotion.status !== 'proposed') {
      return res.status(400).json({ message: 'Promotion recommendation has already been finalized.' });
    }

    const before = promotion.toObject();

    promotion.status = status;
    promotion.approvedBy = approvedBy;
    await promotion.save();

    // If approved, update Employee designation in database!
    if (status === 'approved') {
      await User.findByIdAndUpdate(promotion.employeeId, {
        designationId: promotion.proposedDesignationId
      });
    }

    const populated = await Promotion.findById(promotion._id)
      .populate('proposedDesignationId');

    // Notify Employee
    await Notification.create({
      userId: promotion.employeeId,
      type: 'review_completed',
      message: `Your promotion recommendation to ${populated.proposedDesignationId.designationName} has been ${status}.`
    });

    await logAction({
      userId: req.user.id,
      action: 'user_modification',
      entityType: 'Promotion',
      entityId: promotion._id,
      before,
      after: promotion.toObject(),
      ipAddress: req.ip || ''
    });

    res.json(populated);
  } catch (error) {
    console.error('approvePromotion error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getPromotions,
  createPromotion,
  approvePromotion
};
