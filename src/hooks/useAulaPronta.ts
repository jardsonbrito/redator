import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NivelTurma = "Iniciante" | "Intermediário" | "Avançado";
export type TipoMaterial = "plano_aula" | "quiz" | "questao_aberta";
export type EstadoGeracao = "idle" | "loading" | "success" | "error";

export interface PlanoAulaParams {
  tema: string;
  objetivo?: string;
  duracao: "30 min" | "60 min" | "120 min";
  habilidade?: string;
  tipo_conducao: string;
  tipo_conducao_outro?: string;
  atividade_final: string[];
  atividade_final_livre?: string;
  materiais: string[];
  materiais_outro?: string;
  observacoes?: string;
}

export interface QuizParams {
  conteudo: string;
  quantidade_questoes: number;
  quantidade_alternativas: 4 | 5;
}

export interface QuestaoAbertaParams {
  conteudo: string;
  quantidade_questoes: number;
}

export interface ResultadoGeracao {
  conteudo: string;
  creditos_consumidos: number;
  creditos_restantes: number;
}

export const useAulaPronta = (professorEmail: string) => {
  const queryClient = useQueryClient();

  const { data: creditos, isLoading: creditosLoading } = useQuery({
    queryKey: ["professor-creditos", professorEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professores")
        .select("jarvis_correcao_creditos")
        .eq("email", professorEmail)
        .single();
      if (error) throw error;
      return data.jarvis_correcao_creditos as number;
    },
    enabled: !!professorEmail,
  });

  const [estadoPlano, setEstadoPlano] = useState<EstadoGeracao>("idle");
  const [estadoQuiz, setEstadoQuiz] = useState<EstadoGeracao>("idle");
  const [estadoQuestao, setEstadoQuestao] = useState<EstadoGeracao>("idle");

  const [resultadoPlano, setResultadoPlano] = useState<ResultadoGeracao | null>(null);
  const [resultadoQuiz, setResultadoQuiz] = useState<ResultadoGeracao | null>(null);
  const [resultadoQuestao, setResultadoQuestao] = useState<ResultadoGeracao | null>(null);

  const [erroPlano, setErroPlano] = useState<string | null>(null);
  const [erroQuiz, setErroQuiz] = useState<string | null>(null);
  const [erroQuestao, setErroQuestao] = useState<string | null>(null);

  async function gerar(
    tipo: TipoMaterial,
    nivel: NivelTurma,
    parametros: PlanoAulaParams | QuizParams | QuestaoAbertaParams
  ) {
    const setEstado =
      tipo === "plano_aula" ? setEstadoPlano
      : tipo === "quiz" ? setEstadoQuiz
      : setEstadoQuestao;

    const setResultado =
      tipo === "plano_aula" ? setResultadoPlano
      : tipo === "quiz" ? setResultadoQuiz
      : setResultadoQuestao;

    const setErro =
      tipo === "plano_aula" ? setErroPlano
      : tipo === "quiz" ? setErroQuiz
      : setErroQuestao;

    setEstado("loading");
    setErro(null);

    try {
      const { data, error } = await supabase.functions.invoke("aula-pronta-gerar", {
        body: { professorEmail, tipo, nivel, parametros },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido na geração.");

      setResultado({
        conteudo: data.conteudo,
        creditos_consumidos: data.creditos_consumidos,
        creditos_restantes: data.creditos_restantes,
      });
      setEstado("success");

      queryClient.invalidateQueries({ queryKey: ["professor-creditos", professorEmail] });
    } catch (err: any) {
      const msg = err?.message || "Erro ao gerar material. Tente novamente.";
      setErro(msg);
      setEstado("error");
      toast.error(msg);
    }
  }

  function regenerar(
    tipo: TipoMaterial,
    nivel: NivelTurma,
    parametros: PlanoAulaParams | QuizParams | QuestaoAbertaParams
  ) {
    const setResultado =
      tipo === "plano_aula" ? setResultadoPlano
      : tipo === "quiz" ? setResultadoQuiz
      : setResultadoQuestao;

    setResultado(null);
    gerar(tipo, nivel, parametros);
  }

  return {
    creditos,
    creditosLoading,
    estados: { plano_aula: estadoPlano, quiz: estadoQuiz, questao_aberta: estadoQuestao },
    resultados: { plano_aula: resultadoPlano, quiz: resultadoQuiz, questao_aberta: resultadoQuestao },
    erros: { plano_aula: erroPlano, quiz: erroQuiz, questao_aberta: erroQuestao },
    gerar,
    regenerar,
  };
};
