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
  Folder,
  X
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
  const [projectSearch, setProjectSearch] = useState('');
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [projectStatusSearch, setProjectStatusSearch] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectStatusPage, setProjectStatusPage] = useState(1);
  const PAGE_SIZE = 10;

  const [activeTab, setActiveTab] = useState('my_logs'); // my_logs, manager_desk, timeline

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProjectContributors, setSelectedProjectContributors] = useState(null);
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
  const [projectStatuses, setProjectStatuses] = useState({});
  const [projectsList, setProjectsList] = useState([]);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('Active');
  const [newProjectDept, setNewProjectDept] = useState('');
  const [isProjSelectOpen, setIsProjSelectOpen] = useState(false);
  const [projQuery, setProjQuery] = useState('');
  const [orgWideLogs, setOrgWideLogs] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchProjectStatuses = async () => {
    try {
      const res = await api.get('/api/work-journal/project-statuses');
      setProjectsList(res.data || []);
      const dict = {};
      (res.data || []).forEach(p => {
        dict[p.projectName] = p.status;
      });
      setProjectStatuses(dict);
    } catch (err) {
      console.error('Failed to load project statuses:', err);
    }
  };

  const fetchOrgWideLogs = async () => {
    try {
      const res = await api.get('/api/work-journal/pending-manager?all=true');
      setOrgWideLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load org-wide logs:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/api/departments');
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleUpdateProjectStatus = async (projectName, newStatus) => {
    try {
      await api.post('/api/work-journal/project-status', { projectName, status: newStatus });
      setProjectStatuses(prev => ({
        ...prev,
        [projectName]: newStatus
      }));
      toast.success(`Project "${projectName}" status updated to ${newStatus}.`);
      fetchOrgWideLogs(); // Refresh logs to get updated status stats
    } catch (err) {
      console.error(err);
      toast.error('Failed to update project status.');
    }
  };
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error('Project Name is required.');
      return;
    }
    try {
      await api.post('/api/work-journal/project-status', {
        projectName: newProjectName.trim(),
        status: newProjectStatus,
        departmentId: newProjectDept || undefined
      });
      toast.success(`Project "${newProjectName.trim()}" created successfully.`);
      setShowAddProjectModal(false);
      setNewProjectName('');
      setNewProjectStatus('Active');
      setNewProjectDept('');
      fetchProjectStatuses(); // Refresh project lists
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create project.');
    }
  };

  useEffect(() => {
    if (!user) return;

    // Switch to manager desk for executive since they have no personal logs
    if (user.role === 'executive') {
      setActiveTab('manager_desk');
    }

    const isSpecial = user.role === 'executive';
    if (!isSpecial) {
      fetchJournalData();
      fetchJournalStats();
      fetchTimeline();
    }
    fetchProjectStatuses();
    if (['manager', 'hr', 'admin', 'executive'].includes(user.role)) {
      fetchPendingManagerDesk();
    }
    if (['admin', 'hr', 'executive'].includes(user.role)) {
      fetchOrgWideLogs();
      fetchDepartments();
    }
  }, [user]);

  const fetchJournalData = async () => {
    try {
      setLoading(true);
      const url = user?._id ? `/api/work-journal?employeeId=${user._id}` : '/api/work-journal';
      const res = await api.get(url);
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
      const url = user?._id ? `/api/work-journal/stats?employeeId=${user._id}` : '/api/work-journal/stats';
      const res = await api.get(url);
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
      const url = user?._id ? `/api/work-journal/timeline?employeeId=${user._id}` : '/api/work-journal/timeline';
      const res = await api.get(url);
      setTimelineData(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'jpg', 'jpeg'].includes(ext)) {
        toast.error('Invalid file format. Only PDF, JPG, and JPEG files are allowed.');
        e.target.value = '';
        setScreenshotFile(null);
        setImagePreviewUrl('');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds the 2MB limit. Please upload a smaller file.');
        e.target.value = '';
        setScreenshotFile(null);
        setImagePreviewUrl('');
        return;
      }
      setScreenshotFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!title || !title.trim()) {
      toast.error('Achievement Title is required.');
      return;
    }
    if (!category || !category.trim()) {
      toast.error('Category is required.');
      return;
    }
    if (!project || !project.trim()) {
      toast.error(`${formTemplate?.projectLabel || 'Project / Client / Account name'} is required.`);
      return;
    }
    if (hoursSpent === undefined || hoursSpent === null || hoursSpent === '' || isNaN(Number(hoursSpent)) || Number(hoursSpent) < 0) {
      toast.error('Hours Spent is required and must be a non-negative number.');
      return;
    }
    if (!resultSummary || !resultSummary.trim()) {
      toast.error(`${formTemplate?.summaryLabel || 'Work Summary'} is required.`);
      return;
    }
    if (!evidenceRef || !evidenceRef.trim()) {
      toast.error(`${formTemplate?.evidenceRefLabel || 'Proof Link / Reference ID'} is required.`);
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

  // Extract unique project list dynamically, sorted by most recent work log completed/created date (latest first)
  const uniqueProjects = Array.from(
    new Set(items.map(i => (i.project || '').trim()).filter(Boolean))
  ).sort((a, b) => {
    const logsA = items.filter(i => (i.project || '').trim() === a);
    const logsB = items.filter(i => (i.project || '').trim() === b);
    const maxDateA = Math.max(...logsA.map(i => new Date(i.completedDate || i.createdAt).getTime()));
    const maxDateB = Math.max(...logsB.map(i => new Date(i.completedDate || i.createdAt).getTime()));
    return maxDateB - maxDateA;
  });

  const filteredUniqueProjects = uniqueProjects.filter(p =>
    p.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const displayedProjects = showAllProjects
    ? filteredUniqueProjects
    : filteredUniqueProjects.slice(0, 11);

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

  const getCategoryBadgeStyle = (cat) => {
    switch (cat) {
      // Engineering
      case 'Development': return 'bg-sky-50 text-sky-700 border-sky-200/50';
      case 'Testing': return 'bg-amber-50 text-amber-700 border-amber-200/50';
      case 'Bug Fix': return 'bg-rose-50 text-rose-700 border-rose-200/50';
      case 'Architecture': return 'bg-violet-50 text-violet-700 border-violet-200/50';
      case 'Code Review': return 'bg-purple-50 text-purple-700 border-purple-200/50';
      case 'Documentation': return 'bg-slate-100 text-slate-700 border-slate-200/50';
      case 'Deployment': return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
      case 'Client Support': return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case 'Process Improvement': return 'bg-teal-50 text-teal-700 border-teal-200/50';
      // Sales & CRM
      case 'Client Meeting & Demo': return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case 'Lead Qualification & Call': return 'bg-sky-50 text-sky-700 border-sky-200/50';
      case 'Proposal & Quote Submitted': return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
      case 'Deal Closing & Contract': return 'bg-violet-50 text-violet-700 border-violet-200/50';
      case 'Client Follow-up & Nurturing': return 'bg-pink-50 text-pink-700 border-pink-200/50';
      case 'Account Management': return 'bg-teal-50 text-teal-700 border-teal-200/50';
      case 'Market Research': return 'bg-amber-50 text-amber-700 border-amber-250/50';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
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

  const getProjectStats = () => {
    let logs = items;
    if (['admin', 'hr', 'executive'].includes(user?.role)) {
      logs = orgWideLogs;
    } else if (user?.role === 'manager') {
      logs = pendingReviews;
    }
    
    // Group logs by project
    const projectGroups = {};
    logs.forEach(log => {
      const projName = (log.project || '').trim() || 'Unassigned';
      if (!projectGroups[projName]) {
        projectGroups[projName] = [];
      }
      projectGroups[projName].push(log);
    });

    // Ensure all defined projects from the Admin projectsList are initialized, even if they have 0 logs
    projectsList.forEach(p => {
      const name = (p.projectName || '').trim();
      if (name && !projectGroups[name]) {
        projectGroups[name] = [];
      }
    });

    return Object.entries(projectGroups).map(([projectName, projLogs]) => {
      const totalLogs = projLogs.length;
      const totalHours = projLogs.reduce((sum, l) => sum + (Number(l.hoursSpent) || 0), 0);
      const verifiedLogs = projLogs.filter(l => l.status === 'approved').length;
      const pendingLogs = projLogs.filter(l => l.status === 'submitted').length;
      const needsChanges = projLogs.filter(l => l.status === 'needs_changes').length;
      const rejectedLogs = projLogs.filter(l => l.status === 'rejected').length;
      
      // Contributors mapping
      const contributorsMap = {};
      projLogs.forEach(l => {
        if (l.employeeId) {
          const empId = l.employeeId._id || l.employeeId;
          const name = l.employeeId.firstName 
            ? `${l.employeeId.firstName} ${l.employeeId.lastName}` 
            : 'You';
          const avatar = l.employeeId.gender || 'male';
          contributorsMap[empId] = { name, avatar };
        } else {
          contributorsMap['me'] = { name: 'You', avatar: user?.gender || 'male' };
        }
      });
      const contributors = Object.values(contributorsMap);

      // Last activity time
      const dates = projLogs.map(l => new Date(l.completedDate || l.createdAt).getTime()).filter(Boolean);
      const lastActivityTime = dates.length > 0 ? Math.max(...dates) : null;
      const lastActivity = lastActivityTime ? new Date(lastActivityTime) : null;

      // Category breakdown
      const categories = {};
      projLogs.forEach(l => {
        categories[l.category] = (categories[l.category] || 0) + 1;
      });

      // Status determined by manual configuration, defaulting to 'Active'
      const projStatus = projectStatuses[projectName] || 'Active';

      return {
        projectName,
        totalLogs,
        totalHours,
        verifiedLogs,
        pendingLogs,
        needsChanges,
        rejectedLogs,
        contributors,
        lastActivity,
        categories,
        projStatus,
        logs: projLogs
      };
    }).sort((a, b) => {
      const timeA = a.lastActivity ? a.lastActivity.getTime() : 0;
      const timeB = b.lastActivity ? b.lastActivity.getTime() : 0;
      return timeB - timeA;
    });
  };

  return (
    <div className="space-y-6 text-xs text-slate-800 animate-fade-in">
      {/* Top Header Card */}
      {!['admin', 'executive'].includes(user?.role) && (
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
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all shrink-0 cursor-pointer"
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
              <span className="text-[9px] text-purple-350 block">Productive time</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-extrabold text-slate-500">
        {user?.role !== 'executive' && (
          <button
            onClick={() => setActiveTab('my_logs')}
            className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'my_logs' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <FileText size={16} />
            <span>My Daily Logs ({items.length})</span>
          </button>
        )}

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

        {user?.role !== 'executive' && (
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'timeline' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <Clock size={16} />
            <span>Evidence Timeline</span>
          </button>
        )}

        {['manager', 'hr', 'admin', 'executive'].includes(user?.role) && (
          <button
            onClick={() => setActiveTab('project_status')}
            className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'project_status' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <Folder size={16} className="text-indigo-600" />
            <span>Overall Project Status</span>
          </button>
        )}
      </div>

      {/* TAB 1: MY DAILY LOGS */}
      {activeTab === 'my_logs' && user?.role !== 'executive' && (
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
                {(formTemplate?.categories && formTemplate.categories.length > 0
                  ? formTemplate.categories.map(c => c.name)
                  : CATEGORIES
                ).map(cat => (
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
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📁 Project Log Sheets</span>
                <span className="text-[10px] lowercase text-slate-400 font-medium normal-case">(select a sheet to filter logs)</span>
              </h4>
              {/* Project Search Bar */}
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2.5 py-1 text-[10.5px] outline-none focus:border-sky-500 w-44 font-semibold text-slate-700"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {/* All Projects Sheet */}
              <button
                onClick={() => {
                  setProjectFilter('all');
                  setCurrentPage(1);
                }}
                className={`group flex flex-col justify-between p-3.5 border rounded-xl text-left transition-all duration-200 cursor-pointer ${
                  projectFilter === 'all'
                    ? 'bg-gradient-to-br from-sky-600 to-indigo-600 border-transparent text-white shadow-md shadow-sky-500/15 scale-[1.02]'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-3xs hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1.5 rounded-lg ${projectFilter === 'all' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-100/85'}`}>
                    <Folder size={13} className="transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${projectFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-650'}`}>
                    {items.length} logs
                  </span>
                </div>
                <div className="mt-3.5 min-w-0">
                  <p className={`font-black text-[11px] truncate ${projectFilter === 'all' ? 'text-white' : 'text-slate-800'}`}>All Projects</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${projectFilter === 'all' ? 'text-sky-100/90' : 'text-slate-450'}`}>
                    {items.reduce((sum, i) => sum + (Number(i.hoursSpent) || 0), 0)} hrs total
                  </p>
                </div>
              </button>

              {/* Dynamic Project Sheets */}
              {displayedProjects.map(proj => {
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
                    className={`group flex flex-col justify-between p-3.5 border rounded-xl text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-sky-600 to-indigo-600 border-transparent text-white shadow-md shadow-sky-500/15 scale-[1.02]'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-3xs hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-250/80'}`}>
                        <FileText size={13} className="transition-transform duration-200 group-hover:scale-110" />
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-650'}`}>
                        {projLogs.length} logs
                      </span>
                    </div>
                    <div className="mt-3.5 min-w-0">
                      <p className={`font-black text-[11px] truncate ${isSelected ? 'text-white' : 'text-slate-800'}`} title={proj}>{proj}</p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-sky-100/90' : 'text-slate-450'}`}>
                        {totalHours} hrs logged
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination / Expand for Projects */}
            {filteredUniqueProjects.length > 11 && (
              <div className="flex justify-center pt-1.5">
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-extrabold text-slate-600 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showAllProjects
                    ? 'Show Less Projects'
                    : `Show All Projects (${filteredUniqueProjects.length})`
                  }
                </button>
              </div>
            )}
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
                  <div key={item._id} className="bg-white border border-slate-200/70 rounded-2xl p-5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/5 transition-all duration-300 space-y-4 flex flex-col justify-between overflow-hidden group">
                    <div className="space-y-3.5">
                      {/* Category Tag & Status Badge */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${getCategoryBadgeStyle(item.category)}`}>
                            {item.category}
                          </span>
                        </div>
                        {getStatusBadge(item.status, item.isLocked)}
                      </div>

                      {/* Log Title & Project Info */}
                      <div className="space-y-1.5 min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-snug break-words group-hover:text-slate-900 transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                            📁 {item.project || 'General'}
                          </span>
                          {item.hoursSpent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-250/60 font-mono">
                              ⏱️ {item.hoursSpent} hrs
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary Description Box */}
                      {(item.resultSummary || item.description) && (
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-[11.5px] text-slate-650 space-y-1 overflow-hidden">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wide">Work Summary & Result</span>
                          <p className="leading-relaxed font-medium break-words text-slate-700">{item.resultSummary || item.description}</p>
                        </div>
                      )}

                      {/* Custom Fields answers */}
                      {(() => {
                        let fields = item.customFieldsData;
                        if (typeof fields === 'string') {
                          try {
                            fields = JSON.parse(fields);
                          } catch (e) {
                            fields = {};
                          }
                        }
                        if (!fields || Object.keys(fields).length === 0) return null;
                        
                        return (
                          <div className="space-y-1.5 overflow-hidden">
                            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wide">Custom Field Answers</span>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(fields).map(([key, val]) => (
                                val ? (
                                  <div key={key} className="bg-sky-50/40 border border-sky-100/50 rounded-lg px-2.5 py-1 text-[10px] text-sky-800 flex items-center gap-1 max-w-full">
                                    <span className="text-slate-500 font-semibold capitalize shrink-0">{key.replace(/_/g, ' ')}:</span>
                                    <strong className="text-slate-800 font-extrabold truncate">{String(val)}</strong>
                                  </div>
                                ) : null
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Manager Feedback / Requested Changes Banner */}
                      {item.status === 'needs_changes' && (
                        <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl text-amber-950 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-amber-900 text-[10px] uppercase tracking-wide">
                            <AlertCircle size={12} className="text-amber-600 shrink-0" />
                            <span>Manager Requested Changes</span>
                          </div>
                          {item.managerFeedback && <p className="text-[11px] font-medium text-amber-800 italic">"{item.managerFeedback}"</p>}
                        </div>
                      )}
                    </div>

                    {/* Timeline, evidence and actions footer */}
                    <div className="space-y-3 pt-3.5 border-t border-slate-100 text-[11px] overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-500 min-w-0">
                        <span className="flex items-center gap-1 shrink-0 font-medium">
                          📅 Completed: <strong className="text-slate-700">{formatDateDDMMYYYY(item.completedDate)}</strong>
                        </span>
                        {item.evidenceRef && (() => {
                          const isUrl = /^(https?:\/\/|www\.)/i.test(item.evidenceRef);
                          const hrefVal = isUrl ? (item.evidenceRef.startsWith('http') ? item.evidenceRef : `https://${item.evidenceRef}`) : null;

                          if (isUrl) {
                            return (
                              <a
                                href={hrefVal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded text-[10px] text-sky-700 font-extrabold max-w-full truncate block transition-colors cursor-pointer"
                                title={`Open link: ${item.evidenceRef}`}
                              >
                                🔗 {item.evidenceType}: {item.evidenceRef}
                              </a>
                            );
                          }

                          if (item.evidenceUrl) {
                            return (
                              <button
                                onClick={() => setLightboxImage(item.evidenceUrl)}
                                className="font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] text-slate-650 hover:text-sky-700 font-bold max-w-full truncate block transition-colors cursor-pointer text-left"
                                title={`Click to view proof: ${item.evidenceRef}`}
                              >
                                🔗 {item.evidenceType}: {item.evidenceRef}
                              </button>
                            );
                          }

                          return (
                            <span
                              className="font-mono bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] text-slate-650 font-bold max-w-full truncate block"
                              title={`${item.evidenceType}: ${item.evidenceRef}`}
                            >
                              🔗 {item.evidenceType}: {item.evidenceRef}
                            </span>
                          );
                        })()}
                      </div>

                      {item.managerFeedback && item.status !== 'needs_changes' && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-slate-700 space-y-0.5">
                          <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wide">Manager Comment</span>
                          <p className="italic font-medium text-slate-650">"{item.managerFeedback}"</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {!item.isLocked && (item.status === 'needs_changes' || item.status === 'submitted') && (
                          <button
                            onClick={() => handleEditClick(item)}
                            className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>✏️ Edit & Resubmit Work Log</span>
                          </button>
                        )}

                        {item.evidenceUrl && (
                          <button
                            onClick={() => setLightboxImage(item.evidenceUrl)}
                            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:border-slate-350"
                          >
                            <Image size={13} className="text-slate-400" />
                            <span>View Attachment Proof 🔍</span>
                          </button>
                        )}
                      </div>
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
                                className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 flex flex-col justify-between overflow-hidden group ${
                                  rev.status === 'approved' || rev.isLocked
                                    ? 'bg-emerald-50/20 border-emerald-200/70'
                                    : 'bg-white border-slate-200/80 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/5'
                                }`}
                              >
                                <div className="space-y-3.5">
                                  {/* Category Tag & Status Badge */}
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${getCategoryBadgeStyle(rev.category)}`}>
                                        {rev.category}
                                      </span>
                                    </div>
                                    {getStatusBadge(rev.status, rev.isLocked)}
                                  </div>

                                  {/* Log Title & Project Info */}
                                  <div className="space-y-1.5 min-w-0">
                                    <h4 className="font-extrabold text-slate-800 text-sm leading-snug break-words group-hover:text-slate-900 transition-colors">
                                      {rev.title}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                                        📁 {rev.project || 'General'}
                                      </span>
                                      {rev.hoursSpent && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-250/60 font-mono">
                                          ⏱️ {rev.hoursSpent} hrs
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Summary Description Box */}
                                  {(rev.resultSummary || rev.description) && (
                                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-[11.5px] text-slate-650 space-y-1 overflow-hidden">
                                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wide">Work Summary & Result</span>
                                      <p className="leading-relaxed font-medium break-words text-slate-700">{rev.resultSummary || rev.description}</p>
                                    </div>
                                  )}

                                  {/* Custom Fields answers */}
                                  {(() => {
                                    let fields = rev.customFieldsData;
                                    if (typeof fields === 'string') {
                                      try {
                                        fields = JSON.parse(fields);
                                      } catch (e) {
                                        fields = {};
                                      }
                                    }
                                    if (!fields || Object.keys(fields).length === 0) return null;
                                    
                                    return (
                                      <div className="space-y-1.5 overflow-hidden">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wide">Custom Field Answers</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {Object.entries(fields).map(([k, v]) => (
                                            v ? (
                                              <div key={k} className="bg-sky-50/40 border border-sky-100/50 rounded-lg px-2.5 py-1 text-[10px] text-sky-800 flex items-center gap-1 max-w-full">
                                                <span className="text-slate-500 font-semibold capitalize shrink-0">{k.replace(/_/g, ' ')}:</span>
                                                <strong className="text-slate-800 font-extrabold truncate">{String(v)}</strong>
                                              </div>
                                            ) : null
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Timeline, evidence and actions footer */}
                                <div className="space-y-3.5 pt-3.5 border-t border-slate-100 text-[11px] overflow-hidden">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-500 min-w-0">
                                    <span className="flex items-center gap-1 shrink-0 font-medium">
                                      📅 Completed: <strong className="text-slate-700">{formatDateDDMMYYYY(rev.completedDate)}</strong>
                                    </span>
                                    {rev.evidenceRef && (() => {
                                      const isUrl = /^(https?:\/\/|www\.)/i.test(rev.evidenceRef);
                                      const hrefVal = isUrl ? (rev.evidenceRef.startsWith('http') ? rev.evidenceRef : `https://${rev.evidenceRef}`) : null;

                                      if (isUrl) {
                                        return (
                                          <a
                                            href={hrefVal}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded text-[10px] text-sky-700 font-extrabold max-w-full truncate block transition-colors cursor-pointer"
                                            title={`Open link: ${rev.evidenceRef}`}
                                          >
                                            🔗 {rev.evidenceType}: {rev.evidenceRef}
                                          </a>
                                        );
                                      }

                                      if (rev.evidenceUrl) {
                                        return (
                                          <button
                                            onClick={() => setLightboxImage(rev.evidenceUrl)}
                                            className="font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] text-slate-650 hover:text-sky-700 font-bold max-w-full truncate block transition-colors cursor-pointer text-left"
                                            title={`Click to view proof: ${rev.evidenceRef}`}
                                          >
                                            🔗 {rev.evidenceType}: {rev.evidenceRef}
                                          </button>
                                        );
                                      }

                                      return (
                                        <span
                                          className="font-mono bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] text-slate-650 font-bold max-w-full truncate block"
                                          title={`${rev.evidenceType}: ${rev.evidenceRef}`}
                                        >
                                          🔗 {rev.evidenceType}: {rev.evidenceRef}
                                        </span>
                                      );
                                    })()}
                                  </div>

                                  {/* Evidence Upload attachment proof button if present */}
                                  {rev.evidenceUrl && (
                                    <button
                                      onClick={() => setLightboxImage(rev.evidenceUrl)}
                                      className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-[10px] text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer hover:border-slate-350"
                                    >
                                      <Image size={12} className="text-slate-400" />
                                      <span>View Attachment Proof Screenshot 🔍</span>
                                    </button>
                                  )}

                                  {/* Manager Review Action inputs */}
                                  {rev.status === 'approved' || rev.isLocked ? (
                                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-150 text-emerald-950 text-xs">
                                      <div className="flex items-center gap-1.5 font-extrabold text-emerald-900 text-[10px] uppercase tracking-wide">
                                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                        <span>Verified & Locked as Permanent Evidence</span>
                                      </div>
                                      {rev.managerFeedback && <p className="text-[11px] font-medium text-emerald-800 italic mt-0.5">"{rev.managerFeedback}"</p>}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                                      <input
                                        type="text"
                                        placeholder="Add optional manager feedback/correction requests..."
                                        value={isEditing ? reviewComment : (rev.managerFeedback || '')}
                                        onChange={(e) => {
                                          setReviewingId(rev._id);
                                          setReviewComment(e.target.value);
                                        }}
                                        className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 font-medium w-full"
                                      />

                                      <div className="grid grid-cols-3 gap-2">
                                        <button
                                          onClick={() => handleReviewAction(rev._id, 'needs_changes')}
                                          className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer text-center"
                                        >
                                          ⚠️ Request Changes
                                        </button>
                                        <button
                                          onClick={() => handleReviewAction(rev._id, 'rejected')}
                                          className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer text-center"
                                        >
                                          ❌ Reject
                                        </button>
                                        <button
                                          onClick={() => handleReviewAction(rev._id, 'approved')}
                                          className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-xs"
                                        >
                                          <Check size={13} />
                                          <span>Approve & Lock</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
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
      {activeTab === 'timeline' && user?.role !== 'executive' && (
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

      {/* TAB 4: OVERALL PROJECT STATUS SHEET */}
      {activeTab === 'project_status' && (() => {
        const statsData = getProjectStats();
        const filteredStats = statsData.filter(proj => {
          const matchesSearch = proj.projectName.toLowerCase().includes(projectStatusSearch.toLowerCase()) ||
            proj.contributors.some(c => c.name.toLowerCase().includes(projectStatusSearch.toLowerCase()));
          const matchesStatus = projectStatusFilter === 'all' || proj.projStatus === projectStatusFilter;
          return matchesSearch && matchesStatus;
        });

        const PROJECT_STATUS_PAGE_SIZE = 10;
        const totalProjectsPages = Math.ceil(filteredStats.length / PROJECT_STATUS_PAGE_SIZE) || 1;
        const safeProjectPage = Math.max(1, Math.min(projectStatusPage, totalProjectsPages));
        const paginatedStats = filteredStats.slice(
          (safeProjectPage - 1) * PROJECT_STATUS_PAGE_SIZE,
          safeProjectPage * PROJECT_STATUS_PAGE_SIZE
        );

        const totalProjectsCount = statsData.length;
        const totalHoursAcrossProjects = statsData.reduce((sum, p) => sum + p.totalHours, 0);
        const activeProjectsCount = statsData.filter(p => p.projStatus === 'Active').length;
        
        // Count unique contributors overall
        const uniqueContrSet = new Set();
        statsData.forEach(p => p.contributors.forEach(c => uniqueContrSet.add(c.name)));
        const totalUniqueContributors = uniqueContrSet.size;

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Overall Project Status Sheet</span>
                  <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                    {filteredStats.length} Projects Listed
                  </span>
                </h3>
                <p className="text-slate-500 text-xs">Aggregated status and activity metric tracking across all projects and team members.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {/* Status Dropdown Filter */}
                <select
                  value={projectStatusFilter}
                  onChange={(e) => {
                    setProjectStatusFilter(e.target.value);
                    setProjectStatusPage(1); // Reset page on filter change
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-sky-500 font-bold cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Stale">Stale</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Completed">Completed</option>
                </select>

                {/* Project Status Search Bar */}
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search project or contributor..."
                    value={projectStatusSearch}
                    onChange={(e) => {
                      setProjectStatusSearch(e.target.value);
                      setProjectStatusPage(1); // Reset page on search change
                    }}
                    className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 rounded-xl text-xs outline-none focus:border-sky-500 font-medium"
                  />
                </div>

                {['admin', 'hr', 'executive'].includes(user?.role) && (
                  <button
                    onClick={() => setShowAddProjectModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Create Project</span>
                  </button>
                )}
              </div>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Total Projects</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{totalProjectsCount}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Total Hours Logged</span>
                <span className="text-lg font-black text-sky-700 mt-1 block">{totalHoursAcrossProjects} Hrs</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Active Projects</span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">{activeProjectsCount}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Unique Contributors</span>
                <span className="text-lg font-black text-indigo-650 mt-1 block">{totalUniqueContributors} Team Members</span>
              </div>
            </div>

            {/* Status Table */}
            {filteredStats.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-400 italic font-medium">No projects found matching search query.</p>
              </div>
            ) : (<>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-3 px-4 w-10 text-center">Select</th>
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Total Time Logged</th>
                      <th className="py-3 px-4">Verification Ratios</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4">Contributors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {paginatedStats.map(proj => {
                      const isExpanded = !!expandedProjects[proj.projectName];
                      const totalVerifications = proj.verifiedLogs + proj.pendingLogs + proj.needsChanges + proj.rejectedLogs;
                      const verifiedPercent = totalVerifications > 0 ? Math.round((proj.verifiedLogs / totalVerifications) * 100) : 0;

                      return (
                        <React.Fragment key={proj.projectName}>
                          <tr 
                            onClick={() => {
                              setExpandedProjects(prev => ({
                                ...prev,
                                [proj.projectName]: !prev[proj.projectName]
                              }));
                            }}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group font-semibold text-slate-800"
                          >
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center p-1 rounded bg-slate-150 text-slate-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                {isExpanded ? (
                                  <ChevronUp size={12} />
                                ) : (
                                  <ChevronDown size={12} />
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-extrabold text-slate-900 text-xs">
                              {proj.projectName}
                            </td>
                            <td className="py-3 px-4">
                              {['manager', 'hr', 'admin', 'executive'].includes(user?.role) ? (
                                <select
                                  value={proj.projStatus}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateProjectStatus(proj.projectName, e.target.value)}
                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border bg-white cursor-pointer outline-none ${
                                    proj.projStatus === 'Active'
                                      ? 'text-emerald-700 border-emerald-200 bg-emerald-50/20'
                                      : proj.projStatus === 'Completed'
                                      ? 'text-sky-700 border-sky-200 bg-sky-50/20'
                                      : proj.projStatus === 'Stale'
                                      ? 'text-amber-700 border-amber-200 bg-amber-50/20'
                                      : 'text-slate-650 border-slate-200 bg-slate-50/20'
                                  }`}
                                >
                                  <option value="Active">Active</option>
                                  <option value="Stale">Stale</option>
                                  <option value="Inactive">Inactive</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              ) : (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                  proj.projStatus === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : proj.projStatus === 'Completed'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : proj.projStatus === 'Stale'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-550 border-slate-200'
                                }`}>
                                  {proj.projStatus}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-sky-850">{proj.totalHours} hrs</span>
                              <span className="text-[10px] text-slate-450 block">{proj.totalLogs} logs logged</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[9.5px]">
                                  <span className="text-emerald-700 font-extrabold">{proj.verifiedLogs} Verified</span>
                                  <span className="text-slate-450 font-bold">{verifiedPercent}% ratio</span>
                                </div>
                                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                                  <div 
                                    className="bg-emerald-500 h-full transition-all duration-300"
                                    style={{ width: `${verifiedPercent}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              {proj.lastActivity 
                                ? proj.lastActivity.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'No activity'
                              }
                            </td>
                            <td className="py-3 px-4">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProjectContributors(proj);
                                }}
                                className="flex items-center gap-1.5 hover:opacity-85 transition-opacity bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-xl cursor-pointer group shadow-3xs"
                              >
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {proj.contributors.slice(0, 3).map((contrib, index) => (
                                    <div 
                                      key={index}
                                      title={contrib.name}
                                      className="w-5 h-5 rounded-full border border-white bg-slate-200 text-[9px] font-black text-slate-700 flex items-center justify-center shrink-0 shadow-3xs"
                                    >
                                      {contrib.name.charAt(0)}
                                    </div>
                                  ))}
                                  {proj.contributors.length > 3 && (
                                    <div className="w-5 h-5 rounded-full border border-white bg-slate-800 text-[8px] font-black text-white flex items-center justify-center shrink-0 shadow-3xs">
                                      +{proj.contributors.length - 3}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-650 max-w-[80px] truncate group-hover:text-indigo-700">
                                  {proj.contributors.length === 1 
                                    ? proj.contributors[0].name 
                                    : `${proj.contributors.length} Users`}
                                </span>
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Detail Card */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="7" className="p-4 bg-slate-50/50 border-t border-slate-200/60">
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-5">
                                  {/* Stats Sub Header */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                      <h5 className="font-extrabold text-[10.5px] text-slate-500 uppercase tracking-wider mb-2">Category Contribution</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(proj.categories).map(([cat, count]) => (
                                          <span key={cat} className="px-2 py-0.5 rounded-lg bg-slate-50 text-[10px] font-bold border border-slate-250/70 text-slate-750 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                            {cat}: <strong className="text-slate-850 font-black">{count}</strong>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="lg:col-span-2">
                                      <h5 className="font-extrabold text-[10.5px] text-slate-500 uppercase tracking-wider mb-2">Active Contributors ({proj.contributors.length})</h5>
                                      <div className="flex flex-wrap gap-2.5">
                                        {proj.contributors.map((c, idx) => {
                                          const contribLogs = proj.logs.filter(l => {
                                            if (l.employeeId) {
                                              const name = `${l.employeeId.firstName} ${l.employeeId.lastName}`;
                                              return name === c.name;
                                            }
                                            return c.name === 'You';
                                          });
                                          const contribHrs = contribLogs.reduce((sum, l) => sum + (Number(l.hoursSpent) || 0), 0);
                                          
                                          return (
                                            <span key={idx} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-800">
                                              <span className="w-4 h-4 rounded-full bg-sky-100 text-[8.5px] font-black text-sky-700 flex items-center justify-center">
                                                {c.name.charAt(0)}
                                              </span>
                                              {c.name}
                                              <span className="bg-sky-50 border border-sky-100 text-sky-850 text-[8px] font-black px-1.5 py-0.2 rounded-md">
                                                {contribHrs} hrs
                                              </span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Inner logs list */}
                                  <div className="space-y-3">
                                    <h5 className="font-extrabold text-[10.5px] text-slate-500 uppercase tracking-wider">Project Log Registry ({proj.logs.length} entries)</h5>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                      <table className="w-full text-[10.5px] text-left border-collapse bg-white">
                                        <thead>
                                          <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                                            <th className="py-2.5 px-3">Title</th>
                                            <th className="py-2.5 px-3">Category</th>
                                            <th className="py-2.5 px-3">Contributor</th>
                                            <th className="py-2.5 px-3">Hours</th>
                                            <th className="py-2.5 px-3">Date Completed</th>
                                            <th className="py-2.5 px-3">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                                          {proj.logs.map(log => {
                                            const cName = log.employeeId
                                              ? `${log.employeeId.firstName} ${log.employeeId.lastName}`
                                              : 'You';
                                            return (
                                              <tr key={log._id} className="hover:bg-slate-50/40">
                                                <td className="py-2.5 px-3 font-bold text-slate-900">{log.title}</td>
                                                <td className="py-2.5 px-3">{log.category}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{cName}</td>
                                                <td className="py-2.5 px-3 font-extrabold text-sky-800">{log.hoursSpent} hrs</td>
                                                <td className="py-2.5 px-3 text-slate-500 font-medium">
                                                  {log.completedDate 
                                                    ? new Date(log.completedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'N/A'
                                                  }
                                                </td>
                                                <td className="py-2.5 px-3">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border ${
                                                    log.status === 'approved'
                                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                      : log.status === 'submitted'
                                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                      : log.status === 'needs_changes'
                                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                                  }`}>
                                                    {log.status === 'approved' ? 'Verified' : log.status === 'needs_changes' ? 'Changes Needed' : log.status}
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              <TablePagination
                page={safeProjectPage}
                totalPages={totalProjectsPages}
                totalCount={filteredStats.length}
                pageSize={PROJECT_STATUS_PAGE_SIZE}
                onPageChange={(p) => setProjectStatusPage(p)}
              />
              </>)}
          </div>
        );
      })()}

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
                    {formTemplate?.projectLabel || 'Project / Module'} *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProjSelectOpen(!isProjSelectOpen)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 text-left flex justify-between items-center outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <span className="truncate">{project || `Select ${formTemplate?.projectLabel || 'Project / Module'}`}</span>
                      <ChevronDown size={14} className="text-slate-400 shrink-0" />
                    </button>

                    {isProjSelectOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => { setIsProjSelectOpen(false); setProjQuery(''); }}
                        />
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-2 max-h-60 overflow-y-auto">
                          <input
                            type="text"
                            placeholder="Search project..."
                            value={projQuery}
                            onChange={(e) => setProjQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-250/70 p-2 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="space-y-0.5">
                            {projectsList
                              .filter(p => p.status === 'Active')
                              .filter(p => {
                                const userDeptId = user?.departmentId?._id || user?.departmentId;
                                const projDeptId = p.departmentId?._id || p.departmentId;
                                return !projDeptId || projDeptId === userDeptId;
                              })
                              .filter(p => p.projectName.toLowerCase().includes(projQuery.toLowerCase()))
                              .map(p => (
                                <button
                                  key={p.projectName}
                                  type="button"
                                  onClick={() => {
                                    setProject(p.projectName);
                                    setIsProjSelectOpen(false);
                                    setProjQuery('');
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer block"
                                >
                                  {p.projectName}
                                </button>
                              ))
                            }
                            {/* Fallback to preserve current value if not active */}
                            {project && !projectsList.some(p => p.projectName === project && p.status === 'Active') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsProjSelectOpen(false);
                                  setProjQuery('');
                                }}
                                className="w-full text-left px-2.5 py-1.5 bg-indigo-50/50 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer block"
                              >
                                {project} (Inactive/Completed)
                              </button>
                            )}
                             {projectsList
                               .filter(p => p.status === 'Active')
                               .filter(p => {
                                 const userDeptId = user?.departmentId?._id || user?.departmentId;
                                 const projDeptId = p.departmentId?._id || p.departmentId;
                                 return !projDeptId || projDeptId === userDeptId;
                               })
                               .filter(p => p.projectName.toLowerCase().includes(projQuery.toLowerCase()))
                               .length === 0 && (
                               <p className="text-slate-400 italic text-[10px] text-center py-2">No active projects found.</p>
                             )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Hours Spent *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 3.5"
                    value={hoursSpent}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (Number(val) < 0) return;
                      setHoursSpent(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  {formTemplate?.summaryLabel || 'Work Summary & Output Result'} *
                </label>
                <textarea
                  rows="3"
                  placeholder={formTemplate?.summaryPlaceholder || 'Summarize what was delivered, defects solved, or business result achieved...'}
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-sky-500"
                  required
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
                          onChange={(e) => {
                            const val = e.target.value;
                            if (field.fieldType === 'number' && Number(val) < 0) return;
                            setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: val });
                          }}
                          min={field.fieldType === 'number' ? "0" : undefined}
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
                    {formTemplate?.evidenceRefLabel || 'Proof Link / Reference ID'} *
                  </label>
                  <input
                    type="text"
                    placeholder={formTemplate?.evidenceRefPlaceholder || 'e.g. URL or Doc Ref'}
                    value={evidenceRef}
                    onChange={(e) => setEvidenceRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* File Attachment Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Screenshot Proof (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,image/jpeg,application/pdf"
                  onChange={handleFileChange}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Allowed formats: PDF, JPG, JPEG (Max file size: 2MB)</p>
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold cursor-pointer shadow-md transition-colors flex items-center gap-2"
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

      {/* Modal: View Project Contributors */}
      {selectedProjectContributors && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-100 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {selectedProjectContributors.projectName}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                  Active Contributors ({selectedProjectContributors.contributors.length})
                </p>
              </div>
              <button 
                onClick={() => setSelectedProjectContributors(null)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer p-1 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {selectedProjectContributors.contributors.map((c, idx) => {
                const contribLogs = selectedProjectContributors.logs.filter(l => {
                  if (l.employeeId) {
                    const name = `${l.employeeId.firstName} ${l.employeeId.lastName}`;
                    return name === c.name;
                  }
                  return c.name === 'You';
                });
                const contribHrs = contribLogs.reduce((sum, l) => sum + (Number(l.hoursSpent) || 0), 0);
                const contribCount = contribLogs.length;

                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl hover:bg-slate-100/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-black text-indigo-700 flex items-center justify-center shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 text-xs">{c.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          {contribCount} {contribCount === 1 ? 'log' : 'logs'} registered
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-sky-50 border border-sky-100 text-sky-850 text-[10px] font-black px-2.5 py-0.5 rounded-lg">
                        {contribHrs} hrs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProjectContributors(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Project (Admin/HR/Executive only) */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100 animate-fade-in text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">
                Create New Project
              </h3>
              <button 
                onClick={() => {
                  setShowAddProjectModal(false);
                  setNewProjectName('');
                  setNewProjectStatus('Active');
                  setNewProjectDept('');
                }}
                className="text-slate-400 hover:text-slate-650 cursor-pointer p-1 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Payroll v2"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Department</label>
                <select
                  value={newProjectDept}
                  onChange={(e) => setNewProjectDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="">Global / All Departments</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.departmentName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Initial Status *</label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Stale">Stale</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProjectModal(false);
                    setNewProjectName('');
                    setNewProjectStatus('Active');
                    setNewProjectDept('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer"
                >
                  Create
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
