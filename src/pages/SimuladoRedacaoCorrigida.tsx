import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { verificarDivergencia } from "@/utils/simuladoDivergencia";
import { AlertTriangle } from "lucide-react";

// Interface para representar uma redação de simulado
interface RedacaoSimulado {
  id: string;
  frase_tematica: string;
  redacao_texto: string;
  redacao_manuscrita_url?: string | null;
  redacao_imagem_gerada_url?: string | null;
  data_envio: string;
  nome_aluno: string;
  email_aluno: string;
  tipo_envio: string;
  status: string;
  turma: string;
  corretor_numero?: number;
  corretor?: string;
  // Dados específicos do corretor
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  nota_total?: number | null;
  // Comentários pedagógicos
  comentario_c1_corretor_1?: string | null;
  comentario_c2_corretor_1?: string | null;
  comentario_c3_corretor_1?: string | null;
  comentario_c4_corretor_1?: string | null;
  comentario_c5_corretor_1?: string | null;
  elogios_pontos_atencao_corretor_1?: string | null;
  comentario_c1_corretor_2?: string | null;
  comentario_c2_corretor_2?: string | null;
  comentario_c3_corretor_2?: string | null;
  comentario_c4_corretor_2?: string | null;
  comentario_c5_corretor_2?: string | null;
  elogios_pontos_atencao_corretor_2?: string | null;
  correcao_arquivo_url_corretor_1?: string | null;
  correcao_arquivo_url_corretor_2?: string | null;
  audio_url?: string | null;
  audio_url_corretor_1?: string | null;
  audio_url_corretor_2?: string | null;
  // Campos originais da tabela
  c1_corretor_1?: number | null;
  c1_corretor_2?: number | null;
  c2_corretor_1?: number | null;
  c2_corretor_2?: number | null;
  c3_corretor_1?: number | null;
  c3_corretor_2?: number | null;
  c4_corretor_1?: number | null;
  c4_corretor_2?: number | null;
  c5_corretor_1?: number | null;
  c5_corretor_2?: number | null;
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
  original_id?: string;
  corrigida: boolean;
  data_correcao?: string | null;
  // Campos necessários para o RedacaoEnviadaCard
  created_at?: string;
  observacoes_coordenacao?: string;
}

