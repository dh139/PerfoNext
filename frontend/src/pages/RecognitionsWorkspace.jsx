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

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [category, setCategory] = useState('Star Performer');
  const [comments, setComments] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const recRes = await api.get('/api/recognitions');
      setRecognitions(recRes.data);

      if (user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') {
        const empRes = await api.get('/api/users?role=employee');
        setEmployees(empRes.data);
        if (empRes.data.length > 0) setEmployeeId(empRes.data[0]._id);

        const cycleRes = await api.get('/api/review-cycles');
        setCycles(cycleRes.data);
        if (cycleRes.data.length > 0) setCycleId(cycleRes.data[0]._id);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recognition Awards Wall</h2>
          <p className="text-xs text-slate-500 mt-1">Celebrate team milestones, awards, and star performance accolades</p>
        </div>
        
        {(user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-850 text-white font-semibold px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-colors"
          >
            <Plus size={16} />
            <span>Award Recognition</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Awards wall Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recognitions.map(rec => (
          <div key={rec._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-350 hover:shadow-md transition-all relative overflow-hidden">
            {/* Decors glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                  <Award size={20} className="animate-spin-slow" />
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {rec.category}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {rec.employeeId?.firstName} {rec.employeeId?.lastName}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Code: {rec.employeeId?.employeeCode}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-slate-600 leading-normal">
                "{rec.comments}"
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
              <span>Awarded by: {rec.awardedBy?.firstName} {rec.awardedBy?.lastName}</span>
              <span>{new Date(rec.awardedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Award Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-800 text-sm">Award Performance Accolade</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold font-sans">Close</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700"
                  required
                >
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Award Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-750 font-bold"
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Associated Review Cycle (Optional)</label>
                  <select
                    value={cycleId}
                    onChange={(e) => setCycleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-700"
                  >
                    <option value="">No cycle linked (Org level)</option>
                    {cycles.map(c => (
                      <option key={c._id} value={c._id}>Month: {c.reviewMonth}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Award Citation / Comments</label>
                <textarea
                  rows="3"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why this employee deserves this accolade..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-800 text-white font-semibold px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Award Accolade
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
