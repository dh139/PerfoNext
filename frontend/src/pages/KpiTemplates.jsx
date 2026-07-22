import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from '../store/toastStore';

const KpiTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">KPI Evaluation Templates</h2>
          <p className="text-xs text-slate-500 mt-1">Manage core KPI metrics and question banks for reviews</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-colors"
        >
          <Plus size={16} />
          <span>New Template</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Templates Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(t => (
          <div key={t._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{t.templateName}</h4>
                  <span className={`inline-block text-[9px] font-extrabold uppercase mt-1 px-2 py-0.5 rounded ${
                    t.departmentId ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {t.departmentId ? `Dept: ${t.departmentId.departmentName}` : 'Org-Wide'}
                  </span>
                </div>
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                  t.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400'
                }`}>
                  {t.status}
                </span>
              </div>

              {/* Items Summary list */}
              <div className="space-y-2 mt-4">
                <span className="text-[9px] uppercase font-bold text-slate-400">Grading Metrics ({t.items.length})</span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-600 pr-1">
                  {t.items.map((item, idx) => (
                    <div key={item._id || idx} className="bg-slate-50 border border-slate-150 p-2 rounded-lg flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-700 truncate">{item.kpiName}</span>
                      <span className="text-[9px] font-extrabold bg-white border px-1.5 py-0.2 rounded shrink-0">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
              <div>
                <span>Author: {t.createdBy?.firstName} {t.createdBy?.lastName}</span>
                <span className="block mt-0.5">Updated: {new Date(t.updatedAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={() => handleOpenEdit(t)}
                className="text-sky-700 hover:text-sky-850 font-bold border border-sky-100 hover:bg-sky-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px]"
              >
                Edit Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Creation Modal View */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                {editTemplate ? 'Modify KPI Template' : 'Design Evaluation Template'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold">Close</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Sales Q3 KPI Template"
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-sky-500 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Department Specific (Optional)</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-sky-500 text-slate-700"
                  >
                    <option value="">Organization-wide template (All Departments)</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Items Builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Evaluation Questions</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-[10px] font-bold text-sky-700 hover:bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <Plus size={12} />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">KPI Metric Name</label>
                          <input
                            type="text"
                            value={item.kpiName}
                            onChange={(e) => handleItemChange(idx, 'kpiName', e.target.value)}
                            placeholder="e.g. Code Review Velocity"
                            className="w-full bg-white border border-slate-200 text-xs p-2.5 rounded-lg outline-none focus:border-sky-500 text-slate-800 font-semibold"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Category Mapping</label>
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                            className="w-full bg-white border border-slate-200 text-xs p-2.5 rounded-lg outline-none focus:border-sky-500 text-slate-700"
                          >
                            <option value="quality">Work Quality</option>
                            <option value="productivity">Productivity</option>
                            <option value="technical">Technical Skills</option>
                            <option value="communication">Communication</option>
                            <option value="ownership">Ownership</option>
                            <option value="learning">Learning & Growth</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Weight factor</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={item.weight}
                            onChange={(e) => handleItemChange(idx, 'weight', parseFloat(e.target.value) || 1)}
                            className="w-full bg-white border border-slate-200 text-xs p-2.5 rounded-lg outline-none focus:border-sky-500 text-slate-800"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">KPI Description</label>
                        <textarea
                          rows="2"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Conducts thorough and constructive code reviews..."
                          className="w-full bg-white border border-slate-200 text-xs p-2.5 rounded-lg outline-none focus:border-sky-500 text-slate-600 resize-none"
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  {editTemplate ? 'Save Template Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiTemplates;
