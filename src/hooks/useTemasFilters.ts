import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { textIncludes, getUniqueEixos } from '@/utils/textUtils';
import { useDebounce } from '@/hooks/useDebounce';

export interface Tema {
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
}

export const useTemasFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados dos filtros
  const [fraseFilter, setFraseFilter] = useState(searchParams.get('q') || '');
  const [selectedEixos, setSelectedEixos] = useState<string[]>(
    searchParams.get('eixos')?.split(',').filter(Boolean) || []
  );
  
  // Debounce para a busca
  const debouncedFraseFilter = useDebounce(fraseFilter, 400);

  // Buscar todos os temas publicados
  const { data: allTemas, isLoading, error } = useQuery({
    queryKey: ['temas-student-all'],
    queryFn: async (): Promise<Tema[]> => {
      try {
        const { data, error } = await supabase
          .from('temas')
          .select('*')
          .eq('status', 'publicado') // Apenas temas publicados para alunos
          .order('publicado_em', { ascending: false, nullsFirst: false })
          .order('criado_em', { ascending: false, nullsFirst: false });

        if (error) throw error;

        return (data || []).map((t: any) => ({
          ...t,
          frase_tematica: t.frase_tematica || 'Tema sem título',
        }));
      } catch (e) {
        console.error('Erro ao buscar temas:', e);
        return [];
      }
    },
  });

  // Lista única de eixos para o dropdown
  const uniqueEixos = useMemo(() => {
    if (!allTemas) return [];
    return getUniqueEixos(allTemas.map(t => ({ eixo_tematico: t.eixo_tematico })));
  }, [allTemas]);

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

    // Filtro por eixos (lógica OR)
    if (selectedEixos.length > 0) {
      filtered = filtered.filter(tema => {
        if (!tema.eixo_tematico) return false;
        
        return selectedEixos.some(eixoSelecionado => 
          textIncludes(tema.eixo_tematico || '', eixoSelecionado)
        );
      });
    }

    return filtered;
  }, [allTemas, debouncedFraseFilter, selectedEixos]);

  // Sincronizar filtros com URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedFraseFilter.trim()) {
      params.set('q', debouncedFraseFilter.trim());
    }
    
    if (selectedEixos.length > 0) {
      params.set('eixos', selectedEixos.join(','));
    }
    
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [debouncedFraseFilter, selectedEixos, searchParams, setSearchParams]);

  // Handlers
  const updateFraseFilter = useCallback((value: string) => {
    setFraseFilter(value);
  }, []);

  const updateSelectedEixos = useCallback((eixos: string[]) => {
    setSelectedEixos(eixos);
  }, []);

  const clearFilters = useCallback(() => {
    setFraseFilter('');
    setSelectedEixos([]);
  }, []);

  const hasActiveFilters = debouncedFraseFilter.trim() || selectedEixos.length > 0;

  return {
    // Dados
    temas: filteredTemas,
    isLoading,
    error,
    
    // Filtros
    fraseFilter,
    selectedEixos,
    uniqueEixos,
    fraseSuggestions,
    hasActiveFilters,
    
    // Handlers
    updateFraseFilter,
    updateSelectedEixos,
    clearFilters,
  };
};