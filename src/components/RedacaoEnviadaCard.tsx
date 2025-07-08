
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
                  ✅ Corrigido
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  ⏳ Aguardando
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

      {/* Texto da redação - otimizado para mobile */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <FileText className="w-5 h-5" />
            Texto da Redação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg border min-h-[200px]">
            {redacao.redacao_manuscrita_url ? (
              <div className="flex flex-col items-center">
                <img 
                  src={redacao.redacao_manuscrita_url} 
                  alt="Redação manuscrita" 
                  className="w-full h-auto rounded-md max-h-[80vh] object-contain"
                />
              </div>
            ) : redacao.redacao_texto ? (
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-gray-800">
                {redacao.redacao_texto}
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Texto da redação não disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Correção (se disponível) - layout mobile otimizado */}
      {redacao.corrigida && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Star className="w-5 h-5" />
                Correção Detalhada
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                {redacao.data_correcao && (
                  <div className="flex items-center gap-2 text-sm text-primary/80">
                    <Clock className="w-4 h-4" />
                    Corrigido em: {formatDate(redacao.data_correcao)}
                  </div>
                )}
                {/* Botões de download da correção externa */}
                {(correcao1 || correcao2) && (
                  <div className="flex gap-2">
                    {correcao1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(correcao1, '_blank')}
                         className="flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Download className="w-3 h-3" />
                        Baixar Correção
                      </Button>
                    )}
                    {correcao2 && !correcao1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(correcao2, '_blank')}
                        className="flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Download className="w-3 h-3" />
                        Baixar Correção
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6">
            {/* Notas por competência - grid responsivo */}
            <div>
               <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Notas por Competência
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Primeira linha: C1, C2, C3 */}
                {[1, 2, 3].map((comp) => {
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
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Segunda linha: C4, C5, Nota Total */}
                {[4, 5].map((comp) => {
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
                
                {/* Nota total com mesmo estilo das competências */}
                {redacao.nota_total !== null && (
                  <div className="text-center">
                    <div className="bg-primary text-white rounded-lg p-3">
                      <div className="text-xs font-medium mb-1">Total</div>
                      <div className="text-lg font-bold">{redacao.nota_total}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comentários pedagógicos por competência */}
            {comentariosPedagogicos.length > 0 && (
              <>
                 <Separator className="bg-primary/20" />
                <div>
                   <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentários Pedagógicos por Competência
                  </h3>
                   <div className="space-y-4">
                     {comentariosPedagogicos.map(({ competencia, comentario1, comentario2 }) => {
                       const cores = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];
                       const corCompetencia = cores[competencia - 1];
                       return (
                       <div key={competencia} className="bg-white border rounded-lg p-4" style={{ borderColor: corCompetencia + '40' }}>
                         <div className="flex items-center gap-2 mb-2">
                           <div 
                             className="w-4 h-4 rounded-full" 
                             style={{ backgroundColor: corCompetencia }}
                           />
                           <h4 className="font-medium text-gray-800">
                             Competência {competencia}
                           </h4>
                         </div>
                        {comentario1 && (
                          <div className="mb-2">
                             <span className="text-xs text-primary/80 font-medium">Corretor 1:</span>
                            <p className="text-sm text-gray-700 mt-1">{comentario1}</p>
                          </div>
                        )}
                        {comentario2 && (
                          <div>
                             <span className="text-xs text-primary/80 font-medium">Corretor 2:</span>
                            <p className="text-sm text-gray-700 mt-1">{comentario2}</p>
                          </div>
                        )}
                       </div>
                       );
                     })}
                  </div>
                </div>
              </>
            )}

            {/* Elogios e pontos de atenção */}
            {(elogios1 || elogios2) && (
              <>
                 <Separator className="bg-primary/20" />
                <div>
                   <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Elogios e Pontos de Atenção
                  </h3>
                  <div className="space-y-3">
                    {elogios1 && (
                       <div className="bg-white border border-primary/20 rounded-lg p-4">
                         <span className="text-xs text-primary/80 font-medium">Corretor 1:</span>
                        <p className="text-sm text-gray-700 mt-1">{elogios1}</p>
                      </div>
                    )}
                    {elogios2 && (
                       <div className="bg-white border border-primary/20 rounded-lg p-4">
                         <span className="text-xs text-primary/80 font-medium">Corretor 2:</span>
                        <p className="text-sm text-gray-700 mt-1">{elogios2}</p>
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
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentário Geral
                  </h3>
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
