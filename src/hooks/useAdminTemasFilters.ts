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
}

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'publicado', label: 'Publicado (Ativo)' },
  { value: 'inativo', label: 'Inativo' },
];

export const useAdminTemasFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados dos filtros
  const [fraseFilter, setFraseFilter] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'todos');
  
  // Debounce para a busca
  const debouncedFraseFilter = useDebounce(fraseFilter, 400);

  // Buscar todos os temas para admin
  const { data: allTemas, isLoading, error } = useQuery({
    queryKey: ['admin-temas-all'],
    queryFn: async (): Promise<AdminTema[]> => {
      try {
        const { data, error } = await supabase
          .from('temas')
          .select('*')
          .order('publicado_em', { ascending: false, nullsFirst: false })
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false }); // Fallback final para consistência

        if (error) throw error;

        return (data || []).map((t: any) => ({
          ...t,
          frase_tematica: t.frase_tematica || 'Tema sem título',
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

    return filtered;
  }, [allTemas, debouncedFraseFilter, statusFilter]);

  // Sincronizar filtros com URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedFraseFilter.trim()) {
      params.set('q', debouncedFraseFilter.trim());
    }
    
    if (statusFilter && statusFilter !== 'todos') {
      params.set('status', statusFilter);
    }
    
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [debouncedFraseFilter, statusFilter, searchParams, setSearchParams]);

  // Handlers
  const updateFraseFilter = useCallback((value: string) => {
    setFraseFilter(value);
  }, []);

  const updateStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const clearFilters = useCallback(() => {
    setFraseFilter('');
    setStatusFilter('todos');
  }, []);

  const hasActiveFilters = debouncedFraseFilter.trim() || (statusFilter && statusFilter !== 'todos');

  return {
    // Dados
    temas: filteredTemas,
    isLoading,
    error,
    
    // Filtros
    fraseFilter,
    statusFilter,
    statusOptions: STATUS_OPTIONS,
    fraseSuggestions,
    hasActiveFilters,
    
    // Handlers
    updateFraseFilter,
    updateStatusFilter,
    clearFilters,
  };
};