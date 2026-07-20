const mongoose = require('mongoose');

const kpiItemSchema = new mongoose.Schema({
  kpiName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['quality', 'productivity', 'technical', 'communication', 'ownership', 'learning'],
    required: true
  },
  weight: {
    type: Number,
    default: 1,
    required: true
  },
  description: {
    type: String,
    trim: true
  }
});

const kpiTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: true,
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true
    },
    items: [kpiItemSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('KpiTemplate', kpiTemplateSchema);
