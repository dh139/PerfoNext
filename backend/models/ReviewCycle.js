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

// Auto-close active cycles whose end dates have passed (atomic updateMany prevents Mongoose VersionError race conditions)
reviewCycleSchema.statics.autoCloseExpiredCycles = async function() {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  await this.updateMany(
    {
      status: 'active',
      endDate: { $lt: startOfToday }
    },
    {
      $set: { status: 'closed' }
    }
  );
};

module.exports = mongoose.model('ReviewCycle', reviewCycleSchema);
