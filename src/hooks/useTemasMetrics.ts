import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemaDetalhado {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  status: string;
  published_at: string | null;
}

export interface EixoMetrics {
  eixo: string;
  total: number;
  publicados: number;
  rascunhos: number;
  percentual: number;
}

export interface TemasMetricsTotais {
  total_temas: number;
  total_publicados: number;
  total_rascunhos: number;
  total_eixos: number;
  media_por_eixo: number;
}

export interface IEE {
  valor: number;
  classificacao: string;
  descricao: string;
}

export interface UltimoTema {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  published_at: string;
}

export interface TemasMetricsData {
  eixos: EixoMetrics[];
  totais: TemasMetricsTotais;
  iee: IEE;
  ultimosTemas: UltimoTema[];
  timestamp: string;
}

// Normaliza o eixo para exibição consistente
function normalizeEixo(eixo: string | null): string {
  if (!eixo || eixo.trim() === '') return 'Sem Eixo';
  const normalized = eixo.trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Calcula o Índice de Equilíbrio de Eixos
function calcularIEE(valores: number[]): IEE {
  if (valores.length === 0) {
    return { valor: 0, classificacao: 'desequilibrado', descricao: 'Sem dados para análise' };
  }
  if (valores.length === 1) {
    return { valor: 1, classificacao: 'equilibrado', descricao: 'Apenas um eixo presente' };
  }
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  if (media === 0) {
    return { valor: 0, classificacao: 'desequilibrado', descricao: 'Nenhum tema cadastrado' };
  }
  const variancia = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length;
  const desvioPadrao = Math.sqrt(variancia);
  const coeficienteVariacao = desvioPadrao / media;
  const iee = Math.max(0, Math.min(1, 1 - coeficienteVariacao));
  const ieeArredondado = Math.round(iee * 100) / 100;

  if (ieeArredondado >= 0.7) {
    return { valor: ieeArredondado, classificacao: 'equilibrado', descricao: 'Distribuição equilibrada entre os eixos temáticos' };
  } else if (ieeArredondado >= 0.4) {
    return { valor: ieeArredondado, classificacao: 'moderado', descricao: 'Distribuição moderada - considere diversificar' };
  } else {
    return { valor: ieeArredondado, classificacao: 'desequilibrado', descricao: 'Distribuição concentrada - diversifique os eixos' };
  }
}

// Busca métricas diretamente do Supabase (sem Edge Function)
async function fetchTemasMetrics(): Promise<TemasMetricsData> {
  const { data: temas, error } = await supabase
    .from('temas')
    .select('id, frase_tematica, eixo_tematico, status, published_at')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Erro ao buscar temas:', error);
    throw new Error(error.message || 'Erro ao buscar temas');
  }

  // Se não há temas, retorna dados vazios
  if (!temas || temas.length === 0) {
    return {
      eixos: [],
      totais: { total_temas: 0, total_publicados: 0, total_rascunhos: 0, total_eixos: 0, media_por_eixo: 0 },
      iee: { valor: 0, classificacao: 'desequilibrado', descricao: 'Nenhum tema cadastrado' },
      ultimosTemas: [],
      timestamp: new Date().toISOString()
    };
  }

  // Agrupar por eixo
  const eixosMap: Record<string, { total: number; publicados: number; rascunhos: number }> = {};

  for (const tema of temas) {
    const eixoNormalizado = normalizeEixo(tema.eixo_tematico);
    if (!eixosMap[eixoNormalizado]) {
      eixosMap[eixoNormalizado] = { total: 0, publicados: 0, rascunhos: 0 };
    }
    eixosMap[eixoNormalizado].total++;
    if (tema.status === 'publicado') {
      eixosMap[eixoNormalizado].publicados++;
    } else {
      eixosMap[eixoNormalizado].rascunhos++;
    }
  }

  // Calcular totais
  const totalTemas = temas.length;
  const totalPublicados = temas.filter(t => t.status === 'publicado').length;
  const totalRascunhos = totalTemas - totalPublicados;
  const eixosKeys = Object.keys(eixosMap);
  const totalEixos = eixosKeys.length;
  const mediaPorEixo = totalEixos > 0 ? Math.round((totalTemas / totalEixos) * 10) / 10 : 0;

  // Converter para array ordenado
  const eixosArray: EixoMetrics[] = eixosKeys.map(eixo => {
    const stats = eixosMap[eixo];
    return {
      eixo,
      total: stats.total,
      publicados: stats.publicados,
      rascunhos: stats.rascunhos,
      percentual: Math.round((stats.total / totalTemas) * 1000) / 10
    };
  }).sort((a, b) => b.total - a.total);

  // Calcular IEE
  const iee = calcularIEE(eixosArray.map(e => e.total));

  // Últimos 10 temas publicados
  const ultimosTemas: UltimoTema[] = temas
    .filter(t => t.status === 'publicado' && t.published_at)
    .slice(0, 10)
    .map(t => ({
      id: t.id,
      frase_tematica: t.frase_tematica || '',
      eixo_tematico: normalizeEixo(t.eixo_tematico),
      published_at: t.published_at!
    }));

  return {
    eixos: eixosArray,
    totais: {
      total_temas: totalTemas,
      total_publicados: totalPublicados,
      total_rascunhos: totalRascunhos,
      total_eixos: totalEixos,
      media_por_eixo: mediaPorEixo
    },
    iee,
    ultimosTemas,
    timestamp: new Date().toISOString()
  };
}

export function useTemasMetrics() {
  return useQuery({
    queryKey: ['temas-metrics'],
    queryFn: fetchTemasMetrics,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Normaliza o eixo para busca no banco
function normalizeEixoForQuery(eixo: string): string {
  if (eixo === 'Sem Eixo') return '';
  return eixo.toLowerCase();
}

// Busca temas por eixo diretamente do Supabase
export async function fetchTemasByEixo(eixo: string): Promise<TemaDetalhado[]> {
  const normalizedEixo = normalizeEixoForQuery(eixo);

  let query = supabase
    .from('temas')
    .select('id, frase_tematica, eixo_tematico, status, published_at')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (normalizedEixo === '') {
    query = query.or('eixo_tematico.is.null,eixo_tematico.eq.');
  } else {
    query = query.ilike('eixo_tematico', normalizedEixo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar temas por eixo:', error);
    throw new Error(error.message);
  }

  return (data || []).map(t => ({
    id: t.id,
    frase_tematica: t.frase_tematica || '',
    eixo_tematico: t.eixo_tematico || 'Sem Eixo',
    status: t.status || 'rascunho',
    published_at: t.published_at
  }));
}

// Hook para buscar temas de um eixo específico
export function useEixoTemas(eixo: string | null) {
  return useQuery({
    queryKey: ['eixo-temas', eixo],
    queryFn: () => fetchTemasByEixo(eixo!),
    enabled: !!eixo,
    staleTime: 1000 * 60 * 2,
  });
}
