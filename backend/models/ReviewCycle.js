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

// Auto-close active cycles whose end dates have passed and auto-activate scheduled draft cycles whose start dates have arrived
reviewCycleSchema.statics.autoCloseExpiredCycles = async function() {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // 1. Auto-close active cycles whose end dates have passed
  await this.updateMany(
    {
      status: 'active',
      endDate: { $lt: startOfToday }
    },
    {
      $set: { status: 'closed' }
    }
  );

  // 2. Auto-activate scheduled draft cycles whose start date has arrived (startDate <= endOfToday)
  const scheduledDrafts = await this.find({
    status: 'draft',
    startDate: { $lte: endOfToday }
  });

  if (scheduledDrafts.length > 0) {
    for (const draft of scheduledDrafts) {
      draft.status = 'active';
      await draft.save();

      try {
        const cycleController = require('../controllers/cycleController');
        if (cycleController && cycleController.notifyAllEmployeesOfNewCycle) {
          await cycleController.notifyAllEmployeesOfNewCycle(draft);
        }
      } catch (e) {
        console.error('Error notifying employees on auto-activation:', e);
      }
    }
  }
};

module.exports = mongoose.model('ReviewCycle', reviewCycleSchema);
