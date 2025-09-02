
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
  
  // Verificar se é visitante
  const userType = localStorage.getItem('userType');
  const isVisitante = userType === 'visitante';

  const { data: desempenho, isLoading } = useQuery({
    queryKey: ['student-performance', studentData.nomeUsuario, studentData.email, userType],
    queryFn: async (): Promise<DesempenhoData> => {
      // Lógica para visitantes
      if (isVisitante) {
        const emailVisitante = studentData.email?.toLowerCase().trim();
        console.log('📊 Buscando desempenho para VISITANTE específico:', emailVisitante);
        
        if (!emailVisitante) {
          return { totalEnviadas: 0, maiorNota: null, menorNota: null };
        }
        
        const { data: redacoesVisitantes, error } = await supabase
          .from('redacoes_enviadas')
          .select('nota_total')
          .eq('turma', 'visitante')
          .ilike('email_aluno', emailVisitante);
          
        if (error) {
          console.error('Erro ao buscar redações do visitante:', error);
          return { totalEnviadas: 0, maiorNota: null, menorNota: null };
        }
        
        const todasNotas = redacoesVisitantes?.map(r => r.nota_total).filter(nota => nota !== null && nota !== undefined) || [];
        
        console.log(`📊 Encontradas ${redacoesVisitantes?.length || 0} redações para o visitante ${emailVisitante}:`, todasNotas);
        
        return {
          totalEnviadas: redacoesVisitantes?.length || 0,
          maiorNota: todasNotas.length > 0 ? Math.max(...todasNotas) : null,
          menorNota: todasNotas.length > 0 ? Math.min(...todasNotas) : null
        };
      }
      
      // Lógica original para alunos
      if (!studentData.email) {
        return { totalEnviadas: 0, maiorNota: null, menorNota: null };
      }

      const emailBusca = studentData.email?.toLowerCase().trim();
      console.log('📊 Buscando desempenho para email:', emailBusca);

      // Usar a nova função para contar redações (excluindo devolvidas)
      const { data: contadorRedacoes, error: errorContador } = await supabase.rpc('count_student_submitted_redacoes', {
        student_email: emailBusca
      });

      if (errorContador) {
        console.error('Erro ao contar redações:', errorContador);
      }

      // Buscar todas as redações para calcular notas (incluindo devolvidas para estatísticas)
      const [redacoesRegulares, redacoesSimulado, redacoesExercicio] = await Promise.all([
        supabase.from('redacoes_enviadas').select('nota_total').ilike('email_aluno', emailBusca),
        supabase.from('redacoes_simulado').select('nota_total').ilike('email_aluno', emailBusca),
        supabase.from('redacoes_exercicio').select('nota_total').ilike('email_aluno', emailBusca)
      ]);

      if (redacoesRegulares.error) {
        console.error('Erro ao buscar redações regulares:', redacoesRegulares.error);
      }
      if (redacoesSimulado.error) {
        console.error('Erro ao buscar redações de simulado:', redacoesSimulado.error);
      }
      if (redacoesExercicio.error) {
        console.error('Erro ao buscar redações de exercício:', redacoesExercicio.error);
      }

      // Combinar todas as notas válidas
      const todasNotas = [
        ...(redacoesRegulares.data || []),
        ...(redacoesSimulado.data || []),
        ...(redacoesExercicio.data || [])
      ].map(r => r.nota_total).filter(nota => nota !== null && nota !== undefined);

      console.log(`📊 Contador de redações enviadas (excluindo devolvidas): ${contadorRedacoes || 0} para ${emailBusca}`);

      return {
        totalEnviadas: contadorRedacoes || 0,
        maiorNota: todasNotas.length > 0 ? Math.max(...todasNotas) : null,
        menorNota: todasNotas.length > 0 ? Math.min(...todasNotas) : null
      };
    },
    enabled: !!studentData.email || isVisitante,
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
