import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle,
  Flag, Building2, Star, Landmark, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import api from '../utils/api';
import { toast } from '../store/toastStore';
import useAuthStore from '../store/authStore';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_META = {
  National: { label: 'National', icon: Landmark, bg: 'bg-red-50 text-red-600 border-red-150',    dot: 'bg-red-500' },
  Festival:  { label: 'Festival', icon: Star,     bg: 'bg-amber-50 text-amber-600 border-amber-150', dot: 'bg-amber-500' },
  Company:   { label: 'Company',  icon: Building2, bg: 'bg-sky-50 text-sky-600 border-sky-150',    dot: 'bg-sky-500' },
  Optional:  { label: 'Optional', icon: Flag,      bg: 'bg-purple-50 text-purple-600 border-purple-150', dot: 'bg-purple-500' },
};

function TypeBadge({ type, size = 'sm' }) {
  const m = TYPE_META[type] || TYPE_META.National;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full border ${m.bg} ${size === 'xs' ? 'text-[9px]' : 'text-[10px]'}`}>
      <Icon size={size === 'xs' ? 9 : 10} />
      {m.label}
    </span>
  );
}

// ── Add / Edit Modal ────────────────────────────────────────────────────────
function HolidayModal({ mode, holiday, onClose, onSave }) {
  const [form, setForm] = useState({
    name: holiday?.name || '',
    date: holiday?.date || '',
    type: holiday?.type || 'National',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white text-xs text-slate-800 animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl">
              <Calendar size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {mode === 'create' ? 'Add Holiday' : 'Edit Holiday'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors border-none bg-transparent">
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Holiday Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Republic Day"
              className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all font-bold"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date *</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Holiday Type *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(TYPE_META).map(([key, m]) => {
                const Icon = m.icon;
                const sel = form.type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      sel ? `${m.bg} scale-[1.02] shadow-sm` : 'bg-slate-50/50 text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} />
                    {m.label}
                    {sel && <CheckCircle size={13} className="ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[11px] font-semibold">
              <XCircle size={14} /> {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 font-bold text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 font-black rounded-xl disabled:opacity-60 cursor-pointer transition-all text-slate-950"
              style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', boxShadow: '0 4px 12px rgba(14,165,233,0.2)' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {mode === 'create' ? 'Add Holiday' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-rose-150 shadow-2xl p-6 bg-white text-xs text-slate-800 animate-scale-in">
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <Trash2 size={22} className="text-rose-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 text-center mb-1">Delete Holiday?</h3>
        <p className="text-slate-500 text-xs text-center mb-6">
          "<span className="text-slate-800 font-bold">{name}</span>" will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 font-bold text-slate-500 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-350 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer transition-all shadow-md shadow-rose-600/10">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function HolidayCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'executive';

  const [year, setYear]       = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]   = useState('');

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/attendance/holidays?year=${year}`);
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const handleSave = async (form) => {
    const isEdit = modal?.mode === 'edit';
    const url = isEdit ? `/api/attendance/holidays/${modal.holiday._id}` : `/api/attendance/holidays`;
    try {
      if (isEdit) {
        await api.put(url, form);
        toast.success('Holiday updated successfully.');
      } else {
        await api.post(url, form);
        toast.success('Holiday added successfully.');
      }
      fetchHolidays();
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to save holiday.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/attendance/holidays/${deleteTarget._id}`);
      toast.success('Holiday deleted successfully.');
      setDeleteTarget(null);
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to delete holiday.');
    }
  };

  const filtered = holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const ms = String(i + 1).padStart(2, '0');
    return filtered.filter(h => h.date.startsWith(`${year}-${ms}`));
  });
  const upcoming = holidays
    .filter(h => h.date >= new Date().toISOString().split('T')[0])
    .slice(0, 6);
  const todayStr = new Date().toISOString().split('T')[0];

  const fmtDate = (d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const dayName = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });

  // Summary stats
  const stats = Object.keys(TYPE_META).map(t => ({
    type: t,
    count: holidays.filter(h => h.type === t).length,
    ...TYPE_META[t]
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 text-xs text-slate-800">
      <button
        onClick={() => navigate(['admin', 'hr', 'executive'].includes(user?.role) ? '/settings' : '/')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer border border-slate-200/60 uppercase tracking-wider w-fit"
      >
        <ChevronLeft size={12} />
        <span>Back to {['admin', 'hr', 'executive'].includes(user?.role) ? 'Settings' : 'Dashboard'}</span>
      </button>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {modal && <HolidayModal mode={modal.mode} holiday={modal.holiday} onClose={() => setModal(null)} onSave={handleSave} />}
      {deleteTarget && <DeleteConfirm name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}

      {/* ── Dark Header Command Desk Banner ────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">Operational Calendars</span>
              <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-mono">{year}</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">Holiday Calendar</h1>
            <p className="text-slate-400 text-xs mt-1">Manage company-wide holidays. Holiday dates block punch-in and exclude counts from working days.</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setModal({ mode: 'create', holiday: null })}
              className="flex items-center gap-2 px-5 py-2.5 font-black rounded-xl shrink-0 cursor-pointer transition-all text-slate-950 text-xs self-stretch md:self-auto justify-center"
              style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}
            >
              <Plus size={16} />
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* ── Year Nav + Search ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100 cursor-pointer transition-all">
            <ChevronLeft size={16} />
          </button>
          {[year - 1, year, year + 1].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                y === year
                  ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-sm font-black'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {y}
            </button>
          ))}
          <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100 cursor-pointer transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search holidays..."
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 w-56 transition-all"
          />
        </div>
      </div>

      {/* ── Type Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.type} className={`flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm`}>
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-base font-black text-slate-800">{s.count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Upcoming + Monthly Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Upcoming holidays panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden lg:col-span-1">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Star size={14} className="text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800">Upcoming Holidays</h3>
            <span className="ml-auto text-[10px] bg-slate-200/80 border border-slate-300 text-slate-600 px-2 py-0.5 rounded-full font-bold">{upcoming.length} upcoming</span>
          </div>
          <div className="p-4 space-y-2">
            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-slate-500 font-bold text-xs">No upcoming holidays</p>
              </div>
            ) : (
              upcoming.map(h => {
                const isToday = h.date === todayStr;
                const m = TYPE_META[h.type] || TYPE_META.National;
                return (
                  <div
                    key={h._id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${isToday ? 'bg-sky-50 border-sky-200' : 'bg-slate-50/30 border-slate-150 hover:bg-slate-50 hover:border-slate-300'}`}
                  >
                    <div className="text-center w-10 flex-shrink-0">
                      <p className={`text-base font-black leading-none ${isToday ? 'text-sky-600' : 'text-slate-800'}`}>
                        {h.date.split('-')[2]}
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold mt-1">
                        {MONTHS_SHORT[parseInt(h.date.split('-')[1]) - 1]}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isToday ? 'text-sky-700' : 'text-slate-800'}`}>{h.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <TypeBadge type={h.type} size="xs" />
                        <span className="text-slate-400 text-[10px] font-bold">{dayName(h.date)}</span>
                        {isToday && <span className="text-[9px] bg-sky-500/20 text-sky-700 px-1.5 rounded-full font-black">Today</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ mode: 'edit', holiday: h })} className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer border-none bg-transparent"><Edit2 size={11} /></button>
                        <button onClick={() => setDeleteTarget(h)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer border-none bg-transparent"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly mini-calendars */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 h-32 animate-pulse" />
            ))
          ) : (
            byMonth.map((mHolidays, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${mHolidays.length > 0 ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}
              >
                <div className={`px-3 py-2 flex items-center justify-between border-b ${mHolidays.length > 0 ? 'border-slate-200 bg-slate-50/50' : 'border-slate-100'}`}>
                  <h4 className={`text-xs font-extrabold ${mHolidays.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                    {MONTHS[idx]}
                  </h4>
                  {mHolidays.length > 0 && (
                    <span className="text-[9px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-bold">
                      {mHolidays.length}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1.5 min-h-[70px] bg-white">
                  {mHolidays.length === 0 ? (
                    <p className="text-slate-300 text-[10px] text-center pt-3 font-semibold">No holidays</p>
                  ) : (
                    mHolidays.map(h => {
                      const m = TYPE_META[h.type] || TYPE_META.National;
                      return (
                        <div key={h._id} className="flex items-center gap-1.5 group">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
                          <span className="text-[10px] font-bold text-slate-400 w-5 flex-shrink-0">{h.date.split('-')[2]}</span>
                          <span className="text-[10px] text-slate-700 truncate flex-1 font-bold">{h.name}</span>
                          <button
                            onClick={() => setModal({ mode: 'edit', holiday: h })}
                            className="p-0.5 rounded text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 cursor-pointer transition-all flex-shrink-0 border-none bg-transparent"
                          >
                            <Edit2 size={9} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Full List Table ────────────────────────────────────────────── */}
      {holidays.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">
              All {year} Holidays
              <span className="ml-2 text-slate-400 font-bold text-[10px] uppercase">({filtered.length} matching)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/30">
                  {(canEdit ? ['Date', 'Day', 'Name', 'Type', 'Actions'] : ['Date', 'Day', 'Name', 'Type']).map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => {
                  const isToday = h.date === todayStr;
                  return (
                    <tr
                      key={h._id}
                      className={`border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${isToday ? 'bg-sky-50/50' : i % 2 === 0 ? '' : 'bg-slate-50/20'}`}
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono font-bold text-slate-700">{fmtDate(h.date)}</span>
                        {isToday && <span className="ml-2 text-[9px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-black">Today</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-semibold">{dayName(h.date)}</td>
                      <td className="px-5 py-3 font-bold text-slate-800">{h.name}</td>
                      <td className="px-5 py-3"><TypeBadge type={h.type} /></td>
                      {canEdit && (
                        <td className="px-5 py-3">
                          <div className="flex gap-0.5">
                            <button onClick={() => setModal({ mode: 'edit', holiday: h })} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer border-none bg-transparent">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => setDeleteTarget(h)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer border-none bg-transparent">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && holidays.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-5xl mb-4">🗓️</p>
          <p className="text-slate-800 font-bold text-base">No holidays for {year}</p>
          <p className="text-slate-500 text-xs mt-1 mb-6">Add your company's official holidays to get started.</p>
          <button
            onClick={() => setModal({ mode: 'create', holiday: null })}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl cursor-pointer text-xs"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}
          >
            <Plus size={15} /> Add First Holiday
          </button>
        </div>
      )}
    </div>
  );
}
