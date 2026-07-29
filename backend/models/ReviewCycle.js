const mongoose = require('mongoose');

const reviewCycleSchema = new mongoose.Schema(
  {
    reviewMonth: {
      type: String,
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      required: true,
      index: true
    },
    cycleType: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'annual'],
      default: 'quarterly',
      required: true
    },
    kpiTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KpiTemplate',
      required: true
    },
    targetRole: {
      type: String,
      enum: ['employee', 'manager', 'all'],
      default: 'all',
      required: true
    },
    unlockedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { timestamps: true }
);

// Auto-close active cycles whose end dates have passed
reviewCycleSchema.statics.autoCloseExpiredCycles = async function() {
  const now = new Date();
  const activeCycles = await this.find({ status: 'active' });
  for (const cycle of activeCycles) {
    const endOfDay = new Date(cycle.endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    if (endOfDay < now) {
      cycle.status = 'closed';
      await cycle.save();
    }
  }
};

module.exports = mongoose.model('ReviewCycle', reviewCycleSchema);
