import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { computeSimuladoStatus, getSimuladoStatusInfo } from "@/utils/simuladoStatus";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotivatorWithImage } from '@/components/shared/MotivatorWithImage';


import { useNavigationContext } from "@/hooks/useNavigationContext";
import { RedacaoFormUnificado } from "@/components/shared/RedacaoFormUnificado";

const SimuladoParticipacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();


  const { data: simulado, isLoading, error } = useQuery({
    queryKey: ['simulado-participacao', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do simulado não fornecido');

      
      const { data, error } = await supabase
        .from('simulados')
        .select(`
          *,
          temas (
            *
          )
        `)
        .eq('id', id)
        .eq('ativo', true)
        .single();

      if (error) {
        throw error;
      }


      return data;
    },
    enabled: !!id
  });

  const { setBreadcrumbs, setPageTitle } = useNavigationContext();

  // Configurar breadcrumbs e título quando o simulado for carregado
  useEffect(() => {
    if (simulado?.frase_tematica) {
      setBreadcrumbs([
        { label: 'Início', href: '/app' },
        { label: 'Simulados', href: '/simulados' },
        { label: simulado.frase_tematica }
      ]);
      setPageTitle(simulado.frase_tematica);
    }
  }, [simulado?.frase_tematica, setBreadcrumbs, setPageTitle]);


  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Carregando simulado..." />
            <main className="max-w-4xl mx-auto px-4 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando dados do simulado...</p>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error || !simulado) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Erro" />
            <main className="max-w-4xl mx-auto px-4 py-8">
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-600 mb-2">
                    Simulado não encontrado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    O simulado solicitado não foi encontrado ou não está mais ativo.
                  </p>
                  <Button onClick={() => navigate('/app')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Home
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  // Verificar status do simulado usando nossa utility
  const status = computeSimuladoStatus(simulado);
  const statusInfo = getSimuladoStatusInfo(status, simulado);
  const simuladoDisponivel = statusInfo.isActive;

  if (!simuladoDisponivel) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Simulado Indisponível" />
            <main className="max-w-4xl mx-auto px-4 py-8">
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-600 mb-2">
                    Simulado não está disponível
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Este simulado não está no período de participação.
                  </p>
                   <div className="bg-gray-50 p-4 rounded-lg mb-4">
                     <p className="text-sm text-gray-600">
                       <strong>Período:</strong> {simulado.data_inicio && simulado.hora_inicio && simulado.data_fim && simulado.hora_fim 
                         ? `${simulado.data_inicio} às ${simulado.hora_inicio} até ${simulado.data_fim} às ${simulado.hora_fim}`
                         : 'Período não definido'
                       }
                     </p>
                   </div>
                  <Button onClick={() => navigate('/app')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Home
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle={`Simulado: ${simulado.titulo}`} />
          
          <main className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
              <Button
                onClick={() => navigate('/app')}
                variant="ghost"
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Home
              </Button>
            </div>

            {simulado.temas && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-primary">
                    Proposta de Redação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">
                      "{simulado.temas.frase_tematica}"
                    </h3>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                    <p className="text-primary leading-relaxed font-medium text-sm">
                      {simulado.temas.cabecalho_enem || 
                        `A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "${simulado.temas.frase_tematica}", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.`
                      }
                    </p>
                  </div>

                  {/* TEXTOS MOTIVADORES */}
                  {(() => {
                    let textoCounter = 1;
                    const tema = simulado.temas;
                    return (
                      <>
                        <MotivatorWithImage
                          text={tema.texto_1}
                          fonte={tema.texto_1_fonte}
                          imageSource={tema.motivator1_source}
                          imageUrl={tema.motivator1_url}
                          imageFilePath={tema.motivator1_file_path}
                          imagePosition={tema.motivator1_image_position}
                          motivatorNumber={textoCounter++}
                          imageClassName="max-w-2xl mx-auto h-auto"
                        />
                        <MotivatorWithImage
                          text={tema.texto_2}
                          fonte={tema.texto_2_fonte}
                          imageSource={tema.motivator2_source}
                          imageUrl={tema.motivator2_url}
                          imageFilePath={tema.motivator2_file_path}
                          imagePosition={tema.motivator2_image_position}
                          motivatorNumber={textoCounter++}
                          imageClassName="max-w-2xl mx-auto h-auto"
                        />
                        <MotivatorWithImage
                          text={tema.texto_3}
                          fonte={tema.texto_3_fonte}
                          imageSource={tema.motivator3_source}
                          imageUrl={tema.motivator3_url}
                          imageFilePath={tema.motivator3_file_path}
                          imagePosition={tema.motivator3_image_position}
                          motivatorNumber={textoCounter++}
                          imageClassName="max-w-2xl mx-auto h-auto"
                        />
                        <MotivatorWithImage
                          text={tema.texto_4}
                          fonte={tema.texto_4_fonte}
                          imageSource={tema.motivator4_source}
                          imageUrl={tema.motivator4_url}
                          imageFilePath={tema.motivator4_file_path}
                          imagePosition={tema.motivator4_image_position}
                          motivatorNumber={textoCounter++}
                          imageClassName="max-w-2xl mx-auto h-auto"
                        />
                        <MotivatorWithImage
                          text={tema.texto_5}
                          fonte={tema.texto_5_fonte}
                          imageSource={tema.motivator5_source}
                          imageUrl={tema.motivator5_url}
                          imageFilePath={tema.motivator5_file_path}
                          imagePosition={tema.motivator5_image_position}
                          motivatorNumber={textoCounter++}
                          imageClassName="max-w-2xl mx-auto h-auto"
                        />
                      </>
                    );
                  })()}

                </CardContent>
              </Card>
            )}

            <RedacaoFormUnificado
              isSimulado={true}
              simuladoId={id}
              fraseTematica={simulado.temas?.frase_tematica || ""}
              readOnlyFraseTematica={true}
              requiredCorretores={2}
              requiredCredits={2}
              onSubmitSuccess={() => navigate('/app')}
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default SimuladoParticipacao;
