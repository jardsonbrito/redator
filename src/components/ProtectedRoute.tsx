
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useAuthUser } from '@/hooks/useAuthUser';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isStudentLoggedIn } = useStudentAuth();
  const { isAuthenticated, loading } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Aguardar carregamento da autenticação
    if (loading) return;
    
    // Páginas que não precisam de autenticação
    const loginPages = ['/aluno-login', '/aluno-auth', '/visitante-login', '/login', '/'];
    const isLoginPage = loginPages.includes(location.pathname);
    
    console.log('ProtectedRoute - isStudentLoggedIn:', isStudentLoggedIn);
    console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
    console.log('ProtectedRoute - current path:', location.pathname);
    console.log('ProtectedRoute - isLoginPage:', isLoginPage);
    
    // Se não está logado (nem como aluno nem como usuário autenticado) e não está numa página de login
    if (!isStudentLoggedIn && !isAuthenticated && !isLoginPage) {
      console.log('Redirecionando para login - usuário não logado');
      navigate('/aluno-auth', { replace: true });
    }
  }, [isStudentLoggedIn, isAuthenticated, loading, navigate, location.pathname]);

  // Se ainda está carregando, mostrar loading
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  // Se não está logado e não está numa página de login, não renderizar
  const loginPages = ['/aluno-login', '/aluno-auth', '/visitante-login', '/login', '/'];
  const isLoginPage = loginPages.includes(location.pathname);
  
  if (!isStudentLoggedIn && !isAuthenticated && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
};
