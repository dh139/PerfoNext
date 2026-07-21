import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Plus, Check, X, ShieldAlert, Award, ArrowUpRight } from 'lucide-react';
import { toast } from '../store/toastStore';

const PromotionsWorkspace = () => {
  const { user } = useAuthStore();
  const [promotions, setPromotions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState(null);
  const [proposedDesignationId, setProposedDesignationId] = useState('');
  const [salaryIncrementPercent, setSalaryIncrementPercent] = useState(10);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [supportingCycles, setSupportingCycles] = useState([]); // Selected cycle scores

  const fetchData = async () => {
    try {
      setLoading(true);
      const promoRes = await api.get('/api/promotions');
      setPromotions(promoRes.data);

      if (user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') {
        const empRes = await api.get('/api/users?role=employee');
        setEmployees(empRes.data);
        if (empRes.data.length > 0) handleEmployeeChange(empRes.data[0]._id, empRes.data);

        const desRes = await api.get('/api/designations');
        setDesignations(desRes.data.filter(d => d.status === 'active'));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch promotions workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleEmployeeChange = async (empId, empList = employees) => {
    setSelectedEmpId(empId);
    const emp = empList.find(e => e._id === empId);
    if (emp) {
      setCurrentDesignation(emp.designationId);
      
      // Fetch employee scores to display as supporting evidence
      try {
        const scoreRes = await api.get(`/api/review-scores?employeeId=${empId}`);
        setSupportingCycles(scoreRes.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!selectedEmpId || !proposedDesignationId || !effectiveDate) {
      setError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      // Collect most recent score ID if any
      const scoreIds = supportingCycles.map(s => s._id);

      await api.post('/api/promotions', {
        employeeId: selectedEmpId,
        currentDesignationId: currentDesignation._id,
        proposedDesignationId,
        salaryIncrementPercent: parseFloat(salaryIncrementPercent) || 0,
        effectiveDate,
        supportingReviewScores: scoreIds
      });

      setShowCreateModal(false);
      fetchData();
      toast.success('Promotion recommendation proposed successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to recommend promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePromo = async (promoId, isApprove) => {
    const confirmMsg = isApprove 
      ? 'Approving this promotion will immediately update the employee\'s active designation in the database. Proceed?'
      : 'Reject this promotion recommendation?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/api/promotions/${promoId}/approve`, {
        status: isApprove ? 'approved' : 'rejected'
      });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update promotion status.');
    }
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin': return 'Administrator';
      case 'hr': return 'HR Manager';
      case 'manager': return 'Reporting Manager';
      case 'employee': return 'Employee';
      case 'executive': return 'CEO / Management';
      default: return r || 'N/A';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'rejected': return 'bg-rose-50 text-rose-700 border border-rose-250';
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Promotions & Salary recommendations</h2>
          <p className="text-xs text-slate-500 mt-1">Manage career upgrades, designation changes and salary increases</p>
        </div>
        
        {(user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') && (
          <button
            onClick={() => {
              if (employees.length > 0) handleEmployeeChange(employees[0]._id);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-850 text-white font-semibold px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-colors"
          >
            <Plus size={16} />
            <span>Recommend Promotion</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Promotions List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {promotions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl">
            <Award size={32} className="text-slate-400 mx-auto mb-2 animate-bounce" />
            <p className="text-slate-500 font-semibold">No promotions history or pending recommendations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-lg">Employee</th>
                  <th className="py-3 px-4">Current Designation</th>
                  <th className="py-3 px-4">Proposed Designation</th>
                  <th className="py-3 px-4">Salary Increase</th>
                  <th className="py-3 px-4">Recommended By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map(promo => (
                  <tr key={promo._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {promo.employeeId?.firstName} {promo.employeeId?.lastName}
                      <span className="text-[9px] text-slate-400 block font-normal">Code: {promo.employeeId?.employeeCode}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{promo.currentDesignationId?.designationName}</td>
                    <td className="py-4 px-4 font-bold text-slate-700">{promo.proposedDesignationId?.designationName}</td>
                    <td className="py-4 px-4 font-extrabold text-emerald-700">+{promo.salaryIncrementPercent}%</td>
                    <td className="py-4 px-4 text-slate-500">
                      {promo.recommendedBy?.firstName} {promo.recommendedBy?.lastName}
                      <span className="text-[9px] text-slate-400 block mt-0.5">Role: {getRoleLabel(promo.recommendedBy?.role)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[9px] uppercase border ${getStatusBadge(promo.status)}`}>
                        {promo.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {promo.status === 'proposed' && (user?.role === 'hr' || user?.role === 'admin') ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApprovePromo(promo._id, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded cursor-pointer shadow-sm"
                            title="Approve Recommendation"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleApprovePromo(promo._id, false)}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded cursor-pointer shadow-sm"
                            title="Reject Recommendation"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">
                          {promo.status !== 'proposed' ? `Finalized by ${promo.approvedBy?.firstName || 'HR'}` : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommend Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-800 text-sm">Propose Promotion Upgrade</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold font-sans">Close</button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Employee</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700"
                  required
                >
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Current Designation</label>
                  <input
                    type="text"
                    value={currentDesignation ? currentDesignation.designationName : 'N/A'}
                    className="w-full bg-slate-150 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-500 cursor-not-allowed font-medium"
                    disabled
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Proposed Designation</label>
                  <select
                    value={proposedDesignationId}
                    onChange={(e) => setProposedDesignationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700 font-semibold"
                    required
                  >
                    <option value="">Select Upgrade Role</option>
                    {designations.filter(d => d._id !== currentDesignation?._id).map(d => (
                      <option key={d._id} value={d._id}>{d.designationName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Salary Raise Recommendation (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={salaryIncrementPercent}
                    onChange={(e) => setSalaryIncrementPercent(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Effective Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700"
                    required
                  />
                </div>
              </div>

              {/* Supporting Reviews Preview */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Supporting Review scores evidence</label>
                {supportingCycles.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No score history records found for this employee.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {supportingCycles.map(score => (
                      <div key={score._id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Cycle Month: {score.reviewCycleId?.reviewMonth}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-700">{score.finalScore} / 5.0</span>
                          <span className="text-[9px] uppercase font-bold text-slate-500">({score.rating})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Recommendation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsWorkspace;
