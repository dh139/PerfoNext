import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import {
  User,
  Calendar,
  AlertCircle,
  FileText,
  Users,
  ChevronRight,
  Activity,
  Briefcase,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Bell,
  ClipboardList,
  Lock,
  Unlock,
  BookOpen,
  Check,
  ShieldCheck,
  Trophy,
  Award,
  TrendingUp,
  ExternalLink,
  Medal,
  Eye,
  Search
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/dashboard/stats');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboard();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Gathering analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-center gap-3">
        <AlertCircle className="text-rose-600" />
        <span>{error}</span>
      </div>
    );
  }

  // Choose sub-dashboard based on role
  if (user?.role === 'employee') {
    return <EmployeeDashboard data={data} user={user} />;
  } else if (user?.role === 'manager') {
    return <ManagerDashboard data={data} user={user} />;
  } else if (user?.role === 'executive') {
    return <ExecutiveDashboard data={data} user={user} />;
  } else if (user?.role === 'hr' || user?.role === 'admin') {
    return <HRDashboard data={data} user={user} />;
  }

  return (
    <div className="p-6 bg-amber-50 text-amber-800 rounded-lg">
      Role Dashboard not defined.
    </div>
  );
};

// ==================== SUB-DASHBOARD: EMPLOYEE ====================

const EmployeeDashboard = ({ data, user }) => {
  const navigate = useNavigate();
  const {
    profile,
    pendingSelfAssessments,
    reviewScores,
    notifications,
    skillsCount = 0,
    certificationsCount = 0,
    managerVerified = false,
    selfAssessmentStatus = 'none',
    managerReviewStatus = 'none',
    finalScoreFinalized = false,
    finalScore = null,
    ratingBand = null,
    activeCycleId = null
  } = data;

  // Lifecycle journey calculation
  const totalStages = 6;
  let completedStages = 1; // Profile is always completed
  if (skillsCount > 0) completedStages++;
  if (certificationsCount > 0) completedStages++;
  if (managerVerified) completedStages++;
  if (selfAssessmentStatus === 'submitted') completedStages++;
  if (managerReviewStatus === 'complete') completedStages++;

  const progressPercent = Math.round((completedStages / totalStages) * 100);

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
      label: 'Self Assessment',
      desc: selfAssessmentStatus === 'none' 
        ? 'No active review cycles at this time.' 
        : selfAssessmentStatus === 'pending'
        ? 'Evaluate your KPIs and add self-comments.'
        : 'Self assessment successfully submitted.',
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
        text: 'Continue Review',
        link: `/assessment/${activeCycleId}`
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
        {profile?.managerId && (
          <div className="bg-slate-800/80 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
            <p className="text-slate-400 font-medium">Reporting Manager</p>
            <p className="text-slate-200 font-bold mt-0.5">{profile.managerId.firstName} {profile.managerId.lastName}</p>
          </div>
        )}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Journey Checklist Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-700">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Your EPTS Journey</h3>
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

        {/* Notifications Sidebar inside Bento Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                <Bell size={18} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Recent Alerts</h3>
            </div>
            <Link to="/notifications" className="text-[11px] font-semibold text-sky-700 hover:underline">
              View All
            </Link>
          </div>

          <div className="flex-1 space-y-4">
            {notifications.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No new notifications.</p>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className="text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-slate-700 leading-normal">{n.message}</p>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Score History Section */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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
    </div>
  );
};

// ==================== SUB-DASHBOARD: MANAGER ====================

