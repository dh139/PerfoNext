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
      label: `${typeLabel} Evidence Confirmation`,
      desc: selfAssessmentStatus === 'none' 
        ? 'No active review cycles at this time.' 
        : selfAssessmentStatus === 'pending'
        ? 'Review and confirm your automatically collected evidence.'
        : `${typeLabel} evidence successfully confirmed.`,
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
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Department: <span className="text-slate-300 font-semibold">{profile?.departmentId?.departmentName || 'N/A'}</span> | Designation: <span className="text-slate-300 font-semibold">{profile?.designationId?.designationName || 'N/A'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={onAddWorkLogClick}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-955 font-black text-xs px-4.5 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Log Daily Work</span>
          </button>
          {profile?.managerId && (
            <div className="bg-slate-800/80 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
              <p className="text-slate-400 font-medium">Reporting Manager</p>
              <p className="text-slate-200 font-bold mt-0.5">{profile.managerId.firstName} {profile.managerId.lastName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bento Grid: Journey Checklist (2/3) + Punch Card (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Journey Checklist Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-700">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Your PerfoNext Journey</h3>
                <p className="text-[11px] text-slate-500">Track and complete your employee lifecycle tasks</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Setup & Evaluation Progress</span>
              <span className="font-extrabold text-sky-700 text-[11px]">{progressPercent}% Completed</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-600 to-indigo-600 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist list */}
          <div className="flex-1 space-y-3">
            {checklistItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-3.5 border rounded-xl transition-all duration-200 ${
                  item.status === 'locked' 
                    ? 'border-slate-100 opacity-60 bg-slate-50/50' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className={`p-2 rounded-xl border shrink-0 ${item.badgeClass}`}>
                    {item.icon}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`font-bold text-[12px] truncate ${item.status === 'locked' ? 'text-slate-400' : 'text-slate-700'}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                  </div>
                </div>

                {item.action && (
                  <Link
                    to={item.action.link}
                    className="shrink-0 bg-sky-700 hover:bg-sky-850 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    {item.action.text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Punch Card — right sidebar */}
        <div className="flex flex-col gap-5">
          <PunchCard />

          {/* Recent Alerts — stacked below PunchCard */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                  <Bell size={16} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Alerts</h3>
              </div>
              <Link to="/notifications" className="text-[11px] font-semibold text-sky-700 hover:underline">
                View All
              </Link>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-48">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center">No new notifications.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n._id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <p className="text-slate-700 leading-normal">{n.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score History Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Performance Scores History</h3>
              <p className="text-[11px] text-slate-500 font-medium">Ratings finalized across cycles</p>
            </div>
          </div>
        </div>

        {reviewScores.length === 0 ? (
          <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-slate-500 text-xs">No completed reviews found in your history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-lg">Cycle</th>
                  <th className="py-3 px-4">Final Score</th>
                  <th className="py-3 px-4">Rating band</th>
                  <th className="py-3 px-4">Finalized On</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewScores.map((score) => (
                  <tr key={score._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {score.reviewCycleId ? score.reviewCycleId.reviewMonth : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-sky-700 text-sm">{score.finalScore}</span>
                      <span className="text-slate-400 text-[10px]"> / 5.0</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        score.finalScore >= 4.0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        score.finalScore >= 3.0 ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {score.rating}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(score.calculatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/reports/employee/${user.id}`}
                        className="inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-800 text-[11px]"
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
