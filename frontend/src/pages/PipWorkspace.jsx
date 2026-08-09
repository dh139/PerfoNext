import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { 
  AlertCircle, Plus, CheckCircle, Clock, XCircle, FileText, Send, User, ShieldAlert, CheckCircle2,
  Search, Building2, Filter, RefreshCw, Briefcase, UserCheck, Calendar, Trash2
} from 'lucide-react';
import { toast } from '../store/toastStore';
import { getUserAvatarUrl } from '../utils/avatar';

const PipWorkspace = () => {
  const { user } = useAuthStore();
  const [pips, setPips] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State for PIP List
  const [pipSearch, setPipSearch] = useState('');
  const [pipDeptFilter, setPipDeptFilter] = useState('all');
  const [pipStatusFilter, setPipStatusFilter] = useState('all');

  // Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSug, setSelectedSug] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [goals, setGoals] = useState([{ description: '', targetDate: '', status: 'pending' }]);
  const [hrList, setHrList] = useState([]);
  const [selectedHrId, setSelectedHrId] = useState('');

  // Evaluation & Outcome Modal State
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [evaluatePipId, setEvaluatePipId] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState('successful'); // 'successful', 'extended', 'unsuccessful'
  const [extensionDate, setExtensionDate] = useState('');
  const [evaluationComments, setEvaluationComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Enterprise Combobox State for Employee Selection
  const [empComboboxOpen, setEmpComboboxOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('all');

  // Pagination State
  const [sugPage, setSugPage] = useState(1);
  const [pipPage, setPipPage] = useState(1);

  // Reset page numbers when search / filter parameters change
  useEffect(() => {
    setPipPage(1);
  }, [pipSearch, pipDeptFilter, pipStatusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pipRes, deptsRes] = await Promise.all([
        api.get('/api/pips'),
        api.get('/api/departments')
      ]);
      setPips(pipRes.data);
      setDepartments(deptsRes.data);

      if (user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'executive') {
        const sugRes = await api.get('/api/pips/suggestions');
        setSuggestions(sugRes.data);

        const usersRes = await api.get('/api/users');
        let candidates = usersRes.data;

        if (user?.role === 'executive' || user?.role === 'admin' || user?.role === 'hr') {
          // Executive (CEO), Admin, and HR can assign PIP to Employees, Managers, and HR Managers
          candidates = candidates.filter(u => u.role === 'employee' || u.role === 'manager' || u.role === 'hr');
        } else if (user?.role === 'manager') {
          const mgrDeptId = user?.departmentId?._id || user?.departmentId;
          candidates = candidates.filter(u => {
            const uDeptId = u.departmentId?._id || u.departmentId;
            return u.role === 'employee' && uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
          });
        }

        setAllUsers(candidates);
        if (candidates.length > 0) setSelectedEmployeeId(candidates[0]._id);

        const hrUsers = usersRes.data.filter(u => u.role === 'hr' || u.role === 'admin' || u.role === 'executive' || u.role === 'manager');
        setHrList(hrUsers);
        if (hrUsers.length > 0) setSelectedHrId(hrUsers[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch PIP workspace details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddGoal = () => {
    setGoals([...goals, { description: '', targetDate: '', status: 'pending' }]);
  };

  const handleRemoveGoal = (index) => {
    if (goals.length === 1) return;
    setGoals(goals.filter((_, idx) => idx !== index));
  };

  const handleGoalChange = (index, field, value) => {
    setGoals(goals.map((g, idx) => idx === index ? { ...g, [field]: value } : g));
  };

  const handleInitiatePip = (sug = null) => {
    setSelectedSug(sug);
    const targetEmpId = sug ? sug.employee._id : (allUsers.length > 0 ? allUsers[0]._id : '');
    if (sug) {
      setSelectedEmployeeId(sug.employee._id);
    } else if (allUsers.length > 0) {
      setSelectedEmployeeId(allUsers[0]._id);
    }

    const availableOverseers = hrList.filter(hr => hr._id.toString() !== targetEmpId?.toString());
    if (availableOverseers.length > 0) {
      setSelectedHrId(availableOverseers[0]._id);
    }

    setStartDate('');
    setEndDate('');
    setReasonText('');
    setGoals([{ description: '', targetDate: '', status: 'pending' }]);
    setShowCreateModal(true);
  };

  const handleCreatePip = async (e) => {
    e.preventDefault();
    setError('');

    const targetEmpId = selectedSug ? selectedSug.employee._id : selectedEmployeeId;

    if (!startDate || !endDate || !selectedHrId || !targetEmpId || !reasonText.trim()) {
      setError('Please fill out dates, reason, and select an employee and reviewer.');
      return;
    }

    const invalidGoal = goals.find(g => !g.description.trim() || !g.targetDate);
    if (invalidGoal) {
      setError('Please fill out details and target dates for all goals.');
      return;
    }

    // Find manager for target employee
    const empUser = allUsers.find(u => u._id === targetEmpId) || selectedSug?.employee;
    const mgrId = empUser?.managerId?._id || empUser?.managerId || reqUserMgrFallback();

    try {
      setActionLoading(true);
      await api.post('/api/pips', {
        employeeId: targetEmpId,
        triggerReviewScoreId: selectedSug?.triggerScores?.[0]?._id || null,
        startDate,
        endDate,
        goals,
        managerId: mgrId || user?.id,
        hrReviewerId: selectedHrId,
        reason: reasonText
      });

      setShowCreateModal(false);
      fetchData();
      toast.success('Performance Improvement Plan initiated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initiate PIP.');
    } finally {
      setActionLoading(false);
    }
  };

  const reqUserMgrFallback = () => user?.id;

  const handleUpdateGoalStatus = async (pipId, goalIndex, nextStatus) => {
    const pip = pips.find(p => p._id === pipId);
    if (!pip) return;

    const updatedGoals = pip.goals.map((g, idx) => 
      idx === goalIndex ? { ...g, status: nextStatus } : g
    );

    try {
      await api.patch(`/api/pips/${pipId}`, { goals: updatedGoals });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update goal status.');
    }
  };

  const handleEvaluatePip = (pipId) => {
    const pip = pips.find(p => p._id === pipId);
    setEvaluatePipId(pipId);
    setSelectedOutcome('successful');
    setExtensionDate(pip ? new Date(pip.endDate).toISOString().split('T')[0] : '');
    setEvaluationComments('');
    setShowEvaluateModal(true);
  };

  const submitEvaluation = async (e) => {
    if (e) e.preventDefault();
    if (!evaluationComments.trim()) {
      toast.error('Please provide evaluation comments.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        status: selectedOutcome === 'extended' ? 'active' : selectedOutcome,
        closureNotes: evaluationComments
      };

      if (selectedOutcome === 'extended') {
        if (!extensionDate) {
          toast.error('Please select an extension date.');
          return;
        }
        payload.endDate = extensionDate;
      }

      await api.patch(`/api/pips/${evaluatePipId}`, payload);
      setShowEvaluateModal(false);
      fetchData();
      toast.success(
        selectedOutcome === 'extended' 
          ? 'PIP extended successfully.' 
          : `PIP closed as ${selectedOutcome.toUpperCase()} successfully.`
      );
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update PIP outcome.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'successful': return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'unsuccessful': return 'bg-rose-50 text-rose-700 border border-rose-250';
      case 'closed': return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'escalated': return 'bg-rose-50 text-rose-700 border border-rose-250';
      default: return 'bg-amber-50 text-amber-700 border border-amber-250';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeCount = pips.filter(p => p.status === 'active').length;
  const closedCount = pips.filter(p => p.status === 'closed').length;
  const escalatedCount = pips.filter(p => p.status === 'escalated').length;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
             
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="text-amber-400" size={24} />
              <span>Performance Improvement Plans (PIP) Workspace</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Track structured action goals, target windows, milestone progress, auto-flagged suggestions, & PIP closures.
            </p>
          </div>

          {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'executive') && (
            <button
              onClick={() => handleInitiatePip(null)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Plus size={18} />
              <span>Initiate New PIP</span>
            </button>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Auto-Flagged Candidates</p>
              <h2 className="text-xl font-extrabold text-amber-400 mt-0.5">{suggestions.length}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Needs improvement</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <ShieldAlert size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active PIP Plans</p>
              <h2 className="text-xl font-extrabold text-sky-400 mt-0.5">{activeCount}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Under active coaching</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Successful Closures</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">{closedCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Goals met & resolved</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Escalated Plans</p>
              <h2 className="text-xl font-extrabold text-rose-400 mt-0.5">{escalatedCount}</h2>
              <span className="text-[9px] text-rose-400 font-medium">Formal HR review</span>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
              <XCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Auto Suggestions Panel (HR/Admin/Manager/Executive) */}
      {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'executive') && suggestions.length > 0 && (() => {
        const SUGS_PER_PAGE = 2;
        const totalSugPages = Math.ceil(suggestions.length / SUGS_PER_PAGE);
        const safeSugPage = Math.min(sugPage, Math.max(totalSugPages, 1));
        const paginatedSuggestions = suggestions.slice((safeSugPage - 1) * SUGS_PER_PAGE, safeSugPage * SUGS_PER_PAGE);

        return (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-amber-700 shrink-0" size={20} />
              <h3 className="font-extrabold text-slate-900 text-sm">Performance Flagged Auto-Suggestions</h3>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed text-xs">
              The system auto-flagged the following employees due to <strong className="text-slate-800">Needs Improvement</strong> or <strong className="text-slate-800">Unsatisfactory</strong> ratings in their latest appraisal cycle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paginatedSuggestions.map(sug => {
                const emp = sug.employee || {};
                const deptName = emp.departmentId?.departmentName || 'General';
                const desigName = emp.designationId?.designationName || '-';

                return (
                  <div key={emp._id} className="bg-white border border-amber-200/80 p-4 rounded-2xl shadow-3xs flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                          {emp.employeeCode || 'EMP-N/A'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                          {deptName}
                        </span>
                        <span className="text-[9px] font-medium text-slate-500">
                          • {desigName}
                        </span>
                      </div>

                      <p className="text-[10px] text-amber-800 font-medium bg-amber-50/80 p-2 rounded-xl border border-amber-100/60 mt-1">
                        ⚠️ {sug.reason}
                      </p>
                    </div>

                    <button
                      onClick={() => handleInitiatePip(sug)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-2 px-3 rounded-xl cursor-pointer shadow-3xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Initiate PIP Plan</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {totalSugPages > 1 && (
              <div className="flex justify-between items-center pt-3 border-t border-amber-200/50">
                <span className="text-[10px] text-amber-800 font-medium">
                  Showing page {safeSugPage} of {totalSugPages} ({suggestions.length} suggestions)
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSugPage(p => Math.max(p - 1, 1))}
                    disabled={safeSugPage === 1}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 disabled:opacity-50 text-[10px] font-bold border border-amber-200 text-amber-800 rounded-lg cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setSugPage(p => Math.min(p + 1, totalSugPages))}
                    disabled={safeSugPage === totalSugPages}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 disabled:opacity-50 text-[10px] font-bold border border-amber-200 text-amber-800 rounded-lg cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Active Plans Catalog Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-sky-600" />
              <span>Performance Improvement Plans (PIP)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Track structured action goals, target windows, and milestone progress
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-48">
              <input
                type="text"
                placeholder="Search employee, goal..."
                value={pipSearch}
                onChange={(e) => setPipSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-7 pr-2.5 py-1.5 rounded-xl outline-none text-xs text-slate-800 focus:border-sky-500"
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Department Filter (Managers / HR / Leadership only) */}
            {user?.role !== 'employee' && (
              <select
                value={pipDeptFilter}
                onChange={(e) => setPipDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentName}</option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={pipStatusFilter}
              onChange={(e) => setPipStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="successful">Successful</option>
              <option value="unsuccessful">Unsuccessful</option>
            </select>

            {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'executive') && (
              <button
                onClick={() => handleInitiatePip(null)}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Initiate PIP</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Filter PIP catalog */}
        {(() => {
          const filteredPips = pips.filter(pip => {
            const emp = pip.employeeId || {};
            const empName = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.employeeCode || ''}`.toLowerCase();
            const deptName = (emp.departmentId?.departmentName || '').toLowerCase();
            const goalsText = (pip.goals || []).map(g => g.description).join(' ').toLowerCase();

            const matchesSearch = empName.includes(pipSearch.toLowerCase()) ||
                                  deptName.includes(pipSearch.toLowerCase()) ||
                                  goalsText.includes(pipSearch.toLowerCase());

            const deptId = emp.departmentId?._id || emp.departmentId;
            const matchesDept = pipDeptFilter === 'all' || (deptId && deptId.toString() === pipDeptFilter.toString());

            const matchesStatus = pipStatusFilter === 'all' || pip.status === pipStatusFilter;

            return matchesSearch && matchesDept && matchesStatus;
          });

          if (filteredPips.length === 0) {
            return (
              <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <FileText size={32} className="text-slate-300 mx-auto" />
                <p className="text-slate-600 font-bold">No PIP records match your filter criteria.</p>
                {(pipSearch || pipDeptFilter !== 'all' || pipStatusFilter !== 'all') && (
                  <button
                    onClick={() => { setPipSearch(''); setPipDeptFilter('all'); setPipStatusFilter('all'); }}
                    className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    Clear search & filters
                  </button>
                )}
              </div>
            );
          }

          const PIPS_PER_PAGE = 3;
          const totalPipPages = Math.ceil(filteredPips.length / PIPS_PER_PAGE);
          const safePipPage = Math.min(pipPage, Math.max(totalPipPages, 1));
          const paginatedPips = filteredPips.slice((safePipPage - 1) * PIPS_PER_PAGE, safePipPage * PIPS_PER_PAGE);

          return (
            <div className="space-y-6">
              <div className="space-y-6">
                {paginatedPips.map(pip => {
                  const emp = pip.employeeId || {};
                  const deptName = emp.departmentId?.departmentName || 'General';
                  const desigName = emp.designationId?.designationName || '-';

                  return (
                    <div key={pip._id} className="border border-slate-200/80 rounded-2xl p-5 space-y-4 bg-slate-50/40 hover:bg-slate-50 transition-colors shadow-2xs">
                      
                      {/* PIP Card Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/60 pb-3">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <img
                              src={getUserAvatarUrl(emp)}
                              alt="Avatar"
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-sm">
                                {emp.firstName} {emp.lastName}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md">
                                  {emp.employeeCode || 'EMP-N/A'}
                                </span>
                                <span className="text-[9px] font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/80">
                                  {deptName}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500">
                                  {desigName}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              Duration: {new Date(pip.startDate).toLocaleDateString()} to {new Date(pip.endDate).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <UserCheck size={11} className="text-slate-400" />
                              Reviewer: {pip.hrReviewerId?.firstName} {pip.hrReviewerId?.lastName}
                            </span>
                            {(() => {
                              if (pip.status !== 'active') return null;
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const endDate = new Date(pip.endDate);
                              endDate.setHours(0, 0, 0, 0);
                              const hasEnded = today.getTime() >= endDate.getTime();
                              if (!hasEnded) return null;

                              const allGoalsCompleted = pip.goals.every(g => g.status === 'completed');
                              if (allGoalsCompleted) {
                                return (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-250 px-2 py-0.5 rounded font-bold text-[9px]">
                                      ⚠️ Plan Period Ended - Goals Met (Ready to Close)
                                    </span>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-250 px-2 py-0.5 rounded font-bold text-[9px]">
                                      ⚠️ Plan Period Ended - Unmet Goals (Pending Action)
                                    </span>
                                  </>
                                );
                              }
                            })()}
                          </p>
                        </div>

                        {/* Status & Quick Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-3 py-1 rounded-full font-extrabold uppercase text-[9px] tracking-wider ${getStatusBadge(pip.status)}`}>
                            ● {pip.status}
                          </span>

                          {(() => {
                            const reviewerId = (pip.hrReviewerId?._id || pip.hrReviewerId)?.toString();
                            const currentUserId = (user?.id || user?._id)?.toString();
                            const isDesignatedReviewer = reviewerId && currentUserId && reviewerId === currentUserId;
                            const isLeadership = user?.role === 'admin' || user?.role === 'executive';
                            
                            const canAction = pip.status === 'active' && (isDesignatedReviewer || isLeadership);

                            if (!canAction) return null;

                            return (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleEvaluatePip(pip._id)}
                                  title="Evaluate Outcome: Assess PIP goals and select a final outcome (Successful, Extended, or Unsuccessful)."
                                  className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  Evaluate Outcome
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {pip.reason && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-[9px] uppercase text-slate-400 block">Reason for PIP</span>
                          <p className="font-semibold text-slate-700">{pip.reason}</p>
                        </div>
                      )}

                      {/* Goals checklist */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target Action Goals</span>
                        <div className="space-y-2">
                          {pip.goals.map((g, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl">
                              <div>
                                <p className="font-semibold text-slate-800 text-xs">{g.description}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">Target Date: {new Date(g.targetDate).toLocaleDateString()}</p>
                              </div>
                              
                              {/* Goal Status Selector */}
                              {pip.status === 'active' ? (
                                <select
                                  value={g.status}
                                  onChange={(e) => handleUpdateGoalStatus(pip._id, idx, e.target.value)}
                                  className="bg-slate-50 border border-slate-200 font-bold p-1.5 rounded-lg text-[10px] outline-none cursor-pointer text-slate-700"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              ) : (
                                <span className={`font-bold text-[9px] uppercase px-2.5 py-0.5 rounded-full ${
                                  g.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {g.status}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {pip.closureNotes && (
                        <div className="border border-slate-200 p-3 rounded-xl text-slate-700 text-xs bg-slate-50">
                          <span className="font-bold text-[9px] uppercase block mb-0.5 text-slate-500">
                            Reviewer Comments & Outcome Notes
                          </span>
                          <p className="italic">{pip.closureNotes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPipPages > 1 && (
                <div className="flex justify-between items-center pt-4 border-t border-slate-250/60">
                  <span className="text-slate-500 font-semibold text-[10px]">
                    Showing {Math.min(filteredPips.length, (safePipPage - 1) * PIPS_PER_PAGE + 1)}–{Math.min(filteredPips.length, safePipPage * PIPS_PER_PAGE)} of {filteredPips.length} plans
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPipPage(p => Math.max(p - 1, 1))}
                      disabled={safePipPage === 1}
                      className="px-3 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-extrabold border border-slate-200 rounded-xl text-[10px] cursor-pointer transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPipPage(p => Math.min(p + 1, totalPipPages))}
                      disabled={safePipPage === totalPipPages}
                      className="px-3 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-extrabold border border-slate-200 rounded-xl text-[10px] cursor-pointer transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-sm text-slate-800 border-b pb-2">Initiate Performance Improvement Plan</h3>

            <form onSubmit={handleCreatePip} className="space-y-4">
              {/* Employee Selection */}
              {selectedSug ? (
                <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={getUserAvatarUrl(selectedSug.employee)}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-300 shrink-0"
                    />
                    <div>
                      <p className="font-bold text-slate-800">{selectedSug.employee.firstName} {selectedSug.employee.lastName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {selectedSug.employee.employeeCode} • {selectedSug.employee.departmentId?.departmentName || 'General'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-md">
                    Auto-Flagged
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target Employee *</label>
                    <span className="text-[9px] font-extrabold text-sky-600">
                      {allUsers.length} Eligible Staff
                    </span>
                  </div>

                  {/* Combobox Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setEmpComboboxOpen(!empComboboxOpen)}
                    className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-2xl text-xs font-semibold text-slate-800 text-left transition-all cursor-pointer shadow-xs"
                  >
                    {(() => {
                      const selected = allUsers.find(u => u._id === selectedEmployeeId);
                      if (!selected) {
                        return <span className="text-slate-400 italic">Click to search & select target employee...</span>;
                      }
                      const deptName = selected.departmentId?.departmentName || 'General';
                      const desigName = selected.designationId?.designationName || '';
                      return (
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getUserAvatarUrl(selected)}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-slate-900 block truncate">
                              {selected.firstName} {selected.lastName}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">
                              {selected.employeeCode} • {deptName}{desigName ? ` (${desigName})` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    <span className="text-slate-400 text-[10px] ml-2 shrink-0">▼</span>
                  </button>

                  {/* Enterprise Searchable Combobox Popover */}
                  {empComboboxOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setEmpComboboxOpen(false)} />
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 p-3 space-y-2.5 animate-fade-in text-slate-800">
                        {/* Live Search Input */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                          <Search size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={empSearchQuery}
                            onChange={(e) => setEmpSearchQuery(e.target.value)}
                            placeholder="Search name, code (EMP004), designation..."
                            className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                            autoFocus
                          />
                        </div>

                        {/* Department Quick Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => setEmpDeptFilter('all')}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                              empDeptFilter === 'all'
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            All ({allUsers.length})
                          </button>
                          {departments.map(d => (
                            <button
                              key={d._id}
                              type="button"
                              onClick={() => setEmpDeptFilter(d._id)}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                                empDeptFilter.toString() === d._id.toString()
                                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {d.departmentName}
                            </button>
                          ))}
                        </div>

                        {/* Searchable Employee List */}
                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {(() => {
                            const filteredList = allUsers.filter(u => {
                              const deptId = u.departmentId?._id || u.departmentId;
                              const matchesDept = empDeptFilter === 'all' || (deptId && deptId.toString() === empDeptFilter.toString());
                              const desigName = u.designationId?.designationName || '';
                              const text = `${u.firstName} ${u.lastName} ${u.employeeCode} ${desigName}`.toLowerCase();
                              return matchesDept && text.includes(empSearchQuery.toLowerCase());
                            });

                            if (filteredList.length === 0) {
                              return (
                                <div className="p-4 text-center text-slate-400 text-xs italic">
                                  No employees match your search query.
                                </div>
                              );
                            }

                            return filteredList.map(u => {
                              const isSelected = selectedEmployeeId === u._id;
                              const deptName = u.departmentId?.departmentName || 'General';
                              const desigName = u.designationId?.designationName || '';

                              return (
                                <button
                                  key={u._id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployeeId(u._id);
                                    setEmpComboboxOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-sky-50 text-sky-950 font-bold border-sky-300 shadow-xs'
                                      : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={getUserAvatarUrl(u)}
                                      alt="Avatar"
                                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-extrabold text-slate-900 text-xs truncate">
                                        {u.firstName} {u.lastName}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                        <span className="font-mono text-slate-500 font-bold">{u.employeeCode || 'EMP'}</span>
                                        <span>•</span>
                                        <span className="truncate">{deptName}{desigName ? ` (${desigName})` : ''}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                    {u.role}
                                  </span>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Reason for PIP *</label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Provide clear reasons on why the Performance Improvement Plan is being initiated..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white p-3 rounded-xl outline-none text-slate-800 text-xs transition-all resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Reviewer</label>
                <select
                  value={selectedHrId}
                  onChange={(e) => setSelectedHrId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700 font-semibold text-xs"
                  required
                >
                  {(() => {
                    const targetEmp = allUsers.find(u => u._id === (selectedSug?.employee?._id || selectedEmployeeId));
                    const targetEmpId = (targetEmp?._id || targetEmp?.id || selectedSug?.employee?._id || selectedEmployeeId)?.toString();
                    const directMgrId = (targetEmp?.managerId?._id || targetEmp?.managerId)?.toString();

                    const filteredOverseers = hrList.filter(hr => {
                      // Exclude the employee being placed on PIP from overseeing themselves
                      if (targetEmpId && hr._id.toString() === targetEmpId) {
                        return false;
                      }
                      if (hr.role === 'manager') {
                        return directMgrId && hr._id.toString() === directMgrId;
                      }
                      return true;
                    });

                    return filteredOverseers.map(hr => {
                      const isDirectManager = directMgrId && hr._id.toString() === directMgrId;
                      let roleLabel = hr.role === 'hr' ? 'HR Manager' : hr.role === 'executive' ? 'CEO / Executive' : hr.role === 'admin' ? 'Admin' : 'Reporting Manager';
                      if (isDirectManager) roleLabel = 'Direct Reporting Manager';

                      return (
                        <option key={hr._id} value={hr._id}>
                          {hr.firstName} {hr.lastName} ({roleLabel})
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              {/* Dynamic Goals */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Improvement Action Goals</label>
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    + Add Goal
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {goals.map((g, idx) => (
                    <div key={idx} className="flex gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 items-center">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Goal Description</label>
                        <input
                          type="text"
                          value={g.description}
                          onChange={(e) => handleGoalChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Reduce production bugs below 2%..."
                          className="w-full bg-white border border-slate-200 focus:border-sky-500 focus:bg-white p-2.5 rounded-xl outline-none text-slate-800 text-xs transition-all"
                          required
                        />
                      </div>

                      <div className="w-36 space-y-1.5">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Target Date</label>
                        <input
                          type="date"
                          value={g.targetDate}
                          onChange={(e) => handleGoalChange(idx, 'targetDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-sky-500 focus:bg-white p-2 rounded-xl outline-none text-slate-700 text-xs transition-all"
                          required
                        />
                      </div>

                      {goals.length > 1 && (
                        <div className="pt-5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveGoal(idx)}
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 p-2.5 rounded-xl cursor-pointer transition-colors"
                            title="Remove Goal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md cursor-pointer transition-all duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Initiating...' : 'Initiate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom PIP Evaluation Modal */}
      {showEvaluateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">
                  Evaluate Performance Improvement Plan
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Assess progress and select a final outcome for this plan.
                </p>
              </div>
            </div>

            <form onSubmit={submitEvaluation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Select Outcome
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('successful')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedOutcome === 'successful'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold'
                    }`}
                  >
                    <span className="text-lg">🟢</span>
                    <span className="text-[10px] mt-1">Successful</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('extended')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedOutcome === 'extended'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold'
                    }`}
                  >
                    <span className="text-lg">🟡</span>
                    <span className="text-[10px] mt-1">Extend PIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('unsuccessful')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedOutcome === 'unsuccessful'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold'
                    }`}
                  >
                    <span className="text-lg">🔴</span>
                    <span className="text-[10px] mt-1">Not Successful</span>
                  </button>
                </div>
              </div>

              {selectedOutcome === 'extended' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    New Target End Date *
                  </label>
                  <input
                    type="date"
                    value={extensionDate}
                    onChange={(e) => setExtensionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white p-2.5 rounded-xl outline-none text-slate-800 text-xs transition-all"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Provide Evaluation Comments & Feedback *
                </label>
                <textarea
                  value={evaluationComments}
                  onChange={(e) => setEvaluationComments(e.target.value)}
                  placeholder="Provide final evaluation feedback details..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white p-3 rounded-xl outline-none text-slate-800 text-xs transition-all resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEvaluateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl shadow-xs cursor-pointer transition-colors text-xs"
                >
                  {actionLoading ? 'Processing...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipWorkspace;
