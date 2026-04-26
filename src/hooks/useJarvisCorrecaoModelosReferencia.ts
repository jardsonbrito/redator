import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModeloReferencia {
  id: string;
  titulo: string;
  tema: string;
  texto_aluno: string;
  nota_total: number;
  nota_c1: number;
  nota_c2: number;
  nota_c3: number;
  nota_c4: number;
  nota_c5: number;
  justificativa_c1: string | null;
  justificativa_c2: string | null;
  justificativa_c3: string | null;
  justificativa_c4: string | null;
  justificativa_c5: string | null;
  erros_identificados: string | null;
  sugestoes_melhoria: string | null;
  comentario_pedagogico: string | null;
  prioridade: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type CreateModeloData = Omit<ModeloReferencia, "id" | "criado_em" | "atualizado_em">;

const getAdminId = async (): Promise<string> => {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.email) throw new Error("Usuário não autenticado");
  const { data: adminRecord, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", authData.user.email.toLowerCase())
    .eq("ativo", true)
    .single();
  if (error || !adminRecord) throw new Error("Admin não encontrado");
  return adminRecord.id;
};

export const useJarvisCorrecaoModelosReferencia = () => {
  const queryClient = useQueryClient();

  const { data: modelos, isLoading, error } = useQuery({
    queryKey: ["jarvis-correcao-modelos-referencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jarvis_correcao_modelos_referencia")
        .select("*")
        .order("prioridade", { ascending: false })
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as ModeloReferencia[];
    },
  });

  const criarModelo = useMutation({
    mutationFn: async (data: Omit<CreateModeloData, "criado_por">) => {
      const adminId = await getAdminId();
      const { data: novo, error } = await supabase
        .from("jarvis_correcao_modelos_referencia")
        .insert({ ...data, criado_por: adminId })
        .select()
        .single();
      if (error) throw error;
      return novo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-modelos-referencia"] });
      toast.success("Modelo de referência criado!");
    },
    onError: (e: any) => toast.error(`Erro ao criar modelo: ${e.message}`),
  });

  const editarModelo = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateModeloData> }) => {
      const { data: updated, error } = await supabase
        .from("jarvis_correcao_modelos_referencia")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-modelos-referencia"] });
      toast.success("Modelo atualizado!");
    },
    onError: (e: any) => toast.error(`Erro ao editar modelo: ${e.message}`),
  });

  const deletarModelo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jarvis_correcao_modelos_referencia")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-modelos-referencia"] });
      toast.success("Modelo removido!");
    },
    onError: (e: any) => toast.error(`Erro ao remover modelo: ${e.message}`),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("jarvis_correcao_modelos_referencia")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-modelos-referencia"] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  return {
    modelos,
    isLoading,
    error,
    criarModelo,
    editarModelo,
    deletarModelo,
    toggleAtivo,
  };
};
