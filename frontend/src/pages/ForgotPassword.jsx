import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, KeyRound, Lock, Activity, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email, 2 = otp, 3 = new password, 4 = done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: email.trim() });
      setInfo(res.data.message || 'If an account exists for this email, an OTP has been sent.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { resetToken, newPassword });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please restart the process.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-sky-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-700/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-600/25 mb-3">
            <Activity size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">Reset Your Password</h2>
          <p className="text-xs text-slate-400 mt-1 text-center">
            {step === 1 && 'Enter your email to receive a one-time password'}
            {step === 2 && `Enter the 6-digit OTP sent to ${email}`}
            {step === 3 && 'Choose a new password for your account'}
            {step === 4 && 'Your password has been reset'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && step === 2 && (
          <div className="mb-6 p-4 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-700 hover:bg-sky-600 disabled:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-sky-700/20 active:scale-[0.99] cursor-pointer mt-4"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">One-Time Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <KeyRound size={16} />
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit OTP"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all tracking-widest"
                  disabled={loading}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-700 hover:bg-sky-600 disabled:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-sky-700/20 active:scale-[0.99] cursor-pointer mt-4"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); setError(''); }}
              className="w-full text-center text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Didn't get the code? Resend
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 text-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-700 hover:bg-sky-600 disabled:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-sky-700/20 active:scale-[0.99] cursor-pointer mt-4"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="space-y-5 text-center">
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-slate-300">Your password has been reset successfully.</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-sky-700 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-sky-700/20 active:scale-[0.99] cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        )}

        {step !== 4 && (
          <div className="text-center text-slate-400 mt-6 text-xs">
            Remembered your password? <Link to="/login" className="text-sky-500 hover:underline font-semibold">Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
