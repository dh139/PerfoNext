const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Actor Snapshot (persisted self-contained context)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId },
      employeeCode: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String }
    },

    // Categorization & Event Audit
    action: {
      type: String,
      required: true,
      index: true
    },
    module: {
      type: String,
      default: 'General',
      index: true
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
      index: true
    },
    reason: {
      type: String,
      trim: true
    },

    // Target Entity & Structural Context
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed
    },
    reviewCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewCycle',
      index: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    departmentName: {
      type: String
    },

    // Telemetry & Network Details
    endpoint: {
      type: String
    },
    method: {
      type: String
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    requestId: {
      type: String,
      index: true
    },

    // State Diffs
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
