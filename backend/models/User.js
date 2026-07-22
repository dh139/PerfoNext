const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    mobile: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
      index: true
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      required: true,
      index: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    joiningDate: {
      type: Date,
      required: true
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive', 'exited'],
      default: 'active',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'manager', 'employee', 'executive'],
      required: true,
      index: true
    },
    level: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5, 6],
      default: 5
    },
    refreshToken: {
      type: String,
      default: null
    },
    otpHash: {
      type: String,
      default: null,
      select: false
    },
    otpExpiry: {
      type: Date,
      default: null,
      select: false
    }
  },
  { timestamps: true }
);

// Method to compare entered password with passwordHash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
