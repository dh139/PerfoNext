import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, Hourglass, CheckCircle2, AlertCircle, X } from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../store/toastStore';

const PunchCard = () => {
  const [todayPunch, setTodayPunch] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regIn, setRegIn] = useState('09:00');
  const [regOut, setRegOut] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState(null);
  const [isWeekend, setIsWeekend] = useState(false);
  const [showPunchOutWarning, setShowPunchOutWarning] = useState(false);

  // ── Tick every 30 seconds to update live working time & status ──
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayPunch = useCallback(async () => {
    try {
      setLoading(prev => prev); // keep existing data visible during refresh
      const res = await api.get('/api/attendance/today');
      setTodayPunch(res.data.punch);
      setSettings(res.data.settings);
      setIsHoliday(res.data.isHoliday);
      setHolidayName(res.data.holidayName);
      setIsWeekend(res.data.isWeekend);
    } catch (err) {
      console.error('Failed to fetch today punch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTodayPunch();
  }, [fetchTodayPunch]);

  // Auto-refresh every 30 seconds to pick up server-side changes (regularization approvals, auto-close etc.)
  useEffect(() => {
    const interval = setInterval(fetchTodayPunch, 30000);
    return () => clearInterval(interval);
  }, [fetchTodayPunch]);

  const parseTimeStr = (timeStr, baseDate = new Date()) => {
    if (!timeStr) return baseDate;
    const match = timeStr.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!match) return baseDate;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3];
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  // ── Live elapsed minutes ──
  const getLiveElapsedMinutes = () => {
    if (!todayPunch?.punchIn) return 0;
    if (todayPunch.punchOut) return todayPunch.workingMinutes || 0;
    return Math.max(0, Math.round((nowMs - new Date(todayPunch.punchIn).getTime()) / 60000));
  };

  const getActualLateMinutes = () => {
    if (!todayPunch?.punchIn) return 0;
    if (todayPunch?.lateMinutes !== undefined && todayPunch?.lateMinutes !== null) {
      return todayPunch.lateMinutes;
    }
    const punchInTime = new Date(todayPunch.punchIn);
    const officeStartTime = parseTimeStr(settings?.officeStartTime || '09:00 AM', punchInTime);
    const diffMins = Math.round((punchInTime.getTime() - officeStartTime.getTime()) / 60000);
    const grace = settings?.graceMinutes || 0;
    return diffMins > grace ? diffMins : 0;
  };

  const getExpectedStatusOnPunchOut = () => {
    const presentMins = (settings?.presentHours || 8) * 60;
    const halfDayMins = (settings?.halfDayHours || 4) * 60;

    let isEarlyExitPresent = false;
    if (settings?.allowEarlyExit && settings?.earlyExitTime) {
      const earlyExitLimit = parseTimeStr(settings.earlyExitTime);
      if (nowMs >= earlyExitLimit.getTime()) {
        isEarlyExitPresent = true;
      }
    }

    if (currentNetMins >= presentMins || isEarlyExitPresent) {
      return 'Present';
    } else if (currentNetMins >= halfDayMins) {
      return 'Half Day';
    } else {
      return 'Absent';
    }
  };

  const formatDuration = (mins) => {
    if (!mins && mins !== 0) return '00h 00m';
    const roundedMins = Math.round(mins);
    const h = Math.floor(roundedMins / 60);
    const m = roundedMins % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  const formatTargetHours = (hoursVal) => {
    const totalMins = Math.round((hoursVal || 8) * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
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

  // ── Compute real-time current status based on live elapsed minutes ──
  const getLiveStatus = () => {
    if (!todayPunch?.punchIn) return null; // not punched yet — no live status

    const elapsedRaw = getLiveElapsedMinutes();
    const lunchDeduct = settings?.lunchDeductionEnabled ? (settings?.lunchDeductionMinutes || 0) : 0;
    const activeLunchDeduction = (settings?.lunchDeductionEnabled && elapsedRaw >= 300) ? lunchDeduct : 0;
    const effectiveMinutes = Math.max(0, elapsedRaw - activeLunchDeduction);

    const presentMins = (settings?.presentHours || 8) * 60;
    const halfDayMins = (settings?.halfDayHours || 4) * 60;

    // Check if early exit present threshold is met
    let isEarlyExitPresent = false;
    if (settings?.allowEarlyExit && settings?.earlyExitTime) {
      const earlyExitLimit = parseTimeStr(settings.earlyExitTime);
      if (nowMs >= earlyExitLimit.getTime()) {
        isEarlyExitPresent = true;
      }
    }

    // If already punched out, use the finalized backend status
    if (todayPunch.punchOut) return null;

    if (effectiveMinutes >= presentMins || isEarlyExitPresent) return { label: 'Present', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (effectiveMinutes >= halfDayMins) return { label: 'Half Day', cls: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { label: 'Below Half Day', cls: 'text-rose-600 bg-rose-50 border-rose-200' };
  };

  const handlePunchIn = async () => {
    try {
      const res = await api.post('/api/attendance/punch-in', { location: 'Office' });
      setTodayPunch(res.data.punch);
      toast.success('Punched In successfully. Have a productive day!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch in.');
    }
  };

  const handlePunchOutClick = () => {
    const presentMins = (settings?.presentHours || 8) * 60;
    let isEarlyExitPresent = false;
    if (settings?.allowEarlyExit && settings?.earlyExitTime) {
      const earlyExitLimit = parseTimeStr(settings.earlyExitTime);
      if (nowMs >= earlyExitLimit.getTime()) {
        isEarlyExitPresent = true;
      }
    }
    const isCompleted = currentNetMins >= presentMins || isEarlyExitPresent;

    if (!isCompleted) {
      setShowPunchOutWarning(true);
    } else {
      performPunchOut();
    }
  };

  const performPunchOut = async () => {
    try {
      setShowPunchOutWarning(false);
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

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing Attendance...</span>
        </div>
      </div>
    );
  }

  const hasPunchedIn = todayPunch && todayPunch.punchIn;
  const hasPunchedOut = todayPunch && todayPunch.punchOut;
  const liveElapsed = getLiveElapsedMinutes();
  const liveStatus = getLiveStatus();
  const regStatus = todayPunch?.regularizationStatus;

  const finalizedStatusColors = {
    'Present':     'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Regularized': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Half Day':    'bg-amber-50 text-amber-700 border-amber-200',
    'Absent':      'bg-rose-50 text-rose-700 border-rose-200',
    'Incomplete':  'bg-sky-50 text-sky-700 border-sky-200 animate-pulse',
    'Unusual':     'bg-orange-50 text-orange-700 border-orange-200',
    'Auto Closed': 'bg-orange-50 text-orange-700 border-orange-200',
    'Holiday':     'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Weekly Off':  'bg-slate-50 text-slate-500 border-slate-200',
    'Not Punched Yet': 'bg-slate-50 text-slate-500 border-slate-200'
  };

  let displayStatus = todayPunch?.status === 'Not Punched Yet'
    ? (isHoliday ? 'Holiday' : isWeekend ? 'Weekly Off' : 'Not Punched Yet')
    : (todayPunch?.status || (isHoliday ? 'Holiday' : isWeekend ? 'Weekly Off' : 'Not Punched Yet'));
  if (displayStatus === 'Auto Closed') displayStatus = 'Unusual';
  const displayStatusClass = finalizedStatusColors[displayStatus] || 'bg-slate-50 text-slate-500 border-slate-200';

  // Progress bar for live working time towards present threshold
  const presentMins = (settings?.presentHours || 8) * 60;
  const halfDayMins = (settings?.halfDayHours || 4) * 60;
  const lunchDeduct = settings?.lunchDeductionEnabled ? (settings?.lunchDeductionMinutes || 0) : 0;

  const activeLunchDeduction = (settings?.lunchDeductionEnabled && liveElapsed >= 300) ? lunchDeduct : 0;
  const currentNetMins = hasPunchedIn && !hasPunchedOut
    ? Math.max(0, liveElapsed - activeLunchDeduction)
    : hasPunchedOut
    ? (todayPunch?.workingMinutes || 0)
    : 0;

  const progressPercent = hasPunchedIn
    ? Math.min(100, Math.round((currentNetMins / presentMins) * 100))
    : 0;

  const progressColor = progressPercent >= 100
    ? 'from-emerald-500 to-emerald-400'
    : progressPercent >= Math.round((halfDayMins / presentMins) * 100)
    ? 'from-amber-500 to-amber-400'
    : 'from-rose-400 to-orange-400';

  const officeStart = settings?.officeStartTime || '09:00 AM';
  const officeEnd = settings?.officeEndTime || '06:00 PM';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Today's Attendance</h4>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Regularization status chip */}
          {regStatus === 'pending' && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200 animate-pulse flex items-center gap-1">
              <Hourglass size={9} />
              Reg. Pending
            </span>
          )}
          {regStatus === 'approved' && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1">
              <CheckCircle2 size={9} />
              Regularized
            </span>
          )}
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${displayStatusClass}`}>
            {displayStatus}
          </span>
        </div>
      </div>

      {/* Punch Time Grid */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-3 text-xs font-semibold text-slate-700">
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
          <span className="text-slate-800 text-[13px] font-bold">{formatDuration(currentNetMins)}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase block">Late By / OT</span>
          <span className="text-slate-800 text-[13px] font-bold">
            {getActualLateMinutes() > 0
              ? `${getActualLateMinutes()}m Late`
              : todayPunch?.overtimeMinutes > 0
              ? `${formatDuration(todayPunch.overtimeMinutes)} OT`
              : '--'}
          </span>
        </div>
      </div>

      {/* ── LIVE PROGRESS BAR ── */}
      {hasPunchedIn && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Work Progress</span>
            <span className={progressPercent >= 100 ? 'text-emerald-600' : progressPercent >= Math.round((halfDayMins / presentMins) * 100) ? 'text-amber-600' : 'text-rose-500'}>
              {progressPercent}% of {formatTargetHours(settings?.presentHours)} target
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-500 rounded-full`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Real-time current status (only while still working) */}
          {liveStatus && !hasPunchedOut && (
            <div className={`flex items-center gap-1.5 text-[9px] font-extrabold px-2.5 py-1 rounded-full border w-fit ${liveStatus.cls}`}>
              <AlertCircle size={9} />
              Current Status: {liveStatus.label}
              {liveStatus.label === 'Below Half Day' && (
                <span className="ml-1 font-bold opacity-70">
                  (needs {formatDuration(halfDayMins - currentNetMins)} for Half Day)
                </span>
              )}
              {liveStatus.label === 'Half Day' && (
                <span className="ml-1 font-bold opacity-70">
                  (needs {formatDuration(presentMins - currentNetMins)} for Present)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Office Hours & Early Exit Allowed */}
      <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-medium px-1 mb-4">
        <div className="flex items-center justify-between">
          <span>Office Hours: {officeStart} – {officeEnd}</span>
          <button
            onClick={fetchTodayPunch}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Refresh attendance"
          >
            <RefreshCw size={11} />
          </button>
        </div>
        {settings?.allowEarlyExit && settings?.earlyExitTime && (
          <div className="text-emerald-600 font-bold">
            🚪 Early Exit: Allowed after {settings.earlyExitTime}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {isHoliday && !hasPunchedIn ? (
          <div className="flex-1 text-center bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs py-3 rounded-xl font-bold uppercase tracking-wide">
            🌴 Holiday: {holidayName || 'Holiday'}
          </div>
        ) : isWeekend && !hasPunchedIn ? (
          <div className="flex-1 text-center bg-slate-50 border border-slate-200 text-slate-500 text-xs py-3 rounded-xl font-bold uppercase tracking-wide">
            🏖️ Weekly Off
          </div>
        ) : !hasPunchedIn ? (
          <button
            onClick={handlePunchIn}
            className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
          >
            Punch In
          </button>
        ) : !hasPunchedOut ? (
          <button
            onClick={handlePunchOutClick}
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

      {/* Regularization Modal */}
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
                  className="flex-1 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingReg ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── EARLY PUNCH OUT CONFIRMATION MODAL ── */}
      {showPunchOutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 text-white flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Early Punch Out Warning</span>
              </h3>
              <button
                onClick={() => setShowPunchOutWarning(false)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                Your net working hours are currently <strong className="text-slate-800">{formatDuration(currentNetMins)}</strong> (Target: {formatTargetHours(settings?.presentHours)}). 
              </p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-[11px] text-amber-800 font-bold leading-relaxed">
                ⚠️ If you do punch out then this counted as {getExpectedStatusOnPunchOut() === 'Absent' ? 'Absent' : 'Half Day'}.
              </div>
              <p className="text-[11px] text-slate-450 font-medium">
                Are you sure you want to proceed with Punching Out?
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPunchOutWarning(false)}
                  className="border border-slate-250 hover:bg-slate-50 text-slate-650 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performPunchOut}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PunchCard;
