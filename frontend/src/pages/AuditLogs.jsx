import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { AlertCircle, Terminal, Search } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
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
    fetchLogs();
  }, []);

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'login': return 'bg-slate-700 text-slate-100';
      case 'score_change': return 'bg-indigo-600 text-white';
      case 'review_update': return 'bg-amber-600 text-white';
      case 'user_modification': return 'bg-sky-600 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const filteredLogs = logs.filter(log => {
    const userString = `${log.userId?.firstName} ${log.userId?.lastName} ${log.userId?.employeeCode}`.toLowerCase();
    const actionString = log.action.toLowerCase();
    const entityString = log.entityType.toLowerCase();
    
    return userString.includes(searchTerm.toLowerCase()) ||
           actionString.includes(searchTerm.toLowerCase()) ||
           entityString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Security Audit Logs</h2>
          <p className="text-[10px] text-slate-500 mt-1">Real-time immutable database action logs</p>
        </div>

        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, action, entity..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs outline-none focus:border-sky-500 text-slate-800"
          />
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
          <p className="text-center text-slate-400 py-12 text-xs">No audit logs matching search parameters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-lg">Timestamp</th>
                  <th className="py-3 px-4">Trigger User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Modified</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 rounded-r-lg">State Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System'}
                      <span className="text-[10px] text-slate-400 block mt-0.5">Code: {log.userId?.employeeCode || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-700 block">{log.entityType}</span>
                      <span className="text-[9px] text-slate-405 block mt-0.5 truncate max-w-28">ID: {log.entityId}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono">{log.ipAddress || '-'}</td>
                    <td className="py-4 px-4">
                      {log.before || log.after ? (
                        <details className="cursor-pointer group">
                          <summary className="text-[10px] text-sky-700 hover:text-sky-850 font-bold select-none list-none flex items-center gap-1">
                            <Terminal size={10} />
                            <span>View State Diff</span>
                          </summary>
                          <div className="mt-2 p-3 bg-slate-900 text-emerald-400 font-mono text-[9px] rounded-lg overflow-x-auto max-w-md max-h-48 border border-slate-800 shadow-inner leading-relaxed">
                            {log.before && (
                              <div className="mb-2">
                                <p className="text-slate-500 font-bold mb-0.5 uppercase tracking-wide">// State Before:</p>
                                <pre className="whitespace-pre">{JSON.stringify(log.before, null, 2)}</pre>
                              </div>
                            )}
                            {log.after && (
                              <div>
                                <p className="text-slate-500 font-bold mb-0.5 uppercase tracking-wide">// State After:</p>
                                <pre className="whitespace-pre">{JSON.stringify(log.after, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No diff available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
