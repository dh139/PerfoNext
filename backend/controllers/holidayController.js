const Holiday = require('../models/Holiday');
const AttendancePunch = require('../models/AttendancePunch');
const { logAction } = require('../utils/logger');

// GET /api/attendance/holidays?year=2026
const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = {};
    if (year) {
      filter.year = parseInt(year, 10);
    }
    const holidays = await Holiday.find(filter).sort('date');
    res.json(holidays);
  } catch (error) {
    console.error('getHolidays error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/attendance/holidays
const createHoliday = async (req, res) => {
  try {
    const { name, date, type } = req.body;
    if (!name || !date) {
      return res.status(400).json({ message: 'name and date are required.' });
    }

    const existing = await Holiday.findOne({ date });
    if (existing) {
      return res.status(400).json({ message: 'A holiday is already configured for this date.' });
    }

    const holiday = new Holiday({
      name,
      date,
      type: type || 'National',
      createdBy: req.user.id
    });

    await holiday.save();
    await logAction({ req, userId: req.user.id, action: 'CREATE_HOLIDAY', module: 'Attendance', status: 'SUCCESS', entityType: 'Holiday', entityId: holiday._id });

    res.status(201).json({ message: 'Holiday created successfully.', holiday });
  } catch (error) {
    console.error('createHoliday error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/attendance/holidays/:id
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type } = req.body;

    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found.' });
    }

    if (date && date !== holiday.date) {
      const existing = await Holiday.findOne({ date });
      if (existing) {
        return res.status(400).json({ message: 'A holiday is already configured for this date.' });
      }
      holiday.date = date;
    }

    if (name) holiday.name = name;
    if (type) holiday.type = type;

    await holiday.save();
    await logAction({ req, userId: req.user.id, action: 'UPDATE_HOLIDAY', module: 'Attendance', status: 'SUCCESS', entityType: 'Holiday', entityId: holiday._id });

    res.json({ message: 'Holiday updated successfully.', holiday });
  } catch (error) {
    console.error('updateHoliday error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/attendance/holidays/:id
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found.' });
    }

    await Holiday.findByIdAndDelete(id);
    await logAction({ req, userId: req.user.id, action: 'DELETE_HOLIDAY', module: 'Attendance', status: 'SUCCESS', entityType: 'Holiday', entityId: id });

    res.json({ message: 'Holiday deleted successfully.' });
  } catch (error) {
    console.error('deleteHoliday error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday
};
