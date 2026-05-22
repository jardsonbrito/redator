import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, BookOpen, LayoutGrid, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'aluno' | 'tema' | 'funcionalidade' | 'pagina';
  id: string;
  title: string;
  subtitle: string;
}

interface AdminGlobalSearchProps {
  onResultClick?: (type: SearchResult['type'], id: string) => void;
}

const TYPE_CONFIG = {
  aluno:          { icon: Users,       label: 'Aluno',          color: 'text-emerald-600' },
  tema:           { icon: BookOpen,    label: 'Tema',           color: 'text-orange-500'  },
  funcionalidade: { icon: LayoutGrid,  label: 'Funcionalidade', color: 'text-violet-600'  },
  pagina:         { icon: Navigation,  label: 'Página',         color: 'text-blue-600'    },
} as const;

const ADMIN_PAGES: { id: string; title: string; keywords: string[] }[] = [
  { id: 'alunos',              title: 'Alunos',                keywords: ['aluno', 'estudante', 'turma'] },
  { id: 'turmas',              title: 'Turmas',                keywords: ['turma', 'classe', 'grupo'] },
  { id: 'professores',         title: 'Professores',           keywords: ['professor', 'docente'] },
  { id: 'corretores',          title: 'Corretores',            keywords: ['corretor', 'corrector'] },
  { id: 'inbox',               title: 'Inbox',                 keywords: ['inbox', 'mensagem', 'recado', 'notificacao', 'notificação', 'aviso'] },
  { id: 'avisos',              title: 'Avisos',                keywords: ['aviso', 'comunicado', 'notificacao'] },
  { id: 'redacoes-enviadas',   title: 'Redações Enviadas',     keywords: ['redacao', 'redação', 'enviada', 'fila', 'corrigir'] },
  { id: 'temas',               title: 'Temas',                 keywords: ['tema', 'proposta'] },
  { id: 'aulas',               title: 'Aulas Gravadas',        keywords: ['aula', 'gravada', 'video', 'vídeo'] },
  { id: 'salas-virtuais',      title: 'Aulas ao Vivo',         keywords: ['aula', 'vivo', 'sala', 'virtual', 'online'] },
  { id: 'exercicios',          title: 'Exercícios',            keywords: ['exercicio', 'exercício', 'questao', 'questão'] },
  { id: 'simulados',           title: 'Simulados',             keywords: ['simulado', 'prova', 'teste'] },
  { id: 'biblioteca',          title: 'Biblioteca',            keywords: ['biblioteca', 'livro', 'leitura'] },
  { id: 'videos',              title: 'Videoteca',             keywords: ['videoteca', 'video', 'vídeo'] },
  { id: 'lousa',               title: 'Lousa',                 keywords: ['lousa', 'quadro', 'apresentacao'] },
  { id: 'calendario',          title: 'Calendário',            keywords: ['calendario', 'calendário', 'agenda', 'evento'] },
  { id: 'diario',              title: 'Diário Online',         keywords: ['diario', 'diário', 'online'] },
  { id: 'radar',               title: 'Radar',                 keywords: ['radar', 'monitoramento', 'monitorar'] },
  { id: 'jarvis',              title: 'Jarvis (IA)',            keywords: ['jarvis', 'ia', 'inteligencia', 'inteligência'] },
  { id: 'ajuda-rapida',        title: 'Ajuda Rápida',          keywords: ['ajuda', 'rapida', 'rápida', 'suporte', 'chat'] },
  { id: 'gamificacao',         title: 'Gamificação',           keywords: ['gamificacao', 'gamificação', 'pontos', 'ranking'] },
  { id: 'top5',                title: 'Top 5',                 keywords: ['top', 'ranking', 'melhores'] },
  { id: 'guia-tematico',       title: 'Guia Temático',         keywords: ['guia', 'tematico', 'temático'] },
  { id: 'microaprendizagem',   title: 'Microaprendizagem',     keywords: ['micro', 'microaprendizagem', 'aprendizagem'] },
  { id: 'interatividade',      title: 'Interatividade',        keywords: ['interatividade', 'interativo'] },
  { id: 'repertorio-orientado',title: 'Repertório Orientado',  keywords: ['repertorio', 'repertório', 'orientado'] },
  { id: 'laboratorio',         title: 'Laboratório de Repertório', keywords: ['laboratorio', 'laboratório'] },
  { id: 'redacoes',            title: 'Redações Exemplares',   keywords: ['redacao', 'redação', 'exemplar', 'exemplo'] },
  { id: 'redacoes-comentadas', title: 'Redações Comentadas',   keywords: ['redacao', 'redação', 'comentada', 'comentario'] },
  { id: 'plano-estudo',        title: 'Plano de Estudo',       keywords: ['plano', 'estudo', 'cronograma'] },
  { id: 'anotacoes',           title: 'Anotações',             keywords: ['anotacao', 'anotação', 'nota'] },
  { id: 'processo-seletivo',   title: 'Processo Seletivo',     keywords: ['processo', 'seletivo', 'selecao', 'seleção', 'vestibular'] },
  { id: 'exportacao',          title: 'Exportação',            keywords: ['exportacao', 'exportação', 'exportar', 'relatorio', 'relatório'] },
  { id: 'configuracoes',       title: 'Configurações',         keywords: ['configuracao', 'configuração', 'config', 'ajuste'] },
  { id: 'administradores',     title: 'Administradores',       keywords: ['admin', 'administrador', 'gestor'] },
];

