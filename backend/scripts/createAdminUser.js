require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Hardcoded Admin Details - Feel free to change these values before running
const ADMIN_DETAILS = {
  email: 'admin@perfonext.com',
  password: '123456',
  firstName: 'System',
  lastName: 'Admin',
  employeeCode: 'ADM001',
  mobile: '9999999999',
  gender: 'male',
  workMode: 'Work From office'
};

async function run() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts';
  console.log(`Connecting to MongoDB at: ${dbUri}`);
  
  await mongoose.connect(dbUri);
  console.log('Successfully connected to MongoDB.');

  const { email, password, firstName, lastName, employeeCode, mobile, gender, workMode } = ADMIN_DETAILS;

  // Basic validation checks
  if (!email || !password || !employeeCode || !mobile) {
    console.error('Email, password, employeeCode, and mobile are all required in ADMIN_DETAILS.');
    process.exit(1);
  }

  if (!/^\d{10}$/.test(mobile)) {
    console.error('The mobile number in ADMIN_DETAILS must be exactly 10 digits.');
    process.exit(1);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [
      { email: email.toLowerCase() },
      { employeeCode: employeeCode.toUpperCase() }
    ] 
  });

  if (existingUser) {
    console.error(`User with email "${email}" or employee code "${employeeCode}" already exists.`);
    process.exit(1);
  }

  // Hash Password
  console.log('Hashing password...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const adminUser = new User({
    employeeCode: employeeCode.toUpperCase(),
    firstName,
    lastName,
    email: email.toLowerCase(),
    mobile,
    passwordHash,
    role: 'admin',
    level: 3,
    gender,
    workMode,
    joiningDate: new Date(),
    employmentStatus: 'active'
  });

  await adminUser.save();
  console.log(`\nSUCCESS: Admin user created successfully!`);
  console.log(`----------------------------------------`);
  console.log(`Name:          ${firstName} ${lastName}`);
  console.log(`Email:         ${email.toLowerCase()}`);
  console.log(`Employee Code: ${employeeCode.toUpperCase()}`);
  console.log(`Password:      ${password}`);
  console.log(`Role:          admin`);
  console.log(`----------------------------------------`);

  process.exit(0);
}

run().catch(err => {
  console.error('Error creating admin user:', err);
  process.exit(1);
});
