import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Users, Layers, Calendar, ShieldCheck, Clock, Trophy, Search, ChevronLeft, ChevronRight,
  RefreshCw, Eye, AlertTriangle, CheckCircle2, Activity, User
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../store/toastStore';
import { getUserAvatarUrl } from '../../utils/avatar';
import PunchCard from './PunchCard';

const HRDashboard = ({ data, user, onAddWorkLogClick }) => {
  const {
    stats = {},
    activeCycleMetrics = [],
    pendingManagerReviews = [],
    pendingSelfAssessments = [],
    topEmployeesRanking = [],
    topManagersRanking = [],
    lowestEmployeesRanking = [],
    lowestManagersRanking = [],
    allEmployeeScores = [],
    allManagerScores = [],
    recentAudits = []
  } = data || {};

  const [activeTab, setActiveTab] = useState('hub'); // 'hub', 'cycles', 'direct_reports', 'leaderboard', 'audits', 'attendance'
  const [hrSummary, setHrSummary] = useState(null);
  const [loadingHrSummary, setLoadingHrSummary] = useState(true);
  const [pendingRegs, setPendingRegs] = useState([]);

  // Date-based attendance viewer
  const todayIso = new Date().toISOString().split('T')[0];
  const [dateViewDate, setDateViewDate] = useState(todayIso);
  const [dateAttendance, setDateAttendance] = useState(null);
  const [loadingDateAttendance, setLoadingDateAttendance] = useState(false);
  const [dateAttendanceSearch, setDateAttendanceSearch] = useState('');
  const [dateAttendancePage, setDateAttendancePage] = useState(1);

  const fetchAttendanceByDate = async (d) => {
    try {
      setLoadingDateAttendance(true);
      const res = await api.get(`/api/attendance/by-date?date=${d}`);
      setDateAttendance(res.data);
      setDateAttendancePage(1); // Reset page on date change
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDateAttendance(false);
    }
  };

  const fetchHrSummary = async (d) => {
    try {
      setLoadingHrSummary(true);
      const url = d ? `/api/hr/attendance-summary?date=${d}` : '/api/hr/attendance-summary';
      const res = await api.get(url);
      setHrSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHrSummary(false);
    }
  };

  const fetchPendingRegs = async () => {
    try {
      const res = await api.get('/api/attendance/pending-regularization');
      setPendingRegs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHrSummary();
    fetchPendingRegs();
    fetchAttendanceByDate(todayIso);
  }, []);

  const handleReviewReg = async (id, status) => {
    try {
      await api.post('/api/attendance/review-regularization', { id, status });
      toast.success(`Regularization request ${status} successfully.`);
      fetchPendingRegs();
      fetchHrSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review request.');
    }
  };

  // Cycles Tab State
  const [expandedCycleId, setExpandedCycleId] = useState(null);

  // Direct Reports Grading State
  const [gradingSearch, setGradingSearch] = useState('');
  const [gradingFilter, setGradingFilter] = useState('all');
  const [gradingPage, setGradingPage] = useState(1);

  // Leaderboard Tab State
  const [leaderboardDept, setLeaderboardDept] = useState('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardViewMode, setLeaderboardViewMode] = useState('top'); // 'top' | 'lowest'
  const [leaderboardCycle, setLeaderboardCycle] = useState('all');
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    if (stats.departmentsList && stats.departmentsList.length > 0) {
      setDepartmentsList(stats.departmentsList);
    } else {
      api.get('/api/departments').then(res => setDepartmentsList(res.data)).catch(() => {});
    }
  }, [stats.departmentsList]);

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

  // Department-wise dynamic pools
  const baseEmployeeScores = (allEmployeeScores && allEmployeeScores.length > 0) ? allEmployeeScores : (topEmployeesRanking || []);
  const baseManagerScores = (allManagerScores && allManagerScores.length > 0) ? allManagerScores : (topManagersRanking || []);

  const uniqueCycles = Array.from(new Set([
    ...baseEmployeeScores.map(s => s.reviewCycleId?.reviewMonth),
    ...baseManagerScores.map(s => s.reviewCycleId?.reviewMonth)
  ].filter(Boolean))).sort().reverse();

  // Filter employees by department, search, and cycle
  const filteredEmpPool = baseEmployeeScores.filter(score => {
    const deptId = score.employeeId?.departmentId?._id || score.employeeId?.departmentId;
    const matchesDept = leaderboardDept === 'all' || (deptId && deptId.toString() === leaderboardDept.toString());
    const empName = `${score.employeeId?.firstName} ${score.employeeId?.lastName}`.toLowerCase();
    const matchesSearch = empName.includes(leaderboardSearch.toLowerCase());
    const cycle = score.reviewCycleId?.reviewMonth;
    const matchesCycle = leaderboardCycle === 'all' || cycle === leaderboardCycle;
    return matchesDept && matchesSearch && matchesCycle;
  });

  // Filter managers by department, search, and cycle
  const filteredMgrPool = baseManagerScores.filter(score => {
    const deptId = score.employeeId?.departmentId?._id || score.employeeId?.departmentId;
    const matchesDept = leaderboardDept === 'all' || (deptId && deptId.toString() === leaderboardDept.toString());
    const mgrName = `${score.employeeId?.firstName} ${score.employeeId?.lastName}`.toLowerCase();
    const matchesSearch = mgrName.includes(leaderboardSearch.toLowerCase());
    const cycle = score.reviewCycleId?.reviewMonth;
    const matchesCycle = leaderboardCycle === 'all' || cycle === leaderboardCycle;
    return matchesDept && matchesSearch && matchesCycle;
  });

  // Helper to get unique latest score per employee from a list of scores
  const getUniqueLatest = (scores) => {
    const uniqueMap = new Map();
    scores.forEach(s => {
      if (s.employeeId?._id) {
        const id = s.employeeId._id.toString();
        if (!uniqueMap.has(id)) {
          uniqueMap.set(id, s);
        }
      }
    });
    return Array.from(uniqueMap.values());
  };

  // Dynamic Department-wise Top Rankings (Highest Scores >= 3.0 only)
  const filteredEmployeesRanking = getUniqueLatest(filteredEmpPool.filter(score => score.finalScore >= 3.0)).sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);
  const filteredManagersRanking = getUniqueLatest(filteredMgrPool.filter(score => score.finalScore >= 3.0)).sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);

  // Dynamic Department-wise Needs Improvement Rankings (Lowest Scores below 3.0)
  const filteredLowestEmployeesRanking = getUniqueLatest(filteredEmpPool.filter(score => score.finalScore < 3.0)).sort((a, b) => a.finalScore - b.finalScore).slice(0, 10);
  const filteredLowestManagersRanking = getUniqueLatest(filteredMgrPool.filter(score => score.finalScore < 3.0)).sort((a, b) => a.finalScore - b.finalScore).slice(0, 10);

  if (activeTab === 'hub') {
    return (
      <div className="space-y-8 animate-fade-in text-xs text-slate-800">
        
        {/* Hallmark HR / Admin Hero Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30 tracking-wider">
                  {user?.role === 'admin' ? 'System Administrator Console' : 'HR Operations Console'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                {user?.role === 'admin' ? 'System Administration Command Desk' : 'HR & Operations Command Desk'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {user?.role === 'admin'
                  ? 'Organization-wide system administration, review cycle control, user management & performance oversight.'
                  : 'Organization-wide review cycle administration, submission tracking, & workforce performance control desk.'}
              </p>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onAddWorkLogClick}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Log Daily Work</span>
              </button>
              <Link
                to="/hr/cycles"
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>New Review Cycle</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-3 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
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
                <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalUsers || stats.totalEmployees || 0}</h2>
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
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Review Cycles</p>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.activeCyclesCount || 0}</h2>
                <span className="text-[9px] text-amber-400 font-medium">Active evaluation periods</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Calendar size={20} />
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

        {/* HR Self Assessment Action Banner */}
        {user?.role !== 'admin' && pendingSelfAssessments && pendingSelfAssessments.length > 0 && (
          (() => {
            const type = pendingSelfAssessments[0].cycleType || '';
            const typeLabel = type.toLowerCase() === 'yearly' ? 'Yearly' : (type.toLowerCase() === 'half_yearly' ? 'Half-Yearly' : 'Quarterly');
            return (
              <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800 animate-fade-in">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">Action Required</span>
                    <h3 className="font-bold text-sm">Your {typeLabel} Self Assessment Pending ({pendingSelfAssessments[0].reviewMonth})</h3>
                  </div>
                  <p className="text-xs text-sky-200 mt-1">Please complete your self-evaluation for the active review cycle.</p>
                </div>
                <Link
                  to={"/review/confirm/" + pendingSelfAssessments[0].cycleId}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-955 font-black text-xs px-5 py-2.5 rounded-xl shadow transition-colors shrink-0"
                >
                  Confirm Evidence &rarr;
                </Link>
              </div>
            );
          })()
        )}

        {/* Command Suite Grid & Personal Punch Card Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Command Suite Grid (2/3 width, or full width for Admin) */}
          <div className={`${user?.role === 'admin' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Management Command Desk</h2>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-3' : ''} gap-6`}>
              
              {/* Card 1: Org Tree */}
              <div 
                onClick={() => setActiveTab('tree')}
                className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-4 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-2xs">
                  <Layers size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors">Org Tree Hierarchy</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Visualize the enterprise reporting lines, departments, and active employee node mappings.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 group-hover:translate-x-1.5 transition-transform">
                  <span>Enter Visualizer</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Card 2: Direct Subordinates */}
              <div 
                onClick={() => setActiveTab('direct_reports')}
                className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs relative">
                  <Users size={22} />
                  {needsHrGradeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce shadow">
                      {needsHrGradeCount}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors">Direct Subordinates</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Evaluate performance cycles, submit grades, and track completion of your leadership reports.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 group-hover:translate-x-1.5 transition-transform">
                  <span>Open Evaluation Desk</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Card 3: Leaderboards */}
              <div 
                onClick={() => setActiveTab('leaderboard')}
                className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                  <Trophy size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors">Performance Leaderboards</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Rank departments and managers, highlight top performers and identify improvement areas.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 group-hover:translate-x-1.5 transition-transform">
                  <span>View Rankings</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Card 4: Review Cycles */}
              <div 
                onClick={() => setActiveTab('cycles')}
                className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                  <Calendar size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors">Review Cycles</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Track global cycle progress, check templates status, and review active cycle timelines.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 group-hover:translate-x-1.5 transition-transform">
                  <span>Track Progress</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Card 5: Attendance Control Desk */}
              <div 
                onClick={() => setActiveTab('attendance')}
                className="bg-white border border-slate-200/80 hover:border-sky-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-4 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-2xs">
                  <Clock size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-sky-600 transition-colors">Attendance Control Desk</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Manage employee registers, resolve regularization requests, and monitor check-ins.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-sky-600 group-hover:translate-x-1.5 transition-transform">
                  <span>Open Control Desk</span>
                  <span>&rarr;</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Personal Punch Card (only rendered for non-Admin roles) */}
          {user?.role !== 'admin' && (
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Personal Shift Control</h2>
              <PunchCard />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setActiveTab('hub')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-[11px] shadow-sm border border-slate-200/50"
        >
          <ChevronLeft size={14} />
          <span>Back to Dashboard Hub</span>
        </button>
        <div className="h-4 w-px bg-slate-300"></div>
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          {activeTab === 'tree' && 'Org Tree Hierarchy'}
          {activeTab === 'direct_reports' && 'Self Assessment & Direct Reports'}
          {activeTab === 'leaderboard' && 'Organizational Leaderboards'}
          {activeTab === 'cycles' && 'Active Review Cycles'}
          {activeTab === 'attendance' && 'Attendance Control Desk'}
        </span>
      </div>

      {/* TAB 0: ORGANIZATIONAL TREE HIERARCHY */}
      {activeTab === 'tree' && <OrgTreeHierarchy />}      {/* TAB 0: ORGANIZATIONAL TREE HIERARCHY */}
      {activeTab === 'tree' && <OrgTreeHierarchy />}

      {/* TAB: ATTENDANCE CONTROL DESK */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-fade-in text-xs font-semibold text-slate-700">

          {/* Pending Regularizations Review Section */}
          {pendingRegs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw size={16} className="text-amber-500 animate-spin" />
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">Pending Regularization Requests ({pendingRegs.length})</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRegs.map(reg => (
                  <div key={reg._id} className="text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800">{reg.employeeId?.firstName} {reg.employeeId?.lastName} ({reg.employeeId?.employeeCode || 'N/A'})</p>
                      <p className="text-[10px] text-slate-400">Date: {new Date(reg.date).toLocaleDateString()} | Req: {new Date(reg.requestedPunchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(reg.requestedPunchOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">"{reg.regularizationReason}"</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleReviewReg(reg._id, 'approved')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewReg(reg._id, 'rejected')}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date-based Attendance Viewer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="font-extrabold text-slate-800 text-[13px] flex items-center gap-2">
                  <Calendar size={16} className="text-sky-600" />
                  Daily Attendance Register
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">View every employee's punch in/out for any date</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={dateViewDate}
                  max={todayIso}
                  onChange={(e) => { 
                    setDateViewDate(e.target.value); 
                    fetchAttendanceByDate(e.target.value); 
                    fetchHrSummary(e.target.value); 
                  }}
                  className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                />
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-48">
                  <Search size={13} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={dateAttendanceSearch}
                    onChange={(e) => { setDateAttendanceSearch(e.target.value); setDateAttendancePage(1); }}
                    className="bg-transparent text-xs text-slate-700 outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {loadingDateAttendance ? (
              <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div></div>
            ) : !dateAttendance ? (
              <p className="text-slate-400 text-center py-6">No data. Select a date.</p>
            ) : (() => {
              const filtered = dateAttendance.records.filter(r =>
                r.name.toLowerCase().includes(dateAttendanceSearch.toLowerCase()) ||
                r.code.toLowerCase().includes(dateAttendanceSearch.toLowerCase()) ||
                r.department.toLowerCase().includes(dateAttendanceSearch.toLowerCase())
              );
              const ITEMS_PER_PAGE = 10;
              const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
              const safeCurrentPage = Math.min(dateAttendancePage, totalPages);
              const paginatedRecords = filtered.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);
              const statusColor = (s) => {
                if (s === 'Present' || s === 'Regularized') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
                if (s === 'Half Day') return 'text-amber-600 bg-amber-50 border-amber-200';
                if (s === 'Incomplete') return 'text-rose-500 bg-rose-50 border-rose-200';
                if (s === 'Weekly Off') return 'text-slate-500 bg-slate-50 border-slate-200';
                if (s === 'Auto Closed' || s === 'Unusual') return 'text-rose-600 bg-rose-50 border-rose-200';
                return 'text-rose-600 bg-rose-50 border-rose-200';
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <span className="text-emerald-600">✓ Present: {dateAttendance.records.filter(r => r.status === 'Present').length}</span>
                    <span className="text-amber-600">◑ Half Day: {dateAttendance.records.filter(r => r.status === 'Half Day').length}</span>
                    <span className="text-rose-600">✗ Absent: {dateAttendance.records.filter(r => r.status === 'Absent').length}</span>
                    <span className="text-slate-400">({filtered.length} shown)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                          <th className="py-2 px-3">Employee</th>
                          <th className="py-2 px-3">Dept</th>
                          <th className="py-2 px-3">Punch In</th>
                          <th className="py-2 px-3">Punch Out</th>
                          <th className="py-2 px-3">Working Hrs</th>
                          <th className="py-2 px-3">Late</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paginatedRecords.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-800">{r.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">{r.code}</p>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{r.department}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-700">{r.punchIn || <span className="text-slate-300">--</span>}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-700">{r.punchOut || <span className="text-slate-300">--</span>}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {r.workingMinutes > 0 || r.punchIn ? (
                                `${Math.floor(r.workingMinutes/60)}h ${r.workingMinutes%60}m${!r.punchOut && dateViewDate === todayIso ? ' (Active)' : ''}`
                              ) : '--'}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.lateMinutes > 0 ? <span className="text-rose-600 font-bold">{r.lateMinutes}m late</span> : <span className="text-emerald-600">On time</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold w-fit ${statusColor(r.status)}`}>
                                  {r.status === 'Auto Closed' ? 'Unusual' : r.status}
                                </span>
                                {r.regularizationStatus === "pending" && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200 animate-pulse w-fit">
                                    ⏳ Reg. Pending
                                  </span>
                                )}
                                {r.regularizationStatus === "approved" && r.status !== "Regularized" && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100 w-fit">
                                    ✓ Regularized
                                  </span>
                                )}
                                {r.regularizationStatus === "rejected" && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border bg-rose-50 text-rose-600 border-rose-100 w-fit">
                                    ✕ Reg. Rejected
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                    <p className="text-slate-500 font-medium text-[11px]">
                      Showing <span className="font-bold text-slate-800">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                      <span className="font-bold text-slate-800">{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filtered.length)}</span> of{' '}
                      <span className="font-bold text-slate-800">{filtered.length}</span> records
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDateAttendancePage(prev => Math.max(prev - 1, 1))}
                        disabled={safeCurrentPage === 1}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={13} />
                        <span>Prev</span>
                      </button>

                      <span className="px-3 py-1 bg-sky-50 text-sky-800 font-black rounded-lg text-[11px] border border-sky-100">
                        {safeCurrentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setDateAttendancePage(prev => Math.min(prev + 1, totalPages))}
                        disabled={safeCurrentPage >= totalPages}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Punch Card & Org Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PunchCard />
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-slate-800 text-[13px] mb-4">Today's Attendance Stats</h3>
              {loadingHrSummary ? (
                <div className="py-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
                </div>
              ) : !hrSummary ? (
                <p className="text-slate-400 font-medium">No metrics loaded.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Present</span>
                    <span className="text-lg font-black text-emerald-600 mt-1 block">{hrSummary.present} Employees</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Late</span>
                    <span className="text-lg font-black text-rose-600 mt-1 block">{hrSummary.late} Employees</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Half Day</span>
                    <span className="text-lg font-black text-amber-600 mt-1 block">{hrSummary.halfDay} Employees</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Employees Active Working</span>
                    <span className="text-lg font-black text-sky-600 mt-1 block">{hrSummary.workingCount} Active</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Not Punched Yet</span>
                    <span className="text-lg font-black text-slate-400 mt-1 block">{hrSummary.notPunchedCount} Staff</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Pending Regularizations</span>
                    <span className={`text-lg font-black mt-1 block ${hrSummary.pendingRegularizationCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`}>
                      {hrSummary.pendingRegularizationCount} Requests
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Org Lists Row */}
          {!loadingHrSummary && hrSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Working List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-extrabold text-slate-800 text-[13px] mb-4 flex items-center justify-between">
                  <span>Currently Working</span>
                  <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100 text-[10px]">
                    {hrSummary.workingCount}
                  </span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {hrSummary.workingList?.length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center font-medium">No employees actively clocked in right now.</p>
                  ) : (
                    hrSummary.workingList?.map((emp, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-800 block">{emp.name}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Code: {emp.code}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          In: {new Date(emp.punchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Late Arrivals List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-extrabold text-slate-800 text-[13px] mb-4 flex items-center justify-between">
                  <span>Late Arrivals Today</span>
                  <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100 text-[10px]">
                    {hrSummary.lateEmployees?.length}
                  </span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {hrSummary.lateEmployees?.length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center font-medium">All employees arrived on time today!</p>
                  ) : (
                    hrSummary.lateEmployees?.map((emp, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-800">{emp.name}</span>
                        <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded border border-rose-200 font-bold text-[10px]">
                          {emp.lateMinutes}m late
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Absent / Not Punched List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-extrabold text-slate-800 text-[13px] mb-4 flex items-center justify-between">
                  <span>Not Punched Yet / Absent</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-250 text-[10px]">
                    {hrSummary.absentEmployees?.length}
                  </span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {hrSummary.absentEmployees?.length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center font-medium">100% attendance recorded today.</p>
                  ) : (
                    hrSummary.absentEmployees?.map((name, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
                        {name}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

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
              {activeCycleMetrics.map((item, cycleIdx) => {
                const isManagerCycle = item.targetRole === 'manager';
                const visibleSubmissions = item.submissions || [];
                const totalCount = visibleSubmissions.length;
                const selfCount = visibleSubmissions.filter(s => s.selfSubmitted).length;
                const mgrCount = visibleSubmissions.filter(s => s.managerSubmitted).length;
                const completePercent = totalCount > 0 ? Math.round((visibleSubmissions.filter(s => s.managerSubmitted).length / totalCount) * 100) : 0;

                const selfPercent = totalCount > 0 ? Math.round((selfCount / totalCount) * 100) : 0;
                const mgrPercent = totalCount > 0 ? Math.round((mgrCount / totalCount) * 100) : 0;

                const currentCycleId = item.cycleId || item.cycle?._id || `cycle-${cycleIdx}`;
                const isExpanded = expandedCycleId === currentCycleId;

                return (
                  <div key={currentCycleId} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">
                            Cycle Month: {item.reviewMonth || item.cycle?.reviewMonth}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            isManagerCycle ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {isManagerCycle ? 'Manager Cycle' : 'Employee Cycle'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-xs mt-1">
                          Dept: {item.departmentName || 'All Departments'}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        {completePercent}% Complete
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {isManagerCycle ? 'Phase 1: Manager Self-Assessment' : 'Phase 1: Employee Evidence'}
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selfCount} / {totalCount} ({selfPercent}%)</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {isManagerCycle ? 'Phase 2: CEO Grading' : 'Phase 2: Manager Review'}
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{mgrCount} / {totalCount} ({mgrPercent}%)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedCycleId(isExpanded ? null : currentCycleId)}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition-colors cursor-pointer"
                    >
                      {isExpanded
                        ? (isManagerCycle ? 'Hide Manager Breakdown ↑' : 'Hide Employee Breakdown ↑')
                        : (isManagerCycle ? `View Manager Breakdown (${totalCount}) ↓` : `View Employee Breakdown (${totalCount}) ↓`)
                      }
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 animate-fade-in border-t border-slate-200">
                        {totalCount === 0 ? (
                          <p className="text-slate-400 text-xs italic py-2 text-center">No participants registered in this cycle group.</p>
                        ) : (
                          visibleSubmissions.map((sub, empIdx) => {
                            const empObj = sub.employee || {};
                            const empIdKey = empObj._id ? empObj._id.toString() : `sub-${empIdx}`;
                            const empName = `${empObj.firstName || 'Employee'} ${empObj.lastName || ''}`;
                            const desigName = empObj.designationId?.designationName || empObj.designationName || 'Team Member';
                            const mgrName = empObj.managerId ? `${empObj.managerId.firstName || ''} ${empObj.managerId.lastName || ''}` : 'Unassigned';

                            return (
                              <div key={empIdKey} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800">{empName}</p>
                                  <p className="text-[10px] text-slate-400">{desigName} • Manager: {mgrName}</p>
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
                                    {isManagerCycle ? 'CEO: ' : 'Manager: '}{sub.managerSubmitted ? 'Graded' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
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
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${leaderboardViewMode === 'top' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                {leaderboardViewMode === 'top' ? <Trophy size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {leaderboardViewMode === 'top' ? 'Organizational Top Performance Rankings' : 'Needs Improvement & Low Performers Audit'}
                </h3>
                <p className="text-slate-500 text-xs">
                  {leaderboardViewMode === 'top'
                    ? 'Unique employee & management performance rankings by highest scores'
                    : 'Unique employee & management performance rankings by lowest scores requiring intervention'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  onClick={() => setLeaderboardViewMode('top')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    leaderboardViewMode === 'top'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Trophy size={14} className={leaderboardViewMode === 'top' ? 'text-amber-500' : 'text-slate-400'} />
                  <span>Top Performers</span>
                </button>

                <button
                  onClick={() => setLeaderboardViewMode('lowest')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    leaderboardViewMode === 'lowest'
                      ? 'bg-white text-rose-700 shadow-xs border border-slate-200/60 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle size={14} className={leaderboardViewMode === 'lowest' ? 'text-rose-500' : 'text-slate-400'} />
                  <span>Needs Improvement</span>
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-56">
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
                {departmentsList.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentName}</option>
                ))}
              </select>

              <select
                value={leaderboardCycle}
                onChange={(e) => setLeaderboardCycle(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Cycles</option>
                {uniqueCycles.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Employees Ranking */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>{leaderboardViewMode === 'top' ? 'Top Performing Employees' : 'Needs Improvement Employees'}</span>
                </h4>
                <span className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                  leaderboardViewMode === 'top' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  Staff ({leaderboardViewMode === 'top' ? filteredEmployeesRanking.length : filteredLowestEmployeesRanking.length})
                </span>
              </div>

              {((leaderboardViewMode === 'top' ? filteredEmployeesRanking : filteredLowestEmployeesRanking).length === 0) ? (
                <p className="text-slate-400 italic text-center py-10">No employee scores recorded matching your filter.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {(leaderboardViewMode === 'top' ? filteredEmployeesRanking : filteredLowestEmployeesRanking).map((score, index) => (
                    <div
                      key={score._id}
                      className={`flex items-center justify-between p-3.5 border rounded-2xl hover:border-slate-300 transition-colors ${
                        leaderboardViewMode === 'top' ? 'bg-slate-50 border-slate-200/80' : 'bg-rose-50/30 border-rose-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          leaderboardViewMode === 'top'
                            ? (index === 0 ? 'bg-amber-400 text-amber-955' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700')
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {score.employeeId?.firstName} {score.employeeId?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Latest: {score.reviewCycleId?.reviewMonth}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`font-extrabold text-sm block ${leaderboardViewMode === 'top' ? 'text-sky-700' : 'text-rose-700'}`}>
                            {score.finalScore} / 5.0
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${leaderboardViewMode === 'top' ? 'text-slate-500' : 'text-rose-600'}`}>
                            {score.rating}
                          </span>
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

            {/* Managers & HRs Ranking */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>{leaderboardViewMode === 'top' ? 'Top Reporting Managers & HRs' : 'Needs Improvement Managers & HRs'}</span>
                </h4>
                <span className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                  leaderboardViewMode === 'top' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  Leadership ({leaderboardViewMode === 'top' ? filteredManagersRanking.length : filteredLowestManagersRanking.length})
                </span>
              </div>

              {((leaderboardViewMode === 'top' ? filteredManagersRanking : filteredLowestManagersRanking).length === 0) ? (
                <p className="text-slate-400 italic text-center py-10">No manager scores recorded matching your filter.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {(leaderboardViewMode === 'top' ? filteredManagersRanking : filteredLowestManagersRanking).map((score, index) => (
                    <div
                      key={score._id}
                      className={`flex items-center justify-between p-3.5 border rounded-2xl hover:border-slate-300 transition-colors ${
                        leaderboardViewMode === 'top' ? 'bg-slate-50 border-slate-200/80' : 'bg-rose-50/30 border-rose-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          leaderboardViewMode === 'top'
                            ? (index === 0 ? 'bg-amber-400 text-amber-955' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700')
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
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
                            Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Latest: {score.reviewCycleId?.reviewMonth}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`font-extrabold text-sm block ${leaderboardViewMode === 'top' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {score.finalScore} / 5.0
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${leaderboardViewMode === 'top' ? 'text-slate-500' : 'text-rose-600'}`}>
                            {score.rating}
                          </span>
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

    </div>
  );
};

// ==================== ORGANIZATIONAL TREE HIERARCHY ====================
export const OrgTreeHierarchy = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [collapsedManagers, setCollapsedManagers] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'directory'
  const [subSearch, setSubSearch] = useState({});
  const [subPage, setSubPage] = useState({});

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        setLoading(true);
        const [usersRes, deptsRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/departments')
        ]);
        setUsers(usersRes.data || []);
        setDepartments(deptsRes.data || []);
      } catch (err) {
        console.error('Failed to load tree hierarchy data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTreeData();
  }, []);

  const toggleManager = (mgrId) => {
    setCollapsedManagers(prev => ({ ...prev, [mgrId]: !prev[mgrId] }));
  };

  const toggleAll = () => {
    const nextState = !allCollapsed;
    setAllCollapsed(nextState);
    const newCollapsed = {};
    if (nextState) {
      users.filter(u => u.role === 'manager' || u.role === 'hr').forEach(m => {
        newCollapsed[m._id] = true;
      });
    }
    setCollapsedManagers(newCollapsed);
  };

  if (loading) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-500 font-bold text-xs">Building Large-Scale Enterprise Tree Hierarchy...</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName} ${u.employeeCode} ${u.email} ${u.designationId?.designationName || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const uDeptId = u.departmentId?._id || u.departmentId;
    const matchesDept = selectedDept === 'all' || (uDeptId && uDeptId.toString() === selectedDept.toString());
    return matchesSearch && matchesDept;
  });

  const executives = filteredUsers.filter(u => u.role === 'executive' || u.role === 'admin');
  const ceoUser = executives.find(u => u.role === 'executive') || executives[0];

  const managers = filteredUsers.filter(u => u.role === 'manager' || u.role === 'hr');

  const getSubordinatesForManager = (mgr) => {
    return filteredUsers.filter(u => {
      if (u.role !== 'employee') return false;
      const mgrId = u.managerId?._id || u.managerId;
      if (mgrId) {
        return mgrId.toString() === mgr._id.toString();
      }
      const uDeptId = u.departmentId?._id || u.departmentId;
      const mgrDeptId = mgr.departmentId?._id || mgr.departmentId;
      return uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
    });
  };

  const allManagedEmpIds = new Set(
    managers.flatMap(m => getSubordinatesForManager(m).map(e => e._id.toString()))
  );
  const unassignedEmployees = filteredUsers.filter(u =>
    u.role === 'employee' && !allManagedEmpIds.has(u._id.toString())
  );

  const getDepartmentStyle = (deptName) => {
    const dName = (deptName || '').toLowerCase();
    if (dName.includes('engineering') || dName.includes('tech')) {
      return {
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
        ringColor: 'ring-sky-400',
        headerGradient: 'from-slate-900 via-sky-950 to-slate-900 border-sky-800/60',
        accentText: 'text-sky-400',
        subPillBg: 'bg-sky-50 text-sky-700 border-sky-100'
      };
    }
    if (dName.includes('sales') || dName.includes('business')) {
      return {
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
        ringColor: 'ring-emerald-400',
        headerGradient: 'from-slate-900 via-emerald-950 to-slate-900 border-emerald-800/60',
        accentText: 'text-emerald-400',
        subPillBg: 'bg-emerald-50 text-emerald-700 border-emerald-100'
      };
    }
    if (dName.includes('hr') || dName.includes('human')) {
      return {
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
        ringColor: 'ring-purple-400',
        headerGradient: 'from-slate-900 via-purple-950 to-slate-900 border-purple-800/60',
        accentText: 'text-purple-400',
        subPillBg: 'bg-purple-50 text-purple-700 border-purple-100'
      };
    }
    if (dName.includes('marketing')) {
      return {
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
        ringColor: 'ring-amber-400',
        headerGradient: 'from-slate-900 via-amber-950 to-slate-900 border-amber-800/60',
        accentText: 'text-amber-400',
        subPillBg: 'bg-amber-50 text-amber-700 border-amber-100'
      };
    }
    return {
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
      ringColor: 'ring-indigo-400',
      headerGradient: 'from-slate-900 via-slate-800 to-slate-900 border-slate-700',
      accentText: 'text-indigo-400',
      subPillBg: 'bg-indigo-50 text-indigo-700 border-indigo-100'
    };
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="text-sky-600" size={18} />
              <span>Enterprise Organizational Tree Structure</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-extrabold border border-sky-100">
                {users.length} Total Members
              </span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Scalable multi-department hierarchy for high-density teams (CEO &rarr; Leadership &rarr; Subordinates)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'chart' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers size={13} />
                <span>Tree Chart</span>
              </button>
              <button
                onClick={() => setViewMode('directory')}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'directory' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={13} />
                <span>Compact Directory</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-52">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search 200+ members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs text-slate-800 outline-none w-full font-medium"
              />
            </div>

            <button
              onClick={toggleAll}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              {allCollapsed ? 'Expand All ↓' : 'Collapse All ↑'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Filter Dept:</span>
          <button
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedDept === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Departments ({users.length})
          </button>
          {departments.map(d => {
            const deptMemberCount = users.filter(u => {
              const uDeptId = u.departmentId?._id || u.departmentId;
              return uDeptId && uDeptId.toString() === d._id.toString();
            }).length;

            return (
              <button
                key={d._id}
                onClick={() => setSelectedDept(d._id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedDept === d._id ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{d.departmentName}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${selectedDept === d._id ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {deptMemberCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-10 overflow-x-auto min-w-[700px]">
          
          <div className="flex flex-col items-center space-y-4">
            <span className="px-3.5 py-1 bg-slate-900 text-white rounded-full font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-slate-700">
              <ShieldCheck size={12} className="text-amber-400" />
              <span>Level 1: Chief Executive Officer (CEO)</span>
            </span>

            <div className="flex justify-center items-center gap-6">
              {ceoUser && (
                <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border-2 border-amber-400/80 rounded-3xl p-5 shadow-2xl min-w-[320px] max-w-md relative transition-transform hover:scale-[1.02]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-955 font-black text-[9px] uppercase px-3 py-0.5 rounded-full shadow-md tracking-widest border border-amber-300">
                    CHIEF EXECUTIVE OFFICER
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mt-1">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={getUserAvatarUrl(ceoUser)}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full object-cover ring-4 ring-amber-400/60 shadow-md shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-black text-base text-white truncate">
                          {ceoUser.firstName} {ceoUser.lastName}
                        </h4>
                        <p className="text-xs text-sky-300 font-semibold truncate mt-0.5">
                          Chief Executive Officer (CEO)
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          ID: {ceoUser.employeeCode} • {ceoUser.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/reports/employee/${ceoUser._id}`}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-2xl border border-slate-700 transition-colors shrink-0 shadow-xs"
                      title="View CEO Report"
                    >
                      <Eye size={16} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative py-2">
            <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
            <div className="w-3 h-3 bg-sky-600 ring-4 ring-sky-100 rounded-full mx-auto -mt-1.5 shadow-xs"></div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <span className="px-3.5 py-1 bg-emerald-700 text-white rounded-full font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Users size={13} className="text-emerald-200" />
                <span>Level 2: Department Leadership ({managers.length} Managers)</span>
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-6 pt-2">
              {managers.length > 1 && (
                <div className="w-[88%] min-w-[1200px] h-0.5 bg-slate-300 mx-auto mb-2 rounded-full"></div>
              )}

              <div className="flex flex-nowrap items-stretch gap-6 min-w-max px-6 mx-auto justify-center">
                {managers.map((mgr) => {
                  const deptName = mgr.departmentId?.departmentName || 'General';
                  const style = getDepartmentStyle(deptName);
                  const allSubs = getSubordinatesForManager(mgr);
                  const isCollapsed = !!collapsedManagers[mgr._id];

                  const mgrSearch = subSearch[mgr._id] || '';
                  const mgrPage = subPage[mgr._id] || 1;
                  const SUB_PAGE_SIZE = 5;

                  const filteredSubs = allSubs.filter(e =>
                    `${e.firstName} ${e.lastName} ${e.employeeCode} ${e.designationId?.designationName || ''}`.toLowerCase().includes(mgrSearch.toLowerCase())
                  );

                  const totalSubPages = Math.max(1, Math.ceil(filteredSubs.length / SUB_PAGE_SIZE));
                  const safeSubPage = Math.min(mgrPage, totalSubPages);
                  const displaySubs = filteredSubs.slice((safeSubPage - 1) * SUB_PAGE_SIZE, safeSubPage * SUB_PAGE_SIZE);

                  return (
                    <div key={mgr._id} className="w-[290px] sm:w-[310px] relative flex flex-col shrink-0">
                      <div className="w-0.5 h-4 bg-slate-300 mx-auto -mt-4 mb-0"></div>

                      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md border-t-4 border-t-sky-600 h-full">
                      
                      <div className={`bg-gradient-to-r ${style.headerGradient} text-white p-4 space-y-3 border-b border-slate-800`}>
                        <div className="flex justify-between items-start">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${style.badgeBg}`}>
                            {mgr.role === 'hr' ? 'HR Manager' : 'Reporting Manager'}
                          </span>
                          <span className="text-[9px] font-black bg-slate-800/90 text-white px-2.5 py-0.5 rounded-full border border-slate-700 shadow-xs">
                            {deptName}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={getUserAvatarUrl(mgr)}
                            alt="Avatar"
                            className={`w-11 h-11 rounded-full object-cover ring-2 ${style.ringColor} shrink-0 shadow-sm`}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-xs text-white truncate">
                              {mgr.firstName} {mgr.lastName}
                            </h4>
                            <p className={`text-[10px] font-bold truncate mt-0.5 ${style.accentText}`}>
                              {mgr.designationId?.designationName || 'Department Lead'}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{mgr.employeeCode}</p>
                          </div>
                          <Link
                            to={`/reports/employee/${mgr._id}`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors shrink-0"
                            title="View Profile Report"
                          >
                            <Eye size={13} />
                          </Link>
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-800 text-[10px]">
                          <span className={`font-black flex items-center gap-1 ${style.accentText}`}>
                            <Users size={12} />
                            <span>{allSubs.length} Direct Reportees</span>
                          </span>
                          {allSubs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleManager(mgr._id)}
                              className="text-slate-300 hover:text-white font-bold underline cursor-pointer"
                            >
                              {isCollapsed ? `Expand (${allSubs.length}) ↓` : 'Collapse ↑'}
                            </button>
                          )}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="p-4 bg-slate-50/50 space-y-2.5 flex-1 border-t border-slate-100 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {allSubs.length > 5 && (
                              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px]">
                                <Search size={12} className="text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  placeholder={`Search ${allSubs.length} reportees...`}
                                  value={subSearch[mgr._id] || ''}
                                  onChange={(e) => {
                                    setSubSearch(prev => ({ ...prev, [mgr._id]: e.target.value }));
                                    setSubPage(prev => ({ ...prev, [mgr._id]: 1 }));
                                  }}
                                  className="bg-transparent text-[11px] text-slate-800 outline-none w-full font-medium"
                                />
                              </div>
                            )}

                            {displaySubs.length === 0 ? (
                              <p className="text-slate-400 italic text-center py-5 text-[11px]">
                                {mgrSearch ? 'No reportees match filter.' : 'No direct reportees assigned.'}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {displaySubs.map(emp => (
                                  <div
                                    key={emp._id}
                                    className="bg-white border border-slate-200/90 p-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all hover:scale-[1.01]"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <img
                                        src={getUserAvatarUrl(emp)}
                                        alt="Avatar"
                                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-xs truncate">
                                          {emp.firstName} {emp.lastName}
                                        </p>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
                                          <span className="font-mono text-slate-700 font-bold">{emp.employeeCode}</span>
                                          <span>•</span>
                                          <span className="truncate text-slate-600 font-semibold">{emp.designationId?.designationName || 'Staff'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <Link
                                      to={`/reports/employee/${emp._id}`}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-sky-700 rounded-xl transition-colors shrink-0"
                                      title="View Performance Report"
                                    >
                                      <Eye size={13} />
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {filteredSubs.length > SUB_PAGE_SIZE && (
                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/80 text-[10px]">
                              <span className="text-slate-500 font-bold">
                                {(safeSubPage - 1) * SUB_PAGE_SIZE + 1}-{Math.min(safeSubPage * SUB_PAGE_SIZE, filteredSubs.length)} of {filteredSubs.length}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={safeSubPage <= 1}
                                  onClick={() => setSubPage(prev => ({ ...prev, [mgr._id]: Math.max(1, safeSubPage - 1) }))}
                                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  title="Previous Page"
                                >
                                  <ChevronLeft size={12} />
                                </button>
                                <span className="font-bold text-slate-700 px-1">
                                  {safeSubPage} / {totalSubPages}
                                </span>
                                <button
                                  type="button"
                                  disabled={safeSubPage >= totalSubPages}
                                  onClick={() => setSubPage(prev => ({ ...prev, [mgr._id]: Math.min(totalSubPages, safeSubPage + 1) }))}
                                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  title="Next Page"
                                >
                                  <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        {unassignedEmployees.length > 0 && (
          <div className="pt-8 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-center">
              <span className="px-3.5 py-1 bg-sky-900 text-white rounded-full font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <User size={12} className="text-sky-300" />
                <span>Direct Executive / Unassigned Employees ({unassignedEmployees.length})</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {unassignedEmployees.map(emp => (
                <div
                  key={emp._id}
                  className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getUserAvatarUrl(emp)}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">{emp.employeeCode} • {emp.departmentId?.departmentName || 'Unassigned'}</p>
                    </div>
                  </div>
                  <Link
                    to={`/reports/employee/${emp._id}`}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-sky-700 rounded-lg transition-colors shrink-0"
                  >
                    <Eye size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    ) : (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        {departments.map(dept => {
          const deptManagers = managers.filter(m => {
            const mDeptId = m.departmentId?._id || m.departmentId;
            return mDeptId && mDeptId.toString() === dept._id.toString();
          });

          if (selectedDept !== 'all' && selectedDept.toString() !== dept._id.toString()) {
            return null;
          }

          return (
            <div key={dept._id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-sky-400" />
                  <h4 className="font-extrabold text-sm text-white">{dept.departmentName} Department</h4>
                </div>
                <span className="text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2.5 py-0.5 rounded-full">
                  {deptManagers.length} Managers
                </span>
              </div>

              <div className="p-4 space-y-4 bg-slate-50/50">
                {deptManagers.length === 0 ? (
                  <p className="text-slate-400 italic text-xs py-2">No active managers listed for this department.</p>
                ) : (
                  deptManagers.map(mgr => {
                    const subs = getSubordinatesForManager(mgr);
                    const isCollapsed = !!collapsedManagers[mgr._id];

                    return (
                      <div key={mgr._id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <img
                              src={getUserAvatarUrl(mgr)}
                              alt="Avatar"
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-500 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-xs text-slate-900">{mgr.firstName} {mgr.lastName}</h5>
                                <span className="text-[8px] font-black uppercase px-2 py-0.2 rounded bg-sky-100 text-sky-800 font-mono">
                                  {mgr.role === 'hr' ? 'HR Manager' : 'Reporting Manager'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">{mgr.designationId?.designationName || 'Manager'} • <span className="font-mono">{mgr.employeeCode}</span></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {subs.length} Direct Reportees
                            </span>
                            <Link
                              to={`/reports/employee/${mgr._id}`}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                            >
                              <Eye size={12} />
                              <span>Profile</span>
                            </Link>
                            <button
                              onClick={() => toggleManager(mgr._id)}
                              className="text-slate-500 hover:text-slate-900 font-bold text-xs underline cursor-pointer"
                            >
                              {isCollapsed ? 'Expand ↓' : 'Collapse ↑'}
                            </button>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                            {subs.map(emp => (
                              <div key={emp._id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getUserAvatarUrl(emp)}
                                    alt="Avatar"
                                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-xs truncate">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-[9px] text-slate-500 font-mono">{emp.employeeCode}</p>
                                  </div>
                                </div>
                                <Link to={`/reports/employee/${emp._id}`} className="text-sky-600 hover:text-sky-800 p-1">
                                  <Eye size={12} />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
};

export default HRDashboard;
