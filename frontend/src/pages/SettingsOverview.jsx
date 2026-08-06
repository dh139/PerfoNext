import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Layers, FileText, ClipboardList } from 'lucide-react';
import useAuthStore from '../store/authStore';

const SettingsOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role;

  const isAdminOrExec = ['admin', 'executive'].includes(role);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800/40 w-fit block">
            Enterprise Configuration Hub
          </span>
          <h1 className="text-xl lg:text-3xl font-black tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-xs lg:text-sm max-w-2xl font-medium leading-relaxed">
            Configure attendance policies, customize daily journal templates, manage company holiday calendars, and control enterprise organizational structure.
          </p>
        </div>
      </div>

      {/* Grid of Settings Cards */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Configuration Desks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Attendance Rules */}
          {isAdminOrExec && (
            <div 
              onClick={() => navigate('/settings/attendance-rules')}
              className="bg-white border border-slate-200/80 hover:border-sky-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
              <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-4 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-2xs">
                <Clock size={22} />
              </div>
              <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-sky-600 transition-colors">Attendance Rules</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">Configure shift timings, grace periods, auto-deduction parameters, minimum work thresholds, and early exit parameters.</p>
              <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-sky-600 group-hover:translate-x-1.5 transition-transform">
                <span>Configure Attendance Rules</span>
                <span>&rarr;</span>
              </div>
            </div>
          )}

          {/* Card 2: Holiday Calendar */}
          <div 
            onClick={() => navigate('/settings/holidays')}
            className="bg-white border border-slate-200/80 hover:border-emerald-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
              <Calendar size={22} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-emerald-600 transition-colors">Holiday Calendar</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">Manage official company holidays, calendar events, and regional or organization-wide holiday lists.</p>
            <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 group-hover:translate-x-1.5 transition-transform">
              <span>Manage Holiday Calendar</span>
              <span>&rarr;</span>
            </div>
          </div>

          {/* Card 3: Org Structure */}
          <div 
            onClick={() => navigate('/admin/org')}
            className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
              <Layers size={22} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors">Org Structure</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">Visualize and manage reporting lines, departments, designations, and organizational node mappings.</p>
            <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 group-hover:translate-x-1.5 transition-transform">
              <span>Manage Org Structure</span>
              <span>&rarr;</span>
            </div>
          </div>

          {/* Card 4: Audit Trails */}
          <div 
            onClick={() => navigate('/admin/audit')}
            className="bg-white border border-slate-200/80 hover:border-amber-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
              <FileText size={22} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-amber-600 transition-colors">Audit Trails</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">Track security updates, profile changes, and system access logs for administrative oversight.</p>
            <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-amber-600 group-hover:translate-x-1.5 transition-transform">
              <span>View Audit Trails</span>
              <span>&rarr;</span>
            </div>
          </div>

          {/* Card 5: Daily Work Log Templates */}
          <div 
            onClick={() => navigate('/management/work-journal-forms')}
            className="bg-white border border-slate-200/80 hover:border-rose-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:scale-150 transition-all pointer-events-none" />
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
              <ClipboardList size={22} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-rose-600 transition-colors">Daily Work Log Templates</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">Configure form requirements, field inputs, and department-specific custom fields for work logs.</p>
            <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black text-rose-600 group-hover:translate-x-1.5 transition-transform">
              <span>Manage Templates</span>
              <span>&rarr;</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsOverview;
