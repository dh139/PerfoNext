import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Plus, Check, X, ShieldAlert, Award, ArrowUpRight, Search } from 'lucide-react';
import { toast } from '../store/toastStore';
import ConfirmModal from '../components/ConfirmModal';
import { getUserAvatarUrl } from '../utils/avatar';

const PromotionsWorkspace = () => {
  const { user } = useAuthStore();
  const [promotions, setPromotions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(null); // { promoId, isApprove } or null

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState(null);
  const [proposedDesignationId, setProposedDesignationId] = useState('');
  const [salaryIncrementPercent, setSalaryIncrementPercent] = useState(10);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [supportingCycles, setSupportingCycles] = useState([]); // Selected cycle scores
  
  // Enterprise Combobox State
  const [departments, setDepartments] = useState([]);
  const [empComboboxOpen, setEmpComboboxOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const promoRes = await api.get('/api/promotions');
      setPromotions(promoRes.data);

      if (user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin' || user?.role === 'executive') {
        const empRes = await api.get('/api/users?role=employee');
        let empData = empRes.data || [];

        if (user?.role === 'manager') {
          const mgrDeptId = user?.departmentId?._id || user?.departmentId;
          empData = empData.filter(u => {
            const uDeptId = u.departmentId?._id || u.departmentId;
            return uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
          });
        }

        setEmployees(empData);
        if (empData.length > 0) handleEmployeeChange(empData[0]._id, empData);

        const [desRes, deptsRes] = await Promise.all([
          api.get('/api/designations'),
          api.get('/api/departments')
        ]);
        setDesignations(desRes.data.filter(d => d.status === 'active'));
        setDepartments(deptsRes.data || []);
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

  const handleApprovePromo = (promoId, isApprove) => {
    setPendingApproval({ promoId, isApprove });
  };

  const confirmApprovePromo = async () => {
    if (!pendingApproval) return;
    const { promoId, isApprove } = pendingApproval;
    setPendingApproval(null);
    try {
      await api.patch(`/api/promotions/${promoId}/approve`, {
        status: isApprove ? 'approved' : 'rejected'
      });
      toast.success(isApprove ? 'Promotion approved.' : 'Promotion rejected.');
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

  const totalPromos = promotions.length;
  const pendingCount = promotions.filter(p => p.status === 'proposed').length;
  const approvedCount = promotions.filter(p => p.status === 'approved').length;
  const avgIncrement = totalPromos > 0
    ? (promotions.reduce((acc, p) => acc + (p.salaryIncrementPercent || 0), 0) / totalPromos).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 tracking-wider">
                Career Advancement Hub
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Compensation & Leveling Engine
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Award className="text-emerald-400" size={24} />
              <span>Promotions & Salary Recommendations</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Manage career upgrades, designation changes, salary increments, & formal HR board approvals.
            </p>
          </div>

          {(user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') && (
            <button
              onClick={() => {
                if (employees.length > 0) handleEmployeeChange(employees[0]._id);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Plus size={18} />
              <span>Recommend Promotion</span>
            </button>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Proposals</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalPromos}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Recorded recommendations</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Award size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pending HR Review</p>
              <h2 className="text-xl font-extrabold text-amber-400 mt-0.5">{pendingCount}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Awaiting decision</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <ShieldAlert size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Approved Upgrades</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">{approvedCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Promotions granted</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Check size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avg Increment %</p>
              <h2 className="text-xl font-extrabold text-indigo-300 mt-0.5">+{avgIncrement}%</h2>
              <span className="text-[9px] text-indigo-400 font-bold uppercase">Salary adjustment</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <ArrowUpRight size={20} />
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

      {/* Promotions List Workbench */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <span>Promotion & Increment Registry</span>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
              {promotions.length} Records Listed
            </span>
          </h3>
        </div>

        {promotions.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
            <Award size={36} className="text-slate-300 mx-auto" />
            <p className="text-slate-500 font-bold text-xs">No promotions history or pending recommendations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80">
                  <th className="py-3 px-4 rounded-l-xl">Employee</th>
                  <th className="py-3 px-4">Current Designation</th>
                  <th className="py-3 px-4">Proposed Designation</th>
                  <th className="py-3 px-4">Salary Increase</th>
                  <th className="py-3 px-4">Recommended By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map(promo => (
                  <tr key={promo._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900 text-xs">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getUserAvatarUrl(promo.employeeId)}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <span>{promo.employeeId?.firstName} {promo.employeeId?.lastName}</span>
                          <span className="text-[9px] text-slate-400 block font-normal mt-0.5">Code: {promo.employeeId?.employeeCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">{promo.currentDesignationId?.designationName || 'Staff Member'}</td>
                    <td className="py-4 px-4 font-extrabold text-sky-800">{promo.proposedDesignationId?.designationName}</td>
                    <td className="py-4 px-4 font-black text-emerald-600 text-xs">+{promo.salaryIncrementPercent}%</td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <img
                          src={getUserAvatarUrl(promo.recommendedBy)}
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <span>{promo.recommendedBy?.firstName} {promo.recommendedBy?.lastName}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{getRoleLabel(promo.recommendedBy?.role)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-3 py-1 rounded-full border ${getStatusBadge(promo.status)}`}>
                        {promo.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {promo.status === 'proposed' && (user?.role === 'hr' || user?.role === 'admin' || user?.role === 'executive') ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprovePromo(promo._id, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-xl cursor-pointer shadow-3xs transition-colors"
                            title="Approve Recommendation"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleApprovePromo(promo._id, false)}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-xl cursor-pointer shadow-3xs transition-colors"
                            title="Reject Recommendation"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px] font-bold">
                          {promo.status !== 'proposed' ? `Finalized by ${promo.approvedBy?.firstName || 'Leadership'}` : '-'}
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
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Employee *</label>
                  <span className="text-[9px] font-extrabold text-sky-600">
                    {employees.length} Eligible Staff
                  </span>
                </div>

                {/* Combobox Trigger Button */}
                <button
                  type="button"
                  onClick={() => setEmpComboboxOpen(!empComboboxOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-2xl text-xs font-semibold text-slate-800 text-left transition-all cursor-pointer shadow-xs"
                >
                  {(() => {
                    const selected = employees.find(e => e._id === selectedEmpId);
                    if (!selected) {
                      return <span className="text-slate-400 italic">Click to search & select employee...</span>;
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
                          All ({employees.length})
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
                          const filteredList = employees.filter(e => {
                            const deptId = e.departmentId?._id || e.departmentId;
                            const matchesDept = empDeptFilter === 'all' || (deptId && deptId.toString() === empDeptFilter.toString());
                            const desigName = e.designationId?.designationName || '';
                            const text = `${e.firstName} ${e.lastName} ${e.employeeCode} ${desigName}`.toLowerCase();
                            return matchesDept && text.includes(empSearchQuery.toLowerCase());
                          });

                          if (filteredList.length === 0) {
                            return (
                              <div className="p-4 text-center text-slate-400 text-xs italic">
                                No employees match your search query.
                              </div>
                            );
                          }

                          return filteredList.map(e => {
                            const isSelected = selectedEmpId === e._id;
                            const deptName = e.departmentId?.departmentName || 'General';
                            const desigName = e.designationId?.designationName || '';

                            return (
                              <button
                                key={e._id}
                                type="button"
                                onClick={() => {
                                  handleEmployeeChange(e._id);
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
                                    src={getUserAvatarUrl(e)}
                                    alt="Avatar"
                                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-slate-900 text-xs truncate">
                                      {e.firstName} {e.lastName}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                      <span className="font-mono text-slate-500 font-bold">{e.employeeCode || 'EMP'}</span>
                                      <span>•</span>
                                      <span className="truncate">{deptName}{desigName ? ` (${desigName})` : ''}</span>
                                    </div>
                                  </div>
                                </div>

                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                  {e.role}
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
                    {(() => {
                      const selectedEmp = employees.find(e => e._id === selectedEmpId);
                      const empDeptId = selectedEmp?.departmentId?._id || selectedEmp?.departmentId;

                      const deptDesignations = designations.filter(d => {
                        if (d._id === currentDesignation?._id) return false;
                        const desigDeptId = d.departmentId?._id || d.departmentId;
                        if (empDeptId && desigDeptId) {
                          return desigDeptId.toString() === empDeptId.toString();
                        }
                        return true;
                      });

                      return deptDesignations.map(d => (
                        <option key={d._id} value={d._id}>{d.designationName}</option>
                      ));
                    })()}
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

      <ConfirmModal
        open={!!pendingApproval}
        title={pendingApproval?.isApprove ? 'Approve promotion?' : 'Reject promotion?'}
        message={
          pendingApproval?.isApprove
            ? "Approving this promotion will immediately update the employee's active designation in the database. Proceed?"
            : 'Reject this promotion recommendation?'
        }
        confirmLabel={pendingApproval?.isApprove ? 'Approve' : 'Reject'}
        danger={!pendingApproval?.isApprove}
        onConfirm={confirmApprovePromo}
        onCancel={() => setPendingApproval(null)}
      />
    </div>
  );
};

export default PromotionsWorkspace;
