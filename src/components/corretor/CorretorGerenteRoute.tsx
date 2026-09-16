import { Navigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";

/**
 * Protege rotas de corretor que exigem ao menos uma turma 'externo'.
 * Corretores cujas turmas são todas gerenciadas pelo admin são redirecionados para /corretor.
 */
export const CorretorGerenteRoute = ({ children }: { children: React.ReactNode }) => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, loading: loadingPerm } = useCorretorPermissoes();

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor" replace />;

  return <>{children}</>;
};
