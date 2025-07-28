
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, User, Mail, GraduationCap, FileText, Star, MessageSquare, Clock, Download } from "lucide-react";
import { RedacaoAnotacaoVisual } from "./corretor/RedacaoAnotacaoVisual";
import { AudioPlayerAluno } from "./AudioPlayerAluno";
import { useToast } from "@/hooks/use-toast";
import { downloadRedacaoManuscritaCorrigida } from "@/utils/redacaoDownload";

interface RedacaoEnviadaCardProps {
  redacao: {
    id: string;
    frase_tematica: string;
    redacao_texto: string;
    redacao_manuscrita_url?: string | null;
    data_envio: string;
    nota_c1?: number | null;
    nota_c2?: number | null;
    nota_c3?: number | null;
    nota_c4?: number | null;
    nota_c5?: number | null;
    nota_total?: number | null;
    comentario_admin?: string | null;
    corrigida: boolean;
    data_correcao?: string | null;
    nome_aluno: string;
    email_aluno: string;
    tipo_envio: string;
    status: string;
    turma: string;
    // Novos campos de comentários pedagógicos
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
  };
}

export const RedacaoEnviadaCard = ({
  redacao
}: RedacaoEnviadaCardProps) => {
  const { toast } = useToast();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício',
      'simulado': 'Simulado',
      'visitante': 'Avulsa'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoEnvioColor = (tipo: string) => {
    const cores = {
      'regular': 'bg-blue-100 text-blue-800',
      'exercicio': 'bg-purple-100 text-purple-800',
      'simulado': 'bg-orange-100 text-orange-800',
      'visitante': 'bg-gray-100 text-gray-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-blue-100 text-blue-800';
  };

  // Função para obter comentários pedagógicos combinados
  const getComentariosPedagogicos = () => {
    const comentarios = [];
    console.log('🔍 VERIFICANDO COMENTÁRIOS:', redacao);

    // Comentários por competência
    for (let i = 1; i <= 5; i++) {
      const comentario1 = redacao[`comentario_c${i}_corretor_1` as keyof typeof redacao] as string | null;
      const comentario2 = redacao[`comentario_c${i}_corretor_2` as keyof typeof redacao] as string | null;
      console.log(`📝 C${i}:`, {
        comentario1,
        comentario2
      });
      if (comentario1?.trim() || comentario2?.trim()) {
        comentarios.push({
          competencia: i,
          comentario1: comentario1?.trim() || null,
          comentario2: comentario2?.trim() || null
        });
      }
    }
    console.log('📋 COMENTÁRIOS FINAIS:', comentarios);
    return comentarios;
  };

  // Função para obter elogios e pontos de atenção
  const getElogiosEPontosAtencao = () => {
    const elogios1 = redacao.elogios_pontos_atencao_corretor_1?.trim();
    const elogios2 = redacao.elogios_pontos_atencao_corretor_2?.trim();
    return {
      elogios1,
      elogios2
    };
  };

  // Função para verificar se há correção externa disponível
  const getCorrecaoExterna = () => {
    const correcao1 = redacao.correcao_arquivo_url_corretor_1?.trim();
    const correcao2 = redacao.correcao_arquivo_url_corretor_2?.trim();
    return {
      correcao1,
      correcao2
    };
  };

  const comentariosPedagogicos = getComentariosPedagogicos();
  const {
    elogios1,
    elogios2
  } = getElogiosEPontosAtencao();
  const {
    correcao1,
    correcao2
  } = getCorrecaoExterna();

  console.log('🔍 DEBUG RedacaoEnviadaCard - RESULTADO FINAL:', {
    comentariosPedagogicos,
    totalComentarios: comentariosPedagogicos.length,
    elogios1: !!elogios1,
    elogios2: !!elogios2,
    temCorrecaoExterna: !!(correcao1 || correcao2)
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header simplificado conforme solicitado */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl text-primary leading-tight">
              {redacao.frase_tematica}
            </CardTitle>
            <div className="flex flex-wrap gap-2 shrink-0">
              {/* ETAPA 1: Removida tag "Corrigido" da home - status só aparece na vista pedagógica */}
              {redacao.status === "em_correcao" && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  Em correção
                </Badge>
              )}
              <Badge className={`${getTipoEnvioColor(redacao.tipo_envio)} text-xs`}>
                {getTipoEnvioLabel(redacao.tipo_envio)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Apenas data e horário conforme solicitado */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium">Enviado:</span>
            <span className="text-xs sm:text-sm">{formatDate(redacao.data_envio)}</span>
          </div>
        </CardContent>
      </Card>

          {/* Vista Pedagógica - só exibir se correção foi FINALIZADA (não apenas salva incompleta) */}
      {redacao.corrigida && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {redacao.data_correcao && (
                  <div className="flex items-center gap-2 text-sm text-primary/80">
                    <Clock className="w-4 h-4" />
                    Corrigido em: {formatDate(redacao.data_correcao)}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Notas por competência - formato ajustado conforme Prompt 3 */}
            <div>
              <h3 className="font-semibold text-primary mb-4">Notas por Competência</h3>
              
              {/* Grid horizontal das competências C1-C5 + Nota Final */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5].map(comp => {
                  const nota = redacao[`nota_c${comp}` as keyof typeof redacao] as number | null;
                  return (
                    <div key={comp} className="text-center">
                      <div className="bg-white border border-primary/20 rounded-lg p-3">
                        <div className="text-xs text-primary/80 font-medium mb-1">C{comp}</div>
                        <div className="text-lg font-bold text-primary">
                          {nota !== null ? nota : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Nota Final */}
                <div className="text-center">
                  <div className="bg-primary text-white rounded-lg p-3">
                    <div className="text-xs font-medium mb-1">Total</div>
                    <div className="text-lg font-bold">
                      {redacao.nota_total !== null ? redacao.nota_total : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de exibição da redação - SEGUNDA NA ORDEM */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <FileText className="w-5 h-5" />
            Redação Corrigida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg border min-h-[200px]">
            {/* Lógica condicional baseada no tipo de envio e correção externa */}
            {(() => {
              const temCorrecaoExterna = correcao1 || correcao2;
              const redacaoFoiManuscrita = redacao.redacao_manuscrita_url;

              // Se há correção externa e redação foi manuscrita, mostrar apenas a correção
              if (temCorrecaoExterna && redacaoFoiManuscrita) {
                const urlCorrecao = correcao1 || correcao2;
                return (
                  <div className="flex flex-col items-center">
                    {urlCorrecao?.toLowerCase().includes('.pdf') ? (
                      <div className="w-full">
                        <embed src={urlCorrecao} type="application/pdf" className="w-full h-[600px] rounded-md" />
                        <div className="mt-2 text-center">
                          <Button variant="outline" size="sm" onClick={() => window.open(urlCorrecao, '_blank')} className="text-primary border-primary hover:bg-primary/10">
                            <Download className="w-4 h-4 mr-2" />
                            Visualizar PDF em nova aba
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <img src={urlCorrecao} alt="Correção do professor" className="w-full h-auto rounded-md max-h-[80vh] object-contain" />
                    )}
                  </div>
                );
              }

              // Se redação foi manuscrita, mostrar apenas botão de download do PDF
              if (redacaoFoiManuscrita && redacao.corrigida) {
                return (
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-md min-h-[400px]">
                    <div className="text-center space-y-4">
                      <div className="text-6xl mb-4">📄</div>
                      <h3 className="text-xl font-semibold text-gray-800">Correção Manuscrita Disponível</h3>
                      <p className="text-gray-600 max-w-md">
                        Sua redação manuscrita foi corrigida com marcações visuais numeradas. 
                        Clique no botão abaixo para baixar o PDF completo com todas as correções e comentários.
                      </p>
                      <Button 
                        onClick={() => downloadRedacaoManuscritaCorrigida(redacao)}
                        className="bg-primary text-white hover:bg-primary/90 px-6 py-3 text-lg"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        📥 Baixar correção (PDF)
                      </Button>
                    </div>
                  </div>
                );
              }

              // Se redação foi manuscrita mas não corrigida, mostrar original
              if (redacaoFoiManuscrita && !redacao.corrigida) {
                return (
                  <div className="flex flex-col items-center">
                    {redacao.redacao_manuscrita_url?.toLowerCase().includes('.pdf') ? (
                      <div className="w-full">
                        <embed src={redacao.redacao_manuscrita_url} type="application/pdf" className="w-full h-[600px] rounded-md" />
                        <div className="mt-2 text-center">
                          <Button variant="outline" size="sm" onClick={() => window.open(redacao.redacao_manuscrita_url, '_blank')} className="text-primary border-primary hover:bg-primary/10">
                            <Download className="w-4 h-4 mr-2" />
                            Visualizar PDF em nova aba
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={redacao.redacao_manuscrita_url} 
                        alt="Redação manuscrita" 
                        className="w-full h-auto rounded-md cursor-zoom-in"
                        style={{ maxHeight: '85vh', minHeight: '400px' }}
                        onClick={() => window.open(redacao.redacao_manuscrita_url, '_blank')}
                        onError={(e) => {
                          console.error('Erro ao carregar redação manuscrita:', e);
                          e.currentTarget.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-96 p-8 bg-gray-50 rounded-md">
                              <div class="text-6xl mb-4">❌</div>
                              <h3 class="text-lg font-semibold text-gray-700 mb-2">Erro ao carregar redação</h3>
                              <p class="text-sm text-gray-600 text-center">Não foi possível exibir a redação manuscrita</p>
                              <button onclick="window.open('${redacao.redacao_manuscrita_url}', '_blank')" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">
                                Tentar abrir em nova aba
                              </button>
                            </div>
                          `;
                          e.currentTarget.parentNode?.appendChild(errorDiv);
                        }}
                      />
                    )}
                  </div>
                );
              }

              // Se redação foi digitada, mostrar sempre o texto + correção externa (se houver)
              if (!redacaoFoiManuscrita) {
                return (
                  <div className="space-y-4">
                    {redacao.redacao_texto?.trim() ? (
                      <div>
                        <h4 className="font-medium text-primary mb-2"></h4>
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-gray-800 p-3 bg-white rounded border">
                          {redacao.redacao_texto}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Conteúdo da redação não disponível
                      </p>
                    )}
                    
                    {/* Mostrar correção externa se existir */}
                    {temCorrecaoExterna && (
                      <div>
                        <h4 className="font-medium text-primary mb-2">Correção do Professor:</h4>
                        <div className="flex flex-col items-center">
                          {(() => {
                            const urlCorrecao = correcao1 || correcao2;
                            return urlCorrecao?.toLowerCase().includes('.pdf') ? (
                              <div className="w-full">
                                <embed src={urlCorrecao} type="application/pdf" className="w-full h-[600px] rounded-md" />
                                <div className="mt-2 text-center">
                                  <Button variant="outline" size="sm" onClick={() => window.open(urlCorrecao, '_blank')} className="text-primary border-primary hover:bg-primary/10">
                                    <Download className="w-4 h-4 mr-2" />
                                    Visualizar PDF em nova aba
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <img src={urlCorrecao} alt="Correção do professor" className="w-full h-auto rounded-md max-h-[80vh] object-contain" />
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <p className="text-sm text-gray-500 italic">
                  Conteúdo da redação não disponível
                </p>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Relatório pedagógico - só exibir se correção foi FINALIZADA */}
      {redacao.corrigida && (elogios1 || elogios2 || (redacao.comentario_admin && typeof redacao.comentario_admin === 'string' && redacao.comentario_admin.trim())) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <MessageSquare className="w-5 h-5" />
              Relatório pedagógico de correção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comentário administrativo */}
            {redacao.comentario_admin && typeof redacao.comentario_admin === 'string' && redacao.comentario_admin.trim() && (
              <div className="bg-white border border-primary/20 rounded-lg p-4">
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {redacao.comentario_admin}
                </p>
              </div>
            )}
            
            {/* Elogios e pontos de atenção do corretor 1 */}
            {elogios1 && (
              <div className="bg-white border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-3">Relatório Pedagógico</h4>
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {elogios1}
                </p>
              </div>
            )}
            
            {/* Elogios e pontos de atenção do corretor 2 */}
            {elogios2 && (
              <div className="bg-white border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-3">Relatório Pedagógico - Corretor 2</h4>
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {elogios2}
                </p>
              </div>
            )}
            
            {/* Player de áudio do corretor - só exibir se áudio existe */}
            {redacao.audio_url && (
              <AudioPlayerAluno 
                audioUrl={redacao.audio_url} 
                corretorNome="Corretor"
              />
            )}
            
            {/* Botão de download da correção - SEMPRE MOSTRAR quando há correção */}
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Implementar download da correção completa
                  toast({
                    title: "Download iniciado",
                    description: "A correção completa será baixada em breve.",
                  });
                }}
                className="text-primary border-primary hover:bg-primary/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Correção Completa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
