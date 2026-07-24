import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, CheckCircle2, Award, Calendar, FileText, Download, Plus, Trash2, User, Eye } from 'lucide-react';

const Certifications = () => {
  const { user } = useAuthStore();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [previewDoc, setPreviewDoc] = useState(null);
  // Form State
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState(null);

  // Managers view toggle
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id);
  const [activeCycleExists, setActiveCycleExists] = useState(true);

  const fetchActiveCycleStatus = async () => {
    try {
      const res = await api.get('/api/review-cycles');
      const active = res.data.some(c => c.status === 'active');
      setActiveCycleExists(active);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveCycleStatus();
    fetchCertifications(selectedEmployeeId);
    if (user?.role !== 'employee') {
      fetchUsers();
    }
  }, [selectedEmployeeId]);

  const fetchCertifications = async (empId) => {
    if (!empId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/certifications?employeeId=${empId}`);
      setCerts(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load certifications list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      let allUsers = res.data || [];

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !issuer || !issueDate || !file) {
      setError('Please fill in all fields and select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('issuer', issuer);
    formData.append('issueDate', issueDate);
    formData.append('expiryDate', expiryDate);
    formData.append('employeeId', selectedEmployeeId);
    formData.append('file', file);

    try {
      setLoading(true);
      await api.post('/api/certifications/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Certification successfully registered!');
      setName('');
      setIssuer('');
      setIssueDate('');
      setExpiryDate('');
      setFile(null);
      // Reset input element
      document.getElementById('certFileField').value = '';
      fetchCertifications(selectedEmployeeId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const [certSearch, setCertSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredCerts = certs.filter(c => {
    const term = certSearch.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.issuer.toLowerCase().includes(term);
  });

  const selectedUserObj = users.find(u => u._id === selectedEmployeeId) || (selectedEmployeeId === user?.id ? user : null);
  const totalCertsCount = certs.length;
  const activeIssuersCount = new Set(certs.map(c => c.issuer)).size;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30 tracking-wider">
                Credentials Vault
              </span>
              {selectedUserObj && (
                <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  Staff: {selectedUserObj.firstName} {selectedUserObj.lastName} ({selectedUserObj.role?.toUpperCase()})
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Professional Credentials & Certifications Vault
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Enterprise skill accreditations, verified license credentials, & manager validation desk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Staff Selector */}
            {user?.role !== 'employee' && (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 p-2 px-3 rounded-2xl text-xs font-bold text-white shadow-md">
                <User size={14} className="text-sky-400" />
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Staff:</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="bg-transparent font-extrabold text-sky-200 outline-none cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u._id} value={u._id} className="bg-slate-900 text-white">
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>Upload Certificate</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Credentials</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalCertsCount}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Registered records</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Award size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Issuing Bodies</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{activeIssuersCount}</h2>
              <span className="text-[9px] text-indigo-400 font-medium">Accredited institutions</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <FileText size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Verification Status</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">Verified</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Manager confirmed</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">License Validity</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">Active</h2>
              <span className="text-[9px] text-amber-400 font-medium">Current credentials</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Calendar size={20} />
            </div>
          </div>
        </div>
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

      {/* Roster & Search */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>Verified Certificate Registry</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                {filteredCerts.length} Certificates
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-64">
            <FileText size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search certification name or issuer..."
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none w-full"
            />
          </div>
        </div>

        {filteredCerts.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
            <Award className="mx-auto text-slate-300" size={36} />
            <p className="text-slate-500 font-bold text-xs">No professional certifications found matching your query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCerts.map((c) => (
              <div key={c._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-colors space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                      <Award size={20} />
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified Active
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-800 text-sm leading-snug">{c.name}</h4>
                    <p className="text-[11px] font-bold text-sky-700 mt-0.5">Issuer: {c.issuer}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200/80 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Issue Date:</span>
                    <span className="font-bold text-slate-700">{new Date(c.issueDate).toLocaleDateString()}</span>
                  </div>
                  {c.expiryDate && (
                    <div className="flex justify-between text-slate-500">
                      <span>Expiry Date:</span>
                      <span className="font-bold text-slate-700">{new Date(c.expiryDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {c.fileUrl && (
                    <button
                      onClick={() => setPreviewDoc({ fileName: c.name, fileUrl: c.fileUrl })}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-xs text-sky-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>Preview Document Proof</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Certificate Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Register New Professional Certificate</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={(e) => { handleUploadSubmit(e); setShowUploadModal(false); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Certification Title *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Issuing Institution / Body *</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="e.g. Amazon Web Services, Microsoft, PMI..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Issue Date *</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Upload PDF Document Proof *</label>
                <input
                  id="certFileField"
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-700 file:bg-sky-100 file:border-0 file:rounded-lg file:px-3 file:py-1 file:text-xs file:font-bold file:text-sky-800 cursor-pointer"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-850 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Upload & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm truncate pr-4">
                {previewDoc.fileName}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-150 rounded-xl overflow-hidden relative">
              {previewDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${previewDoc.fileUrl}`}
                  className="w-full h-full border-0"
                  title={previewDoc.fileName}
                />
              ) : (
                <div className="w-full h-full flex justify-center items-center overflow-auto p-4">
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${previewDoc.fileUrl}`}
                    alt={previewDoc.fileName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certifications;
