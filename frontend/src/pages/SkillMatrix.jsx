import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { getUserAvatarUrl } from '../utils/avatar';
import { AlertCircle, CheckCircle2, Star, Layers, Activity, Award, Plus, User, Trash2, Edit, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import TablePagination from '../components/TablePagination';

const SkillMatrix = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDeleteSkillId, setPendingDeleteSkillId] = useState(null);

  const [skills, setSkills] = useState([]);
  const [employeeSkills, setEmployeeSkills] = useState([]);
  
  // HR/Admin Add Skill State
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [newSkillDeptId, setNewSkillDeptId] = useState('');
  const [newSkillDesgId, setNewSkillDesgId] = useState('');
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

  // Employee Selection (for Manager/HR viewing others)
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 12;
  
  const [activeTab, setActiveTab] = useState('roster');
  const [skillSearchTerm, setSkillSearchTerm] = useState('');

  useEffect(() => {
    fetchMetadata();
    if (user?.role !== 'employee') {
      fetchUsers();
    } else {
      const fetchMyProfile = async () => {
        try {
          const res = await api.get('/api/users/me');
          setEmployeeProfile(res.data);
        } catch (err) {
          console.error('Failed to load employee profile:', err);
        }
      };
      fetchMyProfile();
    }
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    
    // Find selected user's department & designation details
    let deptId = null;
    let desId = null;

    if (user?.role === 'employee') {
      if (employeeProfile) {
        deptId = employeeProfile.departmentId?._id || employeeProfile.departmentId;
        desId = employeeProfile.designationId?._id || employeeProfile.designationId;
      }
    } else {
      const selectedUser = users.find(u => u._id === selectedEmployeeId) || (selectedEmployeeId === user?.id ? user : null);
      if (selectedUser) {
        deptId = selectedUser.departmentId?._id || selectedUser.departmentId;
        desId = selectedUser.designationId?._id || selectedUser.designationId;
      }
    }

    if (user?.role === 'employee' && !employeeProfile) return;
    
    fetchSkills(deptId, desId);
    fetchEmployeeSkills(selectedEmployeeId);
  }, [selectedEmployeeId, users, employeeProfile]);

  const fetchMetadata = async () => {
    try {
      const deptsRes = await api.get('/api/departments');
      setDepartments(deptsRes.data);
      const desgRes = await api.get('/api/designations');
      setDesignations(desgRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSkills = async (deptId, desId) => {
    try {
      let url = '/api/skills';
      const params = [];
      if (deptId) params.push(`departmentId=${deptId}`);
      if (desId) params.push(`designationId=${desId}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const res = await api.get(url);
      setSkills(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load master skill list.');
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

  const fetchEmployeeSkills = async (empId) => {
    if (!empId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/employee-skills?employeeId=${empId}`);
      setEmployeeSkills(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch skill ratings.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditSkill = (sk) => {
    setEditingSkillId(sk._id);
    setNewSkillName(sk.skillName);
    setNewSkillCategory(sk.category);
    setNewSkillDeptId(sk.departmentId?._id || sk.departmentId || '');
    setNewSkillDesgId(sk.designationId?._id || sk.designationId || '');
    setShowSkillModal(true);
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setNewSkillName('');
    setNewSkillCategory('');
    setNewSkillDeptId('');
    setNewSkillDesgId('');
    setShowSkillModal(false);
  };

  const handleDeleteSkill = (skillId) => {
    setPendingDeleteSkillId(skillId);
  };

  const confirmDeleteSkill = async () => {
    const skillId = pendingDeleteSkillId;
    if (!skillId) return;
    setPendingDeleteSkillId(null);
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      await api.delete(`/api/skills/${skillId}`);
      setSuccess('Skill successfully deleted from catalog.');
      
      const selectedUser = users.find(u => u._id === selectedEmployeeId) || (selectedEmployeeId === user?.id ? user : null);
      const deptId = selectedUser?.departmentId?._id || selectedUser?.departmentId;
      const desId = selectedUser?.designationId?._id || selectedUser?.designationId;
      fetchSkills(deptId, desId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete skill.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newSkillName.trim()) {
      setError('Skill Name is required.');
      return;
    }

    try {
      setLoading(true);
      if (editingSkillId) {
        await api.patch(`/api/skills/${editingSkillId}`, {
          skillName: newSkillName.trim(),
          category: newSkillCategory,
          departmentId: newSkillDeptId || '',
          designationId: newSkillDesgId || ''
        });
        setSuccess('Skill updated successfully!');
        handleCancelEdit();
      } else {
        await api.post('/api/skills', {
          skillName: newSkillName.trim(),
          category: newSkillCategory,
          departmentId: newSkillDeptId || null,
          designationId: newSkillDesgId || null
        });
        setSuccess('New skill added to master catalog!');
        setNewSkillName('');
        setShowSkillModal(false);
      }
      
      const selectedUser = users.find(u => u._id === selectedEmployeeId) || (selectedEmployeeId === user?.id ? user : null);
      const deptId = selectedUser?.departmentId?._id || selectedUser?.departmentId;
      const desId = selectedUser?.designationId?._id || selectedUser?.designationId;
      fetchSkills(deptId, desId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save skill.');
    } finally {
      setLoading(false);
    }
  };

  const handleRateSkill = async (skillId, selfRating, managerRating) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/api/employee-skills', {
        skillId,
        selfRating,
        managerRating,
        employeeId: selectedEmployeeId
      });
      setSuccess('Skill proficiency level updated successfully!');
      fetchEmployeeSkills(selectedEmployeeId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update rating.');
    }
  };

  const handleValidateAllSkills = async () => {
    if (!selectedEmployeeId) return;
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      for (const sk of skills) {
        const record = getEmployeeSkillRecord(sk._id);
        if (record.selfRating && !record.managerRating) {
          await api.post('/api/employee-skills', {
            skillId: sk._id,
            selfRating: record.selfRating,
            managerRating: record.selfRating,
            employeeId: selectedEmployeeId
          });
        }
      }
      setSuccess('All employee self-ratings successfully validated!');
      fetchEmployeeSkills(selectedEmployeeId);
    } catch (err) {
      console.error(err);
      setError('Failed to validate skills.');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeSkillRecord = (skillId) => {
    return employeeSkills.find(es => es.skillId?._id === skillId || es.skillId === skillId) || { selfRating: null, managerRating: null, proficiencyLevel: 0 };
  };

  const renderRatingStars = (skillId, currentVal, type, isEditable) => {
    const displayVal = currentVal || 0;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(val => (
          <button
            key={val}
            type="button"
            disabled={!isEditable}
            onClick={() => {
              if (type === 'self') {
                handleRateSkill(skillId, val, undefined);
              } else {
                handleRateSkill(skillId, undefined, val);
              }
            }}
            className={`transition-transform ${isEditable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            title={`${val === 1 ? 'Novice' : val === 3 ? 'Intermediate' : val === 5 ? 'Expert' : `Level ${val}`}`}
          >
            <Star
              size={15}
              className={val <= displayVal ? 'fill-sky-500 text-sky-500' : 'text-slate-200 hover:text-slate-350'}
            />
          </button>
        ))}
      </div>
    );
  };

  const getProficiencyLabel = (val) => {
    switch (val) {
      case 1: return 'Novice';
      case 2: return 'Advanced Beginner';
      case 3: return 'Competent';
      case 4: return 'Proficient';
      case 5: return 'Expert';
      default: return 'Not Rated';
    }
  };

  // Calculate summary metrics
  const totalSkillsCount = skills.length;
  const ratedSkillsCount = employeeSkills.filter(es => es.selfRating || es.managerRating).length;
  const verifiedCount = employeeSkills.filter(es => es.managerRating).length;

  const validRatings = employeeSkills
    .map(es => es.managerRating || es.selfRating)
    .filter(Boolean);
  const avgRating = validRatings.length > 0
    ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1)
    : '0.0';

  const overallBand = avgRating >= 4.5 ? 'Expert' : avgRating >= 3.5 ? 'Proficient' : avgRating >= 2.5 ? 'Competent' : avgRating > 0 ? 'Novice' : 'Not Rated';

  // Group skills by category dynamically
  const filteredSkills = skills.filter(sk => {
    const nameMatch = (sk.skillName || '').toLowerCase().includes((skillSearchTerm || '').toLowerCase());
    const catMatch = (sk.category || '').toLowerCase().includes((skillSearchTerm || '').toLowerCase());
    return nameMatch || catMatch;
  });

  const skillsByCategory = {};
  filteredSkills.forEach(skill => {
    const cat = skill.category || 'General';
    if (!skillsByCategory[cat]) {
      skillsByCategory[cat] = [];
    }
    skillsByCategory[cat].push(skill);
  });

  const selectedUserObj = users.find(u => u._id === selectedEmployeeId) || (selectedEmployeeId === user?.id ? user : null);

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Skill Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
                Capability Engine
              </span>
              {selectedUserObj && (
                <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  Target: {selectedUserObj.firstName} {selectedUserObj.lastName} ({selectedUserObj.role?.toUpperCase()})
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Skill & Competency Matrix Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Enterprise technical capabilities, proficiency evaluations, & manager skill validation benchmark desk.
            </p>
          </div>

          {/* Quick Controls Header Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Add Skill Button */}
            {user?.role !== 'employee' && (
              <button
                onClick={() => {
                  setEditingSkillId(null);
                  setNewSkillName('');
                  setNewSkillCategory('');
                  setNewSkillDeptId('');
                  setNewSkillDesgId('');
                  setShowSkillModal(true);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Skill Competency</span>
              </button>
            )}
          </div>
        </div>

        {/* Skill Matrix Summary Cards (4 Cards Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Catalog Skills</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalSkillsCount}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Tracked competencies</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Rated Skills</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{ratedSkillsCount}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Self evaluated</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Star size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Manager Verified</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{verifiedCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Leadership confirmed</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avg Proficiency</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{avgRating} <span className="text-xs text-slate-400 font-normal">/ 5.0</span></h2>
              <span className="text-[9px] text-indigo-400 font-bold uppercase">{overallBand}</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Activity size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Directory Selector Panel for Managers & HR */}
      {user?.role !== 'employee' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <User size={16} className="text-sky-600" />
                <span>Staff Capability Directory ({users.length} Employees)</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Select an employee below to view, rate, or validate their technical & domain competencies.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-64">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setUserPage(1);
                  }}
                  placeholder="Search staff by name, code, dept..."
                  className="bg-transparent text-xs text-slate-800 outline-none w-full font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmployeeId(user?.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  selectedEmployeeId === user?.id
                    ? 'bg-sky-700 text-white border-sky-700 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                My Matrix (Self)
              </button>
            </div>
          </div>

          {/* Grid of Interactive Staff Cards with Pagination */}
          {(() => {
            const filteredStaffUsers = users.filter(u => {
              const name = `${u.firstName} ${u.lastName} ${u.employeeCode}`.toLowerCase();
              const dept = (u.departmentId?.departmentName || '').toLowerCase();
              const role = (u.role || '').toLowerCase();
              const q = searchQuery.toLowerCase();
              return name.includes(q) || dept.includes(q) || role.includes(q);
            });

            const totalUserPages = Math.max(1, Math.ceil(filteredStaffUsers.length / USER_PAGE_SIZE));
            const safeUserPage = Math.min(userPage, totalUserPages);
            const paginatedStaffUsers = filteredStaffUsers.slice(
              (safeUserPage - 1) * USER_PAGE_SIZE,
              safeUserPage * USER_PAGE_SIZE
            );

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {paginatedStaffUsers.map(u => {
                    const isSelected = selectedEmployeeId === u._id;
                    const deptName = u.departmentId?.departmentName || 'Global';

                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(u._id)}
                        className={`text-left p-3 rounded-2xl transition-all cursor-pointer border flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-sky-50 text-sky-950 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                            : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={getUserAvatarUrl(u)}
                            alt="Avatar"
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-slate-900 truncate">{u.firstName} {u.lastName}</p>
                            <span className="text-[9px] font-mono text-slate-400 block truncate">{u.employeeCode}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[9px]">
                          <span className="font-semibold text-slate-550 truncate max-w-[80px]">{deptName}</span>
                          <span className={`font-black uppercase px-1.5 py-0.2 rounded text-[8px] ${
                            u.role === 'manager' || u.role === 'hr' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {u.role === 'manager' ? 'MGR' : u.role === 'hr' ? 'HR' : 'EMP'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <TablePagination
                  page={safeUserPage}
                  totalPages={totalUserPages}
                  totalCount={filteredStaffUsers.length}
                  pageSize={USER_PAGE_SIZE}
                  onPageChange={(p) => setUserPage(p)}
                />
              </>
            );
          })()}
        </div>
      )}

      {/* Tabbed Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'roster' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>Skill Competency Matrix ({totalSkillsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'guidelines' ? 'border-sky-600 text-sky-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award size={16} />
          <span>Proficiency Guidelines</span>
        </button>
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

      {/* TAB 1: SKILL MATRIX ROSTER */}
      {activeTab === 'roster' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Technical & Domain Capabilities</span>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                  {Object.keys(skillsByCategory).length} Categories
                </span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {user?.role !== 'employee' && selectedEmployeeId !== user?.id && (
                <button
                  type="button"
                  onClick={handleValidateAllSkills}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                  title="Copy employee self-ratings into manager ratings"
                >
                  <CheckCircle2 size={15} />
                  <span>Validate All Self Ratings</span>
                </button>
              )}

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-64">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter skill or category..."
                  value={skillSearchTerm}
                  onChange={(e) => setSkillSearchTerm(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none w-full font-medium"
                />
              </div>
            </div>
          </div>

          {Object.keys(skillsByCategory).length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
              <Layers className="mx-auto text-slate-300" size={32} />
              <p className="text-slate-500 font-bold text-xs">No skills registered in the catalog for this selection.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(skillsByCategory).map(catName => (
                <div key={catName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">{catName} Skills</h4>
                    <span className="text-[10px] text-slate-400 font-bold">({skillsByCategory[catName].length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skillsByCategory[catName].map(sk => {
                      const record = getEmployeeSkillRecord(sk._id);
                      const isManagerOrHr = user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin';
                      const isOwnProfile = selectedEmployeeId === user?.id;

                      return (
                        <div key={sk._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 hover:border-slate-300 transition-colors space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-extrabold text-slate-800 text-xs">{sk.skillName}</h5>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                                Category: {sk.category || 'General'}
                              </span>
                            </div>

                            {user?.role !== 'employee' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSkill(sk)}
                                  className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer transition-colors"
                                  title="Edit Skill Details"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSkill(sk._id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                  title="Delete Skill"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Star Ratings Grid: Self Rating vs Manager Validated */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-[11px]">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                                <span>Self Rating</span>
                                <span className="text-sky-700 font-extrabold">{getProficiencyLabel(record.selfRating)}</span>
                              </div>
                              {renderRatingStars(sk._id, record.selfRating, 'self', isOwnProfile)}
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                                <span>Manager Validated</span>
                                <span className="text-emerald-700 font-extrabold">{getProficiencyLabel(record.managerRating)}</span>
                              </div>
                              {renderRatingStars(sk._id, record.managerRating, 'manager', isManagerOrHr)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: PROFICIENCY GUIDELINES */}
      {activeTab === 'guidelines' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <span>Official Proficiency Level Benchmarks</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Rating guidelines for self-evaluations & manager skill validations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} className="fill-amber-400" />
                <span className="font-black text-slate-800 text-xs">Level 1: Novice</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Basic theoretical awareness of the core tool/skill with limited production execution experience.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" />
                <span className="font-black text-slate-800 text-xs">Level 2: Beginner</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Understands practical principles and executes routine tasks with active manager or team guidance.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" />
                <span className="font-black text-slate-800 text-xs">Level 3: Competent</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Executes typical production tasks independently using standard best practices and quality guidelines.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" />
                <span className="font-black text-slate-800 text-xs">Level 4: Proficient</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Advanced mastery of complex technical domains; capable of troubleshooting and mentoring peers.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" /><Star size={14} className="fill-amber-400" />
                <span className="font-black text-slate-800 text-xs">Level 5: Expert</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Capable of architecting robust enterprise systems, setting technical standards, and driving innovation.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Add / Edit Skill Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingSkillId ? 'Modify Skill Competency' : 'Add New Skill Competency'}
              </h3>
              <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Skill Name *</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. React.js, Node.js, Financial Analysis..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
                <input
                  type="text"
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  placeholder="e.g. Frontend Development, Soft Skills, Sales..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Department (Optional)</label>
                  <select
                    value={newSkillDeptId}
                    onChange={(e) => setNewSkillDeptId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">Global (All Depts)</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Designation (Optional)</label>
                  <select
                    value={newSkillDesgId}
                    onChange={(e) => setNewSkillDesgId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">All Designations</option>
                    {designations.map(d => (
                      <option key={d._id} value={d._id}>{d.designationName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer transition-all duration-200"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingDeleteSkillId}
        title="Delete Skill Competency?"
        message="Are you sure you want to delete this skill competency from the master catalog? All associated rating records will be permanently removed."
        confirmLabel="Delete Skill"
        danger
        onConfirm={confirmDeleteSkill}
        onCancel={() => setPendingDeleteSkillId(null)}
      />

    </div>
  );
};

export default SkillMatrix;
