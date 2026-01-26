import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import { toast } from 'sonner';

// Tipos do Processo Seletivo
export type CandidatoStatus =
  | 'nao_inscrito'
  | 'formulario_enviado'
  | 'aprovado_etapa2'
  | 'reprovado'
  | 'etapa_final_liberada'
  | 'concluido';

export type TipoPergunta =
  | 'texto_curto'
  | 'paragrafo'
  | 'multipla_escolha'
  | 'caixas_selecao'
  | 'aceite_obrigatorio';

export interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  inscricoes_abertas: boolean;
  criado_em: string;
  turma_processo?: string | null;
}

export interface Secao {
  id: string;
  formulario_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
}

export interface Pergunta {
  id: string;
  secao_id: string;
  texto: string;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  ordem: number;
  opcoes: string[];
  texto_aceite: string | null;
}

export interface Candidato {
  id: string;
  aluno_id: string | null;
  email_aluno: string;
  nome_aluno: string;
  turma: string | null;
  status: CandidatoStatus;
  formulario_id: string;
  data_inscricao: string | null;
  data_aprovacao: string | null;
  aprovado_por: string | null;
  motivo_reprovacao: string | null;
  data_conclusao: string | null;
  // Campos de resultado
  mensagem_resultado: string | null;
  bolsa_conquistada: string | null;
  percentual_bolsa: number | null;
  classificacao: number | null;
}

export interface Resposta {
  id?: string;
  candidato_id: string;
  pergunta_id: string;
  resposta_texto?: string | null;
  resposta_opcao?: string | null;
  resposta_opcoes?: string[];
  aceite_confirmado?: boolean;
}

export interface Comunicado {
  id: string;
  formulario_id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  link_externo: string | null;
  data_evento: string | null;
  hora_evento: string | null;
  ativo: boolean;
}

export interface EtapaFinal {
  id: string;
  formulario_id: string;
  tema_id: string | null;
  tema_redacao: string;
  instrucoes: string | null;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  ativo: boolean;
}

export interface PSRedacao {
  id: string;
  candidato_id: string;
  etapa_final_id: string;
  texto: string;
  data_envio: string;
  status: string;
  nota_total: number | null;
  comentario: string | null;
}

export interface SecaoComPerguntas extends Secao {
  perguntas: Pergunta[];
}

export interface FormularioCompleto extends Formulario {
  secoes: SecaoComPerguntas[];
}

export interface BolsaConfig {
  nome: string;
  percentual: number;
  vagas: number;
}

