import { useState, useEffect, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, parseISO, isToday, isBefore, startOfDay, addMonths, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDays, Clock, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { computeSimuladoStatus } from '@/utils/simuladoStatus';
import { toast } from 'sonner';

// ── Configurações ─────────────────────────────────────────────────────────────

const TIPO_CORES: Record<string, string> = {
  aula_gravada:         '#FF9800',
  aula_ao_vivo:         '#3b82f6',
  simulado:             '#8b5cf6',
  tema_redacao:         '#f97316',
  exercicio:            '#22c55e',
  producao_guiada:      '#ec4899',
  microaprendizagem:    '#eab308',
  guia_tematico:        '#14b8a6',
  repertorio_orientado: '#06b6d4',
  laboratorio:          '#7C3AED',
  nivelamento:          '#6366f1',
  prazo:                '#ef4444',
  aviso_pedagogico:     '#6b7280',
  atividade_especial:   '#10b981',
};

const TIPO_LABELS: Record<string, string> = {
  aula_gravada:         'Aula Gravada',
  aula_ao_vivo:         'Aula ao Vivo',
  simulado:             'Simulado',
  tema_redacao:         'Tema de Redação',
  exercicio:            'Exercício',
  producao_guiada:      'Produção Guiada',
  microaprendizagem:    'Microaprendizagem',
  guia_tematico:        'Guia Temático',
  repertorio_orientado: 'Repertório Orientado',
  laboratorio:          'Laboratório',
  nivelamento:          'Nivelamento',
  prazo:                'Prazo',
  aviso_pedagogico:     'Aviso Pedagógico',
  atividade_especial:   'Atividade Especial',
};

// Rotas reais verificadas em App.tsx
const ENTIDADE_ACAO: Record<string, { label: string; rota: (id: string) => string }> = {
  aula_ao_vivo:         { label: 'Acessar aula ao vivo',    rota: () => '/aulas-ao-vivo' },
  aula_gravada:         { label: 'Ver aulas',               rota: () => '/aulas' },
  simulado:             { label: 'Ver simulado',            rota: (id) => `/simulados/${id}` },
  tema_redacao:         { label: 'Ver tema',                rota: (id) => `/temas/${id}` },
  exercicio:            { label: 'Ver exercícios',          rota: () => '/exercicios' },
  producao_guiada:      { label: 'Fazer produção guiada',   rota: (id) => `/exercicios/${id}/producao-guiada` },
  microaprendizagem:    { label: 'Acessar microaprendizagem', rota: (id) => `/microaprendizagem/${id}` },
  guia_tematico:        { label: 'Abrir guia',              rota: (id) => `/guia-tematico/${id}` },
  repertorio_orientado: { label: 'Ver repertório',          rota: () => '/repertorio-orientado' },
  laboratorio:          { label: 'Acessar laboratório',     rota: (id) => `/repertorio-orientado/laboratorio/${id}` },
  lousa:                { label: 'Abrir lousa',             rota: (id) => `/lousa/${id}` },
  diario_online:        { label: 'Abrir diário',            rota: () => '/diario-online' },
};

const COMPETENCIA_LABELS: Record<string, string> = {
  C1: 'C1 — Norma culta',
  C2: 'C2 — Tema',
  C3: 'C3 — Argumentação',
  C4: 'C4 — Coesão',
  C5: 'C5 — Intervenção',
};

const DIAS_SEMANA_CURTO = ['d', 's', 't', 'q', 'q', 's', 's'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Evento {
  id: string;
  titulo: string;
  descricao?: string;
  tipo_evento: string;
  competencia?: string;
  data_evento: string;
  hora_inicio?: string;
  hora_fim?: string;
  cor?: string;
  entidade_tipo?: string;
  entidade_id?: string;
  link_direto?: string;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
}

interface Props {
  turmaCode: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export const CalendarioAtividades = ({ turmaCode }: Props) => {
  const { studentData } = useStudentAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [mesAtual, turmaCode]);

  const fetchEventos = async () => {
    setLoading(true);
    const inicioMes = format(startOfMonth(mesAtual), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(mesAtual), 'yyyy-MM-dd');

    const { data } = await (supabase as any)
      .from('calendario_atividades')
      .select('*')
      .eq('status', 'publicado')
      .eq('ativo', true)
      .gte('data_evento', inicioMes)
      .lte('data_evento', fimMes)
      .order('hora_inicio', { ascending: true, nullsFirst: false });

    const isVisitante = studentData.userType === 'visitante';
    const filtrados = (data || []).filter((e: Evento) => {
      if (isVisitante) return e.permite_visitante === true;
      const turmas = e.turmas_autorizadas || [];
      if (turmas.length === 0 && !e.permite_visitante) return true;
      if (turmas.length > 0) return turmas.some(t => t.toUpperCase() === turmaCode.toUpperCase());
      return false;
    });

    setEventos(filtrados);
    setLoading(false);
  };

  const dias = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) });
  }, [mesAtual]);

  const offsetInicio = getDay(startOfMonth(mesAtual));

  const eventosPorDia = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    eventos.forEach(e => {
      if (!map[e.data_evento]) map[e.data_evento] = [];
      map[e.data_evento].push(e);
    });
    return map;
  }, [eventos]);

  const eventosDodia = useMemo(() => {
    if (!diaSelecionado) return [];
    const key = format(diaSelecionado, 'yyyy-MM-dd');
    return eventosPorDia[key] || [];
  }, [diaSelecionado, eventosPorDia]);

  // Próximos eventos (os 5 próximos a partir de hoje)
  const proximosEventos = useMemo(() => {
    const hoje = startOfDay(new Date());
    return eventos
      .filter(e => !isBefore(parseISO(e.data_evento), hoje))
      .slice(0, 5);
  }, [eventos]);

  const handleDiaClick = (dia: Date) => {
    const key = format(dia, 'yyyy-MM-dd');
    if ((eventosPorDia[key] || []).length === 0) return;
    setDiaSelecionado(dia);
    setModalAberto(true);
  };

  const handleAcao = async (evento: Evento) => {
    setModalAberto(false);

    // Se o evento tem link direto (ex: link_meet da aula ao vivo), abre externamente
    if (evento.link_direto) {
      window.open(evento.link_direto, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!evento.entidade_tipo) return;

    // Tratamento especial para simulados
    if (evento.entidade_tipo === 'simulado' && evento.entidade_id) {
      // Buscar dados do simulado para verificar status
      const { data: simulado } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', evento.entidade_id)
        .single();

      if (!simulado) {
        toast.error('Simulado não encontrado');
        return;
      }

      const status = computeSimuladoStatus(simulado);

      // Se está agendado, apenas mostrar mensagem informativa
      if (status === 'agendado') {
        toast.info('Este simulado ainda não começou. Aguarde o período de participação.');
        return;
      }

      // Verificar se o aluno já enviou redação
      if (studentData.email) {
        const { data: redacao } = await supabase
          .from('redacoes_simulado')
          .select('id')
          .eq('id_simulado', evento.entidade_id)
          .eq('email_aluno', studentData.email)
          .maybeSingle();

        // Se já enviou ou se está encerrado, vai para página de redação corrigida
        if (redacao || status === 'encerrado') {
          navigate(`/simulados/${evento.entidade_id}/redacao-corrigida`);
          return;
        }
      }

      // Se está ativo e não enviou, vai para página de participação
      if (status === 'ativo') {
        navigate(`/simulados/${evento.entidade_id}`);
        return;
      }

      // Se está encerrado e não enviou, mostrar mensagem
      if (status === 'encerrado') {
        toast.warning('Este simulado já foi encerrado');
        return;
      }
    }

    // Para outros tipos de evento, usar rota padrão
    const config = ENTIDADE_ACAO[evento.entidade_tipo];
    if (!config) return;
    navigate(config.rota(evento.entidade_id || ''));
  };

  const temEventos = eventos.length > 0;

  return (
    <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg pb-4">
        <CardTitle className="flex items-center gap-3 text-primary">
          <div className="p-2 bg-gradient-to-r from-primary to-secondary rounded-lg">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Calendário de Atividades</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* Navegação de mês */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMesAtual(m => subMonths(m, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h3 className="font-semibold text-gray-800 text-base">
            {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </h3>
          <button
            onClick={() => setMesAtual(m => addMonths(m, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Carregando calendário...</div>
        ) : (
          <>
            {/* Grade do calendário */}
            <div className="rounded-xl border overflow-hidden">
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {(isMobile ? DIAS_SEMANA_CURTO : DIAS_SEMANA).map((d, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Células */}
              <div className="grid grid-cols-7">
                {Array.from({ length: offsetInicio }).map((_, i) => (
                  <div key={`e-${i}`} className="min-h-[52px] sm:min-h-[72px] bg-gray-50/60 border-r border-b" />
                ))}

                {dias.map(dia => {
                  const key = format(dia, 'yyyy-MM-dd');
                  const diaEvs = eventosPorDia[key] || [];
                  const temEvento = diaEvs.length > 0;
                  const hoje = isToday(dia);
                  const passado = isBefore(dia, startOfDay(new Date()));

                  return (
                    <div
                      key={key}
                      onClick={() => handleDiaClick(dia)}
                      className={cn(
                        'min-h-[52px] sm:min-h-[72px] border-r border-b p-1 transition-colors relative',
                        temEvento && 'cursor-pointer hover:bg-purple-50',
                        hoje && 'bg-purple-50/50',
                        passado && !hoje && 'bg-gray-50/40'
                      )}
                    >
                      {/* Número do dia */}
                      <div className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
                        hoje ? 'bg-[#662F96] text-white' : passado ? 'text-gray-400' : 'text-gray-700'
                      )}>
                        {format(dia, 'd')}
                      </div>

                      {/* Indicadores de eventos */}
                      {diaEvs.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5 justify-start px-0.5">
                          {/* Desktop: mostrar até 2 mini-etiquetas */}
                          <div className="hidden sm:flex flex-col gap-0.5 w-full">
                            {diaEvs.slice(0, 2).map(e => {
                              const cor = e.cor || TIPO_CORES[e.tipo_evento] || '#6b7280';
                              return (
                                <div
                                  key={e.id}
                                  className="text-white text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                                  style={{ backgroundColor: cor }}
                                >
                                  {e.titulo}
                                </div>
                              );
                            })}
                            {diaEvs.length > 2 && (
                              <span className="text-[10px] text-gray-400">+{diaEvs.length - 2}</span>
                            )}
                          </div>

                          {/* Mobile: bolinhas coloridas */}
                          <div className="flex sm:hidden gap-0.5 flex-wrap mt-0.5">
                            {diaEvs.slice(0, 3).map((e, idx) => {
                              const cor = e.cor || TIPO_CORES[e.tipo_evento] || '#6b7280';
                              return (
                                <div
                                  key={idx}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: cor }}
                                />
                              );
                            })}
                            {diaEvs.length > 3 && (
                              <span className="text-[9px] text-gray-400">+{diaEvs.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Próximos eventos (visível apenas no mobile abaixo da grade) */}
            {proximosEventos.length > 0 && (
              <div className="mt-4 sm:hidden">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Próximas atividades</h4>
                <div className="space-y-2">
                  {proximosEventos.map(e => {
                    const cor = e.cor || TIPO_CORES[e.tipo_evento] || '#6b7280';
                    return (
                      <button
                        key={e.id}
                        onClick={() => {
                          setDiaSelecionado(parseISO(e.data_evento));
                          setModalAberto(true);
                        }}
                        className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{e.titulo}</p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(e.data_evento), "dd 'de' MMMM", { locale: ptBR })}
                            {e.hora_inicio && ` — ${e.hora_inicio.slice(0, 5)}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!temEventos && (
              <p className="text-center text-sm text-gray-400 mt-4">
                Nenhuma atividade programada para este mês.
              </p>
            )}
          </>
        )}
      </CardContent>

      {/* Modal de detalhes do dia */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3F0077]">
              <CalendarDays className="w-5 h-5" />
              {diaSelecionado && format(diaSelecionado, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {eventosDodia.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade neste dia.</p>
            ) : (
              eventosDodia.map(evento => {
                const cor = evento.cor || TIPO_CORES[evento.tipo_evento] || '#6b7280';
                const acaoConfig = evento.entidade_tipo ? ENTIDADE_ACAO[evento.entidade_tipo] : null;

                return (
                  <div key={evento.id} className="rounded-xl border overflow-hidden">
                    {/* Cabeçalho colorido */}
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: `${cor}18` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }} />
                        <Badge className="text-white text-xs" style={{ backgroundColor: cor }}>
                          {TIPO_LABELS[evento.tipo_evento] || evento.tipo_evento}
                        </Badge>
                        {evento.competencia && (
                          <Badge variant="outline" className="text-xs">
                            {COMPETENCIA_LABELS[evento.competencia] || evento.competencia}
                          </Badge>
                        )}
                      </div>
                      {(evento.hora_inicio) && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {evento.hora_inicio.slice(0, 5)}
                          {evento.hora_fim && `–${evento.hora_fim.slice(0, 5)}`}
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="px-4 py-3 space-y-2">
                      <p className="font-semibold text-gray-800">{evento.titulo}</p>
                      {evento.descricao && (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {evento.descricao}
                        </p>
                      )}

                      {/* Botão de ação */}
                      {(acaoConfig || evento.link_direto) && (
                        <Button
                          size="sm"
                          className="mt-2 text-white"
                          style={{ backgroundColor: cor }}
                          onClick={() => handleAcao(evento)}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          {evento.link_direto && evento.entidade_tipo === 'aula_ao_vivo'
                            ? 'Entrar na aula'
                            : acaoConfig?.label}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
