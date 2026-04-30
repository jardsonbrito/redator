import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ChevronRight } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInteracoesAtivas, useMinhasRespostas, statusInteracao, type Interacao } from '@/hooks/useInteratividade';

type Filtro = 'todas' | 'abertas' | 'respondidas' | 'encerradas';

const STATUS_BADGE = {
  aberta:     { label: 'Aberta',                  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  respondida: { label: 'Participação registrada', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  encerrada:  { label: 'Encerrada',               cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const Interatividade = () => {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const { data: interacoes = [], isLoading } = useInteracoesAtivas();
  const ids = interacoes.map(i => i.id);
  const { data: minhasRespostas = [] } = useMinhasRespostas(ids);

  const jaRespondeu = (id: string) => minhasRespostas.some(r => r.interacao_id === id);

  const filtradas = interacoes.filter(item => {
    const s = statusInteracao(item, jaRespondeu(item.id));
    if (filtro === 'todas') return true;
    if (filtro === 'abertas') return s === 'aberta';
    if (filtro === 'respondidas') return s === 'respondida';
    if (filtro === 'encerradas') return s === 'encerrada';
    return true;
  });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f1eefc] pb-28">
        <StudentHeader />

        <main className="mx-auto max-w-3xl px-4 pt-5">
          {/* Filtros */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(['todas', 'abertas', 'respondidas', 'encerradas'] as Filtro[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  filtro === f
                    ? 'bg-[#4b0082] text-white shadow-sm'
                    : 'bg-white text-slate-600 shadow-sm hover:bg-purple-50'
                }`}
              >
                {{ todas: 'Todas', abertas: 'Abertas', respondidas: 'Respondidas', encerradas: 'Encerradas' }[f]}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-3xl bg-white animate-pulse" />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <ClipboardList className="w-12 h-12 text-purple-200 mb-4" />
              <p className="font-semibold text-slate-600">
                {filtro === 'todas' ? 'Nenhuma interação disponível' : `Nenhuma interação ${filtro}`}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {filtro === 'todas'
                  ? 'Fique de olho! Em breve novas atividades serão publicadas.'
                  : 'Tente outro filtro.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtradas.map(item => (
                <InteracaoCard
                  key={item.id}
                  item={item}
                  respondida={jaRespondeu(item.id)}
                  onClick={() => navigate(`/interatividade/${item.id}`)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

// ── Card ─────────────────────────────────────────────────────────────────────

const InteracaoCard = ({
  item, respondida, onClick,
}: {
  item: Interacao;
  respondida: boolean;
  onClick: () => void;
}) => {
  const status = statusInteracao(item, respondida);
  const badge = STATUS_BADGE[status];

  return (
    <button onClick={onClick} className="w-full text-left group">
      <div className="rounded-3xl bg-white shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="flex items-center gap-4 p-5">
          {/* Ícone */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-[#5b16a3]">
            <ClipboardList className="w-5 h-5" />
          </div>

          {/* Corpo */}
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-950 leading-tight">{item.titulo}</h2>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>

            {item.descricao && (
              <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{item.descricao}</p>
            )}

            {item.encerramento_em && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {new Date(item.encerramento_em) < new Date() ? 'Encerrou' : 'Encerra'}
                  {' '}
                  {format(new Date(item.encerramento_em), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </div>
      </div>
    </button>
  );
};

export default Interatividade;
