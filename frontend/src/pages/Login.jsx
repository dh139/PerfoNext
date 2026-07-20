import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Lock, Mail, Activity, Eye, EyeOff, Key } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated, clearError } = useAuthStore();

  useEffect(() => {
    // If already logged in, go to home
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
    return () => clearError();
  }, [isAuthenticated, navigate, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      // Error handled by store
    }
  };

  const handleQuickLogin = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Decorative Aurora background glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-sky-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-700/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 relative z-10">
        {/* Header branding logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-600/25 mb-3">
            <Activity size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">EPTS System Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to track and manage employee performance</p>
        </div>

        {/* Errors Alert */}
        {(error || formError) && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
            <span>{formError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-sky-500 hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 hover:bg-sky-600 disabled:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-sky-700/20 active:scale-[0.99] cursor-pointer mt-4"
          >
            {loading ? 'Authenticating session...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-slate-400 mt-4 text-xs">
          Don't have an account? <Link to="/register" className="text-sky-500 hover:underline font-semibold">Register here</Link>
        </div>

        {/* Quick Seeding accounts credentials list */}
        {/* <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-sky-500" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Developer Quick Logins</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => handleQuickLogin('admin@epts.com', 'AdminPass123!')}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 p-2.5 rounded-lg text-left text-slate-300 cursor-pointer transition-colors"
            >
              <p className="font-semibold text-rose-400">System Admin</p>
              <p className="opacity-75 truncate">admin@epts.com</p>
            </button>

            <button
              onClick={() => handleQuickLogin('hr@epts.com', 'HrPass123!')}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 p-2.5 rounded-lg text-left text-slate-300 cursor-pointer transition-colors"
            >
              <p className="font-semibold text-emerald-400">HR Manager</p>
              <p className="opacity-75 truncate">hr@epts.com</p>
            </button>

            <button
              onClick={() => handleQuickLogin('manager1@epts.com', 'ManagerPass123!')}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 p-2.5 rounded-lg text-left text-slate-300 cursor-pointer transition-colors"
            >
              <p className="font-semibold text-amber-400">Engineering Mgr</p>
              <p className="opacity-75 truncate">manager1@epts.com</p>
            </button>

            <button
              onClick={() => handleQuickLogin('dev1@epts.com', 'EmpPass123!')}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 p-2.5 rounded-lg text-left text-slate-300 cursor-pointer transition-colors"
            >
              <p className="font-semibold text-sky-400">Employee Dev</p>
              <p className="opacity-75 truncate">dev1@epts.com</p>
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
