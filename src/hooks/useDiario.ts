import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  EtapaEstudo, 
  AulaDiario, 
  PresencaParticipacao, 
  DiarioEtapa, 
  ResumoTurmaEtapa,
  FormEtapaData,
  FormAulaData
} from '@/types/diario';

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
    staleTime: 5 * 60 * 1000, // 5 minutos
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
        query = query.eq('turma', turma);
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
      // Mapeamento de turmas de aluno para códigos de etapa
      const turmaParaCodigo = (turmaAluno: string): string[] => {
        const mapeamento: { [key: string]: string[] } = {
          'Turma A': ['Turma A', 'LRA2025'],
          'Turma B': ['Turma B', 'LRB2025'],
          'Turma C': ['Turma C', 'LRC2025'],
          'Turma D': ['Turma D', 'LRD2025'],
          'Turma E': ['Turma E', 'LRE2025'],
          'visitante': ['visitante']
        };
        return mapeamento[turmaAluno] || [turmaAluno];
      };

      const codigosTurma = turmaParaCodigo(turma);
      
      // Buscar etapas para qualquer um dos códigos possíveis
      const { data: etapas, error: etapasError } = await supabase
        .from('etapas_estudo')
        .select('*')
        .in('turma', codigosTurma)
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

        // Buscar aulas desta etapa
        const { data: aulas } = await supabase
          .from('aulas_diario')
          .select('id')
          .eq('turma', turma)
          .eq('etapa_id', etapa.id);

        // Buscar presença do aluno nessas aulas
        const aulaIds = aulas?.map(a => a.id) || [];
        let frequenciaData = { total_aulas: 0, aulas_presentes: 0, percentual_frequencia: 0 };
        let participacaoData = { total_aulas: 0, aulas_participou: 0, percentual_participacao: 0 };

        if (aulaIds.length > 0) {
          const { data: presencas } = await supabase
            .from('presenca_participacao_diario')
            .select('presente, participou')
            .eq('aluno_email', alunoEmail)
            .in('aula_id', aulaIds);

          const totalAulas = aulaIds.length;
          const aulasPresentes = presencas?.filter(p => p.presente).length || 0;
          const aulasParticipou = presencas?.filter(p => p.participou).length || 0;

          frequenciaData = {
            total_aulas: totalAulas,
            aulas_presentes: aulasPresentes,
            percentual_frequencia: totalAulas > 0 ? (aulasPresentes / totalAulas) * 100 : 0
          };

          participacaoData = {
            total_aulas: totalAulas,
            aulas_participou: aulasParticipou,
            percentual_participacao: totalAulas > 0 ? (aulasParticipou / totalAulas) * 100 : 0
          };
        }

        // Por enquanto, usar dados mockados até resolver os problemas de RLS/permissões
        const redacoesData = { total_redacoes: 0, nota_media: 0 };
        const simuladosData = { total_simulados: 0, nota_media: 0 };
        const exerciciosData = { total_exercicios: 0 };

        // Calcular média final (pode ser customizada conforme critério da escola)
        const mediaFinal = (
          (frequenciaData.percentual_frequencia * 0.2) +
          (participacaoData.percentual_participacao * 0.2) +
          (redacoesData.nota_media * 0.4) +
          (simuladosData.nota_media * 0.2)
        ) / 10;

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
          media_final: Math.max(0, Math.min(10, mediaFinal * 10)) // Garantir que fica entre 0 e 10
        });
      }
      
      return diarioData;
    },
    enabled: !!alunoEmail && !!turma,
    staleTime: 3 * 60 * 1000, // 3 minutos
  });
}

// Hook para resumo da turma
export function useResumoTurma(turma: string, etapaNumero: number) {
  return useQuery({
    queryKey: ['resumo_turma', turma, etapaNumero],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('obter_resumo_turma_etapa', {
          p_turma: turma,
          p_etapa_numero: etapaNumero
        });
      
      if (error) throw error;
      return data as ResumoTurmaEtapa;
    },
    enabled: !!turma && !!etapaNumero,
    staleTime: 5 * 60 * 1000, // 5 minutos
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
      // Buscar turmas que têm redações enviadas
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('turma')
        .not('turma', 'is', null);
      
      if (error) throw error;
      
      // Turmas dinâmicas encontradas nas redações
      const turmasComRedacoes = [...new Set(data.map(item => item.turma))];
      
      // Turmas fixas que sempre devem aparecer
      const turmasFixas = ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E', 'visitante'];
      
      // Combinar turmas fixas com as encontradas nas redações
      const todasTurmas = [...new Set([...turmasFixas, ...turmasComRedacoes])];
      
      // Mapeamento de códigos para nomes amigáveis
      const turmasMap: { [key: string]: string } = {
        'LRA2025': 'Turma A',
        'LRB2025': 'Turma B', 
        'LRC2025': 'Turma C',
        'LRD2025': 'Turma D',
        'LRE2025': 'Turma E',
        'Turma A': 'Turma A',
        'Turma B': 'Turma B',
        'Turma C': 'Turma C',
        'Turma D': 'Turma D',
        'Turma E': 'Turma E',
        'visitante': 'Visitantes'
      };
      
      // Retornar objetos com código e nome amigável, ordenados
      return todasTurmas.sort().map(codigo => ({
        codigo,
        nome: turmasMap[codigo] || codigo
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}