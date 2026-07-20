require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Department = require('../models/Department');
const Designation = require('../models/Designation');
const User = require('../models/User');

const PASSWORD = '123456';

const seedUsers = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts');

    const deptEng = await Department.findOne({ departmentName: 'Engineering' });
    const deptSales = await Department.findOne({ departmentName: 'Sales' });
    const deptHR = await Department.findOne({ departmentName: 'Human Resources' });

    if (!deptEng || !deptSales || !deptHR) {
      throw new Error('Expected departments (Engineering, Sales, Human Resources) not found. Run this against a DB that still has the original org structure.');
    }

    const desSE = await Designation.findOne({ designationName: 'Software Engineer', departmentId: deptEng._id });
    const desSSE = await Designation.findOne({ designationName: 'Senior Software Engineer', departmentId: deptEng._id });
    const desEM = await Designation.findOne({ designationName: 'Engineering Manager', departmentId: deptEng._id });
    const desSE_Sales = await Designation.findOne({ designationName: 'Sales Executive', departmentId: deptSales._id });
    const desSM = await Designation.findOne({ designationName: 'Sales Manager', departmentId: deptSales._id });
    const desHR = await Designation.findOne({ designationName: 'HR Manager', departmentId: deptHR._id });
    const desAdmin = await Designation.findOne({ designationName: 'System Administrator', departmentId: deptHR._id });

    console.log('Clearing existing Users collection...');
    await User.deleteMany({});

    console.log(`Seeding mock Users (all passwords set to "${PASSWORD}")...`);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(PASSWORD, salt);

    const userAdmin = await User.create({
      employeeCode: 'EMP001',
      firstName: 'Alok',
      lastName: 'Sharma',
      email: 'admin@epts.com',
      mobile: '9876543210',
      passwordHash,
      departmentId: deptHR._id,
      designationId: desAdmin._id,
      managerId: null,
      joiningDate: new Date('2024-01-10'),
      employmentStatus: 'active',
      role: 'admin'
    });

    const userHR = await User.create({
      employeeCode: 'EMP002',
      firstName: 'Riddhi',
      lastName: 'Patel',
      email: 'hr@epts.com',
      mobile: '9876543211',
      passwordHash,
      departmentId: deptHR._id,
      designationId: desHR._id,
      managerId: null,
      joiningDate: new Date('2024-03-15'),
      employmentStatus: 'active',
      role: 'hr'
    });

    const userMgrEng = await User.create({
      employeeCode: 'EMP003',
      firstName: 'Girish',
      lastName: 'Gajjar',
      email: 'manager1@epts.com',
      mobile: '9876543212',
      passwordHash,
      departmentId: deptEng._id,
      designationId: desEM._id,
      managerId: null,
      joiningDate: new Date('2023-06-01'),
      employmentStatus: 'active',
      role: 'manager'
    });

    const userMgrSales = await User.create({
      employeeCode: 'EMP004',
      firstName: 'Sanjay',
      lastName: 'Shah',
      email: 'manager2@epts.com',
      mobile: '9876543213',
      passwordHash,
      departmentId: deptSales._id,
      designationId: desSM._id,
      managerId: null,
      joiningDate: new Date('2023-08-20'),
      employmentStatus: 'active',
      role: 'manager'
    });

    await User.create({
      employeeCode: 'EMP005',
      firstName: 'Dhrumil',
      lastName: 'Shah',
      email: 'dev1@epts.com',
      mobile: '9876543214',
      passwordHash,
      departmentId: deptEng._id,
      designationId: desSSE._id,
      managerId: userMgrEng._id,
      joiningDate: new Date('2025-01-05'),
      employmentStatus: 'active',
      role: 'employee'
    });

    await User.create({
      employeeCode: 'EMP006',
      firstName: 'Parth',
      lastName: 'Mehta',
      email: 'dev2@epts.com',
      mobile: '9876543215',
      passwordHash,
      departmentId: deptEng._id,
      designationId: desSE._id,
      managerId: userMgrEng._id,
      joiningDate: new Date('2025-05-12'),
      employmentStatus: 'active',
      role: 'employee'
    });

    await User.create({
      employeeCode: 'EMP007',
      firstName: 'Ankit',
      lastName: 'Desai',
      email: 'sales1@epts.com',
      mobile: '9876543216',
      passwordHash,
      departmentId: deptSales._id,
      designationId: desSE_Sales._id,
      managerId: userMgrSales._id,
      joiningDate: new Date('2025-02-18'),
      employmentStatus: 'active',
      role: 'employee'
    });

    console.log('\nSeeded 7 mock users, all with password "123456":');
    console.log('  admin@epts.com     (admin)');
    console.log('  hr@epts.com        (hr)');
    console.log('  manager1@epts.com  (manager - Engineering)');
    console.log('  manager2@epts.com  (manager - Sales)');
    console.log('  dev1@epts.com      (employee - Engineering, reports to manager1)');
    console.log('  dev2@epts.com      (employee - Engineering, reports to manager1)');
    console.log('  sales1@epts.com    (employee - Sales, reports to manager2)');

    process.exit(0);
  } catch (error) {
    console.error('Seeding users error:', error);
    process.exit(1);
  }
};

seedUsers();
