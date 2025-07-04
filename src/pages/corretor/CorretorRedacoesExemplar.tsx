import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useState } from "react";

const CorretorRedacoesExemplar = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<any>(null);

  const { data: redacoesExemplares, isLoading, error } = useQuery({
    queryKey: ['redacoes-exemplares-corretor'],
    queryFn: async () => {
      try {
        console.log('🔍 Buscando redações exemplares...');
        
        // Buscar redações exemplares da tabela 'redacoes' (cadastradas pelo administrador)
        const { data, error } = await supabase
          .from('redacoes')
          .select('*')
          .order('nota_total', { ascending: false });

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
          nome_aluno: 'Redação Modelo', // Redações exemplares são modelos
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
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CorretorLayout>
    );
  }

  if (error) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar redações. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Redações Exemplares</h1>
          <p className="text-gray-600">Redações modelo cadastradas pelo administrador</p>
        </div>

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
          <div className="grid gap-6">
            {redacoesExemplares.map((redacao) => (
              <Card key={redacao.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2">
                        {redacao.frase_tematica}
                      </CardTitle>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={getTipoColor(redacao.tipo_fonte)}>
                          {getTipoLabel(redacao.tipo_fonte)}
                        </Badge>
                        
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Star className="w-3 h-3 mr-1" />
                          {redacao.nota_total}/1000
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{redacao.nome_aluno}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(redacao.data_envio), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRedacao(redacao)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver Redação
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRedacao(null)}
                  >
                    ✕
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-50 text-green-700 border-green-200">
                    <Star className="w-3 h-3 mr-1" />
                    {selectedRedacao.nota_total}/1000
                  </Badge>
                  <span className="text-sm text-gray-500">
                    por {selectedRedacao.nome_aluno}
                  </span>
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Eixo Temático</h4>
                      <p className="text-sm text-gray-600">{selectedRedacao.eixo_tematico}</p>
                    </div>
                  )}
                  
                  {/* Texto da redação */}
                  <div className="prose max-w-none">
                    <h4 className="font-semibold text-gray-800 mb-3">Redação</h4>
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
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedacoesExemplar;