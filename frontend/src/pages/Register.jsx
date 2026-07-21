import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { AlertCircle, CheckCircle2, User, Mail, Phone, Lock, Key, Briefcase, Layers, Activity } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [countdown, setCountdown] = useState(5);

  // Auto-redirect countdown timer for custom success modal
  useEffect(() => {
    let timer;
    if (successData && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (successData && countdown === 0) {
      navigate('/login');
    }
    return () => clearTimeout(timer);
  }, [successData, countdown, navigate]);

  // Form Fields
  const [role, setRole] = useState('employee');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [managerId, setManagerId] = useState('');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const deptRes = await api.get('/api/auth/departments');
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0]._id);

        const desRes = await api.get('/api/auth/designations');
        setDesignations(desRes.data);
        if (desRes.data.length > 0) setDesignationId(desRes.data[0]._id);

        const managersRes = await api.get('/api/auth/managers');
        setManagers(managersRes.data);
      } catch (err) {
        console.error('Registration metadata fetch failed:', err);
        setError('Failed to fetch required registration data.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'executive') {
      setManagerId('');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Role-wise validation rules
    if (role === 'employee') {
      if (!firstName || !lastName || !email || !mobile || !password || !departmentId || !designationId || !managerId) {
        setError('First Name, Last Name, Email, Mobile, Password, Department, Designation, and Reporting Manager are required for Employees.');
        return;
      }
    } else if (role === 'executive') {
      if (!firstName || !lastName || !email || !mobile || !password || !designationId) {
        setError('First Name, Last Name, Email, Mobile, Password, and Designation are required for CEO / Management.');
        return;
      }
    } else {
      if (!firstName || !lastName || !email || !mobile || !password || !departmentId || !designationId) {
        setError('First Name, Last Name, Email, Mobile, Password, Department, and Designation are required.');
        return;
      }
    }

    try {
      const res = await api.post('/api/auth/register', {
        firstName,
        lastName,
        email,
        mobile,
        password,
        departmentId: departmentId || null,
        designationId,
        managerId: role === 'executive' ? null : (managerId || null),
        role
      });

      setSuccessData({
        employeeCode: res.data.employeeCode,
        message: res.data.message,
        email
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    }
  };

  // Filter designations by selected department (or show all if optional department not set)
  const filteredDesignations = departmentId
    ? designations.filter(des => des.departmentId?._id === departmentId || des.departmentId === departmentId)
    : designations;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden my-auto">
      {/* Decorative Aurora background glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-sky-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-700/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Custom Registration Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden animate-scale-up">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-100">Account Created Successfully!</h3>
              <p className="text-xs text-slate-400 mt-1">Welcome to the EPTS Performance Tracking System.</p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2 text-left text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Assigned Employee Code:</span>
                <span className="font-extrabold text-sky-400 bg-sky-950/80 border border-sky-800 px-2.5 py-0.5 rounded-md text-sm">{successData.employeeCode || 'EMP'}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400 font-medium">Registered Email:</span>
                <span className="font-semibold text-slate-200 truncate">{successData.email}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              A welcome confirmation email has been dispatched. Auto-redirecting to login in <span className="font-bold text-sky-400">{countdown}s</span>...
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-sky-600/25 transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              Proceed to Sign In Now
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 relative z-10 space-y-6 text-xs text-slate-200">
        
        {/* Header branding logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-600/25 mb-3">
            <Activity size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">EPTS Register Account</h2>
          <p className="text-xs text-slate-400 mt-1">Join the Employee Performance Tracking System</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* System Role Selection */}
            <div className="space-y-1.5 md:col-span-2 bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-sky-400 tracking-wide uppercase">Select System Role</label>
                <span className="text-[9px] text-slate-400 font-medium">Determines required organization fields</span>
              </div>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 p-2.5 rounded-xl outline-none font-bold text-xs transition-all"
                required
              >
                <option value="employee" className="bg-slate-900 text-slate-200">Employee</option>
                <option value="manager" className="bg-slate-900 text-slate-200">Reporting Manager</option>
                <option value="hr" className="bg-slate-900 text-slate-200">HR Manager</option>
                <option value="admin" className="bg-slate-900 text-slate-200">Administrator</option>
                <option value="executive" className="bg-slate-900 text-slate-200">CEO / Management</option>
              </select>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Email Address <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            {/* First Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">First Name <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User size={14} />
                </span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Last Name <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User size={14} />
                </span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Mobile Number <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Phone size={14} />
                </span>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Password <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={14} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            {/* Department Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Department</label>
                <span className={`text-[9px] font-bold ${role === 'executive' ? 'text-slate-500 font-normal' : 'text-rose-400'}`}>
                  {role === 'executive' ? '(Optional)' : '* Required'}
                </span>
              </div>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none font-semibold text-xs transition-all"
                required={role !== 'executive'}
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  {role === 'executive' ? 'Select Department (Optional)' : 'Select Department *'}
                </option>
                {departments.map(d => (
                  <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.departmentName}</option>
                ))}
              </select>
            </div>

            {/* Designation Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Designation</label>
                <span className="text-[9px] font-bold text-rose-400">* Required</span>
              </div>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none font-semibold text-xs transition-all"
                required
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Designation *</option>
                {filteredDesignations.map(d => (
                  <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.designationName}</option>
                ))}
              </select>
            </div>

            {/* Reporting Manager Field (Hidden for CEO / Management) */}
            {role !== 'executive' && (
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Reporting Manager</label>
                  <span className={`text-[9px] font-bold ${role === 'employee' ? 'text-rose-400' : 'text-slate-500 font-normal'}`}>
                    {role === 'employee' ? '* Required for Employees' : '(Optional)'}
                  </span>
                </div>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none text-xs transition-all"
                  required={role === 'employee'}
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    {role === 'employee' ? 'Select Reporting Manager *' : 'Select Manager (Optional / None)'}
                  </option>
                  {managers.map(m => (
                    <option key={m._id} value={m._id} className="bg-slate-900 text-slate-200">{m.firstName} {m.lastName} ({m.role})</option>
                  ))}
                </select>
              </div>
            )}

          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-600/25 transition-all text-xs uppercase tracking-wider cursor-pointer mt-6"
          >
            Create Account
          </button>
        </form>

        <div className="text-center text-slate-400 mt-4 text-xs">
          <span>Already have an account? </span>
          <Link to="/login" className="text-sky-400 hover:underline font-bold">Sign In</Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
