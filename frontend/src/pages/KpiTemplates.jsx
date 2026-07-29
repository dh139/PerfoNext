import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from '../store/toastStore';
import ConfirmModal from '../components/ConfirmModal';

const KpiTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState(null);

  const handleDeleteTemplate = (id, name) => {
    setPendingDeleteTemplate({ id, name });
  };

  const confirmDeleteTemplate = async () => {
    if (!pendingDeleteTemplate) return;
    const { id } = pendingDeleteTemplate;
    setPendingDeleteTemplate(null);
    try {
      setError('');
      const res = await api.delete(`/api/kpi-templates/${id}`);
      toast.success(res.data.message || 'KPI Template deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete KPI Template.');
    }
  };

  // Form State
  const [editTemplate, setEditTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [items, setItems] = useState([
    { kpiName: '', category: 'quality', weight: 1, description: '' }
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleOpenCreate = () => {
    setError('');
    setEditTemplate(null);
    setTemplateName('');
    setDepartmentId('');
    setItems([{ kpiName: '', category: 'quality', weight: 1, description: '' }]);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (t) => {
    setError('');
    setEditTemplate(t);
    setTemplateName(t.templateName);
    setDepartmentId(t.departmentId?._id || t.departmentId || '');
    setItems(t.items.map(item => ({
      kpiName: item.kpiName,
      category: item.category,
      weight: item.weight,
      description: item.description || ''
    })));
    setShowCreateModal(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const tempRes = await api.get('/api/kpi-templates');
      setTemplates(tempRes.data);

      const deptRes = await api.get('/api/departments');
      setDepartments(deptRes.data.filter(d => d.status === 'active'));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch KPI template details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { kpiName: '', category: 'quality', weight: 1, description: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!templateName.trim()) {
      setError('Template name is required.');
      return;
    }

    const invalidItem = items.find(item => !item.kpiName.trim());
    if (invalidItem) {
      setError('Please fill out the KPI Name for all questionnaire rows.');
      return;
    }

    try {
      const payload = {
        templateName,
        departmentId: departmentId || null,
        items
      };

      if (editTemplate) {
        await api.patch(`/api/kpi-templates/${editTemplate._id}`, payload);
        toast.success('KPI Template updated successfully!');
      } else {
        await api.post('/api/kpi-templates', payload);
        toast.success('KPI Template created successfully!');
      }

      // Reset Form
      setTemplateName('');
      setDepartmentId('');
      setItems([{ kpiName: '', category: 'quality', weight: 1, description: '' }]);
      setEditTemplate(null);
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save template.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.templateName.toLowerCase().includes(searchTerm.toLowerCase());
    const tDeptId = t.departmentId?._id || t.departmentId;
    const matchesDept = deptFilter === 'all' || (deptFilter === 'org' ? !tDeptId : tDeptId === deptFilter);
    return matchesSearch && matchesDept;
  });

  const totalTemplatesCount = templates.length;
  const orgWideCount = templates.filter(t => !t.departmentId).length;
  const deptSpecificCount = templates.filter(t => t.departmentId).length;
  const totalMetricsCount = templates.reduce((acc, t) => acc + (t.items?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30 tracking-wider">
                Rubric Desk
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Active Cycle Pairing Engine
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              KPI Evaluation Templates Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Configure standardized performance benchmarks, question banks, & department grading rubrics.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Create New Template</span>
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Templates</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalTemplatesCount}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Standard rubrics</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Org-Wide Templates</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{orgWideCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Global evaluation</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dept Specific</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{deptSpecificCount}</h2>
              <span className="text-[9px] text-indigo-400 font-medium">Specialized rubrics</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Questions</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{totalMetricsCount}</h2>
              <span className="text-[9px] text-amber-400 font-medium">KPI metrics configured</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <CheckCircle2 size={20} />
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

      {/* Templates Catalog Workbench */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>Active Rubrics & Questionnaires</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold border border-sky-100">
                {filteredTemplates.length} Available
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Departments</option>
              <option value="org">Org-Wide Only</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.departmentName}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search template name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none w-full sm:w-56 font-medium"
            />
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
            <AlertCircle className="mx-auto text-slate-300" size={36} />
            <p className="text-slate-500 font-bold text-xs">No evaluation templates found matching your query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((t) => (
              <div key={t._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          !t.departmentId ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}>
                          {!t.departmentId ? 'ORG-WIDE' : `DEPT: ${t.departmentId?.departmentName || 'Specialized'}`}
                        </span>
                        <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {t.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-1">{t.templateName}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shadow-3xs"
                      >
                        <span>Edit Rubric</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t._id, t.templateName)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shadow-3xs"
                        title="Delete Template"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Grading Metrics ({t.items?.length || 0})
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {t.items?.map((item, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200/70 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{item.kpiName}</span>
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>Author: <strong className="text-slate-700">{t.createdBy?.firstName ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : 'System Admin'}</strong></span>
                  <span>Updated: {new Date(t.updatedAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-4 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editTemplate ? 'Modify KPI Template Rubric' : 'Create New KPI Evaluation Template'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4">
              <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Template Title *</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Engineering Leadership Performance Template"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-800 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Target Department (Optional)</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-sky-500 text-slate-700 font-medium cursor-pointer"
                    >
                      <option value="">Org-Wide (All Departments)</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">KPI Metric Items & Questions</span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-sky-700 font-bold text-xs hover:text-sky-900 cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Metric Row
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 relative">
                      <div className="flex justify-between items-center gap-2">
                        <input
                          type="text"
                          value={item.kpiName}
                          onChange={(e) => handleItemChange(idx, 'kpiName', e.target.value)}
                          placeholder={`Metric ${idx + 1} Name (e.g. Code Quality, Team Leadership...)`}
                          className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 outline-none"
                          required
                        />

                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                          className="bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="quality">Quality</option>
                          <option value="productivity">Productivity</option>
                          <option value="technical">Technical</option>
                          <option value="communication">Communication</option>
                          <option value="leadership">Leadership</option>
                        </select>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Detailed scoring criteria or expectations for this metric..."
                        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-slate-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-850 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  {editTemplate ? 'Update Rubric' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteTemplate && (
        <ConfirmModal
          open={!!pendingDeleteTemplate}
          title="Delete KPI Template"
          message={`Are you sure you want to delete the KPI Template "${pendingDeleteTemplate.name}"? This action cannot be undone.`}
          confirmLabel="Delete Template"
          onConfirm={confirmDeleteTemplate}
          onCancel={() => setPendingDeleteTemplate(null)}
        />
      )}

    </div>
  );
};

export default KpiTemplates;
