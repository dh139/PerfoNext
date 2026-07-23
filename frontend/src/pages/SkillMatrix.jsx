import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, CheckCircle2, Star, Layers, Activity, Award, Plus, User, Trash2, Edit, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

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
  const [newSkillCategory, setNewSkillCategory] = useState('Frontend');
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
      setUsers(res.data);
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
    setNewSkillCategory('Frontend');
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

  // Group skills by category dynamically
  const skillsByCategory = {};
  skills.forEach(skill => {
    const cat = skill.category || 'General';
    if (!skillsByCategory[cat]) {
      skillsByCategory[cat] = [];
    }
    skillsByCategory[cat].push(skill);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs text-slate-800">
      
      {/* Header and selector */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Skill Competency Matrix</h2>
          <p className="text-slate-400 mt-0.5">Evaluate capability benchmarks and technical proficiency ratings</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Employee selector for managers / HR */}
          {user?.role !== 'employee' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 px-3.5 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <User size={14} className="text-slate-500" />
                <div className="text-left">
                  <span className="text-[8px] text-slate-400 block uppercase tracking-wider leading-none">Select Staff</span>
                  <span className="mt-0.5 block">
                    {(() => {
                      const selected = users.find(u => u._id === selectedEmployeeId);
                      return selected ? `${selected.firstName} ${selected.lastName} (${selected.role.toUpperCase()})` : 'Select Staff Member';
                    })()}
                  </span>
                </div>
                <span className="ml-1 text-slate-400 text-[10px]">▼</span>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop overlay to close dropdown */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => {
                      setDropdownOpen(false);
                      setSearchQuery('');
                    }}
                  />
                  
                  {/* Dropdown panel */}
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-2 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, department, role..."
                        className="w-full bg-transparent text-xs text-slate-800 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {(() => {
                        const filtered = users.filter(u =>
                          `${u.firstName} ${u.lastName} ${u.role} ${u.departmentId?.departmentName || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return <p className="text-slate-400 text-center py-4 text-[10px]">No staff members found.</p>;
                        }
                        return filtered.map(u => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(u._id);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              selectedEmployeeId === u._id
                                ? 'bg-sky-50 text-sky-850 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="font-bold">{u.firstName} {u.lastName}</p>
                              <span className="text-[9px] text-slate-400 font-medium block">
                                Dept: {u.departmentId?.departmentName || 'Global'}
                              </span>
                            </div>
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              u.role === 'admin' ? 'bg-slate-200 text-slate-800' :
                              u.role === 'manager' ? 'bg-emerald-100 text-emerald-800' :
                              u.role === 'hr' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              {u.role}
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Catalog manage button */}
          {user?.role !== 'employee' && (
            <button
              onClick={() => {
                setEditingSkillId(null);
                setNewSkillName('');
                setNewSkillCategory('Frontend');
                setNewSkillDeptId('');
                setNewSkillDesgId('');
                setShowSkillModal(true);
              }}
              className="bg-sky-700 hover:bg-sky-855 text-white font-bold text-xs p-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Add Skill</span>
            </button>
          )}
        </div>
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Skills Lists (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {Object.keys(skillsByCategory).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Layers size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No skills registered in the catalog for this department/designation.</p>
            </div>
          ) : (
            Object.keys(skillsByCategory).map(catName => (
              <div key={catName} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Layers size={16} className="text-slate-400" />
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider text-[11px]">{catName} Skills</h3>
                </div>

                {skillsByCategory[catName].length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">No active skills in this category catalog.</p>
                ) : (
                  <div className="space-y-4">
                    {skillsByCategory[catName].map(sk => {
                      const record = getEmployeeSkillRecord(sk._id);
                      return (
                        <div key={sk._id} className="flex flex-col md:flex-row justify-between md:items-center bg-slate-50/60 p-4 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-850 text-[12px]">{sk.skillName}</p>
                              
                              {/* Target context badge */}
                              {(() => {
                                const deptName = sk.departmentId?.departmentName || (departments.find(d => d._id === (sk.departmentId?._id || sk.departmentId))?.departmentName);
                                const desgName = sk.designationId?.designationName || (designations.find(ds => ds._id === (sk.designationId?._id || sk.designationId))?.designationName);
                                if (!deptName && !desgName) return null;
                                return (
                                  <span className="text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 bg-slate-200/80 text-slate-655 rounded border border-slate-300/40">
                                    {deptName ? `${deptName}` : ''} {desgName ? `| ${desgName}` : ''}
                                  </span>
                                );
                              })()}

                              {user?.role !== 'employee' && (
                                <div className="flex items-center gap-1.5 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSkill(sk)}
                                    className="text-slate-400 hover:text-sky-600 cursor-pointer transition-colors"
                                    title="Edit Skill Details"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSkill(sk._id)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                    title="Delete Skill"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-slate-400">Validated Status:</span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                record.proficiencyLevel === 5 ? 'bg-amber-100 text-amber-800 border border-amber-250' :
                                record.proficiencyLevel === 4 ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' :
                                record.proficiencyLevel === 3 ? 'bg-sky-100 text-sky-850 border border-sky-250' :
                                record.proficiencyLevel === 2 ? 'bg-indigo-100 text-indigo-800 border border-indigo-250' :
                                record.proficiencyLevel === 1 ? 'bg-slate-100 text-slate-700 border border-slate-250' :
                                'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}>
                                {getProficiencyLabel(record.proficiencyLevel)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 items-center">
                            <div className={`p-2.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[120px] border shadow-3xs transition-all ${
                              selectedEmployeeId === user.id ? 'bg-slate-50 border-slate-200 hover:border-slate-350' : 'bg-slate-100/60 border-slate-150'
                            }`}>
                              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                Self Rating
                                {selectedEmployeeId === user.id && <span className="w-1 h-1 rounded-full bg-sky-500 animate-pulse" />}
                              </span>
                              {renderRatingStars(sk._id, record.selfRating, 'self', selectedEmployeeId === user.id)}
                            </div>

                            <div className={`p-2.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[120px] border shadow-3xs transition-all ${
                              user.role !== 'employee' ? 'bg-slate-50 border-slate-200 hover:border-slate-350' : 'bg-slate-100/60 border-slate-150'
                            }`}>
                              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                Manager Validated
                                {user.role !== 'employee' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              </span>
                              {renderRatingStars(sk._id, record.managerRating, 'manager', user.role !== 'employee')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}

        </div>

        {/* Info Column (Right Column) */}
        <div className="space-y-6">
          
          {/* Skill Coverage Stats Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Activity size={16} className="text-sky-700" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Competency Overview</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Skills</span>
                <p className="text-lg font-black text-slate-700 mt-0.5">{skills.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400">Rated Skills</span>
                <p className="text-lg font-black text-slate-700 mt-0.5">
                  {employeeSkills.filter(es => es.selfRating > 0 || es.managerRating > 0).length}
                </p>
              </div>
            </div>
          </div>

          {/* Proficiency guidelines */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Award size={16} className="text-sky-605" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Proficiency Guidelines</h3>
            </div>
            
            <div className="space-y-3 leading-relaxed text-slate-500">
              <div>
                <p className="font-bold text-slate-705">★☆☆☆☆ (1) - Novice</p>
                <p className="pl-4">Basic knowledge of the core tool/skill with no production implementation experience.</p>
              </div>
              <div>
                <p className="font-bold text-slate-705">★★★☆☆ (3) - Competent</p>
                <p className="pl-4">Can execute typical production sprint tasks independently using best practice methods.</p>
              </div>
              <div>
                <p className="font-bold text-slate-705">★★★★★ (5) - Expert</p>
                <p className="pl-4">Capable of architecting robust systems, leading codebase redesigns, and mentoring others.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Catalog Management Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 p-5 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingSkillId ? 'Modify Catalog Skill' : 'Register Catalog Skill'}
              </h3>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSkill} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Skill Name</label>
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="e.g. React.js, Docker, Negotiation"
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Category Group</label>
                  <input
                    type="text"
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value)}
                    placeholder="e.g. Frontend, Sales Skills, Onboarding"
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Department (Optional)</label>
                  <select
                    value={newSkillDeptId}
                    onChange={(e) => {
                      setNewSkillDeptId(e.target.value);
                      setNewSkillDesgId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-bold"
                  >
                    <option value="">Global / All Departments</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Designation (Optional)</label>
                  <select
                    value={newSkillDesgId}
                    onChange={(e) => setNewSkillDesgId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-bold"
                  >
                    <option value="">All Designations</option>
                    {designations
                      .filter(ds => !newSkillDeptId || ds.departmentId === newSkillDeptId || ds.departmentId?._id === newSkillDeptId)
                      .map(ds => (
                        <option key={ds._id} value={ds._id}>{ds.designationName}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-850 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  {editingSkillId ? 'Update Skill' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingDeleteSkillId}
        title="Delete skill?"
        message="Are you sure you want to delete this skill? It will also remove all employee ratings associated with it."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteSkill}
        onCancel={() => setPendingDeleteSkillId(null)}
      />
    </div>
  );
};

export default SkillMatrix;
