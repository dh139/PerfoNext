import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    // If authenticated but role not allowed, redirect to default dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
