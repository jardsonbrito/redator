
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Temas() {
  const { data: temas, isLoading, error } = useQuery({
    queryKey: ['temas-publicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('status', 'publicado') // Apenas temas publicados
        .order('publicado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Temas" />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">
            Explore nossa coleção de temas
          </h2>
          <p className="text-redator-accent">
            Temas de redação cuidadosamente selecionados para sua preparação.
          </p>
        </div>

        {!temas || temas.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-redator-primary mb-2">Nenhum tema disponível</h3>
            <p className="text-redator-accent">
              Novos temas serão adicionados em breve. Volte mais tarde!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {temas.map((tema) => (
              <Card key={tema.id} className="hover:shadow-lg transition-shadow border-redator-accent/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-redator-primary line-clamp-3 mb-3">
                        {tema.frase_tematica}
                      </CardTitle>
                      <Badge className="bg-redator-accent text-white">
                        {tema.eixo_tematico}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tema.imagem_texto_4_url && (
                      <div className="aspect-video overflow-hidden rounded-md">
                        <img 
                          src={tema.imagem_texto_4_url} 
                          alt="Imagem do tema" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Link to={`/temas/${tema.id}`}>
                        <Button className="w-full bg-redator-primary hover:bg-redator-primary/90">
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Tema Completo
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
}
