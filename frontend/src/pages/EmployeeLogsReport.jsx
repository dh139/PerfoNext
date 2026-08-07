import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import TablePagination from '../components/TablePagination';
import { 
  FileText, 
  User as UserIcon, 
  Calendar, 
  Clock, 
  Search, 
  Briefcase, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

const EmployeeLogsReport = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  // Redirect if not authorized
  useEffect(() => {
    if (currentUser && !['executive', 'manager', 'admin'].includes(currentUser.role)) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Dropdown / Search data
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Date range inputs (default to past 30 days)
  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);
  const [fromDate, setFromDate] = useState(defaultFromDate.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Results
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  // Expandable details state
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Pagination states
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch employees list
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/api/users');
        let usersData = res.data || [];

        // If manager, filter by department
        if (currentUser?.role === 'manager') {
          const managerDeptId = currentUser?.departmentId?._id || currentUser?.departmentId;
          if (managerDeptId) {
            usersData = usersData.filter(emp => {
              const empDeptId = emp.departmentId?._id || emp.departmentId;
              return empDeptId && empDeptId.toString() === managerDeptId.toString();
            });
          }
        }

        // Sort alphabetically by first name
        const sorted = usersData.sort((a, b) => 
          (a.firstName || '').localeCompare(b.firstName || '')
        );
        setEmployees(sorted);
        setSelectedEmployeeId(''); // Default to "-- All Employees --"
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to load employee list.');
      }
    };
    fetchEmployees();
  }, [currentUser]);

  // Fetch work logs
  const handleFetchReport = async (e) => {
    if (e) e.preventDefault();

    setLoading(true);
    setError('');
    setFetched(true);
    setCurrentPage(1);

    try {
      const params = {
        startDate: fromDate,
        endDate: toDate
      };
      if (selectedEmployeeId && selectedEmployeeId !== 'all') {
        params.employeeId = selectedEmployeeId;
      }

      const res = await api.get('/api/work-journal', { params });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching work logs:', err);
      setError('Failed to load employee work logs.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Approved</span>;
      case 'rejected':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Rejected</span>;
      case 'needs_changes':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Needs Changes</span>;
      case 'draft':
        return <span className="bg-slate-100 text-slate-650 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Draft</span>;
      default:
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Submitted</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Pagination slicing
  const totalPages = Math.ceil(logs.length / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedLogs = logs.slice(startIndex, startIndex + PAGE_SIZE);

  // Toggle log details
  const toggleDetails = (logId) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(logId);
    }
  };

  const isAllEmployees = !selectedEmployeeId || selectedEmployeeId === 'all';

  const selectedEmployeeName = !isAllEmployees && employees.find(e => e._id === selectedEmployeeId) 
    ? `${employees.find(e => e._id === selectedEmployeeId).firstName} ${employees.find(e => e._id === selectedEmployeeId).lastName}`
    : 'All Employees';

  // Filter employees for searchable selector
  const filteredEmployeesList = employees.filter(emp => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const dept = (emp.departmentId?.departmentName || '').toLowerCase();
    const q = employeeSearchQuery.toLowerCase();
    return fullName.includes(q) || code.includes(q) || dept.includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 text-white relative overflow-hidden shadow-md border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-850 w-fit block">
              Manager & Executive Desk
            </span>
            <h1 className="text-lg lg:text-xl font-black tracking-tight">Employee Daily Work Log Report</h1>
            <p className="text-slate-400 text-[10px] lg:text-xs max-w-3xl font-semibold leading-relaxed">
              Audit work log records for any team member within a selected date window. Review task lists, project contributions, and verification status.
            </p>
          </div>
        </div>
      </div>

      {/* Controls Form Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleFetchReport} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Employee Search Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Select Employee</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-8 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer focus:border-sky-500 focus:bg-white transition-all shadow-2xs"
              >
                <UserIcon size={14} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
                <span className="truncate">
                  {!isAllEmployees && employees.find(e => e._id === selectedEmployeeId)
                    ? `${employees.find(e => e._id === selectedEmployeeId).firstName} ${employees.find(e => e._id === selectedEmployeeId).lastName} (${employees.find(e => e._id === selectedEmployeeId).employeeCode || 'No Code'})`
                    : '-- All Employees --'}
                </span>
                <ChevronDown size={14} className="text-slate-450 shrink-0" />
              </button>

              {/* Popover list */}
              {isDropdownOpen && (
                <div className="absolute z-50 top-full left-0 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 max-h-72 flex flex-col">
                  {/* Search box inside dropdown */}
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      placeholder="Type name, code, dept..."
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:border-sky-500 focus:bg-white font-bold transition-all"
                    />
                  </div>

                  {/* Scrollable list content */}
                  <div className="overflow-y-auto space-y-0.5 flex-1 pr-1 max-h-48 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId('');
                        setIsDropdownOpen(false);
                        setEmployeeSearchQuery('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer block ${
                        isAllEmployees 
                          ? 'bg-sky-50 text-sky-700 border border-sky-100/50' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      -- All Employees --
                    </button>

                    {filteredEmployeesList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-bold text-center py-4">No matching employees</p>
                    ) : (
                      filteredEmployeesList.map(emp => {
                        const isSelected = selectedEmployeeId === emp._id;
                        return (
                          <button
                            key={emp._id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(emp._id);
                              setIsDropdownOpen(false);
                              setEmployeeSearchQuery('');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer block ${
                              isSelected 
                                ? 'bg-sky-50 text-sky-700 border border-sky-100/50' 
                                : 'hover:bg-slate-50 text-slate-650'
                            }`}
                          >
                            <p className="font-extrabold">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                              Code: {emp.employeeCode || 'N/A'} • {emp.departmentId?.departmentName || 'No Dept'}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Start Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl outline-none text-xs font-bold text-slate-700 focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">End Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl outline-none text-xs font-bold text-slate-700 focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-55"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading logs...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
          <XCircle size={16} className="text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Workspace Card */}
      {fetched && !loading && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">
                Work Log Registry: {selectedEmployeeName}
              </h2>
              <p className="text-slate-455 text-xs mt-0.5 font-semibold">
                Showing logs from {formatDate(fromDate)} to {formatDate(toDate)}
              </p>
            </div>
            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-3 py-1 rounded-full font-black uppercase shadow-2xs">
              {logs.length} Total Logs Found
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium space-y-3">
              <FileText className="mx-auto text-slate-300" size={44} />
              <p className="text-xs">No daily work logs submitted within the selected date window.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isAllEmployees && <th className="py-3 px-4">Employee</th>}
                      <th className="py-3 px-4">Title & Details</th>
                      <th className="py-3 px-4">Project & Category</th>
                      <th className="py-3 px-4">Completed Date</th>
                      <th className="py-3 px-4">Hours</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold">
                    {paginatedLogs.map(log => {
                      const isExpanded = expandedLogId === log._id;
                      return (
                        <React.Fragment key={log._id}>
                          <tr className="hover:bg-slate-50/40 transition-colors">
                            {isAllEmployees && (
                              <td className="py-3.5 px-4 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                                  <UserIcon size={12} />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 leading-tight">
                                    {log.employeeId?.firstName} {log.employeeId?.lastName}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {log.employeeId?.employeeCode || 'N/A'}
                                  </p>
                                  <p className="text-[9px] text-slate-455 font-medium mt-0.5">
                                    {log.employeeId?.departmentId?.departmentName || 'No Dept'}
                                  </p>
                                </div>
                              </td>
                            )}
                            <td className="py-3.5 px-4 max-w-xs space-y-1">
                              <p className="font-bold text-slate-800 leading-tight">{log.title}</p>
                              <p className="text-[10px] text-slate-455 line-clamp-1 italic font-medium">"{log.resultSummary}"</p>
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <span className="font-bold text-slate-700 block">{log.project || 'General'}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{log.category}</span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-600">
                              {formatDate(log.completedDate)}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-700">
                              {log.hoursSpent} hrs
                            </td>
                            <td className="py-3.5 px-4">
                              {getStatusBadge(log.status)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => toggleDetails(log._id)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 cursor-pointer transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={isAllEmployees ? 7 : 6} className="p-4 border-t border-slate-100">
                                <div className="space-y-4 text-xs font-semibold text-slate-700 max-w-4xl">
                                  {/* Result Description */}
                                  <div className="space-y-1">
                                    <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Work Result Summary</h4>
                                    <p className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
                                      {log.resultSummary || 'No result summary provided.'}
                                    </p>
                                  </div>

                                  {/* Custom fields data if any */}
                                  {log.customFieldsData && Object.keys(log.customFieldsData).length > 0 && (
                                    <div className="space-y-2">
                                      <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Template Responses</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Object.entries(log.customFieldsData).map(([fieldLabel, value]) => (
                                          <div key={fieldLabel} className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{fieldLabel}</p>
                                            <p className="text-slate-750 mt-1 leading-relaxed font-medium">{String(value)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Evidence Link */}
                                  {log.evidenceRef && (
                                    <div className="space-y-1">
                                      <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Evidence / Reference Links</h4>
                                      <p className="font-mono text-[11px] text-sky-650 bg-white border border-slate-200 rounded-xl px-3 py-2 w-max max-w-full truncate">
                                        <a href={log.evidenceRef} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5">
                                          <span>🔗</span> {log.evidenceRef}
                                        </a>
                                      </p>
                                    </div>
                                  )}

                                  {/* Verification Details */}
                                  {log.reviewedBy && (
                                    <div className="bg-slate-100/80 border border-slate-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                                      <div className="space-y-0.5">
                                        <h5 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Reviewed By</h5>
                                        <p className="font-bold text-slate-800">{log.reviewedBy.firstName} {log.reviewedBy.lastName} ({log.reviewedBy.role})</p>
                                      </div>
                                      {log.managerFeedback && (
                                        <div className="flex-1 sm:max-w-md bg-white border border-slate-150 rounded-xl p-3 space-y-0.5">
                                          <h6 className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Reviewer Comments</h6>
                                          <p className="text-slate-650 leading-relaxed font-medium">"{log.managerFeedback}"</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <TablePagination
                page={safePage}
                totalPages={totalPages}
                totalCount={logs.length}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeLogsReport;
