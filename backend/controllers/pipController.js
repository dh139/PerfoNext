const Pip = require('../models/Pip');
const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/logger');
const { sendPipCreatedEmail, sendPipStatusUpdatedEmail } = require('../services/emailService');

const getPipSuggestions = async (req, res) => {
  try {
    const query = {
      _id: { $ne: req.user.id },
      employmentStatus: 'active'
    };

    // If logged in as a Reporting Manager, restrict suggestions strictly to employees in their assigned department
    if (req.user.role === 'manager') {
      const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
      query.role = 'employee';
      if (mgrDeptId) {
        query.departmentId = mgrDeptId;
      }
    } else {
      query.role = { $in: ['employee', 'manager', 'hr', 'admin'] };
    }

    const employees = await User.find(query).populate('departmentId designationId');
    const suggestions = [];

    for (const emp of employees) {
      // Find latest completed review scores
      const recentScores = await ReviewScore.find({ employeeId: emp._id })
        .sort('-createdAt')
        .limit(2);

      if (recentScores.length > 0) {
        const latestScore = recentScores[0];
        const isLow = ['Needs Improvement', 'Unsatisfactory'].includes(latestScore.rating);

        if (isLow) {
          // Check if employee already has an active PIP or a PIP triggered by the latest review score
          const existingPip = await Pip.findOne({
            employeeId: emp._id,
            $or: [
              { status: 'active' },
              { triggerReviewScoreId: latestScore._id }
            ]
          });
          if (existingPip) {
            continue;
          }

          suggestions.push({
            employee: emp,
            reason: `Needs Improvement/Unsatisfactory rating in latest cycle (${latestScore.rating} with score ${latestScore.finalScore})`,
            triggerScores: recentScores
          });
        }
      }
    }

    res.json(suggestions);
  } catch (error) {
    console.error('getPipSuggestions error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getPips = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    // Reporting Managers can view PIPs where they are managerId OR for any employee in their department
    if (req.user.role === 'manager') {
      const mgrDeptId = req.user.departmentId?._id || req.user.departmentId;
      const deptEmps = mgrDeptId ? await User.find({ departmentId: mgrDeptId }).select('_id') : [];
      const empIds = deptEmps.map(e => e._id);

      filter.$or = [
        { managerId: req.user.id },
        { employeeId: { $in: empIds } }
      ];
    } else if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    }

    const pips = await Pip.find(filter)
      .populate({
        path: 'employeeId',
        select: 'firstName lastName email employeeCode departmentId designationId',
        populate: { path: 'departmentId designationId' }
      })
      .populate({ path: 'managerId', select: 'firstName lastName email' })
      .populate({ path: 'hrReviewerId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 });

    res.json(pips);
  } catch (error) {
    console.error('getPips error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createPip = async (req, res) => {
  try {
    const { employeeId, triggerReviewScoreId, startDate, endDate, goals, managerId, hrReviewerId, reason } = req.body;

    const pip = await Pip.create({
      employeeId,
      triggerReviewScoreId,
      startDate,
      endDate,
      goals: goals || [],
      managerId,
      hrReviewerId,
      reason: reason || '',
      status: 'active'
    });

    const populatedPip = await Pip.findById(pip._id)
      .populate({ path: 'employeeId', select: 'firstName lastName email' });

    // Notify employee
    await Notification.create({
      userId: employeeId,
      type: 'review_assigned',
      message: `You have been placed on a Performance Improvement Plan (PIP) starting ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Please review your goals.`
    });

    if (populatedPip.employeeId && populatedPip.employeeId.email) {
      await sendPipCreatedEmail(populatedPip.employeeId.email, `${populatedPip.employeeId.firstName} ${populatedPip.employeeId.lastName}`, startDate, endDate)
        .catch(err => console.error('PIP assignment email send failed:', err));
    }

    await logAction({
      userId: req.user.id,
      action: 'review_update',
      entityType: 'Pip',
      entityId: pip._id,
      after: pip.toObject(),
      ipAddress: req.ip || ''
    });

    res.status(201).json(populatedPip);
  } catch (error) {
    console.error('createPip error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updatePip = async (req, res) => {
  try {
    const { id } = req.params;
    const { goals, status, closureNotes, endDate } = req.body;

    const oldPip = await Pip.findById(id);
    if (!oldPip) {
      return res.status(404).json({ message: 'PIP record not found.' });
    }

    // Role security check
    if (req.user.role === 'employee') {
      if (oldPip.employeeId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized. You can only update your own assigned PIP goals.' });
      }
      if (status || closureNotes || endDate) {
        return res.status(403).json({ message: 'Employees can only update goal progress, not close, extend, or update PIP outcomes.' });
      }
    }

    if (status || endDate || closureNotes) {
      const reviewerId = oldPip.hrReviewerId?.toString();
      const currentUserId = req.user.id?.toString();
      const isDesignatedReviewer = reviewerId && currentUserId && reviewerId === currentUserId;
      const isLeadership = req.user.role === 'admin' || req.user.role === 'executive';

      if (!isDesignatedReviewer && !isLeadership) {
        return res.status(403).json({
          message: 'Forbidden. Only the designated Reviewer or leadership can evaluate or close this PIP.'
        });
      }
    }

    const updates = {};
    if (goals) updates.goals = goals;
    if (status) updates.status = status;
    if (closureNotes) updates.closureNotes = closureNotes;
    if (endDate) updates.endDate = endDate;

    const updatedPip = await Pip.findByIdAndUpdate(id, updates, { new: true })
      .populate({ path: 'employeeId', select: 'firstName lastName email' });

    // Notify employee on outcome update or date extension
    const hasStatusChanged = status && oldPip.status !== status;
    const hasEndDateChanged = endDate && new Date(oldPip.endDate).getTime() !== new Date(endDate).getTime();

    if (hasStatusChanged || hasEndDateChanged) {
      let notificationMessage = '';
      let emailStatusLabel = status || oldPip.status;

      if (hasEndDateChanged && (status === 'active' || oldPip.status === 'active')) {
        notificationMessage = `Your Performance Improvement Plan (PIP) has been extended to ${new Date(endDate).toLocaleDateString()}. Notes: ${closureNotes || 'None'}`;
        emailStatusLabel = 'extended';
      } else {
        notificationMessage = `Your Performance Improvement Plan (PIP) outcome is: ${(status || '').toUpperCase()}. Closure Notes: ${closureNotes || 'None'}`;
      }

      await Notification.create({
        userId: updatedPip.employeeId._id,
        type: 'review_completed',
        message: notificationMessage
      });

      if (updatedPip.employeeId && updatedPip.employeeId.email) {
        await sendPipStatusUpdatedEmail(updatedPip.employeeId.email, `${updatedPip.employeeId.firstName} ${updatedPip.employeeId.lastName}`, emailStatusLabel, closureNotes, endDate)
          .catch(err => console.error('PIP status update email send failed:', err));
      }
    }

    await logAction({
      userId: req.user.id,
      action: 'review_update',
      entityType: 'Pip',
      entityId: updatedPip._id,
      before: oldPip.toObject(),
      after: updatedPip.toObject(),
      ipAddress: req.ip || ''
    });

    res.json(updatedPip);
  } catch (error) {
    console.error('updatePip error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getPipSuggestions,
  getPips,
  createPip,
  updatePip
};
