import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Calendar, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from '../store/toastStore';

const ReviewCycles = () => {
  const [cycles, setCycles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [reviewMonth, setReviewMonth] = useState('2026-07');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kpiTemplateId, setKpiTemplateId] = useState('');
  const [cycleType, setCycleType] = useState('monthly');
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

  const handleUpdateStatus = async (id, currentStatus) => {
    let nextStatus = 'draft';
    if (currentStatus === 'draft') nextStatus = 'active';
    else if (currentStatus === 'active') nextStatus = 'closed';
    else return; // Closed is final

    const confirmMsg = nextStatus === 'active' 
      ? 'Activating a cycle immediately triggers notifications to all active employees. Proceed?'
      : 'Closing the cycle stops any submissions. Proceed?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/api/review-cycles/${id}`, { status: nextStatus });
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Review Cycles Settings</h2>
          <p className="text-xs text-slate-500 mt-1">Configure review periods, calendar dates and active template pairings</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-colors"
        >
          <Plus size={16} />
          <span>New Cycle</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Cycle List Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                <th className="py-3 px-4">Cycle Month</th>
                <th className="py-3 px-4">Cycle Type</th>
                <th className="py-3 px-4">KPI Template</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Cycle Status</th>
                <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cycles.map(c => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-800">{c.reviewMonth}</td>
                  <td className="py-4 px-4 text-xs font-semibold text-slate-550 capitalize">{c.cycleType || 'monthly'}</td>
                  <td className="py-4 px-4 font-semibold text-slate-700">{c.kpiTemplateId?.templateName || 'Org-Wide'}</td>
                  <td className="py-4 px-4 text-slate-500">{new Date(c.startDate).toLocaleDateString()}</td>
                  <td className="py-4 px-4 text-slate-500">{new Date(c.endDate).toLocaleDateString()}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase border ${
                      c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                      c.status === 'closed' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {c.status !== 'closed' && (
                      <button
                        onClick={() => handleUpdateStatus(c._id, c.status)}
                        className="inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-850 text-[10px] border border-sky-100 hover:bg-sky-50 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        {c.status === 'draft' ? 'Launch (Go Live)' : 'Finalize (Close)'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-800 text-sm">Schedule Performance Review Cycle</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold">Close</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Review month (e.g. YYYY-MM)</label>
                <input
                  type="text"
                  value={reviewMonth}
                  onChange={(e) => setReviewMonth(e.target.value)}
                  placeholder="2026-07"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-slate-800"
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
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Due Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cycle Duration Type</label>
                <select
                  value={cycleType}
                  onChange={(e) => {
                    setCycleType(e.target.value);
                    if (e.target.value === 'quarterly') setReviewMonth('2026-Q3');
                    else if (e.target.value === 'annual') setReviewMonth('2026');
                    else setReviewMonth('2026-07');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-semibold"
                  required
                >
                  <option value="monthly">Monthly Cycle</option>
                  <option value="quarterly">Quarterly Aggregation</option>
                  <option value="annual">Annual Aggregation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Pair KPI Template</label>
                <select
                  value={kpiTemplateId}
                  onChange={(e) => setKpiTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700"
                  required
                >
                  <option value="">Select Template</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.templateName}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Save Draft Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCycles;
