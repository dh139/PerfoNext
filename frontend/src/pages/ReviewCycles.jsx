import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Calendar, Plus, CheckCircle2, Trash2, Unlock, Lock, UserCheck, Search, Building, Edit2 } from 'lucide-react';
import { toast } from '../store/toastStore';
import ConfirmModal from '../components/ConfirmModal';
import TablePagination from '../components/TablePagination';
const formatDateDDMMYYYY = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const ReviewCycles = () => {
  const { user } = useAuthStore();
  const [cycles, setCycles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [pendingDeleteCycle, setPendingDeleteCycle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cyclePage, setCyclePage] = useState(1);

  // Individual Unlock Extension State
  const [unlockModalCycle, setUnlockModalCycle] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [selectedUserIdToUnlock, setSelectedUserIdToUnlock] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [submittedUserIds, setSubmittedUserIds] = useState(new Set());

  const fetchUsersForUnlock = async (cycle) => {
    try {
      const [usersRes, selfRes] = await Promise.all([
        api.get('/api/users'),
        api.get(`/api/self-assessments?reviewCycleId=${cycle._id}`)
      ]);
      setUsersList(usersRes.data.filter(u => u.employmentStatus === 'active'));
      // Build a Set of user IDs who already submitted for this cycle
      const submitted = new Set(
        (selfRes.data || []).filter(s => s.status === 'submitted').map(s =>
          (s.employeeId?._id || s.employeeId || '').toString()
        )
      );
      setSubmittedUserIds(submitted);
    } catch (err) {
      console.error('Failed to fetch users for unlock:', err);
    }
  };

  const handleOpenUnlockModal = (c) => {
    setUnlockModalCycle(c);
    setSelectedUserIdToUnlock('');
    setUserSearchTerm('');
    setSubmittedUserIds(new Set());
    fetchUsersForUnlock(c);
  };

  const handleGrantUnlock = async (userIdToUnlock) => {
    if (!unlockModalCycle || !userIdToUnlock) return;
    try {
      const res = await api.post(`/api/review-cycles/${unlockModalCycle._id}/unlock-user`, { userId: userIdToUnlock });
      toast.success('Individual review extension granted successfully!');
      setUnlockModalCycle(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to grant individual extension.');
    }
  };

  const handleRevokeUnlock = async (userIdToRelock) => {
    if (!unlockModalCycle || !userIdToRelock) return;
    try {
      const res = await api.post(`/api/review-cycles/${unlockModalCycle._id}/relock-user`, { userId: userIdToRelock });
      toast.success('Individual extension revoked.');
      setUnlockModalCycle(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to revoke extension.');
    }
  };

  const getEligibleUsersForUnlockModal = () => {
    if (!unlockModalCycle) return [];

    const cycleDeptId = (
      unlockModalCycle.departmentId?._id ||
      unlockModalCycle.departmentId || ''
    ).toString();

    const cycleDeptName = (unlockModalCycle.departmentId?.departmentName || '').toLowerCase();
    const isAllDepts = !cycleDeptId || cycleDeptName.includes('all department') || cycleDeptName === 'all';
    const targetRole = unlockModalCycle.targetRole || 'all';

    return usersList.filter(u => {
      // 1. Department Filter
      if (!isAllDepts) {
        const uDeptId = (u.departmentId?._id || u.departmentId || '').toString();
        if (!uDeptId || uDeptId !== cycleDeptId) {
          return false;
        }
      }

      // 2. Role Filter
      if (targetRole === 'manager') {
        if (u.role !== 'manager' && u.role !== 'hr') return false;
      } else if (targetRole === 'employee') {
        if (u.role !== 'employee') return false;
      }

      // 3. Exclude users who already submitted — they don't need a re-open
      if (submittedUserIds.has(u._id.toString())) return false;

      return true;
    });
  };

  const getCurrentDefaultReviewMonth = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${yr}-Q${q}`;
  };

  // Form State
  const [reviewMonth, setReviewMonth] = useState(getCurrentDefaultReviewMonth());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [cycleType, setCycleType] = useState('quarterly');
  const [targetRole, setTargetRole] = useState(user?.role === 'executive' ? 'manager' : 'employee');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Form State
  const [editingCycle, setEditingCycle] = useState(null);
  const [editReviewMonth, setEditReviewMonth] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editCycleType, setEditCycleType] = useState('quarterly');
  const [editTargetRole, setEditTargetRole] = useState('employee');
  const [editError, setEditError] = useState('');

  const getQuarterOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    const opts = [];
    years.forEach(yr => {
      opts.push({ value: `${yr}-Q1`, label: `${yr}-Q1 (Jan 01 - Mar 31)` });
      opts.push({ value: `${yr}-Q2`, label: `${yr}-Q2 (Apr 01 - Jun 30)` });
      opts.push({ value: `${yr}-Q3`, label: `${yr}-Q3 (Jul 01 - Sep 30)` });
      opts.push({ value: `${yr}-Q4`, label: `${yr}-Q4 (Oct 01 - Dec 31)` });
    });
    return opts;
  };

  const getHalfYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    const opts = [];
    years.forEach(yr => {
      opts.push({ value: `${yr}-H1`, label: `${yr}-H1 (Jan 01 - Jun 30)` });
      opts.push({ value: `${yr}-H2`, label: `${yr}-H2 (Jul 01 - Dec 31)` });
    });
    return opts;
  };

  const getAnnualOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    return years.map(yr => ({
      value: `${yr}`,
      label: `${yr} (Jan 01 - Dec 31)`
    }));
  };

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (cycleType === 'quarterly') {
      const q = Math.ceil(currentMonth / 3);
      setReviewMonth(`${currentYear}-Q${q}`);
    } else if (cycleType === 'half_yearly') {
      const h = currentMonth <= 6 ? 1 : 2;
      setReviewMonth(`${currentYear}-H${h}`);
    } else if (['yearly', 'annual'].includes(cycleType)) {
      setReviewMonth(`${currentYear}`);
    }
  }, [cycleType]);

  useEffect(() => {
    if (showCreateModal) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const due = new Date();
      due.setDate(due.getDate() + 14);
      const dueStr = due.toISOString().split('T')[0];

      setStartDate(todayStr);
      setEndDate(dueStr);
    }
  }, [showCreateModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const cyclesRes = await api.get('/api/review-cycles');
      setCycles(cyclesRes.data);

      const deptRes = await api.get('/api/departments');
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load review cycles.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateToYYYYMMDD = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleOpenEditModal = (c) => {
    setEditingCycle(c);
    setEditReviewMonth(c.reviewMonth);
    setEditStartDate(formatDateToYYYYMMDD(c.startDate));
    setEditEndDate(formatDateToYYYYMMDD(c.endDate));
    setEditDepartmentId(c.departmentId?._id || c.departmentId || '');
    setEditCycleType(c.cycleType || 'quarterly');
    setEditTargetRole(c.targetRole || 'employee');
    setEditError('');
  };

  const handleEditCycleTypeChange = (newType) => {
    setEditCycleType(newType);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (newType === 'quarterly') {
      const q = Math.ceil(currentMonth / 3);
      setEditReviewMonth(`${currentYear}-Q${q}`);
    } else if (newType === 'half_yearly') {
      const h = currentMonth <= 6 ? 1 : 2;
      setEditReviewMonth(`${currentYear}-H${h}`);
    } else if (['yearly', 'annual'].includes(newType)) {
      setEditReviewMonth(`${currentYear}`);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editReviewMonth) {
      setEditError('Please select target period.');
      return;
    }
    if (!editStartDate || !editEndDate) {
      setEditError('Please select both Start Date and Evaluation Due Date.');
      return;
    }

    try {
      await api.patch(`/api/review-cycles/${editingCycle._id}`, {
        reviewMonth: editReviewMonth,
        startDate: editStartDate,
        endDate: editEndDate,
        departmentId: editDepartmentId || null,
        cycleType: editCycleType,
        targetRole: editTargetRole
      });
      toast.success('Review cycle updated successfully!');
      setEditingCycle(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.message || 'Failed to update review cycle.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!reviewMonth) {
      setCreateError('Please select target period.');
      return;
    }
    if (!startDate || !endDate) {
      setCreateError('Please select both Start Date and Evaluation Due Date.');
      return;
    }

    try {
      await api.post('/api/review-cycles', {
        reviewMonth,
        startDate,
        endDate,
        departmentId: departmentId || null,
        cycleType,
        targetRole
      });

      toast.success('Review cycle created successfully!');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.message || 'Failed to create review cycle.');
    }
  };

  const handleConfirmStatusUpdate = async () => {
    if (!pendingStatusChange) return;
    const { id, currentStatus } = pendingStatusChange;
    const newStatus = currentStatus === 'draft' ? 'active' : 'closed';

    try {
      await api.patch(`/api/review-cycles/${id}`, { status: newStatus });
      toast.success(`Review cycle status updated to ${newStatus}.`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update cycle status.');
    } finally {
      setPendingStatusChange(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteCycle) return;
    try {
      await api.delete(`/api/review-cycles/${pendingDeleteCycle._id}`);
      toast.success('Review cycle deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete review cycle.');
    } finally {
      setPendingDeleteCycle(null);
    }
  };

  const filteredCycles = cycles.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const deptName = (c.departmentId?.departmentName || '').toLowerCase();
    const matchesSearch =
      !searchTerm ||
      c.reviewMonth.toLowerCase().includes(term) ||
      c.cycleType.toLowerCase().includes(term) ||
      deptName.includes(term);

    return matchesStatus && matchesSearch;
  });

  const CYCLE_PAGE_SIZE = 10;
  const totalCyclePages = Math.ceil(filteredCycles.length / CYCLE_PAGE_SIZE) || 1;
  const safeCyclePage = Math.min(cyclePage, totalCyclePages);

  const paginatedCycles = filteredCycles.slice(
    (safeCyclePage - 1) * CYCLE_PAGE_SIZE,
    safeCyclePage * CYCLE_PAGE_SIZE
  );

  return (
    <div className="space-y-6 text-xs text-slate-800 animate-fade-in">
      {/* Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 tracking-wider">
                Appraisal Schedule
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Cycle Automation Engine</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Performance Review Cycles Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Configure review periods, calendar dates, evaluation schedules, & target department pairings.
            </p>
          </div>

          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'executive') && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setCreateError('');
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg cursor-pointer transition-all shrink-0"
            >
              <Plus size={18} />
              <span>Launch New Review Cycle</span>
            </button>
          )}
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Total Cycles</span>
              <span className="text-lg font-black text-white">{cycles.length}</span>
              <span className="text-[9px] text-slate-400 block">Recorded periods</span>
            </div>
            <div className="p-2.5 bg-slate-700/50 text-sky-400 rounded-xl">
              <Calendar size={18} />
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Active Cycles</span>
              <span className="text-lg font-black text-emerald-400">{cycles.filter(c => c.status === 'active').length}</span>
              <span className="text-[9px] text-emerald-300 block">Currently open</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Closed Cycles</span>
              <span className="text-lg font-black text-slate-300">{cycles.filter(c => c.status === 'closed').length}</span>
              <span className="text-[9px] text-slate-400 block">Archived appraisal periods</span>
            </div>
            <div className="p-2.5 bg-slate-700/50 text-slate-400 rounded-xl">
              <Calendar size={18} />
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Draft Cycles</span>
              <span className="text-lg font-black text-amber-400">{cycles.filter(c => c.status === 'draft').length}</span>
              <span className="text-[9px] text-amber-300 block">Pending activation</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertCircle size={18} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 font-bold text-xs flex items-center gap-2.5">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Review Cycles Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Evaluation Cycle Schedule</h3>
            <span className="text-[10px] text-slate-400 font-medium">{filteredCycles.length} Cycles Listed</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCyclePage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Cycle Statuses</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft Only</option>
              <option value="closed">Closed Only</option>
            </select>

            <input
              type="text"
              placeholder="Search month or department..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCyclePage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none w-full sm:w-56 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
            <Calendar className="mx-auto text-slate-300" size={36} />
            <p className="text-slate-500 font-bold text-xs">No review cycles found matching your query.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80">
                    <th className="py-3 px-4 rounded-l-xl">Cycle Period</th>
                    <th className="py-3 px-4">Target Audience</th>
                    <th className="py-3 px-4">Cycle Type</th>
                    <th className="py-3 px-4">Target Department</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCycles.map(c => (
                    <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-black text-slate-900 text-xs">
                         {c.reviewMonth}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          c.targetRole === 'manager'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}>
                          {c.targetRole === 'manager' ? 'Managers (CEO Review)' : 'Employees (Manager Review)'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-600 capitalize">
                        {c.cycleType === 'half_yearly' ? 'Half-Yearly' : c.cycleType === 'yearly' || c.cycleType === 'annual' ? 'Yearly' : c.cycleType === 'quarterly' ? 'Quarterly' : (c.cycleType || 'monthly')}
                      </td>
                      <td className="py-4 px-4 font-bold text-sky-800">
                        {c.departmentId?.departmentName || 'All Departments (Org-Wide)'}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {formatDateDDMMYYYY(c.startDate)}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {formatDateDDMMYYYY(c.endDate)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                            c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            c.status === 'closed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {c.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {c.status?.toUpperCase()}
                          </span>
                          {c.unlockedUserIds && c.unlockedUserIds.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              <Unlock size={10} /> {c.unlockedUserIds.length} Unlocked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === 'closed' && (
                            <button
                              onClick={() => handleOpenUnlockModal(c)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl transition-colors cursor-pointer shadow-3xs font-bold text-xs"
                              title="Grant Individual Extension / Re-open for specific employee"
                            >
                              <Unlock size={14} className="text-amber-600" />
                              <span>Individual Re-Open</span>
                            </button>
                          )}

                          {c.status !== 'closed' ? (
                            <button
                              onClick={() => setPendingStatusChange({ id: c._id, currentStatus: c.status })}
                              className={`font-black text-xs px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer shadow-3xs ${
                                c.status === 'draft' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700' : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                              }`}
                            >
                              {c.status === 'draft' ? 'Activate Cycle' : 'Close Cycle'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Archived</span>
                          )}

                          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'executive') && (
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                              title="Edit Review Cycle"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'executive') && (
                            <button
                              onClick={() => setPendingDeleteCycle(c)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                              title="Delete Review Cycle"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safeCyclePage}
              totalPages={totalCyclePages}
              totalCount={filteredCycles.length}
              pageSize={CYCLE_PAGE_SIZE}
              onPageChange={(p) => setCyclePage(p)}
            />
          </>
        )}
      </div>

      {/* ── Individual Re-Open Modal ─────────────────────────────────────── */}
      {unlockModalCycle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Unlock size={16} className="text-amber-500" />
                  <p className="font-black text-slate-800 text-sm">Individual Re-Open</p>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cycle: <strong>{unlockModalCycle.reviewMonth}</strong> &nbsp;·&nbsp;
                  {unlockModalCycle.departmentId?.departmentName || 'All Departments'}
                </p>
              </div>
              <button
                onClick={() => setUnlockModalCycle(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Already-unlocked users */}
              {unlockModalCycle.unlockedUserIds?.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Currently Extended ({unlockModalCycle.unlockedUserIds.length})
                  </p>
                  <div className="space-y-1.5">
                    {unlockModalCycle.unlockedUserIds.map(u => (
                      <div
                        key={u._id || u}
                        className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
                      >
                        <div>
                          <p className="font-black text-slate-800 text-xs">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{u.employeeCode} · {u.email}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeUnlock(u._id || u)}
                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Lock size={11} /> Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grant to a new user */}
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Grant Extension to Employee
                </p>
                {/* Search */}
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee name or code…"
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-400"
                  />
                </div>

                {/* Eligible user list */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {(() => {
                    const alreadyUnlocked = new Set(
                      (unlockModalCycle.unlockedUserIds || []).map(u => (u._id || u).toString())
                    );
                    const eligible = getEligibleUsersForUnlockModal().filter(u => {
                      if (alreadyUnlocked.has(u._id.toString())) return false;
                      if (!userSearchTerm) return true;
                      const q = userSearchTerm.toLowerCase();
                      return (
                        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                        (u.employeeCode || '').toLowerCase().includes(q)
                      );
                    });

                    if (eligible.length === 0) {
                      return (
                        <p className="text-center text-[11px] text-slate-400 py-6">
                          {userSearchTerm ? 'No matching employees found.' : 'All eligible employees already have extensions.'}
                        </p>
                      );
                    }

                    return eligible.map(u => (
                      <div
                        key={u._id}
                        onClick={() => setSelectedUserIdToUnlock(u._id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                          selectedUserIdToUnlock === u._id
                            ? 'bg-sky-50 border-sky-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <p className="font-black text-slate-800 text-xs">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-slate-400">{u.employeeCode} · {u.departmentId?.departmentName || ''}</p>
                        </div>
                        {selectedUserIdToUnlock === u._id && (
                          <CheckCircle2 size={15} className="text-sky-500 shrink-0" />
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setUnlockModalCycle(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGrantUnlock(selectedUserIdToUnlock)}
                disabled={!selectedUserIdToUnlock}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-colors cursor-pointer shadow-md"
              >
                <Unlock size={13} /> Grant Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Launch New Review Period</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {createError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2.5 font-bold text-xs">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    {cycleType === 'quarterly' ? 'Quarter Period *' : cycleType === 'half_yearly' ? 'Half-Year Period *' : 'Review Year *'}
                  </label>
                  <select
                    value={reviewMonth}
                    onChange={(e) => setReviewMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                    required
                  >
                    {cycleType === 'quarterly' && getQuarterOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {cycleType === 'half_yearly' && getHalfYearOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {['yearly', 'annual'].includes(cycleType) && getAnnualOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Frequency *</label>
                  <select
                    value={cycleType}
                    onChange={(e) => setCycleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Audience (Evaluated Group) *</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  required
                >
                  <option value="employee">Department Employees (Evaluated by Reporting Managers)</option>
                  <option value="manager">Reporting Managers & HRs (Evaluated by CEO / Executive)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Department *</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                >
                  <option value="">All Departments (Org-Wide Review)</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cycle Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Evaluation Due Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCycle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Edit Review Period</h3>
              <button onClick={() => setEditingCycle(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {editError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2.5 font-bold text-xs">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    {editCycleType === 'quarterly' ? 'Quarter Period *' : editCycleType === 'half_yearly' ? 'Half-Year Period *' : 'Review Year *'}
                  </label>
                  <select
                    value={editReviewMonth}
                    onChange={(e) => setEditReviewMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                    required
                  >
                    {editCycleType === 'quarterly' && getQuarterOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {editCycleType === 'half_yearly' && getHalfYearOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {['yearly', 'annual'].includes(editCycleType) && getAnnualOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Frequency *</label>
                  <select
                    value={editCycleType}
                    onChange={(e) => handleEditCycleTypeChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Audience (Evaluated Group) *</label>
                <select
                  value={editTargetRole}
                  onChange={(e) => setEditTargetRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  required
                >
                  <option value="employee">Department Employees (Evaluated by Reporting Managers)</option>
                  <option value="manager">Reporting Managers & HRs (Evaluated by CEO / Executive)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Department *</label>
                <select
                  value={editDepartmentId}
                  onChange={(e) => setEditDepartmentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                >
                  <option value="">All Departments (Org-Wide Review)</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cycle Start Date *</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Evaluation Due Date *</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCycle(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Status Updates */}
      {pendingStatusChange && (
        <ConfirmModal
          open={true}
          isOpen={true}
          title={pendingStatusChange.currentStatus === 'draft' ? 'Activate Review Cycle' : 'Close Review Cycle'}
          message={`Are you sure you want to ${pendingStatusChange.currentStatus === 'draft' ? 'activate' : 'close'} this review cycle?`}
          onConfirm={handleConfirmStatusUpdate}
          onCancel={() => setPendingStatusChange(null)}
        />
      )}

      {/* Confirmation Modal for Delete */}
      {pendingDeleteCycle && (
        <ConfirmModal
          open={true}
          isOpen={true}
          title="Delete Review Cycle"
          message={`Are you sure you want to delete review cycle "${pendingDeleteCycle.reviewMonth}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteCycle(null)}
        />
      )}
    </div>
  );
};

export default ReviewCycles;
