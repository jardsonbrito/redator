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
import { renderTextWithParagraphs } from '@/utils/textUtils';
import { getTemaMotivatorIVUrl } from '@/utils/temaImageUtils';

// Função para extrair e separar fonte do texto
const extrairFonteDoTexto = (texto: string) => {
  if (!texto) return { textoLimpo: '', fonte: '' };

  // Padrões para detectar fonte no final do texto
  const padroesFonte = [
    /\n\s*(Fonte:\s*.+?)$/i,
    /\n\s*(Disponível em:\s*.+?)$/i,
    /\n\s*(Fonte -\s*.+?)$/i,
    /\n\s*(Disponível em -\s*.+?)$/i,
    /\n\s*(FONTE:\s*.+?)$/i,
    /\n\s*(DISPONÍVEL EM:\s*.+?)$/i
  ];

  let textoLimpo = texto;
  let fonte = '';

  // Tentar cada padrão para encontrar a fonte
  for (const padrao of padroesFonte) {
    const match = texto.match(padrao);
    if (match) {
      fonte = match[1].trim();
      textoLimpo = texto.replace(padrao, '').trim();
      break;
    }
  }

  return { textoLimpo, fonte };
};
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

                  {simulado.temas.texto_1 && (() => {
                    const { textoLimpo, fonte } = extrairFonteDoTexto(simulado.temas.texto_1);
                    return (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="font-semibold text-primary mb-3">Texto 1</h4>
                        <div className="text-gray-700 leading-relaxed text-sm">
                          {renderTextWithParagraphs(textoLimpo)}
                        </div>
                        {fonte && (
                          <div className="text-right mt-3 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 italic">
                              {fonte}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {simulado.temas.texto_2 && (() => {
                    const { textoLimpo, fonte } = extrairFonteDoTexto(simulado.temas.texto_2);
                    return (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="font-semibold text-primary mb-3">Texto 2</h4>
                        <div className="text-gray-700 leading-relaxed text-sm">
                          {renderTextWithParagraphs(textoLimpo)}
                        </div>
                        {fonte && (
                          <div className="text-right mt-3 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 italic">
                              {fonte}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {simulado.temas.texto_3 && (() => {
                    const { textoLimpo, fonte } = extrairFonteDoTexto(simulado.temas.texto_3);
                    return (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="font-semibold text-primary mb-3">Texto 3</h4>
                        <div className="text-gray-700 leading-relaxed text-sm">
                          {renderTextWithParagraphs(textoLimpo)}
                        </div>
                        {fonte && (
                          <div className="text-right mt-3 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 italic">
                              {fonte}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}


                  {/* TEXTO MOTIVADOR IV (IMAGEM) - Numeração dinâmica baseada nos textos existentes */}
                  {(() => {
                    // Usar a função correta para resolver a URL do Texto 4
                    const imagemMotivador = getTemaMotivatorIVUrl(simulado.temas);

                    if (imagemMotivador) {
                      const textosVerbais = [simulado.temas.texto_1, simulado.temas.texto_2, simulado.temas.texto_3].filter(Boolean);
                      const numeroTextoImagem = textosVerbais.length + 1;

                      return (
                        <div className="bg-white rounded-lg p-6 border border-gray-200">
                          <h4 className="font-semibold text-primary mb-3">Texto {numeroTextoImagem}</h4>
                          <div className="rounded-lg overflow-hidden">
                            <img
                              src={imagemMotivador}
                              alt={`Texto ${numeroTextoImagem} - Charge/Infográfico`}
                              className="w-full h-auto"
                              onError={(e) => {
                                console.error('Erro ao carregar imagem do Texto 4:', imagemMotivador);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                    return null;
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
