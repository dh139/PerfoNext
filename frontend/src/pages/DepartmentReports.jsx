import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { AlertCircle, Calendar, Layers, Activity, FileText, ArrowUpRight, Sparkles } from 'lucide-react';

const DepartmentReports = () => {
  const [departments, setDepartments] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const deptRes = await api.get('/api/departments');
        setDepartments(deptRes.data.filter(d => d.status === 'active'));
        if (deptRes.data.length > 0) setSelectedDeptId(deptRes.data[0]._id);

        const cycleRes = await api.get('/api/review-cycles');
        setCycles(cycleRes.data);
        if (cycleRes.data.length > 0) setSelectedCycleId(cycleRes.data[0]._id);
      } catch (err) {
        console.error(err);
        setError('Failed to load departments or cycles list.');
      }
    };

    fetchMetadata();
  }, []);

  const handleFetchReport = async () => {
    if (!selectedDeptId || !selectedCycleId) return;

    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/reports/department/${selectedDeptId}?reviewCycleId=${selectedCycleId}`);
      setReport(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch department report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchReport();
  }, [selectedDeptId, selectedCycleId]);

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'workQuality': return 'Work Quality';
      case 'productivity': return 'Productivity';
      case 'technical': return 'Technical Skills';
      case 'communication': return 'Communication';
      case 'ownership': return 'Ownership';
      case 'learning': return 'Learning & Growth';
      default: return cat;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Dropdowns Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Department</label>
          <div className="relative">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold p-3 rounded-xl text-xs outline-none focus:border-sky-500"
            >
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.departmentName}</option>
              ))}
            </select>
          </div>
        </div>

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
          {/* Main stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-md text-center">
              <span className="text-[9px] uppercase font-extrabold text-sky-400 tracking-wider">Department Average</span>
              <h2 className="text-4xl font-black mt-2 text-white">{report.averages.finalScore}</h2>
              <span className="text-[10px] text-slate-500 mt-1 block">out of 5.0</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Employees</span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2">{report.employeeCount}</h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Evaluations Computed</span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2">{report.scoresCount}</h2>
            </div>
          </div>

          {/* Category Averages Progress Bars */}
          {report.scoresCount > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category Performance Averages</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(report.averages.categoryScores).map(cat => {
                  const val = report.averages.categoryScores[cat] || 0;
                  const pct = Math.round((val / 5) * 100);

                  return (
                    <div key={cat} className="space-y-2 border border-slate-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">{getCategoryLabel(cat)}</span>
                        <span className="font-extrabold text-sky-700">{val} / 5.0</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Employee Final Scores list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Employee Final Scores</h3>
            
            {report.scores.length === 0 ? (
              <div className="py-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-slate-500 text-xs">No performance reports submitted for this cycle yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                      <th className="py-3 px-4 rounded-l-lg">Code</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Final Score</th>
                      <th className="py-3 px-4">Rating Band</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.scores.map(s => (
                      <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-500">{s.employeeId?.employeeCode}</td>
                        <td className="py-4 px-4 font-bold text-slate-800">
                          <Link
                            to={`/reports/employee/${s.employeeId?._id}`}
                            className="text-sky-700 hover:underline inline-flex items-center gap-1 font-bold"
                          >
                            <span>{s.employeeId?.firstName} {s.employeeId?.lastName}</span>
                            <ArrowUpRight size={12} className="text-sky-600 shrink-0" />
                          </Link>
                        </td>
                        <td className="py-4 px-4 font-bold text-sky-700 text-sm">{s.finalScore}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            s.finalScore >= 4.0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            s.finalScore >= 3.0 ? 'bg-sky-50 text-sky-700 border-sky-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {s.rating}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            to={`/reports/employee/${s.employeeId?._id}`}
                            className="px-3 py-1.5 bg-sky-700 hover:bg-sky-850 text-white rounded-xl font-bold text-[10px] inline-flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <Sparkles size={12} />
                            <span>View AI Insights</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
          <p className="text-slate-400 text-xs">Select configurations to build the report.</p>
        </div>
      )}
    </div>
  );
};

export default DepartmentReports;
