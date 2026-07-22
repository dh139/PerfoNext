import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Calendar, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const CompletionReport = () => {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const res = await api.get('/api/review-cycles');
        setCycles(res.data);
        if (res.data.length > 0) {
          // Select first active cycle, or just the first cycle
          const active = res.data.find(c => c.status === 'active');
          setSelectedCycleId(active?._id || res.data[0]._id);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch review cycles.');
      }
    };

    fetchCycles();
  }, []);

  const handleFetchReport = async () => {
    if (!selectedCycleId) return;

    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/reports/review-completion?reviewCycleId=${selectedCycleId}`);
      setReport(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load completion details.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchReport();
  }, [selectedCycleId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'draft':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-50 text-slate-500 border border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Dropdown Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Review Cycle</label>
          <div className="relative">
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold p-3 rounded-xl text-xs outline-none focus:border-sky-500"
            >
              {cycles.map(c => {
                const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                const tempName = c.kpiTemplateId?.templateName || 'General Template';
                return (
                  <option key={c._id} value={c._id}>
                    Month: {c.reviewMonth} — Dept: {deptName} ({tempName}) ({c.status})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Total Employees</span>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{report.completionDetails.length}</h3>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Self Submitted</span>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                {report.completionDetails.filter(d => d.selfAssessmentStatus === 'submitted').length}
              </h3>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Mgr Submitted</span>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                {report.completionDetails.filter(d => d.managerReviewStatus === 'submitted').length}
              </h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-md">
              <span className="text-[9px] uppercase font-extrabold text-sky-400">Overall Complete</span>
              <h3 className="text-2xl font-extrabold mt-1 text-white">
                {report.completionDetails.filter(d => d.isCompleted).length}
              </h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Evaluation Status list</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-lg">Code</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Manager</th>
                    <th className="py-3 px-4">Self Evaluation</th>
                    <th className="py-3 px-4">Manager Evaluation</th>
                    <th className="py-3 px-4">Final Score</th>
                    <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.completionDetails.map(item => (
                    <tr key={item.employee._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-500">{item.employee.employeeCode}</td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {item.employee.firstName} {item.employee.lastName}
                      </td>
                      <td className="py-4 px-4 text-slate-600">{item.employee.departmentId?.departmentName}</td>
                      <td className="py-4 px-4 text-slate-600">
                        {item.employee.managerId ? `${item.employee.managerId.firstName} ${item.employee.managerId.lastName}` : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase ${getStatusBadge(item.selfAssessmentStatus)}`}>
                          {item.selfAssessmentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase ${getStatusBadge(item.managerReviewStatus)}`}>
                          {item.managerReviewStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {item.isCompleted ? (
                          <div>
                            <span className="font-extrabold text-sky-700 text-sm">{item.finalScore}</span>
                            <span className="text-[9px] text-slate-400 block font-semibold">{item.rating}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1">
                            <Clock size={12} className="text-amber-500 shrink-0" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {item.isCompleted && (
                          <Link
                            to={`/reports/employee/${item.employee._id}`}
                            className="inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-800"
                          >
                            <Eye size={14} />
                            <span>View Report</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 bg-white border rounded-2xl text-center shadow-sm">
          <p className="text-slate-500 text-xs">No completion data loaded.</p>
        </div>
      )}
    </div>
  );
};

export default CompletionReport;
