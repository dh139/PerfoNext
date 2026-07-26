import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { 
  AlertCircle, CheckCircle2, Clock, Send, Calendar, BookOpen, MessageSquare, Activity, 
  RefreshCw, Cpu, Check, AlertTriangle, Search, Users, Filter, ChevronLeft, ChevronRight, 
  Building2, Layers 
} from 'lucide-react';

const IntegrationsWorkspace = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'teams', 'lms', 'logs'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [syncMode, setSyncMode] = useState('single'); // 'single' | 'batch'
  const [formDeptFilter, setFormDeptFilter] = useState('all');
  const [formUserSearch, setFormUserSearch] = useState('');
  // Combobox state for enterprise employee pickers
  const [empComboboxOpen, setEmpComboboxOpen] = useState(false);
  const [lmsComboboxOpen, setLmsComboboxOpen] = useState(false);
  const [lmsUserSearch, setLmsUserSearch] = useState('');
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    month: '2026-07',
    totalWorkingDays: 22,
    daysPresent: 20
  });

  // Batch sync state
  const [batchDeptId, setBatchDeptId] = useState('all');
  const [batchMonth, setBatchMonth] = useState('2026-07');
  const [batchWorkingDays, setBatchWorkingDays] = useState(22);
  const [batchDaysPresent, setBatchDaysPresent] = useState(20);

  // Table filtering & pagination state
  const [tableSearch, setTableSearch] = useState('');
  const [tableMonthFilter, setTableMonthFilter] = useState('all');
  const [tableDeptFilter, setTableDeptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

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
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/departments')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
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

  const handleBatchAttendanceSync = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const res = await api.post('/api/integrations/attendance/batch-sync', {
        departmentId: batchDeptId,
        month: batchMonth,
        totalWorkingDays: batchWorkingDays,
        daysPresent: batchDaysPresent
      });
      setSuccess(res.data.message || 'Batch attendance metrics synced successfully!');
      fetchAttendance();
      if (user?.role === 'hr' || user?.role === 'admin') {
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Batch sync failed.');
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
      {activeTab === 'attendance' && (() => {
        // Calculate filtered employee list for single employee form
        const filteredFormUsers = users.filter(u => {
          const deptId = u.departmentId?._id || u.departmentId;
          const matchesDept = formDeptFilter === 'all' || (deptId && deptId.toString() === formDeptFilter.toString());
          const fullName = `${u.firstName} ${u.lastName} ${u.employeeCode || ''}`.toLowerCase();
          const matchesSearch = fullName.includes(formUserSearch.toLowerCase());
          return matchesDept && matchesSearch;
        });

        // Filter attendance table records
        const filteredAttendanceRecords = attendanceRecords.filter(rec => {
          const emp = rec.employeeId || {};
          const empName = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.employeeCode || ''}`.toLowerCase();
          const deptName = (emp.departmentId?.departmentName || '').toLowerCase();
          const desigName = (emp.designationId?.designationName || '').toLowerCase();
          
          const matchesSearch = empName.includes(tableSearch.toLowerCase()) ||
                                deptName.includes(tableSearch.toLowerCase()) ||
                                desigName.includes(tableSearch.toLowerCase());

          const matchesMonth = tableMonthFilter === 'all' || rec.month === tableMonthFilter;

          const deptId = emp.departmentId?._id || emp.departmentId;
          const matchesDept = tableDeptFilter === 'all' || (deptId && deptId.toString() === tableDeptFilter.toString());

          return matchesSearch && matchesMonth && matchesDept;
        });

        const uniqueMonths = Array.from(new Set(attendanceRecords.map(r => r.month))).sort().reverse();

        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(filteredAttendanceRecords.length / ITEMS_PER_PAGE) || 1;
        const safeCurrentPage = Math.min(currentPage, totalPages);
        const paginatedRecords = filteredAttendanceRecords.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sync Trigger Console (Admin / HR) */}
            {(user?.role === 'hr' || user?.role === 'admin') && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 h-fit">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Sync HRMS Attendance</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Push or simulate HRMS webhook payloads</p>
                  </div>
                  
                  {/* Mode Switcher */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSyncMode('single')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        syncMode === 'single' ? 'bg-white text-sky-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Single Employee
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncMode('batch')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        syncMode === 'batch' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Bulk Department
                    </button>
                  </div>
                </div>

                {/* SINGLE EMPLOYEE SYNC FORM */}
                {syncMode === 'single' && (
                  <form onSubmit={handleAttendanceSync} className="space-y-3.5">
                    {/* Department Filter for Employee List */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Building2 size={11} className="text-slate-400" />
                          <span>Filter Department</span>
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">
                          {filteredFormUsers.length} Eligible
                        </span>
                      </div>
                      <select
                        value={formDeptFilter}
                        onChange={(e) => setFormDeptFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs cursor-pointer"
                      >
                        <option value="all">All Departments ({users.length} Total Users)</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.departmentName}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search & Select Employee (Enterprise Combobox) */}
                    <div className="space-y-1 relative">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Users size={11} className="text-slate-400" />
                          <span>Select Employee</span>
                        </label>
                        <span className="text-[9px] text-sky-600 font-extrabold">
                          {filteredFormUsers.length} Available
                        </span>
                      </div>

                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setEmpComboboxOpen(!empComboboxOpen)}
                        className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-2xl text-xs font-semibold text-slate-800 text-left transition-all cursor-pointer shadow-xs"
                      >
                        {(() => {
                          const selected = users.find(u => u._id === attendanceForm.employeeId);
                          if (!selected) {
                            return <span className="text-slate-400 italic">Click to search & select employee...</span>;
                          }
                          const deptName = selected.departmentId?.departmentName || 'No Dept';
                          return (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-sky-700 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {selected.firstName?.[0]}{selected.lastName?.[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-extrabold text-slate-900 block truncate">
                                  {selected.firstName} {selected.lastName}
                                </span>
                                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                  <span className="font-mono text-slate-500 font-bold">{selected.employeeCode || 'EMP'}</span>
                                  <span>•</span>
                                  <span className="truncate">{deptName}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <span className="text-slate-400 text-[10px] ml-2 shrink-0">▼</span>
                      </button>

                      {/* Floating Combobox Popover */}
                      {empComboboxOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setEmpComboboxOpen(false)}
                          />
                          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 p-3 space-y-2.5 animate-fade-in text-slate-800">
                            {/* Live Search Input */}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                              <Search size={14} className="text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={formUserSearch}
                                onChange={(e) => setFormUserSearch(e.target.value)}
                                placeholder="Search name, code (EMP004), department..."
                                className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                                autoFocus
                              />
                            </div>

                            {/* Department Quick Filter Pills */}
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                              <button
                                type="button"
                                onClick={() => setFormDeptFilter('all')}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                                  formDeptFilter === 'all'
                                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                All ({users.length})
                              </button>
                              {departments.map(d => (
                                <button
                                  key={d._id}
                                  type="button"
                                  onClick={() => setFormDeptFilter(d._id)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                                    formDeptFilter.toString() === d._id.toString()
                                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {d.departmentName}
                                </button>
                              ))}
                            </div>

                            {/* Searchable Options List */}
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {filteredFormUsers.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs italic">
                                  No employees match your search query.
                                </div>
                              ) : (
                                filteredFormUsers.map(u => {
                                  const isSelected = attendanceForm.employeeId === u._id;
                                  const deptName = u.departmentId?.departmentName || 'No Dept';

                                  return (
                                    <button
                                      key={u._id}
                                      type="button"
                                      onClick={() => {
                                        setAttendanceForm(prev => ({ ...prev, employeeId: u._id }));
                                        setEmpComboboxOpen(false);
                                      }}
                                      className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                                        isSelected
                                          ? 'bg-sky-50 text-sky-950 font-bold border-sky-300 shadow-xs'
                                          : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                                          isSelected ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                          {u.firstName?.[0]}{u.lastName?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-slate-900 text-xs truncate">
                                            {u.firstName} {u.lastName}
                                          </p>
                                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                            <span className="font-mono text-slate-500 font-bold">{u.employeeCode || 'EMP'}</span>
                                            <span>•</span>
                                            <span className="truncate">{deptName}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                        u.role === 'manager' || u.role === 'hr'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}>
                                        {u.role}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Review Month</label>
                      <input
                        type="month"
                        value={attendanceForm.month}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, month: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-bold text-slate-700 text-xs"
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
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none text-xs"
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
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex justify-between items-center text-sky-800 font-bold text-xs">
                      <span>Calculated Attendance %:</span>
                      <span className="text-sm">{calculatedPct}%</span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !attendanceForm.employeeId}
                      className="w-full bg-sky-700 hover:bg-sky-800 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-xs transition-colors uppercase text-[10px] flex justify-center items-center gap-2"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      <span>Simulate HRMS Webhook Pull</span>
                    </button>
                  </form>
                )}

                {/* BULK DEPARTMENT SYNC FORM */}
                {syncMode === 'batch' && (
                  <form onSubmit={handleBatchAttendanceSync} className="space-y-3.5">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
                      <p className="font-bold">⚡ Bulk Webhook Sync Mode</p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Sync attendance records for an entire department or company in 1-click.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Target Department</label>
                      <select
                        value={batchDeptId}
                        onChange={(e) => setBatchDeptId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs cursor-pointer"
                      >
                        <option value="all">All Departments ({users.length} Active Employees)</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.departmentName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Review Month</label>
                      <input
                        type="month"
                        value={batchMonth}
                        onChange={(e) => setBatchMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-bold text-slate-700 text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Total Working Days</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={batchWorkingDays}
                          onChange={(e) => setBatchWorkingDays(+e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Days Present</label>
                        <input
                          type="number"
                          min="0"
                          max={batchWorkingDays}
                          value={batchDaysPresent}
                          onChange={(e) => setBatchDaysPresent(+e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none text-xs"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-xs transition-colors uppercase text-[10px] flex justify-center items-center gap-2"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      <span>Execute Batch HRMS Webhook Sync</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Attendance Registry & Audit Table (With Filters & Pagination) */}
            <div className={`${(user?.role === 'hr' || user?.role === 'admin') ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4`}>
              
              {/* Header & Controls Bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Clock size={16} className="text-sky-600" />
                    <span>Enterprise Attendance Registry</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Searchable attendance records ({filteredAttendanceRecords.length} records found)
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Search Bar */}
                  <div className="relative w-full md:w-44">
                    <input
                      type="text"
                      placeholder="Search registry..."
                      value={tableSearch}
                      onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 pl-7 pr-2.5 py-1.5 rounded-xl outline-none text-xs text-slate-800 focus:border-sky-500"
                    />
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Month Filter */}
                  <select
                    value={tableMonthFilter}
                    onChange={(e) => { setTableMonthFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {uniqueMonths.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {/* Department Filter */}
                  <select
                    value={tableDeptFilter}
                    onChange={(e) => { setTableDeptFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Depts</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.departmentName}</option>
                    ))}
                  </select>

                  {/* Reset Filters */}
                  {(tableSearch || tableMonthFilter !== 'all' || tableDeptFilter !== 'all') && (
                    <button
                      onClick={() => { setTableSearch(''); setTableMonthFilter('all'); setTableDeptFilter('all'); setCurrentPage(1); }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                      title="Clear Filters"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>
              </div>

              {filteredAttendanceRecords.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Clock size={32} className="mx-auto text-slate-300" />
                  <p className="text-slate-400 italic">No attendance records matching your filter criteria.</p>
                  {(tableSearch || tableMonthFilter !== 'all' || tableDeptFilter !== 'all') && (
                    <button
                      onClick={() => { setTableSearch(''); setTableMonthFilter('all'); setTableDeptFilter('all'); setCurrentPage(1); }}
                      className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                    >
                      Clear search & filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                          <th className="pb-2.5 pl-1">Employee</th>
                          <th className="pb-2.5">Department & Designation</th>
                          <th className="pb-2.5">Month</th>
                          <th className="pb-2.5">Present / Total</th>
                          <th className="pb-2.5 pr-1">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedRecords.map(rec => {
                          const emp = rec.employeeId || {};
                          const deptName = emp.departmentId?.departmentName || 'General';
                          const desigName = emp.designationId?.designationName || '-';

                          return (
                            <tr key={rec._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 pl-1">
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {emp.firstName} {emp.lastName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {emp.employeeCode || 'EMP-N/A'}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3">
                                <p className="font-semibold text-slate-700">{deptName}</p>
                                <p className="text-[10px] text-slate-400">{desigName}</p>
                              </td>
                              <td className="py-3 text-slate-600 font-medium">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">
                                  {rec.month}
                                </span>
                              </td>
                              <td className="py-3 text-slate-600 font-medium">
                                {rec.daysPresent} / {rec.totalWorkingDays} days
                              </td>
                              <td className="py-3 pr-1">
                                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                                  rec.attendancePercentage >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  rec.attendancePercentage >= 75 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {rec.attendancePercentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                    <p className="text-slate-500 font-medium text-[11px]">
                      Showing <span className="font-bold text-slate-800">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                      <span className="font-bold text-slate-800">{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredAttendanceRecords.length)}</span> of{' '}
                      <span className="font-bold text-slate-800">{filteredAttendanceRecords.length}</span> records
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={safeCurrentPage === 1}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={13} />
                        <span>Prev</span>
                      </button>

                      <span className="px-3 py-1 bg-sky-50 text-sky-800 font-black rounded-lg text-[11px] border border-sky-100">
                        {safeCurrentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={safeCurrentPage >= totalPages}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        );
      })()}

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

              {/* Searchable Enterprise Employee Combobox */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>Select Employee</span>
                  <span className="text-[9px] text-sky-600 font-extrabold">{users.length} Total</span>
                </label>

                <button
                  type="button"
                  onClick={() => setLmsComboboxOpen(!lmsComboboxOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-2xl text-xs font-semibold text-slate-800 text-left transition-all cursor-pointer shadow-xs"
                >
                  {(() => {
                    const selected = users.find(u => u._id === lmsForm.employeeId);
                    if (!selected) {
                      return <span className="text-slate-400 italic">Click to select employee...</span>;
                    }
                    const deptName = selected.departmentId?.departmentName || 'No Dept';
                    return (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-700 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                          {selected.firstName?.[0]}{selected.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-slate-900 block truncate">
                            {selected.firstName} {selected.lastName}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate">{selected.employeeCode} • {deptName}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <span className="text-slate-400 text-[10px] ml-2 shrink-0">▼</span>
                </button>

                {lmsComboboxOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setLmsComboboxOpen(false)} />
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 p-3 space-y-2 animate-fade-in text-slate-800">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={lmsUserSearch}
                          onChange={(e) => setLmsUserSearch(e.target.value)}
                          placeholder="Search employee by name, code..."
                          className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {users
                          .filter(u => `${u.firstName} ${u.lastName} ${u.employeeCode} ${u.role}`.toLowerCase().includes(lmsUserSearch.toLowerCase()))
                          .map(u => (
                            <button
                              key={u._id}
                              type="button"
                              onClick={() => {
                                setLmsForm(prev => ({ ...prev, employeeId: u._id }));
                                setLmsComboboxOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                                lmsForm.employeeId === u._id ? 'bg-indigo-50 text-indigo-950 font-bold border-indigo-300' : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                              }`}
                            >
                              <div>
                                <p className="font-extrabold text-slate-900">{u.firstName} {u.lastName}</p>
                                <span className="text-[9px] text-slate-400">{u.employeeCode} • {u.departmentId?.departmentName || 'No Dept'}</span>
                              </div>
                              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{u.role}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
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
