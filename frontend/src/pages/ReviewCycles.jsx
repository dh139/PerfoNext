import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Calendar, Plus, ToggleLeft, ToggleRight, CheckCircle2, Trash2, Unlock, Lock, UserCheck, Search } from 'lucide-react';
import { toast } from '../store/toastStore';
import ConfirmModal from '../components/ConfirmModal';
import TablePagination from '../components/TablePagination';

const ReviewCycles = () => {
  const { user } = useAuthStore();
  const [cycles, setCycles] = useState([]);
  const [templates, setTemplates] = useState([]);
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

  const fetchUsersForUnlock = async () => {
    try {
      const res = await api.get('/api/users');
      setUsersList(res.data.filter(u => u.employmentStatus === 'active'));
    } catch (err) {
      console.error('Failed to fetch users for unlock:', err);
    }
  };

  const handleOpenUnlockModal = (c) => {
    setUnlockModalCycle(c);
    setSelectedUserIdToUnlock('');
    setUserSearchTerm('');
    fetchUsersForUnlock();
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
      unlockModalCycle.kpiTemplateId?.departmentId?._id ||
      unlockModalCycle.kpiTemplateId?.departmentId ||
      unlockModalCycle.departmentId?._id ||
      unlockModalCycle.departmentId || ''
    ).toString();

    const cycleDeptName = (unlockModalCycle.kpiTemplateId?.departmentId?.departmentName || '').toLowerCase();
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
  const [kpiTemplateId, setKpiTemplateId] = useState('');
  const [cycleType, setCycleType] = useState('quarterly');
  const [targetRole, setTargetRole] = useState(user?.role === 'executive' ? 'manager' : 'employee');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  // Reset default reviewMonth when cycleType changes
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

  // Dynamically calculate suggested startDate and endDate based on current date and selected period
  useEffect(() => {
    if (!reviewMonth) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, [reviewMonth, cycleType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const cyclesRes = await api.get('/api/review-cycles');
      setCycles(cyclesRes.data);

      const templatesRes = await api.get('/api/kpi-templates');
      setTemplates(templatesRes.data.filter(t => t.status === 'active'));
      if (templatesRes.data.length > 0) setKpiTemplateId(templatesRes.data[0]._id);
    } catch (err) {
      console.error(err);
      setError('Failed to load review cycles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!reviewMonth || !startDate || !endDate || !kpiTemplateId) {
      setError('All fields are required.');
      return;
    }

    try {
      await api.post('/api/review-cycles', {
        reviewMonth,
        startDate,
        endDate,
        kpiTemplateId,
        cycleType,
        targetRole,
        status: 'draft'
      });

      // Reset
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create review cycle.');
    }
  };

  const handleUpdateStatus = (id, currentStatus) => {
    let nextStatus = 'draft';
    if (currentStatus === 'draft') nextStatus = 'active';
    else if (currentStatus === 'active') nextStatus = 'closed';
    else return; // Closed is final

    setPendingStatusChange({ id, nextStatus });
  };

  const confirmUpdateStatus = async () => {
    if (!pendingStatusChange) return;
    const { id, nextStatus } = pendingStatusChange;
    setPendingStatusChange(null);
    try {
      await api.patch(`/api/review-cycles/${id}`, { status: nextStatus });
      toast.success(`Review cycle ${nextStatus === 'active' ? 'activated' : 'closed'} successfully.`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update cycle status.');
    }
  };

  const confirmDeleteCycle = async () => {
    if (!pendingDeleteCycle) return;
    const id = pendingDeleteCycle._id;
    setPendingDeleteCycle(null);
    try {
      await api.delete(`/api/review-cycles/${id}`);
      toast.success('Review cycle deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete review cycle.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const CYCLE_PAGE_SIZE = 10;

  // Sort latest review cycles first (createdAt descending, or startDate descending)
  const sortedCycles = [...cycles].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.startDate ? new Date(a.startDate).getTime() : 0);
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.startDate ? new Date(b.startDate).getTime() : 0);
    if (timeA !== timeB) return timeB - timeA;
    return String(b._id || '').localeCompare(String(a._id || ''));
  });

  const filteredCycles = sortedCycles.filter(c => {
    const monthMatch = (c.reviewMonth || '').toLowerCase().includes(searchTerm.toLowerCase());
    const tNameMatch = (c.kpiTemplateId?.templateName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = monthMatch || tNameMatch;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCyclePages = Math.max(1, Math.ceil(filteredCycles.length / CYCLE_PAGE_SIZE));
  const safeCyclePage = Math.min(cyclePage, totalCyclePages);
  const paginatedCycles = filteredCycles.slice(
    (safeCyclePage - 1) * CYCLE_PAGE_SIZE,
    safeCyclePage * CYCLE_PAGE_SIZE
  );

  const totalCyclesCount = cycles.length;
  const activeCyclesCount = cycles.filter(c => c.status === 'active').length;
  const closedCyclesCount = cycles.filter(c => c.status === 'closed').length;
  const draftCyclesCount = cycles.filter(c => c.status === 'draft').length;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 tracking-wider">
                Appraisal Schedule
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Cycle Automation Engine
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Performance Review Cycles Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Configure review periods, calendar dates, evaluation schedules, & active template pairings.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Launch New Review Cycle</span>
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Cycles</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalCyclesCount}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Recorded periods</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Calendar size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Cycles</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">{activeCyclesCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Currently open</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Closed Cycles</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{closedCyclesCount}</h2>
              <span className="text-[9px] text-slate-400 font-medium">Archived appraisal periods</span>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl text-slate-400 border border-slate-600/50">
              <Calendar size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Draft Cycles</p>
              <h2 className="text-xl font-extrabold text-amber-400 mt-0.5">{draftCyclesCount}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Pending activation</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <AlertCircle size={20} />
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

      {/* Cycle List Table Workbench */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>Evaluation Cycle Schedule</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                {filteredCycles.length} Cycles Listed
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCyclePage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Cycle Statuses</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft Only</option>
              <option value="closed">Closed Only</option>
            </select>

            <input
              type="text"
              placeholder="Search month or template..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCyclePage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none w-full sm:w-56 font-medium"
            />
          </div>
        </div>

        {filteredCycles.length === 0 ? (
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
                    <th className="py-3 px-4">KPI Template Pairing</th>
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
                        {c.kpiTemplateId?.templateName || 'General KPI Template'}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {new Date(c.startDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {new Date(c.endDate).toLocaleDateString()}
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
                              onClick={() => handleUpdateStatus(c._id, c.status)}
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

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Launch New Review Period</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

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
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {cycleType === 'quarterly' && 'Select Q1, Q2, Q3, or Q4 period.'}
                    {cycleType === 'half_yearly' && 'Select H1 (First Half) or H2 (Second Half) period.'}
                    {['yearly', 'annual'].includes(cycleType) && 'Select target review year.'}
                  </p>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase">KPI Template Pairing *</label>
                <select
                  value={kpiTemplateId}
                  onChange={(e) => setKpiTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  required
                >
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.templateName} ({t.departmentId ? `Dept: ${t.departmentId.departmentName}` : 'Org-Wide'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cycle Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800 font-medium cursor-pointer"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Evaluation Due Date *</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800 font-medium cursor-pointer"
                      required
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic">
                  * Dates pre-populate automatically based on period, but you can select any custom Start & Due Date.
                </p>
              </div>



              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-850 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingStatusChange}
        title="Update Review Cycle Status?"
        message={`Are you sure you want to change cycle status to "${pendingStatusChange?.nextStatus?.toUpperCase()}"?`}
        confirmLabel="Confirm Status Change"
        danger={pendingStatusChange?.nextStatus === 'closed'}
        onConfirm={confirmUpdateStatus}
        onCancel={() => setPendingStatusChange(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteCycle}
        title="Delete Review Cycle?"
        message={`Are you sure you want to delete review cycle "${pendingDeleteCycle?.reviewMonth}" (${pendingDeleteCycle?.kpiTemplateId?.templateName || 'Cycle'})? This action will permanently remove associated self-assessments and evaluation scores.`}
        confirmLabel="Delete Cycle"
        danger={true}
        onConfirm={confirmDeleteCycle}
        onCancel={() => setPendingDeleteCycle(null)}
      />

      {/* Individual Extension / Unlock Modal */}
      {unlockModalCycle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Unlock size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Grant Individual Review Extension</h3>
                  <p className="text-[11px] text-slate-500">
                    Re-open cycle "{unlockModalCycle.reviewMonth}" ({unlockModalCycle.kpiTemplateId?.departmentId?.departmentName || 'All Departments'} • {unlockModalCycle.targetRole === 'manager' ? 'Managers' : 'Employees'})
                  </p>
                </div>
              </div>
              <button onClick={() => setUnlockModalCycle(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            {/* Grant Extension Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Select Employee to Re-Open / Unlock Cycle</label>
              
              {/* Search User Input */}
              <input
                type="text"
                placeholder="Filter employee by name..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-xs font-semibold text-slate-700 mb-2"
              />

              <div className="flex gap-2">
                <select
                  value={selectedUserIdToUnlock}
                  onChange={(e) => setSelectedUserIdToUnlock(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-semibold text-slate-700 text-xs cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {getEligibleUsersForUnlockModal()
                    .filter(u => {
                      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                      return fullName.includes(userSearchTerm.toLowerCase()) || u.employeeCode?.toLowerCase().includes(userSearchTerm.toLowerCase());
                    })
                    .filter(u => !unlockModalCycle.unlockedUserIds?.some(un => (un._id || un).toString() === u._id.toString()))
                    .map(u => {
                      const deptName = u.departmentId?.departmentName || 'Dept';
                      return (
                        <option key={u._id} value={u._id}>
                          {u.firstName} {u.lastName} ({u.employeeCode || 'EMP'}) • {deptName} • {u.role?.toUpperCase()}
                        </option>
                      );
                    })}
                </select>

                <button
                  disabled={!selectedUserIdToUnlock}
                  onClick={() => {
                    handleGrantUnlock(selectedUserIdToUnlock);
                    setSelectedUserIdToUnlock('');
                  }}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 shadow-md cursor-pointer transition-colors"
                >
                  Unlock User
                </button>
              </div>
            </div>

            {/* Currently Unlocked Users */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                Currently Unlocked / Extension Granted ({unlockModalCycle.unlockedUserIds?.length || 0})
              </span>

              {(!unlockModalCycle.unlockedUserIds || unlockModalCycle.unlockedUserIds.length === 0) ? (
                <div className="bg-slate-50 p-3 rounded-xl text-center text-slate-400 font-medium text-xs">
                  No individual extensions active for this review cycle.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {unlockModalCycle.unlockedUserIds.map(u => {
                    const uObj = typeof u === 'object' ? u : usersList.find(usr => usr._id === u) || { _id: u, firstName: 'User', lastName: '' };
                    return (
                      <div key={uObj._id} className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{uObj.firstName} {uObj.lastName}</span>
                          <span className="text-[10px] text-slate-500 block">{uObj.email} • {uObj.employeeCode}</span>
                        </div>

                        <button
                          onClick={() => handleRevokeUnlock(uObj._id)}
                          className="text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          Revoke / Relock
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setUnlockModalCycle(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewCycles;
