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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-6">Recent System Alerts</h3>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl">
            <Bell size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-semibold">You have no notification alerts.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`py-4 flex justify-between items-start gap-4 transition-colors ${!n.isRead ? 'bg-sky-50/20 px-3 -mx-3 rounded-lg' : ''}`}
              >
                <div className="flex gap-3">
                  {(() => {
                    const style = NOTIFICATION_STYLE[n.type] || NOTIFICATION_STYLE.review_completed;
                    const Icon = style.icon;
                    return (
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${style.color}`}>
                        <Icon size={16} />
                      </div>
                    );
                  })()}
                  <div>
                    <p className={`text-xs ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n._id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-sky-700 hover:text-sky-800 border border-sky-100 hover:bg-sky-50 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Check size={10} />
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
