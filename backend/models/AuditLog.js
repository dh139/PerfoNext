const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        'login', 'logout', 'review_update', 'score_change',
        'user_creation', 'user_deletion', 'role_change', 'user_modification',
        'department_modification', 'CYCLE_INDIVIDUAL_UNLOCKED', 'CYCLE_INDIVIDUAL_RELOCKED',
        'cycle_update', 'cycle_creation', 'cycle_deletion'
      ],
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
