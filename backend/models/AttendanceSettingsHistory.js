const mongoose = require('mongoose');

const attendanceSettingsHistorySchema = new mongoose.Schema({
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  changeNote: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSettingsHistory', attendanceSettingsHistorySchema);
