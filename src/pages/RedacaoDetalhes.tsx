
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Lightbulb } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationContext } from "@/hooks/useNavigationContext";

const RedacaoDetalhes = () => {
  const { id } = useParams();
  const { setBreadcrumbs, setPageTitle } = useNavigationContext();
  
  const { data: redacao, isLoading, error } = useQuery({
    queryKey: ['redacao', id],
    queryFn: async () => {
      console.log('Fetching redacao details for id:', id);
      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching redacao:', error);
        throw error;
      }
      
      console.log('Redacao details fetched:', data);
      return data;
    },
    enabled: !!id
  });

  // Configurar breadcrumbs e título quando a redação for carregada
  useEffect(() => {
    if (redacao?.frase_tematica) {
      setBreadcrumbs([
        { label: 'Início', href: '/app' },
        { label: 'Biblioteca', href: '/biblioteca' },
        { label: redacao.frase_tematica }
      ]);
      setPageTitle(redacao.frase_tematica);
    }
  }, [redacao?.frase_tematica, setBreadcrumbs, setPageTitle]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div>Carregando redação...</div>
      </div>
    );
  }

  if (error || !redacao) {
    console.error('Error or no redacao found:', error, redacao);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">Redação não encontrada</h2>
          <p className="text-redator-accent mb-4">A redação solicitada não foi encontrada.</p>
          <Link to="/redacoes" className="text-redator-accent hover:text-redator-primary">
            Voltar para redações
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle={redacao?.frase_tematica || "Redação Exemplar"} />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="border-redator-accent/20">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-redator-primary mb-4 sm:mb-6 leading-tight">
              {redacao.frase_tematica || "Redação Exemplar"}
            </h1>
            
            <div className="prose prose-sm sm:prose-lg max-w-none">
              {redacao.conteudo && redacao.conteudo.split('\n\n').map((paragrafo, index) => (
                <p key={index} className="mb-3 sm:mb-4 text-gray-700 leading-relaxed text-sm sm:text-base">
                  {paragrafo}
                </p>
              ))}
            </div>

            {/* Dica de Escrita */}
            {redacao.dica_de_escrita && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                <h3 className="font-semibold text-redator-primary mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  Dica de Escrita
                </h3>
                <p className="text-redator-accent leading-relaxed text-sm sm:text-base">
                  {redacao.dica_de_escrita}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default RedacaoDetalhes;
