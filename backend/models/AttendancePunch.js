const mongoose = require('mongoose');

const attendancePunchSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  month: {
    type: String,
    required: true,
    index: true
  },
  punchIn: {
    type: Date
  },
  punchOut: {
    type: Date
  },
  totalDurationMinutes: {
    type: Number,
    default: 0
  },
  lunchDeductionMinutes: {
    type: Number,
    default: 60
  },
  workingMinutes: {
    type: Number,
    default: 0
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  earlyExitMinutes: {
    type: Number,
    default: 0
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Half Day', 'Absent', 'Incomplete', 'Not Punched Yet'],
    default: 'Not Punched Yet',
    required: true
  },
  ipAddress: {
    type: String
  },
  browser: {
    type: String
  },
  device: {
    type: String
  },
  location: {
    type: String
  },
  requestedPunchIn: {
    type: Date
  },
  requestedPunchOut: {
    type: Date
  },
  regularizationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
    required: true
  },
  regularizationReason: {
    type: String
  }
}, {
  timestamps: true
});

// Unique index: one punch record per employee per day
attendancePunchSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendancePunch', attendancePunchSchema);
