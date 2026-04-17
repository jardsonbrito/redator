import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedStudentOrAdminRouteProps {
  children: ReactNode;
}

export const ProtectedStudentOrAdminRoute = ({ children }: ProtectedStudentOrAdminRouteProps) => {
  const { isStudentLoggedIn } = useStudentAuth();
  const { isAdmin, loading: adminLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAllowed = isStudentLoggedIn || isAdmin;

  useEffect(() => {
    if (!adminLoading && !isAllowed) {
      navigate('/', { replace: true });
    }
  }, [adminLoading, isAllowed, navigate, location.pathname]);

  if (adminLoading) return null;
  if (!isAllowed) return null;

  return <>{children}</>;
};
