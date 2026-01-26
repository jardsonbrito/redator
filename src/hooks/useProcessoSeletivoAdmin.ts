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
  Resposta,
  ResultadoConfig,
  BolsaConfig
} from './useProcessoSeletivo';

export interface RankingCandidato {
  candidato_id: string;
  nome_aluno: string;
  email_aluno: string;
  nota_total: number;
  classificacao: number;
}

export interface ResultadoConfigInput {
  bolsas: BolsaConfig[];
  resultado_publicado?: boolean;
}

export interface AtualizarCandidatoResultadoInput {
  candidatoId: string;
  mensagem?: string;
  bolsa?: string;
  percentual?: number;
  classificacao?: number;
}

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
 * @param formularioId - ID do formulário a ser gerenciado. Se não fornecido, usa o primeiro da lista.
 */
export const useProcessoSeletivoAdmin = (formularioId?: string) => {
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

  // Determinar qual formulário usar (passado como parâmetro ou primeiro da lista)
  const formularioIdEfetivo = formularioId || formularios?.[0]?.id;

  // Buscar formulário selecionado com estrutura completa
  const { data: formularioAtivo, isLoading: isLoadingFormularioAtivo } = useQuery({
    queryKey: ['ps-admin-formulario-selecionado', formularioIdEfetivo],
    queryFn: async (): Promise<FormularioCompleto | null> => {
      if (!formularioIdEfetivo) return null;

      const { data: formData, error: formError } = await supabase
        .from('ps_formularios')
        .select('*')
        .eq('id', formularioIdEfetivo)
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
    enabled: !!formularioIdEfetivo,
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

  // Buscar configuração de resultado
  const { data: resultadoConfig, isLoading: isLoadingResultadoConfig } = useQuery({
    queryKey: ['ps-admin-resultado-config', formularioAtivo?.id],
    queryFn: async (): Promise<ResultadoConfig | null> => {
      if (!formularioAtivo?.id) return null;

      const { data, error } = await supabase
        .from('ps_resultado_config')
        .select('*')
        .eq('formulario_id', formularioAtivo.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar configuração de resultado:', error);
        return null;
      }

      return data as ResultadoConfig;
    },
    enabled: !!formularioAtivo?.id,
    staleTime: 30 * 1000
  });

  // Buscar ranking calculado
  const { data: ranking, isLoading: isLoadingRanking, refetch: refetchRanking } = useQuery({
    queryKey: ['ps-admin-ranking', formularioAtivo?.id],
    queryFn: async (): Promise<RankingCandidato[]> => {
      if (!formularioAtivo?.id) return [];

      const { data, error } = await supabase.rpc('calcular_ranking_processo_seletivo', {
        p_formulario_id: formularioAtivo.id
      });

      if (error) {
        console.error('Erro ao calcular ranking:', error);
        return [];
      }

      return (data || []) as RankingCandidato[];
    },
    enabled: !!formularioAtivo?.id,
    staleTime: 30 * 1000
  });

  // ============================================
  // MUTATIONS - FORMULÁRIO
  // ============================================

  const criarFormularioMutation = useMutation({
    mutationFn: async (input: FormularioInput) => {
      // NÃO desativar outros formulários automaticamente - múltiplos processos podem coexistir

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

      // Gerar turma automaticamente para o processo seletivo
      if (data?.id) {
        const { data: turmaData, error: turmaError } = await supabase.rpc('gerar_e_atribuir_turma_processo', {
          formulario_id: data.id
        });

        if (turmaError) {
          console.error('Erro ao gerar turma do processo:', turmaError);
        } else if (turmaData) {
          data.turma_processo = turmaData;
        }
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('Formulário criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
      return data;
    },
    onError: () => {
      toast.error('Erro ao criar formulário');
    }
  });

  const atualizarFormularioMutation = useMutation({
    mutationFn: async ({ id, ...input }: FormularioInput & { id: string }) => {
      // NÃO desativar outros formulários automaticamente - múltiplos processos podem coexistir

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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
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
    mutationFn: async (input: EtapaFinalInput & { id?: string }): Promise<{ isUpdate: boolean }> => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      const isUpdate = !!input.id;

      if (isUpdate) {
        const { error } = await supabase
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
          .eq('id', input.id);

        if (error) throw error;
        return { isUpdate: true };
      } else {
        const { error } = await supabase
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
          });

        if (error) throw error;
        return { isUpdate: false };
      }
    },
    onSuccess: (result) => {
      toast.success(
        result?.isUpdate
          ? 'Configuração atualizada com sucesso!'
          : 'Etapa final criada com sucesso!'
      );
      queryClient.invalidateQueries({ queryKey: ['ps-admin-etapa-final'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao salvar configuração da etapa final');
    }
  });

  const excluirEtapaFinalMutation = useMutation({
    mutationFn: async (etapaFinalId: string) => {
      // Primeiro, verificar se há redações associadas
      const { data: redacoesExistentes } = await supabase
        .from('ps_redacoes')
        .select('id')
        .eq('etapa_final_id', etapaFinalId)
        .limit(1);

      if (redacoesExistentes && redacoesExistentes.length > 0) {
        throw new Error('Não é possível excluir a etapa final pois existem redações associadas');
      }

      const { error } = await supabase
        .from('ps_etapa_final')
        .delete()
        .eq('id', etapaFinalId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Etapa final excluída!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-etapa-final'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao excluir etapa final');
    }
  });

  // ============================================
  // MUTATIONS - RESULTADO
  // ============================================

  const salvarConfigResultadoMutation = useMutation({
    mutationFn: async (input: ResultadoConfigInput) => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      // Verificar se já existe configuração
      const { data: existing } = await supabase
        .from('ps_resultado_config')
        .select('id')
        .eq('formulario_id', formularioAtivo.id)
        .maybeSingle();

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('ps_resultado_config')
          .update({
            bolsas: input.bolsas,
            resultado_publicado: input.resultado_publicado ?? false
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase
          .from('ps_resultado_config')
          .insert({
            formulario_id: formularioAtivo.id,
            bolsas: input.bolsas,
            resultado_publicado: input.resultado_publicado ?? false
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Configuração de bolsas salva!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-resultado-config'] });
    },
    onError: () => {
      toast.error('Erro ao salvar configuração');
    }
  });

  const atualizarCandidatoResultadoMutation = useMutation({
    mutationFn: async (input: AtualizarCandidatoResultadoInput) => {
      const { error } = await supabase
        .from('ps_candidatos')
        .update({
          mensagem_resultado: input.mensagem,
          bolsa_conquistada: input.bolsa,
          percentual_bolsa: input.percentual,
          classificacao: input.classificacao
        })
        .eq('id', input.candidatoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Candidato atualizado!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar candidato');
    }
  });

  const togglePublicacaoResultadosMutation = useMutation({
    mutationFn: async (publicar: boolean) => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      // Verificar se já existe configuração
      const { data: existing } = await supabase
        .from('ps_resultado_config')
        .select('id')
        .eq('formulario_id', formularioAtivo.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('ps_resultado_config')
          .update({
            resultado_publicado: publicar,
            data_publicacao: publicar ? new Date().toISOString() : null
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar configuração se não existir
        const { error } = await supabase
          .from('ps_resultado_config')
          .insert({
            formulario_id: formularioAtivo.id,
            bolsas: [],
            resultado_publicado: publicar,
            data_publicacao: publicar ? new Date().toISOString() : null
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, publicar) => {
      toast.success(publicar ? 'Resultados publicados!' : 'Resultados ocultados');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-resultado-config'] });
      queryClient.invalidateQueries({ queryKey: ['ps-resultado-config'] });
    },
    onError: () => {
      toast.error('Erro ao alterar publicação');
    }
  });

  const recalcularClassificacoesMutation = useMutation({
    mutationFn: async () => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      // Buscar ranking atualizado
      const { data: rankingData, error: rankingError } = await supabase.rpc('calcular_ranking_processo_seletivo', {
        p_formulario_id: formularioAtivo.id
      });

      if (rankingError) throw rankingError;

      // Atualizar classificação de cada candidato
      for (const item of (rankingData || []) as RankingCandidato[]) {
        await supabase
          .from('ps_candidatos')
          .update({ classificacao: item.classificacao })
          .eq('id', item.candidato_id);
      }
    },
    onSuccess: () => {
      toast.success('Classificações atualizadas!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-ranking'] });
    },
    onError: () => {
      toast.error('Erro ao recalcular classificações');
    }
  });

  const toggleInscricoesMutation = useMutation({
    mutationFn: async (inscricoesAbertas: boolean) => {
      if (!formularioAtivo?.id) throw new Error('Nenhum formulário ativo');

      const { error } = await supabase
        .from('ps_formularios')
        .update({ inscricoes_abertas: inscricoesAbertas })
        .eq('id', formularioAtivo.id);

      if (error) throw error;
    },
    onSuccess: (_, inscricoesAbertas) => {
      toast.success(inscricoesAbertas ? 'Inscrições abertas!' : 'Inscrições encerradas!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
      queryClient.invalidateQueries({ queryKey: ['ps-formulario-ativo'] });
    },
    onError: () => {
      toast.error('Erro ao alterar status das inscrições');
    }
  });

  // Mutation para arquivar/excluir formulário
  const arquivarFormularioMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há candidatos associados
      const { data: candidatosAssociados } = await supabase
        .from('ps_candidatos')
        .select('id')
        .eq('formulario_id', id)
        .limit(1);

      if (candidatosAssociados && candidatosAssociados.length > 0) {
        // Se há candidatos, apenas desativa (arquiva)
        const { error } = await supabase
          .from('ps_formularios')
          .update({ ativo: false })
          .eq('id', id);

        if (error) throw error;
        return { tipo: 'arquivado' };
      } else {
        // Se não há candidatos, pode excluir
        // Primeiro excluir seções e perguntas
        const { data: secoes } = await supabase
          .from('ps_secoes')
          .select('id')
          .eq('formulario_id', id);

        if (secoes) {
          for (const secao of secoes) {
            await supabase.from('ps_perguntas').delete().eq('secao_id', secao.id);
          }
          await supabase.from('ps_secoes').delete().eq('formulario_id', id);
        }

        const { error } = await supabase
          .from('ps_formularios')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { tipo: 'excluido' };
      }
    },
    onSuccess: (result) => {
      toast.success(result.tipo === 'arquivado' ? 'Processo arquivado!' : 'Processo excluído!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
    },
    onError: () => {
      toast.error('Erro ao arquivar/excluir processo');
    }
  });

  // Mutation para desarquivar (ativar) formulário
  const desarquivarFormularioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ps_formularios')
        .update({ ativo: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Processo reativado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
    },
    onError: () => {
      toast.error('Erro ao reativar processo');
    }
  });

  // Mutation para excluir formulário completamente (com todos os dados)
  const excluirFormularioCompletoMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar todos os candidatos do processo
      const { data: candidatosDoProcesso, error: candidatosError } = await supabase
        .from('ps_candidatos')
        .select('id')
        .eq('formulario_id', id);

      if (candidatosError) throw candidatosError;

      // 2. Para cada candidato, excluir dados relacionados
      if (candidatosDoProcesso && candidatosDoProcesso.length > 0) {
        const candidatoIds = candidatosDoProcesso.map(c => c.id);

        // 2a. Limpar referência em redacoes_enviadas
        const { error: redacoesEnviadasError } = await supabase
          .from('redacoes_enviadas')
          .update({ processo_seletivo_candidato_id: null } as any)
          .in('processo_seletivo_candidato_id', candidatoIds);

        if (redacoesEnviadasError) {
          console.error('Erro ao limpar referências em redacoes_enviadas:', redacoesEnviadasError);
          throw redacoesEnviadasError;
        }

        // 2b. Excluir redações do PS
        const { error: psRedacoesError } = await supabase
          .from('ps_redacoes')
          .delete()
          .in('candidato_id', candidatoIds);

        if (psRedacoesError) {
          console.error('Erro ao excluir ps_redacoes:', psRedacoesError);
          throw psRedacoesError;
        }

        // 2c. Excluir respostas dos candidatos
        const { error: respostasError } = await supabase
          .from('ps_respostas')
          .delete()
          .in('candidato_id', candidatoIds);

        if (respostasError) {
          console.error('Erro ao excluir ps_respostas:', respostasError);
          throw respostasError;
        }

        // 2d. Excluir candidatos
        const { error: excluirCandidatosError } = await supabase
          .from('ps_candidatos')
          .delete()
          .eq('formulario_id', id);

        if (excluirCandidatosError) {
          console.error('Erro ao excluir ps_candidatos:', excluirCandidatosError);
          throw excluirCandidatosError;
        }
      }

      // 3. Excluir comunicados
      const { error: comunicadosError } = await supabase
        .from('ps_comunicados')
        .delete()
        .eq('formulario_id', id);

      if (comunicadosError) {
        console.error('Erro ao excluir ps_comunicados:', comunicadosError);
        throw comunicadosError;
      }

      // 4. Excluir configuração de resultados
      const { error: resultadoConfigError } = await supabase
        .from('ps_resultado_config')
        .delete()
        .eq('formulario_id', id);

      if (resultadoConfigError) {
        console.error('Erro ao excluir ps_resultado_config:', resultadoConfigError);
        throw resultadoConfigError;
      }

      // 5. Excluir etapa final
      const { error: etapaFinalError } = await supabase
        .from('ps_etapa_final')
        .delete()
        .eq('formulario_id', id);

      if (etapaFinalError) {
        console.error('Erro ao excluir ps_etapa_final:', etapaFinalError);
        throw etapaFinalError;
      }

      // 6. Buscar seções para excluir perguntas
      const { data: secoes } = await supabase
        .from('ps_secoes')
        .select('id')
        .eq('formulario_id', id);

      if (secoes && secoes.length > 0) {
        const secaoIds = secoes.map(s => s.id);

        // 6a. Excluir perguntas
        const { error: perguntasError } = await supabase
          .from('ps_perguntas')
          .delete()
          .in('secao_id', secaoIds);

        if (perguntasError) {
          console.error('Erro ao excluir ps_perguntas:', perguntasError);
          throw perguntasError;
        }
      }

      // 7. Excluir seções
      const { error: secoesError } = await supabase
        .from('ps_secoes')
        .delete()
        .eq('formulario_id', id);

      if (secoesError) {
        console.error('Erro ao excluir ps_secoes:', secoesError);
        throw secoesError;
      }

      // 8. Por fim, excluir o formulário
      const { error: formularioError } = await supabase
        .from('ps_formularios')
        .delete()
        .eq('id', id);

      if (formularioError) {
        console.error('Erro ao excluir ps_formularios:', formularioError);
        throw formularioError;
      }
    },
    onSuccess: () => {
      toast.success('Processo seletivo excluído permanentemente!');
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
      queryClient.invalidateQueries({ queryKey: ['ps-admin-candidatos'] });
    },
    onError: (error: any) => {
      console.error('Erro na exclusão completa:', error);
      const mensagem = error?.message || 'Erro desconhecido';
      toast.error(`Erro ao excluir processo seletivo: ${mensagem}`);
    }
  });

  // ============================================
  // MUTATION - IMPORTAR SEÇÕES DE OUTRO PROCESSO
  // ============================================

  const importarSecoesDeOutroProcessoMutation = useMutation({
    mutationFn: async ({
      formularioOrigemId,
      formularioDestinoId,
      secaoIds
    }: {
      formularioOrigemId: string;
      formularioDestinoId: string;
      secaoIds: string[];
    }) => {
      // Buscar as seções e perguntas do processo de origem
      const { data: secoesOrigem, error: secoesError } = await supabase
        .from('ps_secoes')
        .select('*')
        .eq('formulario_id', formularioOrigemId)
        .in('id', secaoIds)
        .order('ordem', { ascending: true });

      if (secoesError) throw secoesError;
      if (!secoesOrigem || secoesOrigem.length === 0) {
        throw new Error('Nenhuma seção encontrada para importar');
      }

      // Buscar a maior ordem atual no formulário destino
      const { data: maxOrdemSecao } = await supabase
        .from('ps_secoes')
        .select('ordem')
        .eq('formulario_id', formularioDestinoId)
        .order('ordem', { ascending: false })
        .limit(1)
        .single();

      let ordemSecaoAtual = (maxOrdemSecao?.ordem || 0);

      // Para cada seção, criar a seção e suas perguntas no destino
      for (const secaoOrigem of secoesOrigem) {
        ordemSecaoAtual++;

        // Criar a seção no destino
        const { data: novaSecao, error: novaSecaoError } = await supabase
          .from('ps_secoes')
          .insert({
            formulario_id: formularioDestinoId,
            titulo: secaoOrigem.titulo,
            descricao: secaoOrigem.descricao,
            ordem: ordemSecaoAtual
          })
          .select()
          .single();

        if (novaSecaoError) throw novaSecaoError;

        // Buscar perguntas da seção de origem
        const { data: perguntasOrigem, error: perguntasError } = await supabase
          .from('ps_perguntas')
          .select('*')
          .eq('secao_id', secaoOrigem.id)
          .order('ordem', { ascending: true });

        if (perguntasError) throw perguntasError;

        // Criar as perguntas na nova seção
        if (perguntasOrigem && perguntasOrigem.length > 0) {
          const perguntasParaInserir = perguntasOrigem.map((p, index) => ({
            secao_id: novaSecao.id,
            texto: p.texto,
            tipo: p.tipo,
            obrigatoria: p.obrigatoria,
            ordem: index + 1,
            opcoes: p.opcoes || [],
            texto_aceite: p.texto_aceite || null
          }));

          const { error: insertPerguntasError } = await supabase
            .from('ps_perguntas')
            .insert(perguntasParaInserir);

          if (insertPerguntasError) throw insertPerguntasError;
        }
      }

      return { secoesImportadas: secoesOrigem.length };
    },
    onSuccess: (result) => {
      toast.success(`${result.secoesImportadas} seção(ões) importada(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['ps-admin-formulario-selecionado'] });
    },
    onError: (error: any) => {
      console.error('Erro ao importar seções:', error);
      toast.error(`Erro ao importar seções: ${error?.message || 'Erro desconhecido'}`);
    }
  });

  // Função para buscar formulário completo com seções e perguntas para preview
  const buscarFormularioCompleto = async (formularioId: string) => {
    try {
      const { data: formulario, error: formError } = await (supabase as any)
        .from('ps_formularios')
        .select('*')
        .eq('id', formularioId)
        .single();

      if (formError) {
        console.error('Erro ao buscar formulário:', formError);
        throw formError;
      }

      const { data: secoes, error: secoesError } = await (supabase as any)
        .from('ps_secoes')
        .select('*')
        .eq('formulario_id', formularioId)
        .order('ordem', { ascending: true });

      if (secoesError) {
        console.error('Erro ao buscar seções:', secoesError);
        throw secoesError;
      }

      // Buscar perguntas de todas as seções
      const secoesComPerguntas = await Promise.all(
        (secoes || []).map(async (secao: any) => {
          const { data: perguntas, error: perguntasError } = await (supabase as any)
            .from('ps_perguntas')
            .select('*')
            .eq('secao_id', secao.id)
            .order('ordem', { ascending: true });

          if (perguntasError) {
            console.error('Erro ao buscar perguntas da seção:', secao.id, perguntasError);
          }

          return {
            ...secao,
            perguntas: perguntas || []
          };
        })
      );

      return {
        ...formulario,
        secoes: secoesComPerguntas
      };
    } catch (error) {
      console.error('Erro geral ao buscar formulário completo:', error);
      throw error;
    }
  };

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
    formularioIdEfetivo,
    candidatos,
    comunicado,
    etapaFinal,
    redacoes,
    estatisticas,
    resultadoConfig,
    ranking,

    // Estados de loading
    isLoadingFormularios,
    isLoadingFormularioAtivo,
    isLoadingCandidatos,
    isLoadingComunicado,
    isLoadingEtapaFinal,
    isLoadingRedacoes,
    isLoadingResultadoConfig,
    isLoadingRanking,

    // Ações - Formulário
    criarFormulario: criarFormularioMutation.mutate,
    criarFormularioAsync: criarFormularioMutation.mutateAsync,
    atualizarFormulario: atualizarFormularioMutation.mutate,
    arquivarFormulario: arquivarFormularioMutation.mutate,
    desarquivarFormulario: desarquivarFormularioMutation.mutate,
    excluirFormularioCompleto: excluirFormularioCompletoMutation.mutate,
    isSalvandoFormulario: criarFormularioMutation.isPending || atualizarFormularioMutation.isPending,
    isArquivandoFormulario: arquivarFormularioMutation.isPending,
    isDesarquivandoFormulario: desarquivarFormularioMutation.isPending,
    isExcluindoFormulario: excluirFormularioCompletoMutation.isPending,

    // Ações - Seções
    criarSecao: criarSecaoMutation.mutate,
    atualizarSecao: atualizarSecaoMutation.mutate,
    excluirSecao: excluirSecaoMutation.mutate,
    importarSecoesDeOutroProcesso: importarSecoesDeOutroProcessoMutation.mutate,
    isImportandoSecoes: importarSecoesDeOutroProcessoMutation.isPending,
    buscarFormularioCompleto,

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
    excluirEtapaFinal: excluirEtapaFinalMutation.mutate,
    isSalvandoEtapaFinal: salvarEtapaFinalMutation.isPending,
    isExcluindoEtapaFinal: excluirEtapaFinalMutation.isPending,

    // Ações - Resultado
    salvarConfigResultado: salvarConfigResultadoMutation.mutate,
    atualizarCandidatoResultado: atualizarCandidatoResultadoMutation.mutate,
    togglePublicacaoResultados: togglePublicacaoResultadosMutation.mutate,
    recalcularClassificacoes: recalcularClassificacoesMutation.mutate,
    refetchRanking,
    isSalvandoResultado: salvarConfigResultadoMutation.isPending,
    isPublicandoResultados: togglePublicacaoResultadosMutation.isPending,
    isRecalculandoClassificacoes: recalcularClassificacoesMutation.isPending,

    // Ações - Inscrições
    toggleInscricoes: toggleInscricoesMutation.mutate,
    isToggleInscricoes: toggleInscricoesMutation.isPending
  };
};
