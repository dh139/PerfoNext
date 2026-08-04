import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../store/toastStore';

const PunchCard = () => {
  const [todayPunch, setTodayPunch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regIn, setRegIn] = useState('09:00');
  const [regOut, setRegOut] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getNetWorkingTime = () => {
    if (!todayPunch || !todayPunch.punchIn) return '00h 00m';
    if (todayPunch.punchOut) {
      return formatDuration(todayPunch.workingMinutes);
    }
    const elapsed = Math.max(0, Math.round((new Date().getTime() - new Date(todayPunch.punchIn).getTime()) / 60000));
    return formatDuration(elapsed);
  };

  const fetchTodayPunch = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/attendance/today');
      setTodayPunch(res.data.punch);
    } catch (err) {
      console.error('Failed to fetch today punch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayPunch();
  }, []);

  const handlePunchIn = async () => {
    try {
      const res = await api.post('/api/attendance/punch-in', { location: 'Office' });
      setTodayPunch(res.data.punch);
      toast.success('Punched In successfully. Have a productive day!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch in.');
    }
  };

  const handlePunchOut = async () => {
    try {
      const res = await api.post('/api/attendance/punch-out');
      setTodayPunch(res.data.punch);
      toast.success('Punched Out successfully. Good work today!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch out.');
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReg(true);
      const pinDate = new Date(`${regDate}T${regIn}:00`);
      const poutDate = new Date(`${regDate}T${regOut}:00`);
      
      if (poutDate <= pinDate) {
        toast.error('Punch Out must be after Punch In.');
        return;
      }
      
      await api.post('/api/attendance/regularization', {
        date: regDate,
        requestedPunchIn: pinDate,
        requestedPunchOut: poutDate,
        reason: regReason
      });
      
      toast.success('Regularization request submitted for review.');
      setShowRegModal(false);
      setRegReason('');
      fetchTodayPunch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit regularization.');
    } finally {
      setSubmittingReg(false);
    }
  };

  const formatTime = (dateVal) => {
    if (!dateVal) return '--';
    const d = new Date(dateVal);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const formatDuration = (mins) => {
    if (!mins) return '00h 00m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing Attendance...</span>
        </div>
      </div>
    );
  }

  const hasPunchedIn = todayPunch && todayPunch.punchIn;
  const hasPunchedOut = todayPunch && todayPunch.punchOut;

  const statusColors = {
    'Present': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Half Day': 'bg-amber-50 text-amber-700 border-amber-200',
    'Absent': 'bg-rose-50 text-rose-700 border-rose-200',
    'Incomplete': 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse',
    'Not Punched Yet': 'bg-slate-50 text-slate-500 border-slate-200'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Today's Attendance</h4>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusColors[todayPunch?.status || 'Not Punched Yet']}`}>
            {todayPunch?.status || 'Not Punched Yet'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-xs font-semibold text-slate-700">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Punch In</span>
            <span className="text-slate-800 text-[13px] font-bold">{formatTime(todayPunch?.punchIn)}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Punch Out</span>
            <span className="text-slate-800 text-[13px] font-bold">{formatTime(todayPunch?.punchOut)}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Net Working Time</span>
            <span className="text-slate-800 text-[13px] font-bold">{getNetWorkingTime()}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Late By / OT</span>
            <span className="text-slate-800 text-[13px] font-bold">
              {todayPunch?.lateMinutes > 0 ? `${todayPunch.lateMinutes}m Late` : todayPunch?.overtimeMinutes > 0 ? `${formatDuration(todayPunch.overtimeMinutes)} OT` : '--'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1 mb-4">
          <span>Office Hours: 09:00 AM – 06:00 PM</span>
          {todayPunch?.regularizationStatus === 'pending' && (
            <span className="text-amber-600 font-bold animate-pulse">⚠️ Regularization Pending</span>
          )}
          {todayPunch?.regularizationStatus === 'approved' && (
            <span className="text-emerald-600 font-bold">✔ Regularized</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!hasPunchedIn ? (
          <button
            onClick={handlePunchIn}
            className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
          >
            Punch In
          </button>
        ) : !hasPunchedOut ? (
          <button
            onClick={handlePunchOut}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
          >
            Punch Out
          </button>
        ) : (
          <div className="flex-1 text-center bg-slate-50 border border-slate-200 text-slate-400 text-xs py-3 rounded-xl font-bold">
            Shift Completed
          </div>
        )}

        <button
          onClick={() => setShowRegModal(true)}
          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 p-3 rounded-xl transition-all cursor-pointer"
          title="Request Regularization"
        >
          <RefreshCw size={14} className={submittingReg ? 'animate-spin' : ''} />
        </button>
      </div>

      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-scale-in">
            <h3 className="font-extrabold text-slate-800 text-sm mb-1">Request Attendance Regularization</h3>
            <p className="text-[10px] text-slate-400 mb-4 uppercase font-bold tracking-wider">Submit shift time correction</p>

            <form onSubmit={handleRegSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Punch In Time</label>
                  <input
                    type="time"
                    value={regIn}
                    onChange={(e) => setRegIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Punch Out Time</label>
                  <input
                    type="time"
                    value={regOut}
                    onChange={(e) => setRegOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reason for correction</label>
                <textarea
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  placeholder="e.g. Forgot to punch out / worked from client location..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="flex-1 bg-sky-700 hover:bg-sky-850 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingReg ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PunchCard;
