
import React from 'react';
import { FileText, Star, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface DesempenhoData {
  totalEnviadas: number;
  maiorNota: number | null;
  menorNota: number | null;
}

export const MeuDesempenho = () => {
  const { studentData } = useStudentAuth();

  const { data: desempenho, isLoading } = useQuery({
    queryKey: ['student-performance', studentData.nomeUsuario, studentData.email],
    queryFn: async (): Promise<DesempenhoData> => {
      if (!studentData.email) {
        return { totalEnviadas: 0, maiorNota: null, menorNota: null };
      }

      // Busca redações enviadas pelo email do aluno
      const { data: redacoes, error } = await supabase
        .from('redacoes_enviadas')
        .select('nota_total')
        .eq('email_aluno', studentData.email?.toLowerCase().trim())
        .not('nota_total', 'is', null);

      if (error) {
        console.error('Erro ao buscar dados de desempenho:', error);
        return { totalEnviadas: 0, maiorNota: null, menorNota: null };
      }

      // Busca total de redações (incluindo as não corrigidas)
      const { count: totalCount } = await supabase
        .from('redacoes_enviadas')
        .select('*', { count: 'exact', head: true })
        .eq('email_aluno', studentData.email?.toLowerCase().trim());

      const notasValidas = redacoes?.map(r => r.nota_total).filter(nota => nota !== null) || [];
      
      return {
        totalEnviadas: totalCount || 0,
        maiorNota: notasValidas.length > 0 ? Math.max(...notasValidas) : null,
        menorNota: notasValidas.length > 0 ? Math.min(...notasValidas) : null
      };
    },
    enabled: !!studentData.email,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 segundos
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const dados = desempenho || { totalEnviadas: 0, maiorNota: null, menorNota: null };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
      <h2 className="text-2xl font-bold text-[#3f0776] mb-6">
        Meu desempenho
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 - Enviadas */}
        <div className="bg-[#f1e4fe] rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#3f0776] rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-[#3f0776] mb-1">
            Enviadas
          </h3>
          <p className="text-3xl font-bold text-[#3f0776]">
            {dados.totalEnviadas}
          </p>
        </div>

        {/* Card 2 - Maior nota */}
        <div className="bg-[#f1e4fe] rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#643293] rounded-2xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-[#3f0776] mb-1">
            Maior nota
          </h3>
          <p className="text-3xl font-bold text-[#3f0776]">
            {dados.maiorNota !== null ? dados.maiorNota : '–'}
          </p>
        </div>

        {/* Card 3 - Menor nota */}
        <div className="bg-[#f1e4fe] rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#3f0776] rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-[#3f0776] mb-1">
            Menor nota
          </h3>
          <p className="text-3xl font-bold text-[#3f0776]">
            {dados.menorNota !== null ? dados.menorNota : '–'}
          </p>
        </div>
      </div>
    </div>
  );
};
