import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useJarvis, JarvisResponse } from "@/hooks/useJarvis";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { Loader2, Copy, CheckCircle2, AlertCircle, Lightbulb, FileEdit, Sparkles, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Jarvis = () => {
  usePageTitle("Jarvis - Assistente de Escrita");
  const { studentData } = useStudentAuth();
  const { toast } = useToast();

  const [textoInput, setTextoInput] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [disponivel, setDisponivel] = useState(true);
  const [mensagemIndisponibilidade, setMensagemIndisponibilidade] = useState("");
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(true);

  const {
    analisar,
    isLoading,
    currentResponse,
    currentMetadata,
    credits,
    clearResponse
  } = useJarvis(studentData?.email || "");

  // Verificar disponibilidade ao carregar
  useEffect(() => {
    const verificarDisponibilidade = async () => {
      try {
        setLoadingDisponibilidade(true);

        // Buscar mensagens do sistema primeiro
        const { data: systemMessages } = await supabase
          .from('jarvis_system_config')
          .select('chave, valor')
          .in('chave', ['mensagem_sem_config', 'mensagem_erro_verificacao']);

        const messages: any = {
          mensagem_sem_config: 'O Jarvis está sendo configurado pela equipe pedagógica. Em breve esta funcionalidade estará disponível!',
          mensagem_erro_verificacao: 'Não foi possível carregar o Jarvis no momento. Tente novamente em instantes.'
        };

        if (systemMessages && systemMessages.length > 0) {
          systemMessages.forEach(item => {
            messages[item.chave] = item.valor;
          });
        }

        // Verificar configuração ativa
        const { data, error } = await supabase
          .from('jarvis_config')
          .select('disponivel_alunos, mensagem_indisponibilidade')
          .eq('ativo', true)
          .single();

        if (error) {
          // Se não há configuração ativa (PGRST116), usar mensagem_sem_config
          // Para outros erros, usar mensagem_erro_verificacao
          setDisponivel(false);
          const mensagemFinal = error.code === 'PGRST116'
            ? messages.mensagem_sem_config
            : messages.mensagem_erro_verificacao;
          setMensagemIndisponibilidade(mensagemFinal);
          return;
        }

        if (data) {
          setDisponivel(data.disponivel_alunos);
          setMensagemIndisponibilidade(data.mensagem_indisponibilidade || 'Esta funcionalidade está temporariamente indisponível.');
        }
      } catch (error) {
        console.error('Erro inesperado:', error);
        setDisponivel(false);
        setMensagemIndisponibilidade('Erro ao carregar configurações.');
      } finally {
        setLoadingDisponibilidade(false);
      }
    };

    verificarDisponibilidade();
  }, []);

  const handleTextoChange = (texto: string) => {
    setTextoInput(texto);
    const palavras = texto.trim().split(/\s+/).filter(p => p.length > 0).length;
    setWordCount(texto.trim() ? palavras : 0);
  };

  const handleSubmit = async () => {
    if (!textoInput.trim()) {
      toast({
        title: "Texto vazio",
        description: "Digite algo para análise",
        variant: "destructive"
      });
      return;
    }

    await analisar(textoInput);
  };

  const handleCopyText = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast({
      title: "✅ Texto copiado!",
      description: "O texto foi copiado para a área de transferência",
      className: "border-green-200 bg-green-50 text-green-900"
    });
  };

  const handleNovaAnalise = () => {
    setTextoInput("");
    setWordCount(0);
    clearResponse();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Jarvis - Assistente de Escrita" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header com ícone */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <JarvisIcon size={80} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Jarvis
                </h1>
                <p className="text-gray-600">
                  Assistente Pedagógico de Escrita
                </p>
              </div>
            </div>
          </div>

          {/* Mensagem de indisponibilidade */}
          {loadingDisponibilidade ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !disponivel ? (
            <div className="max-w-2xl mx-auto">
              <Alert className="border-amber-200 bg-amber-50">
                <Lock className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900 space-y-3">
                  <p className="font-semibold text-lg">Funcionalidade em Desenvolvimento</p>
                  <p className="whitespace-pre-line">{mensagemIndisponibilidade}</p>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Principal - Entrada e Resultado */}
              <div className="lg:col-span-2 space-y-6">
                {/* Card de Entrada */}
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-indigo-600" />
                    Digite seu texto
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Envie uma frase, período ou parágrafo para análise pedagógica
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Ex: A educação é importante para o desenvolvimento do país porque ensina as pessoas..."
                    value={textoInput}
                    onChange={(e) => handleTextoChange(e.target.value)}
                    rows={8}
                    className="resize-none"
                    disabled={isLoading}
                  />

                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <span className={`text-sm font-medium ${
                        wordCount > 500 ? 'text-red-600' :
                        wordCount > 400 ? 'text-amber-600' :
                        'text-gray-600'
                      }`}>
                        {wordCount}/500 palavras
                      </span>
                      {wordCount > 500 && (
                        <p className="text-xs text-red-600">
                          ⚠️ Texto excede o limite de 500 palavras
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || !textoInput.trim() || wordCount > 500 || credits < 1}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Obter Análise (1 crédito)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Resposta Estruturada */}
              {currentResponse && (
                <Card className="border-indigo-200">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Análise Pedagógica
                      </CardTitle>
                      <Button
                        onClick={handleNovaAnalise}
                        variant="outline"
                        size="sm"
                      >
                        Nova Análise
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 1. Diagnóstico */}
                    <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r">
                      <h3 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        Diagnóstico
                      </h3>
                      <p className="text-gray-700">{currentResponse.diagnostico}</p>
                    </div>

                    {/* 2. Explicação Pedagógica */}
                    <div className="border-l-4 border-amber-500 pl-4 bg-amber-50 p-4 rounded-r">
                      <h3 className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5" />
                        Explicação Pedagógica
                      </h3>
                      <p className="text-gray-700">{currentResponse.explicacao}</p>
                    </div>

                    {/* 3. Sugestão de Reescrita */}
                    <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded-r">
                      <h3 className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                        <FileEdit className="w-5 h-5" />
                        Como Melhorar
                      </h3>
                      <p className="text-gray-700">{currentResponse.sugestao_reescrita}</p>
                    </div>

                    {/* 4. Versão Melhorada */}
                    <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r">
                      <h3 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Versão Melhorada
                      </h3>
                      <p className="text-gray-700 italic mb-3">
                        "{currentResponse.versao_melhorada}"
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyText(currentResponse.versao_melhorada)}
                        className="border-green-500 text-green-700 hover:bg-green-100"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Texto
                      </Button>
                    </div>

                    {/* Metadados */}
                    {currentMetadata && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="font-medium">Original:</span> {currentMetadata.palavras_original} palavras
                          </div>
                          <div>
                            <span className="font-medium">Melhorada:</span> {currentMetadata.palavras_melhorada} palavras
                          </div>
                          <div>
                            <span className="font-medium">Tempo:</span> {currentMetadata.tempo_resposta_ms}ms
                          </div>
                          <div>
                            <span className="font-medium">Modelo:</span> {currentMetadata.modelo}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Créditos e Informações */}
            <div className="space-y-6">
              {/* Card de Créditos */}
              <Card className="border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Seus Créditos Jarvis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-indigo-600 mb-2">
                      {credits}
                    </div>
                    <p className="text-sm text-gray-600">
                      créditos disponíveis
                    </p>
                    <div className="mt-4 p-3 bg-indigo-50 rounded text-sm text-indigo-700">
                      💡 Cada análise consome 1 crédito
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Informações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Como funciona?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <div className="flex gap-2">
                    <span className="text-indigo-600 font-bold">1.</span>
                    <p>Digite ou cole seu texto (até 500 palavras)</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-indigo-600 font-bold">2.</span>
                    <p>Clique em "Obter Análise" (consome 1 crédito)</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-indigo-600 font-bold">3.</span>
                    <p>Receba diagnóstico + explicação + sugestões</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-indigo-600 font-bold">4.</span>
                    <p>Use a versão melhorada como referência</p>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      ⚠️ <strong>Importante:</strong> O Jarvis preserva sua ideia original.
                      Ele não cria argumentos novos, apenas reformula para melhorar a clareza
                      e adequação ao padrão ENEM.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Limites */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-sm">Limites</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Palavras por análise:</span>
                    <span className="font-medium">500 max</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultas por hora:</span>
                    <span className="font-medium">5 max</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo por análise:</span>
                    <span className="font-medium text-indigo-600">1 crédito</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Jarvis;
