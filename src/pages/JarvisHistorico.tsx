import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Clock, MessageSquare, BookOpen, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentHeader } from '@/components/StudentHeader';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useJarvisSessoes, type JarvisSessao } from '@/hooks/useJarvisSessoes';
import { JarvisIcon } from '@/components/icons/JarvisIcon';
import { cn } from '@/lib/utils';

const NIVEL_COR: Record<string, string> = {
  verde:    'text-green-700 bg-green-50 border-green-200',
  amarelo:  'text-yellow-700 bg-yellow-50 border-yellow-200',
  vermelho: 'text-red-700 bg-red-50 border-red-200',
};
const NIVEL_EMOJI: Record<string, string> = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' };

const SUBTAB_LABEL: Record<string, string> = {
  introducao:    'Introdução',
  desenvolvimento: 'Desenvolvimento',
  conclusao:     'Conclusão',
  analisar:      'Analisar Texto',
  melhorar:      'Melhorar Texto',
  repertorio:    'Repertório',
  gramatica:     'Gramática',
};

function SessaoCard({ sessao }: { sessao: JarvisSessao }) {
  const [expandida, setExpandida] = useState(false);

  const subtabLabel = sessao.subtab_nome
    ? (SUBTAB_LABEL[sessao.subtab_nome] ?? sessao.subtab_nome)
    : 'Modo Conversacional';

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpandida(v => !v)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <div className="w-5 h-5"><JarvisIcon /></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{subtabLabel}</span>
            <span className="text-xs text-slate-400">
              {format(new Date(sessao.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          {sessao.resumo && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{sessao.resumo}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {sessao.duracao_minutos > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3" /> {sessao.duracao_minutos} min
              </span>
            )}
            {sessao.total_mensagens > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <MessageSquare className="w-3 h-3" /> {sessao.total_mensagens} mensagens
              </span>
            )}
            {sessao.habilidades.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <BookOpen className="w-3 h-3" /> {sessao.habilidades.length} habilidades
              </span>
            )}
          </div>
        </div>
        {expandida ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
      </button>

      {/* Conteúdo expandido */}
      {expandida && (
        <div className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4">

          {/* Habilidades */}
          {sessao.habilidades.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Habilidades trabalhadas</p>
              <div className="flex flex-wrap gap-1.5">
                {sessao.habilidades.map((h, i) => (
                  <span key={i} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', NIVEL_COR[h.nivel])}>
                    {NIVEL_EMOJI[h.nivel]} {h.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dificuldades */}
          {sessao.dificuldades.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Dificuldades identificadas</p>
              <ul className="space-y-1">
                {sessao.dificuldades.map((d, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-300 flex-shrink-0">•</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Próximos passos */}
          {sessao.proximos_passos.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Próximos passos</p>
              <ul className="space-y-1">
                {sessao.proximos_passos.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">→</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function JarvisHistorico() {
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const email = studentData.email ?? '';
  const { sessoes, loading } = useJarvisSessoes(email);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <StudentHeader />
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">

        {/* Back + título */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/jarvis/tutor')} className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Histórico de Sessões</h1>
            <p className="text-sm text-slate-400">Suas sessões de estudo com o Tutor Jarvis</p>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : sessoes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8"><JarvisIcon /></div>
            </div>
            <p className="text-slate-600 font-medium">Nenhuma sessão registrada ainda</p>
            <p className="text-slate-400 text-sm mt-1">Encerre uma sessão com o Tutor Jarvis para ver o histórico aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessoes.map(s => <SessaoCard key={s.id} sessao={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
