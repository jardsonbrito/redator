
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isStudentLoggedIn } = useStudentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isStudentLoggedIn) {
      // Se não está logado como estudante, redirecionar para a página de login de aluno
      navigate('/aluno-login', { replace: true });
    }
  }, [isStudentLoggedIn, navigate]);

  // Se não está logado, não renderizar nada (a navegação já foi feita)
  if (!isStudentLoggedIn) {
    return null;
  }

  return <>{children}</>;
};