const ManagerDashboard = ({ data, user }) => {
  const { teamCount, pendingManagerReviews, pendingSelfAssessmentsFromSubordinates, teamScores, pendingSelfAssessments } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Self Assessment Action Banner */}
      {pendingSelfAssessments && pendingSelfAssessments.length > 0 && (
        <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-400/30">Action Required</span>
              <h3 className="font-bold text-sm">Your Self Assessment Pending ({pendingSelfAssessments[0].reviewMonth})</h3>
            </div>
            <p className="text-xs text-sky-200 mt-1">Please complete your self-evaluation for the active review cycle.</p>
          </div>
          <Link
            to={`/assessment/${pendingSelfAssessments[0].cycleId}`}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow transition-colors shrink-0"
          >
            Start Self Assessment &rarr;
          </Link>
        </div>
      )}

      {/* Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Direct Reportees</p>
            <h2 className="text-3xl font-extrabold text-white mt-2">{teamCount} Employees</h2>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-400">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Awaiting Manager Review</p>
            <h2 className="text-3xl font-extrabold text-slate-800 mt-2">
              {pendingManagerReviews.filter(r => r.isEmployeeSubmitted).length}
            </h2>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Self-Assessment</p>
            <h2 className="text-3xl font-extrabold text-slate-800 mt-2">{pendingSelfAssessmentsFromSubordinates.length}</h2>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-700">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Reviews Table */}
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

        {/* Team Ratings Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
              <Activity size={18} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Recent Team Ratings</h3>
          </div>

          <div className="flex-1 space-y-4">
            {teamScores.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No scores computed yet.</p>
            ) : (
              teamScores.map((score) => (
                <div key={score._id} className="text-xs flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
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
  );
};

// ==================== SUB-DASHBOARD: HR & EXECUTIVE ====================

const HRDashboard = ({ data, user }) => {
  const { stats, activeCycleMetrics, scoreDistribution, recentAudits, pendingManagerReviews, pendingSelfAssessments } = data;
  const [expandedCycleId, setExpandedCycleId] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});
  const [statusFilters, setStatusFilters] = useState({});
  const [currentPages, setCurrentPages] = useState({});

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Self Assessment Action Banner (If CEO/HR/Manager has pending self assessment) */}
      {pendingSelfAssessments && pendingSelfAssessments.length > 0 && (
        <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-400/30">Action Required</span>
              <h3 className="font-bold text-sm">Your Self Assessment Pending ({pendingSelfAssessments[0].reviewMonth})</h3>
            </div>
            <p className="text-xs text-sky-200 mt-1">Please complete your self-evaluation for the active review cycle.</p>
          </div>
          <Link
            to={`/assessment/${pendingSelfAssessments[0].cycleId}`}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow transition-colors shrink-0"
          >
            Start Self Assessment &rarr;
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Employees</p>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalUsers}</h2>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-700">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Departments</p>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalDepartments}</h2>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-700">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">KPI Templates</p>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalTemplates}</h2>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
            <Briefcase size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">People Managers</p>
            <h2 className="text-2xl font-extrabold text-white mt-1">{stats.totalManagers}</h2>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-300">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Direct Reportees Evaluations Pending Block for CEO / HR / Manager */}
      {pendingManagerReviews && pendingManagerReviews.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Direct Reportees Evaluations Pending</h3>
              <p className="text-[11px] text-slate-500">Grade submitted self-assessments from managers & HR reportees</p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingManagerReviews.map((item) => (
              <div
                key={`${item.employee._id}-${item.cycleId}`}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">
                    {item.employee.firstName} {item.employee.lastName}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Role: <span className="font-semibold text-sky-700 uppercase">{item.employee.role}</span> | Cycle: <span className="font-semibold text-slate-600">{item.cycleMonth}</span> | Status: {' '}
                    <span className={`font-semibold ${item.isEmployeeSubmitted ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {item.isEmployeeSubmitted ? 'Self Submitted' : 'Self Assessment Pending'}
                    </span>
                  </p>
                </div>
                <div>
                  {item.isEmployeeSubmitted ? (
                    <Link
                      to={`/review/${item.cycleId}/${item.employee._id}`}
                      className="inline-block bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
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
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Cycles Progress bars */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-sky-50 rounded-lg text-sky-700">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Active Review Cycles Progress</h3>
              <p className="text-[11px] text-slate-500">Submission rates in current periods</p>
            </div>
          </div>

          {activeCycleMetrics.length === 0 ? (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-slate-500 text-xs">No active review cycles found.</p>
              <Link to="/hr/cycles" className="text-xs text-sky-700 hover:underline font-bold mt-2 inline-block">
                Configure a new cycle
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {activeCycleMetrics.map((item) => {
                const isCEO = user?.role === 'executive';
                const isHR = user?.role === 'hr';

                // Filter participants based on role view
                const visibleSubmissions = item.submissions?.filter(sub => {
                  if (isCEO) return sub.role === 'manager' || sub.role === 'hr';
                  if (isHR) return sub.role === 'employee';
                  return true;
                }) || [];

                const participantCount = isCEO ? item.managerCount : (isHR ? item.employeeCount : item.totalEmployees);
                const totalCount = visibleSubmissions.length;
                const selfCount = visibleSubmissions.filter(s => s.selfSubmitted).length;
                const mgrCount = visibleSubmissions.filter(s => s.managerSubmitted).length;

                const selfPercent = totalCount > 0 ? Math.round((selfCount / totalCount) * 100) : 0;
                const mgrPercent = totalCount > 0 ? Math.round((mgrCount / totalCount) * 100) : 0;
                const completePercent = totalCount > 0 ? Math.round((visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / totalCount) * 100) : 0;

                return (
                  <div key={item.cycleId} className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-5 hover:border-slate-200 hover:shadow-xs transition-all duration-300 mb-6 last:mb-0">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100 inline-block mb-1">
                          Cycle Month: {item.reviewMonth}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm">
                          Dept: {item.departmentName} <span className="font-medium text-slate-500">({item.templateName})</span>
                        </h4>
                      </div>
                      <span className="text-slate-600 font-bold bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] self-start sm:self-auto shadow-2xs">
                        {participantCount} Active {isCEO ? 'Reporting Managers' : (isHR ? 'Employees' : 'Users')}
                      </span>
                    </div>

                    {/* Split layout: radial completion gauge + progress detail bars */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Left side: radial completion gauge */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs h-full min-h-[140px]">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-slate-100"
                              strokeWidth="7"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-emerald-500 transition-all duration-500"
                              strokeWidth="7"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={2 * Math.PI * 38 - (completePercent / 100) * (2 * Math.PI * 38)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-extrabold text-slate-800 leading-none">{completePercent}%</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Completed</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">Overall Progress</p>
                      </div>

                      {/* Right side: Phase 1 & 2 details */}
                      <div className="md:col-span-8 space-y-3.5">
                        {/* Phase 1: Self-Assessment */}
                        <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-sky-50 text-sky-700 rounded-lg border border-sky-100">
                                <User size={14} />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight">
                                  1. {isCEO ? 'Reporting Manager Self-Assessment' : 'Employee Self-Assessment'}
                                </h4>
                                <span className="text-[9px] text-slate-400 font-medium">Phase 1: Submission Stage</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-sky-700 block leading-tight">{selfPercent}%</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{selfCount} of {totalCount} Submitted</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-sky-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${selfPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Phase 2: Evaluation */}
                        <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                                <ShieldCheck size={14} />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight">
                                  2. {isCEO ? 'CEO Evaluation & Grading' : 'Reporting Manager Review'}
                                </h4>
                                <span className="text-[9px] text-slate-400 font-medium">Phase 2: Review Stage</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-700 block leading-tight">{mgrPercent}%</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{mgrCount} of {totalCount} Evaluated</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${mgrPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Submissions Breakdown Table */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setExpandedCycleId(expandedCycleId === item.cycleId ? null : item.cycleId)}
                        className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>
                          {expandedCycleId === item.cycleId
                            ? 'Hide Participant Submissions Breakdown'
                            : 'View Participant Submissions Breakdown'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">({visibleSubmissions.length} participants)</span>
                      </button>

                      {expandedCycleId === item.cycleId && (() => {
                        const cycleSearch = searchTerms[item.cycleId] || '';
                        const cycleFilter = statusFilters[item.cycleId] || 'all';
                        const cyclePage = currentPages[item.cycleId] || 1;

                        const filteredSubmissions = visibleSubmissions.filter(sub => {
                          const matchesSearch = `${sub.firstName} ${sub.lastName} ${sub.employeeCode} ${sub.departmentName || ''}`.toLowerCase().includes(cycleSearch.toLowerCase());
                          
                          let matchesStatus = true;
                          if (cycleFilter === 'pending_self') {
                            matchesStatus = !sub.selfSubmitted;
                          } else if (cycleFilter === 'pending_manager') {
                            matchesStatus = sub.selfSubmitted && !sub.managerSubmitted;
                          } else if (cycleFilter === 'completed') {
                            matchesStatus = sub.selfSubmitted && sub.managerSubmitted;
                          }
                          
                          return matchesSearch && matchesStatus;
                        });

                        const itemsPerPage = 5;
                        const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
                        const paginatedSubmissions = filteredSubmissions.slice((cyclePage - 1) * itemsPerPage, cyclePage * itemsPerPage);

                        return (
                          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 animate-fade-in text-xs">
                            {/* Filter and Search Controls */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-100/80 p-2.5 rounded-lg">
                              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 w-full sm:w-64 text-[11px]">
                                <Search size={12} className="text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search participant..."
                                  value={cycleSearch}
                                  onChange={(e) => {
                                    setSearchTerms(prev => ({ ...prev, [item.cycleId]: e.target.value }));
                                    setCurrentPages(prev => ({ ...prev, [item.cycleId]: 1 }));
                                  }}
                                  className="bg-transparent text-[11px] text-slate-800 outline-none w-full"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-[10px]">
                                <span className="text-slate-400 font-extrabold uppercase tracking-wide">Status:</span>
                                <select
                                  value={cycleFilter}
                                  onChange={(e) => {
                                    setStatusFilters(prev => ({ ...prev, [item.cycleId]: e.target.value }));
                                    setCurrentPages(prev => ({ ...prev, [item.cycleId]: 1 }));
                                  }}
                                  className="bg-white border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-700 outline-none cursor-pointer"
                                >
                                  <option value="all">All ({visibleSubmissions.length})</option>
                                  <option value="pending_self">Pending Self ({visibleSubmissions.filter(s => !s.selfSubmitted).length})</option>
                                  <option value="pending_manager">Pending Review ({visibleSubmissions.filter(s => s.selfSubmitted && !s.managerSubmitted).length})</option>
                                  <option value="completed">Completed ({visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length})</option>
                                </select>
                              </div>
                            </div>

                            {/* Table */}
                            {filteredSubmissions.length === 0 ? (
                              <p className="text-slate-400 text-center py-6">No matching participants found.</p>
                            ) : (
                              <>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs min-w-[500px]">
                                    <thead>
                                      <tr className="text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-200">
                                        <th className="pb-2">Participant</th>
                                        <th className="pb-2">Self Assessment</th>
                                        <th className="pb-2">Reporting Manager Review</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {paginatedSubmissions.map(sub => (
                                        <tr key={sub.employeeId} className="hover:bg-slate-100/30">
                                          <td className="py-2 font-bold text-slate-800">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span>{sub.firstName} {sub.lastName}</span>
                                              {sub.role === 'manager' && (
                                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100/90 text-emerald-800 border border-emerald-300 rounded">
                                                  Reporting Manager
                                                </span>
                                              )}
                                              {sub.role === 'hr' && (
                                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 rounded">
                                                  HR Manager
                                                </span>
                                              )}
                                              {sub.role === 'employee' && (
                                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded">
                                                  Employee
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[9px] text-slate-400 block font-normal mt-0.5">{sub.employeeCode}</span>
                                            <span className="text-[9px] text-sky-700 block font-bold mt-0.5">Dept: {sub.departmentName} | Desg: {sub.designationName}</span>
                                            <span className="text-[9px] text-slate-500 block font-normal mt-0.5">Manager: {sub.managerName}</span>
                                            <Link
                                              to={`/reports/employee/${sub.employeeId}`}
                                              className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 hover:text-sky-900 hover:underline mt-1"
                                            >
                                              <Eye size={10} />
                                              <span>View Report</span>
                                            </Link>
                                          </td>
                                          <td className="py-2">
                                            {sub.selfSubmitted ? (
                                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <CheckCircle2 size={12} />
                                                <span>Submitted {sub.selfSubmittedAt ? `(${new Date(sub.selfSubmittedAt).toLocaleDateString()})` : ''}</span>
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                <Clock size={12} />
                                                <span>Pending</span>
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2">
                                            {sub.managerSubmitted ? (
                                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <CheckCircle2 size={12} />
                                                <span>Submitted {sub.managerSubmittedAt ? `(${new Date(sub.managerSubmittedAt).toLocaleDateString()})` : ''}</span>
                                              </span>
                                            ) : sub.selfSubmitted ? (
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                  <Clock size={12} />
                                                  <span>Pending Review</span>
                                                </span>
                                                {(user?.role === 'executive' || user?.role === 'manager' || user?.role === 'hr') && (
                                                  <Link
                                                    to={`/review/${item.cycleId}/${sub.employeeId}`}
                                                    className="inline-block bg-sky-700 hover:bg-sky-800 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-sm transition-colors cursor-pointer"
                                                  >
                                                    Grade Review
                                                  </Link>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                <Clock size={12} />
                                                <span>Waiting for Self</span>
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 mt-2 text-[10px]">
                                    <span className="text-slate-400">
                                      Showing {(cyclePage - 1) * itemsPerPage + 1} to {Math.min(filteredSubmissions.length, cyclePage * itemsPerPage)} of {filteredSubmissions.length} entries
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        disabled={cyclePage === 1}
                                        onClick={() => setCurrentPages(prev => ({ ...prev, [item.cycleId]: cyclePage - 1 }))}
                                        className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        Prev
                                      </button>
                                      <span className="px-1.5 text-slate-600 font-bold">
                                        {cyclePage} / {totalPages}
                                      </span>
                                      <button
                                        disabled={cyclePage === totalPages}
                                        onClick={() => setCurrentPages(prev => ({ ...prev, [item.cycleId]: cyclePage + 1 }))}
                                        className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        Next
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Log Activities Sidebar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <Activity size={18} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Recent Audit Activities</h3>
          </div>

          <div className="flex-1 space-y-4">
            {recentAudits.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No system logs available.</p>
            ) : (
              recentAudits.map((log) => (
                <div key={log._id} className="text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">
                      {log.userId?.firstName} {log.userId?.lastName}
                    </span>
                    <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded text-white ${
                      log.action === 'login' ? 'bg-slate-700' :
                      log.action === 'score_change' ? 'bg-indigo-600' :
                      log.action === 'review_update' ? 'bg-amber-600' : 'bg-sky-600'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1 leading-normal">
                    Modified {log.entityType} ID: {log.entityId.substring(0, 8)}...
                  </p>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== SUB-DASHBOARD: EXECUTIVE (CEO) ====================

const ExecutiveDashboard = ({ data, user }) => {
  const {
    stats,
    activeCycleMetrics = [],
    pendingManagerReviews = [],
    pendingSelfAssessments = [],
    topEmployeesRanking = [],
    topManagersRanking = [],
    recentAudits = []
  } = data;

  const [expandedCycleId, setExpandedCycleId] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});
  const [statusFilters, setStatusFilters] = useState({});
  const [currentPages, setCurrentPages] = useState({});

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Self Assessment Action Banner */}
      {pendingSelfAssessments && pendingSelfAssessments.length > 0 && (
        <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-400/30">Action Required</span>
              <h3 className="font-bold text-sm">Your Self Assessment Pending ({pendingSelfAssessments[0].reviewMonth})</h3>
            </div>
            <p className="text-xs text-sky-200 mt-1">Please complete your self-evaluation for the active review cycle.</p>
          </div>
          <Link
            to={`/assessment/${pendingSelfAssessments[0].cycleId}`}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow transition-colors shrink-0"
          >
            Start Self Assessment &rarr;
          </Link>
        </div>
      )}

      {/* Executive Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Active Staff</p>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalUsers}</h2>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-700">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Reporting Managers</p>
            <h2 className="text-2xl font-extrabold text-white mt-1">{stats.totalManagers}</h2>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-300">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Departments</p>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalDepartments}</h2>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-700">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Review Templates</p>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalTemplates}</h2>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
            <Briefcase size={20} />
          </div>
        </div>
      </div>

      {/* Direct Reportees Evaluations Pending Block for CEO */}
      {pendingManagerReviews && pendingManagerReviews.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Direct Subordinates Evaluations Pending</h3>
              <p className="text-[11px] text-slate-500">Grade submitted self-assessments from reporting managers & HRs</p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingManagerReviews.map((item) => (
              <div
                key={`${item.employee._id}-${item.cycleId}`}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-wrap gap-3"
              >
                <div>
                  <p className="font-bold text-slate-800">
                    {item.employee.firstName} {item.employee.lastName}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Role: <span className="font-semibold text-sky-700 uppercase">{item.employee.role}</span> | Cycle: <span className="font-semibold text-slate-600">{item.cycleMonth}</span> | Status: {' '}
                    <span className={`font-semibold ${item.isEmployeeSubmitted ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {item.isEmployeeSubmitted ? 'Self Submitted' : 'Self Assessment Pending'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/reports/employee/${item.employee._id}`}
                    className="inline-flex items-center gap-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>View Report</span>
                  </Link>

                  {item.isEmployeeSubmitted ? (
                    <Link
                      to={`/review/${item.cycleId}/${item.employee._id}`}
                      className="inline-block bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
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
        </div>
      )}

      {/* Leaderboards Grid (Ranking-Wise Performance Display) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Employees Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-700">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Top Performing Employees</h3>
                <p className="text-[11px] text-slate-500">Ranking by final evaluation score</p>
              </div>
            </div>
            <span className="text-[9px] uppercase font-extrabold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
              Employee Ranking
            </span>
          </div>

          {topEmployeesRanking.length === 0 ? (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center flex-1 flex flex-col justify-center items-center">
              <p className="text-slate-400 text-xs">No evaluated employee scores available yet.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {topEmployeesRanking.map((score, index) => (
                <div
                  key={score._id}
                  className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      index === 0 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                      index === 1 ? 'bg-slate-300 text-slate-800' :
                      index === 2 ? 'bg-amber-700/20 text-amber-800' : 'bg-slate-200/60 text-slate-600'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {score.employeeId?.firstName} {score.employeeId?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Cycle: {score.reviewCycleId?.reviewMonth}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-extrabold text-sky-700 text-sm">{score.finalScore} / 5.0</span>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">{score.rating}</p>
                    </div>

                    <Link
                      to={`/reports/employee/${score.employeeId?._id}`}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 rounded-lg shadow-2xs transition-colors"
                      title="View Report"
                    >
                      <Eye size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Reporting Managers Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <Medal size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Top Reporting Managers & HRs</h3>
                <p className="text-[11px] text-slate-500">Ranking by CEO evaluation score</p>
              </div>
            </div>
            <span className="text-[9px] uppercase font-extrabold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100">
              Manager Ranking
            </span>
          </div>

          {topManagersRanking.length === 0 ? (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center flex-1 flex flex-col justify-center items-center">
              <p className="text-slate-400 text-xs">No evaluated manager scores available yet.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {topManagersRanking.map((score, index) => (
                <div
                  key={score._id}
                  className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      index === 0 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                      index === 1 ? 'bg-slate-300 text-slate-800' :
                      index === 2 ? 'bg-amber-700/20 text-amber-800' : 'bg-slate-200/60 text-slate-600'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800">
                          {score.employeeId?.firstName} {score.employeeId?.lastName}
                        </p>
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          {score.employeeId?.role === 'hr' ? 'HR Manager' : 'Reporting Manager'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Cycle: {score.reviewCycleId?.reviewMonth}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-700 text-sm">{score.finalScore} / 5.0</span>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">{score.rating}</p>
                    </div>

                    <Link
                      to={`/reports/employee/${score.employeeId?._id}`}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 rounded-lg shadow-2xs transition-colors"
                      title="View Report"
                    >
                      <Eye size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Review Cycles Progress Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-sky-50 rounded-lg text-sky-700">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Active Review Cycles Progress</h3>
              <p className="text-[11px] text-slate-500">Submission rates in current periods</p>
            </div>
          </div>

          {activeCycleMetrics.length === 0 ? (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-slate-500 text-xs">No active review cycles found.</p>
              <Link to="/hr/cycles" className="text-xs text-sky-700 hover:underline font-bold mt-2 inline-block">
                Configure a new cycle
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {activeCycleMetrics.map((item) => {
                const visibleSubmissions = item.submissions?.filter(sub => sub.role === 'manager' || sub.role === 'hr') || [];
                const participantCount = item.managerCount;

                const totalCount = visibleSubmissions.length;
                const selfCount = visibleSubmissions.filter(s => s.selfSubmitted).length;
                const mgrCount = visibleSubmissions.filter(s => s.managerSubmitted).length;

                const selfPercent = totalCount > 0 ? Math.round((selfCount / totalCount) * 100) : 0;
                const mgrPercent = totalCount > 0 ? Math.round((mgrCount / totalCount) * 100) : 0;
                const completePercent = totalCount > 0 ? Math.round((visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / totalCount) * 100) : 0;

                return (
                  <div key={item.cycleId} className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-5 hover:border-slate-200 hover:shadow-xs transition-all duration-300 mb-6 last:mb-0">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100 inline-block mb-1">
                          Cycle Month: {item.reviewMonth}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm">
                          Dept: {item.departmentName} <span className="font-medium text-slate-500">({item.templateName})</span>
                        </h4>
                      </div>
                      <span className="text-slate-600 font-bold bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] self-start sm:self-auto shadow-2xs">
                        {participantCount} Active Reporting Managers
                      </span>
                    </div>

                    {/* Split layout: radial completion gauge + progress detail bars */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Left side: radial completion gauge */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs h-full min-h-[140px]">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-slate-100"
                              strokeWidth="7"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-emerald-500 transition-all duration-500"
                              strokeWidth="7"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={2 * Math.PI * 38 - (completePercent / 100) * (2 * Math.PI * 38)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-extrabold text-slate-800 leading-none">{completePercent}%</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Completed</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">Overall Progress</p>
                      </div>

                      {/* Right side: Phase 1 & 2 details */}
                      <div className="md:col-span-8 space-y-3.5">
                        {/* Phase 1: Self-Assessment */}
                        <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-sky-50 text-sky-700 rounded-lg border border-sky-100">
                                <User size={14} />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight">
                                  1. Reporting Manager Self-Assessment
                                </h4>
                                <span className="text-[9px] text-slate-400 font-medium">Phase 1: Submission Stage</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-sky-700 block leading-tight">{selfPercent}%</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{selfCount} of {totalCount} Submitted</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-sky-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${selfPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Phase 2: Evaluation */}
                        <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                                <ShieldCheck size={14} />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight">
                                  2. CEO Evaluation & Grading
                                </h4>
                                <span className="text-[9px] text-slate-400 font-medium">Phase 2: Review Stage</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-700 block leading-tight">{mgrPercent}%</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{mgrCount} of {totalCount} Evaluated</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${mgrPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Submissions Breakdown Table */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setExpandedCycleId(expandedCycleId === item.cycleId ? null : item.cycleId)}
                        className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>
                          {expandedCycleId === item.cycleId
                            ? 'Hide Manager Submissions Breakdown'
                            : 'View Manager Submissions Breakdown'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">({visibleSubmissions.length} managers)</span>
                      </button>

                      {expandedCycleId === item.cycleId && (() => {
                        const cycleSearch = searchTerms[item.cycleId] || '';
                        const cycleFilter = statusFilters[item.cycleId] || 'all';
                        const cyclePage = currentPages[item.cycleId] || 1;

                        const filteredSubmissions = visibleSubmissions.filter(sub => {
                          const matchesSearch = `${sub.firstName} ${sub.lastName} ${sub.employeeCode} ${sub.departmentName || ''}`.toLowerCase().includes(cycleSearch.toLowerCase());
                          
                          let matchesStatus = true;
                          if (cycleFilter === 'pending_self') {
                            matchesStatus = !sub.selfSubmitted;
                          } else if (cycleFilter === 'pending_manager') {
                            matchesStatus = sub.selfSubmitted && !sub.managerSubmitted;
                          } else if (cycleFilter === 'completed') {
                            matchesStatus = sub.selfSubmitted && sub.managerSubmitted;
                          }
                          
                          return matchesSearch && matchesStatus;
                        });

                        const itemsPerPage = 5;
                        const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
                        const paginatedSubmissions = filteredSubmissions.slice((cyclePage - 1) * itemsPerPage, cyclePage * itemsPerPage);

                        return (
                          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 animate-fade-in text-xs">
                            {/* Filter and Search Controls */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-100/80 p-2.5 rounded-lg">
                              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 w-full sm:w-64 text-[11px]">
                                <Search size={12} className="text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search participant..."
                                  value={cycleSearch}
                                  onChange={(e) => {
                                    setSearchTerms(prev => ({ ...prev, [item.cycleId]: e.target.value }));
                                    setCurrentPages(prev => ({ ...prev, [item.cycleId]: 1 }));
                                  }}
                                  className="bg-transparent text-[11px] text-slate-800 outline-none w-full"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-[10px]">
                                <span className="text-slate-400 font-extrabold uppercase tracking-wide">Status:</span>
                                <select
                                  value={cycleFilter}
                                  onChange={(e) => {
                                    setStatusFilters(prev => ({ ...prev, [item.cycleId]: e.target.value }));
                                    setCurrentPages(prev => ({ ...prev, [item.cycleId]: 1 }));
                                  }}
                                  className="bg-white border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-700 outline-none cursor-pointer"
                                >
                                  <option value="all">All ({visibleSubmissions.length})</option>
                                  <option value="pending_self">Pending Self ({visibleSubmissions.filter(s => !s.selfSubmitted).length})</option>
                                  <option value="pending_manager">Pending Review ({visibleSubmissions.filter(s => s.selfSubmitted && !s.managerSubmitted).length})</option>
                                  <option value="completed">Completed ({visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length})</option>
                                </select>
                              </div>
                            </div>

                            {/* Table */}
                            {filteredSubmissions.length === 0 ? (
                              <p className="text-slate-400 text-center py-6">No matching participants found.</p>
                            ) : (
                              <>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs min-w-[500px]">
                                    <thead>
                                      <tr className="text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-200">
                                        <th className="pb-2">Participant</th>
                                        <th className="pb-2">Self Assessment</th>
                                        <th className="pb-2">CEO Review</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {paginatedSubmissions.map(sub => (
                                        <tr key={sub.employeeId} className="hover:bg-slate-100/30">
                                          <td className="py-2 font-bold text-slate-800">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span>{sub.firstName} {sub.lastName}</span>
                                              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100/90 text-emerald-800 border border-emerald-300 rounded">
                                                {sub.role === 'hr' ? 'HR Manager' : 'Reporting Manager'}
                                              </span>
                                            </div>
                                            <span className="text-[9px] text-slate-400 block font-normal mt-0.5">{sub.employeeCode}</span>
                                            <span className="text-[9px] text-sky-700 block font-bold mt-0.5">Dept: {sub.departmentName} | Desg: {sub.designationName}</span>
                                            <Link
                                              to={`/reports/employee/${sub.employeeId}`}
                                              className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 hover:text-sky-900 hover:underline mt-1"
                                            >
                                              <Eye size={10} />
                                              <span>View Report</span>
                                            </Link>
                                          </td>
                                          <td className="py-2">
                                            {sub.selfSubmitted ? (
                                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <CheckCircle2 size={12} />
                                                <span>Submitted {sub.selfSubmittedAt ? `(${new Date(sub.selfSubmittedAt).toLocaleDateString()})` : ''}</span>
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                <Clock size={12} />
                                                <span>Pending</span>
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2">
                                            {sub.managerSubmitted ? (
                                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <CheckCircle2 size={12} />
                                                <span>Submitted {sub.managerSubmittedAt ? `(${new Date(sub.managerSubmittedAt).toLocaleDateString()})` : ''}</span>
                                              </span>
                                            ) : sub.selfSubmitted ? (
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                  <Clock size={12} />
                                                  <span>Pending Review</span>
                                                </span>
                                                <Link
                                                  to={`/review/${item.cycleId}/${sub.employeeId}`}
                                                  className="inline-block bg-sky-700 hover:bg-sky-800 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-sm transition-colors cursor-pointer"
                                                >
                                                  Grade Review
                                                </Link>
                                              </div>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                <Clock size={12} />
                                                <span>Waiting for Self</span>
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 mt-2 text-[10px]">
                                    <span className="text-slate-400">
                                      Showing {(cyclePage - 1) * itemsPerPage + 1} to {Math.min(filteredSubmissions.length, cyclePage * itemsPerPage)} of {filteredSubmissions.length} entries
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        disabled={cyclePage === 1}
                                        onClick={() => setCurrentPages(prev => ({ ...prev, [item.cycleId]: cyclePage - 1 }))}
                                        className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        Prev
                                      </button>
                                      <span className="px-1.5 text-slate-600 font-bold">
                                        {cyclePage} / {totalPages}
                                      </span>
                                      <button
                                        disabled={cyclePage === totalPages}
                                        onClick={() => setCurrentPages(prev => ({ ...prev, [item.cycleId]: cyclePage + 1 }))}
                                        className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        Next
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Log Activities Sidebar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <Activity size={18} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Recent Audit Activities</h3>
          </div>

          <div className="flex-1 space-y-4">
            {recentAudits.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No system logs available.</p>
            ) : (
              recentAudits.map((log) => (
                <div key={log._id} className="text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">
                      {log.userId?.firstName} {log.userId?.lastName}
                    </span>
                    <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded text-white ${
                      log.action === 'login' ? 'bg-slate-700' :
                      log.action === 'score_change' ? 'bg-indigo-600' :
                      log.action === 'review_update' ? 'bg-amber-600' : 'bg-sky-600'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1 leading-normal">
                    Modified {log.entityType} ID: {log.entityId.substring(0, 8)}...
                  </p>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
