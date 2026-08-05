import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Users, ClipboardList, Clock, FileText,
  CheckCircle2, RefreshCw, Activity, ArrowUpRight,
  AlertCircle, Star, TrendingUp, ChevronRight
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
  const reviewsReady = pendingManagerReviews.filter(r => r.isEmployeeSubmitted).length;

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

  const getRatingColor = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('excellent') || r.includes('outstanding')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (r.includes('good') || r.includes('above')) return 'text-sky-600 bg-sky-50 border-sky-100';
    if (r.includes('average') || r.includes('meet')) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const kpiCards = [
    {
      label: 'Direct Reportees',
      value: `${totalEmployees}`,
      unit: 'Employees',
      icon: <Users size={20} />,
      iconBg: 'bg-sky-500/15 text-sky-400',
      textColor: 'text-white',
      bgClass: 'bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-slate-800',
      onClick: null,
    },
    {
      label: 'Pending Work Log Verifications',
      value: pendingWorkLogs,
      unit: 'Logs',
      icon: <ClipboardList size={20} />,
      iconBg: 'bg-rose-50 text-rose-500',
      textColor: 'text-rose-600',
      bgClass: 'bg-white border-slate-200 hover:border-rose-200',
      onClick: () => navigate('/performance/work-journal'),
    },
    {
      label: 'Reviews Awaiting',
      value: reviewsReady,
      unit: 'Ready to Grade',
      icon: <Clock size={20} />,
      iconBg: 'bg-amber-50 text-amber-600',
      textColor: 'text-amber-600',
      bgClass: 'bg-white border-slate-200 hover:border-amber-200',
      onClick: null,
    },
    {
      label: 'Subordinate Evidence',
      value: pendingSelfAssessmentsFromSubordinates.length,
      unit: 'Confirmations',
      icon: <FileText size={20} />,
      iconBg: 'bg-indigo-50 text-indigo-600',
      textColor: 'text-indigo-600',
      bgClass: 'bg-white border-slate-200 hover:border-indigo-200',
      onClick: null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── HERO WELCOME BANNER — identical styling to EmployeeDashboard ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
              Manager Dashboard
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-400 text-xs mt-1.5">
            {user?.departmentId?.name && (
              <span className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-800 text-[10px]">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                Department: <strong className="text-slate-200">{user.departmentId.name}</strong>
              </span>
            )}
            {user?.designation && (
              <span className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-800 text-[10px]">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                Designation: <strong className="text-slate-200">{user.designation}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 relative z-10 shrink-0">
          <button
            onClick={onAddWorkLogClick}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Log Daily Work</span>
          </button>
          {/* Team chip — mirrors the Reporting Manager card in Employee dashboard */}
          <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-2xl text-[10px] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-sm">
              <Users size={15} />
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Direct Reports</p>
              <p className="text-slate-200 font-black mt-0.5">{totalEmployees} Employees</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SELF-ASSESSMENT ACTION BANNER ── */}
      {pendingSelfAssessments && pendingSelfAssessments.length > 0 && (() => {
        const type = pendingSelfAssessments[0].cycleType || '';
        const typeLabel = type.toLowerCase() === 'yearly' ? 'Yearly'
          : type.toLowerCase() === 'half_yearly' ? 'Half-Yearly' : 'Quarterly';
        return (
          <div className="bg-gradient-to-r from-sky-900 to-indigo-900 border border-sky-800/50 rounded-2xl px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-400/30 tracking-wider">
                    Action Required
                  </span>
                  <h3 className="font-bold text-sm text-white">
                    Your {typeLabel} Evidence Confirmation Pending
                  </h3>
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    {pendingSelfAssessments[0].reviewMonth}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Please confirm your verified work evidence for the active review cycle.
                </p>
              </div>
            </div>
            <Link
              to={`/review/confirm/${pendingSelfAssessments[0].cycleId}`}
              className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow transition-all hover:scale-105 active:scale-95"
            >
              Confirm Evidence <ArrowUpRight size={13} />
            </Link>
          </div>
        );
      })()}

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick || undefined}
            className={`relative rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 ${card.bgClass} ${card.onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''}`}
          >
            <div>
              <p className={`text-[10px] uppercase font-bold tracking-wider ${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                {card.label}
              </p>
              <h2 className={`text-2xl font-black mt-1.5 ${card.textColor}`}>
                {card.value}
                {card.unit && <span className="text-sm font-bold ml-1.5 opacity-70">{card.unit}</span>}
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${card.iconBg}`}>
              {card.icon}
            </div>
            {card.onClick && (
              <div className="absolute top-3 right-3 opacity-30">
                <ChevronRight size={14} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN: Team Management Workspace (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6 self-start w-full">
          
          {/* Subordinate Reviews Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <TrendingUp size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Direct Subordinates Performance Reviews</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Grade submitted self-assessments</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-full">
                {pendingManagerReviews.length} Total
              </span>
            </div>

            {pendingManagerReviews.length === 0 ? (
              <div className="py-12 bg-emerald-50/60 rounded-2xl border border-dashed border-emerald-200 text-center">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-800 text-xs font-bold">All reviews completed!</p>
                <p className="text-[10px] text-slate-400 mt-1">No pending manager reviews for active cycles.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingManagerReviews.map((item) => {
                  const isReady = item.isEmployeeSubmitted;
                  return (
                    <div
                      key={`${item.employee._id}-${item.cycleId}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm text-xs ${
                        isReady
                          ? 'bg-sky-50/40 border-sky-100 hover:border-sky-200'
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                          isReady ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {item.employee.firstName?.[0]}{item.employee.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {item.employee.firstName} {item.employee.lastName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">Cycle:</span>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.cycleMonth}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isReady
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                : 'text-slate-500 bg-slate-100 border border-slate-200'
                            }`}>
                              {isReady ? '✓ Self Submitted' : 'Self Assessment Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isReady ? (
                          <Link
                            to={`/review/${item.cycleId}/${item.employee._id}`}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95"
                          >
                            Grade Review <ArrowUpRight size={11} />
                          </Link>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold cursor-not-allowed select-none">
                            Waiting for Self
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Regularizations Card (moved to left column, 2/3 width) */}
          {pendingRegs.length > 0 && (
            <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <RefreshCw size={16} className="animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Pending Regularizations</h4>
                    <p className="text-[10px] text-slate-400">Attendance correction requests from subordinates</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {pendingRegs.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRegs.map(reg => (
                  <div key={reg._id} className="text-xs p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-200 transition-colors flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">
                          {reg.employeeId?.firstName?.[0]}{reg.employeeId?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{reg.employeeId?.firstName} {reg.employeeId?.lastName}</p>
                          <p className="text-[9px] text-slate-400">{new Date(reg.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500">
                        <Clock size={10} />
                        {new Date(reg.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-slate-350">→</span>
                        {new Date(reg.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {reg.regularizationReason && (
                        <p className="text-[10px] text-slate-400 italic mt-2 leading-relaxed">"{reg.regularizationReason}"</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleReviewReg(reg._id, 'approved')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReviewReg(reg._id, 'rejected')}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold py-1.5 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Ratings Summary Card (moved to left column, 2/3 width) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Activity size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Recent Team Ratings</h3>
                <p className="text-[10px] text-slate-400">Latest computed performance scores for subordinates</p>
              </div>
            </div>
            <div>
              {teamScores.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                  <Star size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-[11px] font-medium">No scores computed yet.</p>
                  <p className="text-[10px] text-slate-350 mt-0.5">Scores appear after review cycles close.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamScores.map((score) => (
                    <div
                      key={score._id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">
                          {score.employeeId?.firstName?.[0]}{score.employeeId?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] leading-tight">
                            {score.employeeId?.firstName} {score.employeeId?.lastName}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1">Cycle: <span className="font-semibold">{score.reviewCycleId?.reviewMonth}</span></p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div>
                          <span className="font-extrabold text-indigo-700 text-sm">{score.finalScore}</span>
                          <span className="text-[10px] text-slate-400"> / 5.0</span>
                        </div>
                        {score.rating && (
                          <p className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border mt-1.5 ${getRatingColor(score.rating)}`}>
                            {score.rating}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Personal Shift Workspace (1/3 width) */}
        <div className="flex flex-col gap-5 self-start w-full">
          <PunchCard />
        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;
