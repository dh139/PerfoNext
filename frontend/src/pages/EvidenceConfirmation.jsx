import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import {
  AlertCircle,
  Send,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  FileCheck,
  Award,
  Zap,
  Calendar,
  CheckSquare,
  Search,
  Clock,
  Folder
} from 'lucide-react';
import { toast } from '../store/toastStore';
import TablePagination from '../components/TablePagination';

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

const formatDateDDMMYYYY = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const EvidenceConfirmation = () => {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [cycle, setCycle] = useState(null);
  const [categories, setCategories] = useState([]);
  const [approvedLogs, setApprovedLogs] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [awards, setAwards] = useState([]);
  const [attendancePct, setAttendancePct] = useState(null);
  const [attendanceLabel, setAttendanceLabel] = useState('N/A (No Logs)');
  const [dateWindowLabel, setDateWindowLabel] = useState('');

  // Pagination & Filtering for 200-300+ logs
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [assessmentStatus, setAssessmentStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch cycle details
        const cycleRes = await api.get(`/api/review-cycles/${cycleId}`);
        const cycleData = cycleRes.data;
        setCycle(cycleData);

        // Fetch department template categories dynamically
        const deptId = user?.departmentId?._id || user?.departmentId;
        if (deptId) {
          try {
            const templateRes = await api.get(`/api/work-journal-templates/department/${deptId}`);
            if (templateRes.data && templateRes.data.categories && templateRes.data.categories.length > 0) {
              setCategories(templateRes.data.categories.map(c => c.name));
            } else {
              setCategories(CATEGORIES);
            }
          } catch (e) {
            console.error('Failed to fetch department template categories:', e);
            setCategories(CATEGORIES);
          }
        } else {
          setCategories(CATEGORIES);
        }

        // Calculate evaluation date window [rStart, rEnd]
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
        } else {
          const dS = new Date(rStart);
          const dE = new Date(rEnd);
          monthKeys = [
            `${dS.getFullYear()}-${String(dS.getMonth() + 1).padStart(2, '0')}`,
            `${dE.getFullYear()}-${String(dE.getMonth() + 1).padStart(2, '0')}`
          ];
        }

        setDateWindowLabel(`${formatDateDDMMYYYY(rStart)} – ${formatDateDDMMYYYY(rEnd)}`);

        const startObj = new Date(rStart);
        const endObj = new Date(rEnd);

        const currentUserId = (user?._id || user?.id || '').toString();

        let queryParams = `?status=approved&employeeId=${currentUserId}`;
        if (rStart && rEnd) {
          queryParams += `&startDate=${encodeURIComponent(rStart)}&endDate=${encodeURIComponent(rEnd)}`;
        }

        // 2. Fetch approved Daily Work Logs strictly isolated to this cycle window
        try {
          const logsRes = await api.get(`/api/work-journal${queryParams}`);
          setApprovedLogs(logsRes.data || []);
        } catch (e) {
          console.error('Logs fetch error:', e);
        }

        // 3. Fetch certifications earned strictly within this review cycle window
        try {
          const certRes = await api.get(`/api/certifications?employeeId=${currentUserId}`);
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

        // 4. Fetch awards / recognitions earned strictly within this review cycle window
        try {
          const awardRes = await api.get(`/api/recognitions?employeeId=${currentUserId}`);
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

        // 5. Fetch Attendance record for the exact months in this review cycle
        try {
          const attRes = await api.get(`/api/integrations/attendance?employeeId=${currentUserId}`);
          const allAtt = attRes.data || [];
          const cycleAttRecords = allAtt.filter(att => monthKeys.includes(att.month));

          if (cycleAttRecords.length > 0) {
            const totalPresent = cycleAttRecords.reduce((sum, r) => sum + (r.daysPresent || 0), 0);
            const totalWorking = cycleAttRecords.reduce((sum, r) => sum + (r.totalWorkingDays || 22), 0);
            const finalPct = totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100) : 0;
            setAttendancePct(finalPct);
            setAttendanceLabel(`${finalPct}% (${totalPresent} / ${totalWorking} days)`);
          } else {
            setAttendancePct(null);
            setAttendanceLabel('N/A (No Logs)');
          }
        } catch (e) {
          console.error('Attendance fetch error:', e);
          setAttendancePct(null);
          setAttendanceLabel('N/A');
        }

        // 6. Fetch existing assessment / confirmation record
        const assessmentRes = await api.get(`/api/self-assessments?reviewCycleId=${cycleId}&employeeId=${currentUserId}`);
        const existing = assessmentRes.data.length > 0 ? assessmentRes.data[0] : null;

        if (existing) {
          setAssessmentStatus(existing.status);
          if (existing.status === 'submitted') {
            setGeneralError(`Your evidence confirmation has already been submitted to your reporting manager.`);
          }
        }
      } catch (err) {
        console.error(err);
        setGeneralError('Failed to load review cycle details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cycleId, user]);

  const handleConfirmSubmit = async () => {
    if (assessmentStatus === 'submitted') return;

    if (approvedLogs.length === 0) {
      toast.error('Cannot submit: No approved Daily Work Logs found for this review cycle period.');
      setGeneralError('Cannot submit appraisal without verified work evidence. Please log your work in Daily Work Log and have your reporting manager verify it.');
      return;
    }

    try {
      setSubmitting(true);
      setGeneralError('');

      const details = [
        {
          comment: `Confirmed ${approvedLogs.length} verified daily work logs for ${cycle?.reviewMonth}.`
        }
      ];

      await api.post('/api/self-assessments', {
        reviewCycleId: cycleId,
        details,
        status: 'submitted'
      });

      setAssessmentStatus('submitted');
      toast.success(`Evidence confirmed and submitted successfully!`);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setGeneralError(err.response?.data?.message || `Failed to confirm evidence.`);
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
          assessmentStatus === 'submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'
        }`}>
          {assessmentStatus === 'submitted' ? <CheckCircle2 size={12} /> : <FileCheck size={12} />}
          <span>Status: {assessmentStatus === 'submitted' ? 'Confirmed & Submitted' : 'Pending Evidence Confirmation'}</span>
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 tracking-wider flex items-center gap-1">
                <Sparkles size={11} /> 1-Click Evidence Confirmation
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Review Cycle: {cycle?.reviewMonth}</span>
              {dateWindowLabel && (
                <span className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950/80 px-3 py-0.5 rounded-full border border-emerald-600/70">
                  📅 Window: {dateWindowLabel}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Evidence Confirmation
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-medium">
              Review your automatically collected evidence for this evaluation period ({dateWindowLabel}). Zero manual typing required.
            </p>
          </div>

          <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 text-center shrink-0">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Review Due Date</span>
            <span className="text-sm font-black text-amber-400">{formatDateDDMMYYYY(cycle?.endDate)}</span>
          </div>
        </div>

        {/* 4 Summary Stat Badges (Strictly Filtered to Review Cycle Window) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Approved Daily Logs</span>
            <span className="text-base font-black text-emerald-400">✔ {approvedLogs.length} Logs</span>
            <span className="text-[9px] text-emerald-300 block">{totalHoursLogged} Productive Hrs</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Certifications (In Cycle)</span>
            <span className="text-base font-black text-sky-400">✔ {certifications.length} Credentials</span>
            <span className="text-[9px] text-sky-300 block">Issued in cycle</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Awards & Recognition (In Cycle)</span>
            <span className="text-base font-black text-purple-400">✔ {awards.length} Honors</span>
            <span className="text-[9px] text-purple-300 block">Awarded in cycle</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Attendance Record (In Cycle)</span>
            <span className={`text-base font-black ${attendancePct !== null ? 'text-amber-400' : 'text-slate-400'}`}>
              {attendancePct !== null ? `✔ ${attendanceLabel}` : '⚠️ N/A (No Logs)'}
            </span>
            <span className="text-[9px] text-slate-400 block">Attendance</span>
          </div>
        </div>
      </div>

      {generalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Warning Banner if 0 Approved Work Logs */}
      {approvedLogs.length === 0 && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl text-amber-955 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-amber-600 shrink-0" />
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm">No Approved Daily Work Logs Found</h4>
              <p className="text-amber-800 text-[11px] font-medium mt-0.5">
                You have 0 verified daily work logs for this evaluation period ({dateWindowLabel}). Please log your completed work in your Daily Work Log and have your reporting manager verify it before submitting.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/performance/work-journal')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 cursor-pointer shadow transition-colors"
          >
            + Go to Daily Work Log
          </button>
        </div>
      )}

      {/* Verified Daily Work Logs Repository (Paginated & Filterable for 200-300+ Logs) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Lock size={16} className="text-emerald-600" />
              <span>Verified Work Evidence Repository ({filteredLogs.length} Entries)</span>
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Period: {cycle?.reviewMonth} ({dateWindowLabel}) • Total Hours Logged: <strong>{totalHoursLogged} Hrs</strong>
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
              {categories.map(cat => (
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
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-slate-300" />
            <p className="text-slate-500 font-bold text-xs">No approved work logs found matching your filter for cycle ({dateWindowLabel}).</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedLogs.map(log => (
                <div key={log._id} className="bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl space-y-2.5 hover:border-slate-300 transition-colors shadow-2xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded border border-indigo-200 shrink-0">
                      {log.category}
                    </span>
                    <span className="text-[10px] font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 shrink-0">
                      Project: {log.project || 'General'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-xs leading-snug">{log.title}</h4>
                    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed">
                      {log.resultSummary || log.description}
                    </p>
                  </div>

                  {/* Metadata Row: Date & Hours */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-200/70">
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Completed: {formatDateDDMMYYYY(log.completedDate)}</span>
                    </span>
                    {log.hoursSpent > 0 && (
                      <span className="flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        <Clock size={11} className="text-purple-500" />
                        <span>{log.hoursSpent} Hours Logged</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
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

      {/* Confirmation Action Footer */}
      {assessmentStatus !== 'submitted' && (
        <div className="flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div>
            <span className="font-extrabold text-slate-900 text-xs block">Ready to confirm your evidence?</span>
            <span className="text-slate-500 text-[11px]">
              {approvedLogs.length === 0
                ? '⚠️ Submission disabled: Log your work in Daily Work Log first.'
                : `Your manager will complete your evaluation backed by your ${approvedLogs.length} verified daily work logs (${totalHoursLogged} total hours).`}
            </span>
          </div>

          <button
            onClick={handleConfirmSubmit}
            disabled={submitting || approvedLogs.length === 0}
            className={`flex items-center gap-2 font-black text-xs px-6 py-3 rounded-2xl shadow-lg transition-all ${
              approvedLogs.length === 0
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            <Send size={15} />
            <span>Confirm & Submit Evidence</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EvidenceConfirmation;
