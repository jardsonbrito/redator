import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeTurmaToLetter, TODAS_TURMAS } from '@/utils/turmaUtils';
import type {
  EtapaEstudo,
  AulaDiario,
  PresencaParticipacao,
  DiarioEtapa,
  ResumoTurmaEtapa,
  FormEtapaData,
  FormAulaData
} from '@/types/diario';

// Funções auxiliares para nova lógica de cálculo da média final
const converterPercentualParaNota = (percentual: number): number => {
  return percentual / 10; // 90% -> 9.0
};

const converterNota1000ParaNota10 = (nota: number): number => {
  return nota / 100; // 800 -> 8.0
};

const calcularMediaOnline = (
  frequencia: number,
  participacao: number,
  redacoes: number,
  lousas: number,
  simulados: number
): number => {
  return (frequencia + participacao + redacoes + lousas + simulados) / 5;
};

const calcularNovaMediaFinal = (
  frequencia: number,
  participacao: number,
  redacoes: number,
  lousas: number,
  simulados: number
): number => {
  return (frequencia + participacao + redacoes + lousas + simulados) / 5;
};

const calcularMediaFinalComAvaliacao = (
  mediaOnline: number,
  notaAvaliacaoPresencial: number | null
): number => {
  // Se não houver avaliação presencial, retorna apenas a média online
  if (notaAvaliacaoPresencial === null || notaAvaliacaoPresencial === undefined) {
    return mediaOnline;
  }

  // Se houver avaliação presencial: (Média Online + Avaliação Presencial) ÷ 2
  return (mediaOnline + notaAvaliacaoPresencial) / 2;
};

