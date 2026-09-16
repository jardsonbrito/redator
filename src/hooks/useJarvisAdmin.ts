
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";

export type JarvisAdminStatus = "idle" | "enviando" | "processando" | "concluido" | "erro";

export const useJarvisAdmin = (onRefresh?: () => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  // IDs de redações em processamento (bloqueio client-side contra duplo clique)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const isProcessing = (redacaoId: string) => processingIds.has(redacaoId);

  const enviarParaJarvis = async (redacao: RedacaoEnviada) => {
    if (!user?.id) {
      toast({ title: "Erro de autenticação", variant: "destructive" });
      return;
    }

    if (redacao.redacao_manuscrita_url) {
      toast({
        title: "Ação indisponível",
        description: "Redações manuscritas não podem ser enviadas para o Jarvis.",
        variant: "destructive",
      });
      return;
    }

    if (processingIds.has(redacao.id)) return;

    setProcessingIds((prev) => new Set(prev).add(redacao.id));

    try {
      // ── Etapa 1: criar registro de pré-correção ──────────────────
      const enviarRes = await supabase.functions.invoke("jarvis-correcao-enviar", {
        body: {
          adminId: user.id,
          redacaoEnviadaId: redacao.id,
        },
      });

      if (enviarRes.error) throw new Error(enviarRes.error.message);

      const enviarData = enviarRes.data as {
        success?: boolean;
        correcaoId?: string;
        transcricaoConfirmada?: string;
        error?: string;
        status?: string;
      };

      if (!enviarData.success || !enviarData.correcaoId) {
        if (enviarData.error === "ja_existe_pre_correcao") {
          toast({
            title: "Pré-correção já existe",
            description: "Esta redação já possui uma pré-correção gerada ou em andamento.",
          });
          return;
        }
        throw new Error(enviarData.error || "Erro ao registrar envio");
      }

      // ── Etapa 2: processar com IA ────────────────────────────────
      const processarRes = await supabase.functions.invoke("jarvis-correcao-processar-v5", {
        body: {
          adminId: user.id,
          correcaoId: enviarData.correcaoId,
          transcricaoConfirmada: enviarData.transcricaoConfirmada ?? redacao.redacao_texto,
        },
      });

      if (processarRes.error) throw new Error(processarRes.error.message);

      const processarData = processarRes.data as { success?: boolean; error?: string };
      if (!processarData.success) {
        throw new Error(processarData.error || "Erro no processamento da IA");
      }

      toast({
        title: "Pré-correção gerada",
        description: `Sugestão do Jarvis disponível para ${redacao.nome_aluno}.`,
      });

      onRefresh?.();
    } catch (err: any) {
      console.error("❌ useJarvisAdmin.enviarParaJarvis:", err);
      toast({
        title: "Erro no Jarvis",
        description: err.message || "Não foi possível gerar a pré-correção.",
        variant: "destructive",
      });
      onRefresh?.(); // refresh para exibir status de erro no botão
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(redacao.id);
        return next;
      });
    }
  };

  // Busca os dados completos da pré-correção para exibição no painel lateral
  const fetchPrecorrecao = async (jarvisPrecorrecaoId: string) => {
    const { data, error } = await supabase
      .from("jarvis_correcoes")
      .select("id, status, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, correcao_ia, tema, autor_nome, corrigida_em")
      .eq("id", jarvisPrecorrecaoId)
      .single();

    if (error) throw error;
    return data;
  };

  return {
    isProcessing,
    enviarParaJarvis,
    fetchPrecorrecao,
  };
};
