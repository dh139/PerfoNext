import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, CheckCircle2, Star, Layers, Activity, Award, Plus, User, Trash2, Edit } from 'lucide-react';
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

  // Employee Selection (for Manager/HR viewing others)
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id);
  const [employeeProfile, setEmployeeProfile] = useState(null);

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
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setNewSkillName('');
    setNewSkillCategory('Frontend');
    setNewSkillDeptId('');
    setNewSkillDesgId('');
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

        {/* Employee selector for managers / HR */}
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Skills Lists (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {Object.keys(skillsByCategory).map(catName => (
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
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-755 text-[12px]">{sk.skillName}</p>
                            {user?.role !== 'employee' && (
                              <div className="flex items-center gap-1.5 ml-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSkill(sk)}
                                  className="text-slate-400 hover:text-sky-600 cursor-pointer"
                                  title="Edit Skill Details"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSkill(sk._id)}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Delete Skill"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Status: <span className="font-extrabold text-sky-700 uppercase tracking-wider text-[9px]">{getProficiencyLabel(record.proficiencyLevel)}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="bg-white border border-slate-150 p-2 rounded-xl text-center flex flex-col items-center justify-center min-w-[110px] shadow-sm">
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Self Rating</span>
                            {renderRatingStars(sk._id, record.selfRating, 'self', selectedEmployeeId === user.id)}
                          </div>
                          <div className="bg-white border border-slate-150 p-2 rounded-xl text-center flex flex-col items-center justify-center min-w-[110px] shadow-sm">
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Manager Validated</span>
                            {renderRatingStars(sk._id, record.managerRating, 'manager', user.role !== 'employee')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Master Catalog Control (Right Column) */}
        <div className="space-y-6">
          
          {/* Add Skill form for admin / HR */}
          {user?.role !== 'employee' && (
            <form onSubmit={handleAddSkill} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Plus size={16} className={`text-slate-400 transition-transform ${editingSkillId ? 'rotate-45 text-sky-600' : ''}`} />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                  {editingSkillId ? 'Edit Catalog Skill' : 'Register Catalog Skill'}
                </h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Skill Name</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. React.js, Docker, Negotiation"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500"
                  required
                />
              </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Category Group</label>
                 <input
                   type="text"
                   value={newSkillCategory}
                   onChange={(e) => setNewSkillCategory(e.target.value)}
                   placeholder="e.g. Frontend, Sales Skills, Onboarding"
                   className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500"
                   required
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Target Department (Optional)</label>
                 <select
                   value={newSkillDeptId}
                   onChange={(e) => {
                     setNewSkillDeptId(e.target.value);
                     setNewSkillDesgId('');
                   }}
                   className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700 text-xs"
                 >
                   <option value="">Global / All Departments</option>
                   {departments.map(d => (
                     <option key={d._id} value={d._id}>{d.departmentName}</option>
                   ))}
                 </select>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Target Designation (Optional)</label>
                 <select
                   value={newSkillDesgId}
                   onChange={(e) => setNewSkillDesgId(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700 text-xs"
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

              <div className="flex gap-2 pt-2">
                {editingSkillId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors ${editingSkillId ? 'bg-sky-600 hover:bg-sky-700' : 'bg-sky-700 hover:bg-sky-850'}`}
                >
                  {editingSkillId ? 'Update Skill' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          )}

          {/* Quick reference metrics */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Award size={16} className="text-sky-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Proficiency Guidelines</h3>
            </div>
            
            <div className="space-y-3 leading-relaxed text-slate-500">
              <div>
                <p className="font-bold text-slate-700">★☆☆☆☆ (1) - Novice</p>
                <p className="pl-4">Basic knowledge of the core tool/skill with no production implementation experience.</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">★★★☆☆ (3) - Competent</p>
                <p className="pl-4">Can execute typical production sprint tasks independently using best practice methods.</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">★★★★★ (5) - Expert</p>
                <p className="pl-4">Capable of architecting robust systems, leading codebase redesigns, and mentoring others.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

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
