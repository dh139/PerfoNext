import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, CheckCircle2, Clock, Send, Calendar, BookOpen, MessageSquare, Activity, RefreshCw, Cpu, Check, AlertTriangle } from 'lucide-react';

const IntegrationsWorkspace = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'teams', 'lms', 'logs'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState([]);

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    month: '2026-07',
    totalWorkingDays: 22,
    daysPresent: 20
  });

  // Teams Webhook state
  const [teamsForm, setTeamsForm] = useState({
    webhookUrl: '',
    title: 'EPTS Performance Cycle Reminder',
    message: 'Attention Team! The July 2026 Monthly Performance Review Cycle is closing soon. Please complete all pending assessments.'
  });

  // LMS state
  const [lmsRecords, setLmsRecords] = useState([]);
  const [lmsForm, setLmsForm] = useState({
    employeeId: '',
    courseName: '',
    provider: 'Coursera',
    completionDate: new Date().toISOString().split('T')[0],
    score: 95
  });

  // Integration logs state
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchMetadata();
    fetchAttendance();
    fetchLms();
    if (user?.role === 'hr' || user?.role === 'admin') {
      fetchLogs();
    }
  }, []);

  const fetchMetadata = async () => {
    try {
      const usersRes = await api.get('/api/users');
      setUsers(usersRes.data);
      if (usersRes.data.length > 0) {
        setAttendanceForm(prev => ({ ...prev, employeeId: usersRes.data[0]._id }));
        setLmsForm(prev => ({ ...prev, employeeId: usersRes.data[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/integrations/attendance');
      setAttendanceRecords(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch attendance metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLms = async () => {
    try {
      const res = await api.get('/api/integrations/lms');
      setLmsRecords(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/integrations/logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttendanceSync = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await api.post('/api/integrations/attendance/sync', attendanceForm);
      setSuccess('Attendance metrics synced successfully!');
      fetchAttendance();
      fetchLogs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamsDispatch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const res = await api.post('/api/integrations/teams/webhook', teamsForm);
      setSuccess(res.data.message || 'Adaptive Card dispatched!');
      fetchLogs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Dispatch failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLmsSync = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!lmsForm.courseName || !lmsForm.provider) {
      setError('Course Name and Provider are required.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/integrations/lms/sync', lmsForm);
      setSuccess('LMS course completion record registered!');
      setLmsForm(prev => ({ ...prev, courseName: '' }));
      fetchLms();
      fetchLogs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'LMS log creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const calculatedPct = attendanceForm.totalWorkingDays > 0
    ? +((attendanceForm.daysPresent / attendanceForm.totalWorkingDays) * 100).toFixed(2)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
                Enterprise Sync Hub
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                API Data Orchestrator
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Cpu className="text-sky-400" size={24} />
              <span>Ecosystem Integration Hub</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Automated data pipelines connecting HRMS Attendance, MS Teams Webhook notifications, & LMS Training credentials.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Synced HRMS Logs</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{attendanceRecords.length}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Attendance records</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">MS Teams Status</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">Webhook Ready</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Real-time alerts active</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Send size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">LMS Certifications</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{lmsRecords.length}</h2>
              <span className="text-[9px] text-indigo-400 font-medium">Completed courses</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <BookOpen size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pipeline Health</p>
              <h2 className="text-xl font-extrabold text-amber-400 mt-0.5">100% Operational</h2>
              <span className="text-[9px] text-amber-400 font-medium">Zero errors recorded</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Activity size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => { setActiveTab('attendance'); setError(''); setSuccess(''); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'attendance' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          <span>Attendance HRMS Sync</span>
        </button>

        <button
          onClick={() => { setActiveTab('teams'); setError(''); setSuccess(''); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'teams' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send size={16} />
          <span>MS Teams Connector</span>
        </button>

        <button
          onClick={() => { setActiveTab('lms'); setError(''); setSuccess(''); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'lms' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen size={16} />
          <span>LMS Training Records</span>
        </button>

        {(user?.role === 'hr' || user?.role === 'admin') && (
          <button
            onClick={() => { setActiveTab('logs'); setError(''); setSuccess(''); fetchLogs(); }}
            className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'logs' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity size={16} />
            <span>Sync Audit Logs</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-2 font-bold text-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tab 1: Attendance HRMS Sync */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sync Trigger Form (Admin / HR) */}
          {(user?.role === 'hr' || user?.role === 'admin') && (
            <form onSubmit={handleAttendanceSync} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 h-fit">
              <h3 className="font-bold text-xs text-slate-800 border-b pb-2 uppercase tracking-wide">Sync HRMS Attendance Data</h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Employee</label>
                <select
                  value={attendanceForm.employeeId}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-semibold text-slate-700"
                  required
                >
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Review Month</label>
                <input
                  type="month"
                  value={attendanceForm.month}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, month: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Working Days</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={attendanceForm.totalWorkingDays}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, totalWorkingDays: +e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Days Present</label>
                  <input
                    type="number"
                    min="0"
                    max={attendanceForm.totalWorkingDays}
                    value={attendanceForm.daysPresent}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, daysPresent: +e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex justify-between items-center text-sky-800 font-bold">
                <span>Calculated Attendance %:</span>
                <span className="text-sm">{calculatedPct}%</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-700 hover:bg-sky-850 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-md transition-colors uppercase text-[10px] flex justify-center items-center gap-2"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Simulate HRMS Webhook Pull</span>
              </button>
            </form>
          )}

          {/* Attendance Table */}
          <div className={`${(user?.role === 'hr' || user?.role === 'admin') ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4`}>
            <h3 className="font-bold text-xs text-slate-800 border-b pb-2 uppercase tracking-wide">Monthly Attendance Metrics</h3>

            {attendanceRecords.length === 0 ? (
              <p className="text-slate-400 italic text-center py-8">No attendance sync records available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">Employee</th>
                      <th className="pb-2">Month</th>
                      <th className="pb-2">Present / Total</th>
                      <th className="pb-2">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {attendanceRecords.map(rec => (
                      <tr key={rec._id} className="hover:bg-slate-50/60">
                        <td className="py-3 font-semibold text-slate-700">
                          {rec.employeeId?.firstName} {rec.employeeId?.lastName}
                        </td>
                        <td className="py-3 text-slate-500">{rec.month}</td>
                        <td className="py-3 text-slate-500">{rec.daysPresent} / {rec.totalWorkingDays} days</td>
                        <td className="py-3">
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            rec.attendancePercentage >= 90 ? 'bg-emerald-50 text-emerald-700' :
                            rec.attendancePercentage >= 75 ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {rec.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 2: MS Teams Connector */}
      {activeTab === 'teams' && (
        <form onSubmit={handleTeamsDispatch} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 max-w-2xl mx-auto">
          <div className="border-b pb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Send className="text-indigo-600" size={16} />
              <span>Microsoft Teams Webhook Connector</span>
            </h3>
            <p className="text-slate-400 mt-1">Send automated Adaptive Card notifications to MS Teams channel URLs</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">MS Teams Incoming Webhook URL (Optional)</label>
            <input
              type="url"
              value={teamsForm.webhookUrl}
              onChange={(e) => setTeamsForm({ ...teamsForm, webhookUrl: e.target.value })}
              placeholder="https://outlook.office.com/webhook/..."
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 font-mono text-[11px]"
            />
            <p className="text-[9px] text-slate-400 mt-1">Leave empty to run a simulated Adaptive Card dispatch test.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Card Title</label>
            <input
              type="text"
              value={teamsForm.title}
              onChange={(e) => setTeamsForm({ ...teamsForm, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Notification Message Content</label>
            <textarea
              value={teamsForm.message}
              onChange={(e) => setTeamsForm({ ...teamsForm, message: e.target.value })}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl cursor-pointer shadow-md transition-colors uppercase text-[10px]"
          >
            Dispatch Adaptive Card Webhook
          </button>
        </form>
      )}

      {/* Tab 3: LMS Training Records */}
      {activeTab === 'lms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sync Form */}
          {(user?.role === 'hr' || user?.role === 'admin') && (
            <form onSubmit={handleLmsSync} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 h-fit">
              <h3 className="font-bold text-xs text-slate-800 border-b pb-2 uppercase tracking-wide">Register LMS Course Completion</h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Employee</label>
                <select
                  value={lmsForm.employeeId}
                  onChange={(e) => setLmsForm({ ...lmsForm, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-semibold text-slate-700"
                  required
                >
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Course Title</label>
                <input
                  type="text"
                  value={lmsForm.courseName}
                  onChange={(e) => setLmsForm({ ...lmsForm, courseName: e.target.value })}
                  placeholder="e.g. Microservices Architecture with Node"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">LMS Provider</label>
                <select
                  value={lmsForm.provider}
                  onChange={(e) => setLmsForm({ ...lmsForm, provider: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-semibold text-slate-700"
                  required
                >
                  <option value="Coursera">Coursera Enterprise</option>
                  <option value="Udemy">Udemy Business</option>
                  <option value="Pluralsight">Pluralsight</option>
                  <option value="Internal LMS">Company Internal LMS</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Completion Date</label>
                  <input
                    type="date"
                    value={lmsForm.completionDate}
                    onChange={(e) => setLmsForm({ ...lmsForm, completionDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Test Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={lmsForm.score}
                    onChange={(e) => setLmsForm({ ...lmsForm, score: +e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-700 hover:bg-sky-850 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer uppercase text-[10px]"
              >
                Log LMS Completion
              </button>
            </form>
          )}

          {/* LMS Table */}
          <div className={`${(user?.role === 'hr' || user?.role === 'admin') ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4`}>
            <h3 className="font-bold text-xs text-slate-800 border-b pb-2 uppercase tracking-wide">Completed Training Catalog</h3>

            {lmsRecords.length === 0 ? (
              <p className="text-slate-400 italic text-center py-8">No completed LMS courses recorded.</p>
            ) : (
              <div className="space-y-3">
                {lmsRecords.map(rec => (
                  <div key={rec._id} className="bg-slate-50/60 border border-slate-100 p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800">{rec.courseName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Provider: <span className="font-semibold text-slate-655">{rec.provider}</span> | Staff: <span className="font-semibold text-slate-655">{rec.employeeId?.firstName} {rec.employeeId?.lastName}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-lg block">
                        Score: {rec.score}%
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        Completed: {new Date(rec.completionDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 4: Integration Activity Logs */}
      {activeTab === 'logs' && (user?.role === 'hr' || user?.role === 'admin') && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs text-slate-800 border-b pb-2 uppercase tracking-wide">System Integration Audit Logs</h3>

          {logs.length === 0 ? (
            <p className="text-slate-400 italic text-center py-8">No integration events logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">System</th>
                    <th className="pb-2">Event Type</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Response Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map(log => (
                    <tr key={log._id} className="hover:bg-slate-50/60">
                      <td className="py-3 text-slate-400 font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 font-bold text-indigo-700 uppercase text-[10px]">{log.system}</td>
                      <td className="py-3 font-semibold text-slate-700">{log.eventType}</td>
                      <td className="py-3">
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded uppercase ${
                          log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-655 truncate max-w-xs">{log.responseMessage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default IntegrationsWorkspace;
