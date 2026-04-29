import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, BookOpen, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'aluno' | 'tema' | 'funcionalidade';
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
} as const;

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
        const found: SearchResult[] = [];

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
          placeholder="Buscar aluno, tema, funcionalidade..."
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
