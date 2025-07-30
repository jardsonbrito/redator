import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfessorAuth } from '@/hooks/useProfessorAuth';

interface ProfessorProtectedRouteProps {
  children: React.ReactNode;
  requirePasswordChange?: boolean;
}

export const ProfessorProtectedRoute = ({ 
  children, 
  requirePasswordChange = false 
}: ProfessorProtectedRouteProps) => {
  const { professor, loading } = useProfessorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      // Se não estiver logado, redirecionar para login
      if (!professor) {
        navigate('/professor/login', { replace: true });
        return;
      }

      // Se for primeiro login mas não está na página de trocar senha
      if (professor.primeiro_login && location.pathname !== '/professor/trocar-senha') {
        navigate('/professor/trocar-senha', { replace: true });
        return;
      }

      // Se não for primeiro login mas está na página de trocar senha
      if (!professor.primeiro_login && location.pathname === '/professor/trocar-senha') {
        navigate('/professor/dashboard', { replace: true });
        return;
      }

      // Se requer troca de senha mas ainda não trocou
      if (requirePasswordChange && professor.primeiro_login) {
        navigate('/professor/trocar-senha', { replace: true });
        return;
      }
    }
  }, [professor, loading, navigate, location.pathname, requirePasswordChange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!professor) {
    return null;
  }

  return <>{children}</>;
};