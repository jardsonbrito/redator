import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { textIncludes } from '@/utils/textUtils';
import { useDebounce } from '@/hooks/useDebounce';

export interface AdminTema {
  id: string;
  frase_tematica: string;
  eixo_tematico?: string;
  status?: string;
  publicado_em?: string;
  updated_at?: string;
  created_at?: string;
  cover_url?: string;
  cover_file_path?: string;
  cover_source?: string;
  needs_media_update?: boolean;
  scheduled_publish_at?: string;
  published_at?: string;
  scheduled_by?: string;
  is_simulado?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'publicado', label: 'Publicado (Ativo)' },
  { value: 'inativo', label: 'Inativo' },
];

const TIPO_OPTIONS = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'simulado', label: 'Somente Simulados' },
  { value: 'regular', label: 'Somente Temas Regulares' },
];

export const useAdminTemasFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados dos filtros
  const [fraseFilter, setFraseFilter] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'todos');
  const [tipoFilter, setTipoFilter] = useState(searchParams.get('tipo') || 'todos');
  
  // Debounce para a busca
  const debouncedFraseFilter = useDebounce(fraseFilter, 400);

  // Buscar todos os temas para admin com informação de simulado
  const { data: allTemas, isLoading, error } = useQuery({
    queryKey: ['admin-temas-all'],
    queryFn: async (): Promise<AdminTema[]> => {
      try {
        // Buscar todos os temas
        const { data: temasData, error: temasError } = await supabase
          .from('temas')
          .select('*')
          .order('publicado_em', { ascending: false, nullsFirst: false })
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false });

        if (temasError) throw temasError;

        // Buscar todas as frases temáticas de simulados
        const { data: simulados, error: simuladosError } = await supabase
          .from('simulados')
          .select('frase_tematica');

        if (simuladosError) throw simuladosError;

        const frasesSimulados = new Set(simulados?.map(s => s.frase_tematica) || []);

        return (temasData || []).map((t: any) => ({
          ...t,
          frase_tematica: t.frase_tematica || 'Tema sem título',
          is_simulado: frasesSimulados.has(t.frase_tematica),
        }));
      } catch (e) {
        console.error('Erro ao buscar temas admin:', e);
        return [];
      }
    },
  });

  // Lista de sugestões para autocomplete
  const fraseSuggestions = useMemo(() => {
    if (!allTemas || !debouncedFraseFilter.trim()) return [];
    
    const searchTerm = debouncedFraseFilter.trim();
    return allTemas
      .map(t => t.frase_tematica)
      .filter(frase => textIncludes(frase, searchTerm))
      .slice(0, 10); // Máximo 10 sugestões
  }, [allTemas, debouncedFraseFilter]);

  // Filtrar temas baseado nos filtros ativos
  const filteredTemas = useMemo(() => {
    if (!allTemas) return [];

    let filtered = [...allTemas];

    // Filtro por frase temática
    if (debouncedFraseFilter.trim()) {
      const searchTerm = debouncedFraseFilter.trim();
      filtered = filtered.filter(tema =>
        textIncludes(tema.frase_tematica, searchTerm)
      );
    }

    // Filtro por status
    if (statusFilter && statusFilter !== 'todos') {
      filtered = filtered.filter(tema => {
        // Lógica para determinar o status efetivo do tema
        const now = new Date();
        const scheduledDate = tema.scheduled_publish_at ? new Date(tema.scheduled_publish_at) : null;

        let efectiveStatus = tema.status || 'rascunho';

        // Se tem agendamento futuro, considerar como 'agendado'
        if (scheduledDate && scheduledDate > now) {
          efectiveStatus = 'agendado';
        }

        return efectiveStatus === statusFilter;
      });
    }

    // Filtro por tipo (simulado ou regular)
    if (tipoFilter && tipoFilter !== 'todos') {
      filtered = filtered.filter(tema => {
        const isSimulado = (tema as any).is_simulado || false;

        if (tipoFilter === 'simulado') {
          return isSimulado;
        } else if (tipoFilter === 'regular') {
          return !isSimulado;
        }

        return true;
      });
    }

    return filtered;
  }, [allTemas, debouncedFraseFilter, statusFilter, tipoFilter]);

  // Sincronizar filtros com URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedFraseFilter.trim()) {
      params.set('q', debouncedFraseFilter.trim());
    }

    if (statusFilter && statusFilter !== 'todos') {
      params.set('status', statusFilter);
    }

    if (tipoFilter && tipoFilter !== 'todos') {
      params.set('tipo', tipoFilter);
    }

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();

    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [debouncedFraseFilter, statusFilter, tipoFilter, searchParams, setSearchParams]);

  // Handlers
  const updateFraseFilter = useCallback((value: string) => {
    setFraseFilter(value);
  }, []);

  const updateStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const updateTipoFilter = useCallback((tipo: string) => {
    setTipoFilter(tipo);
  }, []);

  const clearFilters = useCallback(() => {
    setFraseFilter('');
    setStatusFilter('todos');
    setTipoFilter('todos');
  }, []);

  const hasActiveFilters =
    debouncedFraseFilter.trim() ||
    (statusFilter && statusFilter !== 'todos') ||
    (tipoFilter && tipoFilter !== 'todos');

  return {
    // Dados
    temas: filteredTemas,
    isLoading,
    error,

    // Filtros
    fraseFilter,
    statusFilter,
    tipoFilter,
    statusOptions: STATUS_OPTIONS,
    tipoOptions: TIPO_OPTIONS,
    fraseSuggestions,
    hasActiveFilters,

    // Handlers
    updateFraseFilter,
    updateStatusFilter,
    updateTipoFilter,
    clearFilters,
  };
};