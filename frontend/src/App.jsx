import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import SelfAssessmentForm from './pages/SelfAssessmentForm';
import ManagerReviewForm from './pages/ManagerReviewForm';
import EmployeeReport from './pages/EmployeeReport';
import DepartmentReports from './pages/DepartmentReports';
import CompletionReport from './pages/CompletionReport';
import KpiTemplates from './pages/KpiTemplates';
import ReviewCycles from './pages/ReviewCycles';
import UserManagement from './pages/UserManagement';
import OrgStructure from './pages/OrgStructure';
import AuditLogs from './pages/AuditLogs';
import PipWorkspace from './pages/PipWorkspace';
import PromotionsWorkspace from './pages/PromotionsWorkspace';
import RecognitionsWorkspace from './pages/RecognitionsWorkspace';
import FeedbackCenter from './pages/FeedbackCenter';
import SkillMatrix from './pages/SkillMatrix';
import Certifications from './pages/Certifications';
import IntegrationsWorkspace from './pages/IntegrationsWorkspace';
import LandingPage from './pages/LandingPage';
import useAuthStore from './store/authStore';

function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, [isAuthenticated, fetchMe]);

  return (
    <>
      <ToastContainer />
      <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Routes (All Roles) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Profile */}
          <Route path="/profile" element={<Profile />} />

          {/* Notifications */}
          <Route path="/notifications" element={<Notifications />} />
          
          {/* PIP Workspace */}
          <Route path="/pips" element={<PipWorkspace />} />

          {/* Promotions Workspace */}
          <Route path="/promotions" element={<PromotionsWorkspace />} />

          {/* Recognitions Workspace */}
          <Route path="/recognitions" element={<RecognitionsWorkspace />} />

          {/* Phase 3 Workspaces */}
          <Route path="/feedback" element={<FeedbackCenter />} />
          <Route path="/skills" element={<SkillMatrix />} />
          <Route path="/certifications" element={<Certifications />} />

          {/* Phase 4 Ecosystem Integrations */}
          <Route path="/integrations" element={<IntegrationsWorkspace />} />
          
          {/* Employee Report (Self check) */}
          <Route path="/reports/employee/:id" element={<EmployeeReport />} />
          
          {/* Self Assessment Form */}
          <Route element={<ProtectedRoute allowedRoles={['employee', 'manager', 'hr', 'executive']} />}>
            <Route path="/assessment/:cycleId" element={<SelfAssessmentForm />} />
          </Route>

          {/* Manager Review Form */}
          <Route element={<ProtectedRoute allowedRoles={['manager', 'hr', 'admin', 'executive']} />}>
            <Route path="/review/:cycleId/:employeeId" element={<ManagerReviewForm />} />
          </Route>

          {/* Sub-group: Manager, HR, Admin, Executive */}
          <Route element={<ProtectedRoute allowedRoles={['manager', 'hr', 'admin', 'executive']} />}>
            <Route path="/reports/department" element={<DepartmentReports />} />
            <Route path="/reports/completion" element={<CompletionReport />} />
          </Route>

          {/* Sub-group: HR, Admin, Executive */}
          <Route element={<ProtectedRoute allowedRoles={['hr', 'admin', 'executive']} />}>
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/hr/cycles" element={<ReviewCycles />} />
            <Route path="/hr/kpis" element={<KpiTemplates />} />
            <Route path="/hr/kpi-templates" element={<KpiTemplates />} />
            <Route path="/admin/org" element={<OrgStructure />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
