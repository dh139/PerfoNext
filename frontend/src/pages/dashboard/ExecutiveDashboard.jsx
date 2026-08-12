import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, Layers, Briefcase, Clock, Trophy, Calendar, RefreshCw,
  Search, ChevronLeft, ChevronRight, Eye, AlertTriangle, CheckCircle2, Plus, User, Bell
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../store/toastStore';
import { getUserAvatarUrl } from '../../utils/avatar';
import PunchCard from './PunchCard';
import { OrgTreeHierarchy } from './HRDashboard';

const ExecutiveDashboard = ({ data, user }) => {
  const {
    stats = {},
    activeCycleMetrics = [],
    pendingManagerReviews = [],
    topEmployeesRanking = [],
    topManagersRanking = [],
    allEmployeeScores = [],
    allManagerScores = [],
    recentAudits = [],
    notifications = []
  } = data || {};

  const [activeTab, setActiveTab] = useState('hub'); // 'hub', 'tree', 'grading', 'leaderboard', 'cycles', 'attendance'
  const [ceoSummary, setCeoSummary] = useState(null);
  const [loadingCeoSummary, setLoadingCeoSummary] = useState(true);
  const [pendingRegs, setPendingRegs] = useState([]);

  // Date-based attendance viewer
  const ceotodayIso = new Date().toISOString().split('T')[0];
  const [ceoDateViewDate, setCeoDateViewDate] = useState(ceotodayIso);
  const [ceoDateAttendance, setCeoDateAttendance] = useState(null);
  const [loadingCeoDateAttendance, setLoadingCeoDateAttendance] = useState(false);
  const [ceoDateSearch, setCeoDateSearch] = useState('');
  const [ceoDatePage, setCeoDatePage] = useState(1);

  const fetchCeoAttendanceByDate = async (d) => {
    try {
      setLoadingCeoDateAttendance(true);
      const res = await api.get(`/api/attendance/by-date?date=${d}`);
      setCeoDateAttendance(res.data);
      setCeoDatePage(1); // Reset page on date change
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCeoDateAttendance(false);
    }
  };

  const fetchCeoSummary = async (d) => {
    try {
      setLoadingCeoSummary(true);
      const url = d ? `/api/ceo/attendance-summary?date=${d}` : '/api/ceo/attendance-summary';
      const res = await api.get(url);
      setCeoSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCeoSummary(false);
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

  const handleReviewReg = async (id, status) => {
    try {
      await api.post('/api/attendance/review-regularization', { id, status });
      toast.success(`Regularization request ${status} successfully.`);
      fetchPendingRegs();
      fetchCeoSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review request.');
    }
  };

  useEffect(() => {
    fetchCeoSummary();
    fetchPendingRegs();
    fetchCeoAttendanceByDate(ceotodayIso);
  }, []);
  
  // Grading Tab State
  const [gradingSearch, setGradingSearch] = useState('');
  const [gradingFilter, setGradingFilter] = useState('all'); // 'all', 'needs_grade', 'self_pending', 'completed'
  const [gradingPage, setGradingPage] = useState(1);

  // Leaderboard Tab State
  const [leaderboardDept, setLeaderboardDept] = useState('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardViewMode, setLeaderboardViewMode] = useState('top'); // 'top' | 'lowest'
  const [leaderboardCycle, setLeaderboardCycle] = useState('all');

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
        
        {/* Executive Hero Header — unified design system */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
                  Executive Dashboard
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
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

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* CEO identity chip — mirrors Reporting Manager card in Employee dashboard */}
              <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-2xl text-[10px] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Role</p>
                  <p className="text-slate-200 font-black mt-0.5">Chief Executive Officer</p>
                </div>
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
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Review Cycles</p>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{stats.totalTemplates || 0}</h2>
                <span className="text-[9px] text-amber-400 font-medium">KPI Frameworks</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Briefcase size={20} />
              </div>
            </div>

          </div>
        </div>

        {/* Command Suite + Recent Alerts */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Command Cards Grid */}
          <div className="flex-1 space-y-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Management Command Desk</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
              {/* Card 1: Org Tree */}
              <div 
                onClick={() => setActiveTab('tree')}
                className="bg-white border border-slate-200/80 hover:border-sky-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-4 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-2xs">
                  <Layers size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-sky-600 transition-colors">Org Tree Hierarchy</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Visualize the enterprise reporting lines, departments, and active employee node mappings.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-sky-600 group-hover:translate-x-1.5 transition-transform">
                  <span>Enter Visualizer</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Card 2: Direct Subordinates */}
              <div 
                onClick={() => setActiveTab('grading')}
                className="bg-white border border-slate-200/80 hover:border-emerald-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs relative">
                  <Users size={22} />
                  {needsCeoGradeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce shadow">
                      {needsCeoGradeCount}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-emerald-600 transition-colors">Direct Subordinates</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Evaluate performance cycles, submit grades, and track completion of your leadership reports.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 group-hover:translate-x-1.5 transition-transform">
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
                className="bg-white border border-slate-200/80 hover:border-amber-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                  <Calendar size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-amber-600 transition-colors">Review Cycles</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Track global cycle progress, check templates status, and review active cycle timelines.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-amber-600 group-hover:translate-x-1.5 transition-transform">
                  <span>Track Progress</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Card 5: Attendance Analytics */}
              <div 
                onClick={() => setActiveTab('attendance')}
                className="bg-white border border-slate-200/80 hover:border-sky-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden md:col-span-2"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-4 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-2xs">
                  <Clock size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-sky-600 transition-colors">Attendance Analytics</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">Analyze daily punches, identify late arrivals, and monitor average clock-in/out speeds.</p>
                <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-sky-600 group-hover:translate-x-1.5 transition-transform">
                  <span>View Attendance</span>
                  <span>&rarr;</span>
                </div>
              </div>

            </div>
          </div>

          {/* Recent Alerts Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4">Recent Alerts</h2>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
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
              <div className="space-y-3.5 pr-1 pt-1">
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
          {activeTab === 'grading' && 'Direct Reports Evaluations'}
          {activeTab === 'leaderboard' && 'Performance Leaderboard'}
          {activeTab === 'cycles' && 'Review Cycles Progress'}
          {activeTab === 'attendance' && 'Attendance Analytics'}
        </span>
      </div>

      {/* TAB 0: ORGANIZATIONAL TREE HIERARCHY */}
      {activeTab === 'tree' && <OrgTreeHierarchy />}

      {/* TAB: ATTENDANCE ANALYTICS */}
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
                      <p className="font-bold text-slate-800">
                        {reg.employeeId?.firstName} {reg.employeeId?.lastName} ({reg.employeeId?.employeeCode || 'N/A'})
                        <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-650 font-extrabold font-mono">
                          {reg.employeeId?.role === 'hr' ? 'HR' : reg.employeeId?.role === 'manager' ? 'Manager' : 'Staff'}
                        </span>
                      </p>
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

          {/* Date-based Attendance Register */}
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
                  value={ceoDateViewDate}
                  max={ceotodayIso}
                  onChange={(e) => { 
                    setCeoDateViewDate(e.target.value); 
                    fetchCeoAttendanceByDate(e.target.value); 
                    fetchCeoSummary(e.target.value); 
                  }}
                  className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                />
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-48">
                  <Search size={13} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={ceoDateSearch}
                    onChange={(e) => { setCeoDateSearch(e.target.value); setCeoDatePage(1); }}
                    className="bg-transparent text-xs text-slate-700 outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {loadingCeoDateAttendance ? (
              <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div></div>
            ) : !ceoDateAttendance ? (
              <p className="text-slate-400 text-center py-6">No data. Select a date.</p>
            ) : (() => {
              const filtered = ceoDateAttendance.records.filter(r =>
                r.name.toLowerCase().includes(ceoDateSearch.toLowerCase()) ||
                r.code.toLowerCase().includes(ceoDateSearch.toLowerCase()) ||
                r.department.toLowerCase().includes(ceoDateSearch.toLowerCase())
              );
              const ITEMS_PER_PAGE = 10;
              const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
              const safeCurrentPage = Math.min(ceoDatePage, totalPages);
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
                    <span className="text-emerald-600">✓ Present: {ceoDateAttendance.records.filter(r => ['Present', 'Regularized', 'Late', 'Incomplete'].includes(r.status)).length}</span>
                    <span className="text-amber-600">◑ Half Day: {ceoDateAttendance.records.filter(r => r.status === 'Half Day').length}</span>
                    <span className="text-rose-600">✗ Absent: {ceoDateAttendance.records.filter(r => ['Absent', 'Auto Closed', 'Unusual'].includes(r.status)).length}</span>
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
                                `${Math.floor(r.workingMinutes/60)}h ${r.workingMinutes%60}m${!r.punchOut && ceoDateViewDate === ceotodayIso ? ' (Active)' : ''}`
                              ) : '--'}
                            </td>
                            <td className="py-2.5 px-3">
                              {!r.punchIn || ['Absent', 'Not Punched Yet', 'Leave'].includes(r.status) ? (
                                <span className="text-slate-300">--</span>
                              ) : r.lateMinutes > 0 ? (
                                <span className="text-rose-600 font-bold">{r.lateMinutes}m late</span>
                              ) : (
                                <span className="text-emerald-600">On time</span>
                              )}
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
                        onClick={() => setCeoDatePage(prev => Math.max(prev - 1, 1))}
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
                        onClick={() => setCeoDatePage(prev => Math.min(prev + 1, totalPages))}
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

          {/* Today's High-Level Stats */}
          {loadingCeoSummary ? (
            <div className="py-12 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-2"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing Org Attendance Stats...</span>
            </div>
          ) : ceoSummary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Today's Attendance</p>
                  <h2 className="text-2xl font-black text-slate-800 mt-1">{ceoSummary.attendancePercentage}%</h2>
                  <span className="text-[9px] text-emerald-600 font-bold block mt-1">Present: {ceoSummary.present} | Half Day: {ceoSummary.halfDay}</span>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Late Arrivals Rate</p>
                  <h2 className="text-2xl font-black text-rose-600 mt-1">{ceoSummary.latePercentage}%</h2>
                  <span className="text-[9px] text-rose-600 font-bold block mt-1">{ceoSummary.late} late arrivals today</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average Login Time</p>
                  <h2 className="text-2xl font-black text-indigo-600 mt-1">{ceoSummary.avgLoginTime}</h2>
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">First punch today</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average Logout Time</p>
                  <h2 className="text-2xl font-black text-sky-600 mt-1">{ceoSummary.avgLogoutTime}</h2>
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Last punch today</span>
                </div>
              </div>

              {/* Detail Rows */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Department breakdown */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-[13px] mb-4">Department-wise Attendance</h3>
                    <div className="space-y-4">
                      {ceoSummary.deptBreakdown?.map((d, i) => (
                        <div key={i} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0">
                          <div>
                            <span className="font-bold text-slate-700">{d.departmentName}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">{d.active} active staff</span>
                          </div>
                          <span className={`text-[12px] font-black ${d.percentage >= 90 ? 'text-emerald-600' : d.percentage >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {d.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Late Arrivals List */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-[13px] mb-4">Late Arrivals Today</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {ceoSummary.lateEmployees?.length === 0 ? (
                        <p className="text-slate-400 text-xs py-8 text-center font-medium">All reportees arrived on time today!</p>
                      ) : (
                        ceoSummary.lateEmployees?.map((emp, i) => (
                          <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="font-bold text-slate-800">{emp.name}</span>
                            <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-bold text-[10px]">
                              {emp.lateMinutes} mins late
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Not Punched / Absent List */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-[13px] mb-4">Not Punched Yet / Absent</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {ceoSummary.absentEmployees?.length === 0 ? (
                        <p className="text-slate-400 text-xs py-8 text-center font-medium">100% punch completion reached today.</p>
                      ) : (
                        ceoSummary.absentEmployees?.map((name, i) => (
                          <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
                            {name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 1: DIRECT SUBORDINATES GRADING TABLE */}
      {activeTab === 'grading' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in">
          
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
                            Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Cycle: {score.reviewCycleId?.reviewMonth}
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

            {/* Managers Ranking */}
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
                            Dept: <span className="font-semibold text-slate-700">{score.employeeId?.departmentId?.departmentName || '-'}</span> | Cycle: {score.reviewCycleId?.reviewMonth}
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
                          className={`p-2 bg-white border border-slate-200 rounded-xl transition-colors ${
                            leaderboardViewMode === 'top' ? 'text-slate-600 hover:text-emerald-700' : 'text-slate-600 hover:text-rose-700'
                          }`}
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
                const isManagerCycle = item.targetRole === 'manager';
                const visibleSubmissions = item.submissions?.filter(sub =>
                  isManagerCycle ? (sub.role === 'manager' || sub.role === 'hr') : sub.role === 'employee'
                ) || [];
                const totalCount = visibleSubmissions.length;
                const selfCount = visibleSubmissions.filter(s => s.selfSubmitted).length;
                const mgrCount = visibleSubmissions.filter(s => s.managerSubmitted).length;
                const completePercent = totalCount > 0 ? Math.round((visibleSubmissions.filter(s => s.selfSubmitted && s.managerSubmitted).length / totalCount) * 100) : 0;

                const isExpanded = expandedCycleId === item.cycleId;

                return (
                  <div key={item.cycleId} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">
                            Cycle Month: {item.reviewMonth}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            isManagerCycle ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {isManagerCycle ? 'Manager Cycle' : 'Employee Cycle'}
                          </span>
                        </div>
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
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {isManagerCycle ? 'Phase 1: Manager Self-Assessment' : 'Phase 1: Employee Self-Assessment'}
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selfCount} / {totalCount}</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {isManagerCycle ? 'Phase 2: CEO Grading' : 'Phase 2: Manager Review'}
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">{mgrCount} / {totalCount}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedCycleId(isExpanded ? null : item.cycleId)}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition-colors cursor-pointer"
                    >
                      {isExpanded
                        ? (isManagerCycle ? 'Hide Manager Submissions ↑' : 'Hide Employee Submissions ↑')
                        : (isManagerCycle ? `View Manager Submissions (${visibleSubmissions.length}) ↓` : `View Employee Submissions (${visibleSubmissions.length}) ↓`)
                      }
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 animate-fade-in border-t border-slate-200">
                        {visibleSubmissions.length === 0 ? (
                          <p className="text-slate-400 text-xs italic py-2 text-center">No participants registered in this cycle group.</p>
                        ) : (
                          visibleSubmissions.map((sub, idx) => {
                            const empObj = sub.employee || sub;
                            const empName = `${empObj.firstName || ''} ${empObj.lastName || ''}`.trim() || 'Employee';
                            const desName = empObj.designationId?.title || sub.designationName || '';
                            const mgrObj = empObj.managerId;
                            const mgrName = mgrObj ? `${mgrObj.firstName || ''} ${mgrObj.lastName || ''}`.trim() : (sub.managerName || 'N/A');

                            return (
                              <div key={sub.employeeId || empObj._id || idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800">{empName}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {desName ? `${desName} • ` : ''}Manager: {mgrName}
                                  </p>
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
    </div>
  );
};

export default ExecutiveDashboard;
