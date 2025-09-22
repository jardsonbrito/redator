
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, User, Mail, GraduationCap, FileText, Star, MessageSquare, Clock, Download, Volume2, X, AlertTriangle } from "lucide-react";
import { RedacaoAnotacaoVisual } from "./corretor/RedacaoAnotacaoVisual";
import { AudioPlayerAluno } from "./AudioPlayerAluno";
import { useToast } from "@/hooks/use-toast";
import { downloadRedacaoManuscritaCorrigida } from "@/utils/redacaoDownload";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useCancelRedacao } from "@/hooks/useCancelRedacao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    // Notas específicas por corretor para simulados
    nota_c1_corretor_1?: number | null;
    nota_c2_corretor_1?: number | null;
    nota_c3_corretor_1?: number | null;
    nota_c4_corretor_1?: number | null;
    nota_c5_corretor_1?: number | null;
    nota_c1_corretor_2?: number | null;
    nota_c2_corretor_2?: number | null;
    nota_c3_corretor_2?: number | null;
    nota_c4_corretor_2?: number | null;
    nota_c5_corretor_2?: number | null;
    comentario_admin?: string | null;
    corrigida: boolean;
    data_correcao?: string | null;
    nome_aluno: string;
    email_aluno: string;
    tipo_envio: string;
    status: string;
    turma: string;
    corretor_numero?: number;
    corretor?: string;
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
    audio_url_corretor_1?: string | null;
    audio_url_corretor_2?: string | null;
    corretor_id_1?: string | null;
    corretor_id_2?: string | null;
    // Campos da tabela real
    c1_corretor_1?: number | null;
    c1_corretor_2?: number | null;
  };
  onRedacaoCanceled?: () => void;
}

