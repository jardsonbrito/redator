import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { dicaToHTML } from "@/utils/dicaToHTML";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const RedacaoExemplarDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [redacao, setRedacao] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { isStudentLoggedIn } = useStudentAuth();

  // Configurar título da página
  usePageTitle(redacao?.frase_tematica || 'Redação Exemplar');

  // Verificar autenticação
  const checkAuth = () => {
    const adminSession = localStorage.getItem('admin_session');
    const isAdminLoggedIn = !!adminSession;

    if (!isStudentLoggedIn && !isAdminLoggedIn) {
      navigate('/', { replace: true });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!authChecked) {
      const authOk = checkAuth();
      setAuthChecked(true);
      if (!authOk) return;
    }

    if (id && authChecked) {
      fetchRedacao();
    }
  }, [id, isStudentLoggedIn, authChecked]);

  const fetchRedacao = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setRedacao(data);
    } catch (err: any) {
      console.error('Erro ao buscar redação:', err);
      setError(err.message || 'Erro ao carregar redação');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Carregando..." />
            <main className="mx-auto max-w-4xl px-4 py-8">
              <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-6 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                      <div className="h-32 bg-muted rounded animate-pulse"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error || !redacao) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Erro" />
            <main className="mx-auto max-w-4xl px-4 py-8">
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-red-600 mb-4">
                    {error || "Redação não encontrada"}
                  </p>
                  <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data não disponível';
    }
  };

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle={redacao.frase_tematica} />

          <main className="mx-auto max-w-4xl px-4 py-8">
            <div className="space-y-6">
              {/* Botão Voltar */}
              <Button onClick={() => navigate(-1)} variant="outline" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {/* Card Principal */}
              <Card>
                <CardHeader className="border-b">
                  <div className="space-y-4">
                    {/* Título */}
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {redacao.frase_tematica}
                    </CardTitle>

                    {/* Meta informações */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {/* Autor */}
                      {redacao.autor && (
                        <div className="flex items-center gap-2">
                          {redacao.foto_autor ? (
                            <img
                              src={redacao.foto_autor}
                              alt={redacao.autor}
                              className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <span>Por: <strong>{redacao.autor}</strong></span>
                        </div>
                      )}

                      {/* Data */}
                      {redacao.data_envio && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Criado em: {formatDate(redacao.data_envio)}</span>
                        </div>
                      )}

                      {/* Badge do eixo temático */}
                      {redacao.eixo_tematico && (
                        <Badge className="bg-purple-100 text-purple-700">
                          {redacao.eixo_tematico}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Imagem se disponível */}
                    {redacao.imagem_url && (
                      <div className="rounded-lg overflow-hidden">
                        <img
                          src={redacao.imagem_url}
                          alt="Imagem da redação"
                          className="w-full h-auto max-h-64 object-cover"
                        />
                      </div>
                    )}

                    {/* Texto da redação */}
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800 mb-4">Redação Exemplar</h3>
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-700 border rounded-lg p-6 bg-gray-50">
                          {redacao.conteudo || redacao.texto}
                        </div>
                      </div>
                    </div>

                    {/* Dica de escrita se disponível */}
                    {redacao.dica_de_escrita && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                          <span>💡</span> Dica de Escrita
                        </h4>
                        <div
                          className="text-sm text-yellow-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{ __html: dicaToHTML(redacao.dica_de_escrita) }}
                        />
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default RedacaoExemplarDetalhes;