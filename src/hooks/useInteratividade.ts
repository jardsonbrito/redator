import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from './useStudentAuth';
import { toast } from 'sonner';

export type TipoResposta = 'alternativas' | 'aberta' | 'alternativas_com_aberta';

export interface InteracaoAlternativa {
  id: string;
  interacao_id: string;
  texto: string;
  ordem: number;
}

export interface Interacao {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  tipo_resposta: TipoResposta;
  pergunta: string;
  ativa: boolean;
  mostrar_resultado_aluno: boolean;
  ordem: number;
  encerramento_em: string | null;
  criado_em: string;
  atualizado_em: string;
  alternativas?: InteracaoAlternativa[];
}

export interface InteracaoResposta {
  id: string;
  interacao_id: string;
  email_aluno: string;
  alternativa_id: string | null;
  resposta_texto: string | null;
  criado_em: string;
}

export interface ResultadoAlternativa {
  alternativa_id: string;
  texto: string;
  votos: number;
  percentual: number;
}

export interface ResultadoParticipante {
  resposta_id: string;
  email_aluno: string;
  alternativa_id: string | null;
  alternativa_texto: string;
  resposta_texto: string | null;
  criado_em: string;
}

// ── Admin: lista todas as interações ────────────────────────────────────────
export const useInteracoesAdmin = () =>
  useQuery({
    queryKey: ['interacoes-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interacoes')
        .select('*, alternativas:interacoes_alternativas(id, texto, ordem)')
        .order('ordem', { ascending: true })
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as (Interacao & { alternativas: InteracaoAlternativa[] })[];
    },
  });

// ── Aluno: lista interações ativas ──────────────────────────────────────────
export const useInteracoesAtivas = () =>
  useQuery({
    queryKey: ['interacoes-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interacoes')
        .select('*, alternativas:interacoes_alternativas(id, texto, ordem)')
        .eq('ativa', true)
        .order('ordem', { ascending: true })
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as (Interacao & { alternativas: InteracaoAlternativa[] })[];
    },
  });

// ── Aluno: verifica se já respondeu cada interação ──────────────────────────
export const useMinhasRespostas = (interacaoIds: string[]) => {
  const { studentData } = useStudentAuth();
  const email = studentData.email?.toLowerCase().trim();

  return useQuery({
    queryKey: ['minhas-respostas-interacoes', email, interacaoIds],
    enabled: !!email && interacaoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interacoes_respostas')
        .select('*')
        .eq('email_aluno', email!)
        .in('interacao_id', interacaoIds);
      if (error) throw error;
      return data as InteracaoResposta[];
    },
  });
};

// ── Aluno: responde uma interação ────────────────────────────────────────────
export const useResponderInteracao = () => {
  const { studentData } = useStudentAuth();
  const queryClient = useQueryClient();
  const email = studentData.email?.toLowerCase().trim();

  return useMutation({
    mutationFn: async ({
      interacao_id,
      alternativa_id,
      resposta_texto,
    }: {
      interacao_id: string;
      alternativa_id?: string | null;
      resposta_texto?: string | null;
    }) => {
      if (!email) throw new Error('Aluno não autenticado');
      const { error } = await supabase.from('interacoes_respostas').insert({
        interacao_id,
        alternativa_id: alternativa_id ?? null,
        resposta_texto: resposta_texto ?? null,
        email_aluno: email,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Você já respondeu esta interação.');
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['minhas-respostas-interacoes'] });
      queryClient.invalidateQueries({ queryKey: ['resultado-interacao', vars.interacao_id] });
    },
  });
};

// ── Admin: resultados de uma interação ──────────────────────────────────────
export const useResultadoInteracao = (interacaoId: string) =>
  useQuery({
    queryKey: ['resultado-interacao', interacaoId],
    enabled: !!interacaoId,
    queryFn: async () => {
      const [respostasRes, alternativasRes] = await Promise.all([
        supabase
          .from('interacoes_respostas')
          .select('*')
          .eq('interacao_id', interacaoId)
          .order('criado_em', { ascending: false }),
        supabase
          .from('interacoes_alternativas')
          .select('*')
          .eq('interacao_id', interacaoId)
          .order('ordem', { ascending: true }),
      ]);

      if (respostasRes.error) throw respostasRes.error;
      if (alternativasRes.error) throw alternativasRes.error;

      const respostas = respostasRes.data as InteracaoResposta[];
      const alternativas = alternativasRes.data as InteracaoAlternativa[];
      const total = respostas.length;

      const contagem: Record<string, number> = {};
      alternativas.forEach(a => { contagem[a.id] = 0; });
      respostas.forEach(r => {
        if (r.alternativa_id) {
          contagem[r.alternativa_id] = (contagem[r.alternativa_id] ?? 0) + 1;
        }
      });

      const resultados: ResultadoAlternativa[] = alternativas.map(a => ({
        alternativa_id: a.id,
        texto: a.texto,
        votos: contagem[a.id] ?? 0,
        percentual: total > 0 ? Math.round(((contagem[a.id] ?? 0) / total) * 100) : 0,
      }));

      const participantes: ResultadoParticipante[] = respostas.map(r => ({
        resposta_id: r.id,
        email_aluno: r.email_aluno,
        alternativa_id: r.alternativa_id,
        alternativa_texto: alternativas.find(a => a.id === r.alternativa_id)?.texto ?? '',
        resposta_texto: r.resposta_texto,
        criado_em: r.criado_em,
      }));

      return { resultados, participantes, total };
    },
  });

