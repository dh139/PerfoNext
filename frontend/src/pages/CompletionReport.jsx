import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Calendar, CheckCircle2, Clock, Eye, Search, Download, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTableControls } from '../hooks/useTableControls';
import TablePagination from '../components/TablePagination';
import { exportToCsv } from '../utils/csvExport';

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Dropdown Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Review Cycle</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3.5 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer text-left"
            >
              {(() => {
                const selected = cycles.find(c => c._id === selectedCycleId);
                if (!selected) return 'Select a Review Cycle...';
                const deptName = selected.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                const tempName = selected.kpiTemplateId?.templateName || 'General Template';
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">
                      {selected.reviewMonth}
                    </span>
                    <span className="text-slate-800">
                      Dept: <span className="font-extrabold">{deptName}</span> <span className="font-normal text-slate-500">({tempName})</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      selected.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-650'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selected.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {selected.status}
                    </span>
                  </div>
                );
              })()}
              <span className="text-slate-400 ml-2">▼</span>
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop overlay to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setDropdownOpen(false);
                    setSearchQuery('');
                  }}
                />
                
                {/* Dropdown panel */}
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-2 space-y-2 max-h-96 flex flex-col overflow-hidden animate-fade-in">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs shrink-0">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cycles by month, department, template..."
                      className="w-full bg-transparent text-xs text-slate-800 outline-none"
                      autoFocus
                    />
                  </div>
                  
                  <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                    {(() => {
                      const filtered = cycles.filter(c => {
                        const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                        const tempName = c.kpiTemplateId?.templateName || 'General Template';
                        return `${c.reviewMonth} ${deptName} ${tempName} ${c.status}`.toLowerCase().includes(searchQuery.toLowerCase());
                      });

                      if (filtered.length === 0) {
                        return <p className="text-slate-400 text-center py-6 text-xs">No matching cycles found.</p>;
                      }

                      // Split into Active and Closed
                      const active = filtered.filter(c => c.status === 'active');
                      const closed = filtered.filter(c => c.status !== 'active');

                      return (
                        <>
                          {active.length > 0 && (
                            <div className="space-y-1">
                              <p className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Cycles</p>
                              {active.map(c => {
                                const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                                const tempName = c.kpiTemplateId?.templateName || 'General Template';
                                return (
                                  <button
                                    key={c._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCycleId(c._id);
                                      setDropdownOpen(false);
                                      setSearchQuery('');
                                    }}
                                    className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                      selectedCycleId === c._id
                                        ? 'bg-sky-50 text-sky-850 font-bold'
                                        : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded">
                                          {c.reviewMonth}
                                        </span>
                                        <span className="font-extrabold">Dept: {deptName}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-medium pl-1">
                                        Template: {tempName}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                      Active
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {closed.length > 0 && (
                            <div className="space-y-1">
                              <p className="px-2 pt-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Closed Cycles</p>
                              {closed.map(c => {
                                const deptName = c.kpiTemplateId?.departmentId?.departmentName || 'All Departments';
                                const tempName = c.kpiTemplateId?.templateName || 'General Template';
                                return (
                                  <button
                                    key={c._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCycleId(c._id);
                                      setDropdownOpen(false);
                                      setSearchQuery('');
                                    }}
                                    className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                      selectedCycleId === c._id
                                        ? 'bg-sky-50 text-sky-850 font-bold'
                                        : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                          {c.reviewMonth}
                                        </span>
                                        <span className="font-semibold text-slate-600">Dept: {deptName}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-medium pl-1">
                                        Template: {tempName}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                                      Closed
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
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
