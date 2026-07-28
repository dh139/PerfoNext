import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { AlertCircle, Calendar, Layers, Activity, FileText, ArrowUpRight, Sparkles, Search, Download, ArrowUpDown } from 'lucide-react';
import { useTableControls } from '../hooks/useTableControls';
import TablePagination from '../components/TablePagination';
import { exportToCsv } from '../utils/csvExport';
import { getUserAvatarUrl } from '../utils/avatar';

const DepartmentReports = () => {
  const { user } = useAuthStore();
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
        const activeDepts = deptRes.data.filter(d => d.status === 'active');

        let filteredDepts = activeDepts;
        if (user?.role === 'manager') {
          const empDeptId = user?.departmentId?._id || user?.departmentId;
          if (empDeptId) {
            filteredDepts = activeDepts.filter(d => d._id.toString() === empDeptId.toString());
          }
        }

        setDepartments(filteredDepts);
        if (filteredDepts.length > 0) setSelectedDeptId(filteredDepts[0]._id);

        const cycleRes = await api.get('/api/review-cycles');
        setCycles(cycleRes.data);
        if (cycleRes.data.length > 0) setSelectedCycleId(cycleRes.data[0]._id);
      } catch (err) {
        console.error(err);
        setError('Failed to load departments or cycles list.');
      }
    };

    fetchMetadata();
  }, [user]);

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

  const table = useTableControls(report?.scores || [], {
    searchFn: (s, term) =>
      `${s.employeeId?.firstName} ${s.employeeId?.lastName} ${s.employeeId?.employeeCode}`.toLowerCase().includes(term),
    sortAccessors: {
      employee: (s) => `${s.employeeId?.firstName} ${s.employeeId?.lastName}`,
      finalScore: (s) => s.finalScore,
      rating: (s) => s.rating
    },
    defaultSortKey: 'employee',
    pageSize: 10
  });

  const handleExport = () => {
    exportToCsv(`department-report-${report?.department?.departmentName || 'export'}`, [
      { key: 'employeeId.employeeCode', label: 'Employee Code' },
      { key: 'employee', label: 'Employee', render: (s) => `${s.employeeId?.firstName} ${s.employeeId?.lastName}` },
      { key: 'finalScore', label: 'Final Score' },
      { key: 'rating', label: 'Rating Band' }
    ], table.allFilteredRows);
  };

  const [cycleDropdownOpen, setCycleDropdownOpen] = useState(false);
  const [cycleSearch, setCycleSearch] = useState('');

  const selectedCycleObj = cycles.find(c => c._id === selectedCycleId);
  const isManagerTarget = selectedCycleObj?.targetRole === 'manager';

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
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold p-3 rounded-xl text-xs outline-none focus:border-sky-500 cursor-pointer"
            >
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.departmentName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Review Cycle Dropdown */}
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Review Cycle</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCycleDropdownOpen(!cycleDropdownOpen)}
              className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 px-3.5 rounded-xl text-xs font-bold text-slate-800 transition-colors cursor-pointer flex justify-between items-center"
            >
              <div>
                <span className="font-extrabold text-slate-900 block">
                  {selectedCycleObj ? `Month: ${selectedCycleObj.reviewMonth}` : 'Select Review Cycle'}
                </span>
                {selectedCycleObj && (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.2 rounded mt-0.5 ${
                    isManagerTarget ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                  }`}>
                    {isManagerTarget ? '👔 Manager Cycle (CEO Review)' : '👤 Employee Cycle (Manager Review)'}
                  </span>
                )}
              </div>
              <span className="text-slate-400 text-[10px] ml-2">▼</span>
            </button>

            {cycleDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => { setCycleDropdownOpen(false); setCycleSearch(''); }} />
                <div className="absolute right-0 mt-2 w-[420px] bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 p-4 space-y-3 animate-fade-in text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      Select Review Cycle ({cycles.length} Total)
                    </span>
                    <span className="text-[9px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      {cycles.filter(c => c.status === 'active').length} Active Now
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={cycleSearch}
                      onChange={(e) => setCycleSearch(e.target.value)}
                      placeholder="Search department (Sales, HR, Engineering), month..."
                      className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {cycles
                      .filter(c => {
                        const isMgr = c.targetRole === 'manager';
                        const roleText = isMgr ? 'manager reporting manager ceo' : 'employee employee evaluation';
                        const deptText = c.kpiTemplateId?.departmentId?.departmentName || 'all departments';
                        const tNameText = c.kpiTemplateId?.templateName || '';
                        const text = `${c.reviewMonth} ${deptText} ${tNameText} ${roleText} ${c.status}`.toLowerCase();
                        return text.includes(cycleSearch.toLowerCase());
                      })
                      .map(c => {
                        const isMgr = c.targetRole === 'manager';
                        const isSelected = selectedCycleId === c._id;
                        const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Depts';

                        return (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setSelectedCycleId(c._id);
                              setCycleDropdownOpen(false);
                              setCycleSearch('');
                            }}
                            className={`w-full text-left p-3 rounded-2xl text-xs space-y-1.5 transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-sky-50/90 text-sky-950 font-bold border-sky-300 shadow-sm ring-1 ring-sky-300'
                                : 'hover:bg-slate-50 text-slate-700 border-slate-200/80'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-xs">{c.reviewMonth}</span>
                                <span className="text-slate-300 text-[10px]">•</span>
                                <span className="font-black text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  {deptName}
                                </span>
                              </div>

                              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                c.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {c.status}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-0.5">
                              <span className={`inline-flex items-center text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                isMgr
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-sky-100 text-sky-800 border-sky-200'
                              }`}>
                                {isMgr ? '👔 Manager Cycle (CEO Review)' : '👤 Employee Cycle (Manager Review)'}
                              </span>

                              <span className="text-[9px] text-slate-400 font-semibold uppercase">{c.cycleType || 'Monthly'}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
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
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {isManagerTarget ? 'Active Managers' : 'Active Employees'}
              </span>
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

          {/* Employee / Manager Final Scores list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {isManagerTarget ? 'Reporting Manager Final Scores' : 'Employee Final Scores'}
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={table.searchTerm}
                    onChange={(e) => table.setSearchTerm(e.target.value)}
                    placeholder="Search employee..."
                    className="bg-slate-50 border border-slate-200 text-slate-700 pl-8 pr-3 py-2 rounded-xl text-[11px] outline-none focus:border-sky-500 w-full md:w-52"
                  />
                </div>
              </div>
            </div>

            {report.scores.length === 0 ? (
              <div className="py-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-slate-500 text-xs">No performance reports submitted for this cycle yet.</p>
              </div>
            ) : table.rows.length === 0 ? (
              <div className="py-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-slate-500 text-xs">No employees match "{table.searchTerm}".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                      <th className="py-3 px-4 rounded-l-lg">Code</th>
                      <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('employee')}>
                        <span className="inline-flex items-center gap-1">Employee <ArrowUpDown size={10} /></span>
                      </th>
                      <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('finalScore')}>
                        <span className="inline-flex items-center gap-1">Final Score <ArrowUpDown size={10} /></span>
                      </th>
                      <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('rating')}>
                        <span className="inline-flex items-center gap-1">Rating Band <ArrowUpDown size={10} /></span>
                      </th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.rows.map(s => (
                      <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-500">{s.employeeId?.employeeCode}</td>
                        <td className="py-4 px-4 font-bold text-slate-800">
                          <Link
                            to={`/reports/employee/${s.employeeId?._id}`}
                            className="hover:underline flex items-center gap-2.5 font-bold"
                          >
                            <img
                              src={getUserAvatarUrl(s.employeeId)}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <span className={s.employeeId?.role === 'manager' || s.employeeId?.role === 'hr' || s.employeeId?.role === 'executive' ? 'text-emerald-700 font-extrabold flex items-center gap-1' : 'text-sky-700 flex items-center gap-1'}>
                                <span>{s.employeeId?.firstName} {s.employeeId?.lastName}</span>
                                <ArrowUpRight size={12} className="text-sky-600 shrink-0" />
                              </span>
                              {(s.employeeId?.role === 'manager' || s.employeeId?.role === 'hr' || s.employeeId?.role === 'executive') && (
                                <span className="mt-0.5 inline-block px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[8px] font-black uppercase tracking-wider">
                                  Reporting Manager
                                </span>
                              )}
                            </div>
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
                <TablePagination
                  page={table.page}
                  totalPages={table.totalPages}
                  totalCount={table.totalCount}
                  pageSize={table.pageSize}
                  onPageChange={table.setPage}
                />
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
