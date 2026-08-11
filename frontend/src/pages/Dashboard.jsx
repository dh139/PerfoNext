import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

// Sub-dashboards
import EmployeeDashboard from './dashboard/EmployeeDashboard';
import ManagerDashboard from './dashboard/ManagerDashboard';
import HRDashboard from './dashboard/HRDashboard';
import ExecutiveDashboard from './dashboard/ExecutiveDashboard';
import AddWorkLogModal from './dashboard/AddWorkLogModal';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddWorkLogOpen, setIsAddWorkLogOpen] = useState(false);

  const fetchDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/api/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (!silent) setError('Failed to load dashboard statistics.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();

      const interval = setInterval(() => {
        fetchDashboard(true);
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Gathering analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-center gap-3">
        <AlertCircle className="text-rose-600" />
        <span>{error}</span>
      </div>
    );
  }

  const profile = data?.profile || {};
  const deptId = user?.departmentId?._id || user?.departmentId || profile?.departmentId?._id || profile?.departmentId;

  // Choose sub-dashboard based on role
  let dashboardView = null;
  if (user?.role === 'employee') {
    dashboardView = <EmployeeDashboard data={data} user={user} onAddWorkLogClick={() => setIsAddWorkLogOpen(true)} />;
  } else if (user?.role === 'manager') {
    dashboardView = <ManagerDashboard data={data} user={user} onAddWorkLogClick={() => setIsAddWorkLogOpen(true)} />;
  } else if (user?.role === 'executive') {
    dashboardView = <ExecutiveDashboard data={data} user={user} />;
  } else if (user?.role === 'hr' || user?.role === 'admin') {
    dashboardView = <HRDashboard data={data} user={user} onAddWorkLogClick={() => setIsAddWorkLogOpen(true)} />;
  } else {
    dashboardView = <div className="p-6 bg-amber-50 text-amber-800 rounded-lg">Role Dashboard not defined.</div>;
  }

  return (
    <>
      {dashboardView}
      <AddWorkLogModal
        isOpen={isAddWorkLogOpen}
        onClose={() => setIsAddWorkLogOpen(false)}
        user={user}
        deptId={deptId}
        onSuccess={fetchDashboard}
      />
    </>
  );
};

export default Dashboard;