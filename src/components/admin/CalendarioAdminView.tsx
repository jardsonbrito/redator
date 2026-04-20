import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import type { EventoCalendario } from './EventoCalendarioForm';

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
  tema_redacao:         'Tema',
  exercicio:            'Exercício',
  producao_guiada:      'Produção Guiada',
  microaprendizagem:    'Microaprendizagem',
  guia_tematico:        'Guia Temático',
  repertorio_orientado: 'Repertório',
  laboratorio:          'Laboratório',
  nivelamento:          'Nivelamento',
  prazo:                'Prazo',
  aviso_pedagogico:     'Aviso',
  atividade_especial:   'Especial',
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type Evento = EventoCalendario & { criado_em?: string };

interface Props {
  eventos: Evento[];
  mesAtual: Date;
  onMesChange: (d: Date) => void;
  onEventoClick: (evento: Evento) => void;
}

export const CalendarioAdminView = ({ eventos, mesAtual, onMesChange, onEventoClick }: Props) => {
  const dias = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesAtual]);

  const offsetInicio = getDay(startOfMonth(mesAtual));

  const eventosPorDia = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    eventos.forEach(e => {
      const k = e.data_evento;
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [eventos]);

  const navMes = (delta: number) => {
    const d = new Date(mesAtual);
    d.setMonth(d.getMonth() + delta);
    onMesChange(d);
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header do calendário */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
        <button
          onClick={() => navMes(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
        >
          ‹
        </button>
        <h3 className="font-semibold text-gray-800 capitalize">
          {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <button
          onClick={() => navMes(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
        >
          ›
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 border-b">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7">
        {/* Células vazias de offset */}
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] border-r border-b bg-gray-50/50" />
        ))}

        {/* Dias do mês */}
        {dias.map(dia => {
          const key = format(dia, 'yyyy-MM-dd');
          const diaEventos = eventosPorDia[key] || [];
          const hoje = isToday(dia);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[90px] border-r border-b p-1.5 transition-colors',
                hoje && 'bg-purple-50'
              )}
            >
              <div className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1',
                hoje ? 'bg-[#662F96] text-white' : 'text-gray-600'
              )}>
                {format(dia, 'd')}
              </div>

              <div className="space-y-0.5">
                {diaEventos.slice(0, 3).map(e => {
                  const cor = e.cor || TIPO_CORES[e.tipo_evento] || '#6b7280';
                  return (
                    <button
                      key={e.id}
                      onClick={() => onEventoClick(e)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: cor }}
                      title={e.titulo}
                    >
                      {e.titulo}
                    </button>
                  );
                })}
                {diaEventos.length > 3 && (
                  <p className="text-xs text-gray-400 px-1">+{diaEventos.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="px-5 py-3 border-t bg-gray-50 flex flex-wrap gap-3">
        {Object.entries(TIPO_CORES).map(([tipo, cor]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cor }} />
            <span className="text-xs text-gray-500">{TIPO_LABELS[tipo]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
