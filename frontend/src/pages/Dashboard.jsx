import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { getUserAvatarUrl } from '../utils/avatar';
import { toast } from '../store/toastStore';
import {
  User,
  Calendar,
  AlertCircle,
  FileText,
  Users,
  ChevronRight,
  MapPin,
  UserCheck,
  RefreshCw,
  ChevronLeft,
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
  Plus,
  AlertTriangle,
  Image
} from 'lucide-react';
const PunchCard = () => {
  const [todayPunch, setTodayPunch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regIn, setRegIn] = useState('09:00');
  const [regOut, setRegOut] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getNetWorkingTime = () => {
    if (!todayPunch || !todayPunch.punchIn) return '00h 00m';
    if (todayPunch.punchOut) {
      return formatDuration(todayPunch.workingMinutes);
    }
    const elapsed = Math.max(0, Math.round((new Date().getTime() - new Date(todayPunch.punchIn).getTime()) / 60000));
    return formatDuration(elapsed);
  };

  const fetchTodayPunch = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/attendance/today');
      setTodayPunch(res.data);
    } catch (err) {
      console.error('Failed to fetch today punch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayPunch();
  }, []);

  const handlePunchIn = async () => {
    try {
      const res = await api.post('/api/attendance/punch-in', { location: 'Office' });
      setTodayPunch(res.data.punch);
      toast.success('Punched In successfully. Have a productive day!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch in.');
    }
  };

  const handlePunchOut = async () => {
    try {
      const res = await api.post('/api/attendance/punch-out');
      setTodayPunch(res.data.punch);
      toast.success('Punched Out successfully. Good work today!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch out.');
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReg(true);
      const pinDate = new Date(`${regDate}T${regIn}:00`);
      const poutDate = new Date(`${regDate}T${regOut}:00`);
      
      if (poutDate <= pinDate) {
        toast.error('Punch Out must be after Punch In.');
        return;
      }
      
      await api.post('/api/attendance/regularization', {
        date: regDate,
        requestedPunchIn: pinDate,
        requestedPunchOut: poutDate,
        reason: regReason
      });
      
      toast.success('Regularization request submitted for review.');
      setShowRegModal(false);
      setRegReason('');
      fetchTodayPunch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit regularization.');
    } finally {
      setSubmittingReg(false);
    }
  };

  const formatTime = (dateVal) => {
    if (!dateVal) return '--';
    const d = new Date(dateVal);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const formatDuration = (mins) => {
    if (!mins) return '00h 00m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing Attendance...</span>
        </div>
      </div>
    );
  }

  const hasPunchedIn = todayPunch && todayPunch.punchIn;
  const hasPunchedOut = todayPunch && todayPunch.punchOut;

  // Status mapping colors
  const statusColors = {
    'Present': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Half Day': 'bg-amber-50 text-amber-700 border-amber-200',
    'Absent': 'bg-rose-50 text-rose-700 border-rose-200',
    'Incomplete': 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse',
    'Not Punched Yet': 'bg-slate-50 text-slate-500 border-slate-200'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-full hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Today's Attendance</h4>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusColors[todayPunch?.status || 'Not Punched Yet']}`}>
            {todayPunch?.status || 'Not Punched Yet'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-xs font-semibold text-slate-700">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Punch In</span>
            <span className="text-slate-800 text-[13px] font-bold">{formatTime(todayPunch?.punchIn)}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Punch Out</span>
            <span className="text-slate-800 text-[13px] font-bold">{formatTime(todayPunch?.punchOut)}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Net Working Time</span>
            <span className="text-slate-800 text-[13px] font-bold">{getNetWorkingTime()}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Late By / OT</span>
            <span className="text-slate-800 text-[13px] font-bold">
              {todayPunch?.lateMinutes > 0 ? `${todayPunch.lateMinutes}m Late` : todayPunch?.overtimeMinutes > 0 ? `${formatDuration(todayPunch.overtimeMinutes)} OT` : '--'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1 mb-4">
          <span>Office Hours: 09:00 AM – 06:00 PM</span>
          {todayPunch?.regularizationStatus === 'pending' && (
            <span className="text-amber-600 font-bold animate-pulse">⚠️ Regularization Pending</span>
          )}
          {todayPunch?.regularizationStatus === 'approved' && (
            <span className="text-emerald-600 font-bold">✔ Regularized</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!hasPunchedIn ? (
          <button
            onClick={handlePunchIn}
            className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
          >
            Punch In
          </button>
        ) : !hasPunchedOut ? (
          <button
            onClick={handlePunchOut}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
          >
            Punch Out
          </button>
        ) : (
          <div className="flex-1 text-center bg-slate-50 border border-slate-200 text-slate-400 text-xs py-3 rounded-xl font-bold">
            Shift Completed
          </div>
        )}

        <button
          onClick={() => setShowRegModal(true)}
          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 p-3 rounded-xl transition-all cursor-pointer"
          title="Request Regularization"
        >
          <RefreshCw size={14} className={submittingReg ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Regularization Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-scale-in">
            <h3 className="font-extrabold text-slate-800 text-sm mb-1">Request Attendance Regularization</h3>
            <p className="text-[10px] text-slate-400 mb-4 uppercase font-bold tracking-wider">Submit shift time correction</p>

            <form onSubmit={handleRegSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Punch In Time</label>
                  <input
                    type="time"
                    value={regIn}
                    onChange={(e) => setRegIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Punch Out Time</label>
                  <input
                    type="time"
                    value={regOut}
                    onChange={(e) => setRegOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reason for correction</label>
                <textarea
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  placeholder="e.g. Forgot to punch out / worked from client location..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="flex-1 bg-sky-700 hover:bg-sky-850 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingReg ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


const Dashboard = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isAddWorkLogOpen, setIsAddWorkLogOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard statistics.');
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchDashboard().finally(() => setLoading(false));
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

  const profile = data?.profile || {};
  const deptId = user?.departmentId?._id || user?.departmentId || profile?.departmentId?._id || profile?.departmentId;

  // Choose sub-dashboard based on role
  let dashboardView = null;
  if (user?.role === 'employee') {
    dashboardView = <EmployeeDashboard data={data} user={user} onAddWorkLogClick={() => setIsAddWorkLogOpen(true)} />;
  } else if (user?.role === 'manager') {
    dashboardView = <ManagerDashboard data={data} user={user} onAddWorkLogClick={() => setIsAddWorkLogOpen(true)} />;
  } else if (user?.role === 'executive') {
    dashboardView = <ExecutiveDashboard data={data} user={user} />;
  } else if (user?.role === 'hr' || user?.role === 'admin') {
    dashboardView = <HRDashboard data={data} user={user} onAddWorkLogClick={() => setIsAddWorkLogOpen(true)} />;
  } else {
    dashboardView = <div className="p-6 bg-amber-50 text-amber-800 rounded-lg">Role Dashboard not defined.</div>;
  }

  return (
    <>
      {dashboardView}
      <AddWorkLogModal
        isOpen={isAddWorkLogOpen}
        onClose={() => setIsAddWorkLogOpen(false)}
        user={user}
        deptId={deptId}
        onSuccess={fetchDashboard}
      />
    </>
  );
};

// ==================== SUB-DASHBOARD: EMPLOYEE ====================

const EmployeeDashboard = ({ data, user, onAddWorkLogClick }) => {
  const navigate = useNavigate();
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

// ==================== SUB-DASHBOARD: MANAGER ====================

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
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow transition-colors shrink-0"
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

// ==================== SUB-DASHBOARD: HR & ADMIN ====================

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

  const [activeTab, setActiveTab] = useState('cycles'); // 'cycles', 'direct_reports', 'leaderboard', 'audits', 'attendance'
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

  const fetchHrSummary = async () => {
    try {
      setLoadingHrSummary(true);
      const res = await api.get('/api/hr/attendance-summary');
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddWorkLogClick}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer border border-indigo-700"
            >
              <Plus size={16} />
              <span>Log Daily Work</span>
            </button>
            <Link
              to="/hr/cycles"
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>New Review Cycle</span>
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

      {/* HR Self Assessment Action Banner (Displayed prominent OUTSIDE tabs) */}
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
                to={`/review/confirm/${pendingSelfAssessments[0].cycleId}`}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow transition-colors shrink-0"
              >
                Confirm Evidence &rarr;
              </Link>
            </div>
          );
        })()
      )}

      {/* Tabbed HR Control Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'tree' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>Org Tree Hierarchy</span>
        </button>

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
          onClick={() => setActiveTab('attendance')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'attendance' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          <span>Attendance Control Desk</span>
        </button>
      </div>

      {/* TAB 0: ORGANIZATIONAL TREE HIERARCHY */}
      {activeTab === 'tree' && <OrgTreeHierarchy />}

      {/* TAB: ATTENDANCE CONTROL DESK */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-fade-in text-xs font-semibold text-slate-700">

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
                  onChange={(e) => { setDateViewDate(e.target.value); fetchAttendanceByDate(e.target.value); }}
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
                if (s === 'Present') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
                if (s === 'Half Day') return 'text-amber-600 bg-amber-50 border-amber-200';
                if (s === 'Incomplete') return 'text-rose-500 bg-rose-50 border-rose-200';
                if (s === 'Weekly Off') return 'text-slate-500 bg-slate-50 border-slate-200';
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
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColor(r.status)}`}>
                                {r.status}
                              </span>
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
              {/* Segmented Mode Switcher */}
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
            
            {/* Employees Ranking (Top or Lowest) */}
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
                            ? (index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700')
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

            {/* Managers & HRs Ranking (Top or Lowest) */}
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
                            ? (index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700')
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

const OrgTreeHierarchy = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [collapsedManagers, setCollapsedManagers] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'directory'
  const [subSearch, setSubSearch] = useState({});
  const [subExpanded, setSubExpanded] = useState({});
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

  // Filter users by search & department
  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName} ${u.employeeCode} ${u.email} ${u.designationId?.designationName || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const uDeptId = u.departmentId?._id || u.departmentId;
    const matchesDept = selectedDept === 'all' || (uDeptId && uDeptId.toString() === selectedDept.toString());
    return matchesSearch && matchesDept;
  });

  // Level 1: CEO & Admin Executive Leadership
  const executives = filteredUsers.filter(u => u.role === 'executive' || u.role === 'admin');
  const ceoUser = executives.find(u => u.role === 'executive') || executives[0];
  const adminUsers = executives.filter(u => u._id !== ceoUser?._id);

  // Level 2: Managers & HR Leadership
  const managers = filteredUsers.filter(u => u.role === 'manager' || u.role === 'hr');

  // Subordinates helper
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

  // Unassigned employees
  const allManagedEmpIds = new Set(
    managers.flatMap(m => getSubordinatesForManager(m).map(e => e._id.toString()))
  );
  const unassignedEmployees = filteredUsers.filter(u =>
    u.role === 'employee' && !allManagedEmpIds.has(u._id.toString())
  );

  // Department theme helper
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
      {/* Top Header & Toolbar */}
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
            {/* View Mode Switcher */}
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

            {/* Global Search Input */}
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

            {/* Expand/Collapse Toggle */}
            <button
              onClick={toggleAll}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              {allCollapsed ? 'Expand All ↓' : 'Collapse All ↑'}
            </button>
          </div>
        </div>

        {/* Department Filter Pills Bar */}
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

      {/* ================= VIEW MODE 1: VISUAL TREE CHART ================= */}
      {viewMode === 'chart' ? (
        <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-10 overflow-x-auto min-w-[700px]">
          
          {/* LEVEL 1: EXECUTIVE ROOT NODE */}
          <div className="flex flex-col items-center space-y-4">
            <span className="px-3.5 py-1 bg-slate-900 text-white rounded-full font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-slate-700">
              <ShieldCheck size={12} className="text-amber-400" />
              <span>Level 1: Chief Executive Officer (CEO)</span>
            </span>

            <div className="flex justify-center items-center gap-6">
              {ceoUser && (
                <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border-2 border-amber-400/80 rounded-3xl p-5 shadow-2xl min-w-[320px] max-w-md relative transition-transform hover:scale-[1.02]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 font-black text-[9px] uppercase px-3 py-0.5 rounded-full shadow-md tracking-widest border border-amber-300">
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

          {/* TREE STEM */}
          <div className="relative py-2">
            <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
            <div className="w-3 h-3 bg-sky-600 ring-4 ring-sky-100 rounded-full mx-auto -mt-1.5 shadow-xs"></div>
          </div>

          {/* LEVEL 2: DEPARTMENT LEADERSHIP (STRICT SINGLE HORIZONTAL ROW) */}
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <span className="px-3.5 py-1 bg-emerald-700 text-white rounded-full font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Users size={13} className="text-emerald-200" />
                <span>Level 2: Department Leadership ({managers.length} Managers)</span>
              </span>
            </div>

            {/* Single Horizontal Row Container with Scrollbar */}
            <div className="overflow-x-auto custom-scrollbar pb-6 pt-2">
              {/* Connector horizontal line spanning single row */}
              {managers.length > 1 && (
                <div className="w-[88%] min-w-[1200px] h-0.5 bg-slate-300 mx-auto mb-2 rounded-full"></div>
              )}

              <div className="flex flex-nowrap items-stretch gap-6 min-w-max px-6 mx-auto justify-center">
                {managers.map((mgr) => {
                  const deptName = mgr.departmentId?.departmentName || 'General';
                  const style = getDepartmentStyle(deptName);
                  const allSubs = getSubordinatesForManager(mgr);
                  const isCollapsed = !!collapsedManagers[mgr._id];

                  // Mini filter & pagination inside card for large subordinate lists (50+ employees)
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
                      
                      {/* Manager Header Bar */}
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

                      {/* LEVEL 3: DIRECT SUBORDINATES (HIGH DENSITY PAGINATED CONTAINER) */}
                      {!isCollapsed && (
                        <div className="p-4 bg-slate-50/50 space-y-2.5 flex-1 border-t border-slate-100 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {/* Subordinate Search for Large Teams (> 5 reportees) */}
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

                          {/* Pagination Controls for Large Teams (> 5 reportees) */}
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
                )
              })}
            </div>
          </div>
        </div>

          {/* UNASSIGNED EMPLOYEES CONTAINER */}
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
        /* ================= VIEW MODE 2: COMPACT HIGH-DENSITY DIRECTORY ================= */
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

// ==================== SUB-DASHBOARD: EXECUTIVE (CEO) ====================

const ExecutiveDashboard = ({ data, user }) => {
  const {
    stats = {},
    activeCycleMetrics = [],
    pendingManagerReviews = [],
    topEmployeesRanking = [],
    topManagersRanking = [],
    allEmployeeScores = [],
    allManagerScores = [],
    recentAudits = []
  } = data || {};

  const [activeTab, setActiveTab] = useState('grading'); // 'grading', 'leaderboard', 'cycles', 'audits', 'attendance'
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

  const fetchCeoSummary = async () => {
    try {
      setLoadingCeoSummary(true);
      const res = await api.get('/api/ceo/attendance-summary');
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
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'tree' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>Org Tree Hierarchy</span>
        </button>

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
          onClick={() => setActiveTab('attendance')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'attendance' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          <span>Attendance Analytics</span>
        </button>
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
                  value={ceoDateViewDate}
                  max={ceotodayIso}
                  onChange={(e) => { setCeoDateViewDate(e.target.value); fetchCeoAttendanceByDate(e.target.value); }}
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
                if (s === 'Present') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
                if (s === 'Half Day') return 'text-amber-600 bg-amber-50 border-amber-200';
                if (s === 'Incomplete') return 'text-rose-500 bg-rose-50 border-rose-200';
                if (s === 'Weekly Off') return 'text-slate-500 bg-slate-50 border-slate-200';
                return 'text-rose-600 bg-rose-50 border-rose-200';
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <span className="text-emerald-600">✓ Present: {ceoDateAttendance.records.filter(r => r.status === 'Present').length}</span>
                    <span className="text-amber-600">◑ Half Day: {ceoDateAttendance.records.filter(r => r.status === 'Half Day').length}</span>
                    <span className="text-rose-600">✗ Absent: {ceoDateAttendance.records.filter(r => r.status === 'Absent').length}</span>
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
                              {r.lateMinutes > 0 ? <span className="text-rose-600 font-bold">{r.lateMinutes}m late</span> : <span className="text-emerald-600">On time</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColor(r.status)}`}>
                                {r.status}
                              </span>
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
              {/* Segmented Mode Switcher */}
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
                            ? (index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700')
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
                            ? (index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700')
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

const AddWorkLogModal = ({ isOpen, onClose, user, deptId, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('Development');
  const [hoursSpent, setHoursSpent] = useState('');
  const [resultSummary, setResultSummary] = useState('');
  const [evidenceType, setEvidenceType] = useState('Screenshot');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [formTemplate, setFormTemplate] = useState(null);
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !deptId) return;
    const fetchTemplate = async () => {
      try {
        const res = await api.get(`/api/work-journal-templates/department/${deptId}`);
        if (res.data) {
          setFormTemplate(res.data);
          if (res.data.categories && res.data.categories.length > 0) {
            setCategory(res.data.categories[0].name);
          }
          if (res.data.evidenceTypes && res.data.evidenceTypes.length > 0) {
            setEvidenceType(res.data.evidenceTypes[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load template:', err);
      }
    };
    fetchTemplate();
  }, [isOpen, deptId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !category) {
      toast.error('Achievement Title and Category are required.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('project', project);
      formData.append('category', category);
      formData.append('hoursSpent', hoursSpent);
      formData.append('resultSummary', resultSummary);
      formData.append('evidenceType', evidenceType);
      formData.append('evidenceRef', evidenceRef);
      formData.append('completedDate', completedDate);
      formData.append('customFieldsData', JSON.stringify(customFieldsData));

      if (screenshotFile) {
        formData.append('file', screenshotFile);
      }

      await api.post('/api/work-journal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Daily Work Log submitted for manager verification!');
      
      // Reset state
      setTitle('');
      setProject('');
      setCategory('Development');
      setHoursSpent('');
      setResultSummary('');
      setEvidenceRef('');
      setScreenshotFile(null);
      setImagePreviewUrl('');
      setCustomFieldsData({});
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit work log.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const CATEGORIES = [
    'Development',
    'Testing',
    'Bug Fix',
    'Architecture',
    'Code Review',
    'Documentation',
    'Deployment',
    'Client Support',
    'Process Improvement',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 border border-slate-100 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 rounded-lg text-sky-700">
              <ClipboardList size={16} />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Log Daily Work Achievement</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-605 font-bold cursor-pointer text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {formTemplate?.titleLabel || 'Achievement Title'} *
            </label>
            <input
              type="text"
              placeholder={formTemplate?.titlePlaceholder || 'e.g. Conducted client pitch meeting...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-850 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {formTemplate?.projectLabel || 'Project / Module'}
              </label>
              <input
                type="text"
                placeholder={formTemplate?.projectPlaceholder || 'e.g. Enterprise Client / System'}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-855 outline-none cursor-pointer focus:border-sky-500"
                required
              >
                {(formTemplate?.categories && formTemplate.categories.length > 0 
                  ? formTemplate.categories.map(c => c.name) 
                  : CATEGORIES
                ).map(catName => (
                  <option key={catName} value={catName}>{catName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Date Completed *</label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-855 outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Hours Spent</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 3.5"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {formTemplate?.summaryLabel || 'Work Summary & Output Result'}
            </label>
            <textarea
              rows="3"
              placeholder={formTemplate?.summaryPlaceholder || 'Summarize what was delivered...'}
              value={resultSummary}
              onChange={(e) => setResultSummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-850 outline-none focus:border-sky-500"
            ></textarea>
          </div>

          {formTemplate?.customFields && formTemplate.customFields.length > 0 && (
            <div className="space-y-3 bg-sky-50/50 p-3 rounded-xl border border-sky-100">
              <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider block">
                {formTemplate.departmentId?.departmentName || 'Department'} Custom Questions
              </span>
              {formTemplate.customFields.map((field) => (
                <div key={field.fieldKey} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                  </label>
                  {field.fieldType === 'select' ? (
                    <select
                      value={customFieldsData[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                      required={field.required}
                    >
                      <option value="">-- Select Option --</option>
                      {field.options?.map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.fieldType === 'textarea' ? (
                    <textarea
                      rows={2}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={customFieldsData[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-855 outline-none focus:border-sky-500"
                      required={field.required}
                    />
                  ) : (
                    <input
                      type={field.fieldType === 'number' ? 'number' : field.fieldType === 'url' ? 'url' : 'text'}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={customFieldsData[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-855 outline-none cursor-pointer focus:border-sky-500"
              >
                {(formTemplate?.evidenceTypes && formTemplate.evidenceTypes.length > 0
                  ? formTemplate.evidenceTypes
                  : ['Screenshot Upload', 'Github PR / Commit', 'Jira / Task Ticket', 'Document / Doc Link', 'Client Email / Approval']
                ).map((evType, evIdx) => (
                  <option key={evIdx} value={evType}>{evType}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {formTemplate?.evidenceRefLabel || 'Proof Link / Reference ID'}
              </label>
              <input
                type="text"
                placeholder={formTemplate?.evidenceRefPlaceholder || 'e.g. URL or Doc Ref'}
                value={evidenceRef}
                onChange={(e) => setEvidenceRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Screenshot Proof (Optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs cursor-pointer outline-none focus:border-sky-500"
            />
            {imagePreviewUrl && (
              <div className="mt-2 relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 max-h-36 flex justify-center items-center">
                <img src={imagePreviewUrl} alt="Preview" className="max-h-32 object-contain" />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black cursor-pointer shadow-md transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
