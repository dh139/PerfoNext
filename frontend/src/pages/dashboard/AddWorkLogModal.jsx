import React, { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../store/toastStore';

const AddWorkLogModal = ({ isOpen, onClose, user, deptId, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('Development');
  const [hoursSpent, setHoursSpent] = useState('');
  const [resultSummary, setResultSummary] = useState('');
  const [evidenceType, setEvidenceType] = useState('Screenshot');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [formTemplate, setFormTemplate] = useState(null);
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !deptId) return;
    const fetchTemplate = async () => {
      try {
        const res = await api.get(`/api/work-journal-templates/department/${deptId}`);
        if (res.data) {
          setFormTemplate(res.data);
          if (res.data.categories && res.data.categories.length > 0) {
            setCategory(res.data.categories[0].name);
          }
          if (res.data.evidenceTypes && res.data.evidenceTypes.length > 0) {
            setEvidenceType(res.data.evidenceTypes[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load template:', err);
      }
    };
    fetchTemplate();
  }, [isOpen, deptId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !title.trim()) {
      toast.error('Achievement Title is required.');
      return;
    }
    if (!category || !category.trim()) {
      toast.error('Category is required.');
      return;
    }
    if (!project || !project.trim()) {
      toast.error(`${formTemplate?.projectLabel || 'Project / Client / Account name'} is required.`);
      return;
    }
    if (!hoursSpent || isNaN(Number(hoursSpent)) || Number(hoursSpent) <= 0) {
      toast.error('Hours Spent is required and must be a positive number.');
      return;
    }
    if (!resultSummary || !resultSummary.trim()) {
      toast.error(`${formTemplate?.summaryLabel || 'Work Summary'} is required.`);
      return;
    }
    if (!evidenceRef || !evidenceRef.trim()) {
      toast.error(`${formTemplate?.evidenceRefLabel || 'Proof Link / Reference ID'} is required.`);
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('project', project);
      formData.append('category', category);
      formData.append('hoursSpent', hoursSpent);
      formData.append('resultSummary', resultSummary);
      formData.append('evidenceType', evidenceType);
      formData.append('evidenceRef', evidenceRef);
      formData.append('completedDate', completedDate);
      formData.append('customFieldsData', JSON.stringify(customFieldsData));

      if (screenshotFile) {
        formData.append('file', screenshotFile);
      }

      await api.post('/api/work-journal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Daily Work Log submitted for manager verification!');
      
      // Reset state
      setTitle('');
      setProject('');
      setCategory('Development');
      setHoursSpent('');
      setResultSummary('');
      setEvidenceRef('');
      setScreenshotFile(null);
      setImagePreviewUrl('');
      setCustomFieldsData({});
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit work log.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const CATEGORIES = [
    'Development',
    'Testing',
    'Bug Fix',
    'Architecture',
    'Code Review',
    'Documentation',
    'Deployment',
    'Client Support',
    'Process Improvement',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 border border-slate-100 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 rounded-lg text-sky-700">
              <ClipboardList size={16} />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Log Daily Work Achievement</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-605 font-bold cursor-pointer text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {formTemplate?.titleLabel || 'Achievement Title'} *
            </label>
            <input
              type="text"
              placeholder={formTemplate?.titlePlaceholder || 'e.g. Conducted client pitch meeting...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-850 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {formTemplate?.projectLabel || 'Project / Module'} *
              </label>
              <input
                type="text"
                placeholder={formTemplate?.projectPlaceholder || 'e.g. Enterprise Client / System'}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-855 outline-none cursor-pointer focus:border-sky-500"
                required
              >
                {(formTemplate?.categories && formTemplate.categories.length > 0 
                  ? formTemplate.categories.map(c => c.name) 
                  : CATEGORIES
                ).map(catName => (
                  <option key={catName} value={catName}>{catName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Date Completed *</label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-855 outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Hours Spent *</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 3.5"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {formTemplate?.summaryLabel || 'Work Summary & Output Result'} *
            </label>
            <textarea
              rows="3"
              placeholder={formTemplate?.summaryPlaceholder || 'Summarize what was delivered...'}
              value={resultSummary}
              onChange={(e) => setResultSummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-850 outline-none focus:border-sky-500"
              required
            ></textarea>
          </div>

          {formTemplate?.customFields && formTemplate.customFields.length > 0 && (
            <div className="space-y-3 bg-sky-50/50 p-3 rounded-xl border border-sky-100">
              <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider block">
                {formTemplate.departmentId?.departmentName || 'Department'} Custom Questions
              </span>
              {formTemplate.customFields.map((field) => (
                <div key={field.fieldKey} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                  </label>
                  {field.fieldType === 'select' ? (
                    <select
                      value={customFieldsData[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                      required={field.required}
                    >
                      <option value="">-- Select Option --</option>
                      {field.options?.map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.fieldType === 'textarea' ? (
                    <textarea
                      rows={2}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={customFieldsData[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-855 outline-none focus:border-sky-500"
                      required={field.required}
                    />
                  ) : (
                    <input
                      type={field.fieldType === 'number' ? 'number' : field.fieldType === 'url' ? 'url' : 'text'}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={customFieldsData[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-855 outline-none cursor-pointer focus:border-sky-500"
              >
                {(formTemplate?.evidenceTypes && formTemplate.evidenceTypes.length > 0
                  ? formTemplate.evidenceTypes
                  : ['Screenshot Upload', 'Github PR / Commit', 'Jira / Task Ticket', 'Document / Doc Link', 'Client Email / Approval']
                ).map((evType, evIdx) => (
                  <option key={evIdx} value={evType}>{evType}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {formTemplate?.evidenceRefLabel || 'Proof Link / Reference ID'} *
              </label>
              <input
                type="text"
                placeholder={formTemplate?.evidenceRefPlaceholder || 'e.g. URL or Doc Ref'}
                value={evidenceRef}
                onChange={(e) => setEvidenceRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-855 outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Screenshot Proof (Optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs cursor-pointer outline-none focus:border-sky-500"
            />
            {imagePreviewUrl && (
              <div className="mt-2 relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 max-h-36 flex justify-center items-center">
                <img src={imagePreviewUrl} alt="Preview" className="max-h-32 object-contain" />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black cursor-pointer shadow-md transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWorkLogModal;
