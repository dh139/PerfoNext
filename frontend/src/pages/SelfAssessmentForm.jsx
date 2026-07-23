import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AlertCircle, Save, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from '../store/toastStore';

const SelfAssessmentForm = () => {
  const { cycleId } = useParams();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [scores, setScores] = useState({}); // { kpiItemId: score }
  const [comments, setComments] = useState({}); // { kpiItemId: comment }
  const [errors, setErrors] = useState({}); // { kpiItemId: errorString }
  
  const [assessmentStatus, setAssessmentStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch cycle details
        const cycleRes = await api.get(`/api/review-cycles/${cycleId}`);
        setCycle(cycleRes.data);
        
        const items = cycleRes.data.kpiTemplateId?.items || [];
        setTemplateItems(items);

        // 2. Fetch existing self assessment
        const assessmentRes = await api.get(`/api/self-assessments?reviewCycleId=${cycleId}`);
        const existing = assessmentRes.data[0]; // Filtered by cycle

        if (existing) {
          setAssessmentStatus(existing.status);
          
          // Pre-populate scores and comments
          const initialScores = {};
          const initialComments = {};
          existing.details.forEach(detail => {
            initialScores[detail.kpiItemId] = detail.score;
            initialComments[detail.kpiItemId] = detail.comment || '';
          });
          setScores(initialScores);
          setComments(initialComments);

          if (existing.status === 'submitted') {
            setGeneralError('This self-assessment has already been submitted and cannot be modified.');
          }
        }
      } catch (err) {
        console.error(err);
        setGeneralError('Failed to load review cycle questions.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cycleId]);

  const handleScoreChange = (itemId, val) => {
    if (assessmentStatus === 'submitted') return;
    setScores({ ...scores, [itemId]: val });
    
    // Clear validation error if any
    if (errors[itemId]) {
      setErrors({ ...errors, [itemId]: '' });
    }
  };

  const handleCommentChange = (itemId, val) => {
    if (assessmentStatus === 'submitted') return;
    setComments({ ...comments, [itemId]: val });
    
    // Clear validation error if any
    if (errors[itemId]) {
      setErrors({ ...errors, [itemId]: '' });
    }
  };

  const validateForm = (isSubmit) => {
    const newErrors = {};
    let isValid = true;

    templateItems.forEach(item => {
      const score = scores[item._id];
      const comment = comments[item._id] || '';

      if (isSubmit) {
        if (!score) {
          newErrors[item._id] = 'Score is required.';
          isValid = false;
        }
        if (!comment.trim()) {
          newErrors[item._id] = 'Justification comment is mandatory.';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async (submitType) => {
    if (assessmentStatus === 'submitted') return;
    
    const isSubmit = submitType === 'submitted';
    
    if (!validateForm(isSubmit)) {
      setGeneralError('Please resolve all validation errors in the questionnaire before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setGeneralError('');

      const details = templateItems.map(item => ({
        category: item.category,
        kpiItemId: item._id.toString(),
        score: scores[item._id] || 3, // Default score to 3 on draft if not set
        comment: comments[item._id] || ''
      }));

      await api.post('/api/self-assessments', {
        reviewCycleId: cycleId,
        details,
        status: submitType
      });

      if (isSubmit) {
        setAssessmentStatus('submitted');
        navigate('/', { replace: true });
      } else {
        setAssessmentStatus('draft');
        toast.success('Draft saved successfully!');
      }
    } catch (err) {
      console.error(err);
      setGeneralError(err.response?.data?.message || 'Failed to save self-assessment.');
    } finally {
      setSubmitting(false);
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
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Overview</span>
        </button>

        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${
          assessmentStatus === 'submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          assessmentStatus === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          Status: {assessmentStatus}
        </span>
      </div>

      {/* Intro Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Self-Assessment Form</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review Cycle: <span className="font-semibold text-slate-800">{cycle?.reviewMonth}</span> | Evaluation Template: <span className="font-semibold text-slate-800">{cycle?.kpiTemplateId?.templateName}</span>
        </p>

        {generalError && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}
      </div>

      {/* KPI Questionnaire Items */}
      <div className="space-y-6">
        {templateItems.map((item, index) => {
          const score = scores[item._id] || 0;
          const comment = comments[item._id] || '';
          const errorMsg = errors[item._id];

          return (
            <div
              key={item._id}
              className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${
                errorMsg ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                    <h4 className="font-bold text-slate-800 text-sm">{item.kpiName}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">{item.description}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Weight:</span>
                  <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.weight}x
                  </span>
                </div>
              </div>

              {/* Score Button Group Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Self Score Evaluation
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleScoreChange(item._id, val)}
                        disabled={assessmentStatus === 'submitted'}
                        className={`w-10 h-10 rounded-xl font-extrabold text-sm flex items-center justify-center border transition-all cursor-pointer ${
                          score === val
                            ? 'bg-sky-700 border-sky-700 text-white shadow-md shadow-sky-700/10'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  {errorMsg && !score && <p className="text-[10px] font-semibold text-rose-600 mt-1">{errorMsg}</p>}
                </div>

                {/* Comment box */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Justification Comment <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[9px] font-extrabold text-rose-600 uppercase">Comment Mandatory</span>
                  </div>
                  <textarea
                    rows="2"
                    value={comment}
                    onChange={(e) => handleCommentChange(item._id, e.target.value)}
                    placeholder="Provide details about your achievements or challenges..."
                    disabled={assessmentStatus === 'submitted'}
                    className={`w-full text-xs p-3 border rounded-xl outline-none focus:border-sky-500 bg-slate-50/50 resize-none ${
                      errorMsg && !comment.trim() ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errorMsg && !comment.trim() && (
                    <p className="text-[10px] font-semibold text-rose-600">
                      {errorMsg === 'Score is required.' ? 'Comment is required.' : errorMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer Bar */}
      {assessmentStatus !== 'submitted' && (
        <div className="flex justify-end items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <button
            onClick={() => handleSave('draft')}
            disabled={submitting}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            <Save size={14} />
            <span>Save Draft</span>
          </button>
          
          <button
            onClick={() => handleSave('submitted')}
            disabled={submitting}
            className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
          >
            <Send size={14} />
            <span>Submit Evaluation</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SelfAssessmentForm;
