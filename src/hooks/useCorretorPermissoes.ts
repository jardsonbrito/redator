import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCorretorAuth } from "./useCorretorAuth";

export interface TurmaGerenciada {
  id: string;
  nome: string;
}

export interface CorretorPermissoes {
  podeGerenciar: boolean;
  turmasGerenciadas: TurmaGerenciada[];
  idsTurmasGerenciadas: string[];
  nomesTurmasGerenciadas: string[];
  loading: boolean;
}

/**
 * Retorna as permissões de gestão do corretor logado.
 *
 * podeGerenciar = true quando o corretor é gestor_corretor_id de ao menos
 * uma turma com gerenciada_por = 'externo'. Isso ativa menus, cards e ações
 * administrativas dentro do próprio painel do corretor.
 *
 * turmasGerenciadas lista apenas as turmas que o corretor administra —
 * todo dado exibido ao gestor deve ser filtrado por essa lista.
 */
export function useCorretorPermissoes(): CorretorPermissoes {
  const { corretor } = useCorretorAuth();
  const turmasAutorizadas: string[] = corretor?.turmas_autorizadas ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["corretor-permissoes", corretor?.id, turmasAutorizadas],
    queryFn: async () => {
      if (!corretor?.id || turmasAutorizadas.length === 0) {
        return { podeGerenciar: false, turmasGerenciadas: [] as TurmaGerenciada[] };
      }

      const { data, error } = await supabase
        .from("turmas_alunos")
        .select("id, nome, gerenciada_por, gestor_corretor_id")
        .in("nome", turmasAutorizadas);

      if (error) throw error;

      const gerenciadas: TurmaGerenciada[] = (data ?? [])
        .filter(
          (t) =>
            t.gerenciada_por === "externo" &&
            t.gestor_corretor_id === corretor.id
        )
        .map((t) => ({ id: t.id, nome: t.nome }));

      return {
        podeGerenciar: gerenciadas.length > 0,
        turmasGerenciadas: gerenciadas,
      };
    },
    enabled: !!corretor?.id && turmasAutorizadas.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (!corretor?.id || turmasAutorizadas.length === 0) {
    return {
      podeGerenciar: false,
      turmasGerenciadas: [],
      idsTurmasGerenciadas: [],
      nomesTurmasGerenciadas: [],
      loading: isLoading,
    };
  }

  const turmasGerenciadas = data?.turmasGerenciadas ?? [];

  return {
    podeGerenciar: data?.podeGerenciar ?? false,
    turmasGerenciadas,
    idsTurmasGerenciadas: turmasGerenciadas.map((t) => t.id),
    nomesTurmasGerenciadas: turmasGerenciadas.map((t) => t.nome),
    loading: isLoading,
  };
}
