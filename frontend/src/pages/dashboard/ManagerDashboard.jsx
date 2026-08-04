import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Users, ClipboardList, Clock, FileText, CheckCircle2, RefreshCw, Activity
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../store/toastStore';
import PunchCard from './PunchCard';

const ManagerDashboard = ({ data, user, onAddWorkLogClick }) => {
  const navigate = useNavigate();
  const {
    teamCount = 0,
    teamSize = 0,
    pendingWorkLogs = 0,
    pendingManagerReviews = [],
    pendingSelfAssessmentsFromSubordinates = [],
    teamScores = [],
    pendingSelfAssessments = []
  } = data || {};

  const totalEmployees = teamCount || teamSize || 0;

  const [pendingRegs, setPendingRegs] = useState([]);

  const fetchPendingRegs = async () => {
    try {
      const res = await api.get('/api/attendance/pending-regularization');
      setPendingRegs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPendingRegs();
  }, []);

  const handleReviewReg = async (id, status) => {
    try {
      await api.post('/api/attendance/review-regularization', { id, status });
      toast.success(`Regularization request ${status} successfully.`);
      fetchPendingRegs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review request.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
            Manager Overview Dashboard
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-medium">
            Welcome, {user?.firstName}! Manage team reviews and log your own daily work.
          </p>
        </div>
        <button
          onClick={onAddWorkLogClick}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4.5 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer border border-slate-850"
        >
          <Plus size={16} />
          <span>Log Daily Work</span>
        </button>
      </div>

      {/* Self Assessment Action Banner */}
      {pendingSelfAssessments && pendingSelfAssessments.length > 0 && (
        <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-400/30">Action Required</span>
              {(() => {
                const type = pendingSelfAssessments[0].cycleType || '';
                const typeLabel = type.toLowerCase() === 'yearly' ? 'Yearly' : (type.toLowerCase() === 'half_yearly' ? 'Half-Yearly' : 'Quarterly');
                return (
                  <h3 className="font-bold text-sm">Your {typeLabel} Evidence Confirmation Pending ({pendingSelfAssessments[0].reviewMonth})</h3>
                );
              })()}
            </div>
            <p className="text-xs text-sky-200 mt-1">Please confirm your verified work evidence for the active review cycle.</p>
          </div>
          <Link
            to={`/review/confirm/${pendingSelfAssessments[0].cycleId}`}
            className="bg-sky-500 hover:bg-sky-400 text-slate-955 font-extrabold text-xs px-4 py-2 rounded-xl shadow transition-colors shrink-0"
          >
            Confirm Evidence &rarr;
          </Link>
        </div>
      )}

      {/* Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Direct Reportees</p>
            <h2 className="text-2xl font-black text-white mt-1.5">{totalEmployees} Employees</h2>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-sky-400">
            <Users size={22} />
          </div>
        </div>

        <div
          onClick={() => navigate('/performance/work-journal')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-sky-300 transition-colors"
        >
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Work Log Verification</p>
            <h2 className="text-2xl font-black text-rose-600 mt-1.5">{pendingWorkLogs} Logs</h2>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <ClipboardList size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reviews Awaiting</p>
            <h2 className="text-2xl font-black text-slate-800 mt-1.5">
              {pendingManagerReviews.filter(r => r.isEmployeeSubmitted).length}
            </h2>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Subordinate Evidence Confirmations</p>
            <h2 className="text-2xl font-black text-slate-800 mt-1.5">{pendingSelfAssessmentsFromSubordinates.length}</h2>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-700">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Main Bento Grid: Reviews (2/3) + Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Reviews (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Direct Subordinates Performance Reviews</h3>
              <p className="text-[11px] text-slate-500">Grade submitted self-assessments</p>
            </div>
          </div>

          {pendingManagerReviews.length === 0 ? (
            <div className="py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-800 text-xs font-bold">All reviews completed!</p>
              <p className="text-[10px] text-slate-500 mt-0.5">There are no pending manager reviews for active cycles.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingManagerReviews.map((item) => (
                <div
                  key={`${item.employee._id}-${item.cycleId}`}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">
                      {item.employee.firstName} {item.employee.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Cycle: <span className="font-semibold text-slate-600">{item.cycleMonth}</span> | Status: {' '}
                      <span className={`font-semibold ${item.isEmployeeSubmitted ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {item.isEmployeeSubmitted ? 'Self Submitted' : 'Self Assessment Pending'}
                      </span>
                    </p>
                  </div>
                  <div>
                    {item.isEmployeeSubmitted ? (
                      <Link
                        to={`/review/${item.cycleId}/${item.employee._id}`}
                        className="inline-block bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                      >
                        Grade Review
                      </Link>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold cursor-not-allowed">
                        Waiting for Self
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: Punch Card + Regularizations (1/3 width) */}
        <div className="flex flex-col gap-5">
          <PunchCard />

          {/* Pending Regularizations */}
          {pendingRegs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw size={15} className="text-amber-500 animate-spin" />
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pending Regularizations</h4>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {pendingRegs.map(reg => (
                  <div key={reg._id} className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">{reg.employeeId?.firstName} {reg.employeeId?.lastName}</p>
                      <p className="text-[10px] text-slate-400">Date: {new Date(reg.date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(reg.requestedPunchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {new Date(reg.requestedPunchOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <p className="text-[10px] text-slate-500 italic">"{reg.regularizationReason}"</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewReg(reg._id, 'approved')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 rounded-lg shadow transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewReg(reg._id, 'rejected')}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold py-1.5 rounded-lg shadow transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Ratings Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
                <Activity size={16} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Recent Team Ratings</h3>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-52">
              {teamScores.length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center">No scores computed yet.</p>
              ) : (
                teamScores.map((score) => (
                  <div key={score._id} className="text-xs flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-slate-800">
                        {score.employeeId?.firstName} {score.employeeId?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Cycle: {score.reviewCycleId?.reviewMonth}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sky-700 text-sm">{score.finalScore}</span>
                      <p className="text-[9px] font-semibold text-slate-500 uppercase mt-0.5">{score.rating}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
