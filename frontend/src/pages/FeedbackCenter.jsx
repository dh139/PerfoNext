import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Calendar, MessageSquare, Send, CheckCircle2, User, Users, Star, ArrowUpRight, Search } from 'lucide-react';

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

  // Searchable dropdown states
  const [subjDropdownOpen, setSubjDropdownOpen] = useState(false);
  const [subjSearchQuery, setSubjSearchQuery] = useState('');
  const [revDropdownOpen, setRevDropdownOpen] = useState(false);
  const [revSearchQuery, setRevSearchQuery] = useState('');
  const [sumDropdownOpen, setSumDropdownOpen] = useState(false);
  const [sumSearchQuery, setSumSearchQuery] = useState('');

  useEffect(() => {
    fetchPendingRequests();
    fetchMetadata();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/feedback/requests?status=pending');
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
      const usersRes = await api.get('/api/users');
      setUsers(usersRes.data);
      if (usersRes.data.length > 0) {
        setRequestForm(prev => ({
          ...prev,
          employeeId: usersRes.data[0]._id,
          reviewerId: usersRes.data[0]._id
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
    <div className="max-w-4xl mx-auto space-y-6 text-xs text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">360° & Peer Feedback</h2>
          <p className="text-slate-400 mt-0.5">Disburse anonymous evaluation surveys to colleagues, peers, and subordinates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => { setActiveTab('pending'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 font-bold cursor-pointer border-b-2 transition-all ${
            activeTab === 'pending' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-850'
          }`}
        >
          My Pending Reviews ({pendingRequests.length})
        </button>

        {user?.role !== 'employee' && (
          <>
            <button
              onClick={() => { setActiveTab('request'); setError(''); setSuccess(''); }}
              className={`px-4 py-2 font-bold cursor-pointer border-b-2 transition-all ${
                activeTab === 'request' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              Request Feedback
            </button>
            <button
              onClick={() => { setActiveTab('summary'); setError(''); setSuccess(''); }}
              className={`px-4 py-2 font-bold cursor-pointer border-b-2 transition-all ${
                activeTab === 'summary' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              Anonymized Summaries
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
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
                  Relationship Category: {activeRequest.relationship}
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
                    <span className="font-bold text-slate-655">Learning Adaptability</span>
                    {renderRatingStars('learning', ratings.learning)}
                  </div>
                </div>

              </div>

              {/* Written feedback comment */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Written Justification Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  placeholder="Provide constructive feedback, key accomplishments, or areas of development..."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-sky-500 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl cursor-pointer"
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
                          Cycle Month: {req.cycleId.reviewMonth} | Relationship category: <span className="font-semibold text-slate-655">{req.relationship}</span>
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
        <form onSubmit={handleRequestSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">Disburse Colleague Survey</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Subject employee */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Review Subject Employee</label>
              <button
                type="button"
                onClick={() => setSubjDropdownOpen(!subjDropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer"
              >
                <span>
                  {(() => {
                    const selected = users.find(u => u._id === requestForm.employeeId);
                    return selected ? `${selected.firstName} ${selected.lastName} (${selected.role.toUpperCase()})` : 'Select Subject...';
                  })()}
                </span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {subjDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setSubjDropdownOpen(false); setSubjSearchQuery(''); }} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-2 space-y-2 max-h-60 overflow-y-auto animate-fade-in">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        value={subjSearchQuery}
                        onChange={(e) => setSubjSearchQuery(e.target.value)}
                        placeholder="Search employee..."
                        className="w-full bg-transparent text-xs text-slate-800 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-0.5">
                      {users.filter(u => `${u.firstName} ${u.lastName} ${u.role}`.toLowerCase().includes(subjSearchQuery.toLowerCase())).map(u => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            setRequestForm(prev => ({ ...prev, employeeId: u._id }));
                            setSubjDropdownOpen(false);
                            setSubjSearchQuery('');
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                            requestForm.employeeId === u._id ? 'bg-sky-50 text-sky-850 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span>{u.firstName} {u.lastName}</span>
                          <span className="text-[8px] font-extrabold uppercase px-1 rounded bg-slate-100 text-slate-500">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Colleague Reviewer */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assigned Peer/Subordinate Reviewer</label>
              <button
                type="button"
                onClick={() => setRevDropdownOpen(!revDropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer"
              >
                <span>
                  {(() => {
                    const selected = users.find(u => u._id === requestForm.reviewerId);
                    return selected ? `${selected.firstName} ${selected.lastName} (${selected.role.toUpperCase()})` : 'Select Reviewer...';
                  })()}
                </span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {revDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setRevDropdownOpen(false); setRevSearchQuery(''); }} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-2 space-y-2 max-h-60 overflow-y-auto animate-fade-in">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        value={revSearchQuery}
                        onChange={(e) => setRevSearchQuery(e.target.value)}
                        placeholder="Search reviewer..."
                        className="w-full bg-transparent text-xs text-slate-800 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-0.5">
                      {users.filter(u => `${u.firstName} ${u.lastName} ${u.role}`.toLowerCase().includes(revSearchQuery.toLowerCase())).map(u => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            setRequestForm(prev => ({ ...prev, reviewerId: u._id }));
                            setRevDropdownOpen(false);
                            setRevSearchQuery('');
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                            requestForm.reviewerId === u._id ? 'bg-sky-50 text-sky-850 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span>{u.firstName} {u.lastName}</span>
                          <span className="text-[8px] font-extrabold uppercase px-1 rounded bg-slate-100 text-slate-500">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Relationship Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Colleague Relationship</label>
              <select
                value={requestForm.relationship}
                onChange={(e) => setRequestForm({ ...requestForm, relationship: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-indigo-700"
                required
              >
                <option value="peer">Peer (Same tier)</option>
                <option value="subordinate">Subordinate (Reporting staff)</option>
                <option value="manager">Manager (Advisory check)</option>
              </select>
            </div>

            {/* Active Cycle */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Performance Review Cycle</label>
              <select
                value={requestForm.cycleId}
                onChange={(e) => setRequestForm({ ...requestForm, cycleId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-semibold text-slate-700"
                required
              >
                {cycles.map(c => {
                  const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                  return (
                    <option key={c._id} value={c._id}>
                      Month: {c.reviewMonth} — Dept: {deptName} ({c.cycleType})
                    </option>
                  );
                })}
              </select>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 hover:bg-sky-850 text-white font-bold py-3 px-4 rounded-xl cursor-pointer shadow-md transition-colors mt-6 uppercase text-[10px]"
          >
            Launch Feedback Request
          </button>
        </form>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
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
                      {users.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(sumSearchQuery.toLowerCase())).map(u => (
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
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none"
              >
                {cycles.map(c => {
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
              className="px-6 py-2.5 bg-sky-700 hover:bg-sky-850 text-white font-bold rounded-xl cursor-pointer"
            >
              Analyze Summary
            </button>
          </div>

          {/* Results summary matrix */}
          {summaryData && (
            <div className="space-y-6">
              
              {/* Category Scores Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Peer evaluations */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-bold text-sm text-slate-700">Peer Feedback</span>
                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold uppercase">
                      Count: {summaryData.peer.count}
                    </span>
                  </div>
                  {summaryData.peer.count === 0 ? (
                    <p className="text-slate-400 italic">No peer feedback responses recorded for this cycle.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.keys(summaryData.peer.ratings).map(cat => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-slate-655 capitalize">{cat.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-800">{summaryData.peer.ratings[cat]}/5.0</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subordinate evaluations */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-bold text-sm text-slate-700">Subordinate Feedback</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">
                      Count: {summaryData.subordinate.count}
                    </span>
                  </div>
                  {summaryData.subordinate.count === 0 ? (
                    <p className="text-slate-400 italic">No subordinate feedback responses recorded for this cycle.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.keys(summaryData.subordinate.ratings).map(cat => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-slate-655 capitalize">{cat.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-800">{summaryData.subordinate.ratings[cat]}/5.0</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Anonymized Comments Wall */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3">
                <h4 className="font-bold text-slate-750 border-b pb-2 uppercase tracking-wide text-[10px]">Anonymized Colleague Comments</h4>
                {summaryData.comments.length === 0 ? (
                  <p className="text-slate-400 italic">No text comments recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {summaryData.comments.map((comm, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl relative">
                        <span className="absolute top-2 right-3 text-[8px] uppercase tracking-wider font-bold text-slate-400">
                          {comm.relationship} review
                        </span>
                        <p className="text-slate-655 italic pt-1 leading-normal">"{comm.text}"</p>
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
