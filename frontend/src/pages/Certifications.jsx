import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, CheckCircle2, Award, Calendar, FileText, Download, Plus, Trash2, User, Eye, RefreshCw, Edit3 } from 'lucide-react';
import { toast } from '../store/toastStore';
import { getUserAvatarUrl } from '../utils/avatar';
import TablePagination from '../components/TablePagination';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

const Certifications = () => {
  const { user } = useAuthStore();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [previewDoc, setPreviewDoc] = useState(null);
  // Form State
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState(null);

  // Edit State
  const [editingCert, setEditingCert] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIssuer, setEditIssuer] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Managers view toggle
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id);
  const [activeCycleExists, setActiveCycleExists] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('all');

  const fetchActiveCycleStatus = async (empId, currentUsersList) => {
    try {
      const res = await api.get('/api/review-cycles');
      const cycles = res.data || [];

      // Find the target employee object
      const targetEmpId = empId || selectedEmployeeId || user?.id;
      let targetUserObj = (currentUsersList || users).find(u => (u._id || u.id) === targetEmpId);
      if (!targetUserObj && (targetEmpId === user?.id || targetEmpId === user?._id)) {
        targetUserObj = user;
      }

      const activeCycles = cycles.filter(c => 
        c.status === 'active' || 
        c.unlockedUserIds?.some(un => (un._id || un).toString() === targetEmpId?.toString())
      );

      if (activeCycles.length === 0) {
        setActiveCycleExists(false);
        return;
      }

      if (!targetUserObj) {
        setActiveCycleExists(true);
        return;
      }

      const userDeptId = targetUserObj.departmentId?._id
        ? targetUserObj.departmentId._id.toString()
        : targetUserObj.departmentId
        ? targetUserObj.departmentId.toString()
        : null;
      const userRole = targetUserObj.role;

      const isTargetCycleActive = activeCycles.some(c => {
        const cycleDeptId = c.kpiTemplateId?.departmentId
          ? (c.kpiTemplateId.departmentId._id || c.kpiTemplateId.departmentId).toString()
          : null;
        const templateName = (c.kpiTemplateId?.templateName || '').toLowerCase();
        const isGeneralTemplate = !cycleDeptId || templateName.includes('general');

        const deptMatches = isGeneralTemplate || (userDeptId && cycleDeptId === userDeptId);

        let roleMatches = true;
        if (c.targetRole === 'manager') {
          roleMatches = userRole === 'manager' || userRole === 'hr';
        } else if (c.targetRole === 'employee') {
          roleMatches = userRole === 'employee';
        }

        return deptMatches && roleMatches;
      });

      setActiveCycleExists(isTargetCycleActive);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCertifications(selectedEmployeeId);
    if (user?.role !== 'employee') {
      fetchUsers();
    } else {
      fetchActiveCycleStatus(selectedEmployeeId, [user]);
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
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/departments')
      ]);
      let allUsers = usersRes.data || [];
      setDepartments(deptsRes.data || []);

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
      fetchActiveCycleStatus(selectedEmployeeId, allUsers);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !issuer || !issueDate || !file) {
      setError('Please fill in all required fields and select a file.');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg'].includes(ext)) {
      const msg = 'Invalid file format. Only JPG, JPEG, and PDF documents are allowed.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const isDuplicate = certs.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (isDuplicate) {
      const msg = `A certification titled "${name.trim()}" is already registered. Duplicate certificate titles are not allowed.`;
      setError(msg);
      toast.error(msg);
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
      setUploading(true);
      await api.post('/api/certifications/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Certification successfully registered!');
      toast.success('Professional certification uploaded successfully!');
      setName('');
      setIssuer('');
      setIssueDate('');
      setExpiryDate('');
      setFile(null);
      // Reset input element safely
      const fileField = document.getElementById('certFileField');
      if (fileField) fileField.value = '';
      setShowUploadModal(false);
      fetchCertifications(selectedEmployeeId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Upload failed.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (cert) => {
    setEditingCert(cert);
    setEditName(cert.name || '');
    setEditIssuer(cert.issuer || '');
    setEditIssueDate(cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : '');
    setEditExpiryDate(cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : '');
    setEditFile(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editName || !editIssuer || !editIssueDate) {
      const msg = 'Please fill in all required fields.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (editFile) {
      const ext = editFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'jpg', 'jpeg'].includes(ext)) {
        const msg = 'Invalid file format. Only JPG, JPEG, and PDF documents are allowed.';
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    const isDuplicate = certs.some(
      c => c._id !== editingCert._id && c.name.trim().toLowerCase() === editName.trim().toLowerCase()
    );
    if (isDuplicate) {
      const msg = `A certification titled "${editName.trim()}" is already registered. Duplicate certificate titles are not allowed.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    const formData = new FormData();
    formData.append('name', editName);
    formData.append('issuer', editIssuer);
    formData.append('issueDate', editIssueDate);
    formData.append('expiryDate', editExpiryDate || '');
    if (editFile) {
      formData.append('file', editFile);
    }

    try {
      setUpdating(true);
      await api.patch(`/api/certifications/${editingCert._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Certification updated successfully!');
      toast.success('Certification details updated successfully!');
      setEditingCert(null);
      fetchCertifications(selectedEmployeeId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Update failed.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setUpdating(false);
    }
  };

  const [certSearch, setCertSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 10;

  const filteredCerts = certs.filter(c => {
    const term = certSearch.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.issuer.toLowerCase().includes(term);
  });

  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const code = (u.employeeCode || '').toLowerCase();
    const dept = (u.departmentId?.departmentName || '').toLowerCase();
    const matchesSearch = fullName.includes(term) || code.includes(term) || dept.includes(term);

    const deptId = u.departmentId?._id || u.departmentId;
    const matchesDept = userDeptFilter === 'all' || (deptId && deptId.toString() === userDeptFilter.toString());

    return matchesSearch && matchesDept;
  });

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  const safeUserPage = Math.min(userPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice((safeUserPage - 1) * USER_PAGE_SIZE, safeUserPage * USER_PAGE_SIZE);

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


            <button
              disabled={!activeCycleExists}
              onClick={() => setShowUploadModal(true)}
              title={!activeCycleExists ? "Certificate upload is disabled because there is no active review cycle open for this department & role." : ""}
              className={`flex items-center gap-1.5 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-colors cursor-pointer ${
                !activeCycleExists
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-60 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              }`}
            >
              <Plus size={16} />
              <span>Upload Certificate</span>
            </button>
          </div>
        </div>

        {!activeCycleExists && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl flex items-center gap-3 mt-4 relative z-10">
            <AlertCircle size={20} className="shrink-0 text-amber-400" />
            <div>
              <p className="font-extrabold text-xs">Certificate Upload Closed</p>
              <p className="text-[11px] text-amber-200/80">
                Uploading new certificates is locked because there is currently no active review cycle assigned for {selectedUserObj ? `${selectedUserObj.firstName} ${selectedUserObj.lastName}'s department and role` : 'your department and role'}.
              </p>
            </div>
          </div>
        )}

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

      {/* Staff Selection Roster Table (Managers/HR/Execs only) */}
      {user?.role !== 'employee' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Staff Credentials Directory</span>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                  {users.length} Employees
                </span>
              </h3>
              <p className="text-slate-550 text-xs mt-0.5">Search and select any employee to view and manage their credential vault</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <input
                  type="text"
                  placeholder="Search name, code, dept..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-3 pr-3 py-2 rounded-xl text-[11px] outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={userDeptFilter}
                onChange={(e) => {
                  setUserDeptFilter(e.target.value);
                  setUserPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-[11px] outline-none focus:border-sky-500 font-semibold cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3">Employee Code</th>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      No employees match your search query.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map(u => {
                    const isSelected = selectedEmployeeId === u._id;
                    const deptName = u.departmentId?.departmentName || 'General';
                    const desigName = u.designationId?.designationName || '-';

                    return (
                      <tr key={u._id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-sky-50/30 font-bold' : ''}`}>
                        <td className="p-3 font-mono text-[10px] font-bold text-slate-555">{u.employeeCode || 'EMP-N/A'}</td>
                        <td className="p-3 text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getUserAvatarUrl(u)}
                              alt="Avatar"
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <span className="font-bold text-slate-800">
                                {u.firstName} {u.lastName}
                              </span>
                              {isSelected && (
                                <span className="ml-2 px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 rounded text-[9px] font-black uppercase tracking-wider">
                                  Selected
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{deptName}</td>
                        <td className="p-3 text-slate-600">{desigName}</td>
                        <td className="p-3 uppercase text-[10px] text-slate-500 font-bold">{u.role}</td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(u._id);
                              fetchActiveCycleStatus(u._id, users);
                            }}
                            className={`px-3 py-1.5 font-bold rounded-xl text-[11px] transition-colors cursor-pointer border ${
                              isSelected 
                                ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? 'Viewing' : 'View Vault'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={safeUserPage}
            totalPages={totalUserPages}
            totalCount={filteredUsers.length}
            pageSize={USER_PAGE_SIZE}
            onPageChange={(p) => setUserPage(p)}
          />
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
                    <span className="font-bold text-slate-700">{formatDateDDMMYYYY(c.issueDate)}</span>
                  </div>
                  {c.expiryDate && (
                    <div className="flex justify-between text-slate-500">
                      <span>Expiry Date:</span>
                      <span className="font-bold text-slate-700">{formatDateDDMMYYYY(c.expiryDate)}</span>
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

            <form onSubmit={handleUploadSubmit} className="space-y-4">
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
                <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Document Proof (PDF, JPG, JPEG) *</label>
                <input
                  id="certFileField"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,image/jpeg,application/pdf"
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    if (selected) {
                      const ext = selected.name.split('.').pop().toLowerCase();
                      if (!['pdf', 'jpg', 'jpeg'].includes(ext)) {
                        toast.error('Invalid file format. Only PDF, JPG, and JPEG files are allowed.');
                        e.target.value = '';
                        setFile(null);
                        return;
                      }
                      setFile(selected);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-700 file:bg-sky-100 file:border-0 file:rounded-lg file:px-3 file:py-1 file:text-xs file:font-bold file:text-sky-800 cursor-pointer"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowUploadModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Register</span>
                  )}
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
