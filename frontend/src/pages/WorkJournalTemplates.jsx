import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { Building, Plus, Trash2, Save, RotateCcw, Eye, Sparkles, CheckCircle2, AlertCircle, FileText, ListFilter, HelpCircle, Edit3, Check, X } from 'lucide-react';
import { toast } from '../store/toastStore';

const WorkJournalTemplates = () => {
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Template State
  const [templateId, setTemplateId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [isDefault, setIsDefault] = useState(false);

  // Department-Tailored Placeholders & Labels
  const [titleLabel, setTitleLabel] = useState('Achievement Title');
  const [titlePlaceholder, setTitlePlaceholder] = useState('');
  const [projectLabel, setProjectLabel] = useState('Project / Account');
  const [projectPlaceholder, setProjectPlaceholder] = useState('');
  const [summaryLabel, setSummaryLabel] = useState('Work Summary & Output Result');
  const [summaryPlaceholder, setSummaryPlaceholder] = useState('');
  const [evidenceRefLabel, setEvidenceRefLabel] = useState('Proof Link / Reference ID');
  const [evidenceRefPlaceholder, setEvidenceRefPlaceholder] = useState('');
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [newEvTypeName, setNewEvTypeName] = useState('');

  // Category Edit State
  const [newCatName, setNewCatName] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState(-1);
  const [editingCatName, setEditingCatName] = useState('');

  // Custom Field Form & Edit State
  const [editingFieldIndex, setEditingFieldIndex] = useState(-1);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/departments');
      const depts = res.data || [];
      setDepartments(depts);
      if (depts.length > 0) {
        setSelectedDeptId(depts[0]._id);
        fetchTemplateForDept(depts[0]._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateForDept = async (deptId) => {
    try {
      setLoading(true);
      cancelEditCustomField();
      setEditingCatIndex(-1);
      const res = await api.get(`/api/work-journal-templates/department/${deptId}`);
      const t = res.data;
      setTemplateId(t._id || '');
      setFormTitle(t.formTitle || 'Daily Work Journal');
      setFormDescription(t.formDescription || '');
      setTitleLabel(t.titleLabel || 'Achievement Title');
      setTitlePlaceholder(t.titlePlaceholder || 'e.g. Completed daily output task...');
      setProjectLabel(t.projectLabel || 'Project / Account');
      setProjectPlaceholder(t.projectPlaceholder || 'e.g. Enterprise Client / System');
      setSummaryLabel(t.summaryLabel || 'Work Summary & Output Result');
      setSummaryPlaceholder(t.summaryPlaceholder || 'Summarize deliverables and outcomes achieved...');
      setEvidenceRefLabel(t.evidenceRefLabel || 'Proof Link / Reference ID');
      setEvidenceRefPlaceholder(t.evidenceRefPlaceholder || 'e.g. PR#142, Quote #, or Doc URL');
      setEvidenceTypes(t.evidenceTypes && t.evidenceTypes.length > 0 ? t.evidenceTypes : ['Screenshot Upload', 'Document Link', 'Client Email / Approval']);
      setCategories(t.categories || []);
      setCustomFields(t.customFields || []);
      setIsDefault(!!t.isDefault);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load department form template.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidenceType = () => {
    if (!newEvTypeName.trim()) return;
    if (evidenceTypes.some(e => e.toLowerCase() === newEvTypeName.trim().toLowerCase())) {
      toast.error('Evidence type already exists.');
      return;
    }
    setEvidenceTypes([...evidenceTypes, newEvTypeName.trim()]);
    setNewEvTypeName('');
  };

  const handleRemoveEvidenceType = (index) => {
    if (evidenceTypes.length <= 1) {
      toast.error('At least one evidence type is required.');
      return;
    }
    setEvidenceTypes(evidenceTypes.filter((_, idx) => idx !== index));
  };

  const handleDeptSelect = (deptId) => {
    setSelectedDeptId(deptId);
    fetchTemplateForDept(deptId);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      toast.error('Category already exists.');
      return;
    }
    setCategories([...categories, { name: newCatName.trim(), description: '' }]);
    setNewCatName('');
  };

  const startEditCategory = (index) => {
    setEditingCatIndex(index);
    setEditingCatName(categories[index].name);
  };

  const saveEditCategory = (index) => {
    if (!editingCatName.trim()) return;
    const updated = [...categories];
    updated[index].name = editingCatName.trim();
    setCategories(updated);
    setEditingCatIndex(-1);
    setEditingCatName('');
  };

  const handleRemoveCategory = (index) => {
    if (categories.length <= 1) {
      toast.error('At least one category is required.');
      return;
    }
    setCategories(categories.filter((_, idx) => idx !== index));
    if (editingCatIndex === index) setEditingCatIndex(-1);
  };

  const startEditCustomField = (index) => {
    const f = customFields[index];
    setEditingFieldIndex(index);
    setNewFieldLabel(f.label || '');
    setNewFieldType(f.fieldType || 'text');
    setNewFieldOptions(Array.isArray(f.options) ? f.options.join(', ') : '');
    setNewFieldPlaceholder(f.placeholder || '');
    setNewFieldRequired(!!f.required);
  };

  const cancelEditCustomField = () => {
    setEditingFieldIndex(-1);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setNewFieldPlaceholder('');
    setNewFieldRequired(false);
  };

  const handleSaveOrUpdateCustomField = () => {
    if (!newFieldLabel.trim()) {
      toast.error('Field label / question is required.');
      return;
    }

    const fieldKey = newFieldLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const optionsArray = newFieldType === 'select' 
      ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const fieldData = {
      label: newFieldLabel.trim(),
      fieldKey,
      fieldType: newFieldType,
      options: optionsArray,
      placeholder: newFieldPlaceholder.trim(),
      required: newFieldRequired
    };

    if (editingFieldIndex !== -1) {
      const updatedList = [...customFields];
      updatedList[editingFieldIndex] = fieldData;
      setCustomFields(updatedList);
      toast.success(`Updated question: "${fieldData.label}"`);
      cancelEditCustomField();
    } else {
      if (customFields.some(f => f.fieldKey === fieldKey)) {
        toast.error('Field label already exists.');
        return;
      }
      setCustomFields([...customFields, fieldData]);
      toast.success(`Added custom question: "${fieldData.label}"`);
      cancelEditCustomField();
    }
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields(customFields.filter((_, idx) => idx !== index));
    if (editingFieldIndex === index) cancelEditCustomField();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        departmentId: selectedDeptId,
        formTitle,
        formDescription,
        titleLabel,
        titlePlaceholder,
        projectLabel,
        projectPlaceholder,
        summaryLabel,
        summaryPlaceholder,
        evidenceRefLabel,
        evidenceRefPlaceholder,
        evidenceTypes,
        categories,
        customFields,
        isActive: true
      };

      const res = await api.post('/api/work-journal-templates', payload);
      setTemplateId(res.data._id);
      setIsDefault(false);
      toast.success('Department Work Journal Form saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save form template.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (isDefault || !templateId || templateId.startsWith('default-')) {
      toast.info('Template is already using department defaults.');
      return;
    }
    try {
      setSaving(true);
      await api.delete(`/api/work-journal-templates/${templateId}`);
      toast.success('Form template reset to default!');
      fetchTemplateForDept(selectedDeptId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset template.');
    } finally {
      setSaving(false);
    }
  };

  const selectedDeptObj = departments.find(d => d._id === selectedDeptId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles size={14} />
            <span>CEO Desk</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Daily Work Log Templates</h1>
          <p className="text-slate-400 text-xs mt-1">Create, edit & manage department-specific daily work log templates (Engineering preserved 100%).</p>
        </div>

        <div className="flex items-center gap-3">
          {!isDefault && (
            <button
              onClick={handleResetToDefault}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span>Reset Default</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Form Template'}</span>
          </button>
        </div>
      </div>

      {/* Department Selector Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 overflow-x-auto">
        <span className="text-xs font-bold uppercase text-slate-400 shrink-0 flex items-center gap-1.5 px-2">
          <Building size={14} className="text-sky-400" />
          <span>Department:</span>
        </span>
        <div className="flex items-center gap-2 flex-nowrap">
          {departments.map(dept => (
            <button
              key={dept._id}
              onClick={() => handleDeptSelect(dept._id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                selectedDeptId === dept._id
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {dept.departmentName}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading department form configuration...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Configuration Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Form Info Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={16} className="text-sky-400" />
                  <span>Form Settings for {selectedDeptObj?.departmentName}</span>
                </h3>
                {isDefault && (
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Using Smart Defaults
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Form Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  placeholder="e.g. Sales Daily Achievement Log"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Form Description / Instructions</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  placeholder="Instructions for employees when submitting daily work..."
                />
              </div>
            </div>

            {/* Base Question Labels & Placeholders Customization Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 size={16} className="text-sky-400" />
                  <span>Base Question Labels & Placeholders</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Edit exact question labels & placeholder hints for {selectedDeptObj?.departmentName}.</p>
              </div>

              {/* Title Field Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Title Question Label</label>
                  <input
                    type="text"
                    value={titleLabel}
                    onChange={(e) => setTitleLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Title Placeholder Hint</label>
                  <input
                    type="text"
                    value={titlePlaceholder}
                    onChange={(e) => setTitlePlaceholder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Project / Account Field Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Project / Account Label</label>
                  <input
                    type="text"
                    value={projectLabel}
                    onChange={(e) => setProjectLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Project / Account Placeholder</label>
                  <input
                    type="text"
                    value={projectPlaceholder}
                    onChange={(e) => setProjectPlaceholder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Work Summary Field Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Work Summary Label</label>
                  <input
                    type="text"
                    value={summaryLabel}
                    onChange={(e) => setSummaryLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Work Summary Placeholder</label>
                  <input
                    type="text"
                    value={summaryPlaceholder}
                    onChange={(e) => setSummaryPlaceholder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Proof Link / Ref Field Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Proof Link / Ref Label</label>
                  <input
                    type="text"
                    value={evidenceRefLabel}
                    onChange={(e) => setEvidenceRefLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Proof Link / Ref Placeholder</label>
                  <input
                    type="text"
                    value={evidenceRefPlaceholder}
                    onChange={(e) => setEvidenceRefPlaceholder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Allowed Evidence Types Builder Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText size={16} className="text-sky-400" />
                    <span>Allowed Evidence Types ({evidenceTypes.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize evidence dropdown options for {selectedDeptObj?.departmentName} (e.g. CRM Link, Contract, Invoice Copy).</p>
                </div>
              </div>

              {/* Evidence Type Pills */}
              <div className="flex flex-wrap gap-2">
                {evidenceTypes.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-200">
                    <span>{ev}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidenceType(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
                      title="Remove Evidence Type"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Evidence Type */}
              <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={newEvTypeName}
                  onChange={(e) => setNewEvTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEvidenceType())}
                  placeholder={`Add new evidence option (e.g. ${selectedDeptObj?.departmentName === 'Sales' ? 'Signed Contract' : 'Voucher Copy'})...`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddEvidenceType}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              </div>
            </div>

            {/* Department Categories Builder */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ListFilter size={16} className="text-sky-400" />
                    <span>Work Categories ({categories.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click edit or trash to customize categories for {selectedDeptObj?.departmentName}.</p>
                </div>
              </div>

              {/* Category Pills with Inline Editing */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-200">
                    {editingCatIndex === idx ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditCategory(idx)}
                          className="bg-slate-900 border border-sky-500 px-2 py-0.5 text-xs text-white rounded outline-none w-28"
                          autoFocus
                        />
                        <button type="button" onClick={() => saveEditCategory(idx)} className="text-emerald-400 hover:text-emerald-300">
                          <Check size={12} />
                        </button>
                        <button type="button" onClick={() => setEditingCatIndex(-1)} className="text-slate-500 hover:text-slate-300">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{cat.name}</span>
                        <button
                          type="button"
                          onClick={() => startEditCategory(idx)}
                          className="text-slate-500 hover:text-sky-400 transition-colors ml-1"
                          title="Rename Category"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Category */}
              <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  placeholder={`Add new category (e.g. ${selectedDeptObj?.departmentName === 'Sales' ? 'Client Demo' : 'Feature Coding'})...`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Category</span>
                </button>
              </div>
            </div>

            {/* Custom Dynamic Fields Builder */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-sky-400" />
                    <span>Custom Department Questions ({customFields.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Edit or add questions (e.g. Deal Value, Client Name, Ticket ID, Voucher #).</p>
                </div>
              </div>

              {/* List of Custom Fields */}
              {customFields.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 italic">No custom questions added. Standard achievement fields will be used.</div>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      editingFieldIndex === idx ? 'bg-sky-950/60 border-sky-500/60' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{field.label}</span>
                          <span className="text-[9px] font-mono uppercase bg-slate-800 text-sky-300 px-2 py-0.5 rounded-full border border-slate-700">
                            {field.fieldType}
                          </span>
                          {field.required && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Required</span>
                          )}
                        </div>
                        {field.placeholder && <p className="text-[10px] text-slate-500 mt-0.5">Placeholder: "{field.placeholder}"</p>}
                        {field.options && field.options.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">Options: {field.options.join(', ')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditCustomField(idx)}
                          className="text-slate-400 hover:text-sky-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit Custom Field Form */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-sky-400">
                    {editingFieldIndex !== -1 ? `Edit Question #${editingFieldIndex + 1}` : `Add Custom Question to ${selectedDeptObj?.departmentName} Form`}
                  </h4>
                  {editingFieldIndex !== -1 && (
                    <button
                      type="button"
                      onClick={cancelEditCustomField}
                      className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Field Label / Question *</label>
                    <input
                      type="text"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="e.g. Client Name or Deal Value (RS)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Field Input Type</label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="text">Text Input</option>
                      <option value="number">Number Input</option>
                      <option value="select">Dropdown Select</option>
                      <option value="textarea">Textarea (Long Text)</option>
                      <option value="url">URL Link</option>
                    </select>
                  </div>
                </div>

                {newFieldType === 'select' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dropdown Options (Comma Separated)</label>
                    <input
                      type="text"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      placeholder="e.g. Prospecting, Qualified, Closed Won, Closed Lost"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Input Placeholder</label>
                    <input
                      type="text"
                      value={newFieldPlaceholder}
                      onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                      placeholder="e.g. Enter client or company name..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="reqCheck"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
                    />
                    <label htmlFor="reqCheck" className="text-xs text-slate-300 cursor-pointer">Mark as Required Field</label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  {editingFieldIndex !== -1 && (
                    <button
                      type="button"
                      onClick={cancelEditCustomField}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveOrUpdateCustomField}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>{editingFieldIndex !== -1 ? 'Update Question' : 'Add Custom Question'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Employee Form Live Preview Column (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <Eye size={16} className="text-emerald-400" />
                  <span>Employee Form Live Preview</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {selectedDeptObj?.departmentName} View
                </span>
              </div>

              {/* Preview Container Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
                <div>
                  <h4 className="text-sm font-black text-white">{formTitle || 'Daily Work Journal'}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formDescription || 'Log your daily achievements.'}</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{titleLabel || 'Achievement Title'} *</label>
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 italic">
                    {titlePlaceholder || 'e.g. Completed daily output task...'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{projectLabel || 'Project / Account'}</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 italic">
                      {projectPlaceholder || 'e.g. Enterprise Client'}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Category *</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none">
                      {categories.map((c, i) => (
                        <option key={i}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date Completed *</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
                      02/08/2026
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hours Spent</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 italic">
                      e.g. 3.5
                    </div>
                  </div>
                </div>

                {/* Render Dynamic Custom Fields in Live Preview */}
                {customFields.length > 0 && (
                  <div className="space-y-2 bg-sky-950/40 p-2.5 rounded-xl border border-sky-900/50 my-2">
                    <span className="text-[9px] font-black uppercase text-sky-400 block">Custom Department Questions</span>
                    {customFields.map((field, idx) => (
                      <div key={idx}>
                        <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1 flex items-center justify-between">
                          <span>{field.label} {field.required && <span className="text-rose-400">*</span>}</span>
                        </label>
                        {field.fieldType === 'select' ? (
                          <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none">
                            <option value="">-- Select Option --</option>
                            {field.options.map((opt, oIdx) => (
                              <option key={oIdx}>{opt}</option>
                            ))}
                          </select>
                        ) : field.fieldType === 'textarea' ? (
                          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-500 italic min-h-[45px]">
                            {field.placeholder || 'Enter details...'}
                          </div>
                        ) : (
                          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-500 italic">
                            {field.placeholder || `Enter ${field.label}...`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{summaryLabel || 'Work Summary & Output Result'}</label>
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 italic min-h-[50px]">
                    {summaryPlaceholder || 'Summarize deliverables and outcomes achieved...'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Evidence Type</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none">
                      {evidenceTypes.map((ev, i) => (
                        <option key={i}>{ev}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{evidenceRefLabel || 'Proof Link / Reference ID'}</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-500 italic">
                      {evidenceRefPlaceholder || 'e.g. URL or Doc Ref'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Upload Screenshot Proof (Optional)</label>
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-500 italic">
                    Choose File No file chosen
                  </div>
                </div>

                <div className="pt-2">
                  <div className="w-full bg-sky-500 text-white font-bold py-2.5 text-center text-xs rounded-xl shadow-md">
                    Submit for Verification
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkJournalTemplates;
