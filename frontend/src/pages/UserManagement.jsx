import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Plus, Edit2, Trash2, Users, User, Search, Layers, ShieldCheck, CheckCircle2, XCircle, RefreshCw, UserPlus } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { getUserAvatarUrl } from '../utils/avatar';
import { toast } from '../store/toastStore';
import useAuthStore from '../store/authStore';

const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 w-max shadow-2xs">
            Admin
          </span>
        );
      case 'executive':
        return (
          <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700 w-max shadow-2xs">
            Executive
          </span>
        );
      case 'hr':
        return (
          <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 w-max shadow-2xs">
            HR Manager
          </span>
        );
      case 'manager':
        return (
          <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 w-max shadow-2xs">
            Reporting Manager
          </span>
        );
      case 'employee':
      default:
        return (
          <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-700 w-max shadow-2xs">
            Employee
          </span>
        );
    }
  };

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('active');
  const [joiningDate, setJoiningDate] = useState('');
  const [gender, setGender] = useState('male');
  const [workMode, setWorkMode] = useState('Work From office');

  const fetchData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get('/api/users');
      setUsers(userRes.data);

      const deptRes = await api.get('/api/departments');
      setDepartments(deptRes.data.filter(d => d.status === 'active'));
      if (deptRes.data.length > 0 && !departmentId) setDepartmentId(deptRes.data[0]._id);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch user database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const url = departmentId ? `/api/designations?departmentId=${departmentId}` : `/api/designations`;
        const res = await api.get(url);
        setDesignations(res.data.filter(d => d.status === 'active'));
      } catch (err) { console.error(err); }
    };
    fetchDesignations();
  }, [departmentId]);

  const handleOpenCreate = () => {
    setError('');
    setModalError('');
    setIsSubmitting(false);
    setEditUser(null);
    setEmployeeCode(''); setFirstName(''); setLastName(''); setEmail(''); setMobile(''); setPassword('');
    setRole('employee'); setManagerId(''); setEmploymentStatus('active');
    setGender('male');
    setWorkMode('Work From office');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    if (departments.length > 0) setDepartmentId(departments[0]._id);
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setError('');
    setModalError('');
    setIsSubmitting(false);
    setEditUser(user);
    setEmployeeCode(user.employeeCode); setFirstName(user.firstName); setLastName(user.lastName);
    setEmail(user.email); setMobile(user.mobile); setPassword('');
    setRole(user.role); setDepartmentId(user.departmentId?._id || '');
    setDesignationId(user.designationId?._id || ''); setManagerId(user.managerId?._id || '');
    setEmploymentStatus(user.employmentStatus);
    setGender(user.gender || 'male');
    setWorkMode(user.workMode || 'Work From office');
    setJoiningDate(user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setModalError('');
    setIsSubmitting(true);

    if (!/^\d{10}$/.test(mobile.trim())) {
      const errMsg = 'Mobile number must be exactly 10 digits long.';
      setModalError(errMsg);
      toast.error(errMsg);
      setIsSubmitting(false);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (joiningDate && joiningDate > todayStr) {
      const errMsg = 'Joining date cannot be in the future.';
      setModalError(errMsg);
      toast.error(errMsg);
      setIsSubmitting(false);
      return;
    }

    const payload = { employeeCode, firstName, lastName, email, mobile, role, departmentId: departmentId || null, designationId: designationId || null, managerId: managerId || '', joiningDate, employmentStatus, gender, workMode };
    if (password) payload.password = password;
    try {
      if (editUser) {
        await api.patch(`/api/users/${editUser._id}`, payload);
        toast.success('Employee profile updated successfully.');
      } else {
        await api.post('/api/users', payload);
        toast.success('New employee registered successfully.');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save user profile.';
      setModalError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (id, name) => setPendingDelete({ id, name });

  const confirmDeleteUser = async () => {
    if (!pendingDelete) return;
    try {
      await api.delete(`/api/users/${pendingDelete.id}`);
      setPendingDelete(null);
      toast.success('Employee account deleted successfully.');
      fetchData();
    } catch (err) { toast.error('Failed to delete user.'); }
  };

  const determineLevel = (targetRole, desName) => {
    const name = (desName || '').toLowerCase();
    if (targetRole === 'executive') return 1;
    if (targetRole === 'hr') return 2;
    if (targetRole === 'manager') return name.includes('head') ? 2 : 3;
    if (targetRole === 'employee') return name.includes('lead') ? 4 : 6;
    return 5;
  };

  const selectedDesignationName = designations.find(d => d._id === designationId)?.designationName || '';
  const userLevel = determineLevel(role, selectedDesignationName);

  const eligibleManagers = users.filter(u => {
    if (u.role === 'employee') return false; // Employees cannot be managers
    if (editUser && u._id === editUser._id) return false;
    if (u.employmentStatus !== 'active') return false;
    if (role === 'hr' || role === 'admin') return u.role === 'executive';
    const uLevel = u.level || 5;
    if (uLevel >= userLevel && u.role !== 'executive') return false;
    if (u.role === 'executive') return true;
    const uDeptId = u.departmentId?._id || u.departmentId;
    return uDeptId && departmentId && uDeptId.toString() === departmentId.toString();
  });

  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName} ${u.employeeCode} ${u.email}`.toLowerCase();
    const deptName = (u.departmentId?.departmentName || '').toLowerCase();
    const desgName = (u.designationId?.designationName || '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || deptName.includes(searchTerm.toLowerCase()) || desgName.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const uDeptId = u.departmentId?._id || u.departmentId;
    const matchesDept = deptFilter === 'all' || (uDeptId && uDeptId.toString() === deptFilter.toString());
    const matchesStatus = statusFilter === 'all' || u.employmentStatus === statusFilter;
    const matchesWorkMode = workModeFilter === 'all' || (u.workMode || 'Work From office') === workModeFilter;
    return matchesSearch && matchesRole && matchesDept && matchesStatus && matchesWorkMode;
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = itemsPerPage === 'all' ? 1 : (Math.ceil(filteredUsers.length / itemsPerPage) || 1);
  const paginatedUsers = itemsPerPage === 'all' 
    ? filteredUsers 
    : filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = users.filter(u => u.employmentStatus === 'active').length;
  const managerCount = users.filter(u => u.role === 'manager' || u.role === 'hr').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-bold">Loading employee directory...</p>
      </div>
    );
  }

  const getLevelAndExperienceBadge = (u) => {
    const jd = u.joiningDate ? new Date(u.joiningDate) : null;
    let expText = 'New Joiner';
    if (jd && !isNaN(jd.getTime())) {
      const diffYears = Math.round((Math.abs(new Date() - jd) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
      if (diffYears < 0.1) {
        expText = '< 1 mo tenure';
      } else if (diffYears < 1) {
        const months = Math.round(diffYears * 12);
        expText = `${months} mos tenure`;
      } else {
        expText = `${diffYears} yrs tenure`;
      }
    }

    const lvl = u.level || 5;
    let levelTitle = `L${lvl}`;
    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

    switch (lvl) {
      case 1:
        levelTitle = 'L1 • Executive';
        badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
        break;
      case 2:
        levelTitle = 'L2 • Senior Lead';
        badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        break;
      case 3:
        levelTitle = 'L3 • Team Lead';
        badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        break;
      case 4:
        levelTitle = 'L4 • Senior Staff';
        badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
        break;
      case 5:
        levelTitle = 'L5 • Mid-Level';
        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        break;
      case 6:
      default:
        levelTitle = 'L6 • Associate';
        badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
        break;
    }

    return (
      <div className="space-y-0.5">
        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
          {levelTitle}
        </span>
        <p className="text-[10px] text-slate-500 font-semibold">{expText}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">System Directory</span>
              <span className="text-[10px] text-slate-400 font-medium">{users.length} Total Registered Accounts</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">Enterprise User & Privilege Directory</h1>
          </div>
          <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-colors shrink-0 cursor-pointer">
            <Plus size={18} /><span>Register Employee</span>
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div><p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Staff</p><h2 className="text-xl font-extrabold text-white mt-0.5">{activeCount}</h2></div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><Users size={20} /></div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div><p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Department Leads</p><h2 className="text-xl font-extrabold text-white mt-0.5">{managerCount}</h2></div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20"><ShieldCheck size={20} /></div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div><p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Individual Contributors</p><h2 className="text-xl font-extrabold text-white mt-0.5">{employeeCount}</h2></div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20"><User size={20} /></div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div><p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Departments Covered</p><h2 className="text-xl font-extrabold text-white mt-0.5">{departments.length}</h2></div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20"><Layers size={20} /></div>
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2"><span>Employee Roster & Privileges</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">{filteredUsers.length} Matching Accounts</span>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-64">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input type="text" placeholder="Search name, code, email..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-transparent text-xs text-slate-800 outline-none w-full" />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer">
              <option value="all">All Roles</option>
              <option value="executive">Executive Management</option>
              <option value="admin">Administrator</option>
              <option value="hr">HR Manager</option>
              <option value="manager">Reporting Manager</option>
              <option value="employee">Standard Employee</option>
            </select>
            <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer">
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <select value={workModeFilter} onChange={(e) => { setWorkModeFilter(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer">
              <option value="all">All Work Modes</option>
              <option value="Work From office">Work From Office</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>
        {paginatedUsers.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2"><Users className="mx-auto text-slate-300" size={32} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400">
                  <th className="p-3 pl-4">Employee</th>
                  <th className="p-3">Role Privilege</th>
                  <th className="p-3">Dept & Designation</th>
                  <th className="p-3">Level & Experience</th>
                  <th className="p-3">Reporting Line</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedUsers.map((u) => (
                  <tr
                    key={u._id}
                    className={`transition-colors ${
                      u.role === 'manager'
                        ? 'bg-emerald-100/80 hover:bg-emerald-200/80 font-semibold'
                        : u.role === 'hr'
                        ? 'bg-indigo-50/70 hover:bg-indigo-100/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getUserAvatarUrl(u)}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <p className="font-extrabold text-slate-800 text-xs">{u.firstName} {u.lastName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                            <span className="font-mono font-bold text-slate-500">{u.employeeCode}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-sky-700 font-medium">{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{renderRoleBadge(u.role)}</td>
                    <td className="p-3"><p className="font-bold text-slate-700">{u.departmentId?.departmentName || '-'}</p><p className="text-[10px] text-slate-500">{u.designationId?.designationName || '-'}</p></td>
                    <td className="p-3">{getLevelAndExperienceBadge(u)}</td>
                    <td className="p-3">{u.managerId ? `${u.managerId.firstName} ${u.managerId.lastName}` : '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase border ${u.employmentStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {u.employmentStatus === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {u.employmentStatus}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right flex justify-end gap-1.5">
                      <button onClick={() => handleOpenEdit(u)} className="p-1.5 text-sky-700 hover:text-sky-900 bg-sky-50 rounded-lg border border-sky-100 cursor-pointer"><Edit2 size={13} /></button>
                      <button onClick={() => handleDeleteUser(u._id, `${u.firstName} ${u.lastName}`)} className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg border border-rose-100 cursor-pointer"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar with Page Size Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-100 text-xs gap-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Showing {itemsPerPage === 'all' ? 1 : (currentPage - 1) * itemsPerPage + 1} to {itemsPerPage === 'all' ? filteredUsers.length : Math.min(filteredUsers.length, currentPage * itemsPerPage)} of {filteredUsers.length} employee accounts
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase">Per Page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 text-xs outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">Show All ({filteredUsers.length})</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 font-black text-sky-700 bg-sky-50 rounded-xl border border-sky-100">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-tight">
                    {editUser ? 'Modify Employee Profile' : 'Register New Employee'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editUser ? `Updating credentials & reporting line for ${editUser.employeeCode}` : 'Create a new organizational user account & set privileges'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2.5 font-bold text-xs">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* SECTION 1: Personal & Contact Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                    Personal & Contact Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium transition-all"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium transition-all"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. employee@epts.com"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium transition-all"
                      required
                    />
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Mobile Contact <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      pattern="\d{10}"
                      title="Mobile number must be exactly 10 digits (numbers only)"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium transition-all"
                      required
                    />
                  </div>

                  {/* Gender – icon toggle buttons */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all font-bold text-[11px] cursor-pointer ${
                          gender === 'male'
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">👨</span>
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all font-bold text-[11px] cursor-pointer ${
                          gender === 'female'
                            ? 'border-rose-400 bg-rose-50 text-rose-600'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">👩</span>
                        Female
                      </button>
                    </div>
                  </div>

                  {/* Work Mode */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Work Mode <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      {(() => {
                        const workModes = [
                          { mode: 'Work From office', icon: '🏢', label: 'Office', activeClass: 'border-sky-500 bg-sky-50 text-sky-700' },
                          { mode: 'Hybrid', icon: '🔀', label: 'Hybrid', activeClass: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
                          { mode: 'Remote', icon: '🏠', label: 'Remote', activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                        ];
                        return workModes.map(({ mode, icon, label, activeClass }) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setWorkMode(mode)}
                            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all font-bold text-[11px] cursor-pointer ${
                              workMode === mode ? activeClass : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          <span className="text-xl">{icon}</span>
                          {mode === 'Work From office' ? 'Office' : mode}
                        </button>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Joining Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Joining Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Role, Privileges & Account Credentials */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                    Role & Account Access
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employee Code (if Edit Mode) */}
                  {editUser && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Employee Code
                      </label>
                      <input
                        type="text"
                        value={employeeCode}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-500 cursor-not-allowed font-mono font-bold"
                      />
                    </div>
                  )}

                  {/* Role / Access Privilege */}
                  <div className={`space-y-1 ${editUser ? '' : 'md:col-span-2'}`}>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Access Privilege (Role) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value);
                        if (e.target.value === 'executive') setManagerId('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-bold cursor-pointer transition-all"
                    >
                      <option value="employee">Standard Employee</option>
                      <option value="manager">Reporting Manager</option>
                      <option value="hr">HR Manager</option>
                      {currentUser?.role === 'admin' && (
                        <>
                          <option value="admin">Administrator</option>
                          <option value="executive">CEO / Executive Management</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Password */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      {editUser ? 'Password (leave blank to keep current)' : 'Account Password'} {!editUser && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editUser ? '••••••••' : 'Enter password...'}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 transition-all"
                      required={!editUser}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Organization & Reporting Structure */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                    Organizational Placement
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Department */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Department {!['admin', 'executive'].includes(role) && <span className="text-rose-500">*</span>}
                      {['admin', 'executive'].includes(role) && <span className="text-slate-400 font-normal lowercase ml-1">(optional)</span>}
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer transition-all"
                      required={!['admin', 'executive'].includes(role)}
                    >
                      <option value="">{['admin', 'executive'].includes(role) ? 'Select Department (Optional)' : 'Select Department *'}</option>
                      {departments
                        .filter(d => currentUser?.role === 'admin' || d.departmentName.toLowerCase() !== 'administration')
                        .map(d => (
                          <option key={d._id} value={d._id}>{d.departmentName}</option>
                        ))}
                    </select>
                  </div>

                  {/* Designation */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Designation {!['admin', 'executive'].includes(role) && <span className="text-rose-500">*</span>}
                      {['admin', 'executive'].includes(role) && <span className="text-slate-400 font-normal lowercase ml-1">(optional)</span>}
                    </label>
                    <select
                      value={designationId}
                      onChange={(e) => setDesignationId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer transition-all"
                      required={!['admin', 'executive'].includes(role)}
                    >
                      <option value="">{['admin', 'executive'].includes(role) ? 'Select Designation (Optional)' : 'Select Designation *'}</option>
                      {designations.map(d => (
                        <option key={d._id} value={d._id}>{d.designationName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Direct Manager */}
                  {role !== 'executive' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Direct Manager {role === 'employee' && <span className="text-rose-500">*</span>}
                        {role !== 'employee' && <span className="text-slate-400 font-normal lowercase ml-1">(optional)</span>}
                      </label>
                      <select
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer transition-all"
                        required={role === 'employee'}
                      >
                        <option value="">{role === 'employee' ? 'Select Direct Manager *' : 'No reporting manager (Optional)'}</option>
                        {eligibleManagers.map(m => (
                          <option key={m._id} value={m._id}>
                            {m.firstName} {m.lastName} ({m.role === 'executive' ? 'CEO' : m.designationId?.designationName || 'Manager'}) - Level {m.level}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Employment Status (if Edit Mode) */}
                  {editUser && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Employment Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={employmentStatus}
                        onChange={(e) => setEmploymentStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-bold cursor-pointer transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="exited">Exited</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-5 border-t border-slate-100">
                {editUser ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(editUser._id, `${firstName} ${lastName}`)}
                    className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs px-4 py-2.5 rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving...
                      </span>
                    ) : (
                      <span>{editUser ? 'Save Profile' : 'Register Employee'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete employee account?"
        message={pendingDelete ? `Are you absolutely sure you want to delete the employee account for ${pendingDelete.name}? This action is permanent and cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteUser}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default UserManagement;
