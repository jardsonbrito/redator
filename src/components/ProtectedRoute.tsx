
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
    const loginPages = ['/aluno-login', '/visitante-login', '/login', '/', '/corretor/login'];
    const isLoginPage = loginPages.includes(location.pathname);
    
    // Verificar se é corretor logado
    const corretorSession = localStorage.getItem('corretor_session');
    const isCorretorLoggedIn = !!corretorSession;
    
    console.log('ProtectedRoute - isStudentLoggedIn:', isStudentLoggedIn);
    console.log('ProtectedRoute - isCorretorLoggedIn:', isCorretorLoggedIn);
    console.log('ProtectedRoute - current path:', location.pathname);
    console.log('ProtectedRoute - isLoginPage:', isLoginPage);
    
    // Se nem aluno nem corretor está logado e não está numa página de login
    if (!isStudentLoggedIn && !isCorretorLoggedIn && !isLoginPage) {
      console.log('Redirecionando para login - usuário não logado');
      navigate('/', { replace: true });
    }
  }, [isStudentLoggedIn, navigate, location.pathname]);

  // Se não está logado e não está numa página de login, não renderizar
  const loginPages = ['/aluno-login', '/visitante-login', '/login', '/', '/corretor/login'];
  const isLoginPage = loginPages.includes(location.pathname);
  const corretorSession = localStorage.getItem('corretor_session');
  const isCorretorLoggedIn = !!corretorSession;
  
  if (!isStudentLoggedIn && !isCorretorLoggedIn && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
};
