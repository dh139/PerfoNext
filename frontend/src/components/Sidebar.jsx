import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getUserAvatarUrl } from '../utils/avatar';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Calendar,
  Bell,
  User as UserIcon,
  LogOut,
  FileText,
  Shield,
  Activity,
  Award,
  TrendingUp,
  MessageSquare,
  Layers,
  Cpu,
  X
} from 'lucide-react';

const Sidebar = ({ sidebarOpen = false, setSidebarOpen }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (setSidebarOpen) setSidebarOpen(false);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'hr': return 'HR Manager';
      case 'manager': return 'Reporting Manager';
      case 'employee': return 'Employee';
      case 'executive': return 'CEO / Mgmt';
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'hr': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'manager': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'employee': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'executive': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const isActive = (path) => location.pathname === path;

  const handleNavClick = () => {
    if (setSidebarOpen) setSidebarOpen(false);
  };

  const linkClass = (path) => `
    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
    ${isActive(path)
      ? 'bg-sky-700 text-white shadow-lg shadow-sky-700/20'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
  `;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col text-slate-100 h-screen fixed left-0 top-0 z-40 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide uppercase text-white">EPTS</h1>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

      {/* User Session card */}
      {user && (
        <Link
          to="/profile"
          className="p-4 mx-4 my-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 flex flex-col gap-2 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={getUserAvatarUrl(user)}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800"
            />
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-200 truncate leading-tight">
                {user.firstName} {user.lastName}
              </h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="mt-1">
            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
          </div>
        </Link>
      )}

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        <Link to="/" className={linkClass('/')}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        {/* My Workspace Section */}
        <div className="pt-3 pb-1 border-t border-slate-800/80 my-2">
          <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">My Workspace</p>
        </div>

        <Link to="/profile" className={linkClass('/profile')}>
          <UserIcon size={18} />
          <span>Profile</span>
        </Link>

        <Link to="/skills" className={linkClass('/skills')}>
          <Layers size={18} />
          <span>Skills</span>
        </Link>

        <Link to="/certifications" className={linkClass('/certifications')}>
          <Award size={18} />
          <span>Certifications</span>
        </Link>

        <Link to="/recognitions" className={linkClass('/recognitions')}>
          <Award size={18} />
          <span>Awards</span>
        </Link>

        {/* Performance Section */}
        <div className="pt-3 pb-1 border-t border-slate-800/80 my-2">
          <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Performance</p>
        </div>

        {user && (
          <Link to={`/reports/employee/${user.id}`} className={linkClass(`/reports/employee/${user.id}`)}>
            <ClipboardList size={18} />
            <span>Current Review</span>
          </Link>
        )}

        {user && (
          <Link to={`/reports/employee/${user.id}`} className={linkClass(`/reports/employee/${user.id}`)}>
            <FileText size={18} />
            <span>Review History</span>
          </Link>
        )}

        <Link to="/feedback" className={linkClass('/feedback')}>
          <MessageSquare size={18} />
          <span>360° Feedback</span>
        </Link>

        {/* Development Section */}
        <div className="pt-3 pb-1 border-t border-slate-800/80 my-2">
          <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Development</p>
        </div>

        <Link to="/integrations" className={linkClass('/integrations')}>
          <Cpu size={18} />
          <span>Learning</span>
        </Link>

        <Link to="/pips" className={linkClass('/pips')}>
          <ClipboardList size={18} />
          <span>PIP Workspace</span>
        </Link>

        <Link to="/promotions" className={linkClass('/promotions')}>
          <TrendingUp size={18} />
          <span>Promotions</span>
        </Link>

        {/* Communication Section */}
        <div className="pt-3 pb-1 border-t border-slate-800/80 my-2">
          <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Communication</p>
        </div>

        <Link to="/notifications" className={linkClass('/notifications')}>
          <Bell size={18} />
          <span>Notifications</span>
        </Link>

        {/* Manager & Executive Links */}
        {(user?.role === 'manager' || user?.role === 'executive') && (
          <>
            <div className="pt-4 pb-2 border-t border-slate-800/80 my-3">
              <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Management</p>
            </div>
            {user?.role === 'manager' && (
              <Link to="/manager/reviews" className={linkClass('/manager/reviews')}>
                <ClipboardList size={18} />
                <span>Pending Reviews</span>
              </Link>
            )}
            <Link to="/reports/department" className={linkClass('/reports/department')}>
              <FileText size={18} />
              <span>Team Reports</span>
            </Link>
            {user?.role === 'executive' && (
              <>
                <Link to="/reports/completion" className={linkClass('/reports/completion')}>
                  <ClipboardList size={18} />
                  <span>Completion Report</span>
                </Link>
                <Link to="/admin/users" className={linkClass('/admin/users')}>
                  <Users size={18} />
                  <span>Users Database</span>
                </Link>
                <Link to="/admin/org" className={linkClass('/admin/org')}>
                  <Shield size={18} />
                  <span>Org Structure</span>
                </Link>
              </>
            )}
          </>
        )}

        {/* HR Desk */}
        {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'executive') && (
          <>
            <div className="pt-4 pb-2 border-t border-slate-800/80 my-3">
              <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Management & HR Desk</p>
            </div>
            {user?.role !== 'executive' && (
              <Link to="/admin/users" className={linkClass('/admin/users')}>
                <Users size={18} />
                <span>Users Database</span>
              </Link>
            )}
            {user?.role !== 'executive' && (
              <Link to="/hr/kpis" className={linkClass('/hr/kpis')}>
                <Briefcase size={18} />
                <span>KPI Templates</span>
              </Link>
            )}
            <Link to="/hr/cycles" className={linkClass('/hr/cycles')}>
              <Calendar size={18} />
              <span>Review Cycles</span>
            </Link>
            {user?.role !== 'executive' && (
              <Link to="/reports/completion" className={linkClass('/reports/completion')}>
                <ClipboardList size={18} />
                <span>Completion Report</span>
              </Link>
            )}
          </>
        )}

        {/* Admin & System Administration */}
        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2 border-t border-slate-800/80 my-3">
              <p className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">System Administration</p>
            </div>
            <Link to="/admin/org" className={linkClass('/admin/org')}>
              <Shield size={18} />
              <span>Org Structure</span>
            </Link>
            <Link to="/admin/audit" className={linkClass('/admin/audit')}>
              <FileText size={18} />
              <span>Audit Trails</span>
            </Link>
          </>
        )}
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
