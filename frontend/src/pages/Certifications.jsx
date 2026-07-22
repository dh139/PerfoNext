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

  useEffect(() => {
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
      setUsers(res.data);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs text-slate-800">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Certifications & Achievements</h2>
          <p className="text-slate-400 mt-0.5">Manage professional training records, certificates, and credentials</p>
        </div>

        {user?.role !== 'employee' && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
            <User size={14} className="text-slate-400" />
            <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Select Staff:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role})</option>
              ))}
            </select>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload form - only editable by employee for themselves, or HR/Admin */}
        {(selectedEmployeeId === user?.id || user?.role === 'hr' || user?.role === 'admin') && (
          <form onSubmit={handleUploadSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 h-fit">
            <div className="flex items-center gap-2 border-b pb-2">
              <Plus size={16} className="text-slate-400" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Register Certificate</h3>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Certificate Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AWS Solutions Architect Associate"
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Issuing Authority</label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Amazon Web Services, Scrum Alliance"
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Upload Credential Document (PDF/Image)</label>
              <input
                id="certFileField"
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-slate-500 text-[10px] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-700 hover:bg-sky-850 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-md transition-colors mt-6 uppercase text-[10px]"
            >
              Upload Credential
            </button>
          </form>
        )}

        {/* Certifications Display Grid (Right 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          {certs.length === 0 ? (
            <div className="py-12 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <Award className="mx-auto text-slate-350 mb-2" size={32} />
              <p className="text-slate-400">No registered certifications recorded for this employee.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certs.map(cert => (
                <div key={cert._id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                        <Award size={18} />
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPreviewDoc({ fileName: cert.name, fileUrl: cert.fileUrl })}
                          className="p-1.5 bg-sky-50 text-sky-600 hover:text-sky-850 rounded-lg border border-sky-100 cursor-pointer"
                          title="Preview Certificate"
                        >
                          <Eye size={14} />
                        </button>
                        <a
                          href={cert.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-100 cursor-pointer"
                          title="Download Certificate"
                          download
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-[12px]">{cert.name}</h4>
                      <p className="text-slate-400 font-semibold text-[10px] mt-0.5">{cert.issuer}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                    </div>
                    {cert.expiryDate ? (
                      <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold uppercase tracking-wider">Lifetime</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

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
