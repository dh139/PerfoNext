import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Calendar, MessageSquare, Send, CheckCircle2, User, Users, Star, ArrowUpRight, Search } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/avatar';

const FeedbackCenter = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'request', 'summary'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown lists
  const [users, setUsers] = useState([]);
  const [cycles, setCycles] = useState([]);

  // Pending Reviews
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null); // Selected request to review

  // Ratings for active review
  const [ratings, setRatings] = useState({
    workQuality: 5,
    productivity: 5,
    technical: 5,
    communication: 5,
    ownership: 5,
    learning: 5
  });
  const [comments, setComments] = useState('');

  // Request form state
  const [requestForm, setRequestForm] = useState({
    employeeId: '',
    reviewerId: '',
    relationship: 'peer',
    cycleId: ''
  });

  // Summary state
  const [summaryEmployeeId, setSummaryEmployeeId] = useState('');
  const [summaryCycleId, setSummaryCycleId] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [availableSummaries, setAvailableSummaries] = useState([]);

  // Searchable dropdown states
  const [subjDropdownOpen, setSubjDropdownOpen] = useState(false);
  const [subjSearchQuery, setSubjSearchQuery] = useState('');
  const [revDropdownOpen, setRevDropdownOpen] = useState(false);
  const [revSearchQuery, setRevSearchQuery] = useState('');
  const [sumDropdownOpen, setSumDropdownOpen] = useState(false);
  const [sumSearchQuery, setSumSearchQuery] = useState('');

  // Enterprise Combobox and Disbursed Registry states
  const [departments, setDepartments] = useState([]);
  const [subjDeptFilter, setSubjDeptFilter] = useState('all');
  const [revDeptFilter, setRevDeptFilter] = useState('all');
  const [disbursedRequests, setDisbursedRequests] = useState([]);

  const detectRelationship = (subjectId, reviewerId) => {
    if (!subjectId || !reviewerId) return 'peer';
    const subject = users.find(u => u._id === subjectId);
    const reviewer = users.find(u => u._id === reviewerId);
    if (!subject || !reviewer) return 'peer';

    const subjMgrId = subject.managerId?._id || subject.managerId;
    const revMgrId = reviewer.managerId?._id || reviewer.managerId;

    if (subjMgrId && subjMgrId.toString() === reviewer._id.toString()) {
      return 'manager';
    }
    if (reviewer.role === 'executive' && (subject.role === 'manager' || subject.role === 'hr')) {
      return 'manager';
    }

    if (revMgrId && revMgrId.toString() === subject._id.toString()) {
      return 'subordinate';
    }
    if (subject.role === 'executive' && (reviewer.role === 'manager' || reviewer.role === 'hr')) {
      return 'subordinate';
    }

    return 'peer';
  };

  const formatRelationshipLabel = (rel) => {
    switch (rel) {
      case 'manager':
        return 'Manager Review ⬆️';
      case 'subordinate':
        return 'Subordinate (Reporting Staff) ⬇️';
      case 'peer':
      default:
        return 'Peer (Same Tier) 👥';
    }
  };

  // Helper to filter valid subject users based on relationship
  const getFilteredSubjectUsers = () => {
    return users.filter(u => {
      // Department Filter
      const uDeptId = u.departmentId?._id || u.departmentId;
      const matchesDept = subjDeptFilter === 'all' || (uDeptId && uDeptId.toString() === subjDeptFilter.toString());

      // Search Query Filter
      const deptName = u.departmentId?.departmentName || '';
      const desigName = u.designationId?.designationName || '';
      const code = u.employeeCode || '';
      const searchStr = `${u.firstName} ${u.lastName} ${u.role} ${deptName} ${desigName} ${code}`.toLowerCase();
      const matchesSearch = !subjSearchQuery || searchStr.includes(subjSearchQuery.toLowerCase());

      if (!matchesDept || !matchesSearch) return false;

      // When 'subordinate' relationship is selected, Subject Employee is the Manager being evaluated by subordinate staff
      if (requestForm.relationship === 'subordinate') {
        return u.role === 'manager' || u.role === 'hr' || u.role === 'executive';
      }

      // When 'manager' relationship is selected, Subject Employee is the Employee receiving review from manager
      if (requestForm.relationship === 'manager') {
        return u.role === 'employee';
      }

      return true;
    });
  };

  const handleRelationshipChange = (newRel) => {
    setRequestForm(prev => {
      const nextForm = { ...prev, relationship: newRel };
      
      // Determine valid subject users for the new relationship
      const filteredSubjs = users.filter(u => {
        if (newRel === 'subordinate') return u.role === 'manager' || u.role === 'hr' || u.role === 'executive';
        if (newRel === 'manager') return u.role === 'employee';
        return true;
      });

      const isCurrentSubjValid = filteredSubjs.some(u => u._id === prev.employeeId);
      if (!isCurrentSubjValid && filteredSubjs.length > 0) {
        nextForm.employeeId = filteredSubjs[0]._id;
      }
      return nextForm;
    });
  };

  // Helper to filter valid reviewers based on relationship
  const getFilteredReviewers = () => {
    const subject = users.find(sub => sub._id === requestForm.employeeId);
    if (!subject) return users;

    const subDeptId = subject.departmentId?._id?.toString() || subject.departmentId?.toString();
    const subMgrId = subject.managerId?._id?.toString() || subject.managerId?.toString();

    return users.filter(u => {
      if (u._id === subject._id) return false;

      const uDeptId = u.departmentId?._id?.toString() || u.departmentId?.toString();
      const uMgrId = u.managerId?._id?.toString() || u.managerId?.toString();

      // Search query filter
      const desigName = u.designationId?.designationName || '';
      const deptName = u.departmentId?.departmentName || '';
      const code = u.employeeCode || '';
      const searchStr = `${u.firstName} ${u.lastName} ${u.role} ${deptName} ${desigName} ${code}`.toLowerCase();
      if (revSearchQuery && !searchStr.includes(revSearchQuery.toLowerCase())) {
        return false;
      }

      // Department Pill filter
      if (revDeptFilter !== 'all' && uDeptId !== revDeptFilter.toString()) {
        return false;
      }

      // Relationship Strict Filters
      if (requestForm.relationship === 'peer') {
        return u.role === subject.role && subDeptId && uDeptId && subDeptId === uDeptId;
      }

      if (requestForm.relationship === 'subordinate') {
        if (uMgrId && uMgrId === subject._id.toString()) return true;
        if ((subject.role === 'manager' || subject.role === 'hr' || subject.role === 'executive') && u.role === 'employee' && subDeptId && uDeptId && subDeptId === uDeptId) {
          return true;
        }
        if (subject.role === 'executive' && (u.role === 'manager' || u.role === 'hr')) {
          return true;
        }
        return false;
      }

      if (requestForm.relationship === 'manager') {
        if (subMgrId && subMgrId === u._id.toString()) return true;
        if (subject.role === 'employee' && (u.role === 'manager' || u.role === 'hr' || u.role === 'executive') && subDeptId && uDeptId && subDeptId === uDeptId) {
          return true;
        }
        if ((subject.role === 'manager' || subject.role === 'hr') && u.role === 'executive') {
          return true;
        }
        return false;
      }

      return true;
    });
  };

  // Helper to filter review cycles applicable to a specific subject employee
  const getFilteredCyclesForSubject = (targetUserId) => {
    if (!targetUserId) return cycles;
    const subjectUser = users.find(u => u._id === targetUserId);
    if (!subjectUser) return cycles;

    const subjDeptId = (subjectUser.departmentId?._id || subjectUser.departmentId || '').toString();
    const subjRole = subjectUser.role || 'employee';
    const isMgrRole = subjRole === 'manager' || subjRole === 'hr' || subjRole === 'executive';

    return cycles.filter(c => {
      // 1. Department match
      const cycleDeptId = (c.kpiTemplateId?.departmentId?._id || c.kpiTemplateId?.departmentId || c.departmentId?._id || c.departmentId || '').toString();
      const cycleDeptName = (c.kpiTemplateId?.departmentId?.departmentName || '').toLowerCase();
      
      const isAllDepts = !cycleDeptId || cycleDeptName.includes('all department') || cycleDeptName === 'all';
      const matchesDept = isAllDepts || (subjDeptId && cycleDeptId && subjDeptId === cycleDeptId);

      if (!matchesDept) return false;

      // 2. Role match
      const targetRole = c.targetRole || 'employee';
      let matchesRole = true;
      if (targetRole === 'manager') {
        matchesRole = isMgrRole;
      } else if (targetRole === 'employee') {
        matchesRole = !isMgrRole;
      }

      if (!matchesRole) return false;

      // 3. Joining date boundary
      if (subjectUser.joiningDate && (c.endDate || c.startDate)) {
        const joinDate = new Date(subjectUser.joiningDate);
        const cycleEnd = new Date(c.endDate || c.startDate);
        if (joinDate > cycleEnd) return false;
      }

      return true;
    });
  };

  useEffect(() => {
    fetchPendingRequests();
    fetchMetadata();
    fetchAvailableSummaries();
    fetchDisbursedRequests();
  }, []);

  useEffect(() => {
    if (requestForm.employeeId && cycles.length > 0) {
      const validCycles = getFilteredCyclesForSubject(requestForm.employeeId);
      if (validCycles.length > 0) {
        if (!validCycles.some(c => c._id === requestForm.cycleId)) {
          setRequestForm(prev => ({ ...prev, cycleId: validCycles[0]._id }));
        }
      } else {
        setRequestForm(prev => ({ ...prev, cycleId: '' }));
      }
    }
  }, [requestForm.employeeId, requestForm.relationship, cycles, users]);

  const fetchDisbursedRequests = async () => {
    try {
      const res = await api.get('/api/feedback/requests');
      setDisbursedRequests(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableSummaries = async () => {
    try {
      const res = await api.get('/api/feedback/available-summaries');
      setAvailableSummaries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/feedback/requests?status=pending&assignedToMe=true');
      setPendingRequests(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pending feedback requests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/departments')
      ]);
      setDepartments(deptsRes.data || []);
      let allUsers = usersRes.data || [];

      // Exclude system admin accounts
      allUsers = allUsers.filter(u => u.role !== 'admin');

      // If logged-in user is a Reporting Manager, scope strictly to their assigned department
      if (user?.role === 'manager') {
        const mgrDeptId = user?.departmentId?._id || user?.departmentId;
        allUsers = allUsers.filter(u => {
          const uDeptId = u.departmentId?._id || u.departmentId;
          const isSameDept = uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
          const isValidRole = u.role !== 'executive' && u.role !== 'hr';
          return isSameDept && isValidRole;
        });
      }

      setUsers(allUsers);
      if (allUsers.length > 0) {
        const defaultSubj = allUsers[0]._id;
        const defaultRev = allUsers.length > 1 ? allUsers[1]._id : allUsers[0]._id;
        const initialRel = detectRelationship(defaultSubj, defaultRev);
        setRequestForm(prev => ({
          ...prev,
          employeeId: defaultSubj,
          reviewerId: defaultRev,
          relationship: initialRel
        }));
        setSummaryEmployeeId(usersRes.data[0]._id);
      }

      const cyclesRes = await api.get('/api/review-cycles');
      setCycles(cyclesRes.data);
      if (cyclesRes.data.length > 0) {
        setRequestForm(prev => ({ ...prev, cycleId: cyclesRes.data[0]._id }));
        setSummaryCycleId(cyclesRes.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (requestForm.employeeId === requestForm.reviewerId) {
      setError('An employee cannot review themselves.');
      return;
    }

    if (requestForm.relationship === 'peer') {
      const subject = users.find(u => u._id === requestForm.employeeId);
      const reviewer = users.find(u => u._id === requestForm.reviewerId);
      if (subject && reviewer) {
        if (subject.role !== reviewer.role) {
          setError('For Peer feedback, both employees must have the same tier (role).');
          return;
        }
        const subDept = subject.departmentId?._id?.toString() || subject.departmentId?.toString();
        const revDept = reviewer.departmentId?._id?.toString() || reviewer.departmentId?.toString();
        if (subDept !== revDept) {
          setError('For Peer feedback, both employees must belong to the same department.');
          return;
        }
      }
    }

    try {
      setLoading(true);
      await api.post('/api/feedback/requests', requestForm);
      setSuccess('Feedback request successfully dispatched!');
      setRequestForm(prev => ({ ...prev, relationship: 'peer' }));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to dispatch request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!comments.trim()) {
      setError('Feedback justification comment is required.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/feedback/responses', {
        requestId: activeRequest._id,
        ratings,
        comments
      });
      setSuccess('Your feedback has been submitted anonymously.');
      setActiveRequest(null);
      setComments('');
      setRatings({ workQuality: 5, productivity: 5, technical: 5, communication: 5, ownership: 5, learning: 5 });
      fetchPendingRequests();
      fetchAvailableSummaries();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!summaryEmployeeId || !summaryCycleId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/feedback/summary/${summaryEmployeeId}?cycleId=${summaryCycleId}`);
      setSummaryData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load anonymized summary.');
    } finally {
      setLoading(false);
    }
  };

  const renderRatingStars = (category, currentVal) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(val => (
          <button
            key={val}
            type="button"
            onClick={() => setRatings({ ...ratings, [category]: val })}
            className="cursor-pointer transition-transform active:scale-95"
          >
            <Star
              size={16}
              className={val <= currentVal ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
                Feedback Hub
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                360° Anonymized Peer Engine
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              360° & Peer Feedback Center
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Disburse anonymous evaluation surveys to colleagues, peers, & subordinates with encrypted aggregations.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pending Surveys</p>
              <h2 className="text-xl font-extrabold text-amber-400 mt-0.5">{pendingRequests.length}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Action required</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <MessageSquare size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Peer Participants</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{users.length}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Colleagues active</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Cycles</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">{cycles.length}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Appraisal windows</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Calendar size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Anonymity Protocol</p>
              <h2 className="text-xl font-extrabold text-indigo-300 mt-0.5">Encrypted</h2>
              <span className="text-[9px] text-indigo-400 font-bold uppercase">100% Confidential</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Send size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => { setActiveTab('pending'); setError(''); setSuccess(''); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pending' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-850'
          }`}
        >
          <MessageSquare size={16} />
          <span>My Pending Reviews ({pendingRequests.length})</span>
        </button>

        {user?.role !== 'employee' && (
          <>
            <button
              onClick={() => { setActiveTab('request'); setError(''); setSuccess(''); }}
              className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'request' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              <Send size={16} />
              <span>Disburse Feedback Request</span>
            </button>
            <button
              onClick={() => { setActiveTab('summary'); setError(''); setSuccess(''); }}
              className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'summary' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              <Users size={16} />
              <span>Anonymized Summaries</span>
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-2 font-bold text-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {activeRequest ? (
            /* Review Evaluation Wizard Form */
            <form onSubmit={handleResponseSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-sm text-slate-800">Submit Anonymous Assessment</h3>
                <p className="text-slate-400 mt-1">
                  Evaluating Colleague: <span className="font-bold text-slate-700">{activeRequest.employeeId.firstName} {activeRequest.employeeId.lastName}</span>
                </p>
                <p className="text-[10px] text-indigo-600 mt-0.5 font-bold uppercase tracking-wide">
                  Relationship Category: {formatRelationshipLabel(activeRequest.relationship)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Categories Inputs */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-655">Work Quality</span>
                    {renderRatingStars('workQuality', ratings.workQuality)}
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-655">Productivity</span>
                    {renderRatingStars('productivity', ratings.productivity)}
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-655">Technical Competence</span>
                    {renderRatingStars('technical', ratings.technical)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-655">Communication Skills</span>
                    {renderRatingStars('communication', ratings.communication)}
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-655">Accountability & Ownership</span>
                    {renderRatingStars('ownership', ratings.ownership)}
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-655">Continuous Learning</span>
                    {renderRatingStars('learning', ratings.learning)}
                  </div>
                </div>

              </div>

              {/* Written feedback comment */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Qualitative Feedback & Observations</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  placeholder="Provide constructive feedback..."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-sky-700 hover:bg-sky-850 text-white font-bold rounded-xl cursor-pointer"
                >
                  Submit Anonymous Review
                </button>
              </div>

            </form>
          ) : (
            /* Pending List */
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="py-12 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                  <MessageSquare className="mx-auto text-slate-300 mb-2" size={24} />
                  <p className="text-slate-400">You do not have any pending colleague evaluation surveys.</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div
                    key={req._id}
                    className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Review Colleague: {req.employeeId.firstName} {req.employeeId.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Cycle Month: {req.cycleId.reviewMonth} | Relationship: <span className="font-bold text-slate-700">{formatRelationshipLabel(req.relationship)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveRequest(req); setError(''); setSuccess(''); }}
                      className="px-4 py-2 bg-sky-700 hover:bg-sky-850 text-white font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      Assess Colleague
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-6">
          {/* Disburse Colleague Survey Form */}
          <form onSubmit={handleRequestSubmit} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="font-extrabold text-sm text-slate-800 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Disburse Colleague 360° Survey</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                100% Confidential Protocol
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Subject employee Combobox */}
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Review Subject Employee *</label>
                  <span className="text-[9px] font-extrabold text-sky-600">
                    {getFilteredSubjectUsers().length} {requestForm.relationship === 'subordinate' ? 'Managers' : 'Eligible'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSubjDropdownOpen(!subjDropdownOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-2xl text-xs font-semibold text-slate-800 text-left transition-all cursor-pointer shadow-xs"
                >
                  {(() => {
                    const selected = users.find(u => u._id === requestForm.employeeId);
                    if (!selected) return <span className="text-slate-400 italic">Select Subject Employee...</span>;
                    const deptName = selected.departmentId?.departmentName || 'General';
                    const desigName = selected.designationId?.designationName || '';
                    return (
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getUserAvatarUrl(selected)}
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-slate-900 block truncate">
                            {selected.firstName} {selected.lastName}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate">
                            {selected.employeeCode} • {deptName}{desigName ? ` (${desigName})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <span className="text-slate-400 text-[10px] ml-2 shrink-0">▼</span>
                </button>

                {subjDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => { setSubjDropdownOpen(false); setSubjSearchQuery(''); }} />
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 p-3 space-y-2.5 animate-fade-in text-slate-800">
                      {/* Search Input */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={subjSearchQuery}
                          onChange={(e) => setSubjSearchQuery(e.target.value)}
                          placeholder="Search employee..."
                          className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                          autoFocus
                        />
                      </div>

                      {/* Department Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => setSubjDeptFilter('all')}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                            subjDeptFilter === 'all'
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          All ({getFilteredSubjectUsers().length})
                        </button>
                        {departments.map(d => (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() => setSubjDeptFilter(d._id)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                              subjDeptFilter.toString() === d._id.toString()
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {d.departmentName}
                          </button>
                        ))}
                      </div>

                      {/* List */}
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {getFilteredSubjectUsers().length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs italic">
                            No matching {requestForm.relationship === 'subordinate' ? 'subordinate employees' : 'employees'} found.
                          </div>
                        ) : (
                          getFilteredSubjectUsers().map(u => (
                            <button
                              key={u._id}
                              type="button"
                              onClick={() => {
                                setRequestForm(prev => ({ ...prev, employeeId: u._id }));
                                setSubjDropdownOpen(false);
                                setSubjSearchQuery('');
                              }}
                              className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                                requestForm.employeeId === u._id ? 'bg-sky-50 text-sky-950 font-bold border-sky-300 shadow-xs' : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={getUserAvatarUrl(u)}
                                  alt="Avatar"
                                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="font-extrabold text-slate-900 text-xs block truncate">{u.firstName} {u.lastName}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    {u.employeeCode} • {u.departmentId?.departmentName || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">{u.role}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Colleague Relationship Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Colleague Relationship *</label>
                <select
                  value={requestForm.relationship}
                  onChange={(e) => handleRelationshipChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl outline-none font-bold text-indigo-700 text-xs cursor-pointer"
                  required
                >
                  <option value="peer">Peer (Same Tier & Department) 👥</option>
                  <option value="subordinate">Subordinate (Reporting Staff) ⬇️</option>
                  <option value="manager">Manager Review ⬆️</option>
                </select>
              </div>

              {/* Assigned Reviewer Combobox */}
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assigned Reviewer *</label>
                  <span className="text-[9px] font-extrabold text-sky-600">
                    {getFilteredReviewers().length} Valid Candidates
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setRevDropdownOpen(!revDropdownOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-2xl text-xs font-semibold text-slate-800 text-left transition-all cursor-pointer shadow-xs"
                >
                  {(() => {
                    const selected = users.find(u => u._id === requestForm.reviewerId);
                    if (!selected) return <span className="text-slate-400 italic">Select Assigned Reviewer...</span>;
                    const deptName = selected.departmentId?.departmentName || 'General';
                    const desigName = selected.designationId?.designationName || '';
                    return (
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getUserAvatarUrl(selected)}
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-slate-900 block truncate">
                            {selected.firstName} {selected.lastName}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate">
                            {selected.employeeCode} • {deptName}{desigName ? ` (${desigName})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <span className="text-slate-400 text-[10px] ml-2 shrink-0">▼</span>
                </button>

                {revDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => { setRevDropdownOpen(false); setRevSearchQuery(''); }} />
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 p-3 space-y-2.5 animate-fade-in text-slate-800">
                      {/* Search Input */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={revSearchQuery}
                          onChange={(e) => setRevSearchQuery(e.target.value)}
                          placeholder="Search reviewer..."
                          className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                          autoFocus
                        />
                      </div>

                      {/* Department Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => setRevDeptFilter('all')}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                            revDeptFilter === 'all'
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          All ({getFilteredReviewers().length})
                        </button>
                        {departments.map(d => (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() => setRevDeptFilter(d._id)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap transition-colors cursor-pointer border ${
                              revDeptFilter.toString() === d._id.toString()
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {d.departmentName}
                          </button>
                        ))}
                      </div>

                      {/* Filtered Candidate Reviewers */}
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {(() => {
                          const filteredReviewers = getFilteredReviewers();
                          if (filteredReviewers.length === 0) {
                            const subjUser = users.find(u => u._id === requestForm.employeeId);
                            const subjName = subjUser ? `${subjUser.firstName} ${subjUser.lastName}` : 'the selected employee';
                            return (
                              <div className="p-4 text-center text-slate-400 text-xs italic space-y-1">
                                <p className="font-bold text-slate-500">No matching candidate reviewers found.</p>
                                <p className="text-[10px]">
                                  {requestForm.relationship === 'subordinate' 
                                    ? `${subjName} has no reporting staff (subordinates).`
                                    : requestForm.relationship === 'manager'
                                    ? `No managers found for ${subjName}.`
                                    : `No same-tier peer colleagues found in ${subjUser?.departmentId?.departmentName || 'the department'}.`}
                                </p>
                              </div>
                            );
                          }

                          return filteredReviewers.map(u => (
                            <button
                              key={u._id}
                              type="button"
                              onClick={() => {
                                setRequestForm(prev => ({ ...prev, reviewerId: u._id }));
                                setRevDropdownOpen(false);
                                setRevSearchQuery('');
                              }}
                              className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                                requestForm.reviewerId === u._id ? 'bg-sky-50 text-sky-950 font-bold border-sky-300 shadow-xs' : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={getUserAvatarUrl(u)}
                                  alt="Avatar"
                                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="font-extrabold text-slate-900 text-xs block truncate">{u.firstName} {u.lastName}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    {u.employeeCode} • {u.departmentId?.departmentName || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">{u.role}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Active Cycle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Performance Review Cycle *</label>
                {(() => {
                  const filteredCycles = getFilteredCyclesForSubject(requestForm.employeeId);
                  if (filteredCycles.length === 0) {
                    return (
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl text-xs font-semibold text-amber-800 flex items-center gap-2">
                        <span>⚠️ No review cycles applicable for this employee's department/role/tenure.</span>
                      </div>
                    );
                  }

                  return (
                    <select
                      value={requestForm.cycleId}
                      onChange={(e) => setRequestForm({ ...requestForm, cycleId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl outline-none font-semibold text-slate-700 text-xs cursor-pointer"
                      required
                    >
                      {filteredCycles.map(c => {
                        const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                        const targetLabel = c.targetRole === 'manager' ? 'Manager Cycle' : 'Employee Cycle';
                        return (
                          <option key={c._id} value={c._id}>
                            Month: {c.reviewMonth} — Dept: {deptName} [{targetLabel}] ({c.cycleType})
                          </option>
                        );
                      })}
                    </select>
                  );
                })()}
              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-700 hover:bg-sky-850 text-white font-bold py-3 px-4 rounded-2xl cursor-pointer shadow-md transition-colors mt-4 uppercase text-[10px] tracking-wider"
            >
              Launch Feedback Request
            </button>
          </form>

          {/* Disbursed Feedback Surveys Registry Table */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <MessageSquare size={16} className="text-sky-600" />
                  <span>Disbursed Feedback Surveys Registry</span>
                  <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                    {disbursedRequests.length} Total Disbursed
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Live audit log of all 360° evaluation survey assignments across departments
                </p>
              </div>
            </div>

            {disbursedRequests.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                No feedback surveys disbursed yet. Launch a survey above to track progress.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="p-3">Review Subject</th>
                      <th className="p-3">Assigned Reviewer</th>
                      <th className="p-3">Relationship</th>
                      <th className="p-3">Review Cycle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Disbursed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {disbursedRequests.map(req => (
                      <tr key={req._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getUserAvatarUrl(req.employeeId)}
                              alt="Avatar"
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{req.employeeId?.firstName} {req.employeeId?.lastName}</p>
                              <p className="text-[9px] font-mono text-slate-400">{req.employeeId?.employeeCode || 'EMP'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getUserAvatarUrl(req.reviewerId)}
                              alt="Avatar"
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{req.reviewerId?.firstName} {req.reviewerId?.lastName}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-bold">{req.reviewerId?.role}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-semibold text-slate-700">
                          {formatRelationshipLabel(req.relationship)}
                        </td>

                        <td className="p-3 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 font-mono text-[10px]">
                            {req.cycleId?.reviewMonth || 'N/A'}
                          </span>
                        </td>

                        <td className="p-3">
                          {req.status === 'submitted' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              ● Pending Survey
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-slate-400 text-[10px]">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Available Summaries Dashboard List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Users size={16} className="text-sky-600" />
                <span>Available Anonymized 360° Feedback Summaries</span>
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Quickly select and analyze aggregated anonymized feedback summaries for employees
              </p>
            </div>

            {availableSummaries.length === 0 ? (
              <div className="py-8 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <p className="text-slate-400 italic text-xs">No feedback responses recorded for any employees in any cycles yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Department & Designation</th>
                      <th className="p-3">Review Cycle</th>
                      <th className="p-3">Aggregated Feedback Count</th>
                      <th className="p-3 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {availableSummaries.map(s => {
                      const emp = s.employee || {};
                      const cycle = s.cycle || {};
                      const deptName = emp.departmentId?.departmentName || 'General';
                      const desigName = emp.designationId?.designationName || '-';

                      const isSelected = summaryEmployeeId === emp._id && summaryCycleId === cycle._id;

                      return (
                        <tr key={`${emp._id}_${cycle._id}`} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-sky-50/30' : ''}`}>
                          <td className="p-3">
                            <div>
                              <p className="font-bold text-slate-800">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {emp.employeeCode || 'EMP-N/A'}
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-700">{deptName}</p>
                            <p className="text-[10px] text-slate-400">{desigName}</p>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-600">
                              {cycle.reviewMonth} ({cycle.cycleType})
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 rounded text-[10px] font-bold">
                                Peer: {s.peerCount}
                              </span>
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-bold">
                                Subordinate: {s.subordinateCount}
                              </span>
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold">
                                Manager: {s.managerCount}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                setSummaryEmployeeId(emp._id);
                                setSummaryCycleId(cycle._id);
                                try {
                                  setLoading(true);
                                  setError('');
                                  const res = await api.get(`/api/feedback/summary/${emp._id}?cycleId=${cycle._id}`);
                                  setSummaryData(res.data);
                                } catch (err) {
                                  console.error(err);
                                  setError('Failed to load anonymized summary.');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className={`px-3 py-1.5 font-bold rounded-xl text-[11px] transition-colors cursor-pointer border ${
                                isSelected 
                                  ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Analyze Feedback'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Selector Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1 flex-1 relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Employee</label>
              <button
                type="button"
                onClick={() => setSumDropdownOpen(!sumDropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer"
              >
                <span>
                  {(() => {
                    const selected = users.find(u => u._id === summaryEmployeeId);
                    return selected ? `${selected.firstName} ${selected.lastName}` : 'Select Employee...';
                  })()}
                </span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {sumDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setSumDropdownOpen(false); setSumSearchQuery(''); }} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-2 space-y-2 max-h-60 overflow-y-auto animate-fade-in">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        value={sumSearchQuery}
                        onChange={(e) => setSumSearchQuery(e.target.value)}
                        placeholder="Search employee..."
                        className="w-full bg-transparent text-xs text-slate-800 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-0.5">
                      {users
                        .filter(u => availableSummaries.some(s => s.employee?._id?.toString() === u._id.toString()))
                        .filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(sumSearchQuery.toLowerCase()))
                        .map(u => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => {
                              setSummaryEmployeeId(u._id);
                              setSumDropdownOpen(false);
                              setSumSearchQuery('');
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                              summaryEmployeeId === u._id ? 'bg-sky-50 text-sky-850 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span>{u.firstName} {u.lastName}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Review Cycle</label>
              <select
                value={summaryCycleId}
                onChange={(e) => setSummaryCycleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-semibold text-slate-700"
              >
                {getFilteredCyclesForSubject(summaryEmployeeId).map(c => {
                  const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                  return (
                    <option key={c._id} value={c._id}>
                      Month: {c.reviewMonth} — Dept: {deptName} ({c.cycleType})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={fetchSummary}
              className="px-6 py-2.5 bg-sky-700 hover:bg-sky-850 text-white font-bold rounded-xl cursor-pointer transition-colors"
            >
              Analyze Summary
            </button>
          </div>

          {/* Results summary matrix */}
          {summaryData && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Category Scores Grid — 3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Peer evaluations */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      👥 Peer Feedback
                    </span>
                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold uppercase">
                      Count: {summaryData.peer?.count || 0}
                    </span>
                  </div>
                  {(!summaryData.peer || summaryData.peer.count === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No peer feedback responses recorded for this cycle.</p>
                  ) : (
                    <div className="space-y-2 text-[11px]">
                      {Object.keys(summaryData.peer.ratings).map(cat => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-slate-600 capitalize">{cat.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-800">{summaryData.peer.ratings[cat]}/5.0</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subordinate evaluations */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      ⬇️ Subordinate Feedback
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">
                      Count: {summaryData.subordinate?.count || 0}
                    </span>
                  </div>
                  {(!summaryData.subordinate || summaryData.subordinate.count === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No subordinate feedback responses recorded for this cycle.</p>
                  ) : (
                    <div className="space-y-2 text-[11px]">
                      {Object.keys(summaryData.subordinate.ratings).map(cat => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-slate-600 capitalize">{cat.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-800">{summaryData.subordinate.ratings[cat]}/5.0</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manager Review evaluations */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      ⬆️ Manager Review
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">
                      Count: {summaryData.manager?.count || 0}
                    </span>
                  </div>
                  {(!summaryData.manager || summaryData.manager.count === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No manager review feedback recorded for this cycle.</p>
                  ) : (
                    <div className="space-y-2 text-[11px]">
                      {Object.keys(summaryData.manager.ratings).map(cat => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-slate-600 capitalize">{cat.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-800">{summaryData.manager.ratings[cat]}/5.0</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Comprehensive 360° Matrix Comparison Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
                    360° Multi-Rater Competency Comparison Matrix
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Target Subject: <span className="font-bold text-slate-800">
                      {users.find(u => u._id === summaryEmployeeId)?.firstName} {users.find(u => u._id === summaryEmployeeId)?.lastName}
                    </span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500">
                        <th className="p-3 pl-4">Competency Category</th>
                        <th className="p-3 text-center">👥 Peer Avg</th>
                        <th className="p-3 text-center">⬇️ Subordinate Avg</th>
                        <th className="p-3 text-center">⬆️ Manager Avg</th>
                        <th className="p-3 pr-4 text-right">Overall 360° Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {['workQuality', 'productivity', 'technical', 'communication', 'ownership', 'learning'].map(cat => {
                        const peerScore = summaryData.peer?.count > 0 ? summaryData.peer.ratings[cat] : null;
                        const subScore = summaryData.subordinate?.count > 0 ? summaryData.subordinate.ratings[cat] : null;
                        const mgrScore = summaryData.manager?.count > 0 ? summaryData.manager.ratings[cat] : null;

                        const validScores = [peerScore, subScore, mgrScore].filter(s => s !== null);
                        const overall = validScores.length > 0
                          ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)
                          : 'N/A';

                        return (
                          <tr key={cat} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 pl-4 font-bold text-slate-800 capitalize">
                              {cat.replace(/([A-Z])/g, ' $1')}
                            </td>
                            <td className="p-3 text-center">
                              {peerScore !== null ? <span className="font-bold text-sky-700">{peerScore} / 5.0</span> : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="p-3 text-center">
                              {subScore !== null ? <span className="font-bold text-indigo-700">{subScore} / 5.0</span> : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="p-3 text-center">
                              {mgrScore !== null ? <span className="font-bold text-emerald-700">{mgrScore} / 5.0</span> : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="p-3 pr-4 text-right">
                              <span className={`font-extrabold text-xs px-2 py-0.5 rounded ${
                                overall !== 'N/A' && parseFloat(overall) >= 4.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {overall !== 'N/A' ? `${overall} / 5.0` : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anonymized Comments Wall */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3">
                <h4 className="font-bold text-slate-750 border-b border-slate-100 pb-2 uppercase tracking-wide text-[10px]">
                  Anonymized Colleague Comments
                </h4>
                {(!summaryData.comments || summaryData.comments.length === 0) ? (
                  <p className="text-slate-400 italic text-xs">No qualitative text comments recorded for this evaluation cycle.</p>
                ) : (
                  <div className="space-y-3">
                    {summaryData.comments.map((comm, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                            comm.relationship === 'manager'
                              ? 'bg-emerald-100 text-emerald-800'
                              : comm.relationship === 'subordinate'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {formatRelationshipLabel(comm.relationship)}
                          </span>
                        </div>
                        <p className="text-slate-700 italic pt-1 leading-normal">"{comm.text}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default FeedbackCenter;
