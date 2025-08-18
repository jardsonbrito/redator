import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { textIncludes, extractEixos, getUniqueEixos } from '@/utils/textUtils';
import { useDebounce } from '@/hooks/useDebounce';

export interface RedacaoExemplar {
  id: string;
  frase_tematica: string;
  eixo_tematico?: string;
  conteudo: string;
  data_envio: string;
  nota_total: number;
  pdf_url?: string;
  dica_de_escrita?: string;
}

export const useRedacoesExemplarFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados dos filtros
  const [fraseFilter, setFraseFilter] = useState(searchParams.get('q') || '');
  const [selectedEixos, setSelectedEixos] = useState<string[]>(
    searchParams.get('eixos')?.split(',').filter(Boolean) || []
  );
  
  // Debounce para a busca
  const debouncedFraseFilter = useDebounce(fraseFilter, 400);

  // Buscar todas as redações
  const { data: allRedacoes, isLoading, error } = useQuery({
    queryKey: ['redacoes-exemplares-all'],
    queryFn: async (): Promise<RedacaoExemplar[]> => {
      try {
        const { data, error } = await supabase
          .from('redacoes')
          .select('id, frase_tematica, eixo_tematico, conteudo, data_envio, nota_total, pdf_url, dica_de_escrita')
          .order('data_envio', { ascending: false }); // Ordenação mais recente primeiro

        if (error) throw error;

        return (data || []).map((r) => ({
          ...r,
          frase_tematica: r.frase_tematica || 'Redação Exemplar',
        }));
      } catch (e) {
        console.error('Erro ao buscar redações exemplares:', e);
        return [];
      }
    },
  });

  // Lista única de eixos para o dropdown
  const uniqueEixos = useMemo(() => {
    if (!allRedacoes) return [];
    return getUniqueEixos(allRedacoes);
  }, [allRedacoes]);

  // Lista de sugestões para autocomplete
  const fraseSuggestions = useMemo(() => {
    if (!allRedacoes || !debouncedFraseFilter.trim()) return [];
    
    const searchTerm = debouncedFraseFilter.trim();
    return allRedacoes
      .map(r => r.frase_tematica)
      .filter(frase => textIncludes(frase, searchTerm))
      .slice(0, 10); // Máximo 10 sugestões
  }, [allRedacoes, debouncedFraseFilter]);

  // Filtrar redações baseado nos filtros ativos
  const filteredRedacoes = useMemo(() => {
    if (!allRedacoes) return [];

    let filtered = [...allRedacoes];

    // Filtro por frase temática
    if (debouncedFraseFilter.trim()) {
      const searchTerm = debouncedFraseFilter.trim();
      filtered = filtered.filter(redacao => 
        textIncludes(redacao.frase_tematica, searchTerm)
      );
    }

    // Filtro por eixos (lógica OR)
    if (selectedEixos.length > 0) {
      filtered = filtered.filter(redacao => {
        if (!redacao.eixo_tematico) return false;
        
        const eixosRedacao = extractEixos(redacao.eixo_tematico);
        return selectedEixos.some(eixoSelecionado => 
          eixosRedacao.some(eixoRedacao => 
            textIncludes(eixoRedacao, eixoSelecionado)
          )
        );
      });
    }

    return filtered;
  }, [allRedacoes, debouncedFraseFilter, selectedEixos]);

  // Normalizar redações para formato esperado pelo componente
  const redacoesExemplares = useMemo(() => {
    return filteredRedacoes.map(r => ({
      ...r,
      texto: r.conteudo,
      imagem_url: r.pdf_url,
    }));
  }, [filteredRedacoes]);

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
    redacoesExemplares,
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