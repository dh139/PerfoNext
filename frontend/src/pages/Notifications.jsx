import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Bell, Check, Clock, AlertCircle, ClipboardList, Award } from 'lucide-react';

const NOTIFICATION_STYLE = {
  review_assigned: { color: 'bg-sky-50 text-sky-700', icon: Clock },
  assessment_pending: { color: 'bg-amber-50 text-amber-700', icon: AlertCircle },
  manager_review_pending: { color: 'bg-amber-50 text-amber-700', icon: ClipboardList },
  review_completed: { color: 'bg-emerald-50 text-emerald-700', icon: Check },
  final_score_ready: { color: 'bg-indigo-50 text-indigo-700', icon: Award }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      // Update local state
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-slate-800">
      
      {/* Hallmark Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
           
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Bell className="text-sky-400" size={24} />
              <span>Notification Alerts & Activity Stream</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time automated system dispatches, evaluation cycle reminders, & review completion notifications.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total System Alerts</p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{notifications.length}</h2>
              <span className="text-[9px] text-sky-400 font-medium">Messages received</span>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
              <Bell size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Unread Alerts</p>
              <h2 className="text-xl font-extrabold text-amber-400 mt-0.5">{unreadCount}</h2>
              <span className="text-[9px] text-amber-400 font-medium">Requires attention</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <AlertCircle size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dismissed Alerts</p>
              <h2 className="text-xl font-extrabold text-emerald-400 mt-0.5">{readCount}</h2>
              <span className="text-[9px] text-emerald-400 font-medium">Acknowledged</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Check size={20} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dispatch Status</p>
              <h2 className="text-xl font-extrabold text-indigo-300 mt-0.5">Live Stream</h2>
              <span className="text-[9px] text-indigo-400 font-bold uppercase">Real-Time Sync</span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications Workbench */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <span>Recent System Alerts & Dispatches</span>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                {unreadCount} Unread
              </span>
            )}
          </h3>
        </div>
        
        {notifications.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
            <Bell size={36} className="text-slate-300 mx-auto" />
            <p className="text-slate-500 text-xs font-bold">You have no notification alerts recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`py-4 flex justify-between items-center gap-4 transition-colors ${
                  !n.isRead ? 'bg-sky-50/40 px-4 -mx-4 rounded-2xl border border-sky-100/80 my-1' : 'hover:bg-slate-50/60 px-4 -mx-4 rounded-2xl'
                }`}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const style = NOTIFICATION_STYLE[n.type] || NOTIFICATION_STYLE.review_completed;
                    const Icon = style.icon;
                    return (
                      <div className={`p-2.5 rounded-xl shrink-0 ${style.color}`}>
                        <Icon size={18} />
                      </div>
                    );
                  })()}
                  <div>
                    <p className={`text-xs ${!n.isRead ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n._id)}
                    className="flex items-center gap-1 text-[10px] font-extrabold text-sky-700 hover:text-sky-900 bg-white border border-sky-200 hover:bg-sky-50 px-3 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-3xs transition-colors"
                  >
                    <Check size={12} />
                    <span>Dismiss</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Notifications;
