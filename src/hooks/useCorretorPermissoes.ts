import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCorretorAuth } from "./useCorretorAuth";

/**
 * Retorna se o corretor tem permissão de gestão (criar/editar/excluir temas, simulados, eventos).
 * A permissão existe quando ao menos UMA das turmas do corretor tem gerenciada_por = 'externo'.
 * Turmas com gerenciada_por = 'admin' são turmas onde o corretor só corrige — sem poder criar conteúdo.
 */
export function useCorretorPermissoes() {
  const { corretor } = useCorretorAuth();
  const turmas: string[] = corretor?.turmas_autorizadas ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["corretor-permissoes", turmas],
    queryFn: async () => {
      if (turmas.length === 0) return { podeGerenciar: false };

      const { data, error } = await supabase
        .from("turmas_alunos")
        .select("gerenciada_por")
        .in("nome", turmas);

      if (error) throw error;

      const podeGerenciar = (data ?? []).some(
        (t) => t.gerenciada_por === "externo"
      );
      return { podeGerenciar };
    },
    enabled: !!corretor && turmas.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (!corretor || turmas.length === 0) {
    return { podeGerenciar: false, loading: isLoading };
  }

  return {
    podeGerenciar: data?.podeGerenciar ?? false,
    loading: isLoading,
  };
}
