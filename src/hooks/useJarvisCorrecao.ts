import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JarvisCorrecao {
  id: string;
  professor_id: string;
  turma_id: string | null;
  autor_nome: string;
  tema: string;
  imagem_url: string | null;
  transcricao_ocr_original: string | null;
  transcricao_confirmada: string | null;
  status: "aguardando_ocr" | "revisao_ocr" | "aguardando_correcao" | "corrigida" | "erro";
  erro_mensagem: string | null;
  config_id: string | null;
  config_versao: number | null;
  correcao_ia: any;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  tokens_total: number | null;
  tempo_processamento_ms: number | null;
  criado_em: string;
  corrigida_em: string | null;
}

export interface EnviarRedacaoData {
  turmaId: string | null;
  autorNome: string;
  tema: string;
  imagemBase64?: string;
}

export interface ProcessarCorrecaoData {
  correcaoId: string;
  transcricaoConfirmada: string;
}

export const useJarvisCorrecao = (professorEmail: string) => {
  const queryClient = useQueryClient();

  // Listar correções do professor
  const { data: correcoes, isLoading, error } = useQuery({
    queryKey: ["jarvis-correcoes", professorEmail],
    queryFn: async () => {
      // Buscar professor_id pelo email
      const { data: professor } = await supabase
        .from("professores")
        .select("id")
        .eq("email", professorEmail)
        .single();

      if (!professor) throw new Error("Professor não encontrado");

      const { data, error } = await supabase
        .from("jarvis_correcoes")
        .select("*")
        .eq("professor_id", professor.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as JarvisCorrecao[];
    },
    enabled: !!professorEmail,
  });

  // Buscar créditos do professor
  const { data: creditos } = useQuery({
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

  // Buscar turmas do professor
  const { data: turmas } = useQuery({
    queryKey: ["professor-turmas", professorEmail],
    queryFn: async () => {
      const { data: professor } = await supabase
        .from("professores")
        .select("id")
        .eq("email", professorEmail)
        .single();

      if (!professor) throw new Error("Professor não encontrado");

      const { data, error } = await supabase
        .from("professor_turmas")
        .select("turma_id, turmas_professores(id, nome, escola)")
        .eq("professor_id", professor.id);

      if (error) throw error;

      return data.map((item: any) => item.turmas_professores);
    },
    enabled: !!professorEmail,
  });

  // Enviar redação (upload + OCR)
  const enviarRedacao = useMutation({
    mutationFn: async (data: EnviarRedacaoData) => {
      const { data: result, error } = await supabase.functions.invoke(
        "jarvis-correcao-enviar",
        {
          body: {
            professorEmail,
            turmaId: data.turmaId,
            autorNome: data.autorNome,
            tema: data.tema,
            imagemBase64: data.imagemBase64,
          },
        }
      );

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcoes"] });
      toast.success(data.mensagem || "Redação enviada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar redação: ${error.message}`);
    },
  });

  // Processar correção (após revisão do OCR)
  const processarCorrecao = useMutation({
    mutationFn: async (data: ProcessarCorrecaoData) => {
      const { data: result, error } = await supabase.functions.invoke(
        "jarvis-correcao-processar",
        {
          body: {
            correcaoId: data.correcaoId,
            transcricaoConfirmada: data.transcricaoConfirmada,
            professorEmail,
          },
        }
      );

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcoes"] });
      queryClient.invalidateQueries({ queryKey: ["professor-creditos"] });
      toast.success(
        `Correção concluída! Nota: ${data.nota_total}/1000 | Créditos restantes: ${data.creditos_restantes}`
      );
    },
    onError: (error: any) => {
      toast.error(`Erro ao processar correção: ${error.message}`);
    },
  });

  // Deletar correção individual
  const deletarCorrecao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jarvis_correcoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcoes"] });
      toast.success("Correção removida.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Deletar todas as correções de um aluno (por nome + professor)
  const deletarPorAluno = useMutation({
    mutationFn: async (autorNome: string) => {
      const { data: professor } = await supabase
        .from("professores")
        .select("id")
        .eq("email", professorEmail)
        .single();
      if (!professor) throw new Error("Professor não encontrado");

      const { error } = await supabase
        .from("jarvis_correcoes")
        .delete()
        .eq("professor_id", professor.id)
        .eq("autor_nome", autorNome);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcoes"] });
      toast.success("Histórico do aluno removido.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Criar turma nova
  const criarTurma = useMutation({
    mutationFn: async (nome: string) => {
      const { data: professor } = await supabase
        .from("professores")
        .select("id")
        .eq("email", professorEmail)
        .single();

      if (!professor) throw new Error("Professor não encontrado");

      // Gerar código único
      const codigo = `TURMA-${Date.now().toString(36).toUpperCase()}`;

      const { data: novaTurma, error: turmaError } = await supabase
        .from("turmas_professores")
        .insert({ nome, codigo_acesso: codigo, criado_pelo_professor_id: professor.id })
        .select()
        .single();

      if (turmaError) throw turmaError;

      // Associar professor à turma
      const { error: assocError } = await supabase
        .from("professor_turmas")
        .insert({
          professor_id: professor.id,
          turma_id: novaTurma.id,
        });

      if (assocError) throw assocError;

      return novaTurma;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professor-turmas"] });
      toast.success("Turma criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar turma: ${error.message}`);
    },
  });

  return {
    correcoes,
    creditos,
    turmas,
    isLoading,
    error,
    enviarRedacao,
    processarCorrecao,
    deletarCorrecao,
    deletarPorAluno,
    criarTurma,
  };
};
