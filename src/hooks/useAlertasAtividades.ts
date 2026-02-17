import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TipoAlertaAula = 'aula_agendada' | 'aula_hoje' | 'aula_ao_vivo';

export interface AlertaAtividade {
  tipo: TipoAlertaAula | 'exercicio' | 'lousa' | 'tema';
  id: string;
  titulo: string;
  horario?: string;
  data?: string;
  path: string;
  prioridade: number; // 1 = mais urgente
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

      // Função para verificar acesso à turma
      const temAcessoTurma = (turmasAutorizadas: string[], permiteVisitante: boolean) => {
        return (
          (isVisitante && permiteVisitante) ||
          (!isVisitante && (
            turmasAutorizadas.includes(turmaNormalizada) ||
            turmasAutorizadas.includes(`TURMA ${turmaNormalizada}`) ||
            turmasAutorizadas.includes('Todas') ||
            turmasAutorizadas.includes('TODAS')
          ))
        );
      };

      // ========================================
      // 1. AULAS AO VIVO - Três cenários
      // ========================================
      try {
        // Buscar todas as aulas ao vivo ativas (futuras e de hoje)
        const { data: aulasVirtuais } = await supabase
          .from('aulas_virtuais')
          .select('id, titulo, data_aula, horario_inicio, horario_fim, turmas_autorizadas, permite_visitante, criado_em')
          .eq('ativo', true)
          .eq('eh_aula_ao_vivo', true)
          .gte('data_aula', hoje) // Hoje ou futuro
          .order('data_aula', { ascending: true });

        if (aulasVirtuais) {
          for (const aula of aulasVirtuais) {
            const turmasAutorizadas = aula.turmas_autorizadas || [];
            const permiteVisitante = aula.permite_visitante;

            if (!temAcessoTurma(turmasAutorizadas, permiteVisitante)) {
              continue;
            }

            const dataAula = aula.data_aula;
            const horaInicio = aula.horario_inicio;
            const horaFim = aula.horario_fim;
            const dataFormatada = new Date(dataAula + 'T12:00:00').toLocaleDateString('pt-BR');

            // Cenário 1: Aula acontecendo AGORA (prioridade máxima)
            if (dataAula === hoje && horaAtual >= horaInicio && horaAtual <= horaFim) {
              alertas.push({
                tipo: 'aula_ao_vivo',
                id: aula.id,
                titulo: aula.titulo,
                horario: `${horaInicio.slice(0, 5)} - ${horaFim.slice(0, 5)}`,
                path: '/aulas-ao-vivo',
                prioridade: 1
              });
            }
            // Cenário 2: Aula é HOJE (mas ainda não começou ou já terminou)
            else if (dataAula === hoje) {
              alertas.push({
                tipo: 'aula_hoje',
                id: aula.id,
                titulo: aula.titulo,
                horario: `${horaInicio.slice(0, 5)} - ${horaFim.slice(0, 5)}`,
                path: '/aulas-ao-vivo',
                prioridade: 2
              });
            }
            // Cenário 3: Aula AGENDADA para o futuro
            else if (dataAula > hoje) {
              alertas.push({
                tipo: 'aula_agendada',
                id: aula.id,
                titulo: aula.titulo,
                data: dataFormatada,
                horario: `${horaInicio.slice(0, 5)} - ${horaFim.slice(0, 5)}`,
                path: '/aulas-ao-vivo',
                prioridade: 3
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar aulas ao vivo:', error);
      }

      // ========================================
      // 2. EXERCÍCIOS ATIVOS
      // ========================================
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

              if (temAcessoTurma(turmasAutorizadas, permiteVisitante)) {
                alertas.push({
                  tipo: 'exercicio',
                  id: ex.id,
                  titulo: ex.titulo,
                  path: '/exercicios',
                  prioridade: 4
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar exercícios:', error);
      }

      // ========================================
      // 3. ATIVIDADES DE LOUSA ATIVAS
      // ========================================
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

              if (temAcessoTurma(turmasLousa, permiteVisitante)) {
                alertas.push({
                  tipo: 'lousa',
                  id: lousa.id,
                  titulo: lousa.titulo,
                  path: '/lousa',
                  prioridade: 5
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar lousas:', error);
      }

      // ========================================
      // 4. TEMAS RECÉM-PUBLICADOS (últimos 7 dias)
      // ========================================
      try {
        const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: temas } = await supabase
          .from('temas')
          .select('id, frase_tematica, published_at')
          .eq('status', 'publicado')
          .gte('published_at', seteDiasAtras)
          .order('published_at', { ascending: false });

        if (temas) {
          for (const tema of temas) {
            const dataPublicacao = tema.published_at
              ? new Date(tema.published_at).toLocaleDateString('pt-BR')
              : undefined;

            alertas.push({
              tipo: 'tema',
              id: tema.id,
              titulo: tema.frase_tematica || 'Novo tema disponível',
              data: dataPublicacao,
              path: `/temas/${tema.id}`,
              prioridade: 6
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar temas recentes:', error);
      }

      // Ordenar por prioridade (1 = mais urgente)
      return alertas.sort((a, b) => a.prioridade - b.prioridade);
    },
    enabled: enabled && (!!turma || userType === 'visitante'),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
  });
}
