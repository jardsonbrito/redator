
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, MessageSquare, Volume2, X, AlertTriangle } from "lucide-react";
import { RedacaoAnotacaoVisual } from "./corretor/RedacaoAnotacaoVisual";
import { TextoRedacaoComMarcacoes } from "./TextoRedacaoComMarcacoes";
import { AudioPlayerAluno } from "./AudioPlayerAluno";
import { useToast } from "@/hooks/use-toast";
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

const COMP_COLORS: Record<number, string> = {
  1: 'bg-red-600',
  2: 'bg-green-600',
  3: 'bg-blue-600',
  4: 'bg-orange-500',
  5: 'bg-purple-600',
};

interface RedacaoEnviadaCardProps {
  redacao: {
    id: string;
    frase_tematica: string;
    redacao_texto: string;
    redacao_manuscrita_url?: string | null;
    redacao_imagem_gerada_url?: string | null;
    data_envio: string;
    nota_c1?: number | null;
    nota_c2?: number | null;
    nota_c3?: number | null;
    nota_c4?: number | null;
    nota_c5?: number | null;
    nota_total?: number | null;
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
    corretor_id_real?: string | null;
    original_id?: string;
    c1_corretor_1?: number | null;
    c1_corretor_2?: number | null;
    processo_seletivo_candidato_id?: string | null;
  };
  onRedacaoCanceled?: () => void;
}

