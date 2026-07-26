import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Calendar, Plus, ToggleLeft, ToggleRight, CheckCircle2 } from 'lucide-react';
import { toast } from '../store/toastStore';
import ConfirmModal from '../components/ConfirmModal';

const ReviewCycles = () => {
  const { user } = useAuthStore();
  const [cycles, setCycles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form State
  const [reviewMonth, setReviewMonth] = useState('2026-07');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kpiTemplateId, setKpiTemplateId] = useState('');
  const [cycleType, setCycleType] = useState('monthly');
  const [targetRole, setTargetRole] = useState(user?.role === 'executive' ? 'manager' : 'employee');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredCycles = cycles.filter(c => {
    const monthMatch = (c.reviewMonth || '').toLowerCase().includes(searchTerm.toLowerCase());
    const tNameMatch = (c.kpiTemplateId?.templateName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = monthMatch || tNameMatch;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              onChange={(e) => setStatusFilter(e.target.value)}
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="overflow-x-auto">
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
                {filteredCycles.map(c => (
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
                      {c.cycleType || 'monthly'}
                    </td>
                    <td className="py-4 px-4 font-extrabold text-sky-800">
                      {c.kpiTemplateId?.templateName || 'Org-Wide Core Leadership'}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {new Date(c.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {new Date(c.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        c.status === 'closed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {c.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {c.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Review Period (YYYY-MM) *</label>
                  <input
                    type="text"
                    value={reviewMonth}
                    onChange={(e) => setReviewMonth(e.target.value)}
                    placeholder="2026-07"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Frequency *</label>
                  <select
                    value={cycleType}
                    onChange={(e) => setCycleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cycle Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Evaluation Due Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800 font-medium"
                    required
                  />
                </div>
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

    </div>
  );
};

export default ReviewCycles;
