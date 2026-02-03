import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AlertaAtividade {
  tipo: 'aula_ao_vivo' | 'exercicio' | 'lousa';
  id: string;
  titulo: string;
  horario?: string;
  path: string;
}

interface UseAlertasAtividadesProps {
  turma: string | null;
  userType: string;
  enabled?: boolean;
}

export function useAlertasAtividades({ turma, userType, enabled = true }: UseAlertasAtividadesProps) {
  return useQuery({
    queryKey: ['alertas_atividades', turma, userType],
    queryFn: async (): Promise<AlertaAtividade[]> => {
      const alertas: AlertaAtividade[] = [];
      const agora = new Date();
      const hoje = agora.toISOString().split('T')[0];
      const horaAtual = agora.toTimeString().slice(0, 8);

      // Normalizar turma
      const turmaNormalizada = turma?.toUpperCase().replace('TURMA ', '').trim() || '';
      const isVisitante = userType === 'visitante';

      // 1. Buscar aulas ao vivo ativas para hoje
      try {
        let query = supabase
          .from('aulas_virtuais')
          .select('id, titulo, data_aula, horario_inicio, horario_fim')
          .eq('ativo', true)
          .eq('eh_aula_ao_vivo', true)
          .eq('data_aula', hoje)
          .lte('horario_inicio', horaAtual)
          .gte('horario_fim', horaAtual);

        const { data: aulasVirtuais } = await query;

        if (aulasVirtuais) {
          for (const aula of aulasVirtuais) {
            // Verificar se o aluno tem acesso (por turma ou visitante)
            const { data: aulaCompleta } = await supabase
              .from('aulas_virtuais')
              .select('turmas_autorizadas, permite_visitante')
              .eq('id', aula.id)
              .single();

            if (aulaCompleta) {
              const turmasAutorizadas = aulaCompleta.turmas_autorizadas || [];
              const permiteVisitante = aulaCompleta.permite_visitante;

              const temAcesso =
                (isVisitante && permiteVisitante) ||
                (!isVisitante && (
                  turmasAutorizadas.includes(turmaNormalizada) ||
                  turmasAutorizadas.includes(`TURMA ${turmaNormalizada}`) ||
                  turmasAutorizadas.includes('Todas') ||
                  turmasAutorizadas.includes('TODAS')
                ));

              if (temAcesso) {
                alertas.push({
                  tipo: 'aula_ao_vivo',
                  id: aula.id,
                  titulo: aula.titulo,
                  horario: `${aula.horario_inicio.slice(0, 5)} - ${aula.horario_fim.slice(0, 5)}`,
                  path: '/aulas-ao-vivo'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar aulas ao vivo:', error);
      }

      // 2. Buscar exercícios ativos
      try {
        const { data: exercicios } = await supabase
          .from('exercicios')
          .select('id, titulo, data_inicio, hora_inicio, data_fim, hora_fim, turmas_autorizadas, permite_visitante')
          .eq('ativo', true);

        if (exercicios) {
          for (const ex of exercicios) {
            // Verificar se está no período ativo
            const dataInicio = ex.data_inicio || '2000-01-01';
            const dataFim = ex.data_fim || '2099-12-31';
            const horaInicio = ex.hora_inicio || '00:00:00';
            const horaFim = ex.hora_fim || '23:59:59';

            const inicioCompleto = `${dataInicio}T${horaInicio}`;
            const fimCompleto = `${dataFim}T${horaFim}`;
            const agoraISO = agora.toISOString();

            if (agoraISO >= inicioCompleto && agoraISO <= fimCompleto) {
              const turmasAutorizadas = ex.turmas_autorizadas || [];
              const permiteVisitante = ex.permite_visitante;

              const temAcesso =
                (isVisitante && permiteVisitante) ||
                (!isVisitante && (
                  turmasAutorizadas.includes(turmaNormalizada) ||
                  turmasAutorizadas.includes(`TURMA ${turmaNormalizada}`) ||
                  turmasAutorizadas.includes('Todas') ||
                  turmasAutorizadas.includes('TODAS')
                ));

              if (temAcesso) {
                alertas.push({
                  tipo: 'exercicio',
                  id: ex.id,
                  titulo: ex.titulo,
                  path: '/exercicios'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar exercícios:', error);
      }

      // 3. Buscar atividades de lousa ativas
      try {
        const { data: lousas } = await supabase
          .from('lousa')
          .select('id, titulo, inicio_em, fim_em, turmas, permite_visitante')
          .eq('ativo', true)
          .in('status', ['aberta', 'ativa']);

        if (lousas) {
          for (const lousa of lousas) {
            // Verificar se está no período ativo
            const inicioEm = lousa.inicio_em ? new Date(lousa.inicio_em) : new Date('2000-01-01');
            const fimEm = lousa.fim_em ? new Date(lousa.fim_em) : new Date('2099-12-31');

            if (agora >= inicioEm && agora <= fimEm) {
              const turmasLousa = lousa.turmas || [];
              const permiteVisitante = lousa.permite_visitante;

              const temAcesso =
                (isVisitante && permiteVisitante) ||
                (!isVisitante && (
                  turmasLousa.includes(turmaNormalizada) ||
                  turmasLousa.includes(`TURMA ${turmaNormalizada}`) ||
                  turmasLousa.includes('Todas') ||
                  turmasLousa.includes('TODAS')
                ));

              if (temAcesso) {
                alertas.push({
                  tipo: 'lousa',
                  id: lousa.id,
                  titulo: lousa.titulo,
                  path: '/lousa'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar lousas:', error);
      }

      return alertas;
    },
    enabled: enabled && (!!turma || userType === 'visitante'),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
  });
}
