import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';

interface ProtectedStudentOrAdminRouteProps {
  children: ReactNode;
}

export const ProtectedStudentOrAdminRoute = ({ children }: ProtectedStudentOrAdminRouteProps) => {
  const { isStudentLoggedIn } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar se é admin usando localStorage
  const isAdminLoggedIn = () => {
    try {
      const adminSession = localStorage.getItem('admin_session');
      return !!adminSession;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Se nem aluno nem admin está logado, redirecionar para login
    if (!isStudentLoggedIn && !isAdminLoggedIn()) {
      navigate('/', { replace: true });
    }
  }, [isStudentLoggedIn, navigate, location.pathname]);

  // Se não está logado como aluno nem admin, não renderizar
  if (!isStudentLoggedIn && !isAdminLoggedIn()) {
    return null;
  }

  return <>{children}</>;
};