export const RedacaoEnviadaCard = ({
  redacao,
  onRedacaoCanceled
}: RedacaoEnviadaCardProps) => {
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  const { cancelRedacao, cancelRedacaoProcessoSeletivo, canCancelRedacao, getCreditosACancelar, loading: cancelLoading } = useCancelRedacao({
    onSuccess: () => {
      onRedacaoCanceled?.();
    }
  });

  const handleCancelRedacao = () => {
    if (redacao.tipo_envio === 'processo_seletivo' && redacao.processo_seletivo_candidato_id) {
      cancelRedacaoProcessoSeletivo(redacao.id, redacao.email_aluno, redacao.processo_seletivo_candidato_id);
    } else {
      cancelRedacao(redacao.id, redacao.email_aluno);
    }
  };

  const shouldShowScores = (r: typeof redacao) => {
    if (r.tipo_envio === 'simulado') {
      const temTodasNotas = [1, 2, 3, 4, 5].every(comp => {
        const nota = r[`nota_c${comp}` as keyof typeof r];
        return nota !== null && nota !== undefined;
      });
      return temTodasNotas || (r.nota_total !== null && r.nota_total !== undefined);
    }
    return true;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      regular: 'Regular', exercicio: 'Exercício', simulado: 'Simulado',
      visitante: 'Avulsa', processo_seletivo: 'Processo Seletivo'
    };
    return tipos[tipo] || tipo;
  };

  const getComentariosPedagogicos = () => {
    const comentarios = [];
    for (let i = 1; i <= 5; i++) {
      const c1 = redacao[`comentario_c${i}_corretor_1` as keyof typeof redacao] as string | null;
      const c2 = redacao[`comentario_c${i}_corretor_2` as keyof typeof redacao] as string | null;
      if (c1?.trim() || c2?.trim()) {
        comentarios.push({ competencia: i, comentario1: c1?.trim() || null, comentario2: c2?.trim() || null });
      }
    }
    return comentarios;
  };

  const getElogiosEPontosAtencao = () => {
    if (redacao.corretor_numero === 1) return redacao.elogios_pontos_atencao_corretor_1?.trim() || null;
    if (redacao.corretor_numero === 2) return redacao.elogios_pontos_atencao_corretor_2?.trim() || null;
    return redacao.elogios_pontos_atencao_corretor_1?.trim() || redacao.elogios_pontos_atencao_corretor_2?.trim() || null;
  };

  const getCorrecaoExterna = () => ({
    correcao1: redacao.correcao_arquivo_url_corretor_1?.trim(),
    correcao2: redacao.correcao_arquivo_url_corretor_2?.trim(),
  });

  const comentariosPedagogicos = getComentariosPedagogicos();
  const relatorioPedagogico = getElogiosEPontosAtencao();
  const { correcao1, correcao2 } = getCorrecaoExterna();

  // Resolução do áudio
  let audioUrl: string | null = null;
  let corretorNomeAudio = redacao.corretor || "Corretor";
  if (redacao.corretor_numero === 1 && redacao.audio_url_corretor_1) {
    audioUrl = redacao.audio_url_corretor_1;
  } else if (redacao.corretor_numero === 2 && redacao.audio_url_corretor_2) {
    audioUrl = redacao.audio_url_corretor_2;
  } else if (redacao.audio_url_corretor_1) {
    audioUrl = redacao.audio_url_corretor_1;
  } else if (redacao.audio_url_corretor_2) {
    audioUrl = redacao.audio_url_corretor_2;
  } else if (redacao.audio_url) {
    audioUrl = redacao.audio_url;
  }

  const temCorrecaoExterna = correcao1 || correcao2;

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ===== HEADER PREMIUM ===== */}
      <div className="bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {redacao.tipo_envio !== 'simulado' && (
                  <Badge className="bg-white/15 text-white border-white/25 text-xs">{getTipoEnvioLabel(redacao.tipo_envio)}</Badge>
                )}
                {redacao.status === 'em_correcao' && (
                  <Badge className="bg-orange-400/30 text-orange-100 border-orange-300/30 text-xs">Em correção</Badge>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-black leading-snug">{redacao.frase_tematica}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-white/65 text-xs sm:text-sm">
                {redacao.nome_aluno && <span>{redacao.nome_aluno}</span>}
                {redacao.turma && <span>• {redacao.turma}</span>}
                {redacao.tipo_envio !== 'simulado' && (
                  <span>• {formatDate(redacao.data_envio)}</span>
                )}
                {redacao.corretor && <span>• {redacao.corretor}</span>}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2.5 shrink-0">
              {redacao.corrigida && redacao.nota_total != null && (
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-0.5">Nota final</div>
                  <div className="text-3xl font-black tabular-nums leading-none">
                    {redacao.nota_total}
                    <span className="text-sm font-medium text-white/50 ml-1">/ 1000</span>
                  </div>
                </div>
              )}
              {canCancelRedacao(redacao) && redacao.tipo_envio !== 'simulado' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/15 text-xs border border-white/25 h-7 px-2"
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
                        <p className="font-medium"><strong>Tema:</strong> {redacao.frase_tematica}</p>
                        <p className="text-sm text-gray-600"><strong>Tipo:</strong> {getTipoEnvioLabel(redacao.tipo_envio)}</p>
                        {getCreditosACancelar(redacao.tipo_envio) > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                            <p className="text-green-800 text-sm">
                              ✅ <strong>{getCreditosACancelar(redacao.tipo_envio)} crédito(s)</strong> serão devolvidos à sua conta.
                            </p>
                          </div>
                        )}
                        {redacao.tipo_envio === 'processo_seletivo' && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
                            <p className="text-amber-800 text-sm">
                              <strong>Atenção:</strong> Ao cancelar, você voltará para a etapa de envio e poderá enviar
                              uma nova redação <strong>apenas se ainda estiver dentro da janela de tempo</strong>.
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
                        onClick={handleCancelRedacao}
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
        </div>
      </div>

      {/* ===== CARDS DE NOTA POR COMPETÊNCIA ===== */}
      {redacao.corrigida && shouldShowScores(redacao) && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map(comp => {
            const nota = redacao[`nota_c${comp}` as keyof typeof redacao] as number | null;
            const bg = COMP_COLORS[comp];
            const pct = nota != null ? Math.min((nota / 200) * 100, 100) : 0;
            return (
              <div key={comp} className={`${bg} text-white rounded-xl p-3 text-center shadow-md`}>
                <div className="text-xs font-semibold opacity-80 mb-0.5">C{comp}</div>
                <div className="text-2xl font-black tabular-nums">{nota ?? '–'}</div>
                <div className="text-[10px] opacity-55 mt-0.5">/ 200</div>
                {nota != null && (
                  <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== REDAÇÃO ===== */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="bg-gray-50 rounded-lg border min-h-[200px] overflow-hidden">
            {(() => {
              const redacaoFoiManuscrita = redacao.redacao_manuscrita_url;
              const redacaoTemImagemGerada = redacao.redacao_imagem_gerada_url;

              if (temCorrecaoExterna && redacaoFoiManuscrita) {
                const urlCorrecao = correcao1 || correcao2;
                return (
                  <div className="flex flex-col items-center p-2">
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

              if ((redacaoFoiManuscrita || redacaoTemImagemGerada) && redacao.corrigida) {
                const imagemParaExibir = redacaoTemImagemGerada || redacao.redacao_manuscrita_url;
                return (
                  <RedacaoAnotacaoVisual
                    imagemUrl={imagemParaExibir as string}
                    redacaoId={redacao.original_id || redacao.id.replace('-corretor1', '').replace('-corretor2', '')}
                    corretorId={
                      redacao.tipo_envio === 'simulado'
                        ? (redacao.corretor_numero === 1 ? redacao.corretor_id_1 : redacao.corretor_numero === 2 ? redacao.corretor_id_2 : null)
                        : (redacao.corretor_id_real || redacao.corretor_id_1 || redacao.corretor_id_2 || null)
                    }
                    readonly
                    ehCorretor1={redacao.tipo_envio === 'simulado' && redacao.corretor_numero === 1}
                    ehCorretor2={redacao.tipo_envio === 'simulado' && redacao.corretor_numero === 2}
                    tipoTabela={
                      redacao.tipo_envio === 'simulado' ? 'redacoes_simulado' :
                      redacao.tipo_envio === 'exercicio' ? 'redacoes_exercicio' :
                      'redacoes_enviadas'
                    }
                    statusMinhaCorrecao={redacao.corrigida ? 'corrigida' : redacao.status === 'corrigida' ? 'corrigida' : 'pendente'}
                  />
                );
              }

              if (redacaoFoiManuscrita && !redacao.corrigida) {
                return (
                  <div className="flex flex-col items-center p-2">
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
                        }}
                      />
                    )}
                  </div>
                );
              }

              if (!redacaoFoiManuscrita) {
                return (
                  <div className="p-4 space-y-4">
                    {redacao.redacao_texto?.trim() ? (
                      <div className="prose max-w-none text-sm sm:text-base text-gray-800 p-3 bg-white rounded border">
                        <TextoRedacaoComMarcacoes
                          redacaoId={redacao.id}
                          texto={redacao.redacao_texto}
                          className="text-sm sm:text-base"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Conteúdo da redação não disponível</p>
                    )}
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

              return <p className="p-4 text-sm text-gray-500 italic">Conteúdo da redação não disponível</p>;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* ===== ÁUDIO DO CORRETOR ===== */}
      {audioUrl && (
        <Card className="border shadow-sm bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <Volume2 className="w-5 h-5" />
              Comentário em áudio — {corretorNomeAudio}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <AudioPlayerAluno
              audioUrl={audioUrl}
              corretorNome={corretorNomeAudio}
              isStudentView={true}
            />
          </CardContent>
        </Card>
      )}

      {/* ===== MENSAGEM PEDAGÓGICA ===== */}
      {redacao.corrigida && (relatorioPedagogico || (redacao.comentario_admin && typeof redacao.comentario_admin === 'string' && redacao.comentario_admin.trim())) && (
        <Card className="border shadow-sm bg-violet-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-violet-900">
              <MessageSquare className="w-5 h-5" />
              {redacao.corretor
                ? `Mensagem pedagógica – ${redacao.corretor}`
                : 'Mensagem pedagógica do corretor'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {!redacao.corretor_numero && redacao.comentario_admin && typeof redacao.comentario_admin === 'string' && redacao.comentario_admin.trim() && (
              <div className="bg-white border border-violet-100 rounded-lg p-4">
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {redacao.comentario_admin}
                </p>
              </div>
            )}
            {relatorioPedagogico && (
              <div className="bg-white border border-violet-100 rounded-lg p-4">
                <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {relatorioPedagogico}
                </p>
              </div>
            )}
            {studentData?.userType !== 'aluno' && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({ title: "Download iniciado", description: "A correção completa será baixada em breve." })}
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

      {/* ===== COMENTÁRIOS POR COMPETÊNCIA (simulados) ===== */}
      {redacao.corrigida && redacao.tipo_envio === 'simulado' && comentariosPedagogicos.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-800">Comentários por Competência</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {comentariosPedagogicos.map((item) => {
              const bg = COMP_COLORS[item.competencia];
              return (
                <div key={item.competencia} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className={`${bg} text-white px-4 py-2 text-sm font-semibold`}>
                    Competência {item.competencia}
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    {item.comentario1 && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">
                          {redacao.corretor_numero === 1 ? 'Seu corretor:' : 'Corretor 1:'}
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                          {item.comentario1}
                        </p>
                      </div>
                    )}
                    {item.comentario2 && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">
                          {redacao.corretor_numero === 2 ? 'Seu corretor:' : 'Corretor 2:'}
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border-l-4 border-green-400">
                          {item.comentario2}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
