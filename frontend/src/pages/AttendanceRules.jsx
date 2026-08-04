import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Settings, Sun, Moon, Coffee, AlarmClock,
  TrendingUp, Save, RotateCcw, Info, ChevronDown, ChevronUp,
  CheckCircle, XCircle, History, Loader2, Shield, Smartphone,
  MapPin, Wifi, Zap, Timer, Users, CalendarX
} from 'lucide-react';
import api from '../utils/api';
import { toast } from '../store/toastStore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Reusable Components ─────────────────────────────────────────────────────

const SectionCard = ({ icon: Icon, iconBg, title, subtitle, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer text-left border-none bg-transparent"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className={`p-1.5 rounded-lg transition-colors ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-400'}`}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-slate-100 pt-5 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

const Toggle = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-4 cursor-pointer group select-none">
    <div className="relative mt-0.5 flex-shrink-0">
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-sky-500 shadow-md shadow-sky-500/20' : 'bg-slate-200'}`} />
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{label}</p>
      {description && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
    </div>
  </label>
);

const NumberField = ({ label, value, onChange, min = 0, max, suffix, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 text-center transition-all"
      />
      {suffix && <span className="text-xs text-slate-600 font-bold">{suffix}</span>}
    </div>
    {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
  </div>
);

const TimeField = ({ label, value, onChange, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="09:00 AM"
      className="w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all"
    />
    {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
  </div>
);

const ComingSoonCard = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
    <div className="p-2.5 bg-white border border-slate-150 rounded-xl flex-shrink-0 text-slate-400">
      <Icon size={16} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="text-xs font-bold text-slate-700">{title}</h4>
        <span className="text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">Coming Soon</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
    </div>
  </div>
);

const StatPill = ({ label, value, color }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl border ${color} shadow-sm`}>
    <span className="text-xs font-bold">{label}</span>
    <span className="text-xs font-black">{value}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendanceRulesPage() {
  const [settings, setSettings] = useState(null);
  const [rules, setRules] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/attendance/settings');
      setSettings(res.data.settings);
      setRules(JSON.parse(JSON.stringify(res.data.settings.attendanceRules)));
      setDirty(false);
    } catch (e) {
      console.error('Failed to fetch attendance settings:', e);
      toast.error('Failed to load attendance configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/settings/history');
      setHistory(Array.isArray(res.data) ? res.data : []);
      setHistoryPage(1);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { if (historyOpen) fetchHistory(); }, [historyOpen, fetchHistory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/attendance/settings', {
        attendanceRules: rules,
        changeNote
      });
      setSettings(res.data.settings);
      setRules(JSON.parse(JSON.stringify(res.data.settings.attendanceRules)));
      setChangeNote('');
      setDirty(false);
      toast.success('Attendance settings updated successfully.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setRules(JSON.parse(JSON.stringify(settings.attendanceRules)));
      setDirty(false);
      toast.info('Discarded unsaved changes.');
    }
  };

  const setRule = (key, value) => {
    setRules(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };
  const setNestedRule = (parent, key, value) => {
    setRules(prev => ({ ...prev, [parent]: { ...prev[parent], [key]: value } }));
    setDirty(true);
  };
  const toggleWeekend = (day) => {
    const wk = rules.weekends || [];
    setRule('weekends', wk.includes(day) ? wk.filter(d => d !== day) : [...wk, day].sort());
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <XCircle size={28} className="text-rose-500" />
          </div>
          <p className="text-slate-800 font-bold text-sm">Failed to load settings</p>
          <p className="text-slate-500 text-xs mt-1">Please try again</p>
          <button onClick={fetchSettings} className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Live formula preview
  const preview = (() => {
    const parse = (s) => {
      const m = (s || '').trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
      if (!m) return null;
      let h = parseInt(m[1]); const min = parseInt(m[2]);
      if (m[3] === 'PM' && h < 12) h += 12;
      if (m[3] === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    };
    const start = parse(rules.officeStartTime) ?? 540;
    const end = parse(rules.officeEndTime) ?? 1080;
    const dur = Math.max(0, end - start);
    const lunch = rules.lunchDeductionEnabled ? (rules.lunchDeductionMinutes || 0) : 0;
    const net = Math.max(0, dur - lunch);
    const fmt = m => `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim();
    return { dur, lunch, net, fDur: fmt(dur), fLunch: fmt(lunch), fNet: fmt(net) };
  })();

  const itemsPerPage = 3;
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = (historyPage - 1) * itemsPerPage;
  const paginatedHistory = history.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs text-slate-800">

      {/* ── Page Dark Header Banner (Anti-AI-Slop Command Desk) ────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">Enterprise Policy Desk</span>
              {settings?.version && (
                <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                  v{settings.version}
                </span>
              )}
              {dirty && (
                <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">Attendance Rules</h1>
            <p className="text-slate-400 text-xs mt-1">Configure company-wide shift parameters, weekend profiles, and thresholds.</p>
          </div>
          <div className="flex gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
            {dirty && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 font-bold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-all cursor-pointer bg-slate-800/40 text-xs"
              >
                <RotateCcw size={14} />
                Discard
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 font-black rounded-xl transition-all cursor-pointer disabled:opacity-60 text-slate-950 text-xs"
              style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Office Timing ────────────────────────────────────────────────── */}
      <SectionCard icon={Clock} iconBg="bg-sky-50 text-sky-600 border border-sky-100" title="Office Timing" subtitle="Define working hours for punch-in/out calculations">
        <div className="flex flex-wrap gap-6">
          <TimeField label="Office Start Time" value={rules.officeStartTime} onChange={v => setRule('officeStartTime', v)} hint='Format: "09:00 AM"' />
          <TimeField label="Office End Time" value={rules.officeEndTime} onChange={v => setRule('officeEndTime', v)} hint='Format: "06:00 PM"' />
        </div>
        {/* Live preview */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-sky-600 font-bold uppercase tracking-wider mb-1">Shift Duration</p>
            <p className="text-base font-black text-slate-800">{preview.fDur}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mb-1">Lunch Deduction</p>
            <p className="text-base font-black text-slate-800">−{preview.fLunch || '0m'}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Net Working</p>
            <p className="text-base font-black text-slate-800">{preview.fNet}</p>
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Lunch Break ──────────────────────────────────────────────────── */}
      <SectionCard icon={Coffee} iconBg="bg-amber-50 text-amber-600 border border-amber-100" title="Lunch Break" subtitle="Automatic deduction from total working hours">
        <Toggle
          checked={rules.lunchDeductionEnabled}
          onChange={v => setRule('lunchDeductionEnabled', v)}
          label="Deduct Lunch Automatically"
          description="If enabled, the configured lunch duration is subtracted from every day's working hours."
        />
        {rules.lunchDeductionEnabled && (
          <NumberField label="Lunch Duration" value={rules.lunchDeductionMinutes} onChange={v => setRule('lunchDeductionMinutes', v)} min={0} max={120} suffix="minutes" hint="Typically 60 minutes (1 hour)" />
        )}
      </SectionCard>

      {/* ── 3. Working Hour Thresholds ──────────────────────────────────────── */}
      <SectionCard icon={TrendingUp} iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100" title="Minimum Working Hours" subtitle="Thresholds to classify attendance status">
        <div className="grid grid-cols-2 gap-6">
          <NumberField label="Present After" value={rules.presentHours} onChange={v => setRule('presentHours', v)} min={0} max={24} suffix="hours" />
          <NumberField label="Half Day After" value={rules.halfDayHours} onChange={v => setRule('halfDayHours', v)} min={0} max={24} suffix="hours" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <StatPill label="✅ Present" value={`≥ ${rules.presentHours}h`} color="bg-emerald-50 border-emerald-150 text-emerald-700" />
          <StatPill label="🌗 Half Day" value={`${rules.halfDayHours}–${rules.presentHours}h`} color="bg-amber-50 border-amber-150 text-amber-700" />
          <StatPill label="❌ Absent" value={`< ${rules.halfDayHours}h`} color="bg-rose-50 border-rose-150 text-rose-700" />
        </div>
      </SectionCard>

      {/* ── 4. Late Coming ──────────────────────────────────────────────────── */}
      <SectionCard icon={AlarmClock} iconBg="bg-rose-50 text-rose-600 border border-rose-100" title="Late Coming Rule" subtitle="Grace period after office start time">
        <NumberField label="Grace Time" value={rules.graceMinutes} onChange={v => setRule('graceMinutes', v)} min={0} max={60} suffix="minutes" />
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
          <div className="text-center px-3 py-2 bg-white border border-slate-200 rounded-lg">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Start</p>
            <p className="text-slate-800 font-black">{rules.officeStartTime}</p>
          </div>
          <div className="flex-1 text-center text-slate-400 font-bold">+ {rules.graceMinutes} min grace</div>
          <div className="text-center px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-[10px] text-rose-500 font-bold uppercase">Late after</p>
            <p className="text-rose-700 font-black">
              {(() => {
                const parse = (s) => { const m=(s||'').trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/); if(!m) return null; let h=parseInt(m[1]); const min=parseInt(m[2]); if(m[3]==='PM'&&h<12)h+=12; if(m[3]==='AM'&&h===12)h=0; return h*60+min; };
                const t = (parse(rules.officeStartTime) ?? 540) + (rules.graceMinutes || 0);
                const h = Math.floor(t/60) % 12 || 12, min = t % 60, ampm = Math.floor(t/60) >= 12 ? 'PM' : 'AM';
                return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')} ${ampm}`;
              })()}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── 5. Early Exit ───────────────────────────────────────────────────── */}
      <SectionCard icon={Sun} iconBg="bg-orange-50 text-orange-600 border border-orange-100" title="Early Exit Rule" subtitle="Control minimum stay before employees can leave">
        <Toggle
          checked={rules.allowEarlyExit}
          onChange={v => setRule('allowEarlyExit', v)}
          label="Allow Configured Early Exit Time"
          description="If disabled, any departure before office end time is flagged as an early exit."
        />
        {rules.allowEarlyExit && (
          <TimeField label="Minimum Stay Until" value={rules.earlyExitTime} onChange={v => setRule('earlyExitTime', v)} hint="Employees can leave at or after this time without penalty" />
        )}
      </SectionCard>

      {/* ── 6. Overtime ─────────────────────────────────────────────────────── */}
      <SectionCard icon={Zap} iconBg="bg-indigo-50 text-indigo-600 border border-indigo-100" title="Overtime Rule" subtitle="Track and round time worked beyond office hours">
        <Toggle
          checked={rules.enableOvertime}
          onChange={v => setRule('enableOvertime', v)}
          label="Enable Overtime Tracking"
          description="Record overtime hours when employees stay beyond office end time."
        />
        {rules.enableOvertime && (
          <div className="grid grid-cols-2 gap-6">
            <NumberField label="Minimum OT Threshold" value={rules.overtimeMinMinutes} onChange={v => setRule('overtimeMinMinutes', v)} min={1} max={120} suffix="min" hint="Minimum extra minutes to qualify as OT" />
            <NumberField label="Round OT To" value={rules.overtimeRoundMinutes} onChange={v => setRule('overtimeRoundMinutes', v)} min={1} max={60} suffix="min" hint="OT rounded down to this interval" />
          </div>
        )}
      </SectionCard>

      {/* ── 7. Weekends ─────────────────────────────────────────────────────── */}
      <SectionCard icon={CalendarX} iconBg="bg-purple-50 text-purple-600 border border-purple-100" title="Weekend Days" subtitle="Non-working days excluded from attendance calculations">
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => {
            const isWknd = rules.weekends?.includes(i);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleWeekend(i)}
                className={`py-2.5 rounded-xl text-xs font-black border transition-all duration-200 cursor-pointer ${
                  isWknd
                    ? 'bg-purple-500 border-purple-600 text-white shadow-md shadow-purple-500/10 scale-[1.02]'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        {rules.weekends?.length === 0 && (
          <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-xl p-3">
            <Info size={14} />
            All 7 days are working days. No weekends configured.
          </div>
        )}
        {rules.weekends?.length > 0 && (
          <p className="text-xs text-slate-500 font-medium">
            <span className="text-purple-600 font-bold">{rules.weekends.map(d => DAYS[d]).join(', ')}</span> are weekly off days.
          </p>
        )}
      </SectionCard>

      {/* ── 8. Multiple Punch Prevention ────────────────────────────────────── */}
      <SectionCard icon={Shield} iconBg="bg-teal-50 text-teal-600 border border-teal-100" title="Punch Prevention Rules" subtitle="Prevent duplicate punch-in/out and regularization abuse">
        <div className="space-y-4">
          <Toggle
            checked={rules.multiplePunchPrevention?.onePunchInPerDay}
            onChange={v => setNestedRule('multiplePunchPrevention', 'onePunchInPerDay', v)}
            label="One Punch-In Per Day"
            description="Employees cannot punch in more than once per day."
          />
          <Toggle
            checked={rules.multiplePunchPrevention?.onePunchOutPerDay}
            onChange={v => setNestedRule('multiplePunchPrevention', 'onePunchOutPerDay', v)}
            label="One Punch-Out Per Day"
            description="Employees cannot punch out more than once per day."
          />
          <Toggle
            checked={rules.multiplePunchPrevention?.preventDuplicateRequests}
            onChange={v => setNestedRule('multiplePunchPrevention', 'preventDuplicateRequests', v)}
            label="Block Duplicate Regularization Requests"
            description="Prevent submitting a second regularization for the same date."
          />
        </div>
      </SectionCard>

      {/* ── 9. Auto Punch-Out ───────────────────────────────────────────────── */}
      <SectionCard icon={Timer} iconBg="bg-cyan-50 text-cyan-600 border border-cyan-100" title="Auto Punch-Out" subtitle="Automatically close forgotten punch-outs from past days">
        <Toggle
          checked={rules.autoPunchOut?.enable}
          onChange={v => setNestedRule('autoPunchOut', 'enable', v)}
          label="Enable Auto Punch-Out"
          description="If an employee forgets to punch out, the system marks them out at the configured time."
        />
        {rules.autoPunchOut?.enable && (
          <TimeField label="Auto Punch-Out Time" value={rules.autoPunchOut?.time} onChange={v => setNestedRule('autoPunchOut', 'time', v)} hint='Records will be marked with status "Auto Closed"' />
        )}
      </SectionCard>

    

      {/* ── Attendance Formula Card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl"><Info size={16} /></div>
          <div>
            <p className="text-sm font-bold text-slate-800">Attendance Calculation Formula</p>
            <p className="text-xs text-slate-500">How working hours and status are derived</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
            <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-mono text-slate-800">Punch Out − Punch In</span>
            <span className="text-slate-400">=</span>
            <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-mono text-slate-800">Total Duration</span>
            <span className="text-slate-400">−</span>
            <span className="bg-amber-50 border border-amber-150 px-3 py-1.5 rounded-lg font-mono text-amber-700">{rules.lunchDeductionEnabled ? `${rules.lunchDeductionMinutes}m lunch` : '0m'}</span>
            <span className="text-slate-400">=</span>
            <span className="bg-sky-50 border border-sky-150 px-3 py-1.5 rounded-lg font-mono text-sky-700 font-black">Net Working Time</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { emoji: '✅', label: 'Present', cond: `Net ≥ ${rules.presentHours}h`, bg: 'bg-emerald-50', border: 'border-emerald-150', text: 'text-emerald-700' },
              { emoji: '🌗', label: 'Half Day', cond: `${rules.halfDayHours}–${rules.presentHours}h`, bg: 'bg-amber-50', border: 'border-amber-150', text: 'text-amber-700' },
              { emoji: '❌', label: 'Absent', cond: `Net < ${rules.halfDayHours}h`, bg: 'bg-rose-50', border: 'border-rose-150', text: 'text-rose-700' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center shadow-sm`}>
                <p className="text-lg mb-1">{s.emoji}</p>
                <p className={`font-bold ${s.text}`}>{s.label}</p>
                <p className="text-slate-500 mt-1">{s.cond}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Change Note + Save ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Note <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
        <input
          type="text"
          value={changeNote}
          onChange={e => setChangeNote(e.target.value)}
          placeholder="e.g. Updated hours for summer schedule"
          className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all font-bold"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 font-bold text-white rounded-xl disabled:opacity-60 cursor-pointer transition-all text-xs"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* ── Audit History ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer border-none bg-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-xl"><History size={16} /></div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">Change History</p>
              <p className="text-xs text-slate-500">Audit log of all settings modifications</p>
            </div>
          </div>
          {historyOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {historyOpen && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-5">
            {history.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No changes recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {paginatedHistory.map((h, i) => (
                  <div key={i} className="p-4 bg-slate-50 border border-slate-250 rounded-xl">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap text-xs">
                      <span className="font-bold text-slate-700">
                        {h.changedBy?.firstName} {h.changedBy?.lastName}
                        <span className="text-slate-500 text-[10px] ml-2 font-normal">({h.changedBy?.employeeCode})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{new Date(h.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    {h.changeNote && <p className="text-slate-500 text-xs italic mb-3">"{h.changeNote}"</p>}
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600">
                      <div className="bg-rose-50/30 border border-rose-100 rounded-lg p-3">
                        <p className="text-rose-600 font-bold mb-2 uppercase tracking-wider text-[9px]">Before</p>
                        <div className="space-y-1">
                          <p>Start: <span className="text-slate-800">{h.oldValues?.officeStartTime}</span></p>
                          <p>End: <span className="text-slate-800">{h.oldValues?.officeEndTime}</span></p>
                          <p>Grace Time: <span className="text-slate-800">{h.oldValues?.graceMinutes || 0} min</span></p>
                          <p>Present: <span className="text-slate-800">{h.oldValues?.presentHours}h</span></p>
                          <p>Half Day: <span className="text-slate-800">{h.oldValues?.halfDayHours}h</span></p>
                          <p>Lunch: <span className="text-slate-800">{h.oldValues?.lunchDeductionEnabled ? `${h.oldValues?.lunchDeductionMinutes || 0} min` : 'Disabled'}</span></p>
                          <p>Early Exit: <span className="text-slate-800">{h.oldValues?.allowEarlyExit ? h.oldValues?.earlyExitTime : 'Disabled'}</span></p>
                          <p>Overtime: <span className="text-slate-800">{h.oldValues?.enableOvertime ? `Min ${h.oldValues?.overtimeMinMinutes || 0}m` : 'Disabled'}</span></p>
                          <p>Weekends: <span className="text-slate-800">{(h.oldValues?.weekends || []).map(d => DAYS[d]).join(', ') || 'None'}</span></p>
                        </div>
                      </div>
                      <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-3">
                        <p className="text-emerald-600 font-bold mb-2 uppercase tracking-wider text-[9px]">After</p>
                        <div className="space-y-1">
                          <p>Start: <span className="text-slate-800">{h.newValues?.officeStartTime}</span></p>
                          <p>End: <span className="text-slate-800">{h.newValues?.officeEndTime}</span></p>
                          <p>Grace Time: <span className="text-slate-800">{h.newValues?.graceMinutes || 0} min</span></p>
                          <p>Present: <span className="text-slate-800">{h.newValues?.presentHours}h</span></p>
                          <p>Half Day: <span className="text-slate-800">{h.newValues?.halfDayHours}h</span></p>
                          <p>Lunch: <span className="text-slate-800">{h.newValues?.lunchDeductionEnabled ? `${h.newValues?.lunchDeductionMinutes || 0} min` : 'Disabled'}</span></p>
                          <p>Early Exit: <span className="text-slate-800">{h.newValues?.allowEarlyExit ? h.newValues?.earlyExitTime : 'Disabled'}</span></p>
                          <p>Overtime: <span className="text-slate-800">{h.newValues?.enableOvertime ? `Min ${h.newValues?.overtimeMinMinutes || 0}m` : 'Disabled'}</span></p>
                          <p>Weekends: <span className="text-slate-800">{(h.newValues?.weekends || []).map(d => DAYS[d]).join(', ') || 'None'}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs mt-4">
                <button
                  type="button"
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Previous
                </button>
                <span className="text-slate-500 font-medium">
                  Page {historyPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={historyPage === totalPages}
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
