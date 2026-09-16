import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Competencia = "c1" | "c2" | "c3" | "c4" | "c5" | "geral";

export interface BancoComentario {
  id: string;
  competencia: Competencia;
  categoria: string | null;
  texto: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type CreateComentarioData = Pick<
  BancoComentario,
  "competencia" | "categoria" | "texto" | "ativo"
>;

const getAdminId = async (): Promise<string> => {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.email) throw new Error("Usuário não autenticado");
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", authData.user.email.toLowerCase())
    .eq("ativo", true)
    .single();
  if (error || !data) throw new Error("Admin não encontrado");
  return data.id;
};

export const useJarvisCorrecaoBancoComentarios = (competencia?: Competencia) => {
  const queryClient = useQueryClient();

  const { data: comentarios, isLoading } = useQuery({
    queryKey: ["jarvis-banco-comentarios", competencia ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("jarvis_correcao_banco_comentarios")
        .select("*")
        .order("criado_em", { ascending: true });

      if (competencia) {
        query = query.eq("competencia", competencia);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BancoComentario[];
    },
  });

  const criar = useMutation({
    mutationFn: async (data: CreateComentarioData) => {
      const adminId = await getAdminId();
      const { data: novo, error } = await supabase
        .from("jarvis_correcao_banco_comentarios")
        .insert({ ...data, criado_por: adminId })
        .select()
        .single();
      if (error) throw error;
      return novo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-banco-comentarios"] });
      toast.success("Comentário adicionado!");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const editar = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateComentarioData> }) => {
      const { data: updated, error } = await supabase
        .from("jarvis_correcao_banco_comentarios")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-banco-comentarios"] });
      toast.success("Comentário atualizado!");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jarvis_correcao_banco_comentarios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-banco-comentarios"] });
      toast.success("Comentário removido!");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("jarvis_correcao_banco_comentarios")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-banco-comentarios"] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  return { comentarios, isLoading, criar, editar, remover, toggleAtivo };
};
