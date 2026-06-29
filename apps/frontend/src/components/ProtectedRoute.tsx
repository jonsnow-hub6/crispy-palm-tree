import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import type { Permission } from '@/store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export function ProtectedRoute({
  children,
  requiredPermission,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Save the attempted location so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has the required permission for this page
  if (requiredPermission && !user.permission.includes(requiredPermission)) {
    // User is logged in but doesn't have permission — redirect to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
