import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
const RedacoesExemplar = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<any>(null);

  // Buscar redações exemplares (nota alta) das tabelas principais
  const {
    data: redacoesExemplares,
    isLoading,
    error
  } = useQuery({
    queryKey: ['redacoes-exemplares'],
    queryFn: async () => {
      console.log('🔍 Buscando redações exemplares...');
      try {
        // Buscar redações exemplares da tabela 'redacoes' (cadastradas pelo administrador)
        const {
          data,
          error
        } = await supabase.from('redacoes').select('*').order('nota_total', {
          ascending: false
        });
        if (error) {
          console.error('❌ Erro ao buscar redações exemplares:', error);
          throw error;
        }
        console.log('✅ Redações exemplares encontradas:', data?.length || 0);

        // Formatar as redações exemplares
        const redacoesFormatadas = (data || []).map(r => ({
          ...r,
          tipo_fonte: 'exemplar',
          frase_tematica: r.frase_tematica || 'Redação Exemplar',
          eixo_tematico: r.eixo_tematico,
          texto: r.conteudo,
          data_envio: r.data_envio,
          nome_aluno: 'Redação Modelo',
          // Redações exemplares são modelos
          imagem_url: r.pdf_url // Usar pdf_url como imagem
        }));
        console.log('✅ Redações formatadas:', redacoesFormatadas.length);
        return redacoesFormatadas;
      } catch (error) {
        console.error('❌ Erro ao buscar redações exemplares:', error);
        return [];
      }
    }
  });
  const getTipoLabel = (tipo: string) => {
    const tipos = {
      'exemplar': 'Redação Modelo',
      'regular': 'Regular',
      'simulado': 'Simulado',
      'exercicio': 'Exercício',
      'visitante': 'Visitante'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };
  const getTipoColor = (tipo: string) => {
    const cores = {
      'exemplar': 'bg-yellow-100 text-yellow-800',
      'regular': 'bg-blue-100 text-blue-800',
      'simulado': 'bg-orange-100 text-orange-800',
      'exercicio': 'bg-purple-100 text-purple-800',
      'visitante': 'bg-gray-100 text-gray-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-yellow-100 text-yellow-800';
  };
  if (isLoading) {
    return <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Redações Exemplares" />
            <main className="container mx-auto px-4 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando redações exemplares...</p>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>;
  }
  if (error) {
    return <ProtectedRoute>
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
      </ProtectedRoute>;
  }
  return <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Redações Exemplares" />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8">
            </div>

            {!redacoesExemplares || redacoesExemplares.length === 0 ? <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Nenhuma redação exemplar disponível
                  </h3>
                  <p className="text-gray-500">
                    As redações exemplares aparecerão aqui quando cadastradas pelo administrador.
                  </p>
                </CardContent>
              </Card> : <div className="grid gap-6">
                {redacoesExemplares.map(redacao => <Card key={redacao.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-primary mb-4">
                            {redacao.frase_tematica}
                          </CardTitle>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>Jardson Brito</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRedacao(redacao)} className="border-primary/30 hover:bg-primary/10">
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Redação
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>)}
              </div>}

            {/* Modal para visualizar redação */}
            {selectedRedacao && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                    <div className="flex items-center gap-2">
                      
                      
                    </div>
                  </CardHeader>
                  
                   <CardContent className="overflow-y-auto max-h-[60vh] p-6">
                     <div className="space-y-6">
                       {/* Imagem se disponível */}
                       {selectedRedacao.imagem_url && <div className="rounded-lg overflow-hidden">
                           <img src={selectedRedacao.imagem_url} alt="Imagem da redação" className="w-full h-auto max-h-48 object-cover" />
                         </div>}
                       
                       {/* Eixo temático se disponível */}
                       {selectedRedacao.eixo_tematico && <div className="bg-primary/5 rounded-lg p-4">
                           <h4 className="font-semibold text-primary mb-2">Eixo Temático</h4>
                           <p className="text-sm text-muted-foreground">{selectedRedacao.eixo_tematico}</p>
                         </div>}
                       
                       {/* Texto da redação */}
                       <div className="prose max-w-none">
                         <h4 className="font-semibold text-primary mb-3">Redação</h4>
                         <div className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-700 border rounded-lg p-4 bg-gray-50">
                           {selectedRedacao.texto}
                         </div>
                       </div>
                       
                       {/* Dica de escrita se disponível */}
                       {selectedRedacao.dica_de_escrita && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                           <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                             <span>💡</span> Dica de Escrita
                           </h4>
                           <p className="text-sm text-yellow-700 leading-relaxed">
                             {selectedRedacao.dica_de_escrita}
                           </p>
                         </div>}
                     </div>
                   </CardContent>
                </Card>
              </div>}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>;
};
export default RedacoesExemplar;