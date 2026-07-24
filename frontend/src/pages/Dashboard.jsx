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
  Search,
  Plus
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

// ==================== SUB-DASHBOARD: HR & ADMIN ====================

const HRDashboard = ({ data, user }) => {
  const {
    stats = {},
    activeCycleMetrics = [],
    pendingManagerReviews = [],
    pendingSelfAssessments = [],
    topEmployeesRanking = [],
    topManagersRanking = [],
    recentAudits = []
  } = data || {};

  const [activeTab, setActiveTab] = useState('cycles'); // 'cycles', 'direct_reports', 'leaderboard', 'audits'

  // Cycles Tab State
  const [expandedCycleId, setExpandedCycleId] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});
  const [statusFilters, setStatusFilters] = useState({});
  const [currentPages, setCurrentPages] = useState({});

  // Direct Reports Grading State
  const [gradingSearch, setGradingSearch] = useState('');
  const [gradingFilter, setGradingFilter] = useState('all');
  const [gradingPage, setGradingPage] = useState(1);

  // Leaderboard Tab State
  const [leaderboardDept, setLeaderboardDept] = useState('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  // Needs HR Grade Count
  const needsHrGradeCount = pendingManagerReviews.filter(r => r.isEmployeeSubmitted).length;

  // Filter pending reviews for HR direct reportees
  const filteredGradingReviews = pendingManagerReviews.filter(item => {
    const fullName = `${item.employee.firstName} ${item.employee.lastName} ${item.employee.employeeCode}`.toLowerCase();
    const deptName = (item.employee.departmentId?.departmentName || '').toLowerCase();
    const matchesSearch = fullName.includes(gradingSearch.toLowerCase()) || deptName.includes(gradingSearch.toLowerCase());

    let matchesFilter = true;
    if (gradingFilter === 'needs_grade') {
      matchesFilter = item.isEmployeeSubmitted;
    } else if (gradingFilter === 'self_pending') {
      matchesFilter = !item.isEmployeeSubmitted;
    }

    return matchesSearch && matchesFilter;
  });

  const GRADING_PER_PAGE = 5;
  const totalGradingPages = Math.ceil(filteredGradingReviews.length / GRADING_PER_PAGE) || 1;
  const paginatedGradingReviews = filteredGradingReviews.slice(
    (gradingPage - 1) * GRADING_PER_PAGE,
    gradingPage * GRADING_PER_PAGE
  );

  // Filter top rankings by department
  const filteredEmployeesRanking = (topEmployeesRanking || []).filter(score => {
    const deptId = score.employeeId?.departmentId?._id || score.employeeId?.departmentId;
    const matchesDept = leaderboardDept === 'all' || (deptId && deptId.toString() === leaderboardDept.toString());
    const empName = `${score.employeeId?.firstName} ${score.employeeId?.lastName}`.toLowerCase();
    const matchesSearch = empName.includes(leaderboardSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const filteredManagersRanking = (topManagersRanking || []).filter(score => {
    const deptId = score.employeeId?.departmentId?._id || score.employeeId?.departmentId;
    const matchesDept = leaderboardDept === 'all' || (deptId && deptId.toString() === leaderboardDept.toString());
    const mgrName = `${score.employeeId?.firstName} ${score.employeeId?.lastName}`.toLowerCase();
    const matchesSearch = mgrName.includes(leaderboardSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark HR Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30 tracking-wider">
                HR Operations Console
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              HR & Operations Command Desk
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Organization-wide review cycle administration, submission tracking, & workforce performance control desk.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/hr/cycles"
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>New Review Cycle</span>
            </Link>
            <Link
              to="/hr/templates"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            >
              <Briefcase size={16} />
              <span>KPI Templates</span>
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            >
              <Users size={16} />
              <span>User Directory</span>
            </Link>
          </div>
        </div>

        {/* HR Metric Cards (4 Cards Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Employees</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalUsers || 0}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Workforce headcount</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Departments</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalDepartments || 0}</h2>
              <span className="text-[9px] text-indigo-400 font-medium">Active business units</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">KPI Templates</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalTemplates || 0}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Configured frameworks</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Briefcase size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">People Managers</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalManagers || 0}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Reporting leadership</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
          </div>

        </div>
      </div>

      {/* HR Self Assessment Action Banner (Displayed prominent OUTSIDE tabs) */}
      {pendingSelfAssessments && pendingSelfAssessments.length > 0 && (
        <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800 animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">Action Required</span>
              <h3 className="font-bold text-sm">Your HR Self Assessment Pending ({pendingSelfAssessments[0].reviewMonth})</h3>
            </div>
            <p className="text-xs text-sky-200 mt-1">Please complete your self-evaluation for the active review cycle.</p>
          </div>
          <Link
            to={`/assessment/${pendingSelfAssessments[0].cycleId}`}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow transition-colors shrink-0"
          >
            Start Self Assessment &rarr;
          </Link>
        </div>
      )}

      {/* Tabbed HR Control Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('cycles')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'cycles' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={16} />
          <span>Active Review Cycles</span>
          {activeCycleMetrics.length > 0 && (
            <span className="bg-sky-100 text-sky-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
              {activeCycleMetrics.length} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('direct_reports')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'direct_reports' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          <span>Self Assessment & Direct Reports</span>
          {needsHrGradeCount > 0 && (
            <span className="bg-sky-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {needsHrGradeCount} Needs Grade
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'leaderboard' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy size={16} />
          <span>Organizational Leaderboards</span>
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'audits' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity size={16} />
          <span>Audit Trail & Activity</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE REVIEW CYCLES PROGRESS */}
      {activeTab === 'cycles' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Active Review Cycles Progress</h3>
              <p className="text-slate-500 text-xs mt-0.5">Track submission rates across active evaluation periods</p>
            </div>
            <Link to="/hr/cycles" className="text-xs text-sky-700 hover:underline font-bold">
              Manage All Cycles &rarr;
            </Link>
          </div>

          {activeCycleMetrics.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-slate-400 text-xs">No active review cycles currently in progress.</p>
              <Link to="/hr/cycles" className="text-xs text-sky-700 hover:underline font-bold mt-2 inline-block">
                Start a new cycle
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCycleMetrics.map((item) => {
                const visibleSubmissions = item.submissions?.filter(sub => sub.role === 'employee') || [];
                const totalCount = visibleSubmissions.length;
                const selfCount = visibleSubmissions.filter(s => s.selfSubmitted).length;
                const mgrCount = visibleSubmissions.filter(s => s.managerSubmitted).length;
                const completePercent = totalCount > 0 ? Math.round((visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / totalCount) * 100) : 0;

                const selfPercent = totalCount > 0 ? Math.round((selfCount / totalCount) * 100) : 0;
                const mgrPercent = totalCount > 0 ? Math.round((mgrCount / totalCount) * 100) : 0;

                const isExpanded = expandedCycleId === item.cycleId;

                return (
                  <div key={item.cycleId} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-200/80 pb-3">
                      <div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">
                          Cycle Month: {item.reviewMonth}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-xs mt-1">
                          Dept: {item.departmentName}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        {completePercent}% Complete
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Phase 1: Employee Self-Assessment</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selfCount} / {totalCount} ({selfPercent}%)</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Phase 2: Manager Review</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{mgrCount} / {totalCount} ({mgrPercent}%)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedCycleId(isExpanded ? null : item.cycleId)}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition-colors cursor-pointer"
                    >
                      {isExpanded ? 'Hide Employee Breakdown ↑' : `View Employee Breakdown (${visibleSubmissions.length}) ↓`}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 animate-fade-in border-t border-slate-200">
                        {visibleSubmissions.map(sub => (
                          <div key={sub.employeeId} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                            <div>
                              <p className="font-bold text-slate-800">{sub.firstName} {sub.lastName}</p>
                              <p className="text-[10px] text-slate-400">{sub.designationName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                                sub.selfSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                Self: {sub.selfSubmitted ? 'Submitted' : 'Pending'}
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                                sub.managerSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                Manager: {sub.managerSubmitted ? 'Graded' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SELF ASSESSMENT & DIRECT REPORTS GRADING */}
      {activeTab === 'direct_reports' && (
        <div className="space-y-6 animate-fade-in">
          {/* Direct Reportees Evaluation Desk */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Direct Subordinates Evaluation Desk</span>
                  <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                    Direct Reportees ({pendingManagerReviews.length})
                  </span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Grade submitted self-assessments for employees or staff reporting directly to you.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-64">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search reportee..."
                    value={gradingSearch}
                    onChange={(e) => { setGradingSearch(e.target.value); setGradingPage(1); }}
                    className="bg-transparent text-xs text-slate-800 outline-none w-full"
                  />
                </div>

                <select
                  value={gradingFilter}
                  onChange={(e) => { setGradingFilter(e.target.value); setGradingPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Statuses ({pendingManagerReviews.length})</option>
                  <option value="needs_grade">Needs HR Grade ({needsHrGradeCount})</option>
                  <option value="self_pending">Self Assessment Pending ({pendingManagerReviews.length - needsHrGradeCount})</option>
                </select>
              </div>
            </div>

            {paginatedGradingReviews.length === 0 ? (
              <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
                <ShieldCheck className="mx-auto text-slate-300" size={32} />
                <p className="text-slate-500 font-bold text-xs">No direct reportee evaluations match your search filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400">
                      <th className="p-3 pl-4">Reportee Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Cycle Month</th>
                      <th className="p-3 text-center">Self-Assessment Status</th>
                      <th className="p-3 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedGradingReviews.map((item) => (
                      <tr key={`${item.employee._id}-${item.cycleId}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 pl-4">
                          <p className="font-extrabold text-slate-800 text-xs">
                            {item.employee.firstName} {item.employee.lastName}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">{item.employee.employeeCode}</span>
                        </td>

                        <td className="p-3 uppercase font-bold text-sky-700">
                          {item.employee.role}
                        </td>

                        <td className="p-3 font-semibold text-slate-600">
                          {item.cycleMonth}
                        </td>

                        <td className="p-3 text-center">
                          {item.isEmployeeSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                              <CheckCircle2 size={12} />
                              <span>Self Submitted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-semibold">
                              <Clock size={12} />
                              <span>Self Pending</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/reports/employee/${item.employee._id}`}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                              title="View Performance Report"
                            >
                              <Eye size={14} />
                            </Link>

                            {item.isEmployeeSubmitted ? (
                              <Link
                                to={`/review/${item.cycleId}/${item.employee._id}`}
                                className="px-4 py-2 bg-sky-700 hover:bg-sky-850 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                              >
                                Grade Review &rarr;
                              </Link>
                            ) : (
                              <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-semibold cursor-not-allowed">
                                Waiting for Self
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalGradingPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Showing {(gradingPage - 1) * GRADING_PER_PAGE + 1} to {Math.min(filteredGradingReviews.length, gradingPage * GRADING_PER_PAGE)} of {filteredGradingReviews.length} reportees
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={gradingPage === 1}
                    onClick={() => setGradingPage(p => p - 1)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 font-bold text-slate-700">
                    {gradingPage} / {totalGradingPages}
                  </span>
                  <button
                    disabled={gradingPage === totalGradingPages}
                    onClick={() => setGradingPage(p => p + 1)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATIONAL LEADERBOARDS */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-700">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Organizational Performance Rankings</h3>
                <p className="text-slate-500 text-xs">Filter rankings by department or employee name</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-64">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ranking..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none w-full"
                />
              </div>

              <select
                value={leaderboardDept}
                onChange={(e) => setLeaderboardDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                {stats.departmentsList?.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Employees Ranking */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>Top Performing Employees</span>
                </h4>
                <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
                  Staff ({filteredEmployeesRanking.length})
                </span>
              </div>

              {filteredEmployeesRanking.length === 0 ? (
                <p className="text-slate-400 italic text-center py-10">No employee scores recorded matching your filter.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredEmployeesRanking.map((score, index) => (
                    <div
                      key={score._id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          index === 0 ? 'bg-amber-400 text-amber-950' :
                          index === 1 ? 'bg-slate-300 text-slate-800' :
                          index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {score.employeeId?.firstName} {score.employeeId?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Cycle: {score.reviewCycleId?.reviewMonth}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-extrabold text-sky-700 text-sm block">{score.finalScore} / 5.0</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{score.rating}</span>
                        </div>
                        <Link
                          to={`/reports/employee/${score.employeeId?._id}`}
                          className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-700 rounded-xl transition-colors"
                        >
                          <Eye size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Reporting Managers Ranking */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>Top Reporting Managers & HRs</span>
                </h4>
                <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100">
                  Leadership ({filteredManagersRanking.length})
                </span>
              </div>

              {filteredManagersRanking.length === 0 ? (
                <p className="text-slate-400 italic text-center py-10">No manager scores recorded matching your filter.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredManagersRanking.map((score, index) => (
                    <div
                      key={score._id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          index === 0 ? 'bg-amber-400 text-amber-950' :
                          index === 1 ? 'bg-slate-300 text-slate-800' :
                          index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-800 text-xs">
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
                          <span className="font-extrabold text-emerald-700 text-sm block">{score.finalScore} / 5.0</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{score.rating}</span>
                        </div>
                        <Link
                          to={`/reports/employee/${score.employeeId?._id}`}
                          className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors"
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
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL & SYSTEM ACTIVITY */}
      {activeTab === 'audits' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Activity size={18} className="text-slate-600" />
              <span>System Activity & Audit Log Trail</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Latest System Events</span>
          </div>

          {recentAudits.length === 0 ? (
            <p className="text-slate-400 italic text-center py-10">No recent system audit activities recorded.</p>
          ) : (
            <div className="space-y-3">
              {recentAudits.map(log => (
                <div key={log._id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center shrink-0">
                      {log.userId?.firstName?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {log.userId?.firstName} {log.userId?.lastName} <span className="text-slate-400 font-normal">({log.userId?.role || 'system'})</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Action: <span className={`inline-block font-bold text-[9px] px-1.5 py-0.5 rounded text-white ${
                          log.action === 'login' ? 'bg-slate-700' :
                          log.action === 'score_change' ? 'bg-indigo-600' :
                          log.action === 'review_update' ? 'bg-amber-600' : 'bg-sky-600'
                        }`}>{log.action}</span> | Target Entity: <span className="font-semibold">{log.entityType}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

// ==================== SUB-DASHBOARD: EXECUTIVE (CEO) ====================

const ExecutiveDashboard = ({ data, user }) => {
  const {
    stats = {},
    activeCycleMetrics = [],
    pendingManagerReviews = [],
    topEmployeesRanking = [],
    topManagersRanking = [],
    recentAudits = []
  } = data || {};

  const [activeTab, setActiveTab] = useState('grading'); // 'grading', 'leaderboard', 'cycles', 'audits'
  
  // Grading Tab State
  const [gradingSearch, setGradingSearch] = useState('');
  const [gradingFilter, setGradingFilter] = useState('all'); // 'all', 'needs_grade', 'self_pending', 'completed'
  const [gradingPage, setGradingPage] = useState(1);

  // Leaderboard Tab State
  const [leaderboardDept, setLeaderboardDept] = useState('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  // Cycles Tab State
  const [expandedCycleId, setExpandedCycleId] = useState(null);

  // Needs CEO Grade Count
  const needsCeoGradeCount = pendingManagerReviews.filter(r => r.isEmployeeSubmitted).length;

  // Filter pending manager reviews for CEO Grading tab
  const filteredGradingReviews = pendingManagerReviews.filter(item => {
    const fullName = `${item.employee.firstName} ${item.employee.lastName} ${item.employee.employeeCode}`.toLowerCase();
    const deptName = (item.employee.departmentId?.departmentName || '').toLowerCase();
    const matchesSearch = fullName.includes(gradingSearch.toLowerCase()) || deptName.includes(gradingSearch.toLowerCase());

    let matchesFilter = true;
    if (gradingFilter === 'needs_grade') {
      matchesFilter = item.isEmployeeSubmitted;
    } else if (gradingFilter === 'self_pending') {
      matchesFilter = !item.isEmployeeSubmitted;
    }

    return matchesSearch && matchesFilter;
  });

  const GRADING_PER_PAGE = 5;
  const totalGradingPages = Math.ceil(filteredGradingReviews.length / GRADING_PER_PAGE) || 1;
  const paginatedGradingReviews = filteredGradingReviews.slice(
    (gradingPage - 1) * GRADING_PER_PAGE,
    gradingPage * GRADING_PER_PAGE
  );

  // Filter top rankings by department
  const filteredEmployeesRanking = topEmployeesRanking.filter(score => {
    const deptId = score.employeeId?.departmentId?._id || score.employeeId?.departmentId;
    const matchesDept = leaderboardDept === 'all' || (deptId && deptId.toString() === leaderboardDept.toString());
    const empName = `${score.employeeId?.firstName} ${score.employeeId?.lastName}`.toLowerCase();
    const matchesSearch = empName.includes(leaderboardSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const filteredManagersRanking = topManagersRanking.filter(score => {
    const deptId = score.employeeId?.departmentId?._id || score.employeeId?.departmentId;
    const matchesDept = leaderboardDept === 'all' || (deptId && deptId.toString() === leaderboardDept.toString());
    const mgrName = `${score.employeeId?.firstName} ${score.employeeId?.lastName}`.toLowerCase();
    const matchesSearch = mgrName.includes(leaderboardSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Executive Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
                Executive Desk
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Executive Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Strategic organizational performance, manager evaluations, and multi-departmental analytics for enterprise leadership.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-bold text-white text-xs">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Chief Executive Officer</p>
            </div>
          </div>
        </div>

        {/* Executive Metric Cards (4 Cards Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Active Staff</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalUsers || 0}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Across all departments</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Reporting Managers</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalManagers || 0}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Direct leadership team</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Departments</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalDepartments || 0}</h2>
              <span className="text-[9px] text-indigo-400 font-medium">Business units</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Review Templates</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalTemplates || 0}</h2>
              <span className="text-[9px] text-amber-400 font-medium">KPI Frameworks</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Briefcase size={20} />
            </div>
          </div>

        </div>
      </div>

      {/* Tabbed Executive Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('grading')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'grading' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          <span>Direct Subordinates Grading</span>
          {needsCeoGradeCount > 0 && (
            <span className="bg-sky-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {needsCeoGradeCount} Needs Grade
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'leaderboard' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy size={16} />
          <span>Organizational Leaderboards</span>
        </button>

        <button
          onClick={() => setActiveTab('cycles')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'cycles' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={16} />
          <span>Review Cycles Progress</span>
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'audits' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity size={16} />
          <span>Audit Trail & Activity</span>
        </button>
      </div>

      {/* TAB 1: DIRECT SUBORDINATES GRADING TABLE */}
      {activeTab === 'grading' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Manager & HR Evaluation Desk</span>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold uppercase border border-sky-100">
                  Direct Reportees ({pendingManagerReviews.length})
                </span>
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Grade submitted self-assessments from Reporting Managers and HR Managers across all departments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-64">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search manager or department..."
                  value={gradingSearch}
                  onChange={(e) => { setGradingSearch(e.target.value); setGradingPage(1); }}
                  className="bg-transparent text-xs text-slate-800 outline-none w-full"
                />
              </div>

              {/* Status Filter */}
              <select
                value={gradingFilter}
                onChange={(e) => { setGradingFilter(e.target.value); setGradingPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Statuses ({pendingManagerReviews.length})</option>
                <option value="needs_grade">Needs CEO Grade ({needsCeoGradeCount})</option>
                <option value="self_pending">Self Assessment Pending ({pendingManagerReviews.length - needsCeoGradeCount})</option>
              </select>
            </div>
          </div>

          {/* Table View */}
          {paginatedGradingReviews.length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
              <ShieldCheck className="mx-auto text-slate-300" size={32} />
              <p className="text-slate-500 font-bold text-xs">No pending manager evaluations match your search filter.</p>
              <p className="text-slate-400 text-[11px]">Reporting managers will appear here as soon as a manager-targeted review cycle is initiated.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400">
                    <th className="p-3 pl-4">Manager / HR Name</th>
                    <th className="p-3">Role & Level</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Cycle Month</th>
                    <th className="p-3 text-center">Self-Assessment Status</th>
                    <th className="p-3 pr-4 text-right">CEO Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedGradingReviews.map((item) => (
                    <tr key={`${item.employee._id}-${item.cycleId}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 pl-4">
                        <p className="font-extrabold text-slate-800 text-xs">
                          {item.employee.firstName} {item.employee.lastName}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">{item.employee.employeeCode}</span>
                      </td>

                      <td className="p-3">
                        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          item.employee.role === 'hr' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {item.employee.role === 'hr' ? 'HR Manager' : 'Reporting Manager'}
                        </span>
                      </td>

                      <td className="p-3 font-semibold text-slate-700">
                        {item.employee.departmentId?.departmentName || 'General Management'}
                      </td>

                      <td className="p-3 font-semibold text-slate-600">
                        {item.cycleMonth}
                      </td>

                      <td className="p-3 text-center">
                        {item.isEmployeeSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>Self Submitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-semibold">
                            <Clock size={12} />
                            <span>Self Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/reports/employee/${item.employee._id}`}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                            title="View Employee Performance Report"
                          >
                            <Eye size={14} />
                          </Link>

                          {item.isEmployeeSubmitted ? (
                            <Link
                              to={`/review/${item.cycleId}/${item.employee._id}`}
                              className="px-4 py-2 bg-sky-700 hover:bg-sky-850 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                            >
                              Grade Review &rarr;
                            </Link>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-semibold cursor-not-allowed">
                              Waiting for Self
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalGradingPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Showing {(gradingPage - 1) * GRADING_PER_PAGE + 1} to {Math.min(filteredGradingReviews.length, gradingPage * GRADING_PER_PAGE)} of {filteredGradingReviews.length} managers
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={gradingPage === 1}
                  onClick={() => setGradingPage(p => p - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 font-bold text-slate-700">
                  {gradingPage} / {totalGradingPages}
                </span>
                <button
                  disabled={gradingPage === totalGradingPages}
                  onClick={() => setGradingPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: ORGANIZATIONAL LEADERBOARDS */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-700">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Organizational Performance Rankings</h3>
                <p className="text-slate-500 text-xs">Filter rankings by department or employee name</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-64">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ranking..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none w-full"
                />
              </div>

              <select
                value={leaderboardDept}
                onChange={(e) => setLeaderboardDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                {stats.departmentsList?.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Employees Ranking */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>Top Performing Employees</span>
                </h4>
                <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
                  Staff ({filteredEmployeesRanking.length})
                </span>
              </div>

              {filteredEmployeesRanking.length === 0 ? (
                <p className="text-slate-400 italic text-center py-10">No employee scores recorded matching your filter.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredEmployeesRanking.map((score, index) => (
                    <div
                      key={score._id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          index === 0 ? 'bg-amber-400 text-amber-950' :
                          index === 1 ? 'bg-slate-300 text-slate-800' :
                          index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {score.employeeId?.firstName} {score.employeeId?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Cycle: {score.reviewCycleId?.reviewMonth}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-extrabold text-sky-700 text-sm block">{score.finalScore} / 5.0</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{score.rating}</span>
                        </div>
                        <Link
                          to={`/reports/employee/${score.employeeId?._id}`}
                          className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-700 rounded-xl transition-colors"
                        >
                          <Eye size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Reporting Managers Ranking */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>Top Reporting Managers & HRs</span>
                </h4>
                <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100">
                  Leadership ({filteredManagersRanking.length})
                </span>
              </div>

              {filteredManagersRanking.length === 0 ? (
                <p className="text-slate-400 italic text-center py-10">No manager scores recorded matching your filter.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredManagersRanking.map((score, index) => (
                    <div
                      key={score._id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          index === 0 ? 'bg-amber-400 text-amber-950' :
                          index === 1 ? 'bg-slate-300 text-slate-800' :
                          index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-800 text-xs">
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
                          <span className="font-extrabold text-emerald-700 text-sm block">{score.finalScore} / 5.0</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{score.rating}</span>
                        </div>
                        <Link
                          to={`/reports/employee/${score.employeeId?._id}`}
                          className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors"
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
        </div>
      )}

      {/* TAB 3: ACTIVE REVIEW CYCLES PROGRESS */}
      {activeTab === 'cycles' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Active Review Cycles Progress</h3>
              <p className="text-slate-500 text-xs mt-0.5">Track submission rates across active evaluation periods</p>
            </div>
            <Link to="/hr/cycles" className="text-xs text-sky-700 hover:underline font-bold">
              Manage Review Cycles &rarr;
            </Link>
          </div>

          {activeCycleMetrics.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-slate-400 text-xs">No active review cycles currently in progress.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCycleMetrics.map((item) => {
                const visibleSubmissions = item.submissions?.filter(sub => sub.role === 'manager' || sub.role === 'hr') || [];
                const totalCount = visibleSubmissions.length;
                const selfCount = visibleSubmissions.filter(s => s.selfSubmitted).length;
                const mgrCount = visibleSubmissions.filter(s => s.managerSubmitted).length;
                const completePercent = totalCount > 0 ? Math.round((visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / totalCount) * 100) : 0;

                const isExpanded = expandedCycleId === item.cycleId;

                return (
                  <div key={item.cycleId} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-200/80 pb-3">
                      <div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">
                          Cycle Month: {item.reviewMonth}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-xs mt-1">
                          Dept: {item.departmentName}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        {completePercent}% Complete
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Phase 1: Self Assessment</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selfCount} / {totalCount}</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Phase 2: CEO Grading</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{mgrCount} / {totalCount}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedCycleId(isExpanded ? null : item.cycleId)}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition-colors cursor-pointer"
                    >
                      {isExpanded ? 'Hide Manager Submissions ↑' : `View Manager Submissions (${visibleSubmissions.length}) ↓`}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 animate-fade-in border-t border-slate-200">
                        {visibleSubmissions.map(sub => (
                          <div key={sub.employeeId} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                            <div>
                              <p className="font-bold text-slate-800">{sub.firstName} {sub.lastName}</p>
                              <p className="text-[10px] text-slate-400">{sub.designationName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                                sub.selfSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                Self: {sub.selfSubmitted ? 'Submitted' : 'Pending'}
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                                sub.managerSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                CEO: {sub.managerSubmitted ? 'Graded' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL & SYSTEM ACTIVITY */}
      {activeTab === 'audits' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Activity size={18} className="text-slate-600" />
              <span>System Activity & Audit Log Trail</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Latest System Events</span>
          </div>

          {recentAudits.length === 0 ? (
            <p className="text-slate-400 italic text-center py-10">No recent system audit activities recorded.</p>
          ) : (
            <div className="space-y-3">
              {recentAudits.map(log => (
                <div key={log._id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center shrink-0">
                      {log.userId?.firstName?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {log.userId?.firstName} {log.userId?.lastName} <span className="text-slate-400 font-normal">({log.userId?.role || 'system'})</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Action: <span className={`inline-block font-bold text-[9px] px-1.5 py-0.5 rounded text-white ${
                          log.action === 'login' ? 'bg-slate-700' :
                          log.action === 'score_change' ? 'bg-indigo-600' :
                          log.action === 'review_update' ? 'bg-amber-600' : 'bg-sky-600'
                        }`}>{log.action}</span> | Target Entity: <span className="font-semibold">{log.entityType}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Dashboard;
