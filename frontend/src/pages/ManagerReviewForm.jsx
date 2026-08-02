import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  AlertCircle,
  Save,
  Send,
  ArrowLeft,
  User,
  CheckCircle2,
  Lock,
  Sparkles,
  Award,
  Zap,
  Calendar,
  Star,
  FileCheck,
  Building,
  Search,
  Clock
} from 'lucide-react';
import { toast } from '../store/toastStore';
import TablePagination from '../components/TablePagination';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

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

const ManagerReviewForm = () => {
  const { cycleId, employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [approvedLogs, setApprovedLogs] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [awards, setAwards] = useState([]);
  const [attendancePct, setAttendancePct] = useState(null);
  const [aiSummary, setAiSummary] = useState('');

  // Pagination & Search for Manager Evidence Inspection (200-300+ logs)
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 6 Core Competency Ratings (1 to 5 stars)
  const [competencies, setCompetencies] = useState({
    communication: 4,
    ownership: 4,
    leadership: 4,
    teamwork: 4,
    learningAbility: 4,
    problemSolving: 4
  });

  const [overallComments, setOverallComments] = useState('');
  const [overallRating, setOverallRating] = useState(4);
  const [reviewStatus, setReviewStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch employee details
        const empRes = await api.get(`/api/users/${employeeId}`);
        setEmployee(empRes.data);

        // 2. Fetch cycle details
        const cycleRes = await api.get(`/api/review-cycles/${cycleId}`);
        const cycleData = cycleRes.data;
        setCycle(cycleData);

        // Calculate evaluation date window [cycleData.startDate, cycleData.endDate]
        let rStart = cycleData.startDate;
        let rEnd = cycleData.endDate;

        const monthStr = cycleData.reviewMonth || '';
        const qMatch = monthStr.match(/^(\d{4})-Q([1-4])$/i);
        const hMatch = monthStr.match(/^(\d{4})-H([1-2])$/i);
        const yMatch = monthStr.match(/^(\d{4})$/);
        const mMatch = monthStr.match(/^(\d{4})-(\d{2})$/);

        let monthKeys = [];
        if (qMatch) {
          const year = parseInt(qMatch[1], 10);
          const q = parseInt(qMatch[2], 10);
          const startMonth = (q - 1) * 3;
          rStart = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0)).toISOString();
          rEnd = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999)).toISOString();

          monthKeys = [
            `${year}-${String(startMonth + 1).padStart(2, '0')}`,
            `${year}-${String(startMonth + 2).padStart(2, '0')}`,
            `${year}-${String(startMonth + 3).padStart(2, '0')}`
          ];
        } else if (hMatch) {
          const year = parseInt(hMatch[1], 10);
          const h = parseInt(hMatch[2], 10);
          const startMonth = (h - 1) * 6;
          rStart = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0)).toISOString();
          rEnd = new Date(Date.UTC(year, startMonth + 6, 0, 23, 59, 59, 999)).toISOString();

          monthKeys = [];
          for (let i = 1; i <= 6; i++) {
            monthKeys.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
          }
        } else if (yMatch) {
          const year = parseInt(yMatch[1], 10);
          rStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString();
          rEnd = new Date(Date.UTC(year, 12, 0, 23, 59, 59, 999)).toISOString();

          monthKeys = [];
          for (let i = 1; i <= 12; i++) {
            monthKeys.push(`${year}-${String(i).padStart(2, '0')}`);
          }
        } else if (mMatch) {
          const year = parseInt(mMatch[1], 10);
          const month = parseInt(mMatch[2], 10);
          rStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
          rEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
          monthKeys = [`${year}-${String(month).padStart(2, '0')}`];
        }

        let queryParams = `?employeeId=${employeeId}&status=approved`;
        if (rStart && rEnd) {
          queryParams += `&startDate=${encodeURIComponent(rStart)}&endDate=${encodeURIComponent(rEnd)}`;
        }

        // 3. Fetch approved Daily Work Logs strictly isolated to this cycle date window
        try {
          const logsRes = await api.get(`/api/work-journal${queryParams}`);
          setApprovedLogs(logsRes.data || []);
        } catch (e) {
          console.error('Work logs fetch error:', e);
        }

        const startObj = new Date(rStart);
        const endObj = new Date(rEnd);

        // 4. Fetch Certifications earned strictly in cycle window for this employee
        try {
          const certRes = await api.get(`/api/certifications?employeeId=${employeeId}`);
          const allCerts = certRes.data || [];
          const cycleCerts = allCerts.filter(c => {
            const d = new Date(c.issueDate || c.createdAt);
            if (isNaN(d.getTime())) return false;
            return d >= startObj && d <= endObj;
          });
          setCertifications(cycleCerts);
        } catch (e) {
          console.error('Cert fetch error:', e);
        }

        // 5. Fetch Awards issued strictly in cycle window for this employee
        try {
          const awardRes = await api.get(`/api/recognitions?employeeId=${employeeId}`);
          const allAwards = awardRes.data || [];
          const cycleAwards = allAwards.filter(a => {
            const d = new Date(a.awardedAt || a.createdAt);
            if (isNaN(d.getTime())) return false;
            return d >= startObj && d <= endObj;
          });
          setAwards(cycleAwards);
        } catch (e) {
          console.error('Award fetch error:', e);
        }

        // 6. Fetch Attendance percentage strictly for this review cycle window
        try {
          const attRes = await api.get(`/api/integrations/attendance?employeeId=${employeeId}`);
          const allAtt = attRes.data || [];
          const cycleAttRecords = allAtt.filter(att => monthKeys.includes(att.month));

          if (cycleAttRecords.length > 0) {
            const totalPresent = cycleAttRecords.reduce((sum, r) => sum + (r.daysPresent || (r.attendancePercentage ? (r.attendancePercentage * (r.totalWorkingDays || 22) / 100) : 0)), 0);
            const totalWorking = cycleAttRecords.reduce((sum, r) => sum + (r.totalWorkingDays || 22), 0);
            const avgPct = totalWorking > 0 ? (totalPresent / totalWorking) * 100 : 0;
            setAttendancePct(Math.round(avgPct * 10) / 10);
          } else {
            setAttendancePct(null);
          }
        } catch (e) {
          console.error('Attendance fetch error:', e);
          setAttendancePct(null);
        }

        // 7. Fetch AI Summary for this cycle
        try {
          const aiRes = await api.get(`/api/review-cycles/${cycleId}/employees/${employeeId}/insights`);
          setAiSummary(aiRes.data?.summary || aiRes.data?.executiveSummary || '');
        } catch (e) {
          console.error('AI Summary fetch error:', e);
        }

        // 8. Fetch existing manager review
        const managerRevRes = await api.get(`/api/manager-reviews?reviewCycleId=${cycleId}&employeeId=${employeeId}`);
        const existing = managerRevRes.data[0];

        if (existing) {
          setReviewStatus(existing.status);
          if (existing.competencyRatings) {
            setCompetencies(existing.competencyRatings);
          }
          if (existing.overallComments) {
            setOverallComments(existing.overallComments);
          }
          if (existing.overallRating) {
            setOverallRating(existing.overallRating);
          }

          if (existing.status === 'submitted') {
            setGeneralError('This evaluation has already been submitted and finalized.');
          }
        }
      } catch (err) {
        console.error(err);
        setGeneralError('Failed to load employee evaluation details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cycleId, employeeId]);

  const handleRatingChange = (key, val) => {
    if (reviewStatus === 'submitted') return;
    setCompetencies(prev => ({ ...prev, [key]: val }));
  };

  const handleFormSubmit = async (targetStatus) => {
    if (reviewStatus === 'submitted') return;

    try {
      setSubmitting(true);
      setGeneralError('');

      await api.post('/api/manager-reviews', {
        reviewCycleId: cycleId,
        employeeId,
        competencyRatings: competencies,
        overallComments,
        overallRating,
        status: targetStatus
      });

      setReviewStatus(targetStatus);
      if (targetStatus === 'submitted') {
        toast.success('Manager evaluation successfully submitted and performance score computed!');
        navigate('/', { replace: true });
      } else {
        toast.success('Evaluation draft saved successfully.');
      }
    } catch (err) {
      console.error(err);
      setGeneralError(err.response?.data?.message || 'Failed to submit manager evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = approvedLogs.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(term) ||
      (item.project && item.project.toLowerCase().includes(term)) ||
      (item.resultSummary && item.resultSummary.toLowerCase().includes(term));

    return matchesCategory && matchesSearch;
  });

  const totalLogsPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
  const safeLogsPage = Math.min(currentPage, totalLogsPages);
  const paginatedLogs = filteredLogs.slice(
    (safeLogsPage - 1) * PAGE_SIZE,
    safeLogsPage * PAGE_SIZE
  );

  const totalHoursLogged = approvedLogs.reduce((acc, curr) => acc + (curr.hoursSpent || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs text-slate-800 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Overview</span>
        </button>

        <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border flex items-center gap-1.5 ${
          reviewStatus === 'submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {reviewStatus === 'submitted' ? <CheckCircle2 size={12} /> : <Sparkles size={12} />}
          <span>Status: {reviewStatus === 'submitted' ? 'Finalized & Submitted' : 'Manager Evaluation Pending'}</span>
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider flex items-center gap-1">
                <Sparkles size={11} /> Evidence-Driven Manager Review
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Review Cycle: {cycle?.reviewMonth}</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Manager Performance Evaluation
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-medium">
              Employee: <strong className="text-white">{employee?.firstName} {employee?.lastName}</strong> ({employee?.employeeCode}) • Department: <strong className="text-slate-300">{employee?.departmentId?.departmentName || 'Engineering'}</strong>
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl text-[10px] font-bold space-y-1">
            <span className="text-[9px] uppercase text-slate-400 block tracking-wider font-extrabold">Final Score Formula</span>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="text-amber-400 font-extrabold">100% Manager Competency Ratings</span>
            </div>
          </div>
        </div>
      </div>

      {generalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* 1. Attendance Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex justify-between items-center">
        <div>
          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Attendance Summary</h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Verified attendance record for {cycle?.reviewMonth}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center">
          <span className="text-base font-black text-emerald-800">
            {attendancePct !== null ? `${attendancePct}% Attendance` : '⚠️ N/A (No Attendance Logs)'}
          </span>
        </div>
      </div>

      {/* 2. Approved Daily Work Logs (Paginated & Filterable for 200-300+ Logs) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Lock size={16} className="text-emerald-600" />
              <span>Approved Daily Work Logs ({filteredLogs.length} Entries)</span>
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Period: {cycle?.reviewMonth} • Total Productive Hours: <strong>{totalHoursLogged} Hrs</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-52">
              <Search size={14} className="absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, project, result..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-sky-500 font-medium"
              />
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">No approved work logs found matching your filter for this review period.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paginatedLogs.map(log => {
                const formattedDate = formatDateDDMMYYYY(log.completedDate);

                return (
                  <div key={log._id} className="bg-slate-50/90 border border-slate-200 p-3.5 rounded-2xl space-y-2 hover:border-slate-300 transition-colors shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                        {log.category}
                      </span>
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                        Project: {log.project || 'General'}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 text-xs">{log.title}</h4>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{log.resultSummary || log.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1.5 border-t border-slate-200/60">
                      <span>📅 Completed: <strong>{formattedDate}</strong></span>
                      {log.hoursSpent > 0 && <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">⏱️ {log.hoursSpent} Hrs</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination for 200-300+ logs */}
            <TablePagination
              page={safeLogsPage}
              totalPages={totalLogsPages}
              totalCount={filteredLogs.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </>
        )}
      </div>

      {/* 3. Extra Metrics Grid: Certifications & Awards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={15} className="text-sky-600" />
            <span>Approved Certifications ({certifications.length})</span>
          </h4>
          {certifications.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No certifications earned in this cycle.</p>
          ) : (
            <div className="space-y-2">
              {certifications.map(c => (
                <div key={c._id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{c.name}</span>
                    <span className="text-[10px] text-slate-500">{c.issuer}</span>
                  </div>
                  <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">Verified</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Award size={15} className="text-purple-600" />
            <span>Awards & Recognition ({awards.length})</span>
          </h4>
          {awards.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No awards received in this cycle.</p>
          ) : (
            <div className="space-y-2">
              {awards.map(a => (
                <div key={a._id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{a.category || 'Recognition'}</span>
                    <span className="text-[10px] text-slate-500">"{a.comments}"</span>
                  </div>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Awarded</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Core Manager Competencies Rating (30% Weight) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Star size={16} className="text-amber-500 fill-amber-400" />
            <span>Manager Competency Ratings (100% Final Score Weight)</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Grade employee's soft skills and behavioral qualities that cannot be measured from work logs alone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {[
            { key: 'communication', label: 'Communication & Collaboration', desc: 'Clear expression, proactive updates, team transparency' },
            { key: 'ownership', label: 'Ownership & Accountability', desc: 'Takes responsibility for deliverables and defect resolutions' },
            { key: 'leadership', label: 'Leadership & Initiative', desc: 'Guides peers, proposes improvements, leads initiatives' },
            { key: 'teamwork', label: 'Teamwork & Helpful Attitude', desc: 'Assists teammates, shares knowledge, unblocks colleagues' },
            { key: 'learningAbility', label: 'Learning Attitude & Adaptability', desc: 'Quickly picks up new tech stacks and domain skills' },
            { key: 'problemSolving', label: 'Problem Solving & Critical Thinking', desc: 'Analyzes root causes effectively and delivers robust fixes' }
          ].map((item) => (
            <div key={item.key} className="bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-900 text-xs">{item.label}</span>
                <span className="font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-xs">
                  {competencies[item.key] || 4} / 5
                </span>
              </div>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={reviewStatus === 'submitted'}
                    onClick={() => handleRatingChange(item.key, val)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      competencies[item.key] >= val
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-slate-200/80 text-slate-400 hover:bg-slate-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Overall Comments & Evaluation Action */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <label className="font-extrabold text-slate-900 text-xs uppercase tracking-wider block">Manager Feedback Comments & Summary</label>
          <textarea
            rows="3"
            disabled={reviewStatus === 'submitted'}
            placeholder="Record constructive manager evaluation notes, strengths, and areas for continuous growth..."
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-800 outline-none focus:border-sky-500 font-medium"
          ></textarea>
        </div>

        {reviewStatus !== 'submitted' && (
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleFormSubmit('draft')}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleFormSubmit('submitted')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send size={16} />
              <span>Finalize & Compute Final Performance Score</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerReviewForm;
