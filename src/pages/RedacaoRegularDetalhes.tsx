import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, Award } from "lucide-react";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

// Interface para representar uma redação regular
interface RedacaoRegular {
  id: string;
  frase_tematica: string;
  redacao_texto: string;
  redacao_manuscrita_url?: string | null;
  data_envio: string;
  nome_aluno: string;
  email_aluno: string;
  tipo_envio: string;
  status: string;
  turma: string;
  corretor?: string;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  nota_total?: number | null;
  comentario_c1_corretor_1?: string | null;
  comentario_c2_corretor_1?: string | null;
  comentario_c3_corretor_1?: string | null;
  comentario_c4_corretor_1?: string | null;
  comentario_c5_corretor_1?: string | null;
  elogios_pontos_atencao_corretor_1?: string | null;
  correcao_arquivo_url_corretor_1?: string | null;
  audio_url?: string | null;
  audio_url_corretor_1?: string | null;
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
  corrigida: boolean;
  data_correcao?: string | null;
  created_at?: string;
  observacoes_coordenacao?: string;
}

const RedacaoRegularDetalhes = () => {
  const { redacaoId } = useParams();
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { setBreadcrumbs, setPageTitle } = useNavigationContext();

  // Query para buscar a redação específica
  const { data: redacao, isLoading, error } = useQuery({
    queryKey: ['redacao-regular-detalhes', redacaoId, studentData.email],
    queryFn: async () => {
      if (!redacaoId || !studentData.email) {
        throw new Error('ID da redação ou email não fornecido');
      }

      // Buscar a redação regular
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select(`
          *,
          corretor1:corretores!corretor_id_1(id, nome_completo),
          corretor2:corretores!corretor_id_2(id, nome_completo)
        `)
        .eq('id', redacaoId)
        .ilike('email_aluno', studentData.email.toLowerCase().trim())
        .single();

      if (error) {
        console.error('Erro ao buscar redação regular:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Redação não encontrada');
      }

      // Determinar nome do corretor
      let nomeCorretor = null;
      if (data.corretor_id_1 && data.corretor1) {
        nomeCorretor = data.corretor1.nome_completo;
      } else if (data.corretor_id_2 && data.corretor2) {
        nomeCorretor = data.corretor2.nome_completo;
      }

      // Processar a redação para o formato esperado
      const redacaoProcessada: RedacaoRegular = {
        ...data,
        redacao_texto: data.redacao_texto || '',
        tipo_envio: data.tipo_envio || 'regular',
        corrigida: data.status === 'corrigida' || data.status === 'corrigido' || data.corrigida,
        status: data.status || 'aguardando',
        corretor: nomeCorretor,
        created_at: data.data_envio
      };

      return redacaoProcessada;
    },
    enabled: !!redacaoId && !!studentData.email
  });

  // Configurar breadcrumbs e título
  useEffect(() => {
    if (redacao) {
      setBreadcrumbs([
        { label: 'Início', href: '/app' },
        { label: 'Minhas Redações', href: '/minhas-redacoes' },
        {
          label: redacao.frase_tematica.length > 50
            ? `${redacao.frase_tematica.substring(0, 50)}...`
            : redacao.frase_tematica
        }
      ]);
      setPageTitle(`${redacao.frase_tematica} - Detalhes`);
    }
  }, [redacao, setBreadcrumbs, setPageTitle]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
            <StudentHeader pageTitle="Carregando..." />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">Carregando sua redação...</div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error || !redacao) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
            <StudentHeader pageTitle="Redação não encontrada" />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Redação não encontrada
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Não foi possível encontrar esta redação ou você não tem permissão para visualizá-la.
                  </p>
                  <Button onClick={() => navigate('/minhas-redacoes')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Minhas Redações
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
          <StudentHeader pageTitle={redacao.frase_tematica || "Redação"} />

          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Navegação mínima */}
            <div className="mb-6">
              <Button onClick={() => navigate('/minhas-redacoes')} variant="outline" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Minhas Redações
              </Button>
            </div>

            {/* Exibir a redação completa */}
            <RedacaoEnviadaCard
              key={`redacao-${redacao.id}`}
              redacao={redacao}
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default RedacaoRegularDetalhes;