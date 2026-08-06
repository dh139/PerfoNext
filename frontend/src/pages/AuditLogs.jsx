import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  AlertCircle,
  Terminal,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Filter,
  Globe,
  Layers,
  ArrowRight,
  Monitor
} from 'lucide-react';

const AuditLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected Log for Modal Inspection
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalTab, setModalTab] = useState('diff'); // 'diff' | 'raw'

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch security audit logs.');
    } finally {
      setLoading(false);
    }
  };

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter, statusFilter]);

  const parseDeviceString = (userAgent) => {
    if (!userAgent) return 'Web / Desktop';
    const ua = userAgent;

    let os = '';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = '';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('PostmanRuntime')) browser = 'Postman API';

    if (os && browser) return `${os} • ${browser}`;
    if (os) return os;
    if (browser) return browser;
    return 'Web / Desktop';
  };

  const getActionBadgeColor = (action = '', status = 'SUCCESS') => {
    if (status === 'FAILED') return 'bg-rose-600 text-white';
    const act = action.toLowerCase();
    if (act.includes('login')) return 'bg-slate-800 text-slate-100';
    if (act.includes('logout')) return 'bg-slate-600 text-slate-100';
    if (act.includes('unlock') || act.includes('relock') || act.includes('cycle')) return 'bg-purple-600 text-white';
    if (act.includes('score') || act.includes('review')) return 'bg-indigo-600 text-white';
    if (act.includes('create')) return 'bg-emerald-600 text-white';
    if (act.includes('delete')) return 'bg-rose-600 text-white';
    if (act.includes('pip')) return 'bg-amber-600 text-white';
    if (act.includes('promotion')) return 'bg-sky-600 text-white';
    return 'bg-slate-700 text-white';
  };

  const formatIpDisplay = (ip) => {
    if (!ip) return '-';
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
      return '127.0.0.1 (Localhost)';
    }
    return ip;
  };

  // Extract unique modules dynamically
  const availableModules = Array.from(new Set(logs.map(l => l.module || 'General'))).filter(Boolean);

  const filteredLogs = logs.filter(log => {
    const actorName = log.actor?.name || `${log.userId?.firstName || ''} ${log.userId?.lastName || ''}`;
    const actorCode = log.actor?.employeeCode || log.userId?.employeeCode || '';
    const userString = `${actorName} ${actorCode}`.toLowerCase();
    const actionString = (log.action || '').toLowerCase();
    const entityString = (log.entityType || '').toLowerCase();
    const ipString = (log.ipAddress || '').toLowerCase();
    const reqIdString = (log.requestId || '').toLowerCase();

    const matchesSearch = userString.includes(searchTerm.toLowerCase()) ||
                          actionString.includes(searchTerm.toLowerCase()) ||
                          entityString.includes(searchTerm.toLowerCase()) ||
                          ipString.includes(searchTerm.toLowerCase()) ||
                          reqIdString.includes(searchTerm.toLowerCase());

    const matchesModule = moduleFilter === 'ALL' || (log.module || 'General') === moduleFilter;
    const matchesStatus = statusFilter === 'ALL' || (log.status || 'SUCCESS') === statusFilter;

    return matchesSearch && matchesModule && matchesStatus;
  });

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Field-by-Field Diff Extractor
  const computeFieldDiffs = (beforeObj, afterObj) => {
    if (!beforeObj && !afterObj) return [];
    const b = beforeObj && typeof beforeObj === 'object' ? beforeObj : {};
    const a = afterObj && typeof afterObj === 'object' ? afterObj : {};

    const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
    const diffs = [];

    for (const key of allKeys) {
      if (['updatedAt', 'createdAt', '__v'].includes(key)) continue;
      const bVal = JSON.stringify(b[key]);
      const aVal = JSON.stringify(a[key]);

      if (bVal !== aVal) {
        diffs.push({
          field: key,
          before: b[key] !== undefined ? b[key] : '—',
          after: a[key] !== undefined ? a[key] : '—'
        });
      }
    }

    return diffs;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer border border-slate-200/60 uppercase tracking-wider w-fit"
      >
        <ChevronLeft size={12} />
        <span>Back to Settings</span>
      </button>
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 rounded-lg text-sky-400">
              <ShieldAlert size={18} />
            </div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Security Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Real-time immutable database action logs with actor snapshot telemetry</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Events</span>
            <span className="text-sm font-extrabold text-slate-800">{logs.length}</span>
          </div>
          <div className="bg-sky-50 border border-sky-100 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase text-sky-600 block">Filtered Results</span>
            <span className="text-sm font-extrabold text-sky-800">{filteredLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search user, action, IP, Request ID..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs outline-none focus:border-sky-500 text-slate-800 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Module Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Layers size={13} className="text-slate-400" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              {availableModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
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

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {filteredLogs.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-xs font-medium">No audit logs matching search and filter parameters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-lg">Timestamp & Request ID</th>
                    <th className="py-3 px-4">Trigger User (Actor)</th>
                    <th className="py-3 px-4">Module & Action</th>
                    <th className="py-3 px-4">Entity Modified</th>
                    <th className="py-3 px-4">IP & Device</th>
                    <th className="py-3 px-4 rounded-r-lg text-right">Details & Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedLogs.map(log => {
                    const actorName = log.actor?.name || (log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System Engine');
                    const actorRole = log.actor?.role || log.userId?.role || 'system';
                    const actorCode = log.actor?.employeeCode || log.userId?.employeeCode || '-';
                    const status = log.status || 'SUCCESS';

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Timestamp & Request ID */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-700 block">
                            {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                            {log.requestId || 'REQ-SYS'}
                          </span>
                        </td>

                        {/* Actor Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{actorName}</span>
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {actorRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Code: {actorCode}</span>
                        </td>

                        {/* Module & Action */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              {log.module || 'General'}
                            </span>
                            <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${getActionBadgeColor(log.action, status)}`}>
                              {log.action}
                            </span>
                            {status === 'FAILED' ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <XCircle size={10} /> FAILED
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Entity Modified */}
                        <td className="py-4 px-4">
                          <span className="font-semibold text-slate-700 block">{log.entityType}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5 truncate max-w-28">ID: {log.entityId || '-'}</span>
                          {log.reviewCycleId && (
                            <span className="text-[9px] text-purple-600 font-semibold block mt-0.5">
                              Cycle: {log.reviewCycleId.reviewMonth || log.reviewCycleId.title || 'Linked'}
                            </span>
                          )}
                        </td>

                        {/* IP & Telemetry */}
                        <td className="py-4 px-4 font-mono text-slate-500">
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <Globe size={11} className="text-slate-400" />
                            <span>{formatIpDisplay(log.ipAddress)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[9px] text-sky-700 font-sans mt-0.5 font-bold">
                            <Monitor size={10} className="text-sky-500" />
                            <span>{parseDeviceString(log.userAgent)}</span>
                          </div>

                          {log.endpoint && (
                            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                              {log.method} {log.endpoint}
                            </span>
                          )}
                        </td>

                        {/* Details & Diff Button */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setModalTab('diff');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={12} className="text-slate-500" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium">
                  Showing <strong className="text-slate-800 font-extrabold">{startIndex + 1}</strong> to{' '}
                  <strong className="text-slate-800 font-extrabold">{endIndex}</strong> of{' '}
                  <strong className="text-slate-800 font-extrabold">{filteredLogs.length}</strong> entries
                </span>

                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-xl text-xs outline-none font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                            safeCurrentPage === page
                              ? 'bg-sky-700 border-sky-700 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enterprise State Diff & Telemetry Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {selectedLog.module || 'General'}
                  </span>
                  <h3 className="font-extrabold text-base tracking-tight">{selectedLog.action}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">Request ID: {selectedLog.requestId || 'REQ-SYS'}</p>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sub-Header Telemetry Metadata */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Actor</span>
                <span className="font-extrabold text-slate-800">
                  {selectedLog.actor?.name || (selectedLog.userId ? `${selectedLog.userId.firstName} ${selectedLog.userId.lastName}` : 'System')}
                </span>
                <span className="text-[10px] text-slate-500 block">({selectedLog.actor?.role || 'system'})</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">IP & Location</span>
                <span className="font-mono font-semibold text-slate-800">{formatIpDisplay(selectedLog.ipAddress)}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Endpoint Method</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedLog.method || 'POST'} {selectedLog.endpoint || '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                <span className={`font-extrabold text-xs ${selectedLog.status === 'FAILED' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selectedLog.status || 'SUCCESS'}
                </span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6 pt-3 bg-white gap-4">
              <button
                onClick={() => setModalTab('diff')}
                className={`pb-3 text-xs font-extrabold cursor-pointer border-b-2 transition-all ${
                  modalTab === 'diff' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Field-by-Field Diff Comparison
              </button>
              <button
                onClick={() => setModalTab('raw')}
                className={`pb-3 text-xs font-extrabold cursor-pointer border-b-2 transition-all ${
                  modalTab === 'raw' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Raw JSON Snapshot
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedLog.reason && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <strong>Reason / Context:</strong> {selectedLog.reason}
                </div>
              )}

              {modalTab === 'diff' ? (
                (() => {
                  const diffs = computeFieldDiffs(selectedLog.before, selectedLog.after);
                  if (diffs.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs font-medium">
                        No field mutations recorded for this event.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">
                            <th className="py-2.5 px-4">Field Name</th>
                            <th className="py-2.5 px-4 bg-rose-50/50 text-rose-700">Before State</th>
                            <th className="py-2.5 px-4 bg-emerald-50/50 text-emerald-700">After State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {diffs.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-bold text-slate-700">{d.field}</td>
                              <td className="py-3 px-4 text-rose-700 bg-rose-50/20 font-semibold break-all">
                                {typeof d.before === 'object' ? JSON.stringify(d.before) : String(d.before)}
                              </td>
                              <td className="py-3 px-4 text-emerald-700 bg-emerald-50/20 font-semibold break-all">
                                {typeof d.after === 'object' ? JSON.stringify(d.after) : String(d.after)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed max-h-96">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog, null, 2)}</pre>
                </div>
              )}

              {/* User Agent Information */}
              {selectedLog.userAgent && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-mono">
                  <strong className="block text-slate-700 mb-0.5 uppercase">User-Agent Device Fingerprint:</strong>
                  {selectedLog.userAgent}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer transition-colors"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
