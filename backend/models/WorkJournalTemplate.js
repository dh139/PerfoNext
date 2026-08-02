const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  fieldKey: {
    type: String,
    required: true,
    trim: true
  },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'select', 'url', 'textarea'],
    default: 'text'
  },
  options: [{
    type: String,
    trim: true
  }],
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  }
}, { _id: true });

const workJournalTemplateSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      unique: true,
      index: true
    },
    formTitle: {
      type: String,
      default: 'Daily Work Journal'
    },
    formDescription: {
      type: String,
      default: 'Log daily accomplishments, output results, and proof of work.'
    },
    titleLabel: {
      type: String,
      default: 'Achievement Title'
    },
    titlePlaceholder: {
      type: String,
      default: ''
    },
    projectLabel: {
      type: String,
      default: ''
    },
    projectPlaceholder: {
      type: String,
      default: ''
    },
    summaryLabel: {
      type: String,
      default: 'Work Summary & Output Result'
    },
    summaryPlaceholder: {
      type: String,
      default: ''
    },
    evidenceRefLabel: {
      type: String,
      default: ''
    },
    evidenceRefPlaceholder: {
      type: String,
      default: ''
    },
    evidenceTypes: [{
      type: String
    }],
    categories: [categorySchema],
    customFields: [customFieldSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkJournalTemplate', workJournalTemplateSchema);
