const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['National', 'Festival', 'Company', 'Optional'],
    default: 'National'
  },
  year: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Pre-validate hook to calculate year from date
holidaySchema.pre('validate', function(next) {
  if (this.date) {
    const parts = this.date.split('-');
    if (parts.length > 0) {
      this.year = parseInt(parts[0], 10);
    }
  }
  next();
});

module.exports = mongoose.model('Holiday', holidaySchema);
