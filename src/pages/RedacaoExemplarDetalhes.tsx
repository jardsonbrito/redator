import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatRedacaoText } from "@/utils/formatRedacaoText";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { SeloValidacaoENEM } from "@/components/shared/SeloValidacaoENEM";
import { useRedacaoExemplarModelos, RedacaoExemplarModelo } from "@/hooks/useRedacaoExemplarModelos";

const RedacaoExemplarDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [redacao, setRedacao] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modeloAtivo, setModeloAtivo] = useState<RedacaoExemplarModelo | null>(null);
  const { modelos } = useRedacaoExemplarModelos(id);
  usePageTitle(redacao?.frase_tematica || 'Redação Exemplar');

  useEffect(() => {
    if (modelos.length > 0 && !modeloAtivo) {
      setModeloAtivo(modelos[0]);
    }
  }, [modelos]);

  useEffect(() => {
    if (id) {
      fetchRedacao();
    }
  }, [id]);

  const fetchRedacao = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!id) {
        throw new Error('ID da redação não fornecido');
      }

      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .eq('id', id)
        .eq('ativo', true)
        .single();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw new Error(`Erro ao buscar redação: ${error.message}`);
      }

      if (!data) {
        throw new Error('Redação não encontrada');
      }

      console.log('Redação carregada com sucesso:', data.frase_tematica);
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
    );
  }

  if (error || !redacao) {
    return (
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

                    {/* Selo de validação ENEM */}
                    {redacao.atualizado_banca && (
                      <div>
                        <SeloValidacaoENEM ano={redacao.ano_banca} />
                      </div>
                    )}

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

                      {/* Badge do eixo temático */}
                      {redacao.eixo_tematico && (
                        <Badge className="bg-purple-100 text-purple-700">
                          {redacao.eixo_tematico}
                        </Badge>
                      )}
                    </div>

                    {/* Chips de navegação entre modelos */}
                    {modelos.length > 1 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground font-medium">Versão:</span>
                        <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs font-medium">
                          {modelos.map((modelo) => (
                            <button
                              key={modelo.id}
                              onClick={() => setModeloAtivo(modelo)}
                              className={`px-3 py-1.5 transition-colors ${
                                modeloAtivo?.id === modelo.id
                                  ? 'bg-[#662F96] text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {modelo.titulo}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                      <div className="prose max-w-none">
                        <div
                          className="font-serif text-base leading-relaxed text-gray-700 border rounded-lg p-6 bg-gray-50 text-left hyphens-none [&_p]:indent-8 [&_p]:mb-4 [&_p:first-child]:indent-8"
                          dangerouslySetInnerHTML={{
                            __html: formatRedacaoText(
                              modeloAtivo?.conteudo ?? (redacao.conteudo || redacao.texto)
                            )
                          }}
                        />
                      </div>
                    </div>


                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </TooltipProvider>
  );
};

export default RedacaoExemplarDetalhes;