import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, User, TrendingUp, AlertCircle, Calendar, MessageSquare, Plus, Minus, Award, FileText, Sparkles, Download, RefreshCw, Eye, Star } from 'lucide-react';
import { toast } from '../store/toastStore';
import useAuthStore from '../store/authStore';
import { exportToCsv } from '../utils/csvExport';
import { getUserAvatarUrl } from '../utils/avatar';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

const EmployeeReport = () => {
  const { id: employeeId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  
  // Phase 2 states
  const [recognitions, setRecognitions] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Phase 3 states
  const { user } = useAuthStore();
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchInsights = async (cycleId) => {
    if (user?.role === 'employee') return;
    try {
      setLoadingInsights(true);
      const url = cycleId ? `/api/insights/${employeeId}?cycleId=${cycleId}` : `/api/insights/${employeeId}`;
      const res = await api.get(url);
      setAiInsights(res.data);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchAddons = async () => {
    try {
      const recRes = await api.get(`/api/recognitions?employeeId=${employeeId}`);
      setRecognitions(recRes.data);

      const certRes = await api.get(`/api/certifications?employeeId=${employeeId}`);
      setCertifications(certRes.data);

      const attRes = await api.get(`/api/integrations/attendance?employeeId=${employeeId}`);
      setAttendanceRecords(attRes.data);
    } catch (err) {
      console.error('Failed to load addons:', err);
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/reports/employee/${employeeId}`);
        setData(res.data);
        
        // Select the most recent score cycle by default
        const scores = res.data.scores || [];
        if (scores.length > 0) {
          setSelectedCycleId(scores[scores.length - 1].reviewCycleId._id);
        }

        await fetchAddons();
      } catch (err) {
        console.error(err);
        setError('Failed to fetch employee performance report.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [employeeId]);

  useEffect(() => {
    if (selectedCycleId) {
      fetchInsights(selectedCycleId);
    }
  }, [selectedCycleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-center gap-3">
        <AlertCircle className="text-rose-600" />
        <span>{error || 'No performance data available.'}</span>
      </div>
    );
  }

  const { employee, scores, selfAssessments, managerReviews } = data;

  // Find currently selected cycle scores
  const selectedScore = scores.find(s => s.reviewCycleId?._id?.toString() === selectedCycleId?.toString());
  const selectedSelf = selfAssessments.find(sa => sa.reviewCycleId?.toString() === selectedCycleId?.toString());
  const selectedManager = managerReviews.find(mr => mr.reviewCycleId?.toString() === selectedCycleId?.toString());

  // Map 6 Core Manager Competencies provided by reporting manager
  const getCycleDetails = () => {
    const list = [];
    if (!selectedManager) return list;

    if (selectedManager.competencyRatings) {
      const compMap = [
        { key: 'communication', name: 'Communication & Collaboration', category: 'communication', desc: 'Clear expression, proactive updates, team transparency' },
        { key: 'ownership', name: 'Ownership & Accountability', category: 'ownership', desc: 'Takes responsibility for deliverables and defect resolutions' },
        { key: 'leadership', name: 'Leadership & Initiative', category: 'leadership', desc: 'Guides peers, proposes improvements, leads initiatives' },
        { key: 'teamwork', name: 'Teamwork & Support', category: 'teamwork', desc: 'Assists teammates, shares knowledge, unblocks colleagues' },
        { key: 'learningAbility', name: 'Learning & Adaptability', category: 'learning', desc: 'Quickly picks up new tech stacks and domain skills' },
        { key: 'problemSolving', name: 'Problem Solving & Critical Thinking', category: 'productivity', desc: 'Analyzes root causes effectively and delivers robust fixes' }
      ];

      compMap.forEach(item => {
        const mgrVal = selectedManager.competencyRatings[item.key];
        if (mgrVal !== undefined) {
          list.push({
            id: item.key,
            category: item.category,
            kpiName: item.name,
            desc: item.desc,
            managerScore: mgrVal,
            managerComment: selectedManager.overallComments || 'Performed overall well.'
          });
        }
      });
    }

    return list;
  };

  const cycleDetails = getCycleDetails();

  const getFilteredAddons = () => {
    if (!selectedScore) {
      return {
        filteredAttendance: [],
        filteredCerts: [],
        filteredRecognitions: []
      };
    }

    const cycle = selectedScore.reviewCycleId;
    let startBound = new Date(cycle.startDate);
    let endBound = new Date(cycle.endDate);

    if ((cycle.cycleType === 'quarterly' || /^\d{4}-Q[1-4]$/i.test(cycle.reviewMonth)) && cycle.reviewMonth) {
      const match = cycle.reviewMonth.match(/^(\d{4})-Q([1-4])$/i);
      if (match) {
        const year = parseInt(match[1], 10);
        const q = parseInt(match[2], 10);
        const startMonth = (q - 1) * 3;
        startBound = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
        endBound = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
      }
    } else if ((cycle.cycleType === 'half_yearly' || /^\d{4}-H[1-2]$/i.test(cycle.reviewMonth)) && cycle.reviewMonth) {
      const match = cycle.reviewMonth.match(/^(\d{4})-H([1-2])$/i);
      if (match) {
        const year = parseInt(match[1], 10);
        const h = parseInt(match[2], 10);
        const startMonth = (h - 1) * 6;
        startBound = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
        endBound = new Date(Date.UTC(year, startMonth + 6, 0, 23, 59, 59));
      }
    } else if (['yearly', 'annual'].includes(cycle.cycleType) || (cycle.reviewMonth && /^\d{4}$/.test(cycle.reviewMonth))) {
      const match = (cycle.reviewMonth || '').match(/^(\d{4})/);
      if (match) {
        const year = parseInt(match[1], 10);
        startBound = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
        endBound = new Date(Date.UTC(year, 12, 0, 23, 59, 59));
      }
    } else if (cycle.reviewMonth && /^\d{4}-\d{2}$/.test(cycle.reviewMonth)) {
      const [year, month] = cycle.reviewMonth.split('-').map(Number);
      startBound = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    }

    const getMonthsInRange = (start, end) => {
      const months = [];
      const curr = new Date(start);
      while (curr <= end) {
        const yearStr = curr.getUTCFullYear();
        const monthStr = String(curr.getUTCMonth() + 1).padStart(2, '0');
        months.push(`${yearStr}-${monthStr}`);
        curr.setUTCMonth(curr.getUTCMonth() + 1);
      }
      return months;
    };
    
    const cycleMonths = getMonthsInRange(startBound, endBound);
    const fAtt = attendanceRecords.filter(r => cycleMonths.includes(r.month));

    const fCerts = certifications.filter(c => {
      const issueDate = new Date(c.issueDate);
      return issueDate >= startBound && issueDate <= endBound;
    });

    const fRecs = recognitions.filter(r => {
      const awardDate = new Date(r.awardedAt || r.createdAt);
      return awardDate >= startBound && awardDate <= endBound;
    });

    return {
      filteredAttendance: fAtt,
      filteredCerts: fCerts,
      filteredRecognitions: fRecs
    };
  };

  const { filteredAttendance, filteredCerts, filteredRecognitions } = getFilteredAddons();

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'workQuality': return 'Work Quality';
      case 'productivity': return 'Productivity';
      case 'technical': return 'Technical Skills';
      case 'communication': return 'Communication';
      case 'ownership': return 'Ownership';
      case 'learning': return 'Learning & Growth';
      default: return cat;
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'workQuality': return 'bg-sky-500';
      case 'productivity': return 'bg-amber-500';
      case 'technical': return 'bg-indigo-500';
      case 'communication': return 'bg-emerald-500';
      case 'ownership': return 'bg-rose-500';
      case 'learning': return 'bg-purple-500';
      default: return 'bg-slate-500';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const getLevelBadge = (u) => {
    if (!u) return null;
    const jd = u.joiningDate ? new Date(u.joiningDate) : null;
    let expText = 'New Joiner';
    if (jd && !isNaN(jd.getTime())) {
      const diffYears = Math.round((Math.abs(new Date() - jd) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
      if (diffYears < 0.1) {
        expText = '< 1 mo tenure';
      } else if (diffYears < 1) {
        const months = Math.round(diffYears * 12);
        expText = `${months} mos tenure`;
      } else {
        expText = `${diffYears} yrs tenure`;
      }
    }

    const lvl = u.level || 5;
    let levelTitle = `L${lvl}`;
    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

    switch (lvl) {
      case 1:
        levelTitle = 'L1 • Executive';
        badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
        break;
      case 2:
        levelTitle = 'L2 • Senior Lead';
        badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        break;
      case 3:
        levelTitle = 'L3 • Team Lead';
        badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        break;
      case 4:
        levelTitle = 'L4 • Senior Staff';
        badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
        break;
      case 5:
        levelTitle = 'L5 • Mid-Level';
        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        break;
      case 6:
      default:
        levelTitle = 'L6 • Associate';
        badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
        break;
    }

    return (
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
          {levelTitle}
        </span>
        <span className="text-[11px] text-slate-500 font-semibold">• {expText}</span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Back Button */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Overview</span>
        </button>
      </div>

      {/* Employee Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <img
            src={getUserAvatarUrl(employee)}
            alt="Avatar"
            className="w-14 h-14 rounded-full object-cover ring-4 ring-slate-100 shadow-sm shrink-0"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-snug">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-xs text-slate-500">
              ID: {employee.employeeCode} | Department: <span className="font-semibold text-slate-700">{employee.departmentId?.departmentName}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Designation: {employee.designationId?.designationName}</p>
            {getLevelBadge(employee)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {employee.managerId && (
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs">
              <p className="text-slate-400 font-medium">Designated Manager</p>
              <p className="font-bold text-slate-700 mt-0.5">{employee.managerId.firstName} {employee.managerId.lastName}</p>
            </div>
          )}
        </div>
      </div>

      {scores.length === 0 ? (
        <div className="py-12 bg-white border rounded-2xl text-center shadow-sm">
          <p className="text-slate-500 text-xs">No completed reviews available for this employee.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Performance Insights (Managers / HR / Admin only) */}
          {user?.role !== 'employee' && (
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 border border-sky-900/60 rounded-2xl p-6 shadow-xl text-slate-200 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                    <Sparkles size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm tracking-tight text-slate-100">AI Performance Insights</h3>
                      {aiInsights?.startDate && aiInsights?.endDate && (
                        <span className="text-[9px] font-mono font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 flex items-center gap-1">
                          <Calendar size={10} />
                          <span>
                            {formatDate(aiInsights.startDate)} – {formatDate(aiInsights.endDate)}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Deep skill, attendance, certification, & score trends analysis for this cycle period</p>
                  </div>
                </div>
                
                <button
                  onClick={async () => {
                    try {
                      setLoadingInsights(true);
                      const res = await api.post(`/api/review-cycles/${selectedCycleId || 'latest'}/employees/${employeeId}/insights/regenerate`);
                      setAiInsights(res.data);
                      toast.success('AI Performance Insights regenerated successfully!');
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to regenerate AI insights.');
                    } finally {
                      setLoadingInsights(false);
                    }
                  }}
                  disabled={loadingInsights}
                  className="text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold px-3 py-1.5 rounded-xl border border-sky-500/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw size={12} className={loadingInsights ? 'animate-spin' : ''} />
                  <span>{loadingInsights ? 'Analyzing...' : 'Regenerate Insights'}</span>
                </button>
              </div>

              {loadingInsights ? (
                <div className="space-y-3 py-3 animate-pulse text-xs">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                  <div className="h-12 bg-slate-800 rounded-xl"></div>
                </div>
              ) : aiInsights ? (
                <div className="space-y-5 text-xs leading-relaxed">
                  {/* AI Score Header Banner */}
                  <div className="bg-sky-950/70 border border-sky-800/70 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1 sm:pr-4">
                      <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                        {aiInsights.aiScoreRationale || aiInsights.summary || 'Comprehensive AI analysis synthesizing verified daily work logs, manager feedback ratings, attendance, certifications, and awards.'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 bg-slate-900 border border-sky-700/80 px-4 py-2 rounded-xl shadow-inner">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">AI Score</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-black text-sky-400">{aiInsights.aiScore ? Number(aiInsights.aiScore).toFixed(2) : '4.50'}</span>
                        <span className="text-[9px] text-slate-500">/ 5.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Logging Consistency Badge */}
                  <div className="flex">
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-xs inline-block">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Logging Consistency</span>
                      <span className={`font-extrabold text-[11px] mt-0.5 block ${
                        aiInsights.loggingConsistency === 'Excellent' || aiInsights.loggingConsistency === 'Good' ? 'text-emerald-400' :
                        aiInsights.loggingConsistency === 'Poor' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {aiInsights.loggingConsistency || 'Moderate'}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-355 leading-normal text-[12px] font-medium border-l-2 border-sky-500 pl-3 text-slate-300">
                    {aiInsights.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Strengths */}
                    <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Observed Strengths</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                        {aiInsights.strengths?.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Development Areas</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                        {aiInsights.improvements?.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Indicators and Action items */}
                  <div className="pt-3 border-t border-slate-800/85 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="flex gap-4">
                      <div className="text-xs">
                        <span className="text-slate-500 font-semibold block text-[10px] uppercase">Sentiment Indicator</span>
                        <span className={`inline-block font-bold text-[11px] mt-1.5 px-2.5 py-0.5 rounded-full ${
                          aiInsights.sentiment === 'Positive' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/60' :
                          aiInsights.sentiment === 'Critical' ? 'bg-rose-950/50 text-rose-400 border border-rose-900/60' :
                          'bg-amber-950/50 text-amber-400 border border-amber-900/60'
                        }`}>
                          {aiInsights.sentiment}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">Actionable Recommendations</span>
                      <ul className="space-y-1 text-slate-355 list-decimal pl-4 text-slate-400">
                        {aiInsights.actionItems?.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic py-2">No historical performance narrative generated yet.</p>
              )}
            </div>
          )}

          {/* Cycle Selector & Main Rating Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cycle Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-slate-400" />
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {selectedScore?.reviewCycleId?.cycleType === 'yearly' || selectedScore?.reviewCycleId?.cycleType === 'annual' ? 'Review Cycle Year' :
                     selectedScore?.reviewCycleId?.cycleType === 'half_yearly' ? 'Review Cycle Half-Year' :
                     selectedScore?.reviewCycleId?.cycleType === 'quarterly' ? 'Review Cycle Quarter' : 'Review Cycle Month'}
                  </h4>
                </div>
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold p-3 rounded-xl text-xs outline-none focus:border-sky-500"
                >
                  {scores.map(s => (
                    <option key={s.reviewCycleId._id} value={s.reviewCycleId._id}>
                      {s.reviewCycleId.cycleType === 'yearly' || s.reviewCycleId.cycleType === 'annual' ? 'Year: ' :
                       s.reviewCycleId.cycleType === 'half_yearly' ? 'Half-Year: ' :
                       s.reviewCycleId.cycleType === 'quarterly' ? 'Quarter: ' : 'Month: '}{s.reviewCycleId.reviewMonth}
                    </option>
                  ))}
                </select>
              </div>

              {selectedScore && (
                <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p>Started: {formatDateDDMMYYYY(selectedScore.reviewCycleId.startDate)}</p>
                  <p>Due: {formatDateDDMMYYYY(selectedScore.reviewCycleId.endDate)}</p>
                </div>
              )}
            </div>

            {/* Overall Performance Card (100% Manager Competencies Rating) */}
            {selectedScore && (() => {
              const compRatings = selectedManager?.competencyRatings || {};
              const compVals = [
                compRatings.communication,
                compRatings.ownership,
                compRatings.leadership,
                compRatings.teamwork,
                compRatings.learningAbility,
                compRatings.problemSolving
              ].map(v => Number(v)).filter(v => !isNaN(v) && v > 0);

              const managerAvg = compVals.length > 0
                ? (compVals.reduce((sum, v) => sum + v, 0) / compVals.length)
                : 4.50;

              const totalPresent = (filteredAttendance || []).reduce((sum, r) => sum + (r.daysPresent || (r.attendancePercentage ? (r.attendancePercentage * (r.totalWorkingDays || 22) / 100) : 0)), 0);
              const totalWorking = (filteredAttendance || []).reduce((sum, r) => sum + (r.totalWorkingDays || 22), 0);
              const avgPct = totalWorking > 0 ? (totalPresent / totalWorking) * 100 : 0;
              const attVal = (filteredAttendance && filteredAttendance.length > 0)
                ? avgPct * 0.05
                : 4.28;
              const certVal = (filteredCerts || []).length >= 1 ? 4.0 : 3.5;
              const awardVal = (filteredRecognitions || []).length >= 2 ? 5.0 : ((filteredRecognitions || []).length === 1 ? 4.25 : 3.5);

              const suppCalc = (attVal * 0.40) + (certVal * 0.30) + (awardVal * 0.30);

              const coreScoreVal = Math.round(managerAvg * 100) / 100;
              const suppScoreVal = Math.round((selectedScore.supportingScore || suppCalc) * 100) / 100;
              const finalScoreVal = coreScoreVal;
              
              let ratingVal = 'Meets Expectations';
              if (finalScoreVal >= 4.5) ratingVal = 'Outstanding';
              else if (finalScoreVal >= 4.0) ratingVal = 'Exceeds Expectations';
              else if (finalScoreVal >= 3.0) ratingVal = 'Meets Expectations';
              else if (finalScoreVal >= 2.0) ratingVal = 'Needs Improvement';
              else ratingVal = 'Unsatisfactory';

              return (
                <>
                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between h-full min-h-[180px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-extrabold text-sky-400 tracking-wider">Overall Performance (100%)</span>
                      <h3 className="text-lg font-extrabold tracking-tight">{ratingVal}</h3>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Single unified score: 100% based on Manager Competency Ratings.
                      </p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-800/60 p-3 rounded-xl text-center shrink-0 w-full mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Overall Score</span>
                      <div className="flex items-baseline gap-0.5">
                        <h2 className="text-xl font-black text-white">{finalScoreVal.toFixed(2)}</h2>
                        <span className="text-[9px] text-slate-500">/ 5.0</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between h-full min-h-[180px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-extrabold text-emerald-400 tracking-wider">Performance Breakdown</span>
                      {(() => {
                        let suppRatingVal = 'Meets Expectations';
                        if (suppScoreVal >= 4.5) suppRatingVal = 'Outstanding';
                        else if (suppScoreVal >= 4.0) suppRatingVal = 'Exceeds Expectations';
                        else if (suppScoreVal >= 3.0) suppRatingVal = 'Meets Expectations';
                        else if (suppScoreVal >= 2.0) suppRatingVal = 'Needs Improvement';
                        else suppRatingVal = 'Unsatisfactory';
                        
                        return (
                          <>
                            <h3 className="text-base font-black text-white">{suppRatingVal}</h3>
                            <p className="text-[9px] text-slate-400">
                              Contextual evaluation based on Attendance, Certifications, and Awards.
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl px-4 py-2.5 flex justify-between items-center mt-4">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">External Activities</span>
                      <div className="flex items-baseline gap-0.5">
                        <h2 className="text-xl font-black text-emerald-400">{suppScoreVal.toFixed(2)}</h2>
                        <span className="text-[9px] text-slate-500">/ 5.0</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Category Scores Progress Grid (Matches Manager Competency Ratings 100%) */}
          {selectedScore && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Category Breakdown</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Communication & Collaboration', val: selectedManager?.competencyRatings?.communication ?? 5, color: 'bg-emerald-500' },
                  { label: 'Ownership & Accountability', val: selectedManager?.competencyRatings?.ownership ?? 5, color: 'bg-rose-500' },
                  { label: 'Leadership & Initiative', val: selectedManager?.competencyRatings?.leadership ?? 4, color: 'bg-amber-500' },
                  { label: 'Teamwork & Support', val: selectedManager?.competencyRatings?.teamwork ?? 3, color: 'bg-indigo-500' },
                  { label: 'Learning & Adaptability', val: selectedManager?.competencyRatings?.learningAbility ?? 5, color: 'bg-purple-500' },
                  { label: 'Problem Solving & Critical Thinking', val: selectedManager?.competencyRatings?.problemSolving ?? 5, color: 'bg-sky-500' }
                ].map((item) => {
                  const val = Number(item.val) || 0;
                  const pct = Math.round((val / 5) * 100);

                  return (
                    <div key={item.label} className="space-y-2 border border-slate-100 p-4 rounded-xl">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{item.label}</span>
                        <span className="font-extrabold text-sky-700">{val} / 5.0</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manager Competency Ratings Breakdown */}
          {selectedScore && cycleDetails.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5">
                <Star size={20} className="text-amber-500 fill-amber-400" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Manager Competency Ratings Breakdown</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Ratings and feedback evaluation provided by reporting manager across 6 core criteria</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cycleDetails.map((detail, idx) => (
                  <div key={detail.id || idx} className="bg-slate-50/90 border border-slate-200 p-4 rounded-2xl space-y-2 hover:border-slate-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-extrabold text-slate-900">{detail.kpiName}</span>
                        </div>
                        <span className="font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 text-xs shrink-0 flex items-center gap-1">
                          ★ {detail.managerScore} / 5
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5">{detail.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Single Manager Overall Evaluation Feedback Note Card */}
              {selectedManager?.overallComments && (
                <div className="bg-sky-50/70 border border-sky-200/80 p-4 rounded-2xl space-y-1.5 mt-4">
                  <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider block">
                    Manager Overall Evaluation Feedback & Summary
                  </span>
                  <p className="text-xs text-slate-800 italic font-medium leading-relaxed">
                    "{selectedManager.overallComments}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recognitions & Certifications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* 1. Recognitions List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Award size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-800 text-sm">Awards & Recognitions</h3>
                </div>
                
                {filteredRecognitions.length === 0 ? (
                  <p className="text-slate-400 text-xs italic py-6 text-center">No awards granted within this period.</p>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {filteredRecognitions.map(rec => (
                      <div key={rec._id} className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-amber-700">{rec.category}</span>
                          <span className="text-[10px] text-slate-400">{formatDateDDMMYYYY(rec.awardedAt)}</span>
                        </div>
                        <p className="text-slate-650 font-medium">"{rec.comments}"</p>
                        <span className="text-[9px] text-slate-400 block mt-1">Awarded by: {rec.awardedBy?.firstName} {rec.awardedBy?.lastName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Professional Certifications Vault */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Award size={18} className="text-sky-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Verified Certifications</h3>
                </div>
                
                {filteredCerts.length === 0 ? (
                  <p className="text-slate-400 text-xs italic py-6 text-center">No certifications earned within this period.</p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {filteredCerts.map(c => (
                      <div key={c._id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xs gap-3">
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-sky-700 font-semibold mt-0.5">
                            {c.issuer} • {formatDateDDMMYYYY(c.issueDate)}
                          </p>
                        </div>
                        {c.fileUrl && (
                          <button
                            onClick={() => setPreviewDoc({ fileName: c.name, fileUrl: c.fileUrl })}
                            className="font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-100 shrink-0 text-[10px] cursor-pointer flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>Proof</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm truncate pr-4">
                {previewDoc.fileName}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-150 rounded-xl overflow-hidden relative">
              {previewDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.fileUrl.startsWith('http') ? previewDoc.fileUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${previewDoc.fileUrl}`}
                  className="w-full h-full border-0"
                  title={previewDoc.fileName}
                />
              ) : (
                <div className="w-full h-full flex justify-center items-center overflow-auto p-4">
                  <img
                    src={previewDoc.fileUrl.startsWith('http') ? previewDoc.fileUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${previewDoc.fileUrl}`}
                    alt={previewDoc.fileName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeReport;
