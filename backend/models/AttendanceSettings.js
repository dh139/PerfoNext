const mongoose = require('mongoose');

const attendanceSettingsSchema = new mongoose.Schema({
  attendanceRules: {
    officeStartTime: {
      type: String,
      default: '09:00 AM'
    },
    officeEndTime: {
      type: String,
      default: '06:00 PM'
    },
    graceMinutes: {
      type: Number,
      default: 15
    },
    lunchDeductionEnabled: {
      type: Boolean,
      default: true
    },
    lunchDeductionMinutes: {
      type: Number,
      default: 60
    },
    presentHours: {
      type: Number,
      default: 8
    },
    halfDayHours: {
      type: Number,
      default: 4
    },
    allowEarlyExit: {
      type: Boolean,
      default: false
    },
    earlyExitTime: {
      type: String,
      default: '05:30 PM'
    },
    enableOvertime: {
      type: Boolean,
      default: true
    },
    overtimeMinMinutes: {
      type: Number,
      default: 30
    },
    overtimeRoundMinutes: {
      type: Number,
      default: 15
    },
    weekends: {
      type: [Number],
      default: [0, 6] // 0=Sunday, 6=Saturday
    },
    autoPunchOut: {
      enable: {
        type: Boolean,
        default: false
      },
      time: {
        type: String,
        default: '11:59 PM'
      }
    },
    multiplePunchPrevention: {
      onePunchInPerDay: {
        type: Boolean,
        default: true
      },
      onePunchOutPerDay: {
        type: Boolean,
        default: true
      },
      preventDuplicateRequests: {
        type: Boolean,
        default: true
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);
