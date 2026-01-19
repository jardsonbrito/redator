import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Formulario,
  Secao,
  Pergunta,
  Candidato,
  Comunicado,
  EtapaFinal,
  PSRedacao,
  TipoPergunta,
  SecaoComPerguntas,
  FormularioCompleto,
  Resposta
} from './useProcessoSeletivo';

export interface CandidatoComRespostas extends Candidato {
  respostas?: Resposta[];
}

export interface FormularioInput {
  titulo: string;
  descricao?: string;
  ativo?: boolean;
}

export interface SecaoInput {
  titulo: string;
  descricao?: string;
  ordem?: number;
}

export interface PerguntaInput {
  texto: string;
  tipo: TipoPergunta;
  obrigatoria?: boolean;
  ordem?: number;
  opcoes?: string[];
  texto_aceite?: string;
}

export interface ComunicadoInput {
  titulo: string;
  descricao?: string;
  link_externo?: string;
  ativo?: boolean;
}

export interface EtapaFinalInput {
  tema_id?: string;
  tema_redacao: string;
  instrucoes?: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  ativo?: boolean;
}

/**
 * Hook principal para administração do processo seletivo.
 */
export const useProcessoSeletivoAdmin = () => {
  const queryClient = useQueryClient();

  // ============================================
  // QUERIES
  // ============================================

  // Listar todos os formulários
  const { data: formularios, isLoading: isLoadingFormularios } = useQuery({
    queryKey: ['ps-admin-formularios'],
    queryFn: async (): Promise<Formulario[]> => {
      const { data, error } = await supabase
        .from('ps_formularios')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar formulários:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 1000
  });

  // Buscar formulário ativo com estrutura completa
  const { data: formularioAtivo, isLoading: isLoadingFormularioAtivo } = useQuery({
    queryKey: ['ps-admin-formulario-ativo'],
    queryFn: async (): Promise<FormularioCompleto | null> => {
      const { data: formData, error: formError } = await supabase
        .from('ps_formularios')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (formError || !formData) {
        return null;
      }

      // Buscar seções
      const { data: secoesData } = await supabase
        .from('ps_secoes')
        .select('*')
        .eq('formulario_id', formData.id)
        .order('ordem');

      // Buscar perguntas de cada seção
      const secoesComPerguntas: SecaoComPerguntas[] = await Promise.all(
        (secoesData || []).map(async (secao) => {
          const { data: perguntasData } = await supabase
            .from('ps_perguntas')
            .select('*')
            .eq('secao_id', secao.id)
            .order('ordem');

          return {
            ...secao,
            perguntas: (perguntasData || []) as Pergunta[]
          };
        })
      );

      return { ...formData, secoes: secoesComPerguntas };
    },
    staleTime: 30 * 1000
  });

  // Listar candidatos do formulário ativo
  const { data: candidatos, isLoading: isLoadingCandidatos } = useQuery({
    queryKey: ['ps-admin-candidatos', formularioAtivo?.id],
    queryFn: async (): Promise<Candidato[]> => {
      if (!formularioAtivo?.id) return [];

      const { data, error } = await supabase
        .from('ps_candidatos')
        .select('*')
        .eq('formulario_id', formularioAtivo.id)
        .order('data_inscricao', { ascending: false });

      if (error) {
        console.error('Erro ao buscar candidatos:', error);
        throw error;
      }

      return (data || []) as Candidato[];
    },
    enabled: !!formularioAtivo?.id,
    staleTime: 30 * 1000
  });

  // Buscar comunicado ativo
  const { data: comunicado, isLoading: isLoadingComunicado } = useQuery({
    queryKey: ['ps-admin-comunicado', formularioAtivo?.id],
    queryFn: async (): Promise<Comunicado | null> => {
      if (!formularioAtivo?.id) return null;

      const { data, error } = await supabase
        .from('ps_comunicados')
        .select('*')
        .eq('formulario_id', formularioAtivo.id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Erro ao buscar comunicado:', error);
        return null;
      }

      return data as Comunicado;
    },
    enabled: !!formularioAtivo?.id,
    staleTime: 30 * 1000
  });

  // Buscar configuração da etapa final
  const { data: etapaFinal, isLoading: isLoadingEtapaFinal } = useQuery({
    queryKey: ['ps-admin-etapa-final', formularioAtivo?.id],
    queryFn: async (): Promise<EtapaFinal | null> => {
      if (!formularioAtivo?.id) return null;

      const { data, error } = await supabase
        .from('ps_etapa_final')
        .select('*')
        .eq('formulario_id', formularioAtivo.id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Erro ao buscar etapa final:', error);
        return null;
      }

      return data as EtapaFinal;
    },
    enabled: !!formularioAtivo?.id,
    staleTime: 30 * 1000
  });

  // Listar redações enviadas
  const { data: redacoes, isLoading: isLoadingRedacoes } = useQuery({
    queryKey: ['ps-admin-redacoes', etapaFinal?.id],
    queryFn: async (): Promise<(PSRedacao & { candidato: Candidato })[]> => {
      if (!etapaFinal?.id) return [];

      const { data, error } = await supabase
        .from('ps_redacoes')
        .select('*, candidato:ps_candidatos(*)')
        .eq('etapa_final_id', etapaFinal.id)
        .order('data_envio', { ascending: false });

      if (error) {
        console.error('Erro ao buscar redações:', error);
        throw error;
      }

      return (data || []).map(r => ({
        ...r,
        candidato: r.candidato as unknown as Candidato
      }));
    },
    enabled: !!etapaFinal?.id,
    staleTime: 30 * 1000
  });

  // ============================================
  // MUTATIONS - FORMULÁRIO
  // ============================================

  const criarFormularioMutation = useMutation({
    mutationFn: async (input: FormularioInput) => {
      // Desativar outros formulários se este for ativo
      if (input.ativo) {
        await supabase
          .from('ps_formularios')
          .update({ ativo: false })
          .eq('ativo', true);
      }

      const { data, error } = await supabase
        .from('ps_formularios')
        .insert({
          titulo: input.titulo,
          descricao: input.descricao || null,
          ativo: input.ativo ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Formulário criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao criar formulário');
    }
  });

  const atualizarFormularioMutation = useMutation({
    mutationFn: async ({ id, ...input }: FormularioInput & { id: string }) => {
      if (input.ativo) {
        await supabase
          .from('ps_formularios')
          .update({ ativo: false })
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('ps_formularios')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Formulário atualizado!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar formulário');
    }
  });

  // ============================================
  // MUTATIONS - SEÇÕES
  // ============================================

  const criarSecaoMutation = useMutation({
    mutationFn: async ({ formularioId, ...input }: SecaoInput & { formularioId: string }) => {
      // Buscar maior ordem existente
      const { data: maxOrdem } = await supabase
        .from('ps_secoes')
        .select('ordem')
        .eq('formulario_id', formularioId)
        .order('ordem', { ascending: false })
        .limit(1)
        .single();

      const novaOrdem = (maxOrdem?.ordem || 0) + 1;

      const { data, error } = await supabase
        .from('ps_secoes')
        .insert({
          formulario_id: formularioId,
          titulo: input.titulo,
          descricao: input.descricao || null,
          ordem: input.ordem ?? novaOrdem
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Seção criada!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao criar seção');
    }
  });

  const atualizarSecaoMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<SecaoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('ps_secoes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Seção atualizada!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar seção');
    }
  });

  const excluirSecaoMutation = useMutation({
    mutationFn: async (secaoId: string) => {
      const { error } = await supabase
        .from('ps_secoes')
        .delete()
        .eq('id', secaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Seção excluída!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao excluir seção');
    }
  });

  // ============================================
  // MUTATIONS - PERGUNTAS
  // ============================================

  const criarPerguntaMutation = useMutation({
    mutationFn: async ({ secaoId, ...input }: PerguntaInput & { secaoId: string }) => {
      const { data: maxOrdem } = await supabase
        .from('ps_perguntas')
        .select('ordem')
        .eq('secao_id', secaoId)
        .order('ordem', { ascending: false })
        .limit(1)
        .single();

      const novaOrdem = (maxOrdem?.ordem || 0) + 1;

      const { data, error } = await supabase
        .from('ps_perguntas')
        .insert({
          secao_id: secaoId,
          texto: input.texto,
          tipo: input.tipo,
          obrigatoria: input.obrigatoria ?? true,
          ordem: input.ordem ?? novaOrdem,
          opcoes: input.opcoes || [],
          texto_aceite: input.texto_aceite || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pergunta criada!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao criar pergunta');
    }
  });

  const atualizarPerguntaMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<PerguntaInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('ps_perguntas')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pergunta atualizada!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar pergunta');
    }
  });

  const excluirPerguntaMutation = useMutation({
    mutationFn: async (perguntaId: string) => {
      const { error } = await supabase
        .from('ps_perguntas')
        .delete()
        .eq('id', perguntaId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pergunta excluída!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao excluir pergunta');
    }
  });

  // ============================================
  // MUTATIONS - CANDIDATOS
  // ============================================

  const aprovarCandidatoMutation = useMutation({
    mutationFn: async ({ candidatoId, adminId }: { candidatoId: string; adminId: string }) => {
      console.log('Mutation aprovarCandidato - candidatoId:', candidatoId, 'adminId:', adminId);

      const { data, error } = await supabase
        .from('ps_candidatos')
        .update({
          status: 'aprovado_etapa2',
          data_aprovacao: new Date().toISOString()
          // aprovado_por removido temporariamente para evitar problema com FK
        })
        .eq('id', candidatoId)
        .select()
        .single();

      if (error) {
        console.error('Erro na mutation aprovarCandidato:', error);
        throw error;
      }

      console.log('Candidato aprovado com sucesso:', data);
      return data;
    },
    onSuccess: () => {
      toast.success('Candidato aprovado!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: (error) => {
      console.error('onError aprovarCandidato:', error);
      toast.error('Erro ao aprovar candidato');
    }
  });

  const reprovarCandidatoMutation = useMutation({
    mutationFn: async ({ candidatoId, motivo }: { candidatoId: string; motivo?: string }) => {
      const { data, error } = await supabase
        .from('ps_candidatos')
        .update({
          status: 'reprovado',
          motivo_reprovacao: motivo || null
        })
        .eq('id', candidatoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Candidato reprovado');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: () => {
      toast.error('Erro ao reprovar candidato');
    }
  });

  const liberarEtapaFinalCandidatoMutation = useMutation({
    mutationFn: async (candidatoId: string) => {
      const { data, error } = await supabase
        .from('ps_candidatos')
        .update({ status: 'etapa_final_liberada' })
        .eq('id', candidatoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etapa final liberada para o candidato!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: () => {
      toast.error('Erro ao liberar etapa final');
    }
  });

  const liberarEtapaFinalTodosMutation = useMutation({
    mutationFn: async () => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      const { error } = await supabase
        .from('ps_candidatos')
        .update({ status: 'etapa_final_liberada' })
        .eq('formulario_id', formularioAtivo.id)
        .eq('status', 'aprovado_etapa2');

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Etapa final liberada para todos os aprovados!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: () => {
      toast.error('Erro ao liberar etapa final');
    }
  });

  const excluirCandidatoMutation = useMutation({
    mutationFn: async (candidatoId: string) => {
      // 1. Remover referência em redacoes_enviadas (setar para NULL)
      const { error: redacoesEnviadasError } = await supabase
        .from('redacoes_enviadas')
        .update({ processo_seletivo_candidato_id: null } as any)
        .eq('processo_seletivo_candidato_id', candidatoId);

      if (redacoesEnviadasError) {
        console.error('Erro ao limpar referência em redacoes_enviadas:', redacoesEnviadasError);
        throw redacoesEnviadasError;
      }

      // 2. Excluir as redações do processo seletivo (ps_redacoes)
      const { error: redacoesError } = await supabase
        .from('ps_redacoes')
        .delete()
        .eq('candidato_id', candidatoId);

      if (redacoesError) {
        console.error('Erro ao excluir redações PS:', redacoesError);
        throw redacoesError;
      }

      // 3. Excluir as respostas do candidato (ps_respostas)
      const { error: respostasError } = await supabase
        .from('ps_respostas')
        .delete()
        .eq('candidato_id', candidatoId);

      if (respostasError) {
        console.error('Erro ao excluir respostas:', respostasError);
        throw respostasError;
      }

      // 4. Por fim, excluir o candidato (ps_candidatos)
      const { error } = await supabase
        .from('ps_candidatos')
        .delete()
        .eq('id', candidatoId);

      if (error) {
        console.error('Erro ao excluir candidato:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Candidato excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: (error: any) => {
      console.error('Erro na exclusão:', error);
      const mensagem = error?.message || 'Erro desconhecido';
      toast.error(`Erro ao excluir candidato: ${mensagem}`);
    }
  });

  // Buscar respostas de um candidato
  const buscarRespostasCandidato = async (candidatoId: string): Promise<Resposta[]> => {
    const { data, error } = await supabase
      .from('ps_respostas')
      .select('*')
      .eq('candidato_id', candidatoId);

    if (error) {
      console.error('Erro ao buscar respostas:', error);
      return [];
    }

    return data as Resposta[];
  };

  // ============================================
  // MUTATIONS - COMUNICADO
  // ============================================

  const salvarComunicadoMutation = useMutation({
    mutationFn: async (input: ComunicadoInput & { id?: string }) => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      if (input.id) {
        const { data, error } = await supabase
          .from('ps_comunicados')
          .update({
            titulo: input.titulo,
            descricao: input.descricao,
            link_externo: input.link_externo,
            ativo: input.ativo ?? true
          })
          .eq('id', input.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ps_comunicados')
          .insert({
            formulario_id: formularioAtivo.id,
            titulo: input.titulo,
            descricao: input.descricao,
            link_externo: input.link_externo,
            ativo: input.ativo ?? true
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Comunicado salvo!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-comunicado'] });
    },
    onError: () => {
      toast.error('Erro ao salvar comunicado');
    }
  });

  // ============================================
  // MUTATIONS - ETAPA FINAL
  // ============================================

  const salvarEtapaFinalMutation = useMutation({
    mutationFn: async (input: EtapaFinalInput & { id?: string }) => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      if (input.id) {
        const { data, error } = await supabase
          .from('ps_etapa_final')
          .update({
            tema_id: input.tema_id || null,
            tema_redacao: input.tema_redacao,
            instrucoes: input.instrucoes,
            data_inicio: input.data_inicio,
            hora_inicio: input.hora_inicio,
            data_fim: input.data_fim,
            hora_fim: input.hora_fim,
            ativo: input.ativo ?? true
          })
          .eq('id', input.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ps_etapa_final')
          .insert({
            formulario_id: formularioAtivo.id,
            tema_id: input.tema_id || null,
            tema_redacao: input.tema_redacao,
            instrucoes: input.instrucoes,
            data_inicio: input.data_inicio,
            hora_inicio: input.hora_inicio,
            data_fim: input.data_fim,
            hora_fim: input.hora_fim,
            ativo: input.ativo ?? true
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Etapa final configurada!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-etapa-final'] });
    },
    onError: () => {
      toast.error('Erro ao configurar etapa final');
    }
  });

  // ============================================
  // ESTATÍSTICAS
  // ============================================

  const estatisticas = {
    total: candidatos?.length || 0,
    aguardandoAnalise: candidatos?.filter(c => c.status === 'formulario_enviado').length || 0,
    aprovados: candidatos?.filter(c => c.status === 'aprovado_etapa2').length || 0,
    reprovados: candidatos?.filter(c => c.status === 'reprovado').length || 0,
    etapaFinalLiberada: candidatos?.filter(c => c.status === 'etapa_final_liberada').length || 0,
    concluidos: candidatos?.filter(c => c.status === 'concluido').length || 0
  };

  return {
    // Dados
    formularios,
    formularioAtivo,
    candidatos,
    comunicado,
    etapaFinal,
    redacoes,
    estatisticas,

    // Estados de loading
    isLoadingFormularios,
    isLoadingFormularioAtivo,
    isLoadingCandidatos,
    isLoadingComunicado,
    isLoadingEtapaFinal,
    isLoadingRedacoes,

    // Ações - Formulário
    criarFormulario: criarFormularioMutation.mutate,
    atualizarFormulario: atualizarFormularioMutation.mutate,
    isSalvandoFormulario: criarFormularioMutation.isPending || atualizarFormularioMutation.isPending,

    // Ações - Seções
    criarSecao: criarSecaoMutation.mutate,
    atualizarSecao: atualizarSecaoMutation.mutate,
    excluirSecao: excluirSecaoMutation.mutate,

    // Ações - Perguntas
    criarPergunta: criarPerguntaMutation.mutate,
    atualizarPergunta: atualizarPerguntaMutation.mutate,
    excluirPergunta: excluirPerguntaMutation.mutate,

    // Ações - Candidatos
    aprovarCandidato: aprovarCandidatoMutation.mutate,
    reprovarCandidato: reprovarCandidatoMutation.mutate,
    liberarEtapaFinalCandidato: liberarEtapaFinalCandidatoMutation.mutate,
    liberarEtapaFinalTodos: liberarEtapaFinalTodosMutation.mutate,
    excluirCandidato: excluirCandidatoMutation.mutate,
    buscarRespostasCandidato,

    // Ações - Comunicado
    salvarComunicado: salvarComunicadoMutation.mutate,
    isSalvandoComunicado: salvarComunicadoMutation.isPending,

    // Ações - Etapa Final
    salvarEtapaFinal: salvarEtapaFinalMutation.mutate,
    isSalvandoEtapaFinal: salvarEtapaFinalMutation.isPending
  };
};