export const RedacaoEnviadaCard = ({
  redacao,
  onRedacaoCanceled
}: RedacaoEnviadaCardProps) => {
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  const { cancelRedacao, canCancelRedacao, getCreditosACancelar, loading: cancelLoading } = useCancelRedacao({
    onSuccess: () => {
      onRedacaoCanceled?.();
    }
  });

  // Função para verificar se deve mostrar as notas
  // Para simulados, só mostra quando ambas as correções estiverem finalizadas
  const shouldShowScores = (redacao: any) => {
    if (redacao.tipo_envio === 'simulado') {
      // Para simulados, precisamos verificar se AMBAS as correções foram finalizadas
      // Verificamos se há notas de TODOS os corretores para TODAS as competências
      const temTodasNotasCorretor1 = [1, 2, 3, 4, 5].every(comp => {
        const nota = redacao[`nota_c${comp}_corretor_1`];
        return nota !== null && nota !== undefined;
      });
      
      const temTodasNotasCorretor2 = [1, 2, 3, 4, 5].every(comp => {
        const nota = redacao[`nota_c${comp}_corretor_2`];
        return nota !== null && nota !== undefined;
      });
      
      // Verificar se ambos corretores têm relatórios pedagógicos preenchidos
      const temRelatorioCorretor1 = redacao.elogios_pontos_atencao_corretor_1 && redacao.elogios_pontos_atencao_corretor_1.trim();
      const temRelatorioCorretor2 = redacao.elogios_pontos_atencao_corretor_2 && redacao.elogios_pontos_atencao_corretor_2.trim();
      
      // Para simulados, só mostra se AMBAS as correções estão COMPLETAMENTE finalizadas
      return temTodasNotasCorretor1 && temTodasNotasCorretor2 && temRelatorioCorretor1 && temRelatorioCorretor2;
    }
    
    // Para outros tipos de redação (regular, exercício, visitante), usar lógica atual
    return true;
  };
  
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

  // Função para obter elogios e pontos de atenção do corretor específico
  const getElogiosEPontosAtencao = () => {
    // Baseado no corretor_numero, retornar apenas o relatório daquele corretor
    if (redacao.corretor_numero === 1) {
      return redacao.elogios_pontos_atencao_corretor_1?.trim() || null;
    } else if (redacao.corretor_numero === 2) {
      return redacao.elogios_pontos_atencao_corretor_2?.trim() || null;
    }
    
    // Para compatibilidade com redações sem corretor_numero específico
    const elogios1 = redacao.elogios_pontos_atencao_corretor_1?.trim();
    const elogios2 = redacao.elogios_pontos_atencao_corretor_2?.trim();
    return elogios1 || elogios2 || null;
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
  const relatorioPedagogico = getElogiosEPontosAtencao();
  const {
    correcao1,
    correcao2
  } = getCorrecaoExterna();

  console.log('🔍 DEBUG RedacaoEnviadaCard - RESULTADO FINAL:', {
    comentariosPedagogicos,
    totalComentarios: comentariosPedagogicos.length,
    relatorioPedagogico: !!relatorioPedagogico,
    corretor_numero: redacao.corretor_numero,
    corretor_nome: redacao.corretor,
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

              {/* Botão de cancelamento */}
              {canCancelRedacao(redacao) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      disabled={cancelLoading}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancelar envio
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Cancelar envio da redação
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>Tem certeza que deseja cancelar o envio desta redação?</p>
                        <p className="font-medium">
                          <strong>Tema:</strong> {redacao.frase_tematica}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Tipo:</strong> {getTipoEnvioLabel(redacao.tipo_envio)}
                        </p>
                        {getCreditosACancelar(redacao.tipo_envio) > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                            <p className="text-green-800 text-sm">
                              ✅ <strong>{getCreditosACancelar(redacao.tipo_envio)} crédito(s)</strong> serão devolvidos à sua conta.
                            </p>
                          </div>
                        )}
                        <p className="text-red-600 text-sm mt-3">
                          ⚠️ Esta ação não pode ser desfeita. A redação será removida permanentemente.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Não, manter redação</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelRedacao(redacao.id, redacao.email_aluno)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? "Cancelando..." : "Sim, cancelar envio"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Data de envio */}
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">Enviado:</span>
              <span className="text-xs sm:text-sm">{formatDate(redacao.data_envio)}</span>
            </div>
            
            {/* Nome do corretor e nota - exibir apenas se atribuído */}
            {redacao.corretor && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">Corretor:</span>
                <span className="text-xs sm:text-sm">{redacao.corretor}</span>
                {/* Mostrar nota do corretor se disponível */}
                {redacao.nota_total !== null && redacao.nota_total !== undefined && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
                    {redacao.nota_total} pontos
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Vista Pedagógica - só exibir se correção foi FINALIZADA e para simulados apenas quando ambas as correções estiverem concluídas */}
      {redacao.corrigida && shouldShowScores(redacao) && (
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
            {/* Média por competência - formato ajustado conforme prompt técnico */}
            <div>
              <h3 className="font-semibold text-primary mb-4">Média por Competência</h3>
              
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
                
                {/* Média Final */}
                <div className="text-center">
                  <div className="bg-primary text-white rounded-lg p-3">
                    <div className="text-xs font-medium mb-1">Média Final</div>
                    <div className="text-lg font-bold">
                      {redacao.nota_total !== null ? redacao.nota_total : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Player de áudio do corretor - logo após as notas */}
            {/* Lógica: só exibe áudio se este card corresponder ao corretor que gravou */}
            {(() => {
              // Determinar qual campo de áudio usar baseado no corretor
              const audioUrl = redacao.corretor_numero === 1 
                ? redacao.audio_url_corretor_1 
                : redacao.corretor_numero === 2 
                  ? redacao.audio_url_corretor_2 
                  : redacao.audio_url; // Fallback para compatibilidade

              if (audioUrl) {
                return (
                  <div className="pt-4 border-t border-primary/20">
                    <AudioPlayerAluno 
                      audioUrl={audioUrl} 
                      corretorNome={redacao.corretor_numero === 1 ? "Corretor 1" : redacao.corretor_numero === 2 ? "Corretor 2" : "Corretor"}
                      isStudentView={true}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Área de exibição da redação - SEGUNDA NA ORDEM */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <FileText className="w-5 h-5" />
            Redação Enviada
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

              // Se redação foi manuscrita e corrigida, exibir visualizador interativo (aluno)
              if (redacaoFoiManuscrita && redacao.corrigida) {
                return (
                  <div className="space-y-4">
                    <RedacaoAnotacaoVisual
                      imagemUrl={redacao.redacao_manuscrita_url as string}
                      redacaoId={(() => {
                        const finalId = redacao.original_id || redacao.id.replace('-corretor1', '').replace('-corretor2', '');
                        console.log('🔍 DEBUG - RedacaoEnviadaCard - redacaoId:', {
                          originalId: redacao.original_id,
                          currentId: redacao.id,
                          finalId,
                          tipoEnvio: redacao.tipo_envio
                        });
                        console.log('🔍 DEBUG - RESULTADO FINAL:', JSON.stringify({
                          redacaoId: finalId,
                          corretorNumero: redacao.corretor_numero,
                          status: redacao.status,
                          corrigida: redacao.corrigida,
                          statusCalculado: redacao.corrigida ? 'corrigida' : redacao.status === 'corrigida' ? 'corrigida' : 'pendente'
                        }));
                        return finalId;
                      })()}
                      corretorId={(() => {
                        const finalCorretorId = redacao.tipo_envio === 'simulado'
                          ? (redacao.corretor_numero === 1
                              ? redacao.corretor_id_1
                              : redacao.corretor_numero === 2
                                ? redacao.corretor_id_2
                                : null)
                          : (redacao.corretor_id_real || redacao.corretor_id_1 || redacao.corretor_id_2 || null);

                        console.log('🔍 DEBUG - RedacaoEnviadaCard - corretorId:', JSON.stringify({
                          tipoEnvio: redacao.tipo_envio,
                          corretorNumero: redacao.corretor_numero,
                          corretor_id_1: redacao.corretor_id_1,
                          corretor_id_2: redacao.corretor_id_2,
                          corretor_id_real: redacao.corretor_id_real,
                          finalCorretorId
                        }));
                        return finalCorretorId;
                      })()}
                      readonly
                      ehCorretor1={redacao.tipo_envio === 'simulado' && redacao.corretor_numero === 1}
                      ehCorretor2={redacao.tipo_envio === 'simulado' && redacao.corretor_numero === 2}
                      tipoTabela={
                        redacao.tipo_envio === 'simulado' ? 'redacoes_simulado' :
                        redacao.tipo_envio === 'exercicio' ? 'redacoes_exercicio' :
                        'redacoes_enviadas'
                      }
                      statusMinhaCorrecao={
                        redacao.corrigida ? 'corrigida' : redacao.status === 'corrigida' ? 'corrigida' : 'pendente'
                      }
                    />
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
                        <p className="text-sm sm:text-base leading-relaxed prose whitespace-pre-line text-gray-800 p-3 bg-white rounded border">
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
      {redacao.corrigida && (relatorioPedagogico || (redacao.comentario_admin && typeof redacao.comentario_admin === 'string' && redacao.comentario_admin.trim())) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <MessageSquare className="w-5 h-5" />
              {redacao.corretor ? 
                `Relatório pedagógico de correção – ${redacao.corretor}` : 
                'Relatório pedagógico de correção'
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comentário administrativo - apenas se não há corretor específico */}
            {!redacao.corretor_numero && redacao.comentario_admin && typeof redacao.comentario_admin === 'string' && redacao.comentario_admin.trim() && (
              <div className="bg-white border border-primary/20 rounded-lg p-4">
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {redacao.comentario_admin}
                </p>
              </div>
            )}
            
            {/* Relatório pedagógico do corretor específico */}
            {relatorioPedagogico && (
              <div className="bg-white border border-primary/20 rounded-lg p-4">
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {relatorioPedagogico}
                </p>
              </div>
            )}
            
            {/* Botão de download da correção - APENAS para não-alunos */}
            {studentData?.userType !== 'aluno' && (
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