function searchPages(q: string): SearchResult[] {
  const term = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ADMIN_PAGES
    .filter(({ title, keywords }) => {
      const t = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return t.includes(term) || keywords.some(k => k.includes(term));
    })
    .slice(0, 4)
    .map(({ id, title }) => ({ type: 'pagina' as const, id, title, subtitle: 'Navegar para a seção' }));
}

export const AdminGlobalSearch = ({ onResultClick }: AdminGlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchTerm = `%${query.trim()}%`;
        const found: SearchResult[] = [...searchPages(query.trim())];

        const [alunosRes, temasRes, funcsRes] = await Promise.all([
          supabase
            .from('alunos')
            .select('id, nome, email, turma')
            .or(`nome.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(4)
            .then((r) => r)
            .catch(() => ({ data: null, error: null })),
          supabase
            .from('temas')
            .select('id, frase_tematica, status')
            .ilike('frase_tematica', searchTerm)
            .limit(4)
            .then((r) => r)
            .catch(() => ({ data: null, error: null })),
          supabase
            .from('funcionalidades')
            .select('id, chave, nome_exibicao')
            .ilike('nome_exibicao', searchTerm)
            .eq('ativo', true)
            .limit(5),
        ]);

        (alunosRes.data || []).forEach((a) => {
          found.push({
            type: 'aluno',
            id: a.id,
            title: a.nome || a.email || 'Aluno',
            subtitle: a.turma ? `Turma: ${a.turma}` : (a.email || ''),
          });
        });

        (temasRes.data || []).forEach((t: any) => {
          found.push({
            type: 'tema',
            id: t.id,
            title: t.frase_tematica || 'Tema',
            subtitle: t.status === 'rascunho' ? 'Rascunho' : 'Publicado',
          });
        });

        (funcsRes.data || []).forEach((f) => {
          found.push({
            type: 'funcionalidade',
            id: (f as { chave: string }).chave,
            title: (f as { nome_exibicao: string }).nome_exibicao,
            subtitle: 'Ir para o módulo',
          });
        });

        setResults(found);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Buscar aluno, página, tema..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 focus:bg-white transition-all placeholder:text-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          {isSearching ? (
            <div className="px-4 py-3 text-sm text-gray-400">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Nenhum resultado encontrado</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {results.map((result) => {
                const cfg = TYPE_CONFIG[result.type];
                const Icon = cfg.icon;
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      onClick={() => {
                        onResultClick?.(result.type, result.id);
                        setIsOpen(false);
                        setQuery('');
                      }}
                    >
                      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', cfg.color)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{result.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {cfg.label} · {result.subtitle}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