// ── Admin: criar interação ────────────────────────────────────────────────────
export const useCreateInteracao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      interacao,
      alternativas,
    }: {
      interacao: Omit<Interacao, 'id' | 'criado_em' | 'atualizado_em' | 'alternativas'>;
      alternativas: { texto: string; ordem: number }[];
    }) => {
      const { data: novaInteracao, error: errI } = await supabase
        .from('interacoes')
        .insert(interacao)
        .select()
        .single();
      if (errI) throw errI;

      if (alternativas.length > 0) {
        const alts = alternativas.map(a => ({ ...a, interacao_id: novaInteracao.id }));
        const { error: errA } = await supabase.from('interacoes_alternativas').insert(alts);
        if (errA) throw errA;
      }

      return novaInteracao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes-admin'] });
      toast.success('Interação criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar interação.'),
  });
};

// ── Admin: editar interação ───────────────────────────────────────────────────
export const useUpdateInteracao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      interacao,
      alternativas,
    }: {
      id: string;
      interacao: Partial<Omit<Interacao, 'id' | 'criado_em' | 'atualizado_em' | 'alternativas'>>;
      alternativas: { texto: string; ordem: number }[];
    }) => {
      const { error: errI } = await supabase
        .from('interacoes')
        .update(interacao)
        .eq('id', id);
      if (errI) throw errI;

      const { error: errD } = await supabase
        .from('interacoes_alternativas')
        .delete()
        .eq('interacao_id', id);
      if (errD) throw errD;

      if (alternativas.length > 0) {
        const alts = alternativas.map(a => ({ ...a, interacao_id: id }));
        const { error: errA } = await supabase.from('interacoes_alternativas').insert(alts);
        if (errA) throw errA;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['interacoes-ativas'] });
      toast.success('Interação atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar interação.'),
  });
};

// ── Admin: toggle ativa ───────────────────────────────────────────────────────
export const useToggleInteracaoAtiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from('interacoes')
        .update({ ativa })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['interacoes-ativas'] });
    },
    onError: () => toast.error('Erro ao alterar status.'),
  });
};

// ── Admin: excluir interação ─────────────────────────────────────────────────
export const useDeleteInteracao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('interacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes-admin'] });
      toast.success('Interação excluída.');
    },
    onError: () => toast.error('Erro ao excluir interação.'),
  });
};

// ── Aluno: remove própria resposta ───────────────────────────────────────────
export const useRemoverRespostaAluno = () => {
  const { studentData } = useStudentAuth();
  const queryClient = useQueryClient();
  const email = studentData.email?.toLowerCase().trim();

  return useMutation({
    mutationFn: async (interacao_id: string) => {
      if (!email) throw new Error('Aluno não autenticado');
      const { error } = await supabase
        .from('interacoes_respostas')
        .delete()
        .eq('interacao_id', interacao_id)
        .eq('email_aluno', email);
      if (error) throw error;
    },
    onSuccess: (_, interacao_id) => {
      queryClient.invalidateQueries({ queryKey: ['minhas-respostas-interacoes'] });
      queryClient.invalidateQueries({ queryKey: ['resultado-interacao', interacao_id] });
    },
    onError: () => toast.error('Erro ao remover participação.'),
  });
};

// ── Admin: remove resposta de qualquer aluno ──────────────────────────────────
export const useRemoverRespostaAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, interacao_id }: { id: string; interacao_id: string }) => {
      const { error } = await supabase
        .from('interacoes_respostas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['resultado-interacao', vars.interacao_id] });
      toast.success('Participação removida.');
    },
    onError: () => toast.error('Erro ao remover participação.'),
  });
};

// ── Utilitário: determina status visual da interação ─────────────────────────
export const statusInteracao = (
  interacao: Interacao,
  jaRespondeu: boolean
): 'aberta' | 'respondida' | 'encerrada' => {
  if (interacao.encerramento_em && new Date(interacao.encerramento_em) < new Date()) {
    return 'encerrada';
  }
  if (jaRespondeu) return 'respondida';
  return 'aberta';
};
