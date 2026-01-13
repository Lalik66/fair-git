import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'vendor' | 'user';
  allowMustChangePassword?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowMustChangePassword = false
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page, saving the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user must change password
  if (user.mustChangePassword && !allowMustChangePassword) {
    // Redirect to change password page
    return <Navigate to="/change-password" replace />;
  }

  // If on change password page but doesn't need to change password, redirect to dashboard
  if (allowMustChangePassword && !user.mustChangePassword && location.pathname === '/change-password') {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'vendor') {
      return <Navigate to="/vendor" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    // Check if user has the required role
    // Admin can access any route
    if (user.role === 'admin') {
      return <>{children}</>;
    }

    // Vendor can access vendor and user routes
    if (user.role === 'vendor' && (requiredRole === 'vendor' || requiredRole === 'user')) {
      return <>{children}</>;
    }

    // User can only access user routes
    if (user.role === 'user' && requiredRole === 'user') {
      return <>{children}</>;
    }

    // No permission - redirect based on role
    if (user.role === 'vendor') {
      return <Navigate to="/vendor" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
