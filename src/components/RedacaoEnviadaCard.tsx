
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, FileText, Star, MessageSquare, Clock } from "lucide-react";

interface RedacaoEnviadaCardProps {
  redacao: {
    id: string;
    frase_tematica: string;
    redacao_texto: string;
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
  };
  showStudentInfo?: boolean; // New prop to control student info display
}

export const RedacaoEnviadaCard = ({ redacao, showStudentInfo = true }: RedacaoEnviadaCardProps) => {
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

  const comentariosPedagogicos = getComentariosPedagogicos();
  const { elogios1, elogios2 } = getElogiosEPontosAtencao();

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
        
        {showStudentInfo && (
          <CardContent className="pt-0">
            {/* Informações do aluno - layout mobile melhorado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">Enviado:</span>
                <span className="text-xs sm:text-sm">{formatDate(redacao.data_envio)}</span>
              </div>
              {redacao.data_correcao && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">Corrigido:</span>
                  <span className="text-xs sm:text-sm">{formatDate(redacao.data_correcao)}</span>
                </div>
              )}
            </div>
          </CardContent>
        )}
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
          <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-gray-800">
              {redacao.redacao_texto}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Correção (se disponível) - layout mobile otimizado */}
      {redacao.corrigida && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-green-800">
              <Star className="w-5 h-5" />
              Correção Detalhada
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6">
            {/* Notas por competência - grid responsivo */}
            <div>
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Notas por Competência
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((comp) => {
                  const nota = redacao[`nota_c${comp}` as keyof typeof redacao] as number | null;
                  return (
                    <div key={comp} className="text-center">
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <div className="text-xs text-green-600 font-medium mb-1">C{comp}</div>
                        <div className="text-lg font-bold text-green-800">
                          {nota !== null ? nota : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nota total - destaque */}
              {redacao.nota_total !== null && (
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-4 text-center">
                  <div className="text-sm font-medium mb-1">Nota Total</div>
                  <div className="text-2xl sm:text-3xl font-bold">{redacao.nota_total}</div>
                </div>
              )}
            </div>

            {/* Comentários pedagógicos por competência */}
            {comentariosPedagogicos.length > 0 && (
              <>
                <Separator className="bg-green-200" />
                <div>
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    💬 Comentários Pedagógicos por Competência
                  </h3>
                  <div className="space-y-4">
                    {comentariosPedagogicos.map(({ competencia, comentario1, comentario2 }) => (
                      <div key={competencia} className="bg-white border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">
                          Competência {competencia}
                        </h4>
                        {comentario1 && (
                          <div className="mb-2">
                            <span className="text-xs text-green-600 font-medium">📝 Corretor 1:</span>
                            <p className="text-sm text-gray-700 mt-1">{comentario1}</p>
                          </div>
                        )}
                        {comentario2 && (
                          <div>
                            <span className="text-xs text-green-600 font-medium">📝 Corretor 2:</span>
                            <p className="text-sm text-gray-700 mt-1">{comentario2}</p>
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
                <Separator className="bg-green-200" />
                <div>
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    🌟 Elogios e Pontos de Atenção
                  </h3>
                  <div className="space-y-3">
                    {elogios1 && (
                      <div className="bg-white border border-green-200 rounded-lg p-4">
                        <span className="text-xs text-green-600 font-medium">🎯 Corretor 1:</span>
                        <p className="text-sm text-gray-700 mt-1">{elogios1}</p>
                      </div>
                    )}
                    {elogios2 && (
                      <div className="bg-white border border-green-200 rounded-lg p-4">
                        <span className="text-xs text-green-600 font-medium">🎯 Corretor 2:</span>
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
                <Separator className="bg-green-200" />
                <div>
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentário Geral
                  </h3>
                  <div className="bg-white border border-green-200 rounded-lg p-4">
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
