import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, CheckCircle2, Star, Layers, Activity, Award, Plus, User } from 'lucide-react';

const SkillMatrix = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [skills, setSkills] = useState([]);
  const [employeeSkills, setEmployeeSkills] = useState([]);
  
  // HR/Admin Add Skill State
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Frontend');

  // Employee Selection (for Manager/HR viewing others)
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id);

  useEffect(() => {
    fetchSkills();
    fetchEmployeeSkills(selectedEmployeeId);
    if (user?.role !== 'employee') {
      fetchUsers();
    }
  }, [selectedEmployeeId]);

  const fetchSkills = async () => {
    try {
      const res = await api.get('/api/skills');
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
      await api.post('/api/skills', {
        skillName: newSkillName.trim(),
        category: newSkillCategory
      });
      setSuccess('New skill added to master catalog!');
      setNewSkillName('');
      fetchSkills();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add skill.');
    } finally {
      setLoading(false);
    }
  };

  const handleRateSkill = async (skillId, val) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/api/employee-skills', {
        skillId,
        proficiencyLevel: val,
        employeeId: selectedEmployeeId
      });
      setSuccess('Skill proficiency level updated successfully!');
      fetchEmployeeSkills(selectedEmployeeId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update rating.');
    }
  };

  // Group skills by category
  const skillsByCategory = {
    Frontend: [],
    Backend: [],
    Database: [],
    'Cloud & DevOps': [],
    Soft: []
  };

  skills.forEach(skill => {
    const cat = skillsByCategory[skill.category] ? skill.category : 'Soft';
    skillsByCategory[cat].push(skill);
  });

  const getProficiencyRating = (skillId) => {
    const record = employeeSkills.find(es => es.skillId?._id === skillId || es.skillId === skillId);
    return record ? record.proficiencyLevel : 0;
  };

  const renderRatingStars = (skillId, currentVal) => {
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(val => (
          <button
            key={val}
            onClick={() => handleRateSkill(skillId, val)}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title={`${val === 1 ? 'Novice' : val === 3 ? 'Intermediate' : val === 5 ? 'Expert' : `Level ${val}`}`}
          >
            <Star
              size={18}
              className={val <= currentVal ? 'fill-sky-500 text-sky-500' : 'text-slate-200 hover:text-slate-300'}
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
                    const rating = getProficiencyRating(sk._id);
                    return (
                      <div key={sk._id} className="flex justify-between items-center bg-slate-50/60 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-750 text-[12px]">{sk.skillName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Proficiency: <span className="font-semibold text-slate-650">{getProficiencyLabel(rating)}</span></p>
                        </div>
                        {renderRatingStars(sk._id, rating)}
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
                <Plus size={16} className="text-slate-400" />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Register Catalog Skill</h3>
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
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700"
                  required
                >
                  <option value="Frontend">Frontend Development</option>
                  <option value="Backend">Backend Development</option>
                  <option value="Database">Database Management</option>
                  <option value="Cloud & DevOps">Cloud & DevOps Infrastructure</option>
                  <option value="Soft">Soft & Advisory Skills</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-700 hover:bg-sky-850 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer"
              >
                Add to Master Catalog
              </button>
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

    </div>
  );
};

export default SkillMatrix;
