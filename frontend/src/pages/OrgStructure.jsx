import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Plus, Edit2, Layers, Trash2 } from 'lucide-react';
import useAuthStore from '../store/authStore';

const OrgStructure = () => {
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleDeleteDept = async (id, name) => {
    if (window.confirm(`WARNING: Deleting the department '${name}' will also PERMANENTLY DELETE all employees/users associated with this department. Do you wish to proceed?`)) {
      try {
        setError('');
        const res = await api.delete(`/api/departments/${id}`);
        alert(res.data.message || 'Department deleted successfully.');
        fetchData();
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to delete department.');
      }
    }
  };

  // Department creation state
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Designation creation state
  const [desName, setDesName] = useState('');
  const [desDeptId, setDesDeptId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const deptRes = await api.get('/api/departments');
      setDepartments(deptRes.data);

      const desRes = await api.get('/api/designations');
      setDesignations(desRes.data);
      if (deptRes.data.length > 0) setDesDeptId(deptRes.data[0]._id);
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
      await api.post('/api/departments', {
        departmentName: deptName.trim(),
        description: deptDesc.trim(),
        status: 'active'
      });
      setDeptName('');
      setDeptDesc('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create department.');
    }
  };

  const handleCreateDes = async (e) => {
    e.preventDefault();
    if (!desName.trim() || !desDeptId) return;

    try {
      setError('');
      await api.post('/api/designations', {
        designationName: desName.trim(),
        departmentId: desDeptId,
        status: 'active'
      });
      setDesName('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create designation.');
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
    <div className="max-w-5xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
        {/* Department Panel */}
        <div className="space-y-6">
          {/* Creator Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers size={16} className="text-sky-700" />
              <span>Register Department</span>
            </h3>
            
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Department Name</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Quality Assurance"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800"
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
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-650 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-700 hover:bg-sky-850 text-white font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-md transition-colors"
              >
                Create Department
              </button>
            </form>
          </div>

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
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteDept(d._id, d.departmentName)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer border border-rose-100"
                        title="Delete Department & Cascade Employees"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {d.description && <p className="text-[10px] text-slate-500 mt-1">{d.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Designation Panel */}
        <div className="space-y-6">
          {/* Creator Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers size={16} className="text-sky-700" />
              <span>Register Designation Role</span>
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
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Link Department</label>
                  <select
                    value={desDeptId}
                    onChange={(e) => setDesDeptId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700"
                    required
                  >
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-sky-700 hover:bg-sky-855 text-white font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-md transition-colors"
              >
                Create Designation
              </button>
            </form>
          </div>

          {/* List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Designations Catalog</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {designations.map(d => (
                <div key={d._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">{d.designationName}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Dept: {d.departmentId?.departmentName || 'Unknown'}</p>
                  </div>
                  <span className="text-[9px] uppercase font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgStructure;
