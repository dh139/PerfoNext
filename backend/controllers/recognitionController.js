const Recognition = require('../models/Recognition');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/logger');

const getRecognitions = async (req, res) => {
  try {
    const { employeeId, cycleId } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (cycleId) filter.cycleId = cycleId;

    const recognitions = await Recognition.find(filter)
      .populate({ path: 'employeeId', select: 'firstName lastName email employeeCode departmentId designationId' })
      .populate('cycleId')
      .populate({ path: 'awardedBy', select: 'firstName lastName email' });

    res.json(recognitions);
  } catch (error) {
    console.error('getRecognitions error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createRecognition = async (req, res) => {
  try {
    const { employeeId, cycleId, category, comments } = req.body;
    const awardedBy = req.user.id;

    const recognition = await Recognition.create({
      employeeId,
      cycleId: cycleId || null,
      category,
      comments,
      awardedBy
    });

    const populated = await Recognition.findById(recognition._id)
      .populate({ path: 'employeeId', select: 'firstName lastName' });

    // Notify Employee
    await Notification.create({
      userId: employeeId,
      type: 'review_completed', // Reused type for accolade updates
      message: `Congratulations! You have been awarded the "${category}" recognition by ${req.user.firstName} ${req.user.lastName}!`
    });

    await logAction({
      userId: req.user.id,
      action: 'review_update',
      entityType: 'Recognition',
      entityId: recognition._id,
      after: recognition.toObject(),
      ipAddress: req.ip || ''
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('createRecognition error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getRecognitions,
  createRecognition
};
