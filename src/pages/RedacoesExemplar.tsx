import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, User } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { AlunoCard, AlunoCardSkeleton } from "@/components/aluno/AlunoCard";
import { resolveCover } from "@/utils/coverUtils";

const RedacoesExemplar = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<any>(null);

  // Buscar redações exemplares
  const { data: redacoesExemplares, isLoading, error } = useQuery({
    queryKey: ["redacoes-exemplares"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("redacoes")
          .select("*")
          .order("nota_total", { ascending: false });
        if (error) throw error;

        // Normalização mínima mantendo funcionalidade existente
        return (data || []).map((r) => ({
          ...r,
          frase_tematica: r.frase_tematica || "Redação Exemplar",
          texto: (r as any).conteudo,
          imagem_url: (r as any).pdf_url,
        }));
      } catch (e) {
        console.error("Erro ao buscar redações exemplares:", e);
        return [];
      }
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Redações Exemplares" />
            <main className="container mx-auto px-4 py-8 space-y-4">
              <AlunoCardSkeleton />
              <AlunoCardSkeleton />
              <AlunoCardSkeleton />
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Redações Exemplares" />
            <main className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-red-600">Erro ao carregar redações. Tente novamente.</p>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Redações Exemplares" />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8"></div>

            {!redacoesExemplares || redacoesExemplares.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Nenhuma redação exemplar disponível
                  </h3>
                  <p className="text-gray-500">
                    As redações exemplares aparecerão aqui quando cadastradas pelo administrador.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {redacoesExemplares.map((redacao: any) => {
                  const coverUrl = resolveCover((redacao as any).cover_file_path, (redacao as any).cover_url);
                  return (
                    <AlunoCard
                      key={redacao.id}
                      item={{
                        coverUrl,
                        title: redacao.frase_tematica,
                        badges: redacao.eixo_tematico
                          ? [{ label: redacao.eixo_tematico, tone: "primary" }]
                          : undefined,
                        meta: [{ icon: User, text: "Jardson Brito" }],
                        cta: { label: "Ver Redação", onClick: () => setSelectedRedacao(redacao) },
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Modal para visualizar redação */}
            {selectedRedacao && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {selectedRedacao.frase_tematica}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRedacao(null)}>
                        ✕
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="overflow-y-auto max-h-[60vh] p-6">
                    <div className="space-y-6">
                      {/* Imagem se disponível */}
                      {selectedRedacao.imagem_url && (
                        <div className="rounded-lg overflow-hidden">
                          <img
                            src={selectedRedacao.imagem_url}
                            alt="Imagem da redação"
                            className="w-full h-auto max-h-48 object-cover"
                          />
                        </div>
                      )}

                      {/* Eixo temático se disponível */}
                      {selectedRedacao.eixo_tematico && (
                        <div className="bg-primary/5 rounded-lg p-4">
                          <h4 className="font-semibold text-primary mb-2">Eixo Temático</h4>
                          <p className="text-sm text-muted-foreground">{selectedRedacao.eixo_tematico}</p>
                        </div>
                      )}

                      {/* Texto da redação */}
                      <div className="prose max-w-none">
                        <h4 className="font-semibold text-primary mb-3">Redação</h4>
                        <div className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-700 border rounded-lg p-4 bg-gray-50">
                          {selectedRedacao.texto}
                        </div>
                      </div>

                      {/* Dica de escrita se disponível */}
                      {selectedRedacao.dica_de_escrita && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                            <span>💡</span> Dica de Escrita
                          </h4>
                          <p className="text-sm text-yellow-700 leading-relaxed">
                            {selectedRedacao.dica_de_escrita}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default RedacoesExemplar;
