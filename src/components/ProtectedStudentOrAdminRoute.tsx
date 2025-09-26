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
      console.log('ProtectedStudentOrAdminRoute - Admin session check:', adminSession);
      return !!adminSession;
    } catch {
      console.log('ProtectedStudentOrAdminRoute - Error checking admin session');
      return false;
    }
  };

  useEffect(() => {
    const adminLoggedIn = isAdminLoggedIn();
    console.log('ProtectedStudentOrAdminRoute - Student logged in:', isStudentLoggedIn);
    console.log('ProtectedStudentOrAdminRoute - Admin logged in:', adminLoggedIn);
    console.log('ProtectedStudentOrAdminRoute - Current path:', location.pathname);

    // Se nem aluno nem admin está logado, redirecionar para login
    if (!isStudentLoggedIn && !adminLoggedIn) {
      console.log('ProtectedStudentOrAdminRoute - Redirecionando para login - nem aluno nem admin logado');
      navigate('/', { replace: true });
    }
  }, [isStudentLoggedIn, navigate, location.pathname]);

  // Se não está logado como aluno nem admin, não renderizar
  const adminLoggedIn = isAdminLoggedIn();
  if (!isStudentLoggedIn && !adminLoggedIn) {
    console.log('ProtectedStudentOrAdminRoute - Não renderizando - nem aluno nem admin logado');
    return null;
  }

  return <>{children}</>;
};