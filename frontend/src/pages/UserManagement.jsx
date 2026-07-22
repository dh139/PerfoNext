import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Plus, Edit2, ShieldAlert, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from '../store/toastStore';
import useAuthStore from '../store/authStore';

const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name } or null

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null); // null if creating
  
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get('/api/users');
      setUsers(userRes.data);

      const deptRes = await api.get('/api/departments');
      setDepartments(deptRes.data.filter(d => d.status === 'active'));
      if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0]._id);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch user database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch designations when departmentId changes
  useEffect(() => {
    const fetchDesignations = async () => {
      if (!departmentId) return;
      try {
        const res = await api.get(`/api/designations?departmentId=${departmentId}`);
        setDesignations(res.data.filter(d => d.status === 'active'));
        if (res.data.length > 0) setDesignationId(res.data[0]._id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDesignations();
  }, [departmentId]);

  const handleOpenCreate = () => {
    setError('');
    setEditUser(null);
    setEmployeeCode('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setRole('employee');
    setManagerId('');
    setEmploymentStatus('active');
    if (departments.length > 0) setDepartmentId(departments[0]._id);
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setError('');
    setEditUser(user);
    setEmployeeCode(user.employeeCode);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setMobile(user.mobile);
    setPassword(''); // Leave empty unless modifying
    setRole(user.role);
    setDepartmentId(user.departmentId?._id || '');
    setDesignationId(user.designationId?._id || '');
    setManagerId(user.managerId?._id || '');
    setEmploymentStatus(user.employmentStatus);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      employeeCode,
      firstName,
      lastName,
      email,
      mobile,
      role,
      departmentId,
      designationId,
      managerId: managerId || '',
      employmentStatus
    };

    if (password) payload.password = password;

    try {
      if (editUser) {
        await api.patch(`/api/users/${editUser._id}`, payload);
      } else {
        await api.post('/api/users', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save user profiles.');
    }
  };

  const handleDeleteUser = (id, name) => {
    setPendingDelete({ id, name });
  };

  const confirmDeleteUser = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    try {
      setError('');
      await api.delete(`/api/users/${id}`);
      setShowModal(false);
      toast.success('Employee account deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  // Resolve designation name for the selected designationId
  const selectedDesignationName = designations.find(d => d._id === designationId)?.designationName || '';

  const determineLevel = (targetRole, desName) => {
    const name = (desName || '').toLowerCase();
    if (targetRole === 'executive') return 1;
    if (targetRole === 'hr') return 2;
    if (targetRole === 'manager') {
      if (name.includes('manager') || name.includes('head') || name.includes('director')) return 2;
      return 3;
    }
    if (targetRole === 'employee') {
      if (name.includes('senior') || name.includes('lead')) return 4;
      if (name.includes('associate') || name.includes('junior') || name.includes('trainee') || name.includes('writer')) return 6;
      return 5;
    }
    if (targetRole === 'admin') return 3;
    return 5;
  };

  const userLevel = determineLevel(role, selectedDesignationName);

  // Eligible direct managers based on level & department
  const eligibleManagers = users.filter(u => {
    if (editUser && u._id === editUser._id) return false;
    if (u.employmentStatus !== 'active') return false;

    // HR and Admin report to CEO (executive)
    if (role === 'hr' || role === 'admin') {
      return u.role === 'executive';
    }

    // Others must report to someone with a higher rank (numerically lower level)
    const uLevel = u.level || 5;
    if (uLevel >= userLevel && u.role !== 'executive') {
      return false;
    }

    // Must be from same department or be the CEO
    if (u.role === 'executive') return true;
    const uDeptId = u.departmentId?._id || u.departmentId;
    return uDeptId && departmentId && uDeptId.toString() === departmentId.toString();
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Users Database</h2>
          <p className="text-xs text-slate-500 mt-1">Manage employee accounts, directory hierarchies, and system security privileges</p>
        </div>
        
        {currentUser?.role !== 'executive' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-colors"
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Users table list */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-lg">Code</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role Privileges</th>
                <th className="py-3 px-4">Department / Designation</th>
                <th className="py-3 px-4">Manager</th>
                <th className="py-3 px-4">Status</th>
                {currentUser?.role !== 'executive' && <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-500">{u.employeeCode}</td>
                  <td className="py-4 px-4 font-bold text-slate-800">{u.firstName} {u.lastName}</td>
                  <td className="py-4 px-4 text-slate-650">{u.email}</td>
                  <td className="py-4 px-4">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-600 block w-max">
                      {u.role}
                    </span>
                    <span className="text-[9px] font-bold text-sky-700 mt-1 block">
                      Level {u.level || 5}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-slate-700 block">{u.departmentId?.departmentName || '-'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{u.designationId?.designationName || '-'}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {u.managerId ? `${u.managerId.firstName} ${u.managerId.lastName}` : '-'}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[9px] uppercase border ${
                      u.employmentStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                    }`}>
                      {u.employmentStatus}
                    </span>
                  </td>
                  {currentUser?.role !== 'executive' && (
                    <td className="py-4 px-4 text-right flex justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="text-sky-700 hover:text-sky-850 p-1.5 rounded-lg border border-sky-100 hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u._id, `${u.firstName} ${u.lastName}`)}
                        className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Employee"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                {editUser ? 'Modify Employee Profile' : 'Register New Employee'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold font-sans">Close</button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Name Info */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800"
                    required
                  />
                </div>

                {/* 2. Contact Info */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-850"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mobile Contact</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800"
                    required
                  />
                </div>

                {/* 3. Code & Role */}
                {editUser && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Employee Code</label>
                    <input
                      type="text"
                      value={employeeCode}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-slate-500 cursor-not-allowed font-semibold"
                    />
                  </div>
                )}

                <div className={`space-y-1.5 ${editUser ? '' : 'md:col-span-2'}`}>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Access Privilege (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (e.target.value === 'executive') setManagerId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                  >
                    <option value="employee">Employee</option>
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

                {/* 4. Password & Department */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Password {editUser && '(Leave blank to keep unchanged)'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editUser ? '••••••••' : 'Enter Password'}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800"
                    required={!editUser}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Department</label>
                    <span className={`text-[9px] font-bold ${role === 'executive' ? 'text-slate-400 font-normal' : 'text-rose-500'}`}>
                      {role === 'executive' ? '(Optional)' : '* Required'}
                    </span>
                  </div>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium"
                    required={role !== 'executive'}
                  >
                    <option value="">{role === 'executive' ? 'Select Department (Optional)' : 'Select Department *'}</option>
                    {departments
                      .filter(d => currentUser?.role === 'admin' || d.departmentName.toLowerCase() !== 'administration')
                      .map(d => (
                        <option key={d._id} value={d._id}>{d.departmentName}</option>
                      ))}
                  </select>
                </div>

                {/* 5. Designation & Status */}
                <div className={`space-y-1.5 ${editUser ? '' : 'md:col-span-2'}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                    <span className={`text-[9px] font-bold ${['admin', 'executive'].includes(role) ? 'text-slate-400 font-normal' : 'text-rose-500'}`}>
                      {['admin', 'executive'].includes(role) ? '(Optional)' : '* Required'}
                    </span>
                  </div>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium"
                    required={!['admin', 'executive'].includes(role)}
                  >
                    <option value="">{['admin', 'executive'].includes(role) ? 'Select Designation (Optional)' : 'Select Designation *'}</option>
                    {designations.map(d => (
                      <option key={d._id} value={d._id}>{d.designationName}</option>
                    ))}
                  </select>
                </div>

                {editUser && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Employment Status</label>
                    <select
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="exited">Exited</option>
                    </select>
                  </div>
                )}

                {/* 6. Direct Manager */}
                {role !== 'executive' && (
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Direct Manager</label>
                      <span className={`text-[9px] font-bold ${role === 'employee' ? 'text-rose-500' : 'text-slate-400 font-normal'}`}>
                        {role === 'employee' ? '* Required for Employees' : '(Optional)'}
                      </span>
                    </div>
                    <select
                      value={managerId}
                      onChange={(e) => setManagerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium"
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
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                {editUser ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(editUser._id, `${firstName} ${lastName}`)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    Save Profile
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
