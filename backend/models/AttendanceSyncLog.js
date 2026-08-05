const mongoose = require('mongoose');

const attendanceSyncLogSchema = new mongoose.Schema({
  system: { type: String, enum: ['attendance', 'teams', 'lms'], required: true, index: true },
  eventType: { type: String, required: true },
  payload: { type: Object },
  status: { type: String, enum: ['success', 'failed'], default: 'success', index: true },
  responseMessage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSyncLog', attendanceSyncLogSchema);
