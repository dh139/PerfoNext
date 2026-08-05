import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { getUserAvatarUrl } from '../utils/avatar';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  Building,
  ChevronDown,
  ChevronUp,
  Zap,
  ClipboardList,
  ShieldCheck,
  Image,
  Check,
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

const WorkJournal = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [activeTab, setActiveTab] = useState('my_logs'); // my_logs, manager_desk, timeline

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
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
  const [lightboxImage, setLightboxImage] = useState(null);

  // Department Work Journal Template State
  const [formTemplate, setFormTemplate] = useState(null);
  const [customFieldsData, setCustomFieldsData] = useState({});

  useEffect(() => {
    fetchDepartmentTemplate();
  }, [user]);

  const fetchDepartmentTemplate = async () => {
    try {
      const deptId = user?.departmentId?._id || user?.departmentId;
      if (!deptId) return;
      const res = await api.get(`/api/work-journal-templates/department/${deptId}`);
      if (res.data) {
        setFormTemplate(res.data);
        if (res.data.categories && res.data.categories.length > 0 && !editItemId) {
          setCategory(res.data.categories[0].name);
        }
        if (res.data.evidenceTypes && res.data.evidenceTypes.length > 0 && !editItemId) {
          setEvidenceType(res.data.evidenceTypes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load department work journal template:', err);
    }
  };

  const handleEditClick = (item) => {
    setEditItemId(item._id);
    setTitle(item.title || '');
    setProject(item.project || '');
    setCategory(item.category || (formTemplate?.categories?.[0]?.name || 'Development'));
    setHoursSpent(item.hoursSpent || '');
    setResultSummary(item.resultSummary || item.description || '');
    setEvidenceType(item.evidenceType || 'Screenshot');
    setEvidenceRef(item.evidenceRef || '');
    setCompletedDate(item.completedDate ? item.completedDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setCustomFieldsData(item.customFieldsData || {});
    setImagePreviewUrl(item.evidenceUrl || '');
    setScreenshotFile(null);
    setShowAddModal(true);
  };

  // Manager Review Desk State
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [managerStatusFilter, setManagerStatusFilter] = useState('submitted'); // Default: Pending Verification
  const [managerSearch, setManagerSearch] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState({});
  const [batchLoading, setBatchLoading] = useState(false);

  // Timeline State
  const [timelineData, setTimelineData] = useState({});

  useEffect(() => {
    fetchJournalData();
    fetchJournalStats();
    if (['manager', 'hr', 'admin', 'executive'].includes(user?.role)) {
      fetchPendingManagerDesk();
    }
    fetchTimeline();
  }, []);

  const fetchJournalData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/work-journal');
      setItems(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Work Journal achievements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalStats = async () => {
    try {
      const res = await api.get('/api/work-journal/stats');
      setStats(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingManagerDesk = async () => {
    try {
      const res = await api.get('/api/work-journal/pending-manager');
      setPendingReviews(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await api.get('/api/work-journal/timeline');
      setTimelineData(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddSubmit = async (e) => {
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

      if (editItemId) {
        await api.patch(`/api/work-journal/${editItemId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Daily Work Log updated and resubmitted for manager verification!');
      } else {
        await api.post('/api/work-journal', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Daily Work Log submitted for manager verification!');
      }

      setShowAddModal(false);
      setEditItemId(null);
      // Reset form
      setTitle('');
      setProject('');
      setCategory('Development');
      setHoursSpent('');
      setResultSummary('');
      setEvidenceRef('');
      setScreenshotFile(null);
      setImagePreviewUrl('');

      fetchJournalData();
      fetchJournalStats();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit work log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (itemId, targetStatus) => {
    try {
      await api.patch(`/api/work-journal/${itemId}/review`, {
        status: targetStatus,
        managerFeedback: reviewComment
      });

      toast.success(`Work log status updated to ${targetStatus.toUpperCase()}!`);
      setReviewingId(null);
      setReviewComment('');
      fetchPendingManagerDesk();
      fetchJournalData();
      fetchJournalStats();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Review action failed.');
    }
  };

  const handleBatchApprove = async (empId, itemIds) => {
    if (!itemIds || itemIds.length === 0) return;
    try {
      setBatchLoading(true);
      await api.post('/api/work-journal/batch-review', {
        itemIds,
        status: 'approved'
      });
      toast.success(`Approved all ${itemIds.length} pending work logs!`);
      fetchPendingManagerDesk();
      fetchJournalData();
      fetchJournalStats();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Batch approval failed.');
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleEmployeeExpand = (empId) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [empId]: !prev[empId]
    }));
  };

  // Extract unique project list dynamically
  const uniqueProjects = Array.from(
    new Set(items.map(i => (i.project || '').trim()).filter(Boolean))
  ).sort();

  const filteredItems = items.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || (item.project || '').trim() === projectFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(term) ||
      (item.project && item.project.toLowerCase().includes(term)) ||
      (item.resultSummary && item.resultSummary.toLowerCase().includes(term));

    return matchesStatus && matchesCategory && matchesProject && matchesSearch;
  });

  const totalLogsPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
  const safeLogsPage = Math.min(currentPage, totalLogsPages);
  const paginatedItems = filteredItems.slice(
    (safeLogsPage - 1) * PAGE_SIZE,
    safeLogsPage * PAGE_SIZE
  );

  const getStatusBadge = (status, isLocked) => {
    if (isLocked || status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
          <Lock size={10} /> Verified
        </span>
      );
    }
    if (status === 'needs_changes') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
          <AlertCircle size={10} /> Needs Changes
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
          <AlertCircle size={10} /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 shrink-0">
        <Clock size={10} /> Pending
      </span>
    );
  };

  // Group Manager Desk items by employee
  const filteredManagerReviews = pendingReviews.filter(r => {
    const matchesStatus =
      managerStatusFilter === 'all' ? true :
      managerStatusFilter === 'submitted' ? r.status === 'submitted' :
      managerStatusFilter === 'approved' ? (r.status === 'approved' || r.isLocked) :
      managerStatusFilter === 'needs_changes' ? r.status === 'needs_changes' :
      managerStatusFilter === 'rejected' ? r.status === 'rejected' : true;

    const term = managerSearch.toLowerCase();
    const empName = `${r.employeeId?.firstName || ''} ${r.employeeId?.lastName || ''}`.toLowerCase();
    const empCode = (r.employeeId?.employeeCode || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const project = (r.project || '').toLowerCase();

    const matchesSearch = !managerSearch || empName.includes(term) || empCode.includes(term) || title.includes(term) || project.includes(term);

    return matchesStatus && matchesSearch;
  });

  const groupedByEmployee = filteredManagerReviews.reduce((acc, rev) => {
    const empId = rev.employeeId?._id || rev.employeeId || 'unknown';
    if (!acc[empId]) {
      acc[empId] = {
        employee: rev.employeeId,
        items: []
      };
    }
    acc[empId].items.push(rev);
    return acc;
  }, {});

  const totalPendingCount = pendingReviews.filter(r => r.status === 'submitted').length;
  const totalApprovedCount = pendingReviews.filter(r => r.status === 'approved' || r.isLocked).length;
  const totalPendingItemIds = pendingReviews.filter(r => r.status === 'submitted').map(r => r._id);

  return (
    <div className="space-y-6 text-xs text-slate-800 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 tracking-wider flex items-center gap-1">
                <CheckCircle2 size={11} /> Continuous Evidence Engine
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Daily Work Log & Evidence Center</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Log your completed work daily with supporting proof. Approved work logs become verified evidence for performance reviews.
            </p>
          </div>

          <button
            onClick={() => {
              setEditItemId(null);
              setTitle('');
              setProject('');
              setCategory('Development');
              setHoursSpent('');
              setResultSummary('');
              setEvidenceRef('');
              setScreenshotFile(null);
              setImagePreviewUrl('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all shrink-0 cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Daily Work Log</span>
          </button>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Today's Logs</span>
            <span className="text-lg font-black text-white">{stats.todayLogsCount || 0}</span>
            <span className="text-[9px] text-slate-400 block">Logged today</span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">This Month</span>
            <span className="text-lg font-black text-sky-400">{stats.monthLogsCount || 0}</span>
            <span className="text-[9px] text-sky-300 block">Monthly entries</span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">This Quarter</span>
            <span className="text-lg font-black text-indigo-400">{stats.quarterLogsCount || 0}</span>
            <span className="text-[9px] text-indigo-300 block">Quarterly total</span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Pending Verification</span>
            <span className="text-lg font-black text-amber-400">{stats.pendingCount || 0}</span>
            <span className="text-[9px] text-amber-300 block">Awaiting manager</span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Approved Logs</span>
            <span className="text-lg font-black text-emerald-400">{stats.approvedCount || 0}</span>
            <span className="text-[9px] text-emerald-300 block">Verified & Locked</span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Hours Logged</span>
            <span className="text-lg font-black text-purple-400">{stats.totalHoursSpent || 0} Hrs</span>
            <span className="text-[9px] text-purple-300 block">Productive time</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-extrabold text-slate-500">
        <button
          onClick={() => setActiveTab('my_logs')}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'my_logs' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent hover:text-slate-800'
          }`}
        >
          <FileText size={16} />
          <span>My Daily Logs ({items.length})</span>
        </button>

        {['manager', 'hr', 'admin', 'executive'].includes(user?.role) && (
          <button
            onClick={() => setActiveTab('manager_desk')}
            className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'manager_desk' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Manager Verification Desk</span>
            {totalPendingCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-extrabold">
                {totalPendingCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'timeline' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          <span>Evidence Timeline</span>
        </button>
      </div>

      {/* TAB 1: MY DAILY LOGS */}
      {activeTab === 'my_logs' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Recorded Work Achievements</h3>
              <p className="text-slate-500 text-xs">{filteredItems.length} Entries Listed</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Filter by Project */}
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-sky-900 outline-none cursor-pointer"
              >
                <option value="all">All Projects ({uniqueProjects.length})</option>
                {uniqueProjects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>

              {/* Filter by Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Verified Approved</option>
                <option value="submitted">Pending Verification</option>
                <option value="needs_changes">Needs Changes</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Filter by Category */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Search */}
              <div className="relative flex-1 md:w-52">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, project, result..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 rounded-xl text-xs outline-none focus:border-sky-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Project Log Sheets */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <span>📁 Project Log Sheets</span>
              <span className="text-[10px] lowercase text-slate-400 font-medium">(Select a sheet to filter logs)</span>
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {/* All Projects Sheet */}
              <button
                onClick={() => {
                  setProjectFilter('all');
                  setCurrentPage(1);
                }}
                className={`flex items-start gap-3 p-4 border rounded-2xl text-left shrink-0 w-44 transition-all shadow-3xs cursor-pointer ${
                  projectFilter === 'all'
                    ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-500/20'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${projectFilter === 'all' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Folder size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-xs truncate">All Projects</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                    {items.length} Log Sheets
                  </p>
                  <p className="text-[9px] text-sky-700 font-bold mt-0.5">
                    {items.reduce((sum, i) => sum + (Number(i.hoursSpent) || 0), 0)} hrs total
                  </p>
                </div>
              </button>

              {/* Dynamic Project Sheets */}
              {uniqueProjects.map(proj => {
                const projLogs = items.filter(i => (i.project || '').trim() === proj);
                const totalHours = projLogs.reduce((sum, i) => sum + (Number(i.hoursSpent) || 0), 0);
                const isSelected = projectFilter === proj;

                return (
                  <button
                    key={proj}
                    onClick={() => {
                      setProjectFilter(proj);
                      setCurrentPage(1);
                    }}
                    className={`flex items-start gap-3 p-4 border rounded-2xl text-left shrink-0 w-44 transition-all shadow-3xs cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-500/20'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-xs truncate" title={proj}>{proj}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                        {projLogs.length} Log Sheets
                      </p>
                      <p className="text-[9px] text-sky-700 font-bold mt-0.5">
                        {totalHours} hrs logged
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
              <FileText className="mx-auto text-slate-300" size={36} />
              <p className="text-slate-500 font-bold text-xs">No work achievements match your query.</p>
              <p className="text-[11px] text-slate-400">Click <strong>+ Add Daily Work Log</strong> to record your work evidence.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedItems.map((item) => (
                  <div key={item._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-colors space-y-4 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        {getStatusBadge(item.status, item.isLocked)}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 text-sm leading-snug break-words">{item.title}</h4>
                        <p className="text-[11px] font-bold text-slate-600 mt-1">
                          Project: <strong className="text-slate-800">{item.project || 'General'}</strong> {item.hoursSpent ? `• ${item.hoursSpent} Hours Logged` : ''}
                        </p>
                      </div>

                      {(item.resultSummary || item.description) && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-1 overflow-hidden">
                          <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Work Summary / Result</span>
                          <p className="leading-relaxed font-medium break-words">{item.resultSummary || item.description}</p>
                        </div>
                      )}

                      {item.customFieldsData && Object.keys(item.customFieldsData).length > 0 && (
                        <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100/80 text-xs space-y-1 overflow-hidden">
                          <span className="text-[9px] font-black uppercase text-sky-700 block">Custom Field Answers</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            {Object.entries(item.customFieldsData).map(([key, val]) => (
                              val ? (
                                <div key={key} className="truncate">
                                  <span className="text-slate-500 font-semibold capitalize">{key.replace(/_/g, ' ')}: </span>
                                  <strong className="text-slate-800">{String(val)}</strong>
                                </div>
                              ) : null
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manager Feedback / Requested Changes Banner */}
                      {item.status === 'needs_changes' && (
                        <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-950 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-amber-900 text-[11px]">
                            <AlertCircle size={14} className="text-amber-600 shrink-0" />
                            <span>Manager Requested Changes</span>
                          </div>
                          {item.managerFeedback && <p className="text-[11px] font-medium text-amber-800">"{item.managerFeedback}"</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-200/80 text-[11px] overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-500 min-w-0">
                        <span className="shrink-0">Completed: <strong className="text-slate-700">{formatDateDDMMYYYY(item.completedDate)}</strong></span>
                        {item.evidenceRef && (
                          <span
                            className="font-mono bg-slate-200/70 px-2 py-1 rounded text-[10px] text-slate-700 font-bold max-w-full truncate block"
                            title={`${item.evidenceType}: ${item.evidenceRef}`}
                          >
                            {item.evidenceType}: {item.evidenceRef}
                          </span>
                        )}
                      </div>

                      {item.managerFeedback && item.status !== 'needs_changes' && (
                        <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-700 space-y-0.5">
                          <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Manager Comment</span>
                          <p className="italic font-medium">"{item.managerFeedback}"</p>
                        </div>
                      )}

                      {!item.isLocked && (item.status === 'needs_changes' || item.status === 'submitted') && (
                        <button
                          onClick={() => handleEditClick(item)}
                          className="w-full py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl font-bold text-xs text-sky-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>✏️ Edit & Resubmit Work Log</span>
                        </button>
                      )}

                      {item.evidenceUrl && (
                        <button
                          onClick={() => setLightboxImage(item.evidenceUrl)}
                          className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-sky-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Image size={14} />
                          <span>View Attachment Proof 🔍</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Pagination */}
              <TablePagination
                page={safeLogsPage}
                totalPages={totalLogsPages}
                totalCount={filteredItems.length}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 2: ENTERPRISE MANAGER VERIFICATION DESK */}
      {activeTab === 'manager_desk' && ['manager', 'hr', 'admin', 'executive'].includes(user?.role) && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Top Bar: Search, Filters & Global Approve All */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">Enterprise Verification Desk</h3>
                <span className="text-[10px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                  {totalPendingCount} Pending Logs
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Grouped by employee. Expand to view logs or click <strong>Approve All</strong> to verify an employee's work in 1 click.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee, project, log..."
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-sky-500 font-medium"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setManagerStatusFilter('submitted')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    managerStatusFilter === 'submitted' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({totalPendingCount})
                </button>
                <button
                  onClick={() => setManagerStatusFilter('approved')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    managerStatusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Verified ({totalApprovedCount})
                </button>
                <button
                  onClick={() => setManagerStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    managerStatusFilter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({pendingReviews.length})
                </button>
              </div>

              {/* Global 1-Click Approve ALL Pending Button */}
              {managerStatusFilter === 'submitted' && totalPendingItemIds.length > 0 && (
                <button
                  onClick={() => handleBatchApprove('global', totalPendingItemIds)}
                  disabled={batchLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Zap size={15} />
                  <span>Approve ALL ({totalPendingItemIds.length} Pending Logs)</span>
                </button>
              )}
            </div>
          </div>

          {/* Grouped Employee Cards */}
          {Object.keys(groupedByEmployee).length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
              <CheckCircle2 className="mx-auto text-emerald-400" size={36} />
              <p className="text-slate-500 font-bold text-xs">No work logs matching your search or filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedByEmployee).map(([empId, group]) => {
                const emp = group.employee;
                const empItems = group.items;
                const pendingEmpItemIds = empItems.filter(i => i.status === 'submitted').map(i => i._id);
                const isExpanded = expandedEmployees[empId] === true || (managerStatusFilter === 'submitted' && expandedEmployees[empId] !== false);

                return (
                  <div key={empId} className="border border-slate-200/80 rounded-2xl bg-white shadow-2xs overflow-hidden transition-all">
                    {/* Employee Row Summary Header */}
                    <div className="p-3.5 bg-slate-50/80 hover:bg-slate-100/60 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleEmployeeExpand(empId)}>
                        <img
                          src={getUserAvatarUrl(emp)}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 text-xs">
                              {emp?.firstName} {emp?.lastName}
                            </h4>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {emp?.employeeCode || 'EMP'}
                            </span>
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                              {emp?.role?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {empItems.length} Logs Listed ({pendingEmpItemIds.length} Pending Verification)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                        {pendingEmpItemIds.length > 0 && (
                          <button
                            onClick={() => handleBatchApprove(empId, pendingEmpItemIds)}
                            disabled={batchLoading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                          >
                            <Zap size={13} />
                            <span>1-Click Approve ({pendingEmpItemIds.length})</span>
                          </button>
                        )}

                        <button
                          onClick={() => toggleEmployeeExpand(empId)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs"
                        >
                          <span>{isExpanded ? 'Collapse' : `View Logs (${empItems.length})`}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Employee Logs Drawer */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200/80 space-y-3">
                        <div className="space-y-3">
                          {empItems.map((rev) => {
                            const isEditing = reviewingId === rev._id;

                            return (
                              <div
                                key={rev._id}
                                className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-colors overflow-hidden ${
                                  rev.status === 'approved' || rev.isLocked
                                    ? 'bg-emerald-50/40 border-emerald-200/80'
                                    : 'bg-white border-slate-200/90 shadow-3xs'
                                }`}
                              >
                                {/* Top Row */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                                      {rev.category}
                                    </span>
                                    <span className="text-[11px] font-black text-slate-900 break-words">{rev.title}</span>
                                    <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                      • Project: <strong className="text-slate-700">{rev.project || 'General'}</strong> {rev.hoursSpent ? `(${rev.hoursSpent} hrs)` : ''}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Completed {formatDateDDMMYYYY(rev.completedDate)}
                                    </span>
                                    {getStatusBadge(rev.status, rev.isLocked)}
                                  </div>
                                </div>

                                {/* Summary & Evidence Proof Link */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 overflow-hidden">
                                  <p className="text-[11px] text-slate-700 font-medium leading-normal flex-1 break-words min-w-0">
                                    <strong className="text-slate-900">Summary:</strong> {rev.resultSummary || rev.description || 'No summary provided.'}
                                  </p>

                                  {rev.evidenceUrl ? (
                                    <button
                                      onClick={() => setLightboxImage(rev.evidenceUrl)}
                                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-sky-700 font-extrabold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer shrink-0 shadow-3xs"
                                    >
                                      <Image size={12} />
                                      <span>View Screenshot Proof 🔍</span>
                                    </button>
                                  ) : rev.evidenceRef ? (
                                    <span
                                      className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 max-w-xs truncate block"
                                      title={`${rev.evidenceType}: ${rev.evidenceRef}`}
                                    >
                                      {rev.evidenceType}: {rev.evidenceRef}
                                    </span>
                                  ) : null}
                                </div>

                                {rev.customFieldsData && Object.keys(rev.customFieldsData).length > 0 && (
                                  <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-100/90 text-xs space-y-1">
                                    <span className="text-[9px] font-black uppercase text-sky-800 block">Department Answers</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                      {Object.entries(rev.customFieldsData).map(([k, v]) => (
                                        v ? (
                                          <div key={k} className="truncate">
                                            <span className="text-slate-500 font-semibold capitalize">{k.replace(/_/g, ' ')}: </span>
                                            <strong className="text-slate-900">{String(v)}</strong>
                                          </div>
                                        ) : null
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Manager Feedback / Actions Row */}
                                {rev.status === 'approved' || rev.isLocked ? (
                                  <div className="flex items-center justify-between text-[11px] text-emerald-900 pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                      <span className="font-bold">Verified & Locked</span>
                                      {rev.managerFeedback && <span className="text-emerald-700 italic"> — "{rev.managerFeedback}"</span>}
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-800 uppercase bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                                      Permanent Evidence
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                    <input
                                      type="text"
                                      placeholder="Add optional manager feedback..."
                                      value={isEditing ? reviewComment : (rev.managerFeedback || '')}
                                      onChange={(e) => {
                                        setReviewingId(rev._id);
                                        setReviewComment(e.target.value);
                                      }}
                                      className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 font-medium flex-1"
                                    />

                                    <div className="flex items-center gap-2 justify-end shrink-0">
                                      <button
                                        onClick={() => handleReviewAction(rev._id, 'needs_changes')}
                                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                      >
                                        Request Changes
                                      </button>
                                      <button
                                        onClick={() => handleReviewAction(rev._id, 'rejected')}
                                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleReviewAction(rev._id, 'approved')}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                      >
                                        <Check size={14} />
                                        <span>Approve & Lock</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VERIFIED WORK TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Verified Evidence Timeline</h3>
            <p className="text-slate-500 text-xs">Chronological timeline of all verified work logs supporting quarter reviews.</p>
          </div>

          {Object.keys(timelineData).length === 0 ? (
            <p className="text-slate-400 italic text-center py-8">No verified work evidence in timeline yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(timelineData).map(([monthYear, monthItems]) => (
                <div key={monthYear} className="space-y-3">
                  <h4 className="font-black text-xs text-sky-800 uppercase tracking-wider bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 inline-block">
                    {monthYear}
                  </h4>
                  <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                    {monthItems.map((tItem) => (
                      <div key={tItem._id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              {tItem.category}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{tItem.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Project: <strong>{tItem.project || 'General'}</strong> • Completed {formatDateDDMMYYYY(tItem.completedDate)}
                          </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          Verified & Locked
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add or Edit Daily Work Log */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 border border-slate-100 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">
                {editItemId ? 'Edit Daily Work Log Entry' : 'Log Daily Work Achievement'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditItemId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  {formTemplate?.titleLabel || 'Achievement Title'} *
                </label>
                <input
                  type="text"
                  placeholder={formTemplate?.titlePlaceholder || 'e.g. Conducted client pitch meeting or completed module task...'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500"
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
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500"
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
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  {formTemplate?.summaryLabel || 'Work Summary & Output Result'}
                </label>
                <textarea
                  rows="3"
                  placeholder={formTemplate?.summaryPlaceholder || 'Summarize what was delivered, defects solved, or business result achieved...'}
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-sky-500"
                ></textarea>
              </div>

              {/* Dynamic Department Custom Fields */}
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
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
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
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-sky-500"
                          required={field.required}
                        />
                      ) : (
                        <input
                          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'url' ? 'url' : 'text'}
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={customFieldsData[field.fieldKey] || ''}
                          onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
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
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* File Attachment Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Screenshot Proof (Optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs cursor-pointer"
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
                  onClick={() => {
                    setShowAddModal(false);
                    setEditItemId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black cursor-pointer shadow-md transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <span>{editItemId ? 'Update & Resubmit' : 'Submit for Verification'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-2 shadow-2xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-slate-900/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 hover:bg-slate-900 cursor-pointer"
            >
              ✕
            </button>
            <img src={lightboxImage} alt="Full Proof Preview" className="max-h-[85vh] w-auto object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkJournal;
