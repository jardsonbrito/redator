import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, X as ClearIcon } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { dicaToHTML } from "@/utils/dicaToHTML";
import { useRedacoesExemplarFilters } from "@/hooks/useRedacoesExemplarFilters";
import { AutocompleteInput } from "@/components/filters/AutocompleteInput";
import { MultiSelectDropdown } from "@/components/filters/MultiSelectDropdown";
import { RedacaoExemplarCardPadrao } from "@/components/shared/RedacaoExemplarCardPadrao";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

const RedacoesExemplar = () => {
  // Configurar título da página
  usePageTitle('Redações Exemplar');

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
            <main className="mx-auto max-w-6xl px-4 py-8">
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
              
              {/* Skeleton dos cards em grid */}
              <div className="mx-auto max-w-6xl">
                <div role="list" className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="aspect-[16/9] bg-gray-200 animate-pulse"></div>
                      <div className="p-6 space-y-3">
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </Card>
                  ))}
                </div>
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
            <main className="mx-auto max-w-6xl px-4 py-8">
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

            <main className="mx-auto max-w-6xl px-4 py-8">
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
              <div role="list" className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {redacoesExemplares.map((redacao: any) => (
                  <RedacaoExemplarCardPadrao
                    key={redacao.id}
                    redacao={redacao}
                    perfil="aluno"
                  />
                ))}
              </div>
            )}

          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default RedacoesExemplar;
