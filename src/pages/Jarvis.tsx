import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useJarvis } from "@/hooks/useJarvis";
import { useJarvisHistorico } from "@/hooks/useJarvisHistorico";
import { useJarvisModos } from "@/hooks/useJarvisModos";
import type { CampoResposta } from "@/hooks/useJarvisModos";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { TutoriaView } from "@/components/tutoria/TutoriaView";
import {
  Loader2, Copy, CheckCircle2, AlertCircle, FileEdit,
  Sparkles, Lock, History, ChevronDown, ChevronUp,
  Mic, MicOff, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ── Mapa de cores para cards de resposta ─────────────────────────
const COR_CLASSES: Record<string, { border: string; bg: string; title: string }> = {
  blue:   { border: 'border-blue-500',   bg: 'bg-blue-50',   title: 'text-blue-700'   },
  purple: { border: 'border-purple-500', bg: 'bg-purple-50', title: 'text-purple-700' },
  green:  { border: 'border-green-500',  bg: 'bg-green-50',  title: 'text-green-700'  },
  amber:  { border: 'border-amber-500',  bg: 'bg-amber-50',  title: 'text-amber-700'  },
  gray:   { border: 'border-gray-400',   bg: 'bg-gray-50',   title: 'text-gray-600'   },
};

const COR_ICON: Record<string, React.ElementType> = {
  blue:   AlertCircle,
  purple: FileEdit,
  green:  CheckCircle2,
  amber:  AlertCircle,
  gray:   FileEdit,
};

// ── Card genérico de resposta ─────────────────────────────────────
const CardResposta = ({
  campo,
  valor,
  onCopy,
}: {
  campo: CampoResposta;
  valor: string;
  onCopy: (texto: string) => void;
}) => {
  const cor = campo.cor ?? 'gray';
  const classes = COR_CLASSES[cor] ?? COR_CLASSES.gray;
  const Icon = COR_ICON[cor] ?? FileEdit;

  return (
    <div className={`border-l-4 ${classes.border} ${classes.bg} p-4 rounded-r`}>
      <h4 className={`font-semibold ${classes.title} flex items-center gap-2 mb-2 text-sm`}>
        <Icon className="w-4 h-4" />
        {campo.rotulo}
      </h4>
      <div className="space-y-1">
        {(typeof valor === 'string' ? valor : typeof valor === 'object' && valor !== null ? JSON.stringify(valor, null, 2) : String(valor ?? ''))
          .split(/\n|(?=Erro\s+\d+:)/).filter(l => l.trim()).map((linha, i) => (
          <p key={i} className="text-sm text-gray-700">{linha}</p>
        ))}
      </div>
      {campo.copiavel && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(valor)}
          className={`mt-3 border-current ${classes.title} hover:opacity-80 h-7 text-xs`}
        >
          <Copy className="w-3 h-3 mr-1" />
          Copiar
        </Button>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────
const Jarvis = () => {
  usePageTitle("Jarvis - Assistente de Escrita");
  const { studentData } = useStudentAuth();
  const { toast } = useToast();

  // activeView: ID de um modo (string) ou 'historico'
  const [activeView, setActiveView] = useState<string>('');
  const [textoInput, setTextoInput] = useState("");
  const [wordCount,  setWordCount]  = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [disponivel,               setDisponivel]               = useState(true);
  const [mensagemIndisponibilidade, setMensagemIndisponibilidade] = useState("");
  const [loadingDisponibilidade,   setLoadingDisponibilidade]   = useState(true);
  const [valorPorInteracao,        setValorPorInteracao]        = useState<number | null>(null);
  const [mensagemSemCreditos,      setMensagemSemCreditos]      = useState("Você não possui créditos disponíveis para usar o Jarvis.");
  const [modalSemCreditos,         setModalSemCreditos]         = useState(false);

  const {
    analisar, isLoading, currentResponse, currentModo, currentMetadata, credits, clearResponse,
  } = useJarvis(studentData?.email || "");

  const { historico, loading: loadingHistorico, refreshHistorico } =
    useJarvisHistorico(studentData?.email || "");

  const { modos, loading: loadingModos } = useJarvisModos();

  const resultRef = useRef<HTMLDivElement>(null);
  const showResult = !!currentResponse && !isLoading;

  // Seleciona o primeiro modo ao carregar
  useEffect(() => {
    if (modos.length > 0 && !activeView) {
      setActiveView(modos[0].id);
    }
  }, [modos, activeView]);

  // Verificar disponibilidade
  useEffect(() => {
    const verificar = async () => {
      try {
        setLoadingDisponibilidade(true);

        const { data: msgs } = await supabase
          .from('jarvis_system_config')
          .select('chave, valor')
          .in('chave', ['mensagem_sistema', 'mensagem_sem_creditos']);

        const mensagemPadrao =
          msgs?.find(m => m.chave === 'mensagem_sistema')?.valor
          || 'Esta funcionalidade está temporariamente indisponível.';

        const msgSemCred =
          msgs?.find(m => m.chave === 'mensagem_sem_creditos')?.valor
          || 'Você não possui créditos disponíveis para usar o Jarvis.';

        setMensagemSemCreditos(msgSemCred);

        const { data, error } = await supabase
          .from('jarvis_config')
          .select('disponivel_alunos, mensagem_indisponibilidade, valor_por_interacao')
          .eq('ativo', true)
          .single();

        if (error) {
          setDisponivel(false);
          setMensagemIndisponibilidade(mensagemPadrao);
          return;
        }

        if (data) {
          setDisponivel(data.disponivel_alunos);
          setMensagemIndisponibilidade(mensagemPadrao);
          setValorPorInteracao(data.valor_por_interacao ?? null);
        }
      } catch {
        setDisponivel(false);
        setMensagemIndisponibilidade('Erro ao carregar configurações.');
      } finally {
        setLoadingDisponibilidade(false);
      }
    };
    verificar();
  }, []);

  // Scroll automático para o resultado ao exibir resposta
  useEffect(() => {
    if (showResult) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResult]);

  const handleTextoChange = (texto: string) => {
    setTextoInput(texto);
    const palavras = texto.trim().split(/\s+/).filter(p => p.length > 0).length;
    setWordCount(texto.trim() ? palavras : 0);
  };

  const { isRecording, isSupported, toggleRecording, stopRecording } =
    useVoiceTranscription(handleTextoChange, textoInput);

  const handleLimparTexto = () => {
    stopRecording();
    handleTextoChange("");
  };

  const modoAtivo = modos.find(m => m.id === activeView) ?? null;
  const isHistorico = activeView === 'historico';

  const handleModoClick = (modoId: string) => {
    setActiveView(modoId);
    clearResponse();
  };

  const handleSubmit = async () => {
    stopRecording();
    if (credits < 1) {
      setModalSemCreditos(true);
      return;
    }
    if (!textoInput.trim()) {
      toast({ title: "Texto vazio", description: "Digite algo para continuar", variant: "destructive" });
      return;
    }
    if (!modoAtivo) {
      toast({ title: "Selecione um modo", description: "Escolha uma ação antes de acionar o Jarvis", variant: "destructive" });
      return;
    }
    const result = await analisar(textoInput, modoAtivo.id);
    if (result) {
      setTextoInput("");
      setWordCount(0);
      refreshHistorico();
    }
  };

  const handleCopyText = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast({
      title: "Texto copiado!",
      description: "O texto foi copiado para a área de transferência",
      className: "border-green-200 bg-green-50 text-green-900",
    });
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const truncateText = (text: string, max = 90) =>
    text.length <= max ? text : text.substring(0, max) + '...';

  const resolverCampos = (item: typeof historico[number]): CampoResposta[] => {
    if (item.modo_campos_resposta && item.modo_campos_resposta.length > 0) {
      return item.modo_campos_resposta;
    }
    return [
      { chave: 'diagnostico',        rotulo: 'Diagnóstico',    cor: 'blue'   },
      { chave: 'sugestao_reescrita', rotulo: 'Como Melhorar',  cor: 'purple' },
      { chave: 'versao_melhorada',   rotulo: 'Versão Lapidada', cor: 'green', copiavel: true },
    ];
  };

  const resolverValorHistorico = (item: typeof historico[number], chave: string): string => {
    if (item.resposta_json && item.resposta_json[chave]) return item.resposta_json[chave];
    if (chave === 'diagnostico')        return item.diagnostico        ?? '';
    if (chave === 'sugestao_reescrita') return item.sugestao_reescrita ?? '';
    if (chave === 'versao_melhorada')   return item.versao_melhorada   ?? '';
    return '';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Jarvis - Assistente de Escrita" />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <JarvisIcon size={56} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Jarvis</h1>
                <p className="text-sm text-gray-500">Assistente Pedagógico de Escrita</p>
              </div>
            </div>
          </div>

          {loadingDisponibilidade ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !disponivel ? (
            <Alert className="border-amber-200 bg-amber-50">
              <Lock className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <p className="whitespace-pre-line">{mensagemIndisponibilidade}</p>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* ── Navegação: modos + histórico ── */}
              <div className="flex items-center gap-2 p-4 border-b border-gray-100 overflow-x-auto">
                {loadingModos ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                ) : (
                  <>
                    {modos.map((modo) => (
                      <button
                        key={modo.id}
                        type="button"
                        onClick={() => handleModoClick(modo.id)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                          activeView === modo.id
                            ? "bg-indigo-700 text-white"
                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-700 hover:text-white"
                        )}
                      >
                        {modo.label}
                      </button>
                    ))}

                    {/* Separador visual */}
                    <div className="flex-1" />

                    <button
                      type="button"
                      onClick={() => setActiveView('historico')}
                      className={cn(
                        "px-3 sm:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                        isHistorico
                          ? "bg-indigo-700 text-white"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-700 hover:text-white"
                      )}
                    >
                      <History className="w-4 h-4" />
                      <span className="hidden sm:inline">Histórico</span>
                    </button>
                  </>
                )}
              </div>

              <div className="p-6">

                {/* ════════════════════════════════
                    VIEW: Modo ativo (entrada ou resultado)
                ════════════════════════════════ */}
                {!isHistorico && modoAtivo && (
                  <>
                    {/* RENDERIZAÇÃO CONDICIONAL: Modo Simples vs Modo Interativo */}
                    {modoAtivo.tipo_modo === 'interativo' ? (
                      <TutoriaView modo={modoAtivo} userEmail={studentData?.email || ''} />
                    ) : (
                      /* Modo Simples (comportamento atual - INTOCADO) */
                      <div className="space-y-4">

                    {/* ── Bloco de entrada — visível quando não há resultado ── */}
                    {!showResult && (
                      <>
                        {/* Textarea com microfone */}
                        <div className="relative">
                          <Textarea
                            placeholder="Cole ou digite seu texto aqui..."
                            value={textoInput}
                            onChange={(e) => handleTextoChange(e.target.value)}
                            rows={10}
                            className="resize-none text-base pb-10"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={toggleRecording}
                            disabled={!isSupported || isLoading}
                            title={
                              !isSupported
                                ? "Seu navegador não suporta reconhecimento de voz"
                                : isRecording
                                ? "Parar gravação"
                                : "Ditar texto por voz"
                            }
                            className={cn(
                              "absolute bottom-2 right-2 p-2 rounded-full transition-colors",
                              isRecording
                                ? "bg-red-100 text-red-600 animate-pulse hover:bg-red-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600",
                              (!isSupported || isLoading) && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                        </div>

                        {isRecording && (
                          <p className="text-xs text-red-500 font-medium animate-pulse">
                            Jarvis está ouvindo...
                          </p>
                        )}

                        {/* Barra de ações */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "text-sm font-medium",
                              wordCount > 500 ? 'text-red-600' :
                              wordCount > 400 ? 'text-amber-600' : 'text-gray-500'
                            )}>
                              {wordCount}/500 palavras
                            </span>
                            {textoInput && (
                              <button
                                type="button"
                                onClick={handleLimparTexto}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Limpar texto
                              </button>
                            )}
                          </div>

                          <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !textoInput.trim() || wordCount > 500}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {isLoading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-4 w-4" />Acionar Jarvis</>
                            )}
                          </Button>
                        </div>
                      </>
                    )}

                    {/* ── Bloco de resultado — ocupa o primeiro plano após resposta ── */}
                    {showResult && currentModo && (
                      <div ref={resultRef} className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Resultado — {currentModo.label}
                          </p>
                          <button
                            type="button"
                            onClick={clearResponse}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Fechar
                          </button>
                        </div>

                        {currentModo.campos_resposta.map((campo) => (
                          <CardResposta
                            key={campo.chave}
                            campo={campo}
                            valor={currentResponse[campo.chave] ?? ''}
                            onCopy={handleCopyText}
                          />
                        ))}

                        {currentMetadata && (
                          <p className="text-xs text-gray-400">
                            Original: {currentMetadata.palavras_original} palavras
                            {currentMetadata.palavras_melhorada != null && (
                              <> · Resposta: {currentMetadata.palavras_melhorada} palavras</>
                            )}
                          </p>
                        )}

                        <Button
                          variant="outline"
                          onClick={clearResponse}
                          className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Nova interação
                        </Button>
                      </div>
                    )}

                    {/* ── Créditos — sempre visíveis ── */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <span className="text-3xl font-bold text-indigo-600">{credits}</span>
                      <div className="leading-tight">
                        <p className="text-sm font-medium text-gray-700">Seus créditos</p>
                        <p className="text-xs text-gray-400">Cada interação consome 1 crédito</p>
                        {valorPorInteracao !== null && valorPorInteracao > 0 && (
                          <p className="text-xs text-gray-400">
                            Valor por interação: R$ {valorPorInteracao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
                    )}
                  </>
                )}

                {/* ════════════════════════════════
                    VIEW: Histórico
                ════════════════════════════════ */}
                {isHistorico && (
                  <div className="space-y-3">
                    {loadingHistorico ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                      </div>
                    ) : historico.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhuma análise realizada ainda.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {historico.map((item) => {
                          const campos = resolverCampos(item);
                          // Detectar se é tutoria
                          const isTutoria = item.subtab_nome && item.etapa;
                          const isGeracaoTutoria = isTutoria && item.etapa === 'geracao';

                          // Para tutoria + geração: mostrar texto gerado
                          // Para outros: mostrar texto original
                          const textoPreview = isGeracaoTutoria && item.versao_melhorada
                            ? item.versao_melhorada
                            : item.texto_original;

                          // Label da etapa de tutoria
                          const etapaLabel = isTutoria
                            ? item.etapa === 'geracao' ? '📝 Texto Gerado'
                              : item.etapa === 'validacao' ? '✓ Validação'
                              : item.etapa === 'sugestoes' ? '💡 Sugestões'
                              : item.etapa
                            : null;

                          // Palavras (para geração de tutoria, usar palavras_melhorada)
                          const palavrasExibir = isGeracaoTutoria && item.palavras_melhorada
                            ? item.palavras_melhorada
                            : item.palavras_original;

                          return (
                            <div key={item.id} className="py-3">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() =>
                                  setExpandedId(expandedId === item.id ? null : item.id)
                                }
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700">
                                      {truncateText(textoPreview)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {item.modo_label && (
                                        <span className="inline-block text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                                          {item.modo_label}
                                        </span>
                                      )}
                                      {etapaLabel && (
                                        <span className="inline-block text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                          {etapaLabel}
                                        </span>
                                      )}
                                      {isTutoria && item.creditos_consumidos > 0 && (
                                        <span className="inline-block text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                          💳 {item.creditos_consumidos} créditos
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                                    <span>{palavrasExibir} palavras</span>
                                    <span>{formatDate(item.created_at)}</span>
                                    {expandedId === item.id
                                      ? <ChevronUp className="w-4 h-4" />
                                      : <ChevronDown className="w-4 h-4" />
                                    }
                                  </div>
                                </div>
                              </button>

                              {expandedId === item.id && (
                                <div className="mt-4 space-y-3">
                                  {campos.map((campo) => {
                                    const valor = resolverValorHistorico(item, campo.chave);
                                    if (!valor) return null;
                                    return (
                                      <CardResposta
                                        key={campo.chave}
                                        campo={campo}
                                        valor={valor}
                                        onCopy={handleCopyText}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: aluno sem créditos */}
      <AlertDialog open={modalSemCreditos} onOpenChange={setModalSemCreditos}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Créditos insuficientes</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line text-sm">
              {mensagemSemCreditos}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setModalSemCreditos(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
};

export default Jarvis;
