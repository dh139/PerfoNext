import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, Lock, Clock, BookOpen, Plus, Bell, FileText, ArrowUpRight
} from 'lucide-react';
import PunchCard from './PunchCard';

const EmployeeDashboard = ({ data, user, onAddWorkLogClick }) => {
  const {
    profile = {},
    pendingSelfAssessments = [],
    reviewScores = [],
    notifications = [],
    skillsCount = 0,
    certificationsCount = 0,
    managerVerified = false,
    selfAssessmentStatus = 'none',
    managerReviewStatus = 'none',
    finalScoreFinalized = false,
    finalScore = null,
    ratingBand = null,
    activeCycleId = null,
    activeCycleType = null
  } = data || {};

  // Lifecycle journey calculation
  const totalStages = 6;
  let completedStages = 1; // Profile is always completed
  if (skillsCount > 0) completedStages++;
  if (certificationsCount > 0) completedStages++;
  if (managerVerified) completedStages++;
  if (selfAssessmentStatus === 'submitted') completedStages++;
  if (managerReviewStatus === 'complete') completedStages++;

  const progressPercent = Math.round((completedStages / totalStages) * 100);

  const type = activeCycleType || (pendingSelfAssessments && pendingSelfAssessments[0]?.cycleType) || '';
  const typeLabel = type.toLowerCase() === 'yearly' ? 'Yearly' : (type.toLowerCase() === 'half_yearly' ? 'Half-Yearly' : 'Quarterly');

  const checklistItems = [
    {
      label: 'Complete Profile & Activation',
      desc: 'Verify department, designation and contact info.',
      status: 'complete',
      icon: <CheckCircle2 size={16} className="text-emerald-600" />,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      action: null
    },
    {
      label: 'Add Core Skills',
      desc: skillsCount > 0 ? `Listed ${skillsCount} skills in your matrix.` : 'List your core competencies and rating levels.',
      status: skillsCount > 0 ? 'complete' : 'warning',
      icon: skillsCount > 0 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-amber-600" />,
      badgeClass: skillsCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
      action: skillsCount > 0 ? null : {
        text: 'Add Skills',
        link: '/skills'
      }
    },
    {
      label: 'Upload Certifications',
      desc: certificationsCount > 0 ? `Registered ${certificationsCount} professional credentials.` : 'Upload professional credentials and PDF proof.',
      status: certificationsCount > 0 ? 'complete' : 'warning',
      icon: certificationsCount > 0 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-amber-600" />,
      badgeClass: certificationsCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
      action: certificationsCount > 0 ? null : {
        text: 'Upload Certificates',
        link: '/certifications'
      }
    },
    {
      label: 'Verify Reporting Manager',
      desc: managerVerified ? `Reporting directly to ${profile?.managerId?.firstName} ${profile?.managerId?.lastName}.` : 'No direct reporting manager assigned.',
      status: managerVerified ? 'complete' : 'danger',
      icon: managerVerified ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />,
      badgeClass: managerVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100',
      action: null
    },
    {
      label: 'Evidence Confirmation',
      desc: selfAssessmentStatus === 'none' 
        ? 'No active review cycles at this time.' 
        : selfAssessmentStatus === 'pending'
        ? 'Review and confirm your automatically collected evidence.'
        : 'Evidence successfully confirmed.',
      status: selfAssessmentStatus === 'submitted' ? 'complete' : selfAssessmentStatus === 'pending' ? 'warning' : 'locked',
      icon: selfAssessmentStatus === 'submitted' 
        ? <CheckCircle2 size={16} className="text-emerald-600" /> 
        : selfAssessmentStatus === 'pending'
        ? <AlertCircle size={16} className="text-amber-600" />
        : <Lock size={16} className="text-slate-400" />,
      badgeClass: selfAssessmentStatus === 'submitted'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : selfAssessmentStatus === 'pending'
        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
        : 'bg-slate-50 text-slate-500 border-slate-100',
      action: selfAssessmentStatus === 'pending' ? {
        text: 'Confirm Evidence',
        link: `/review/confirm/${activeCycleId}`
      } : null
    },
    {
      label: 'Manager Evaluation',
      desc: managerReviewStatus === 'none'
        ? 'Awaiting self-assessment completion.'
        : managerReviewStatus === 'waiting'
        ? 'Awaiting manager feedback and KPI scores.'
        : 'Manager score finalized.',
      status: managerReviewStatus === 'complete' ? 'complete' : managerReviewStatus === 'waiting' ? 'pending' : 'locked',
      icon: managerReviewStatus === 'complete' 
        ? <CheckCircle2 size={16} className="text-emerald-600" /> 
        : managerReviewStatus === 'waiting'
        ? <Clock size={16} className="text-sky-600" />
        : <Lock size={16} className="text-slate-400" />,
      badgeClass: managerReviewStatus === 'complete'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : managerReviewStatus === 'waiting'
        ? 'bg-sky-50 text-sky-700 border-sky-100 animate-pulse'
        : 'bg-slate-50 text-slate-500 border-slate-100',
      action: null
    },
    {
      label: 'Final Performance result',
      desc: finalScoreFinalized 
        ? `Result published! Final Grade: ${finalScore} (${ratingBand})` 
        : 'Locked until review cycle ends.',
      status: finalScoreFinalized ? 'complete' : 'locked',
      icon: finalScoreFinalized ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Lock size={16} className="text-slate-400" />,
      badgeClass: finalScoreFinalized ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100',
      action: finalScoreFinalized ? {
        text: 'View Performance',
        link: `/reports/employee/${user.id}`
      } : null
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-xs text-slate-800">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
              Overview Dashboard
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-400 text-xs mt-1.5">
            <span className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-800 text-[10px]">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
              Department: <strong className="text-slate-200">{profile?.departmentId?.departmentName || 'N/A'}</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-800 text-[10px]">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
              Designation: <strong className="text-slate-200">{profile?.designationId?.designationName || 'N/A'}</strong>
            </span>
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
          {profile?.managerId && (
            <div className="bg-slate-900/90 border border-slate-850 p-3 rounded-2xl text-[10px] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm">
                {profile.managerId.firstName?.[0]}{profile.managerId.lastName?.[0]}
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Reporting Manager</p>
                <p className="text-slate-200 font-black mt-0.5">{profile.managerId.firstName} {profile.managerId.lastName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bento Grid: Journey Checklist (2/3) + Punch Card (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Your Journey Checklist Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col space-y-6 self-start w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-50 rounded-xl text-sky-700">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-850 text-sm">Your PerfoNext Journey</h3>
                <p className="text-[11px] text-slate-400">Track and complete your employee lifecycle tasks</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[9px]">Setup & Evaluation Progress</span>
              <span className="font-black text-sky-700 text-[11px]">{progressPercent}% Completed</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-600 to-indigo-600 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist list */}
          <div className="space-y-3.5">
            {checklistItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 ${
                  item.status === 'locked' 
                    ? 'border-slate-100 opacity-55 bg-slate-50/30' 
                    : 'border-slate-200 bg-white hover:border-sky-500/30 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${item.badgeClass}`}>
                    {item.icon}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`font-black text-xs truncate ${item.status === 'locked' ? 'text-slate-400' : 'text-slate-800'}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{item.desc}</p>
                  </div>
                </div>

                {item.action && (
                  <Link
                    to={item.action.link}
                    className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {item.action.text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Punch Card — right sidebar */}
        <div className="flex flex-col gap-5 self-start w-full">
          <PunchCard />

          {/* Recent Alerts — stacked below PunchCard */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                  <Bell size={16} />
                </div>
                <h3 className="font-extrabold text-slate-850 text-sm">Recent Alerts</h3>
              </div>
              <Link to="/notifications" className="text-[10px] font-black text-sky-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 pt-1 scrollbar-thin">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center italic">No new notifications.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n._id} className="text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                    <p className="text-slate-700 leading-normal font-semibold">{n.message}</p>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score History Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-700">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850 text-sm">Performance Scores History</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Ratings finalized across cycles</p>
            </div>
          </div>
        </div>

        {reviewScores.length === 0 ? (
          <div className="py-12 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <p className="text-slate-400 text-xs italic">No completed reviews found in your history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 bg-slate-50/80">
                  <th className="py-3.5 px-4 rounded-l-lg">Cycle</th>
                  <th className="py-3.5 px-4">Final Score</th>
                  <th className="py-3.5 px-4">Rating band</th>
                  <th className="py-3.5 px-4">Finalized On</th>
                  <th className="py-3.5 px-4 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewScores.map((score) => (
                  <tr key={score._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {score.reviewCycleId ? score.reviewCycleId.reviewMonth : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-sky-700 text-sm">{score.finalScore}</span>
                      <span className="text-slate-400 text-[10px]"> / 5.0</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                        score.finalScore >= 4.0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        score.finalScore >= 3.0 ? 'bg-sky-50 text-sky-700 border-sky-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {score.rating}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {new Date(score.calculatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/reports/employee/${user.id}`}
                        className="inline-flex items-center gap-1 font-extrabold text-sky-600 hover:text-sky-850 text-[11px]"
                      >
                        <span>Full Report</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
