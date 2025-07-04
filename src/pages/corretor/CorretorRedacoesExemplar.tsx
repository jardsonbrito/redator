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
        const [enviadasRes, simuladoRes, exercicioRes] = await Promise.all([
          supabase
            .from('redacoes_enviadas')
            .select('*')
            .gte('nota_total', 800)
            .eq('corrigida', true)
            .order('nota_total', { ascending: false }),
          supabase
            .from('redacoes_simulado')
            .select(`
              *,
              simulados!inner(frase_tematica, titulo)
            `)
            .gte('nota_total', 800)
            .eq('corrigida', true)
            .order('nota_total', { ascending: false }),
          supabase
            .from('redacoes_exercicio')
            .select(`
              *,
              exercicios!inner(titulo)
            `)
            .gte('nota_total', 800)
            .eq('corrigida', true)
            .order('nota_total', { ascending: false })
        ]);

        const redacoesEnviadas = enviadasRes.data || [];
        const redacoesSimulado = simuladoRes.data || [];
        const redacoesExercicio = exercicioRes.data || [];

        const redacoesCombinadas = [
          ...redacoesEnviadas.map(r => ({
            ...r,
            tipo_fonte: r.tipo_envio || 'regular',
            frase_tematica: r.frase_tematica,
            texto: r.redacao_texto,
            data_envio: r.data_envio
          })),
          ...redacoesSimulado.map(r => ({
            ...r,
            tipo_fonte: 'simulado',
            frase_tematica: (r.simulados as any)?.frase_tematica || (r.simulados as any)?.titulo || 'Simulado',
            texto: r.texto,
            data_envio: r.data_envio
          })),
          ...redacoesExercicio.map(r => ({
            ...r,
            tipo_fonte: 'exercicio',
            frase_tematica: (r.exercicios as any)?.titulo || 'Exercício',
            texto: r.redacao_texto,
            data_envio: r.data_envio
          }))
        ].sort((a, b) => b.nota_total - a.nota_total);

        return redacoesCombinadas;
      } catch (error) {
        console.error('Erro ao buscar redações exemplares:', error);
        return [];
      }
    }
  });

  const getTipoLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'simulado': 'Simulado', 
      'exercicio': 'Exercício',
      'visitante': 'Visitante'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const cores = {
      'regular': 'bg-blue-100 text-blue-800',
      'simulado': 'bg-orange-100 text-orange-800',
      'exercicio': 'bg-purple-100 text-purple-800',
      'visitante': 'bg-gray-100 text-gray-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-blue-100 text-blue-800';
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
          <p className="text-gray-600">Redações de alto desempenho (800+ pontos)</p>
        </div>

        {!redacoesExemplares || redacoesExemplares.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma redação exemplar disponível
              </h3>
              <p className="text-gray-500">
                As redações de alto desempenho aparecerão aqui quando disponíveis.
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
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap font-serif text-base leading-relaxed">
                    {selectedRedacao.texto}
                  </div>
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