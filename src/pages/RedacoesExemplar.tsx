import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, User, X as ClearIcon } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { UnifiedCard, UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { resolveExemplarCover } from "@/utils/coverUtils";
import { dicaToHTML } from "@/utils/dicaToHTML";
import { useRedacoesExemplarFilters } from "@/hooks/useRedacoesExemplarFilters";
import { AutocompleteInput } from "@/components/filters/AutocompleteInput";
import { MultiSelectDropdown } from "@/components/filters/MultiSelectDropdown";

const RedacoesExemplar = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<any>(null);

  // Usar o hook de filtros
  const {
    redacoesExemplares,
    isLoading,
    error,
    fraseFilter,
    selectedEixos,
    uniqueEixos,
    fraseSuggestions,
    hasActiveFilters,
    updateFraseFilter,
    updateSelectedEixos,
    clearFilters,
  } = useRedacoesExemplarFilters();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Redações Exemplares" />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Skeleton dos filtros */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="h-10 bg-muted rounded-md animate-pulse" />
                  </div>
                  <div className="w-full sm:w-64">
                    <div className="h-10 bg-muted rounded-md animate-pulse" />
                  </div>
                </div>
              </div>
              
              {/* Skeleton dos cards */}
              <div className="space-y-4">
                <UnifiedCardSkeleton />
                <UnifiedCardSkeleton />
                <UnifiedCardSkeleton />
              </div>
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {/* Seção de Filtros */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <AutocompleteInput
                    value={fraseFilter}
                    onValueChange={updateFraseFilter}
                    suggestions={fraseSuggestions}
                    placeholder="Filtrar por frase temática..."
                    className="w-full"
                  />
                </div>
                
                <div className="w-full sm:w-64">
                  <MultiSelectDropdown
                    options={uniqueEixos}
                    selectedValues={selectedEixos}
                    onSelectionChange={updateSelectedEixos}
                    placeholder="Todos os eixos"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Indicador de filtros ativos e botão limpar */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {redacoesExemplares?.length || 0} redação(ões) encontrada(s)
                      {fraseFilter && ` para "${fraseFilter}"`}
                      {selectedEixos.length > 0 && ` em ${selectedEixos.length} eixo(s)`}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-sm"
                  >
                    <ClearIcon className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>

            {!redacoesExemplares || redacoesExemplares.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {hasActiveFilters 
                      ? "Nenhuma redação encontrada" 
                      : "Nenhuma redação exemplar disponível"
                    }
                  </h3>
                  <p className="text-gray-500">
                    {hasActiveFilters 
                      ? "Tente ajustar os filtros para encontrar redações." 
                      : "As redações exemplares aparecerão aqui quando cadastradas pelo administrador."
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-4"
                    >
                      <ClearIcon className="h-4 w-4 mr-2" />
                      Limpar filtros
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {redacoesExemplares.map((redacao: any) => {
                  const coverUrl = resolveExemplarCover(redacao);
                  return (
                    <UnifiedCard
                      key={redacao.id}
                      variant="aluno"
                      item={{
                        coverUrl,
                        title: redacao.frase_tematica,
                        badges: redacao.eixo_tematico
                          ? [{ label: redacao.eixo_tematico, tone: "primary" }]
                          : undefined,
                        meta: [{ icon: User, text: "Jardson Brito" }],
                        cta: { 
                          label: "Ver Redação", 
                          onClick: () => setSelectedRedacao(redacao),
                          ariaLabel: `Ver redação exemplar: ${redacao.frase_tematica}`
                        },
                        ariaLabel: `Redação exemplar: ${redacao.frase_tematica}`
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
                          <div 
                            className="text-sm text-yellow-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                            dangerouslySetInnerHTML={{ __html: dicaToHTML(selectedRedacao.dica_de_escrita) }}
                          />
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
