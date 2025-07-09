
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, User, Mail, GraduationCap, FileText, Star, MessageSquare, Clock, Download } from "lucide-react";

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
  };
}

export const RedacaoEnviadaCard = ({ redacao }: RedacaoEnviadaCardProps) => {
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
    
    // Comentários por competência
    for (let i = 1; i <= 5; i++) {
      const comentario1 = redacao[`comentario_c${i}_corretor_1` as keyof typeof redacao] as string | null;
      const comentario2 = redacao[`comentario_c${i}_corretor_2` as keyof typeof redacao] as string | null;
      
      if (comentario1 || comentario2) {
        comentarios.push({
          competencia: i,
          comentario1: comentario1?.trim(),
          comentario2: comentario2?.trim()
        });
      }
    }
    
    return comentarios;
  };

  // Função para obter elogios e pontos de atenção
  const getElogiosEPontosAtencao = () => {
    const elogios1 = redacao.elogios_pontos_atencao_corretor_1?.trim();
    const elogios2 = redacao.elogios_pontos_atencao_corretor_2?.trim();
    
    return { elogios1, elogios2 };
  };

  // Função para verificar se há correção externa disponível
  const getCorrecaoExterna = () => {
    const correcao1 = redacao.correcao_arquivo_url_corretor_1?.trim();
    const correcao2 = redacao.correcao_arquivo_url_corretor_2?.trim();
    
    return { correcao1, correcao2 };
  };

  const comentariosPedagogicos = getComentariosPedagogicos();
  const { elogios1, elogios2 } = getElogiosEPontosAtencao();
  const { correcao1, correcao2 } = getCorrecaoExterna();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header da redação - otimizado para mobile */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl text-primary leading-tight">
              {redacao.frase_tematica}
            </CardTitle>
            <div className="flex flex-wrap gap-2 shrink-0">
              {redacao.corrigida ? (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Corrigido
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  Aguardando
                </Badge>
              )}
              <Badge className={`${getTipoEnvioColor(redacao.tipo_envio)} text-xs`}>
                {getTipoEnvioLabel(redacao.tipo_envio)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Informações do aluno - layout mobile melhorado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">Aluno:</span>
              <span className="truncate">{redacao.nome_aluno}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">E-mail:</span>
              <span className="truncate text-xs sm:text-sm">{redacao.email_aluno}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">Turma:</span>
              <span>{redacao.turma}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">Enviado:</span>
              <span className="text-xs sm:text-sm">{formatDate(redacao.data_envio)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área de exibição da redação corrigida - com lógica condicional */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <FileText className="w-5 h-5" />
            Redação
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
                        <embed 
                          src={urlCorrecao} 
                          type="application/pdf"
                          className="w-full h-[600px] rounded-md"
                        />
                        <div className="mt-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(urlCorrecao, '_blank')}
                            className="text-primary border-primary hover:bg-primary/10"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Visualizar PDF em nova aba
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={urlCorrecao} 
                        alt="Correção do professor" 
                        className="w-full h-auto rounded-md max-h-[80vh] object-contain"
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
                        <h4 className="font-medium text-primary mb-2">Texto Original:</h4>
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
                                <embed 
                                  src={urlCorrecao} 
                                  type="application/pdf"
                                  className="w-full h-[600px] rounded-md"
                                />
                                <div className="mt-2 text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(urlCorrecao, '_blank')}
                                    className="text-primary border-primary hover:bg-primary/10"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Visualizar PDF em nova aba
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={urlCorrecao} 
                                alt="Correção do professor" 
                                className="w-full h-auto rounded-md max-h-[80vh] object-contain"
                              />
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Se redação foi manuscrita mas não há correção externa, mostrar original
              if (redacaoFoiManuscrita && !temCorrecaoExterna) {
                return (
                  <div className="flex flex-col items-center">
                    {redacao.redacao_manuscrita_url?.toLowerCase().includes('.pdf') ? (
                      <div className="w-full">
                        <embed 
                          src={redacao.redacao_manuscrita_url} 
                          type="application/pdf"
                          className="w-full h-[600px] rounded-md"
                        />
                        <div className="mt-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(redacao.redacao_manuscrita_url, '_blank')}
                            className="text-primary border-primary hover:bg-primary/10"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Visualizar PDF em nova aba
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={redacao.redacao_manuscrita_url} 
                        alt="Redação manuscrita" 
                        className="w-full h-auto rounded-md max-h-[80vh] object-contain"
                      />
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

      {/* Vista Pedagógica (se disponível) - layout mobile otimizado */}
      {redacao.corrigida && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg text-primary">
                Vista Pedagógica
              </CardTitle>
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
            {/* Notas por competência - nova estrutura */}
            <div>
              <h3 className="font-semibold text-primary mb-4">Notas por Competência</h3>
              
              {/* Grid 5 competências + nota final */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5].map((comp) => {
                  const nota = redacao[`nota_c${comp}` as keyof typeof redacao] as number | null;
                  return (
                    <div key={comp} className="text-center">
                      <div className="bg-white border border-primary/20 rounded-lg p-3">
                        <div className="text-xs text-primary/80 font-medium mb-1">C{comp}</div>
                        <div className="text-lg font-bold text-primary">
                          {nota !== null ? `${nota}/200` : '-/200'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Nota Final */}
                <div className="text-center col-span-2 sm:col-span-1">
                  <div className="bg-primary text-white rounded-lg p-3">
                    <div className="text-xs font-medium mb-1">Nota Final</div>
                    <div className="text-lg font-bold">
                      {redacao.nota_total !== null ? `${redacao.nota_total}/1000` : '-/1000'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comentários - apenas competências com comentários */}
            {comentariosPedagogicos.length > 0 && (
              <>
                <Separator className="bg-primary/20" />
                <div>
                  <h3 className="font-semibold text-primary mb-4">Comentários</h3>
                  <div className="space-y-3">
                    {comentariosPedagogicos.map(({ competencia, comentario1, comentario2 }) => (
                      <div key={competencia} className="bg-white border border-primary/20 rounded-lg p-4">
                        <h4 className="font-medium text-primary mb-3">C{competencia}</h4>
                        {comentario1 && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-700">{comentario1}</p>
                          </div>
                        )}
                        {comentario2 && (
                          <div>
                            <p className="text-sm text-gray-700">{comentario2}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Elogios e pontos de atenção */}
            {(elogios1 || elogios2) && (
              <>
                <Separator className="bg-primary/20" />
                <div>
                  <h3 className="font-semibold text-primary mb-4">Elogios e Pontos de Atenção</h3>
                  <div className="space-y-3">
                    {elogios1 && (
                      <div className="bg-white border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-gray-700">{elogios1}</p>
                      </div>
                    )}
                    {elogios2 && (
                      <div className="bg-white border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-gray-700">{elogios2}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Comentário do admin (legado) */}
            {redacao.comentario_admin && (
              <>
                <Separator className="bg-primary/20" />
                <div>
                  <h3 className="font-semibold text-primary mb-4">Comentário Geral</h3>
                  <div className="bg-white border border-primary/20 rounded-lg p-4">
                    <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {redacao.comentario_admin}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