// Hook para gerenciar etapas
export function useEtapas(turma?: string) {
  return useQuery({
    queryKey: ['etapas', turma],
    queryFn: async () => {
      let query = supabase
        .from('etapas_estudo')
        .select('*')
        .eq('ativo', true)
        .order('numero');
      
      if (turma) {
        query = query.eq('turma', turma);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as EtapaEstudo[];
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutos (cache agressivo)
    gcTime: 15 * 60 * 1000, // Manter em cache por 15 minutos
  });
}

// Hook para criar/editar etapa
export function useEtapaMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (etapa: FormEtapaData & { id?: string }) => {
      if (etapa.id) {
        // Atualizar etapa existente
        const { data, error } = await supabase
          .from('etapas_estudo')
          .update({
            nome: etapa.nome,
            numero: etapa.numero,
            data_inicio: etapa.data_inicio,
            data_fim: etapa.data_fim,
            turma: etapa.turma
          })
          .eq('id', etapa.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Criar nova etapa
        const { data, error } = await supabase
          .from('etapas_estudo')
          .insert({
            nome: etapa.nome,
            numero: etapa.numero,
            data_inicio: etapa.data_inicio,
            data_fim: etapa.data_fim,
            turma: etapa.turma
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas'] });
      toast({
        title: 'Sucesso',
        description: 'Etapa salva com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: `Erro ao salvar etapa: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook para excluir etapa
export function useEtapaDeleteMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (etapaId: string) => {
      const { error } = await supabase
        .from('etapas_estudo')
        .delete()
        .eq('id', etapaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas'] });
      toast({
        title: 'Sucesso',
        description: 'Etapa excluída com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir etapa: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook para aulas do diário
export function useAulasDiario(turma?: string, etapaId?: string) {
  return useQuery({
    queryKey: ['aulas_diario', turma, etapaId],
    queryFn: async () => {
      // Normalizar turma para busca
      const turmaNormalizada = normalizeTurmaToLetter(turma) || turma;
      const possiveisTurmas = [
        turmaNormalizada,
        `TURMA ${turmaNormalizada}`,
        `Turma ${turmaNormalizada}`,
        `turma ${turmaNormalizada}`
      ];

      let query = supabase
        .from('aulas_diario')
        .select(`
          *,
          etapas_estudo (
            id,
            nome,
            numero
          )
        `)
        .order('data_aula', { ascending: false });

      if (turma) {
        query = query.in('turma', possiveisTurmas);
      }

      if (etapaId) {
        query = query.eq('etapa_id', etapaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (AulaDiario & { etapas_estudo: { id: string; nome: string; numero: number } })[];
    },
    enabled: !!turma,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para criar/editar aula
export function useAulaMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (aula: FormAulaData & { id?: string; professor_email?: string }) => {
      if (aula.id) {
        // Atualizar aula existente
        const { data, error } = await supabase
          .from('aulas_diario')
          .update({
            turma: aula.turma,
            data_aula: aula.data_aula,
            conteudo_ministrado: aula.conteudo_ministrado,
            observacoes: aula.observacoes
          })
          .eq('id', aula.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Criar nova aula
        const { data, error } = await supabase
          .from('aulas_diario')
          .insert({
            turma: aula.turma,
            data_aula: aula.data_aula,
            conteudo_ministrado: aula.conteudo_ministrado,
            observacoes: aula.observacoes,
            professor_email: aula.professor_email
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas_diario'] });
      toast({
        title: 'Sucesso',
        description: 'Aula registrada com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: `Erro ao registrar aula: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook para excluir aula
export function useAulaDeleteMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (aulaId: string) => {
      // Primeiro, excluir registros de presença relacionados
      const { error: presencaError } = await supabase
        .from('presenca_participacao_diario')
        .delete()
        .eq('aula_id', aulaId);
      
      if (presencaError) throw presencaError;

      // Depois, excluir a aula
      const { error } = await supabase
        .from('aulas_diario')
        .delete()
        .eq('id', aulaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas_diario'] });
      queryClient.invalidateQueries({ queryKey: ['presenca_participacao'] });
      toast({
        title: 'Sucesso',
        description: 'Aula excluída com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir aula: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook para presença e participação
export function usePresencaParticipacao(aulaId?: string) {
  return useQuery({
    queryKey: ['presenca_participacao', aulaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presenca_participacao_diario')
        .select('*')
        .eq('aula_id', aulaId!)
        .order('aluno_email');
      
      if (error) throw error;
      return data as PresencaParticipacao[];
    },
    enabled: !!aulaId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para salvar presença/participação
export function usePresencaMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dados: { 
      aula_id: string;
      aluno_email: string;
      turma: string;
      presente: boolean;
      participou: boolean;
      observacoes_aluno?: string;
    }) => {
      const { data, error } = await supabase
        .from('presenca_participacao_diario')
        .upsert(dados, {
          onConflict: 'aula_id,aluno_email'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['presenca_participacao', variables.aula_id] 
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: `Erro ao salvar presença: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook para obter diário do aluno
export function useDiarioAluno(alunoEmail: string, turma: string, etapaNumero?: number) {
  return useQuery({
    queryKey: ['diario_aluno', alunoEmail, turma, etapaNumero],
    queryFn: async () => {
      // Normalizar turma para garantir compatibilidade (aceita "A", "Turma A", "TURMA A", etc.)
      const turmaNormalizada = normalizeTurmaToLetter(turma) || turma;

      console.log('🔍 Buscando diário - turma original:', turma, '→ normalizada:', turmaNormalizada);

      // Buscar etapas da turma (usando a turma normalizada)
      const { data: etapas, error: etapasError } = await supabase
        .from('etapas_estudo')
        .select('*')
        .eq('turma', turmaNormalizada)
        .eq('ativo', true)
        .order('numero');
      
      if (etapasError) throw etapasError;
      
      if (!etapas || etapas.length === 0) {
        return [];
      }

      // Para cada etapa, vamos buscar os dados do aluno
      const diarioData: DiarioEtapa[] = [];
      
      for (const etapa of etapas) {
        // Se foi especificada uma etapa específica, filtrar
        if (etapaNumero && etapa.numero !== etapaNumero) {
          continue;
        }

        // Buscar aulas desta etapa (usando turma normalizada)
        // IMPORTANTE: Buscar com múltiplos formatos para compatibilidade com dados antigos
        const possiveisTurmas = [
          turmaNormalizada,              // "C"
          `TURMA ${turmaNormalizada}`,   // "TURMA C"
          `Turma ${turmaNormalizada}`,   // "Turma C"
          `turma ${turmaNormalizada}`    // "turma C"
        ];

        const { data: aulas, error: aulasError } = await supabase
          .from('aulas_diario')
          .select('id, turma')
          .in('turma', possiveisTurmas)
          .eq('etapa_id', etapa.id)
          .is('origem_aula_virtual_id', null); // Excluir entradas criadas por aulas ao vivo (contadas em totalAulasVirtuais)

        // Buscar presença do aluno nessas aulas do diário
        const aulaIds = aulas?.map(a => a.id) || [];
        let frequenciaData = { total_aulas: 0, aulas_presentes: 0, percentual_frequencia: 0 };
        let participacaoData = { total_aulas: 0, aulas_participou: 0, percentual_participacao: 0 };

        // Contar presenças nas aulas do diário
        let totalAulasDiario = 0;
        let aulasPresentes = 0;
        let aulasParticipou = 0;

        if (aulaIds.length > 0) {
          const { data: presencas } = await supabase
            .from('presenca_participacao_diario')
            .select('presente, participou')
            .eq('aluno_email', alunoEmail)
            .in('aula_id', aulaIds);

          totalAulasDiario = aulaIds.length;
          aulasPresentes = presencas?.filter(p => p.presente).length || 0;
          aulasParticipou = presencas?.filter(p => p.participou).length || 0;
        }

        // Buscar presença nas aulas virtuais da mesma etapa/período
        let totalAulasVirtuais = 0;
        let presencasVirtuais = 0;

        try {
          // Buscar aulas virtuais do período com aula_mae_id para agrupamento pedagógico
          // Repetições da mesma aula são agrupadas e contam como 1 unidade pedagógica
          const { data: rawAulas } = await supabase
            .from('aulas_virtuais')
            .select('id, aula_mae_id')
            .eq('ativo', true)
            .gte('data_aula', etapa.data_inicio)
            .lt('data_aula', etapa.data_fim + 'T23:59:59')
            .or(`turmas_autorizadas.cs.{"${turmaNormalizada}"},turmas_autorizadas.cs.{"TURMA ${turmaNormalizada}"},turmas_autorizadas.cs.{"Turma ${turmaNormalizada}"},turmas_autorizadas.cs.{"Todas"}`);

          const aulasVirtuais = (rawAulas || []) as { id: string; aula_mae_id: string | null }[];

          if (aulasVirtuais.length > 0) {
            // Agrupar: aulas raiz (aula_mae_id IS NULL) são unidades pedagógicas independentes
            // Repetições (aula_mae_id NOT NULL) se juntam ao grupo da aula mãe
            const grupos: Record<string, string[]> = {};
            for (const aula of aulasVirtuais.filter(a => !a.aula_mae_id)) {
              grupos[aula.id] = [aula.id];
            }
            for (const aula of aulasVirtuais.filter(a => !!a.aula_mae_id)) {
              if (grupos[aula.aula_mae_id!]) {
                grupos[aula.aula_mae_id!].push(aula.id);
              } else {
                // Aula mãe fora do período — tratar como unidade independente
                grupos[aula.id] = [aula.id];
              }
            }

            totalAulasVirtuais = Object.keys(grupos).length;

            const todosIds = aulasVirtuais.map(a => a.id);
            const { data: presencasAulasVirtuais } = await supabase
              .from('presenca_aulas')
              .select('aula_id')
              .eq('email_aluno', alunoEmail.toLowerCase())
              .in('aula_id', todosIds)
              .not('entrada_at', 'is', null);

            const idsComPresenca = new Set(presencasAulasVirtuais?.map(p => p.aula_id) || []);

            // Contar grupos onde o aluno tem presença em qualquer sessão
            presencasVirtuais = Object.values(grupos).filter(ids =>
              ids.some(id => idsComPresenca.has(id))
            ).length;
          }
        } catch (error) {
          console.error('Erro ao buscar aulas virtuais:', error);
        }

        // Combinar dados do diário + aulas virtuais
        const totalAulasCompleto = totalAulasDiario + totalAulasVirtuais;
        const totalPresencasCompleto = aulasPresentes + presencasVirtuais;

        frequenciaData = {
          total_aulas: totalAulasCompleto,
          aulas_presentes: totalPresencasCompleto,
          percentual_frequencia: totalAulasCompleto > 0 ? (totalPresencasCompleto / totalAulasCompleto) * 100 : 0
        };

        // Para participação, considerar apenas aulas do diário (aulas virtuais não têm campo participação)
        participacaoData = {
          total_aulas: totalAulasDiario,
          aulas_participou: aulasParticipou,
          percentual_participacao: totalAulasDiario > 0 ? (aulasParticipou / totalAulasDiario) * 100 : 0
        };

        // Buscar redações do período da etapa
        let redacoesData = { total_redacoes: 0, nota_media: 0 };
        try {
          const { data: redacoes, error: redacoesError } = await supabase
            .from('redacoes_enviadas')
            .select('nota_total, status')
            .ilike('email_aluno', alunoEmail)
            .gte('data_envio', etapa.data_inicio)
            .lt('data_envio', etapa.data_fim + 'T23:59:59')
            .is('deleted_at', null);  // Filtrar soft deletes

          if (!redacoesError && redacoes) {
            // Filtrar redações válidas (não devolvidas e com nota)
            const redacoesValidas = redacoes.filter(r => 
              r.status !== 'devolvida' && 
              r.nota_total !== null && 
              r.nota_total !== undefined && 
              r.nota_total > 0
            );
            
            redacoesData = {
              total_redacoes: redacoesValidas.length,
              nota_media: redacoesValidas.length > 0 
                ? redacoesValidas.reduce((acc, r) => acc + r.nota_total, 0) / redacoesValidas.length 
                : 0
            };
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar redações:', error);
        }

        // Buscar simulados do período da etapa
        let simuladosData = { total_simulados: 0, nota_media: 0 };
        try {
          const { data: simulados, error: simuladosError } = await supabase
            .from('redacoes_simulado')
            .select('nota_total')
            .ilike('email_aluno', alunoEmail)
            .gte('data_envio', etapa.data_inicio)
            .lt('data_envio', etapa.data_fim + 'T23:59:59')
            .is('devolvida_por', null) // Não devolvidas
            .is('deleted_at', null);  // Filtrar soft deletes

          if (!simuladosError && simulados) {
            const simuladosComNota = simulados.filter(s => 
              s.nota_total !== null && 
              s.nota_total !== undefined && 
              s.nota_total > 0
            );
            
            simuladosData = {
              total_simulados: simuladosComNota.length,
              nota_media: simuladosComNota.length > 0 
                ? simuladosComNota.reduce((acc, s) => acc + s.nota_total, 0) / simuladosComNota.length 
                : 0
            };
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar simulados:', error);
        }

        // Buscar lousas do período da etapa
        let lousasData = { total_lousas: 0, nota_media: 0 };
        try {
          const { data: lousas, error: lousasError } = await supabase
            .from('lousa_resposta')
            .select('nota')
            .eq('email_aluno', alunoEmail)
            .gte('submitted_at', etapa.data_inicio)
            .lt('submitted_at', etapa.data_fim + 'T23:59:59')
            .not('nota', 'is', null)
            .gt('nota', 0);

          if (!lousasError && lousas) {
            const notasLousas = lousas.map(l => l.nota).filter(nota => nota !== null && nota > 0);

            lousasData = {
              total_lousas: notasLousas.length,
              nota_media: notasLousas.length > 0
                ? notasLousas.reduce((acc, nota) => acc + nota, 0) / notasLousas.length
                : 0
            };
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar lousas:', error);
        }

        // Buscar exercícios do período da etapa (redacoes_exercicio + radar_dados)
        let exerciciosData = { total_exercicios: 0 };
        try {
          // Buscar redações de exercícios
          const { data: redacoesExercicio, error: exerciciosError } = await supabase
            .from('redacoes_exercicio')
            .select('id, data_envio')
            .eq('email_aluno', alunoEmail)
            .gte('data_envio', etapa.data_inicio)
            .lt('data_envio', etapa.data_fim + 'T23:59:59')
            .is('devolvida_por', null) // Não devolvidas
            .is('deleted_at', null);  // Filtrar soft deletes

          // Buscar dados do radar (exercícios importados)
          const { data: radarExercicios, error: radarError } = await supabase
            .from('radar_dados')
            .select('id, data_realizacao')
            .ilike('email_aluno', alunoEmail)
            .gte('data_realizacao', etapa.data_inicio)
            .lte('data_realizacao', etapa.data_fim);

          let totalExercicios = 0;
          
          if (!exerciciosError && redacoesExercicio) {
            totalExercicios += redacoesExercicio.length;
            console.log(`📝 Redações exercício de ${alunoEmail}:`, redacoesExercicio.length);
          }
          
          if (!radarError && radarExercicios) {
            totalExercicios += radarExercicios.length;
            console.log(`📊 Radar exercícios de ${alunoEmail}:`, radarExercicios.length);
          }

          exerciciosData = {
            total_exercicios: totalExercicios
          };
          
          console.log(`✅ Total exercícios da etapa ${etapa.nome} para ${alunoEmail}:`, exerciciosData.total_exercicios);
          
        } catch (error) {
          console.log('⚠️ Erro ao buscar exercícios:', error);
        }

        // Buscar avaliação presencial da etapa
        let avaliacaoPresencialData: { nota: number | null; observacoes?: string } = { nota: null };
        try {
          const { data: avaliacaoData, error: avaliacaoError } = await supabase
            .from('avaliacoes_presenciais')
            .select('nota, observacoes')
            .ilike('aluno_email', alunoEmail)
            .eq('etapa_id', etapa.id)
            .maybeSingle();

          if (!avaliacaoError && avaliacaoData) {
            avaliacaoPresencialData = {
              nota: avaliacaoData.nota,
              observacoes: avaliacaoData.observacoes
            };
          }
        } catch (error) {
          console.error('Erro ao buscar avaliação presencial:', error);
        }

        // NOVA LÓGICA: Calcular média final
        // Converter percentuais para notas 0-10
        const frequenciaNota = converterPercentualParaNota(frequenciaData.percentual_frequencia);
        const participacaoNota = converterPercentualParaNota(participacaoData.percentual_participacao);

        // Converter notas 0-1000 para 0-10
        const redacoesNota = converterNota1000ParaNota10(redacoesData.nota_media);
        const simuladosNota = converterNota1000ParaNota10(simuladosData.nota_media);

        // Converter notas das lousas (já estão em escala 0-10)
        const lousasNota = lousasData.nota_media;

        // 1. Calcular média online (5 critérios ÷ 5)
        const mediaOnline = calcularMediaOnline(
          frequenciaNota,
          participacaoNota,
          redacoesNota,
          lousasNota,
          simuladosNota
        );

        // 2. Calcular média final: (Média Online + Avaliação Presencial) ÷ 2
        const mediaFinal = calcularMediaFinalComAvaliacao(
          mediaOnline,
          avaliacaoPresencialData.nota
        );

        // Logs simplificados para melhor performance
        const avaliacaoText = avaliacaoPresencialData.nota !== null
          ? `AP${avaliacaoPresencialData.nota.toFixed(1)}`
          : 'AP-';
        console.log(`🧮 ${alunoEmail} - ${etapa.nome}: Online=${mediaOnline.toFixed(1)} (F${frequenciaNota.toFixed(1)} P${participacaoNota.toFixed(1)} R${redacoesNota.toFixed(1)} L${lousasNota.toFixed(1)} S${simuladosNota.toFixed(1)}) ${avaliacaoText} → Final=${mediaFinal.toFixed(1)}`);

        diarioData.push({
          etapa_numero: etapa.numero,
          etapa_nome: etapa.nome,
          data_inicio: etapa.data_inicio,
          data_fim: etapa.data_fim,
          frequencia: frequenciaData,
          participacao: participacaoData,
          redacoes: redacoesData,
          simulados: simuladosData,
          exercicios: exerciciosData,
          lousas: lousasData,
          avaliacao_presencial: avaliacaoPresencialData,
          media_final: Math.max(0, Math.min(10, mediaFinal)) // Garantir que fica entre 0 e 10
        });
      }
      
      return diarioData;
    },
    enabled: !!alunoEmail && !!turma,
    staleTime: 10 * 60 * 1000, // 10 minutos (cache agressivo)
    gcTime: 15 * 60 * 1000, // Manter em cache por 15 minutos (cache maior para performance)
  });
}

// Hook para resumo da turma
export function useResumoTurma(turma: string, etapaNumero: number) {
  return useQuery({
    queryKey: ['resumo_turma', turma, etapaNumero],
    queryFn: async () => {
      if (!turma || !etapaNumero) {
        return null;
      }

      // Normalizar turma para garantir compatibilidade
      const turmaNormalizada = normalizeTurmaToLetter(turma) || turma;
      console.log('🔍 Resumo Turma - turma original:', turma, '→ normalizada:', turmaNormalizada);

      // Buscar a etapa específica
      const { data: etapas, error: etapasError } = await supabase
        .from('etapas_estudo')
        .select('*')
        .eq('turma', turmaNormalizada)
        .eq('numero', etapaNumero)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (etapasError || !etapas) {
        console.log('⚠️ Etapa não encontrada:', etapasError);
        return null;
      }

      // Buscar todos os alunos dessa turma (usando turma normalizada)
      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select('email, nome')
        .eq('user_type', 'aluno')
        .eq('turma', turmaNormalizada)
        .eq('ativo', true);

      if (alunosError) {
        console.log('⚠️ Erro ao buscar alunos:', alunosError);
        return null;
      }

      if (!alunos || alunos.length === 0) {
        return {
          etapa: etapas,
          alunos: [],
          estatisticas: {
            totalAlunos: 0,
            frequenciaMedia: 0,
            participacaoMedia: 0,
            mediaFinalMedia: 0,
            totalRedacoes: 0,
            totalSimulados: 0,
            totalExercicios: 0
          }
        };
      }

      // Para cada aluno, buscar dados de diário
      const resumoAlunos = [];
      let totalFrequencia = 0;
      let totalParticipacao = 0;
      let totalMediaFinal = 0;
      let totalRedacoes = 0;
      let totalSimulados = 0;
      let totalExercicios = 0;

      // Otimização: Buscar todas as atividades em paralelo primeiro
      console.log(`🚀 Buscando dados de ${alunos.length} alunos em lote...`);
      const emailsAlunos = alunos.map(a => a.email);
      
      const [redacoesTodas, simuladosTodos, exerciciosTodos, radarTodos] = await Promise.all([
        supabase
          .from('redacoes_enviadas')
          .select('email_aluno, nota_total')
          .in('email_aluno', emailsAlunos)
          .gte('data_envio', etapas.data_inicio)
          .lte('data_envio', etapas.data_fim)
          .is('devolvida_por', null)
          .is('deleted_at', null),  // Filtrar soft deletes

        supabase
          .from('redacoes_simulado')
          .select('email_aluno, nota_total')
          .in('email_aluno', emailsAlunos)
          .gte('data_envio', etapas.data_inicio)
          .lte('data_envio', etapas.data_fim)
          .is('devolvida_por', null)
          .is('deleted_at', null),  // Filtrar soft deletes

        supabase
          .from('redacoes_exercicio')
          .select('email_aluno')
          .in('email_aluno', emailsAlunos)
          .gte('data_envio', etapas.data_inicio)
          .lte('data_envio', etapas.data_fim)
          .is('deleted_at', null),  // Filtrar soft deletes
          
        supabase
          .from('radar_dados')
          .select('email_aluno')
          .filter('email_aluno', 'in', `(${emailsAlunos.map(e => `"${e}"`).join(',')})`)
          .gte('data_realizacao', etapas.data_inicio)
          .lte('data_realizacao', etapas.data_fim)
      ]);

      console.log(`📊 Dados carregados em lote!`);

      // Buscar aulas desta etapa UMA VEZ SÓ (usando turma normalizada)
      // IMPORTANTE: Buscar com múltiplos formatos para compatibilidade com dados antigos
      const possiveisTurmas = [
        turmaNormalizada,              // "C"
        `TURMA ${turmaNormalizada}`,   // "TURMA C"
        `Turma ${turmaNormalizada}`,   // "Turma C"
        `turma ${turmaNormalizada}`    // "turma C"
      ];

      const { data: aulas } = await supabase
        .from('aulas_diario')
        .select('id')
        .in('turma', possiveisTurmas)
        .eq('etapa_id', etapas.id);

      const aulaIds = aulas?.map(a => a.id) || [];

      // Buscar TODAS as presenças de UMA VEZ para todos os alunos
      const { data: todasPresencas } = await supabase
        .from('presenca_participacao_diario')
        .select('aluno_email, presente, participou')
        .in('aluno_email', emailsAlunos)
        .in('aula_id', aulaIds);

      // Buscar aulas virtuais do período da etapa para esta turma (UMA VEZ SÓ)
      // IMPORTANTE: Buscar com múltiplos formatos para compatibilidade
      const { data: aulasVirtuais } = await supabase
        .from('aulas_virtuais')
        .select('id')
        .eq('ativo', true)
        .gte('data_aula', etapas.data_inicio)
        .lt('data_aula', etapas.data_fim + 'T23:59:59')
        .or(`turmas_autorizadas.cs.{"${turmaNormalizada}"},turmas_autorizadas.cs.{"TURMA ${turmaNormalizada}"},turmas_autorizadas.cs.{"Turma ${turmaNormalizada}"},turmas_autorizadas.cs.{"Todas"}`);

      const aulasVirtuaisIds = aulasVirtuais?.map(a => a.id) || [];
      
      // Buscar TODAS as presenças nas aulas virtuais para todos os alunos (UMA VEZ SÓ)
      const { data: todasPresencasVirtuais } = aulasVirtuaisIds.length > 0 ? await supabase
        .from('presenca_aulas')
        .select('email_aluno, entrada_at')
        .filter('email_aluno', 'in', `(${emailsAlunos.map(e => `"${e.toLowerCase()}"`).join(',')})`)
        .in('aula_id', aulasVirtuaisIds)
        .not('entrada_at', 'is', null) : { data: [] };

      console.log(`🎯 Dados de presença virtual carregados: ${todasPresencasVirtuais?.length || 0} registros`);

      for (const aluno of alunos) {
        // Contar presenças nas aulas do diário
        const presencasAluno = todasPresencas?.filter(p => p.aluno_email === aluno.email) || [];
        const totalAulasDiario = aulaIds.length;
        const aulasPresentes = presencasAluno.filter(p => p.presente).length;
        const aulasParticipou = presencasAluno.filter(p => p.participou).length;

        // Contar presenças nas aulas virtuais para este aluno
        const presencasVirtuaisAluno = todasPresencasVirtuais?.filter(p => 
          p.email_aluno === aluno.email.toLowerCase()
        ) || [];
        const totalAulasVirtuais = aulasVirtuaisIds.length;
        const presencasVirtuais = presencasVirtuaisAluno.length;

        // Combinar dados do diário + aulas virtuais
        const totalAulasCompleto = totalAulasDiario + totalAulasVirtuais;
        const totalPresencasCompleto = aulasPresentes + presencasVirtuais;

        const frequenciaData = {
          total_aulas: totalAulasCompleto,
          aulas_presentes: totalPresencasCompleto,
          percentual_frequencia: totalAulasCompleto > 0 ? (totalPresencasCompleto / totalAulasCompleto) * 100 : 0
        };

        // Para participação, considerar apenas aulas do diário (aulas virtuais não têm participação)
        const participacaoData = {
          total_aulas: totalAulasDiario,
          aulas_participou: aulasParticipou,
          percentual_participacao: totalAulasDiario > 0 ? (aulasParticipou / totalAulasDiario) * 100 : 0
        };

        // Buscar redações do período da etapa com campos corretos
        let redacoesData = { total_redacoes: 0, nota_media: 0 };
        try {
          const { data: redacoes, error: redacoesError } = await supabase
            .from('redacoes_enviadas')
            .select('nota_total, status, devolvida_por')
            .eq('email_aluno', aluno.email)
            .gte('data_envio', etapas.data_inicio)
            .lte('data_envio', etapas.data_fim)
            .is('deleted_at', null);  // Filtrar soft deletes

          if (!redacoesError && redacoes) {
            const redacoesValidas = redacoes.filter(r => 
              r.status !== 'devolvida' && 
              r.devolvida_por === null &&
              r.nota_total !== null && 
              r.nota_total !== undefined && 
              r.nota_total > 0
            );
            
            redacoesData = {
              total_redacoes: redacoesValidas.length,
              nota_media: redacoesValidas.length > 0 
                ? redacoesValidas.reduce((acc, r) => acc + r.nota_total, 0) / redacoesValidas.length 
                : 0
            };
            
            console.log(`✅ Redações de ${aluno.email}: ${redacoesData.total_redacoes} (média: ${redacoesData.nota_media.toFixed(1)})`);
          } else {
            console.log(`❌ Erro redações ${aluno.email}:`, redacoesError?.message);
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar redações:', aluno.email, error);
        }

        // Buscar simulados do período da etapa com campos corretos
        let simuladosData = { total_simulados: 0, nota_media: 0 };
        try {
          const { data: simulados, error: simuladosError } = await supabase
            .from('redacoes_simulado')
            .select('nota_total, devolvida_por')
            .eq('email_aluno', aluno.email)
            .gte('data_envio', etapas.data_inicio)
            .lte('data_envio', etapas.data_fim)
            .is('deleted_at', null);  // Filtrar soft deletes

          if (!simuladosError && simulados) {
            const simuladosComNota = simulados.filter(s => 
              s.devolvida_por === null &&
              s.nota_total !== null && 
              s.nota_total !== undefined && 
              s.nota_total > 0
            );
            
            simuladosData = {
              total_simulados: simuladosComNota.length,
              nota_media: simuladosComNota.length > 0 
                ? simuladosComNota.reduce((acc, s) => acc + s.nota_total, 0) / simuladosComNota.length 
                : 0
            };
            
            console.log(`✅ Simulados de ${aluno.email}: ${simuladosData.total_simulados} (média: ${simuladosData.nota_media.toFixed(1)})`);
          } else {
            console.log(`❌ Erro simulados ${aluno.email}:`, simuladosError?.message);
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar simulados:', aluno.email, error);
        }

        // Buscar lousas do período da etapa
        let lousasData = { total_lousas: 0, nota_media: 0 };
        try {
          const { data: lousas, error: lousasError } = await supabase
            .from('lousa_resposta')
            .select('nota')
            .eq('email_aluno', aluno.email)
            .gte('submitted_at', etapas.data_inicio)
            .lt('submitted_at', etapas.data_fim + 'T23:59:59')
            .not('nota', 'is', null)
            .gt('nota', 0);

          if (!lousasError && lousas) {
            const notasLousas = lousas.map(l => l.nota).filter(nota => nota !== null && nota > 0);

            lousasData = {
              total_lousas: notasLousas.length,
              nota_media: notasLousas.length > 0
                ? notasLousas.reduce((acc, nota) => acc + nota, 0) / notasLousas.length
                : 0
            };
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar lousas:', aluno.email, error);
        }

        // Buscar exercícios do período da etapa (redacoes_exercicio + radar_dados)
        let exerciciosData = { total_exercicios: 0 };
        try {
          // Buscar redações de exercícios
          const { data: redacoesExercicio, error: exerciciosError } = await supabase
            .from('redacoes_exercicio')
            .select('id')
            .eq('email_aluno', aluno.email)
            .gte('data_envio', etapas.data_inicio)
            .lte('data_envio', etapas.data_fim)
            .is('deleted_at', null);  // Filtrar soft deletes

          // Buscar dados do radar (exercícios importados)
          const { data: radarExercicios, error: radarError } = await supabase
            .from('radar_dados')
            .select('id')
            .ilike('email_aluno', aluno.email)
            .gte('data_realizacao', etapas.data_inicio)
            .lte('data_realizacao', etapas.data_fim);

          let totalExercicios = 0;
          
          if (!exerciciosError && redacoesExercicio) {
            totalExercicios += redacoesExercicio.length;
            // Log simplificado
          }
          
          if (!radarError && radarExercicios) {
            totalExercicios += radarExercicios.length;
            // Log simplificado
          }

          exerciciosData = {
            total_exercicios: totalExercicios
          };
            
          console.log(`✅ Total exercícios de ${aluno.email}: ${exerciciosData.total_exercicios}`);
        } catch (error) {
          console.log('⚠️ Erro ao buscar exercícios:', aluno.email, error);
        }

        console.log(`📊 Resumo para ${aluno.email} - Período: ${etapas.data_inicio} a ${etapas.data_fim}`);

        // Buscar avaliação presencial da etapa
        let avaliacaoPresencialData: { nota: number | null; observacoes?: string } = { nota: null };
        try {
          const { data: avaliacaoData, error: avaliacaoError } = await supabase
            .from('avaliacoes_presenciais')
            .select('nota, observacoes')
            .eq('aluno_email', aluno.email)
            .eq('etapa_id', etapas.id)
            .maybeSingle();

          if (!avaliacaoError && avaliacaoData) {
            avaliacaoPresencialData = {
              nota: avaliacaoData.nota,
              observacoes: avaliacaoData.observacoes
            };
            console.log(`✅ Avaliação presencial de ${aluno.email}: ${avaliacaoData.nota}`);
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar avaliação presencial:', aluno.email, error);
        }

        // NOVA LÓGICA: Calcular média final com 5 critérios fixos
        // Converter percentuais para notas 0-10
        const frequenciaNota = converterPercentualParaNota(frequenciaData.percentual_frequencia);
        const participacaoNota = converterPercentualParaNota(participacaoData.percentual_participacao);

        // Converter notas 0-1000 para 0-10
        const redacoesNota = converterNota1000ParaNota10(redacoesData.nota_media);
        const simuladosNota = converterNota1000ParaNota10(simuladosData.nota_media);

        // Converter notas das lousas (já estão em escala 0-10)
        const lousasNota = lousasData.nota_media;

        // 1. Calcular Média Online (5 critérios)
        const mediaOnline = calcularMediaOnline(
          frequenciaNota,
          participacaoNota,
          redacoesNota,
          lousasNota,
          simuladosNota
        );

        // 2. Calcular Média Final: (Média Online + Avaliação Presencial) ÷ 2
        const mediaFinal = calcularMediaFinalComAvaliacao(
          mediaOnline,
          avaliacaoPresencialData.nota
        );

        const dadosAluno = {
          frequencia: frequenciaData,
          participacao: participacaoData,
          redacoes: redacoesData,
          simulados: simuladosData,
          exercicios: exerciciosData,
          lousas: lousasData,
          avaliacao_presencial: avaliacaoPresencialData,
          media_final: Math.max(0, Math.min(10, mediaFinal))
        };

        resumoAlunos.push({
          aluno_email: aluno.email,
          aluno_nome: aluno.nome,
          dados: dadosAluno
        });

        // Acumular para estatísticas gerais
        totalFrequencia += frequenciaData.percentual_frequencia;
        totalParticipacao += participacaoData.percentual_participacao;
        totalMediaFinal += dadosAluno.media_final;
        totalRedacoes += redacoesData.total_redacoes;
        totalSimulados += simuladosData.total_simulados;
        totalExercicios += exerciciosData.total_exercicios;
      }

      const totalAlunos = alunos.length;

      // Ordenar alunos por nome em ordem alfabética
      const alunosOrdenados = resumoAlunos.sort((a, b) =>
        a.aluno_nome.localeCompare(b.aluno_nome, 'pt-BR', { sensitivity: 'base' })
      );

      return {
        etapa: etapas,
        alunos: alunosOrdenados,
        estatisticas: {
          totalAlunos,
          frequenciaMedia: totalAlunos > 0 ? totalFrequencia / totalAlunos : 0,
          participacaoMedia: totalAlunos > 0 ? totalParticipacao / totalAlunos : 0,
          mediaFinalMedia: totalAlunos > 0 ? totalMediaFinal / totalAlunos : 0,
          totalRedacoes,
          totalSimulados,
          totalExercicios
        }
      };
    },
    enabled: !!turma && !!etapaNumero,
    staleTime: 10 * 60 * 1000, // 10 minutos (cache agressivo)
    gcTime: 15 * 60 * 1000, // Manter em cache por 15 minutos
  });
}

// Hook para limpar dados de teste
export function useLimparDadosTesteMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Excluir em ordem: presença -> aulas -> etapas
      
      // 1. Excluir registros de presença
      const { error: presencaError } = await supabase
        .from('presenca_participacao_diario')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Excluir todos
      
      if (presencaError) throw presencaError;

      // 2. Excluir aulas
      const { error: aulasError } = await supabase
        .from('aulas_diario')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Excluir todas
      
      if (aulasError) throw aulasError;

      // 3. Excluir etapas
      const { error: etapasError } = await supabase
        .from('etapas_estudo')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Excluir todas
      
      if (etapasError) throw etapasError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas'] });
      queryClient.invalidateQueries({ queryKey: ['aulas_diario'] });
      queryClient.invalidateQueries({ queryKey: ['presenca_participacao'] });
      toast({
        title: 'Sucesso',
        description: 'Todos os dados de teste foram excluídos!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: `Erro ao limpar dados: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook para obter turmas disponíveis
export function useTurmasDisponiveis() {
  return useQuery({
    queryKey: ['turmas_disponiveis'],
    queryFn: async () => {
      // Buscar turmas distintas que existem no sistema
      const { data, error } = await supabase
        .from('profiles')
        .select('turma')
        .eq('user_type', 'aluno')
        .not('turma', 'is', null);

      if (error) throw error;

      // Turmas dinâmicas encontradas
      const turmasEncontradas = [...new Set(data.map(item => item.turma))];

      // Turmas fixas no formato normalizado (A-H, VISITANTE)
      const turmasFixas = [...TODAS_TURMAS];

      // Combinar turmas fixas com as encontradas, removendo duplicatas
      const todasTurmasLetras = [...new Set([...turmasFixas, ...turmasEncontradas])];

      // Retornar no formato { codigo: "A", nome: "A" }
      const turmasFormatadas = todasTurmasLetras.map(letra => ({
        codigo: letra,
        nome: letra // Apenas a letra (A, B, C, D, E ou VISITANTE)
      }));

      // Ordenar: A-E primeiro, depois VISITANTE
      return turmasFormatadas.sort((a, b) => {
        if (a.codigo === 'VISITANTE') return 1;
        if (b.codigo === 'VISITANTE') return -1;
        return a.codigo.localeCompare(b.codigo);
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}