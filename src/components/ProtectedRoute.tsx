
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isStudentLoggedIn } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Só redireciona se não estiver logado E não estiver tentando acessar páginas de login
    const loginPages = ['/aluno-login', '/visitante-login', '/login', '/'];
    const isLoginPage = loginPages.includes(location.pathname);
    
    console.log('ProtectedRoute - isStudentLoggedIn:', isStudentLoggedIn);
    console.log('ProtectedRoute - current path:', location.pathname);
    console.log('ProtectedRoute - isLoginPage:', isLoginPage);
    
    if (!isStudentLoggedIn && !isLoginPage) {
      console.log('Redirecionando para login - usuário não logado');
      navigate('/aluno-login', { replace: true });
    }
  }, [isStudentLoggedIn, navigate, location.pathname]);

  // Se não está logado e não está numa página de login, não renderizar
  const loginPages = ['/aluno-login', '/visitante-login', '/login', '/'];
  const isLoginPage = loginPages.includes(location.pathname);
  
  if (!isStudentLoggedIn && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
};