const SimuladoRedacaoCorrigida = () => {
  const { simuladoId } = useParams();
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { setBreadcrumbs, setPageTitle } = useNavigationContext();
  const [redacoesCorretor, setRedacoesCorretor] = useState<RedacaoSimulado[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState<number>(1);
  const [emDiscrepancia, setEmDiscrepancia] = useState(false);

  // Query para buscar as redações do simulado do aluno
  const { data: redacoesSimulado, isLoading, error } = useQuery({
    queryKey: ['simulado-redacao-corrigida', simuladoId, studentData.email],
    queryFn: async () => {
      if (!simuladoId || !studentData.email) {
        throw new Error('ID do simulado ou email não fornecido');
      }

      // Buscar a redação do simulado
      const { data: redacao, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados(frase_tematica)
        `)
        .eq('id_simulado', simuladoId)
        .ilike('email_aluno', studentData.email.toLowerCase().trim())
        .order('data_envio', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar redação do simulado:', error);
        throw error;
      }

      if (!redacao || redacao.length === 0) {
        throw new Error('Redação não encontrada para este simulado');
      }

      const redacaoOriginal = redacao[0];

      // Bloquear exibição se há discrepância pendente de resolução pelo admin
      if (!redacaoOriginal.corrigida) {
        const div = verificarDivergencia(redacaoOriginal);
        if (div?.temDivergencia) {
          setEmDiscrepancia(true);
          return [];
        }
      }
      setEmDiscrepancia(false);

      // Buscar nomes dos corretores
      const idsCorretores: string[] = [];
      if (redacaoOriginal.corretor_id_1) idsCorretores.push(redacaoOriginal.corretor_id_1);
      if (redacaoOriginal.corretor_id_2) idsCorretores.push(redacaoOriginal.corretor_id_2);

      let nomesCorretores: Record<string, string> = {};
      if (idsCorretores.length > 0) {
        const { data: corretores } = await supabase
          .from('corretores')
          .select('id, nome_completo')
          .in('id', idsCorretores);

        if (corretores) {
          nomesCorretores = corretores.reduce((acc, corretor) => {
            acc[corretor.id] = corretor.nome_completo;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Processar as correções em entradas separadas
      const redacoesProcessadas: RedacaoSimulado[] = [];

      // Corretor 1
      if (redacaoOriginal.corretor_id_1) {
        const statusCorretor1 = redacaoOriginal.status_corretor_1 || 'pendente';
        redacoesProcessadas.push({
          ...redacaoOriginal,
          id: `${redacaoOriginal.id}-corretor1`,
          original_id: redacaoOriginal.id,
          frase_tematica: redacaoOriginal.simulados?.frase_tematica || 'Simulado',
          redacao_texto: redacaoOriginal.texto || '',
          tipo_envio: 'simulado',
          status: statusCorretor1 === 'corrigida' ? 'corrigida' : 'aguardando',
          corrigida: statusCorretor1 === 'corrigida',
          corretor: nomesCorretores[redacaoOriginal.corretor_id_1] || 'Corretor 1',
          corretor_numero: 1,
          // Campos adicionais necessários - manter apenas os IDs do corretor específico
          corretor_id_1: redacaoOriginal.corretor_id_1,
          corretor_id_2: null, // Limpar ID do outro corretor para evitar confusão
          created_at: redacaoOriginal.data_envio,
          // Notas específicas do corretor 1
          nota_c1: redacaoOriginal.c1_corretor_1,
          nota_c2: redacaoOriginal.c2_corretor_1,
          nota_c3: redacaoOriginal.c3_corretor_1,
          nota_c4: redacaoOriginal.c4_corretor_1,
          nota_c5: redacaoOriginal.c5_corretor_1,
          nota_total: redacaoOriginal.nota_final_corretor_1,
          // Comentários do corretor 1
          comentario_c1_corretor_1: redacaoOriginal.comentario_c1_corretor_1,
          comentario_c2_corretor_1: redacaoOriginal.comentario_c2_corretor_1,
          comentario_c3_corretor_1: redacaoOriginal.comentario_c3_corretor_1,
          comentario_c4_corretor_1: redacaoOriginal.comentario_c4_corretor_1,
          comentario_c5_corretor_1: redacaoOriginal.comentario_c5_corretor_1,
          elogios_pontos_atencao_corretor_1: redacaoOriginal.elogios_pontos_atencao_corretor_1,
          correcao_arquivo_url_corretor_1: redacaoOriginal.correcao_arquivo_url_corretor_1,
          audio_url: redacaoOriginal.audio_url_corretor_1
        });
      }

      // Corretor 2
      if (redacaoOriginal.corretor_id_2) {
        const statusCorretor2 = redacaoOriginal.status_corretor_2 || 'pendente';
        redacoesProcessadas.push({
          ...redacaoOriginal,
          id: `${redacaoOriginal.id}-corretor2`,
          original_id: redacaoOriginal.id,
          frase_tematica: redacaoOriginal.simulados?.frase_tematica || 'Simulado',
          redacao_texto: redacaoOriginal.texto || '',
          tipo_envio: 'simulado',
          status: statusCorretor2 === 'corrigida' ? 'corrigida' : 'aguardando',
          corrigida: statusCorretor2 === 'corrigida',
          corretor: nomesCorretores[redacaoOriginal.corretor_id_2] || 'Corretor 2',
          corretor_numero: 2,
          // Campos adicionais necessários - manter apenas os IDs do corretor específico
          corretor_id_1: null, // Limpar ID do outro corretor para evitar confusão
          corretor_id_2: redacaoOriginal.corretor_id_2,
          created_at: redacaoOriginal.data_envio,
          // Notas específicas do corretor 2
          nota_c1: redacaoOriginal.c1_corretor_2,
          nota_c2: redacaoOriginal.c2_corretor_2,
          nota_c3: redacaoOriginal.c3_corretor_2,
          nota_c4: redacaoOriginal.c4_corretor_2,
          nota_c5: redacaoOriginal.c5_corretor_2,
          nota_total: redacaoOriginal.nota_final_corretor_2,
          // Comentários do corretor 2
          comentario_c1_corretor_2: redacaoOriginal.comentario_c1_corretor_2,
          comentario_c2_corretor_2: redacaoOriginal.comentario_c2_corretor_2,
          comentario_c3_corretor_2: redacaoOriginal.comentario_c3_corretor_2,
          comentario_c4_corretor_2: redacaoOriginal.comentario_c4_corretor_2,
          comentario_c5_corretor_2: redacaoOriginal.comentario_c5_corretor_2,
          elogios_pontos_atencao_corretor_2: redacaoOriginal.elogios_pontos_atencao_corretor_2,
          correcao_arquivo_url_corretor_2: redacaoOriginal.correcao_arquivo_url_corretor_2,
          audio_url: redacaoOriginal.audio_url_corretor_2
        });
      }

      return redacoesProcessadas;
    },
    enabled: !!simuladoId && !!studentData.email
  });

  // Configurar breadcrumbs e título
  useEffect(() => {
    if (redacoesSimulado && redacoesSimulado.length > 0) {
      const redacao = redacoesSimulado[0];
      setBreadcrumbs([
        { label: 'Início', href: '/app' },
        { label: 'Simulados', href: '/simulados' },
        { label: redacao.frase_tematica }
      ]);
      setPageTitle(`${redacao.frase_tematica} - Correção`);
    }
  }, [redacoesSimulado, setBreadcrumbs, setPageTitle]);

  // Atualizar lista quando os dados mudarem
  useEffect(() => {
    if (redacoesSimulado) {
      setRedacoesCorretor(redacoesSimulado);
      if (redacoesSimulado.length > 0) {
        setSelectedCorretor(1); // Começar sempre pelo corretor 1
      }
    }
  }, [redacoesSimulado]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Carregando..." />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">Carregando sua redação corrigida...</div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (emDiscrepancia) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Correção em Revisão" />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Button onClick={() => navigate('/simulados')} variant="outline" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Simulados
              </Button>
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Correção em revisão
                  </h2>
                  <p className="text-gray-600">
                    Os corretores apresentaram notas com discrepância. O administrador está
                    revisando para garantir o resultado mais justo para você.
                    Em breve sua correção estará disponível.
                  </p>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error || !redacoesCorretor || redacoesCorretor.length === 0) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Redação não encontrada" />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Redação não encontrada
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Não foi possível encontrar sua redação para este simulado.
                  </p>
                  <Button onClick={() => navigate('/simulados')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Simulados
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  const redacaoAtual = redacoesCorretor.find(r => r.corretor_numero === selectedCorretor);
  const temCorretores = redacoesCorretor.length > 1;

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle={redacoesCorretor[0]?.frase_tematica || "Redação Corrigida"} />

          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header com navegação */}
            <div className="mb-6">
              <Button onClick={() => navigate('/simulados')} variant="outline" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Simulados
              </Button>

              {/* Seletor de corretor se houver mais de um */}
              {temCorretores && (
                <div className="flex gap-2 mb-4">
                  {redacoesCorretor.map((redacao) => (
                    <Button
                      key={redacao.corretor_numero}
                      variant={selectedCorretor === redacao.corretor_numero ? "default" : "outline"}
                      onClick={() => setSelectedCorretor(redacao.corretor_numero!)}
                      className="text-sm"
                    >
                      {redacao.corretor || `Corretor ${redacao.corretor_numero}`}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Exibir redação corrigida */}
            {redacaoAtual && (
              <RedacaoEnviadaCard
                key={`redacao-${redacaoAtual.id}-corretor-${redacaoAtual.corretor_numero}`}
                redacao={redacaoAtual}
              />
            )}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default SimuladoRedacaoCorrigida;