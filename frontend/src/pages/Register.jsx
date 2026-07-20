import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, User, Mail, Phone, Lock, Key, Briefcase, Layers, Activity } from 'lucide-react';
import { toast } from '../store/toastStore';

const Register = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form Fields
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [role, setRole] = useState('employee');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        // Direct axios requests as user is not authorized yet
        const deptRes = await axios.get('/api/auth/departments');
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0]._id);

        const desRes = await axios.get('/api/auth/designations');
        setDesignations(desRes.data);
        if (desRes.data.length > 0) setDesignationId(desRes.data[0]._id);

        const managersRes = await axios.get('/api/auth/managers');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email || !mobile || !password || !departmentId || !designationId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      const res = await axios.post('/api/auth/register', {
        firstName,
        lastName,
        email,
        mobile,
        password,
        departmentId,
        designationId,
        managerId: managerId || null,
        role
      });

      toast.success(res.data.message || 'Registration successful! Redirecting to login page.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    }
  };

  // Filter designations by selected department
  const filteredDesignations = designations.filter(
    des => des.departmentId?._id === departmentId || des.departmentId === departmentId
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden my-auto">
      {/* Decorative Aurora background glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-sky-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-700/10 rounded-full blur-[120px] pointer-events-none"></div>

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

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Email Address</label>
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
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">First Name</label>
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
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Last Name</label>
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
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Mobile Number</label>
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Password</label>
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

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none font-semibold text-xs transition-all"
                required
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Department</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.departmentName}</option>
                ))}
              </select>
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Designation</label>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none font-semibold text-xs transition-all"
                required
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Designation</option>
                {filteredDesignations.map(d => (
                  <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.designationName}</option>
                ))}
              </select>
            </div>

            {/* Reporting Manager */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Reporting Manager (Optional)</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none text-xs transition-all"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Manager (None)</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id} className="bg-slate-900 text-slate-200">{m.firstName} {m.lastName} ({m.role})</option>
                ))}
              </select>
            </div>

            {/* System Role */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">System Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 p-2.5 rounded-xl outline-none font-bold text-xs transition-all"
                required
              >
                <option value="employee" className="bg-slate-900 text-slate-200">Employee</option>
                <option value="manager" className="bg-slate-900 text-slate-200">Manager</option>
                <option value="hr" className="bg-slate-900 text-slate-200">HR Manager</option>
              </select>
            </div>

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
