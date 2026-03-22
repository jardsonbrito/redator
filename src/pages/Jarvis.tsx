import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useJarvis } from "@/hooks/useJarvis";
import { useJarvisHistorico } from "@/hooks/useJarvisHistorico";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import {
  Loader2, Copy, CheckCircle2, AlertCircle, FileEdit,
  Sparkles, Lock, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type JarvisView = 'novo-texto' | 'analise' | 'historico';

const VIEWS = [
  { id: 'novo-texto' as JarvisView, label: 'Novo texto',  icon: FileEdit  },
  { id: 'analise'    as JarvisView, label: 'Análise',     icon: Sparkles  },
  { id: 'historico'  as JarvisView, label: 'Histórico',   icon: History   },
];

const Jarvis = () => {
  usePageTitle("Jarvis - Assistente de Escrita");
  const { studentData } = useStudentAuth();
  const { toast } = useToast();

  const [activeView, setActiveView]   = useState<JarvisView>('novo-texto');
  const [textoInput, setTextoInput]   = useState("");
  const [wordCount,  setWordCount]    = useState(0);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const [disponivel,               setDisponivel]               = useState(true);
  const [mensagemIndisponibilidade, setMensagemIndisponibilidade] = useState("");
  const [loadingDisponibilidade,   setLoadingDisponibilidade]   = useState(true);

  const {
    analisar, isLoading, currentResponse, currentMetadata, credits, clearResponse,
  } = useJarvis(studentData?.email || "");

  const { historico, loading: loadingHistorico, refreshHistorico } =
    useJarvisHistorico(studentData?.email || "");

  // Verificar disponibilidade ao carregar
  useEffect(() => {
    const verificar = async () => {
      try {
        setLoadingDisponibilidade(true);

        const { data: msgData } = await supabase
          .from('jarvis_system_config')
          .select('valor')
          .eq('chave', 'mensagem_sistema')
          .single();

        const mensagemPadrao =
          msgData?.valor || 'Esta funcionalidade está temporariamente indisponível.';

        const { data, error } = await supabase
          .from('jarvis_config')
          .select('disponivel_alunos, mensagem_indisponibilidade')
          .eq('ativo', true)
          .single();

        if (error) {
          setDisponivel(false);
          setMensagemIndisponibilidade(mensagemPadrao);
          return;
        }

        if (data) {
          setDisponivel(data.disponivel_alunos);
          setMensagemIndisponibilidade(
            data.mensagem_indisponibilidade || 'Esta funcionalidade está temporariamente indisponível.'
          );
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

  const handleTextoChange = (texto: string) => {
    setTextoInput(texto);
    const palavras = texto.trim().split(/\s+/).filter(p => p.length > 0).length;
    setWordCount(texto.trim() ? palavras : 0);
  };

  const handleSubmit = async () => {
    if (!textoInput.trim()) {
      toast({ title: "Texto vazio", description: "Digite algo para análise", variant: "destructive" });
      return;
    }
    const result = await analisar(textoInput);
    if (result) {
      setTextoInput("");
      setWordCount(0);
      setActiveView('analise');
      refreshHistorico();
    }
  };

  const handleNovaAnalise = () => {
    setTextoInput("");
    setWordCount(0);
    clearResponse();
    setActiveView('novo-texto');
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

              {/* ── Chips de navegação ── */}
              <div className="flex gap-2 p-4 border-b border-gray-100 overflow-x-auto">
                {VIEWS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveView(id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                      activeView === id
                        ? "bg-indigo-700 text-white"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-700 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* ════════════════════════════════
                    VIEW: Novo texto
                ════════════════════════════════ */}
                {activeView === 'novo-texto' && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Cole ou digite seu texto aqui..."
                      value={textoInput}
                      onChange={(e) => handleTextoChange(e.target.value)}
                      rows={10}
                      className="resize-none text-base"
                      disabled={isLoading}
                    />

                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-sm font-medium",
                        wordCount > 500 ? 'text-red-600' :
                        wordCount > 400 ? 'text-amber-600' : 'text-gray-500'
                      )}>
                        {wordCount}/500 palavras
                      </span>

                      <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !textoInput.trim() || wordCount > 500 || credits < 1}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" />Obter Análise (1 crédito)</>
                        )}
                      </Button>
                    </div>

                    {/* Créditos + aviso discreto */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-indigo-600">{credits}</span>
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-gray-700">Seus créditos</p>
                          <p className="text-xs text-gray-400">Cada análise consome 1 crédito</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 max-w-xs text-right leading-relaxed">
                        O Jarvis mantém o sentido original do seu texto e propõe ajustes
                        para torná-lo mais claro, correto e adequado ao padrão ENEM.
                      </p>
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════
                    VIEW: Análise
                ════════════════════════════════ */}
                {activeView === 'analise' && (
                  <div className="space-y-5">
                    {currentResponse ? (
                      <>
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            Análise Pedagógica
                          </h3>
                          <Button onClick={handleNovaAnalise} variant="outline" size="sm">
                            Nova análise
                          </Button>
                        </div>

                        {/* Diagnóstico */}
                        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r">
                          <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-2 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Diagnóstico
                          </h4>
                          <div className="space-y-1">
                            {currentResponse.diagnostico
                              .split('\n')
                              .filter(l => l.trim())
                              .map((linha, i) => (
                                <p key={i} className="text-sm text-gray-700">{linha}</p>
                              ))}
                          </div>
                        </div>

                        {/* Como Melhorar */}
                        <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r">
                          <h4 className="font-semibold text-purple-700 flex items-center gap-2 mb-2 text-sm">
                            <FileEdit className="w-4 h-4" />
                            Como Melhorar
                          </h4>
                          <p className="text-sm text-gray-700">{currentResponse.sugestao_reescrita}</p>
                        </div>

                        {/* Versão Lapidada */}
                        <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r">
                          <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Versão Lapidada
                          </h4>
                          <p className="text-sm text-gray-700 italic mb-3">
                            "{currentResponse.versao_melhorada}"
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyText(currentResponse.versao_melhorada)}
                            className="border-green-500 text-green-700 hover:bg-green-100"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </Button>
                        </div>

                        {/* Metadados mínimos */}
                        {currentMetadata && (
                          <p className="text-xs text-gray-400">
                            Original: {currentMetadata.palavras_original} palavras
                            {' · '}
                            Lapidada: {currentMetadata.palavras_melhorada} palavras
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhuma análise em andamento.</p>
                        <Button
                          variant="link"
                          className="text-indigo-600 mt-1"
                          onClick={() => setActiveView('novo-texto')}
                        >
                          Ir para Novo texto
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ════════════════════════════════
                    VIEW: Histórico
                ════════════════════════════════ */}
                {activeView === 'historico' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                      <History className="w-4 h-4 text-indigo-600" />
                      Histórico de análises
                    </h3>

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
                        {historico.map((item) => (
                          <div key={item.id} className="py-3">
                            {/* Linha compacta clicável */}
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() =>
                                setExpandedId(expandedId === item.id ? null : item.id)
                              }
                            >
                              <div className="flex justify-between items-start gap-3">
                                <p className="text-sm text-gray-700 flex-1">
                                  {truncateText(item.texto_original)}
                                </p>
                                <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                                  <span>{item.palavras_original} palavras</span>
                                  <span>{formatDate(item.created_at)}</span>
                                  {expandedId === item.id
                                    ? <ChevronUp className="w-4 h-4" />
                                    : <ChevronDown className="w-4 h-4" />
                                  }
                                </div>
                              </div>
                            </button>

                            {/* Detalhe expandido */}
                            {expandedId === item.id && (
                              <div className="mt-4 space-y-3">
                                {/* Texto original */}
                                <div className="bg-gray-50 border border-gray-100 p-3 rounded">
                                  <p className="text-xs font-medium text-gray-400 mb-1">Texto original</p>
                                  <p className="text-sm text-gray-600">{item.texto_original}</p>
                                </div>

                                {/* Diagnóstico */}
                                <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r">
                                  <p className="text-xs font-semibold text-blue-700 mb-1">Diagnóstico</p>
                                  <div className="space-y-1">
                                    {item.diagnostico
                                      .split('\n')
                                      .filter(l => l.trim())
                                      .map((linha, i) => (
                                        <p key={i} className="text-sm text-gray-700">{linha}</p>
                                      ))}
                                  </div>
                                </div>

                                {/* Como Melhorar */}
                                <div className="border-l-4 border-purple-500 bg-purple-50 p-3 rounded-r">
                                  <p className="text-xs font-semibold text-purple-700 mb-1">Como Melhorar</p>
                                  <p className="text-sm text-gray-700">{item.sugestao_reescrita}</p>
                                </div>

                                {/* Versão Lapidada */}
                                <div className="border-l-4 border-green-500 bg-green-50 p-3 rounded-r">
                                  <p className="text-xs font-semibold text-green-700 mb-1">Versão Lapidada</p>
                                  <p className="text-sm text-gray-700 italic mb-2">
                                    "{item.versao_melhorada}"
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyText(item.versao_melhorada)}
                                    className="border-green-500 text-green-700 hover:bg-green-100 h-7 text-xs"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copiar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Jarvis;
