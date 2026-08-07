import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { toast } from '../store/toastStore';
import TablePagination from '../components/TablePagination';
import { 
  CalendarRange, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Search, 
  Calendar, 
  Clock, 
  FileText,
  User as UserIcon,
  BarChart3,
  ListTodo,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';

const LeaveWorkspace = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Roles check
  const isHR = ['hr', 'admin'].includes(user?.role);
  const isManagement = ['hr', 'admin', 'executive'].includes(user?.role);
  const canApply = !['executive', 'admin'].includes(user?.role);

  // Tabs: 'dashboard' (HR/Admin/CEO default), 'hr' (HR/Admin approvals), 'my' (Own requests)
  const [activeTab, setActiveTab] = useState('my');

  // Leave lists
  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState(false);

  // Pagination states
  const PAGE_SIZE = 10;
  const [dashboardPage, setDashboardPage] = useState(1);
  const [myPage, setMyPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);

  // Filters for Management Dashboard
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Form State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    title: '',
    reason: '',
    type: 'Full Day',
    fromDate: '',
    toDate: ''
  });

  // Custom Modal States
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Dynamically set default active tab once user role is available
  useEffect(() => {
    if (user) {
      setActiveTab(isManagement ? 'dashboard' : 'my');
    }
  }, [user]);

  // Reset dashboard page on filter change
  useEffect(() => {
    setDashboardPage(1);
  }, [searchTerm, statusFilter, deptFilter]);

  // Load data based on active tab and role
  useEffect(() => {
    if (!user) return;
    fetchMyLeaves();
    if (isManagement) {
      fetchAllLeaves();
    }
    if (isHR || user?.role === 'executive') {
      fetchPendingLeaves();
    }
  }, [user]);

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/leaves');
      setMyLeaves(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch your leave requests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const res = await api.get('/api/leaves/all');
      setAllLeaves(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingLeaves = async () => {
    try {
      const res = await api.get('/api/leaves/pending');
      setPendingLeaves(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (applyForm.type === 'Full Day' && new Date(applyForm.toDate) < new Date(applyForm.fromDate)) {
        toast.error('To Date cannot be before From Date.');
        return;
      }
      
      const payload = { ...applyForm };
      if (payload.type === 'Half Day') {
        payload.toDate = payload.fromDate; // ensure matches
      }

      await api.post('/api/leaves', payload);
      toast.success('Leave request submitted successfully.');
      setShowApplyModal(false);
      setApplyForm({
        title: '',
        reason: '',
        type: 'Full Day',
        fromDate: '',
        toDate: ''
      });
      fetchMyLeaves();
      if (isManagement) {
        fetchAllLeaves();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setLoading(false);
    }
  };

  const triggerApproveClick = (leave) => {
    setApproveTarget(leave);
    setShowApproveConfirm(true);
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    try {
      setActioning(true);
      await api.post(`/api/leaves/${approveTarget._id}/review`, { status: 'approved' });
      toast.success('Leave request approved successfully.');
      setShowApproveConfirm(false);
      setApproveTarget(null);
      
      // Refresh all lists
      fetchPendingLeaves();
      fetchAllLeaves();
      fetchMyLeaves();
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve leave request.');
    } finally {
      setActioning(false);
    }
  };

  const triggerRejectClick = (leave) => {
    setRejectTarget(leave);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    try {
      setActioning(true);
      await api.post(`/api/leaves/${rejectTarget._id}/review`, { 
        status: 'rejected', 
        rejectionReason: rejectionReason.trim() 
      });
      toast.success('Leave request rejected successfully.');
      setShowRejectModal(false);
      setRejectTarget(null);
      
      // Refresh all lists
      fetchPendingLeaves();
      fetchAllLeaves();
      fetchMyLeaves();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject leave request.');
    } finally {
      setActioning(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Approved</span>;
      case 'rejected':
        return <span className="bg-rose-50 text-rose-700 border border-rose-250 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Rejected</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 border border-amber-250 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Pending</span>;
    }
  };

  // Extract unique departments dynamically
  const departmentsList = [
    ...new Set(
      allLeaves
        .map(l => l.employeeId?.departmentId?.departmentName)
        .filter(Boolean)
    )
  ];

  // Filter leaves for Management Dashboard
  const filteredAllLeaves = allLeaves.filter(leave => {
    const empName = `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`.toLowerCase();
    const matchSearch = empName.includes(searchTerm.toLowerCase()) || 
                        (leave.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || leave.status === statusFilter;
    const matchDept = deptFilter === 'all' || 
                      leave.employeeId?.departmentId?.departmentName === deptFilter;

    return matchSearch && matchStatus && matchDept;
  });

  const totalDashboardPages = Math.ceil(filteredAllLeaves.length / PAGE_SIZE) || 1;
  const safeDashboardPage = Math.min(dashboardPage, totalDashboardPages);
  const dashboardStartIndex = (safeDashboardPage - 1) * PAGE_SIZE;
  const paginatedAllLeaves = filteredAllLeaves.slice(dashboardStartIndex, dashboardStartIndex + PAGE_SIZE);

  const totalMyPages = Math.ceil(myLeaves.length / PAGE_SIZE) || 1;
  const safeMyPage = Math.min(myPage, totalMyPages);
  const myStartIndex = (safeMyPage - 1) * PAGE_SIZE;
  const paginatedMyLeaves = myLeaves.slice(myStartIndex, myStartIndex + PAGE_SIZE);

  const totalPendingPages = Math.ceil(pendingLeaves.length / PAGE_SIZE) || 1;
  const safePendingPage = Math.min(pendingPage, totalPendingPages);
  const pendingStartIndex = (safePendingPage - 1) * PAGE_SIZE;
  const paginatedPendingLeaves = pendingLeaves.slice(pendingStartIndex, pendingStartIndex + PAGE_SIZE);

  // Calculate Metrics
  const totalRequests = allLeaves.length;
  const approvedRequests = allLeaves.filter(l => l.status === 'approved').length;
  const pendingRequests = allLeaves.filter(l => l.status === 'pending').length;
  const rejectedRequests = allLeaves.filter(l => l.status === 'rejected').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      {/* ACTION LOADER OVERLAY */}
      {actioning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3.5 z-[100] animate-fadeIn">
          <Loader2 className="text-sky-400 animate-spin" size={44} />
          <div className="text-center">
            <h4 className="text-white text-sm font-black tracking-wide uppercase">Processing Leave Decision</h4>
            <p className="text-slate-400 text-[10px] mt-1 font-medium">Updating attendance logs and dispatching email notifications...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-xl animate-fade-in">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
              Leave Workspace
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Leave Management Center
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-2xl font-medium">
            Submit your leave applications, track real-time status updates, and view historical leave records.
          </p>
        </div>

        {canApply && (
          <div className="flex flex-wrap items-center gap-3.5 relative z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setShowApplyModal(true)}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer w-full md:w-auto shrink-0"
            >
              <Plus size={16} />
              <span>Apply for Leave</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {isManagement && (
        <div className="flex border-b border-slate-200/80 mb-6 bg-slate-50/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BarChart3 size={14} />
            <span>Leave Dashboard</span>
          </button>

          {(isHR || user?.role === 'executive') && (
            <button
              onClick={() => setActiveTab('hr')}
              className={`px-5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'hr' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ListTodo size={14} />
              <span>{user?.role === 'executive' ? 'CEO Approval Desk' : 'HR Approval Desk'}</span>
              {pendingLeaves.length > 0 && (
                <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {pendingLeaves.length}
                </span>
              )}
            </button>
          )}

          {canApply && (
            <button
              onClick={() => setActiveTab('my')}
              className={`px-5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeTab === 'my' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              My Leave Requests
            </button>
          )}
        </div>
      )}

      {/* TAB CONTENT: LEAVE DASHBOARD (CEO / HR / Admin) */}
      {activeTab === 'dashboard' && isManagement && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Requests</p>
              <h3 className="text-xl font-black text-slate-800 mt-1">{totalRequests}</h3>
            </div>
            <div className="bg-amber-50/40 border border-amber-200/60 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Pending Review</p>
              <h3 className="text-xl font-black text-amber-700 mt-1">{pendingRequests}</h3>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200/60 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Approved Leaves</p>
              <h3 className="text-xl font-black text-emerald-700 mt-1">{approvedRequests}</h3>
            </div>
            <div className="bg-rose-50/40 border border-rose-200/60 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Declined Requests</p>
              <h3 className="text-xl font-black text-rose-700 mt-1">{rejectedRequests}</h3>
            </div>
          </div>

          {/* Filters Dashboard Grid */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between border-b border-slate-100 pb-5">
              <h2 className="font-extrabold text-sm text-slate-800">Organization Leave Registry</h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search employee or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-xl outline-none text-xs text-slate-700 focus:border-sky-500 focus:bg-white font-medium transition-all"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-650 outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                {/* Dept Filter */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-650 outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departmentsList.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            {filteredAllLeaves.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium space-y-2">
                <CalendarRange className="mx-auto text-slate-300" size={40} />
                <p className="text-xs">No records matching selected filter criteria.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee Details</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Leave Title & Reason</th>
                      <th className="py-3 px-4">Requested Dates</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedAllLeaves.map(leave => (
                      <tr key={leave._id} className="hover:bg-slate-50/30">
                        <td className="py-3 px-4 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                            <UserIcon size={12} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{leave.employeeId?.firstName} {leave.employeeId?.lastName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{leave.employeeId?.employeeCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600">
                          {leave.employeeId?.departmentId?.departmentName || 'N/A'}
                        </td>
                        <td className="py-3 px-4 max-w-xs space-y-0.5">
                          <p className="font-bold text-slate-800">{leave.title}</p>
                          <p className="text-slate-455 line-clamp-1 italic">"{leave.reason}"</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {formatDate(leave.fromDate)} &rarr; {formatDate(leave.toDate)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                            leave.type === 'Half Day' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {leave.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(leave.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                page={safeDashboardPage}
                totalPages={totalDashboardPages}
                totalCount={filteredAllLeaves.length}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => setDashboardPage(p)}
              />
            </>)}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY LEAVES */}
      {activeTab === 'my' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-extrabold text-sm text-slate-800">My Leave Application History</h2>
            <span className="text-slate-400 font-medium text-[10px] uppercase">
              Total {myLeaves.length} requests
            </span>
          </div>

          {loading && myLeaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">Loading leave history...</div>
          ) : myLeaves.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium space-y-3">
              <CalendarRange className="mx-auto text-slate-300" size={40} />
              <p className="text-xs">No leave requests found. Click "Apply for Leave" above to submit one.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Duration Dates</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Approver Note / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedMyLeaves.map(leave => (
                    <tr key={leave._id} className="hover:bg-slate-50/40">
                      <td className="py-3.5 px-4 space-y-1">
                        <p className="font-bold text-slate-800">{leave.title}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{leave.reason}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {formatDate(leave.fromDate)} &rarr; {formatDate(leave.toDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          leave.type === 'Half Day' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {leave.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(leave.status)}</td>
                      <td className="py-3.5 px-4 max-w-xs text-slate-500 font-medium italic break-words">
                        {leave.status === 'rejected' && leave.rejectionReason 
                          ? `Rejected: "${leave.rejectionReason}"` 
                          : leave.status === 'approved' 
                          ? (['hr', 'manager'].includes(user?.role) ? 'Approved by CEO' : 'Approved by HR') 
                          : (['hr', 'manager'].includes(user?.role) ? 'Awaiting CEO decision' : 'Awaiting HR decision')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safeMyPage}
              totalPages={totalMyPages}
              totalCount={myLeaves.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setMyPage(p)}
            />
          </>)}
        </div>
      )}

      {/* TAB CONTENT: HR/CEO APPROVAL DESK */}
      {activeTab === 'hr' && (isHR || user?.role === 'executive') && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-extrabold text-sm text-slate-800">Pending Approvals Desk</h2>
            <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              {pendingLeaves.length} Pending requests
            </span>
          </div>

          {pendingLeaves.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium space-y-3">
              <Check className="mx-auto text-emerald-400 bg-emerald-50 border border-emerald-100 rounded-full p-2.5" size={44} />
              <p className="text-xs">All caught up! No pending leave requests to action.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Title & Reason</th>
                    <th className="py-3 px-4">Requested Dates</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedPendingLeaves.map(leave => (
                    <tr key={leave._id} className="hover:bg-slate-50/40">
                      <td className="py-3.5 px-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold">
                          <UserIcon size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {leave.employeeId?.firstName} {leave.employeeId?.lastName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-455 uppercase shrink-0">
                            {leave.employeeId?.role} • {leave.employeeId?.employeeCode}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs space-y-1">
                        <p className="font-extrabold text-slate-800">{leave.title}</p>
                        <p className="text-slate-455 leading-relaxed font-medium break-words italic">"{leave.reason}"</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {formatDate(leave.fromDate)} &rarr; {formatDate(leave.toDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          leave.type === 'Half Day' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {leave.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => triggerApproveClick(leave)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 border border-emerald-250 rounded-lg transition-colors cursor-pointer"
                            title="Approve Leave"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => triggerRejectClick(leave)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-700 border border-rose-250 rounded-lg transition-colors cursor-pointer"
                            title="Reject Leave"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safePendingPage}
              totalPages={totalPendingPages}
              totalCount={pendingLeaves.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPendingPage(p)}
            />
          </>)}
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL: APPROVE LEAVE */}
      {showApproveConfirm && approveTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-950 px-5 py-4 text-white flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Confirm Leave Approval</span>
              </h3>
              <button
                onClick={() => { setShowApproveConfirm(false); setApproveTarget(null); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Are you sure you want to approve the leave request <strong className="text-slate-800">"{approveTarget.title}"</strong> for{' '}
                <strong className="text-slate-850">{approveTarget.employeeId?.firstName} {approveTarget.employeeId?.lastName}</strong>?
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-[11px] text-slate-500 space-y-1.5">
                <p>🗓️ <strong>Dates:</strong> {formatDate(approveTarget.fromDate)} &rarr; {formatDate(approveTarget.toDate)}</p>
                <p>📋 <strong>Type:</strong> {approveTarget.type}</p>
                <p className="italic">💬 <strong>Reason:</strong> "{approveTarget.reason}"</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowApproveConfirm(false); setApproveTarget(null); }}
                  className="border border-slate-250 hover:bg-slate-50 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveConfirm}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Yes, Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPLY LEAVE */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-950 px-5 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-wide">Submit Leave Request</h3>
                <p className="text-[9px] text-slate-400">Request formal leave approval from HR.</p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-450 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Leave Title / Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Family Function / Medical Leave"
                  value={applyForm.title}
                  onChange={(e) => setApplyForm({ ...applyForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl outline-none text-xs text-slate-700 focus:border-sky-500 focus:bg-white font-semibold transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Detailed Reason *</label>
                <textarea
                  rows="3"
                  placeholder="Please state the reason for leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl outline-none text-xs text-slate-700 focus:border-sky-500 focus:bg-white font-semibold resize-none transition-all"
                  required
                />
              </div>

              {/* Segmented Button Control for Leave Type */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Leave Type *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyForm(prev => ({ ...prev, type: 'Full Day' }))}
                    className={`flex-1 py-1.5 px-3 text-[10px] uppercase tracking-wider font-extrabold border rounded-xl transition-all cursor-pointer ${
                      applyForm.type === 'Full Day'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Full Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyForm(prev => ({ ...prev, type: 'Half Day', toDate: prev.fromDate }))}
                    className={`flex-1 py-1.5 px-3 text-[10px] uppercase tracking-wider font-extrabold border rounded-xl transition-all cursor-pointer ${
                      applyForm.type === 'Half Day'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Half Day
                  </button>
                </div>
              </div>

              {/* Dynamic Date Inputs based on Leave Type */}
              {applyForm.type === 'Half Day' ? (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Date *</label>
                  <input
                    type="date"
                    value={applyForm.fromDate}
                    onChange={(e) => setApplyForm({ ...applyForm, fromDate: e.target.value, toDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl outline-none text-xs text-slate-700 focus:border-sky-500 focus:bg-white font-bold transition-all"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">From Date *</label>
                    <input
                      type="date"
                      value={applyForm.fromDate}
                      onChange={(e) => setApplyForm({ ...applyForm, fromDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl outline-none text-xs text-slate-700 focus:border-sky-500 focus:bg-white font-bold transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">To Date *</label>
                    <input
                      type="date"
                      value={applyForm.toDate}
                      onChange={(e) => setApplyForm({ ...applyForm, toDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl outline-none text-xs text-slate-700 focus:border-sky-500 focus:bg-white font-bold transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="border border-slate-250 hover:bg-slate-50 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT LEAVE REASON */}
      {showRejectModal && rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2">
                  <XCircle size={16} className="text-rose-400" />
                  <span>Decline Leave Request</span>
                </h3>
                <p className="text-[9px] text-slate-400">Specify reason for leave rejection.</p>
              </div>
              <button
                onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectConfirm} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                You are declining the leave request for <strong className="text-slate-800">{rejectTarget.employeeId?.firstName} {rejectTarget.employeeId?.lastName}</strong>.
              </p>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rejection Reason *</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Insufficient handovers / Peak business period requires resources..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl outline-none text-xs text-slate-700 focus:border-rose-500 focus:bg-white font-semibold resize-none transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
                  className="border border-slate-250 hover:bg-slate-50 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actioning}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-2 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveWorkspace;
