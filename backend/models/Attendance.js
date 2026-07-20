const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: String, required: true, index: true }, // e.g. "2026-07"
  totalWorkingDays: { type: Number, required: true },
  daysPresent: { type: Number, required: true },
  attendancePercentage: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