export interface ResultadoConfig {
  id: string;
  formulario_id: string;
  bolsas: BolsaConfig[];
  resultado_publicado: boolean;
  data_publicacao: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface ProcessoSeletivoInfo {
  elegivel: boolean;
  participou: boolean;
  temPlanoAtivo: boolean;
  isLoading: boolean;
}

/**
 * Hook para verificar elegibilidade do aluno ao processo seletivo de bolsas.
 */
export const useProcessoSeletivo = (userEmail: string) => {
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription(userEmail);

  const { data: participouData, isLoading: isLoadingParticipacao } = useQuery({
    queryKey: ['processo-seletivo-participacao', userEmail?.toLowerCase()],
    queryFn: async (): Promise<boolean> => {
      if (!userEmail) return false;

      try {
        const emailNormalizado = userEmail.toLowerCase().trim();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('participou_processo_seletivo')
          .ilike('email', emailNormalizado)
          .single();

        if (error) {
          console.error('Erro ao verificar participação:', error);
          return false;
        }

        return profile?.participou_processo_seletivo === true;
      } catch (error) {
        console.error('Erro ao verificar participação:', error);
        return false;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userEmail
  });

  const isLoading = isLoadingSubscription || isLoadingParticipacao;
  const temPlanoAtivo = subscription?.status === 'Ativo';
  const participou = participouData === true;
  const elegivel = !temPlanoAtivo && !participou;

  return {
    elegivel,
    participou,
    temPlanoAtivo,
    isLoading
  } as ProcessoSeletivoInfo;
};

/**
 * Hook para buscar processos seletivos disponíveis para inscrição.
 * Retorna todos os processos ativos com inscrições abertas.
 */
export const useProcessosSeletivosDisponiveis = (userEmail: string) => {
  // Buscar processos ativos com inscrições abertas
  const { data: processosDisponiveis, isLoading: isLoadingProcessos } = useQuery({
    queryKey: ['ps-processos-disponiveis', userEmail],
    queryFn: async (): Promise<Formulario[]> => {
      // Buscar todos os processos ativos com inscrições abertas
      const { data: processosAbertos, error } = await supabase
        .from('ps_formularios')
        .select('*')
        .eq('ativo', true)
        .eq('inscricoes_abertas', true)
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar processos disponíveis:', error);
        return [];
      }

      return processosAbertos || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Buscar processo onde o usuário já está inscrito (mesmo se inscrições fechadas)
  const { data: processoInscrito, isLoading: isLoadingInscrito } = useQuery({
    queryKey: ['ps-processo-inscrito', userEmail?.toLowerCase()],
    queryFn: async (): Promise<Formulario | null> => {
      if (!userEmail) {
        console.log('🔍 [useProcessosSeletivosDisponiveis] Email não fornecido');
        return null;
      }

      const emailNormalizado = userEmail.toLowerCase().trim();
      console.log('🔍 [useProcessosSeletivosDisponiveis] Buscando candidato para email:', emailNormalizado);

      const { data: candidatoExistente, error } = await supabase
        .from('ps_candidatos')
        .select('formulario_id, status, ps_formularios!inner(*)')
        .ilike('email_aluno', emailNormalizado)
        .eq('ps_formularios.ativo', true)
        .order('data_inscricao', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 [useProcessosSeletivosDisponiveis] Resultado:', { candidatoExistente, error });

      if (error || !candidatoExistente) {
        console.log('🔍 [useProcessosSeletivosDisponiveis] Candidato não encontrado ou erro');
        return null;
      }

      console.log('🔍 [useProcessosSeletivosDisponiveis] Candidato encontrado:', {
        formularioId: candidatoExistente.formulario_id,
        status: candidatoExistente.status,
        formulario: candidatoExistente.ps_formularios
      });

      return candidatoExistente.ps_formularios as unknown as Formulario;
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000
  });

  return {
    processosDisponiveis: processosDisponiveis || [],
    processoInscrito,
    isLoading: isLoadingProcessos || isLoadingInscrito,
    // Se já está inscrito em algum processo, esse é o processo a ser mostrado
    // Se não está inscrito mas há processos disponíveis, mostrar a lista
    temMultiplosProcessos: !processoInscrito && (processosDisponiveis?.length || 0) > 1,
    temProcessoDisponivel: !!processoInscrito || (processosDisponiveis?.length || 0) > 0
  };
};

/**
 * Hook principal para o candidato do processo seletivo.
 * Gerencia todo o estado e operações do candidato.
 * @param formularioId - ID do formulário específico (opcional). Se não fornecido, busca automaticamente.
 */
export const useProcessoSeletivoCandidato = (userEmail: string, userId: string, userName: string, turma: string | null, formularioId?: string) => {
  const queryClient = useQueryClient();

  // Buscar formulário ativo (pelo ID específico ou automaticamente)
  const { data: formulario, isLoading: isLoadingFormulario } = useQuery({
    queryKey: ['ps-formulario-candidato', userEmail, formularioId],
    queryFn: async (): Promise<FormularioCompleto | null> => {
      let formData = null;

      // Se foi passado um ID específico, buscar esse formulário
      if (formularioId) {
        const { data: formEspecifico, error: formError } = await supabase
          .from('ps_formularios')
          .select('*')
          .eq('id', formularioId)
          .eq('ativo', true)
          .single();

        if (formError || !formEspecifico) {
          console.log('Formulário específico não encontrado ou inativo');
          return null;
        }
        formData = formEspecifico;
      } else {
        // Comportamento padrão: verificar se o usuário já é candidato de algum formulário ativo
        // Isso permite que candidatos existentes vejam o formulário mesmo com inscricoes_abertas = false
        if (userEmail) {
          const emailNorm = userEmail.toLowerCase().trim();
          const { data: candidatoExistente } = await supabase
            .from('ps_candidatos')
            .select('formulario_id, ps_formularios!inner(*)')
            .ilike('email_aluno', emailNorm)
            .eq('ps_formularios.ativo', true)
            .order('data_inscricao', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (candidatoExistente?.ps_formularios) {
            formData = candidatoExistente.ps_formularios as any;
          }
        }

        // Se não é candidato existente, buscar formulário com inscrições abertas
        if (!formData) {
          const { data: formAberto, error: formError } = await supabase
            .from('ps_formularios')
            .select('*')
            .eq('ativo', true)
            .eq('inscricoes_abertas', true)
            .order('criado_em', { ascending: false })
            .limit(1)
            .single();

          if (formError || !formAberto) {
            console.log('Nenhum formulário ativo com inscrições abertas encontrado');
            return null;
          }
          formData = formAberto;
        }
      }

      // Buscar seções do formulário
      const { data: secoesData, error: secoesError } = await supabase
        .from('ps_secoes')
        .select('*')
        .eq('formulario_id', formData.id)
        .order('ordem');

      if (secoesError) {
        console.error('Erro ao buscar seções:', secoesError);
        return { ...formData, secoes: [] };
      }

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
    staleTime: 5 * 60 * 1000
  });

  // Buscar candidato existente
  const { data: candidato, isLoading: isLoadingCandidato } = useQuery({
    queryKey: ['ps-candidato', userEmail?.toLowerCase(), formulario?.id],
    queryFn: async (): Promise<Candidato | null> => {
      if (!userEmail || !formulario?.id) return null;

      const emailNormalizado = userEmail.toLowerCase().trim();
      const { data, error } = await supabase
        .from('ps_candidatos')
        .select('*')
        .ilike('email_aluno', emailNormalizado)
        .eq('formulario_id', formulario.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Erro ao buscar candidato:', error);
        return null;
      }

      return data as Candidato;
    },
    enabled: !!userEmail && !!formulario?.id,
    staleTime: 30 * 1000
  });

  // Buscar comunicado para aprovados
  const { data: comunicado, isLoading: isLoadingComunicado } = useQuery({
    queryKey: ['ps-comunicado', formulario?.id],
    queryFn: async (): Promise<Comunicado | null> => {
      if (!formulario?.id) return null;

      const { data, error } = await supabase
        .from('ps_comunicados')
        .select('*')
        .eq('formulario_id', formulario.id)
        .eq('ativo', true)
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
    enabled: !!formulario?.id && candidato?.status === 'aprovado_etapa2',
    staleTime: 5 * 60 * 1000
  });

  // Buscar configuração da etapa final
  const { data: etapaFinal, isLoading: isLoadingEtapaFinal } = useQuery({
    queryKey: ['ps-etapa-final', formulario?.id],
    queryFn: async (): Promise<EtapaFinal | null> => {
      if (!formulario?.id) return null;

      const { data, error } = await supabase
        .from('ps_etapa_final')
        .select('*')
        .eq('formulario_id', formulario.id)
        .eq('ativo', true)
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
    enabled: !!formulario?.id && candidato?.status === 'etapa_final_liberada',
    staleTime: 30 * 1000
  });

  // Buscar redação do candidato (se existir) - busca em redacoes_enviadas
  const { data: redacao, isLoading: isLoadingRedacao } = useQuery({
    queryKey: ['ps-redacao', candidato?.id],
    queryFn: async (): Promise<any | null> => {
      if (!candidato?.id) return null;

      // Buscar redação vinculada ao candidato do processo seletivo
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('id, data_envio, frase_tematica, email_aluno, corrigida, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, redacao_texto, status')
        .eq('processo_seletivo_candidato_id', candidato.id)
        .is('deleted_at', null)  // Filtrar soft deletes
        .order('data_envio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar redação do processo seletivo:', error);
        return null;
      }

      // Mapear redacao_texto para texto para compatibilidade com o componente
      if (data) {
        return {
          ...data,
          texto: data.redacao_texto
        };
      }
      return data;
    },
    enabled: !!candidato?.id && (candidato?.status === 'etapa_final_liberada' || candidato?.status === 'concluido'),
    staleTime: 30 * 1000
  });

  // Buscar configuração de resultado (para saber se foi publicado)
  // Nota: buscamos sempre que há formulário, não apenas quando concluído,
  // para evitar condições de corrida no carregamento
  const { data: resultadoConfig, isLoading: isLoadingResultado } = useQuery({
    queryKey: ['ps-resultado-config', formulario?.id],
    queryFn: async (): Promise<ResultadoConfig | null> => {
      if (!formulario?.id) return null;

      const { data, error } = await supabase
        .from('ps_resultado_config')
        .select('*')
        .eq('formulario_id', formulario.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar configuração de resultado:', error);
        return null;
      }

      return data as ResultadoConfig;
    },
    enabled: !!formulario?.id,
    staleTime: 30 * 1000
  });

  // Mutation para enviar formulário
  const enviarFormularioMutation = useMutation({
    mutationFn: async (respostas: Omit<Resposta, 'id' | 'candidato_id'>[]) => {
      if (!formulario?.id || !userEmail) {
        throw new Error('Dados incompletos para envio');
      }

      const emailNormalizado = userEmail.toLowerCase().trim();
      let candidatoId: string;

      // Verificar se já existe candidato com status 'nao_inscrito' (cadastrado via link público)
      const { data: candidatoExistente, error: buscaError } = await supabase
        .from('ps_candidatos')
        .select('id, status')
        .ilike('email_aluno', emailNormalizado)
        .eq('formulario_id', formulario.id)
        .maybeSingle();

      if (buscaError && buscaError.code !== 'PGRST116') {
        console.error('Erro ao buscar candidato existente:', buscaError);
        throw new Error('Erro ao verificar candidatura');
      }

      if (candidatoExistente) {
        // Candidato já existe - atualizar status para 'formulario_enviado'
        candidatoId = candidatoExistente.id;

        const { error: updateError } = await supabase
          .from('ps_candidatos')
          .update({
            status: 'formulario_enviado',
            data_inscricao: new Date().toISOString()
          })
          .eq('id', candidatoId);

        if (updateError) {
          console.error('Erro ao atualizar status do candidato:', updateError);
          throw new Error('Erro ao atualizar candidatura');
        }
      } else {
        // Candidato não existe - criar novo (fluxo antigo para compatibilidade)
        let profileId: string | null = null;
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', emailNormalizado)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
        } else if (profileData) {
          profileId = profileData.id;
        }

        const { data: novoCandidato, error: candidatoError } = await supabase
          .from('ps_candidatos')
          .insert({
            aluno_id: profileId,
            email_aluno: emailNormalizado,
            nome_aluno: userName,
            turma: turma,
            status: 'formulario_enviado',
            formulario_id: formulario.id,
            data_inscricao: new Date().toISOString()
          })
          .select()
          .single();

        if (candidatoError) {
          console.error('Erro ao criar candidato:', candidatoError);
          throw new Error('Erro ao registrar candidatura');
        }

        candidatoId = novoCandidato.id;
      }

      // Inserir respostas
      const respostasParaInserir = respostas.map(r => ({
        ...r,
        candidato_id: candidatoId
      }));

      const { error: respostasError } = await supabase
        .from('ps_respostas')
        .insert(respostasParaInserir);

      if (respostasError) {
        console.error('Erro ao salvar respostas:', respostasError);
        throw new Error('Erro ao salvar respostas do formulário');
      }

      return { id: candidatoId };
    },
    onSuccess: () => {
      toast.success('Formulário enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ps-candidato'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar formulário');
    }
  });

  // Mutation para enviar redação final
  const enviarRedacaoMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!candidato?.id || !etapaFinal?.id) {
        throw new Error('Dados incompletos para envio da redação');
      }

      // Verificar janela temporal
      const agora = new Date();
      const inicio = new Date(`${etapaFinal.data_inicio}T${etapaFinal.hora_inicio}`);
      const fim = new Date(`${etapaFinal.data_fim}T${etapaFinal.hora_fim}`);

      if (agora < inicio) {
        throw new Error('A janela de envio ainda não foi aberta');
      }
      if (agora > fim) {
        throw new Error('A janela de envio já foi encerrada');
      }

      // Inserir redação
      const { data: novaRedacao, error: redacaoError } = await supabase
        .from('ps_redacoes')
        .insert({
          candidato_id: candidato.id,
          etapa_final_id: etapaFinal.id,
          texto: texto,
          status: 'enviada'
        })
        .select()
        .single();

      if (redacaoError) {
        console.error('Erro ao enviar redação:', redacaoError);
        throw new Error('Erro ao enviar redação');
      }

      // Atualizar status do candidato para concluído
      const { error: updateError } = await supabase
        .from('ps_candidatos')
        .update({
          status: 'concluido',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', candidato.id);

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError);
      }

      // Marcar participação no perfil
      await supabase
        .from('profiles')
        .update({ participou_processo_seletivo: true })
        .eq('email', userEmail);

      return novaRedacao;
    },
    onSuccess: () => {
      toast.success('Redação enviada com sucesso! Processo concluído.');
      queryClient.invalidateQueries({ queryKey: ['ps-candidato'] });
      queryClient.invalidateQueries({ queryKey: ['ps-redacao'] });
      queryClient.invalidateQueries({ queryKey: ['processo-seletivo-participacao'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar redação');
    }
  });

  // Verificar se está dentro da janela de envio da etapa final
  const verificarJanelaEtapaFinal = () => {
    if (!etapaFinal) return { dentroJanela: false, status: 'sem_config' as const };

    const agora = new Date();
    const inicio = new Date(`${etapaFinal.data_inicio}T${etapaFinal.hora_inicio}`);
    const fim = new Date(`${etapaFinal.data_fim}T${etapaFinal.hora_fim}`);

    if (agora < inicio) {
      return { dentroJanela: false, status: 'antes' as const, inicio, fim };
    }
    if (agora > fim) {
      return { dentroJanela: false, status: 'depois' as const, inicio, fim };
    }
    return { dentroJanela: true, status: 'durante' as const, inicio, fim };
  };

  return {
    // Dados
    formulario,
    candidato,
    comunicado,
    etapaFinal,
    redacao,
    resultadoConfig,

    // Estados de loading
    isLoading: isLoadingFormulario || isLoadingCandidato,
    isLoadingComunicado,
    isLoadingEtapaFinal,
    isLoadingRedacao,
    isLoadingResultado,

    // Ações
    enviarFormulario: enviarFormularioMutation.mutate,
    enviarRedacao: enviarRedacaoMutation.mutate,
    isEnviandoFormulario: enviarFormularioMutation.isPending,
    isEnviandoRedacao: enviarRedacaoMutation.isPending,

    // Helpers
    verificarJanelaEtapaFinal
  };
};

/**
 * Função para marcar que o aluno participou do processo seletivo.
 */
export const marcarParticipacaoProcessoSeletivo = async (userEmail: string): Promise<boolean> => {
  if (!userEmail) {
    console.error('Email do usuário não fornecido');
    return false;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ participou_processo_seletivo: true })
      .eq('email', userEmail);

    if (error) {
      console.error('Erro ao marcar participação:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao marcar participação:', error);
    return false;
  }
};
