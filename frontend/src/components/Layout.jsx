import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { Bell, Menu, X, CheckCircle, AlertCircle } from 'lucide-react';

const Layout = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCycle, setActiveCycle] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch unread notification counts
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/api/notifications');
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to load notifications count:', err);
      }
    };

    // Fetch active cycles to show header alert
    const fetchActiveCycles = async () => {
      try {
        const res = await api.get('/api/review-cycles');
        const active = res.data.find(c => c.status === 'active');
        if (active) {
          setActiveCycle(active);
        }
      } catch (err) {
        console.error('Failed to load active cycles:', err);
      }
    };

    if (user) {
      fetchNotifications();
      fetchActiveCycles();
      // Fetch notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview Dashboard';
    if (path === '/dashboard') return 'Overview Dashboard';
    if (path === '/notifications') return 'Notification Alerts';
    if (path.startsWith('/reports/employee')) return 'Performance Summary Report';
    if (path === '/reports/department') return 'Team Performance Summary';
    if (path === '/reports/completion') return 'Assessment Completion Status';
    if (path === '/hr/kpis') return 'KPI Evaluation Templates';
    if (path === '/hr/cycles') return 'Review Cycles Settings';
    if (path === '/manager/reviews') return 'Subordinate Reviews Workspace';
    if (path === '/admin/users') return 'Employee Database';
    if (path === '/admin/org') return 'Organization Structure';
    if (path === '/admin/audit') return 'Security Audit Trail';
    return 'PerfoNext Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Fixed Responsive Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Viewport Content */}
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        {/* Top Sticky Header */}
        <header className="bg-white border-b border-slate-200 h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Navigation Sidebar"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex flex-col justify-center items-center gap-1.5 w-9 h-9 border border-slate-200"
            >
              <span
                className={`w-4 h-0.5 bg-slate-700 rounded-full transition-all duration-300 transform origin-center ${
                  sidebarOpen ? 'rotate-45 translate-y-1.5 bg-sky-600' : ''
                }`}
              />
              <span
                className={`w-4 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${
                  sidebarOpen ? 'opacity-0 scale-0' : ''
                }`}
              />
              <span
                className={`w-4 h-0.5 bg-slate-700 rounded-full transition-all duration-300 transform origin-center ${
                  sidebarOpen ? '-rotate-45 -translate-y-1.5 bg-sky-600' : ''
                }`}
              />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
              <p className="text-xs text-slate-500 hidden sm:block">Welcome, {user?.firstName} {user?.lastName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Active Cycle Quick Status Banner */}
            {activeCycle && (
              <div className="hidden lg:flex items-center gap-2 bg-sky-50 text-sky-800 border border-sky-100 px-3 py-1.5 rounded-lg text-xs font-semibold">
                <AlertCircle size={14} className="text-sky-700 animate-pulse" />
                <span>Active Cycle: {activeCycle.reviewMonth}</span>
              </div>
            )}

            {/* Notification Bell Badge */}
            <Link to="/notifications" className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center font-bold text-xs uppercase">
                {user?.firstName[0]}{user?.lastName[0]}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic page container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
