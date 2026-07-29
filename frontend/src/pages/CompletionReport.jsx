import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Calendar, CheckCircle2, Clock, Eye, Search, Download, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTableControls } from '../hooks/useTableControls';
import TablePagination from '../components/TablePagination';
import { exportToCsv } from '../utils/csvExport';
import { getUserAvatarUrl } from '../utils/avatar';

const CompletionReport = () => {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const table = useTableControls(report?.completionDetails || [], {
    searchFn: (d, term) =>
      `${d.employee.firstName} ${d.employee.lastName} ${d.employee.employeeCode} ${d.employee.departmentId?.departmentName || ''}`
        .toLowerCase()
        .includes(term),
    sortAccessors: {
      employee: (d) => `${d.employee.firstName} ${d.employee.lastName}`,
      department: (d) => d.employee.departmentId?.departmentName || '',
      selfStatus: (d) => d.selfAssessmentStatus,
      managerStatus: (d) => d.managerReviewStatus,
      finalScore: (d) => d.finalScore
    },
    defaultSortKey: 'employee',
    pageSize: 10
  });

  const handleExport = () => {
    exportToCsv(`completion-report-${report?.reviewCycle?.reviewMonth || 'export'}`, [
      { key: 'employee.employeeCode', label: 'Employee Code' },
      { key: 'employee', label: 'Employee', render: (d) => `${d.employee.firstName} ${d.employee.lastName}` },
      { key: 'employee.departmentId.departmentName', label: 'Department' },
      { key: 'manager', label: 'Manager', render: (d) => d.employee.managerId ? `${d.employee.managerId.firstName} ${d.employee.managerId.lastName}` : '' },
      { key: 'selfAssessmentStatus', label: 'Self Assessment' },
      { key: 'managerReviewStatus', label: 'Manager Review' },
      { key: 'finalScore', label: 'Final Score' },
      { key: 'rating', label: 'Rating' }
    ], table.allFilteredRows);
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30 tracking-wider">
                Audit Command Desk
              </span>
              {report?.reviewCycle && (
                <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  Cycle: {report.reviewCycle.reviewMonth} ({report.reviewCycle.status?.toUpperCase()})
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Assessment Completion Status Audit
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time evaluation tracking & submission status verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Cycle Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 px-4 rounded-2xl text-xs font-bold text-white transition-colors cursor-pointer shadow-md"
              >
                <Calendar size={18} className="text-sky-400" />
                <div className="text-left">
                  <span className="text-[8px] text-slate-400 block uppercase tracking-wider leading-none">Selected Review Cycle</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-black text-sky-200">
                      {(() => {
                        const selected = cycles.find(c => c._id === selectedCycleId);
                        return selected ? `${selected.reviewMonth} - ${selected.kpiTemplateId?.departmentId?.departmentName || 'Org-Wide'}` : 'Select Cycle';
                      })()}
                    </span>
                    {(() => {
                      const selected = cycles.find(c => c._id === selectedCycleId);
                      if (!selected) return null;
                      const isManager = selected.targetRole === 'manager';
                      return (
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.2 rounded ${
                          isManager ? 'bg-purple-900/80 text-purple-200 border border-purple-700/60' : 'bg-sky-900/80 text-sky-200 border border-sky-700/60'
                        }`}>
                          {isManager ? 'Manager Cycle' : 'Employee Cycle'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <span className="ml-2 text-slate-400 text-[10px]">▼</span>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => { setDropdownOpen(false); setSearchQuery(''); }} />
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                          const deptText = c.kpiTemplateId?.departmentId?.departmentName || 'org-wide';
                          const tNameText = c.kpiTemplateId?.templateName || '';
                          const text = `${c.reviewMonth} ${deptText} ${tNameText} ${roleText} ${c.status}`.toLowerCase();
                          return text.includes(searchQuery.toLowerCase());
                        })
                        .map(c => {
                          const isMgr = c.targetRole === 'manager';
                          const isSelected = selectedCycleId === c._id;
                          const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'Org-Wide';

                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                setSelectedCycleId(c._id);
                                setDropdownOpen(false);
                                setSearchQuery('');
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

        {/* Summary Metric Cards (4 Cards Grid) */}
        {report && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Target Staff</p>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{report.completionDetails.length}</h2>
                <span className="text-[9px] text-sky-400 font-medium">Assigned employees</span>
              </div>
              <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
                <Calendar size={20} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Self Submitted</p>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  {report.completionDetails.filter(d => d.selfAssessmentStatus === 'submitted').length}
                </h2>
                <span className="text-[9px] text-amber-400 font-medium">Self evaluations</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Manager Graded</p>
                <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">
                  {report.completionDetails.filter(d => d.managerReviewStatus === 'submitted').length}
                </h2>
                <span className="text-[9px] text-emerald-400 font-medium">Leadership reviews</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Overall Complete</p>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  {(() => {
                    const total = report.completionDetails.length;
                    const done = report.completionDetails.filter(d => d.managerReviewStatus === 'submitted').length;
                    return total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
                  })()}
                </h2>
                <span className="text-[9px] text-indigo-400 font-bold uppercase">Appraisal Rate</span>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Evaluation Status list</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={table.searchTerm}
                    onChange={(e) => table.setSearchTerm(e.target.value)}
                    placeholder="Search employee, department..."
                    className="bg-slate-50 border border-slate-200 text-slate-700 pl-8 pr-3 py-2 rounded-xl text-[11px] outline-none focus:border-sky-500 w-full md:w-56"
                  />
                </div>
              </div>
            </div>

            {table.rows.length === 0 ? (
              <div className="py-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-slate-500 text-xs">
                  {report.completionDetails.length === 0 ? 'No employees found for this cycle.' : `No employees match "${table.searchTerm}".`}
                </p>
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
                    <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('department')}>
                      <span className="inline-flex items-center gap-1">Department <ArrowUpDown size={10} /></span>
                    </th>
                    <th className="py-3 px-4">Manager</th>
                    <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('selfStatus')}>
                      <span className="inline-flex items-center gap-1">Self Evaluation <ArrowUpDown size={10} /></span>
                    </th>
                    <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('managerStatus')}>
                      <span className="inline-flex items-center gap-1">Manager Evaluation <ArrowUpDown size={10} /></span>
                    </th>
                    <th className="py-3 px-4 cursor-pointer select-none" onClick={() => table.toggleSort('finalScore')}>
                      <span className="inline-flex items-center gap-1">Final Score <ArrowUpDown size={10} /></span>
                    </th>
                    <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.rows.map(item => (
                    <tr key={item.employee._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-500">{item.employee.employeeCode}</td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getUserAvatarUrl(item.employee)}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div>
                            <span className={item.employee.role === 'manager' || item.employee.role === 'hr' || item.employee.role === 'executive' ? 'text-emerald-700 font-extrabold block' : 'text-slate-800 block'}>
                              {item.employee.firstName} {item.employee.lastName}
                            </span>
                            {(item.employee.role === 'manager' || item.employee.role === 'hr' || item.employee.role === 'executive') && (
                              <span className="mt-0.5 inline-block px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[8px] font-black uppercase tracking-wider">
                                Reporting Manager
                              </span>
                            )}
                          </div>
                        </div>
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
        <div className="py-12 bg-white border rounded-2xl text-center shadow-sm">
          <p className="text-slate-500 text-xs">No completion data loaded.</p>
        </div>
      )}
    </div>
  );
};

export default CompletionReport;
