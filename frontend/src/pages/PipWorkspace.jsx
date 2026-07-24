import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Plus, CheckCircle, Clock, XCircle, FileText, Send, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from '../store/toastStore';

const PipWorkspace = () => {
  const { user } = useAuthStore();
  const [pips, setPips] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSug, setSelectedSug] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goals, setGoals] = useState([{ description: '', targetDate: '', status: 'pending' }]);
  const [hrList, setHrList] = useState([]);
  const [selectedHrId, setSelectedHrId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const pipRes = await api.get('/api/pips');
      setPips(pipRes.data);

      if (user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager') {
        const sugRes = await api.get('/api/pips/suggestions');
        setSuggestions(sugRes.data);

        const usersRes = await api.get('/api/users');
        let employees = usersRes.data.filter(u => u.role === 'employee');

        // Scope to manager department if logged in as a Reporting Manager
        if (user?.role === 'manager') {
          const mgrDeptId = user?.departmentId?._id || user?.departmentId;
          employees = employees.filter(u => {
            const uDeptId = u.departmentId?._id || u.departmentId;
            return uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
          });
        }

        setAllUsers(employees);
        if (employees.length > 0) setSelectedEmployeeId(employees[0]._id);

        const hrUsers = usersRes.data.filter(u => u.role === 'hr' || u.role === 'admin');
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
    if (sug) {
      setSelectedEmployeeId(sug.employee._id);
    } else if (allUsers.length > 0) {
      setSelectedEmployeeId(allUsers[0]._id);
    }
    setStartDate('');
    setEndDate('');
    setGoals([{ description: '', targetDate: '', status: 'pending' }]);
    setShowCreateModal(true);
  };

  const handleCreatePip = async (e) => {
    e.preventDefault();
    setError('');

    const targetEmpId = selectedSug ? selectedSug.employee._id : selectedEmployeeId;

    if (!startDate || !endDate || !selectedHrId || !targetEmpId) {
      setError('Please fill out dates and select an employee and HR reviewer.');
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
      await api.post('/api/pips', {
        employeeId: targetEmpId,
        triggerReviewScoreId: selectedSug?.triggerScores?.[0]?._id || null,
        startDate,
        endDate,
        goals,
        managerId: mgrId || user?.id,
        hrReviewerId: selectedHrId
      });

      setShowCreateModal(false);
      fetchData();
      toast.success('Performance Improvement Plan initiated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initiate PIP.');
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

  const handleClosePip = async (pipId, isEscalate) => {
    const notes = window.prompt(isEscalate ? 'Provide escalation details:' : 'Provide closure notes:');
    if (notes === null) return; // cancelled

    try {
      await api.patch(`/api/pips/${pipId}`, {
        status: isEscalate ? 'escalated' : 'closed',
        closureNotes: notes
      });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to close PIP.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
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
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-400/30 tracking-wider">
                Performance Intervention Desk
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Structured Remediation Engine
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="text-amber-400" size={24} />
              <span>Performance Improvement Plans (PIP) Workspace</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Track structured action goals, target windows, milestone progress, auto-flagged suggestions, & PIP closures.
            </p>
          </div>

          {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => handleInitiatePip(null)}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer shrink-0"
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

      {/* Auto Suggestions Panel (HR/Admin Only) */}
      {(user?.role === 'hr' || user?.role === 'admin') && suggestions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-amber-700 shrink-0" size={20} />
            <h3 className="font-extrabold text-slate-900 text-sm">Performance Flagged Auto-Suggestions</h3>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed text-xs">
            The system auto-flagged the following employees due to <strong className="text-slate-800">Needs Improvement</strong> or <strong className="text-slate-800">Unsatisfactory</strong> ratings in consecutive appraisal cycles.
          </p>

          <div className="space-y-3">
            {suggestions.map(sug => (
              <div key={sug.employee._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-amber-200/80 p-4 rounded-2xl shadow-3xs">
                <div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {sug.employee.firstName} {sug.employee.lastName}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{sug.reason}</p>
                </div>
                <button
                  onClick={() => handleInitiatePip(sug)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer shadow-3xs transition-colors shrink-0"
                >
                  Initiate PIP Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Plans Catalog Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Performance Improvement Plans (PIP)</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Track structured action goals, target windows, and milestone progress</p>
          </div>

          {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => handleInitiatePip(null)}
              className="bg-sky-700 hover:bg-sky-850 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-colors flex items-center gap-1.5 uppercase text-[10px]"
            >
              <Plus size={14} />
              <span>Initiate New PIP</span>
            </button>
          )}
        </div>
        
        {pips.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl">
            <FileText size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-bold">No active or historical PIPs found.</p>
            <p className="text-slate-400 text-[10px] mt-1">Click "+ Initiate New PIP" above to start an action plan for any employee.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pips.map(pip => (
              <div key={pip._id} className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Employee: {pip.employeeId?.firstName} {pip.employeeId?.lastName} ({pip.employeeId?.employeeCode})
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Duration: {new Date(pip.startDate).toLocaleDateString()} to {new Date(pip.endDate).toLocaleDateString()} | HR Overseer: {pip.hrReviewerId?.firstName} {pip.hrReviewerId?.lastName}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${getStatusBadge(pip.status)}`}>
                      Status: {pip.status}
                    </span>

                    {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager') && pip.status === 'active' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleClosePip(pip._id, false)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Close PIP
                        </button>
                        <button
                          onClick={() => handleClosePip(pip._id, true)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Escalate
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goals checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target Action Goals</span>
                  <div className="space-y-2">
                    {pip.goals.map((g, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg">
                        <div>
                          <p className="font-semibold text-slate-700">{g.description}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Target Date: {new Date(g.targetDate).toLocaleDateString()}</p>
                        </div>
                        
                        {/* Goal Status Selector */}
                        {pip.status === 'active' ? (
                          <select
                            value={g.status}
                            onChange={(e) => handleUpdateGoalStatus(pip._id, idx, e.target.value)}
                            className="bg-slate-50 border border-slate-200 font-bold p-1.5 rounded text-[10px] outline-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        ) : (
                          <span className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                            g.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {g.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {pip.closureNotes && (
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg text-slate-655">
                    <span className="font-bold text-[10px] uppercase text-slate-500 block mb-1">Closure Notes</span>
                    <p className="italic">{pip.closureNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Initiate Performance Improvement Plan</h3>

            <form onSubmit={handleCreatePip} className="space-y-4">
              {/* Employee Selection */}
              {selectedSug ? (
                <div className="bg-slate-50 border p-3 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center uppercase">
                    {selectedSug.employee.firstName[0]}{selectedSug.employee.lastName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selectedSug.employee.firstName} {selectedSug.employee.lastName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Auto-Flagged Code: {selectedSug.employee.employeeCode}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700"
                    required
                  >
                    {allUsers.map(u => {
                      const deptName = u.departmentId?.departmentName || '';
                      return (
                        <option key={u._id} value={u._id}>
                          {u.firstName} {u.lastName} ({u.employeeCode}){deptName ? ` — ${deptName}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">HR Overseer / Reviewer</label>
                <select
                  value={selectedHrId}
                  onChange={(e) => setSelectedHrId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700 font-semibold"
                  required
                >
                  {hrList.map(hr => (
                    <option key={hr._id} value={hr._id}>{hr.firstName} {hr.lastName} ({hr.role})</option>
                  ))}
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

                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {goals.map((g, idx) => (
                    <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 items-end relative">
                      <div className="flex-1 space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Goal Description</label>
                        <input
                          type="text"
                          value={g.description}
                          onChange={(e) => handleGoalChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Reduce production bugs below 2%..."
                          className="w-full bg-white border border-slate-200 p-2 rounded outline-none text-slate-800"
                          required
                        />
                      </div>

                      <div className="w-36 space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Target Date</label>
                        <input
                          type="date"
                          value={g.targetDate}
                          onChange={(e) => handleGoalChange(idx, 'targetDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2 rounded outline-none text-slate-700"
                          required
                        />
                      </div>

                      {goals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGoal(idx)}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                  className="bg-sky-700 hover:bg-sky-850 text-white font-semibold px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Initiate Plan
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
