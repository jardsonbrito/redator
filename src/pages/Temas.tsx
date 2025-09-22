
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X as ClearIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TemaCardPadrao } from "@/components/shared/TemaCard";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTemasFilters } from '@/hooks/useTemasFilters';
import { AutocompleteInput } from "@/components/filters/AutocompleteInput";
import { MultiSelectDropdown } from "@/components/filters/MultiSelectDropdown";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

export default function Temas() {
  // Configurar título da página
  usePageTitle('Temas');
  const navigate = useNavigate();

  // Usar o hook de filtros
  const {
    temas,
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
  } = useTemasFilters();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando temas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar temas. Tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Temas" />

      {/* Content */}
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
                  {temas?.length || 0} tema(s) encontrado(s)
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

        {!temas || temas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-redator-primary mb-2">
                {hasActiveFilters 
                  ? "Nenhum tema encontrado" 
                  : "Nenhum tema disponível"
                }
              </h3>
              <p className="text-redator-accent">
                {hasActiveFilters 
                  ? "Tente ajustar os filtros para encontrar temas." 
                  : "Novos temas serão adicionados em breve. Volte mais tarde!"
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {temas.map((tema) => (
              <TemaCardPadrao
                key={tema.id}
                tema={tema}
                perfil="aluno"
                actions={{
                  onVerTema: (id) => navigate(`/temas/${id}`)
                }}
              />
            ))}
          </div>
        )}
      </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
