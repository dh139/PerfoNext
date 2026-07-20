import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AlertCircle, Save, Send, ArrowLeft, User, MessageSquare } from 'lucide-react';
import { toast } from '../store/toastStore';

const ManagerReviewForm = () => {
  const { cycleId, employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [selfDetails, setSelfDetails] = useState({}); // { kpiItemId: { score, comment } }
  
  const [scores, setScores] = useState({}); // { kpiItemId: score }
  const [comments, setComments] = useState({}); // { kpiItemId: comment }
  const [errors, setErrors] = useState({}); // { kpiItemId: errorString }

  const [reviewStatus, setReviewStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch employee details
        const empRes = await api.get(`/api/users/${employeeId}`);
        setEmployee(empRes.data);

        // 2. Fetch cycle details
        const cycleRes = await api.get(`/api/review-cycles/${cycleId}`);
        setCycle(cycleRes.data);
        
        const items = cycleRes.data.kpiTemplateId?.items || [];
        setTemplateItems(items);

        // 3. Fetch employee self assessment (for reference)
        const selfAssRes = await api.get(`/api/self-assessments?reviewCycleId=${cycleId}&employeeId=${employeeId}`);
        const selfAss = selfAssRes.data[0];
        
        if (selfAss) {
          const selfMap = {};
          selfAss.details.forEach(d => {
            selfMap[d.kpiItemId] = { score: d.score, comment: d.comment };
          });
          setSelfDetails(selfMap);
        }

        // 4. Fetch existing manager review (if draft exists)
        const managerRevRes = await api.get(`/api/manager-reviews?reviewCycleId=${cycleId}&employeeId=${employeeId}`);
        const existing = managerRevRes.data[0];

        if (existing) {
          setReviewStatus(existing.status);
          
          const initialScores = {};
          const initialComments = {};
          existing.details.forEach(detail => {
            initialScores[detail.kpiItemId] = detail.score;
            initialComments[detail.kpiItemId] = detail.comment || '';
          });
          setScores(initialScores);
          setComments(initialComments);

          if (existing.status === 'submitted') {
            setGeneralError('This review has already been submitted and cannot be modified.');
          }
        }
      } catch (err) {
        console.error(err);
        setGeneralError('Failed to load employee assessment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cycleId, employeeId]);

  const handleScoreChange = (itemId, val) => {
    if (reviewStatus === 'submitted') return;
    setScores({ ...scores, [itemId]: val });
    if (errors[itemId]) {
      setErrors({ ...errors, [itemId]: '' });
    }
  };

  const handleCommentChange = (itemId, val) => {
    if (reviewStatus === 'submitted') return;
    setComments({ ...comments, [itemId]: val });
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
          newErrors[item._id] = 'Justification comment is mandatory for all items evaluated by managers.';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async (submitType) => {
    if (reviewStatus === 'submitted') return;
    const isSubmit = submitType === 'submitted';

    if (!validateForm(isSubmit)) {
      setGeneralError('Please fill out scores and mandatory comments for all metrics.');
      return;
    }

    try {
      setSubmitting(true);
      setGeneralError('');

      const details = templateItems.map(item => ({
        category: item.category,
        kpiItemId: item._id.toString(),
        score: scores[item._id] || 3,
        comment: comments[item._id] || ''
      }));

      await api.post('/api/manager-reviews', {
        reviewCycleId: cycleId,
        employeeId,
        details,
        status: submitType
      });

      if (isSubmit) {
        setReviewStatus('submitted');
        navigate('/');
      } else {
        setReviewStatus('draft');
        toast.success('Manager review draft saved!');
      }
    } catch (err) {
      console.error(err);
      setGeneralError(err.response?.data?.message || 'Failed to submit manager review.');
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
          reviewStatus === 'submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          reviewStatus === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          Status: {reviewStatus}
        </span>
      </div>

      {/* Intro Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Manager Review Workspace</h2>
          <p className="text-slate-400 text-xs mt-1">
            Employee: <span className="text-white font-semibold">{employee?.firstName} {employee?.lastName}</span> ({employee?.employeeCode})
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            Review Month: <span className="text-white font-semibold">{cycle?.reviewMonth}</span>
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-right">
          <p className="text-slate-400">Department</p>
          <p className="font-bold text-slate-200 mt-0.5">{employee?.departmentId?.departmentName}</p>
        </div>
      </div>

      {generalError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* KPI Evaluation list */}
      <div className="space-y-6">
        {templateItems.map((item, index) => {
          const score = scores[item._id] || 0;
          const comment = comments[item._id] || '';
          const errorMsg = errors[item._id];
          const selfAss = selfDetails[item._id] || null;

          return (
            <div
              key={item._id}
              className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${
                errorMsg ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                  <h4 className="font-bold text-slate-800 text-sm">{item.kpiName}</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {item.category}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border">
                  Weight: {item.weight}x
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-6 leading-normal">{item.description}</p>

              {/* Side-by-Side Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Employee Self-Assessment Reference */}
                <div className="bg-slate-50/60 border border-slate-200 p-4 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    <User size={12} className="text-sky-600" />
                    <span>Employee Self-Assessment</span>
                  </div>
                  {selfAss ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400">Self Score:</span>
                        <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-extrabold flex items-center justify-center">
                          {selfAss.score}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block mb-1">Self Justification:</span>
                        <p className="text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 leading-normal">
                          {selfAss.comment || 'No comment provided.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-xs py-2">Self assessment has not been submitted yet.</p>
                  )}
                </div>

                {/* Manager Review Input */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Manager Grade Evaluation
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleScoreChange(item._id, val)}
                          disabled={reviewStatus === 'submitted'}
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
                    {errorMsg && !score && <p className="text-[10px] font-semibold text-rose-600">{errorMsg}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Manager Evaluation justification
                      </label>
                      <span className="text-[9px] font-extrabold text-rose-600 uppercase">Mandatory</span>
                    </div>
                    <textarea
                      rows="2"
                      value={comment}
                      onChange={(e) => handleCommentChange(item._id, e.target.value)}
                      placeholder="Explain your grading decision..."
                      disabled={reviewStatus === 'submitted'}
                      className={`w-full text-xs p-3 border rounded-xl outline-none focus:border-sky-500 bg-slate-50/50 resize-none ${
                        errorMsg && !comment.trim() ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                    {errorMsg && !comment.trim() && <p className="text-[10px] font-semibold text-rose-600">{errorMsg}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions footer */}
      {reviewStatus !== 'submitted' && (
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
            <span>Submit Review</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ManagerReviewForm;
