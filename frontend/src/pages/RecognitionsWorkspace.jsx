import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Plus, Award, Calendar, MessageSquare } from 'lucide-react';
import { toast } from '../store/toastStore';

const RecognitionsWorkspace = () => {
  const { user } = useAuthStore();
  const [recognitions, setRecognitions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCycleExists, setActiveCycleExists] = useState(true);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [category, setCategory] = useState('Star Performer');
  const [comments, setComments] = useState('');

  // Filter states (Must be declared at top level)
  const [awardCategoryFilter, setAwardCategoryFilter] = useState('all');
  const [awardSearchTerm, setAwardSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const recRes = await api.get('/api/recognitions');
      setRecognitions(recRes.data);

      const cycleRes = await api.get('/api/review-cycles');
      setCycles(cycleRes.data);
      const active = cycleRes.data.some(c => c.status === 'active');
      setActiveCycleExists(active);

      if (user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') {
        const empRes = await api.get('/api/users?role=employee');
        let empData = empRes.data || [];

        if (user?.role === 'manager') {
          const mgrDeptId = user?.departmentId?._id || user?.departmentId;
          empData = empData.filter(u => {
            const uDeptId = u.departmentId?._id || u.departmentId;
            return uDeptId && mgrDeptId && uDeptId.toString() === mgrDeptId.toString();
          });
        }

        setEmployees(empData);
        if (empData.length > 0) setEmployeeId(empData[0]._id);

        if (cycleRes.data.length > 0) {
          const activeCycle = cycleRes.data.find(c => c.status === 'active');
          setCycleId(activeCycle ? activeCycle._id : cycleRes.data[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load awards records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId || !category || !comments.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      await api.post('/api/recognitions', {
        employeeId,
        cycleId: cycleId || null,
        category,
        comments
      });

      setShowCreateModal(false);
      setComments('');
      fetchData();
      toast.success('Recognition award granted successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to award recognition.');
    }
  };

  const filteredRecognitions = recognitions.filter(rec => {
    const fullName = `${rec.employeeId?.firstName} ${rec.employeeId?.lastName} ${rec.employeeId?.employeeCode}`.toLowerCase();
    const commentText = (rec.comments || '').toLowerCase();
    const matchesSearch = fullName.includes(awardSearchTerm.toLowerCase()) || commentText.includes(awardSearchTerm.toLowerCase());
    const matchesCat = awardCategoryFilter === 'all' || rec.category === awardCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalAwardsCount = recognitions.length;
  const starPerformersCount = recognitions.filter(r => r.category === 'Star Performer').length;
  const customerChampionsCount = recognitions.filter(r => r.category === 'Customer Champion').length;
  const learningSpiritCount = recognitions.filter(r => r.category === 'Learning Spirit Award').length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-bold">Loading recognition wall...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-400/30 tracking-wider">
                Accolades Wall
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Enterprise Recognition & Accolades Wall
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Celebrate team milestones, star performance accolades, & peer appreciation wall.
            </p>
          </div>

          {(user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') && (
            <button
              onClick={() => {
                if (!activeCycleExists) return;
                setShowCreateModal(true);
              }}
              disabled={!activeCycleExists}
              className={`flex items-center gap-1.5 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer ${
                activeCycleExists ? 'bg-amber-400 hover:bg-amber-300 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Plus size={18} />
              <span>Grant Recognition Award</span>
            </button>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Accolades</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalAwardsCount}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Granted awards</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Award size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Star Performers</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{starPerformersCount}</h2>
              <span className="text-[9px] text-sky-400 font-medium">High impact awards</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Award size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Customer Champions</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{customerChampionsCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Client excellence</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Award size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Learning Spirit</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{learningSpiritCount}</h2>
              <span className="text-[9px] text-indigo-400 font-medium">Growth mindset</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Award size={20} />
            </div>
          </div>
        </div>
      </div>

      {!activeCycleExists && (user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>Awards cannot be granted because there is no active review cycle at this time.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Awards Wall Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>Recognition Honors & Citations</span>
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                {filteredRecognitions.length} Accolades
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={awardCategoryFilter}
              onChange={(e) => setAwardCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Award Categories</option>
              <option value="Star Performer">Star Performer</option>
              <option value="Collaborator of the Month">Collaborator of the Month</option>
              <option value="Customer Champion">Customer Champion</option>
              <option value="Outstanding Leadership">Outstanding Leadership</option>
              <option value="Learning Spirit Award">Learning Spirit Award</option>
            </select>

            <input
              type="text"
              placeholder="Search nominee or comments..."
              value={awardSearchTerm}
              onChange={(e) => setAwardSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none w-full sm:w-56 font-medium"
            />
          </div>
        </div>

        {filteredRecognitions.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
            <Award className="mx-auto text-slate-300" size={36} />
            <p className="text-slate-500 font-bold text-xs">No recognition awards found matching your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecognitions.map(rec => (
              <div key={rec._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition-all relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-700 border border-amber-200/60 shadow-xs">
                      <Award size={22} />
                    </div>
                    <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200/80 shadow-xs tracking-wider">
                      {rec.category}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {rec.employeeId?.firstName} {rec.employeeId?.lastName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {rec.employeeId?.employeeCode}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 italic text-slate-700 text-xs leading-relaxed shadow-3xs">
                    "{rec.comments}"
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>Awarded by: <strong className="text-slate-700">{rec.awardedBy?.firstName} {rec.awardedBy?.lastName}</strong></span>
                  <span>{new Date(rec.awardedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Award Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Grant Performance Accolade</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Recognized Staff Member *</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                  required
                >
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Award Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold cursor-pointer"
                    required
                  >
                    <option value="Star Performer">Star Performer</option>
                    <option value="Collaborator of the Month">Collaborator of the Month</option>
                    <option value="Customer Champion">Customer Champion</option>
                    <option value="Outstanding Leadership">Outstanding Leadership</option>
                    <option value="Learning Spirit Award">Learning Spirit Award</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Review Cycle (Optional)</label>
                  <select
                    value={cycleId}
                    onChange={(e) => setCycleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">No cycle (Org Level)</option>
                    {cycles.map(c => {
                      const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Depts';
                      return (
                        <option key={c._id} value={c._id}>
                          {c.reviewMonth} — {deptName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Award Citation / Comments *</label>
                <textarea
                  rows="3"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why this employee deserves this recognition award..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 resize-none font-medium"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Grant Accolade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecognitionsWorkspace;
