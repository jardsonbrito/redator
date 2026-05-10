import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JarvisCorrecaoLink {
  id: string;
  correcao_id: string;
  professor_id: string;
  token: string;
  ativo: boolean;
  criado_em: string;
  expira_em: string | null;
  acessos: number;
  ultimo_acesso_em: string | null;
}

export const useJarvisCorrecaoLink = (correcaoId: string) => {
  const queryClient = useQueryClient();

  const { data: link, isLoading } = useQuery({
    queryKey: ["jarvis-correcao-link", correcaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jarvis_correcao_links" as any)
        .select("*")
        .eq("correcao_id", correcaoId)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      return data as JarvisCorrecaoLink | null;
    },
    enabled: !!correcaoId,
  });

  const criarLink = useMutation({
    mutationFn: async (professorId: string) => {
      const { data, error } = await supabase
        .from("jarvis_correcao_links" as any)
        .insert({ correcao_id: correcaoId, professor_id: professorId })
        .select()
        .single();
      if (error) throw error;
      return data as JarvisCorrecaoLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-link", correcaoId] });
      toast.success("Link gerado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao gerar link: ${err.message}`);
    },
  });

  const desativarLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("jarvis_correcao_links" as any)
        .update({ ativo: false })
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-link", correcaoId] });
      toast.success("Link desativado.");
    },
    onError: (err: any) => {
      toast.error(`Erro ao desativar link: ${err.message}`);
    },
  });

  const buildUrl = (token: string) =>
    `${window.location.origin}/correcao-publica/${token}`;

  return { link, isLoading, criarLink, desativarLink, buildUrl };
};
