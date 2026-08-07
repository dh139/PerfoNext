import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AlertCircle, Plus, Edit2, Layers, Trash2, ChevronLeft } from 'lucide-react';
import useAuthStore from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from '../store/toastStore';

const OrgStructure = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [editingDept, setEditingDept] = useState(null);
  const [editingDes, setEditingDes] = useState(null);

  // Deletion pending state
  const [pendingDeleteDept, setPendingDeleteDept] = useState(null);
  const [pendingDeleteDesg, setPendingDeleteDesg] = useState(null);

  // Department creation/edit input state
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Designation creation/edit input state
  const [desName, setDesName] = useState('');
  const [desDeptId, setDesDeptId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const deptRes = await api.get('/api/departments');
      setDepartments(deptRes.data || []);

      const desRes = await api.get('/api/designations');
      setDesignations(desRes.data || []);
      
      if (deptRes.data && deptRes.data.length > 0 && !desDeptId) {
        setDesDeptId(deptRes.data[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch department structure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    try {
      setError('');
      if (editingDept) {
        await api.patch(`/api/departments/${editingDept._id}`, {
          departmentName: deptName.trim(),
          description: deptDesc.trim()
        });
        toast.success('Department updated successfully.');
        setEditingDept(null);
      } else {
        await api.post('/api/departments', {
          departmentName: deptName.trim(),
          description: deptDesc.trim(),
          status: 'active'
        });
        toast.success('Department created successfully.');
      }
      setDeptName('');
      setDeptDesc('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save department.');
    }
  };

  const handleCreateDes = async (e) => {
    e.preventDefault();
    if (!desName.trim() || !desDeptId) return;

    try {
      setError('');
      if (editingDes) {
        await api.patch(`/api/designations/${editingDes._id}`, {
          designationName: desName.trim(),
          departmentId: desDeptId
        });
        toast.success('Designation updated successfully.');
        setEditingDes(null);
      } else {
        await api.post('/api/designations', {
          designationName: desName.trim(),
          departmentId: desDeptId,
          status: 'active'
        });
        toast.success('Designation created successfully.');
      }
      setDesName('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save designation.');
    }
  };

  const handleDeleteDept = (id, name) => {
    setPendingDeleteDept({ id, name });
  };

  const confirmDeleteDept = async () => {
    if (!pendingDeleteDept) return;
    const { id } = pendingDeleteDept;
    setPendingDeleteDept(null);
    try {
      setError('');
      const res = await api.delete(`/api/departments/${id}`);
      toast.success(res.data.message || 'Department deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete department.');
    }
  };

  const handleDeleteDesg = (id, name) => {
    setPendingDeleteDesg({ id, name });
  };

  const confirmDeleteDesg = async () => {
    if (!pendingDeleteDesg) return;
    const { id } = pendingDeleteDesg;
    setPendingDeleteDesg(null);
    try {
      setError('');
      const res = await api.delete(`/api/designations/${id}`);
      toast.success(res.data.message || 'Designation deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete designation.');
    }
  };

  const startEditDept = (dept) => {
    setEditingDept(dept);
    setDeptName(dept.departmentName);
    setDeptDesc(dept.description || '');
  };

  const startEditDes = (desg) => {
    setEditingDes(desg);
    setDesName(desg.designationName);
    setDesDeptId(desg.departmentId?._id || desg.departmentId || '');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-655 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer border border-slate-200/60 uppercase tracking-wider w-fit"
      >
        <ChevronLeft size={12} />
        <span>Back to Settings</span>
      </button>
      
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
        {/* Department Panel */}
        <div className="space-y-6">
          {/* Creator/Editor Form */}
          {['admin', 'hr', 'executive'].includes(user?.role) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-sky-700" />
                <span>{editingDept ? 'Edit Department' : 'Register Department'}</span>
              </h3>
              
              <form onSubmit={handleCreateDept} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Department Name</label>
                  <input
                    type="text"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Quality Assurance"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    rows="2"
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Summarize functions..."
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-650 resize-none font-semibold"
                  />
                </div>

                {editingDept ? (
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDept(null);
                        setDeptName('');
                        setDeptDesc('');
                      }}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold py-2 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold py-2.5 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Create Department
                  </button>
                )}
              </form>
            </div>
          )}

          {/* List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Active Departments</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {departments.map(d => (
                <div key={d._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">{d.departmentName}</span>
                      <span className="text-[9px] uppercase font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 ml-2">{d.status}</span>
                    </div>
                    {['admin', 'hr', 'executive'].includes(user?.role) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditDept(d)}
                          className="text-sky-600 hover:text-sky-850 p-1.5 rounded hover:bg-sky-50 transition-colors cursor-pointer border border-sky-100 bg-white shadow-2xs"
                          title="Edit Department"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(d._id, d.departmentName)}
                          className="text-rose-600 hover:text-rose-800 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer border border-rose-100 bg-white shadow-2xs"
                          title="Delete Department & Cascade Employees"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                  {d.description && <p className="text-[10px] text-slate-500 mt-1 font-semibold">{d.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Designation Panel */}
        <div className="space-y-6">
          {/* Creator/Editor Form */}
          {['admin', 'hr', 'executive'].includes(user?.role) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-sky-700" />
                <span>{editingDes ? 'Edit Designation Role' : 'Register Designation Role'}</span>
              </h3>

              <form onSubmit={handleCreateDes} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Designation Title</label>
                    <input
                      type="text"
                      value={desName}
                      onChange={(e) => setDesName(e.target.value)}
                      placeholder="e.g. Lead QA Engineer"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Link Department</label>
                    <select
                      value={desDeptId}
                      onChange={(e) => setDesDeptId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-bold cursor-pointer"
                      required
                    >
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {editingDes ? (
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDes(null);
                        setDesName('');
                      }}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold py-2 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold py-2.5 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Create Designation
                  </button>
                )}
              </form>
            </div>
          )}

          {/* List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Designations Catalog</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {designations.map(d => (
                <div key={d._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">{d.designationName}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">Dept: {d.departmentId?.departmentName || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{d.status}</span>
                    {['admin', 'hr', 'executive'].includes(user?.role) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditDes(d)}
                          className="text-sky-600 hover:text-sky-850 p-1.5 rounded hover:bg-sky-50 transition-colors cursor-pointer border border-sky-100 bg-white shadow-2xs"
                          title="Edit Designation"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteDesg(d._id, d.designationName)}
                          className="text-rose-600 hover:text-rose-800 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer border border-rose-100 bg-white shadow-2xs"
                          title="Delete Designation Role"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDeleteDept}
        title="Delete department?"
        message={pendingDeleteDept ? `Delete the department '${pendingDeleteDept.name}'? This is only allowed while no employees are assigned to it — reassign or remove them first if this fails.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteDept}
        onCancel={() => setPendingDeleteDept(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteDesg}
        title="Delete Designation Role?"
        message={pendingDeleteDesg ? `Delete the designation role '${pendingDeleteDesg.name}'? This is only allowed while no employees are assigned to it — reassign or remove them first if this fails.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteDesg}
        onCancel={() => setPendingDeleteDesg(null)}
      />
    </div>
  );
};

export default OrgStructure;
