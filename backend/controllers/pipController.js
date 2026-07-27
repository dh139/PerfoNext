const Pip = require('../models/Pip');
const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/logger');

const getPipSuggestions = async (req, res) => {
  try {
    const employees = await User.find({ employmentStatus: 'active', role: 'employee' })
      .populate('departmentId designationId');
    const suggestions = [];

    for (const emp of employees) {
      // Check if employee already has an active PIP
      const activePip = await Pip.findOne({ employeeId: emp._id, status: 'active' });
      if (activePip) {
        continue;
      }

      // Find latest completed review scores
      const recentScores = await ReviewScore.find({ employeeId: emp._id })
        .sort('-createdAt')
        .limit(2);

      if (recentScores.length > 0) {
        const latestScore = recentScores[0];
        const isLow = ['Needs Improvement', 'Unsatisfactory'].includes(latestScore.rating);

        if (isLow) {
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

    // Direct employees check for managers
    if (req.user.role === 'manager') {
      filter.managerId = req.user.id;
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
      .populate({ path: 'hrReviewerId', select: 'firstName lastName email' });

    res.json(pips);
  } catch (error) {
    console.error('getPips error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createPip = async (req, res) => {
  try {
    const { employeeId, triggerReviewScoreId, startDate, endDate, goals, managerId, hrReviewerId } = req.body;

    const pip = await Pip.create({
      employeeId,
      triggerReviewScoreId,
      startDate,
      endDate,
      goals: goals || [],
      managerId,
      hrReviewerId,
      status: 'active'
    });

    const populatedPip = await Pip.findById(pip._id)
      .populate({ path: 'employeeId', select: 'firstName lastName email' });

    // Notify employee
    await Notification.create({
      userId: employeeId,
      type: 'review_assigned', // Reused code type
      message: `You have been placed on a Performance Improvement Plan (PIP) starting ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Please review your goals.`
    });

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
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const updatePip = async (req, res) => {
  try {
    const { id } = req.params;
    const { goals, status, closureNotes } = req.body;

    const oldPip = await Pip.findById(id);
    if (!oldPip) {
      return res.status(404).json({ message: 'PIP record not found.' });
    }

    // Role security check
    if (req.user.role === 'employee') {
      if (oldPip.employeeId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized. You can only update your own assigned PIP goals.' });
      }
      if (status || closureNotes) {
        return res.status(403).json({ message: 'Employees can only update goal progress, not close or escalate PIP status.' });
      }
    }

    const updates = {};
    if (goals) updates.goals = goals;
    if (status && req.user.role !== 'employee') updates.status = status;
    if (closureNotes && req.user.role !== 'employee') updates.closureNotes = closureNotes;

    const updatedPip = await Pip.findByIdAndUpdate(id, updates, { new: true })
      .populate({ path: 'employeeId', select: 'firstName lastName email' });

    // Notify employee on closure
    if (status && oldPip.status !== status) {
      await Notification.create({
        userId: updatedPip.employeeId._id,
        type: 'review_completed',
        message: `Your Performance Improvement Plan (PIP) has been updated to: ${status.toUpperCase()}. closure notes: ${closureNotes || 'None'}`
      });
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
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getPipSuggestions,
  getPips,
  createPip,
  updatePip
};
