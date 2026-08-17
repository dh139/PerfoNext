import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { getUserAvatarUrl } from '../utils/avatar';
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
  const [attendanceModalUser, setAttendanceModalUser] = useState(null);
  const [modalTab, setModalTab] = useState('monthly'); // 'monthly' | 'daily'
  const [modalDailyPunches, setModalDailyPunches] = useState([]);
  const [loadingDailyPunches, setLoadingDailyPunches] = useState(false);

  useEffect(() => {
    if (!attendanceModalUser) {
      setModalDailyPunches([]);
      setModalTab('monthly');
      return;
    }
    const fetchDailyPunches = async () => {
      try {
        setLoadingDailyPunches(true);
        const res = await api.get(`/api/attendance/history?employeeId=${attendanceModalUser._id}`);
        setModalDailyPunches(res.data);
      } catch (err) {
        console.error('Failed to fetch modal daily punches:', err);
      } finally {
        setLoadingDailyPunches(false);
      }
    };
    fetchDailyPunches();
  }, [attendanceModalUser]);

  // Teams Webhook state
  const [teamsForm, setTeamsForm] = useState({
    webhookUrl: '',
    title: 'PerfoNext Performance Cycle Reminder',
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
      let allUsers = (usersRes.data || []).filter(u => u.role !== 'executive');
      setDepartments(deptsRes.data || []);

      // Scope users list based on role:
      // 1. Employee: Only see self
      // 2. Reporting Manager: Only see employees in assigned department
      if (user?.role === 'employee') {
        allUsers = allUsers.filter(u => u._id === user?.id);
      } else if (user?.role === 'manager') {
        const mgrDeptId = user?.departmentId?._id || user?.departmentId;
        allUsers = allUsers.filter(u => {
          const uDeptId = u.departmentId?._id || u.departmentId;
          return uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
        });
      }

      setUsers(allUsers);
      if (allUsers.length > 0) {
        setAttendanceForm(prev => ({ ...prev, employeeId: allUsers[0]._id }));
        setLmsForm(prev => ({ ...prev, employeeId: allUsers[0]._id }));
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
         
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Cpu className="text-sky-400" size={24} />
              <span>Ecosystem Integration Hub</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Automated data pipelines connecting HRMS Attendance.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/80 max-w-2xl">
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

        // Filter users for the attendance registry table
        const filteredAttendanceRecords = users.filter(u => {
          const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.employeeCode || ''}`.toLowerCase();
          const deptName = (u.departmentId?.departmentName || '').toLowerCase();
          const desigName = (u.designationId?.designationName || '').toLowerCase();
          
          const matchesSearch = fullName.includes(tableSearch.toLowerCase()) ||
                                deptName.includes(tableSearch.toLowerCase()) ||
                                desigName.includes(tableSearch.toLowerCase());

          const deptId = u.departmentId?._id || u.departmentId;
          const matchesDept = tableDeptFilter === 'all' || (deptId && deptId.toString() === tableDeptFilter.toString());

          // If a specific month is selected, verify user has a record for that month
          if (tableMonthFilter !== 'all') {
            const hasRecordForMonth = attendanceRecords.some(rec => {
              const recEmpId = rec.employeeId?._id || rec.employeeId;
              return recEmpId && recEmpId.toString() === u._id.toString() && rec.month === tableMonthFilter;
            });
            if (!hasRecordForMonth) return false;
          }

          return matchesSearch && matchesDept;
        }).map(u => {
          // Find all attendance records for this user
          const records = attendanceRecords.filter(rec => {
            const recEmpId = rec.employeeId?._id || rec.employeeId;
            return recEmpId && recEmpId.toString() === u._id.toString();
          });

          // Sort records descending by month
          records.sort((a, b) => b.month.localeCompare(a.month));

          if (tableMonthFilter !== 'all') {
            const specificRecord = records.find(r => r.month === tableMonthFilter);
            return {
              ...u,
              records,
              specificRecord,
              displayPercent: specificRecord ? specificRecord.attendancePercentage : 0
            };
          }

          const avgAttendance = records.length > 0 
            ? Math.round((records.reduce((sum, r) => sum + r.attendancePercentage, 0) / records.length) * 100) / 100
            : null;

          return {
            ...u,
            records,
            avgAttendance,
            displayPercent: avgAttendance
          };
        });

        const uniqueMonths = Array.from(new Set(attendanceRecords.map(r => r.month))).sort().reverse();

        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(filteredAttendanceRecords.length / ITEMS_PER_PAGE) || 1;
        const safeCurrentPage = Math.min(currentPage, totalPages);
        const paginatedRecords = filteredAttendanceRecords.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

        return (
          <div className="space-y-6">
            
            {/* Attendance Registry & Audit Table (With Filters & Pagination) */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              
              {/* Header & Controls Bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Clock size={16} className="text-sky-600" />
                    <span>Enterprise Attendance Registry</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Searchable attendance registry ({filteredAttendanceRecords.length} employees found)
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

                  {/* Department Filter (HR / Admin only) */}
                  {(user?.role === 'hr' || user?.role === 'admin') && (
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
                  )}

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
                  <p className="text-slate-400 italic">No employees matching your filter criteria.</p>
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
                          <th className="pb-2.5">Attendance %</th>
                          <th className="pb-2.5 pr-1 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedRecords.map(emp => {
                          const deptName = emp.departmentId?.departmentName || 'General';
                          const desigName = emp.designationId?.designationName || '-';

                          const totalWorking = emp.records?.reduce((sum, r) => sum + r.totalWorkingDays, 0) || 0;
                          const totalPresent = emp.records?.reduce((sum, r) => sum + r.daysPresent, 0) || 0;

                          return (
                            <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 pl-1">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={getUserAvatarUrl(emp)}
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                  />
                                  <div>
                                    <p className="font-bold text-slate-800">
                                      {emp.firstName} {emp.lastName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      {emp.employeeCode || 'EMP-N/A'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <p className="font-semibold text-slate-700">{deptName}</p>
                                <p className="text-[10px] text-slate-400">{desigName}</p>
                              </td>
                              <td className="py-3 text-slate-600 font-medium">
                                {tableMonthFilter === 'all' ? (
                                  <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[11px] border border-sky-200">
                                    {emp.records?.length || 0} months logged
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">
                                    {tableMonthFilter}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-slate-600 font-medium">
                                {tableMonthFilter === 'all' ? (
                                  <span>{totalPresent} / {totalWorking} days</span>
                                ) : (
                                  <span>{emp.specificRecord?.daysPresent || 0} / {emp.specificRecord?.totalWorkingDays || 0} days</span>
                                )}
                              </td>
                              <td className="py-3">
                                {emp.displayPercent !== null ? (
                                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                                    emp.displayPercent >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    emp.displayPercent >= 75 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {emp.displayPercent}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">No records</span>
                                )}
                              </td>
                              <td className="py-3 pr-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => setAttendanceModalUser(emp)}
                                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-lg border border-sky-200 transition-colors text-[10px] cursor-pointer"
                                >
                                  View Attendance
                                </button>
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



      {attendanceModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 border border-slate-100 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Attendance History
                </h3>
                <p className="text-[11px] text-sky-600 font-bold mt-0.5">
                  {attendanceModalUser.firstName} {attendanceModalUser.lastName} [{attendanceModalUser.employeeCode}]
                </p>
              </div>
              <button 
                onClick={() => setAttendanceModalUser(null)} 
                className="text-slate-400 hover:text-slate-655 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-extrabold">Department</span>
                  <span className="font-bold text-slate-700">
                    {attendanceModalUser.departmentId?.departmentName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-extrabold">Designation</span>
                  <span className="font-bold text-slate-700">
                    {attendanceModalUser.designationId?.designationName || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Tab Selector inside Modal */}
              <div className="flex border-b border-slate-100 mb-2">
                <button
                  type="button"
                  onClick={() => setModalTab('monthly')}
                  className={`flex-1 pb-2 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
                    modalTab === 'monthly' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Month-wise Summary
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('daily')}
                  className={`flex-1 pb-2 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
                    modalTab === 'daily' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Date-wise Punch Logs
                </button>
              </div>

              {modalTab === 'monthly' && (
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                        <th className="p-3">Month</th>
                        <th className="p-3">Present / Working Days</th>
                        <th className="p-3 text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceModalUser.records && attendanceModalUser.records.length > 0 ? (
                        attendanceModalUser.records.map(rec => (
                          <tr key={rec._id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-700">{rec.month}</td>
                            <td className="p-3 text-slate-600 font-medium">
                              {rec.daysPresent} / {rec.totalWorkingDays} days
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                                rec.attendancePercentage >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                rec.attendancePercentage >= 75 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {rec.attendancePercentage}%
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-slate-400 italic">
                            No attendance records found for this employee.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {modalTab === 'daily' && (
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl">
                  {loadingDailyPunches ? (
                    <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div></div>
                  ) : modalDailyPunches.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                          <th className="p-3">Date</th>
                          <th className="p-3">Punch In</th>
                          <th className="p-3">Punch Out</th>
                          <th className="p-3">Working Hrs</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {modalDailyPunches.map(p => {
                          const statusColor = (s) => {
                            if (s === 'Present') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
                            if (s === 'Half Day') return 'text-amber-600 bg-amber-50 border-amber-200';
                            if (s === 'Incomplete') return 'text-rose-500 bg-rose-50 border-rose-200';
                            if (s === 'Weekly Off') return 'text-slate-500 bg-slate-50 border-slate-200';
                            return 'text-rose-600 bg-rose-50 border-rose-200';
                          };
                          const formatTimeStr = (t) => {
                            if (!t) return '--';
                            const dt = new Date(t);
                            const h = dt.getHours();
                            const m = dt.getMinutes();
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
                          };
                          return (
                            <tr key={p._id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-700">
                                {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="p-3 font-semibold text-slate-700">{formatTimeStr(p.punchIn)}</td>
                              <td className="p-3 font-semibold text-slate-700">{formatTimeStr(p.punchOut)}</td>
                              <td className="p-3 text-slate-500 font-medium">
                                {p.workingMinutes > 0 ? `${Math.floor(p.workingMinutes/60)}h ${p.workingMinutes%60}m` : p.punchIn ? '0h 0m' : '--'}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColor(p.status)}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-400 italic">
                      No punch records found for this employee.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAttendanceModalUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default IntegrationsWorkspace;
