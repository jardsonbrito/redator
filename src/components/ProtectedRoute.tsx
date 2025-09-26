
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

    // Verificar se é admin logado
    const adminSession = localStorage.getItem('admin_session');
    const isAdminLoggedIn = !!adminSession;


    // Se nem aluno nem corretor nem admin está logado e não está numa página de login
    if (!isStudentLoggedIn && !isCorretorLoggedIn && !isAdminLoggedIn && !isLoginPage) {
      console.log('Redirecionando para login - usuário não logado');
      navigate('/', { replace: true });
    }
  }, [isStudentLoggedIn, navigate, location.pathname]);

  // Se não está logado e não está numa página de login, não renderizar
  const loginPages = ['/aluno-login', '/visitante-login', '/login', '/', '/corretor/login'];
  const isLoginPage = loginPages.includes(location.pathname);
  const corretorSession = localStorage.getItem('corretor_session');
  const isCorretorLoggedIn = !!corretorSession;
  const adminSession = localStorage.getItem('admin_session');
  const isAdminLoggedIn = !!adminSession;

  if (!isStudentLoggedIn && !isCorretorLoggedIn && !isAdminLoggedIn && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
};
