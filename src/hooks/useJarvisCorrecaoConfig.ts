import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JarvisCorrecaoConfig {
  id: string;
  versao: number;
  ativo: boolean;
  nome: string;
  descricao: string | null;
  provider: string;
  model: string;
  temperatura: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  response_schema: any;
  custo_creditos: number;
  custo_estimado_usd: number | null;
  criado_por: string | null;
  criado_em: string;
  ativado_em: string | null;
  ativado_por: string | null;
  notas: string | null;
}

export interface CreateConfigData {
  nome: string;
  descricao?: string;
  provider: string;
  model: string;
  temperatura: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  response_schema: any;
  custo_creditos: number;
  custo_estimado_usd?: number;
  notas?: string;
}

export const useJarvisCorrecaoConfig = () => {
  const queryClient = useQueryClient();

  // Listar todas as configurações
  const { data: configs, isLoading, error } = useQuery({
    queryKey: ["jarvis-correcao-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jarvis_correcao_config")
        .select("*")
        .order("versao", { ascending: false });

      if (error) throw error;
      return data as JarvisCorrecaoConfig[];
    },
  });

  // Buscar configuração ativa
  const { data: configAtiva } = useQuery({
    queryKey: ["jarvis-correcao-config-ativa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_active_correcao_config")
        .single();

      if (error) throw error;
      return data as JarvisCorrecaoConfig;
    },
  });

  // Buscar análise de configs (estatísticas)
  const { data: analiseConfigs } = useQuery({
    queryKey: ["jarvis-correcao-config-analise"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_analise_config_correcao")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  // Buscar próxima versão disponível
  const { data: proximaVersao } = useQuery({
    queryKey: ["jarvis-correcao-proxima-versao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_proxima_versao_config");

      if (error) throw error;
      return data as number;
    },
  });

  // Criar nova configuração
  const createConfig = useMutation({
    mutationFn: async (data: CreateConfigData) => {
      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser?.user) throw new Error("Usuário não autenticado");

      const proximaVer = proximaVersao || 1;

      const { data: newConfig, error } = await supabase
        .from("jarvis_correcao_config")
        .insert({
          versao: proximaVer,
          ativo: false, // Nova config sempre inativa
          nome: data.nome,
          descricao: data.descricao,
          provider: data.provider,
          model: data.model,
          temperatura: data.temperatura,
          max_tokens: data.max_tokens,
          system_prompt: data.system_prompt,
          user_prompt_template: data.user_prompt_template,
          response_schema: data.response_schema,
          custo_creditos: data.custo_creditos,
          custo_estimado_usd: data.custo_estimado_usd,
          criado_por: adminUser.user.id,
          notas: data.notas,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar no audit
      await supabase.from("jarvis_correcao_config_audit").insert({
        config_id: newConfig.id,
        acao: "criada",
        admin_id: adminUser.user.id,
        observacao: `Configuração v${proximaVer} criada`,
      });

      return newConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-configs"] });
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-proxima-versao"] });
      toast.success("Configuração criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar configuração: ${error.message}`);
    },
  });

  // Ativar configuração
  const ativarConfig = useMutation({
    mutationFn: async (configId: string) => {
      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser?.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("ativar_config_correcao", {
        config_id_param: configId,
        admin_id_param: adminUser.user.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-configs"] });
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-config-ativa"] });
      toast.success(`Configuração v${data.versao} ativada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao ativar configuração: ${error.message}`);
    },
  });

  // Duplicar configuração
  const duplicarConfig = useMutation({
    mutationFn: async ({ configId, novoNome }: { configId: string; novoNome?: string }) => {
      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser?.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("duplicar_config_correcao", {
        config_id_origem: configId,
        admin_id_param: adminUser.user.id,
        novo_nome: novoNome,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-configs"] });
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-proxima-versao"] });
      toast.success(`Configuração duplicada! Nova versão: v${data.nova_versao}`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao duplicar configuração: ${error.message}`);
    },
  });

  // Editar configuração (apenas se inativa)
  const editarConfig = useMutation({
    mutationFn: async ({ configId, data }: { configId: string; data: Partial<CreateConfigData> }) => {
      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser?.user) throw new Error("Usuário não autenticado");

      const { data: updatedConfig, error } = await supabase
        .from("jarvis_correcao_config")
        .update(data)
        .eq("id", configId)
        .select()
        .single();

      if (error) throw error;

      // Registrar no audit
      await supabase.from("jarvis_correcao_config_audit").insert({
        config_id: configId,
        acao: "editada",
        admin_id: adminUser.user.id,
        mudancas: data,
        observacao: "Configuração editada",
      });

      return updatedConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-configs"] });
      toast.success("Configuração editada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao editar configuração: ${error.message}`);
    },
  });

  // Deletar configuração (apenas se inativa e sem correções)
  const deletarConfig = useMutation({
    mutationFn: async (configId: string) => {
      // Verificar se config está inativa
      const { data: configAtual } = await supabase
        .from("jarvis_correcao_config")
        .select("ativo")
        .eq("id", configId)
        .single();

      if (configAtual?.ativo) {
        throw new Error("Não é possível deletar configuração ativa.");
      }

      // Verificar se tem correções
      const { count } = await supabase
        .from("jarvis_correcoes")
        .select("*", { count: "exact", head: true })
        .eq("config_id", configId);

      if (count && count > 0) {
        throw new Error(`Não é possível deletar. Existem ${count} correções usando esta configuração.`);
      }

      const { error } = await supabase
        .from("jarvis_correcao_config")
        .delete()
        .eq("id", configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcao-configs"] });
      toast.success("Configuração deletada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar configuração: ${error.message}`);
    },
  });

  return {
    configs,
    configAtiva,
    analiseConfigs,
    proximaVersao,
    isLoading,
    error,
    createConfig,
    ativarConfig,
    duplicarConfig,
    editarConfig,
    deletarConfig,
  };
};
