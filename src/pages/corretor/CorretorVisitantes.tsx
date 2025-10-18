import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft, Eye, FileText, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface RedacaoVisitante {
  id: string;
  frase_tematica: string;
  nome_aluno: string;
  email_aluno: string;
  data_envio: string;
  status: string;
  corrigida: boolean;
  redacao_manuscrita_url?: string | null;
  redacao_texto?: string | null;
}

interface EstatisticasVisitantes {
  total_visitantes: number;
  total_redacoes_visitantes: number;
}

const CorretorVisitantes = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoVisitante | null>(null);

  // Buscar estatísticas básicas
  const { data: estatisticas, isLoading: loadingStats } = useQuery({
    queryKey: ['corretor-estatisticas-visitantes'],
    queryFn: async () => {
      console.log('📊 Simulando estatísticas de visitantes para corretor...');
      
      // Simular dados básicos
      const mockStats = {
        total_visitantes: 0,
        total_redacoes_visitantes: 0
      };
      
      console.log('✅ Estatísticas simuladas:', mockStats);
      return mockStats;
    },
    refetchInterval: 60000
  });

  // Buscar redações de visitantes disponíveis para correção
  const { data: redacoesVisitantes = [], isLoading: loadingRedacoes } = useQuery({
    queryKey: ['corretor-redacoes-visitantes'],
    queryFn: async (): Promise<RedacaoVisitante[]> => {
      const { data: redacoes, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('turma', 'visitante')
        .order('data_envio', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Erro ao buscar redações de visitantes:', error);
        throw error;
      }

      return redacoes || [];
    },
    refetchInterval: 30000
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (redacao: RedacaoVisitante) => {
    if (redacao.status === 'corrigida' || redacao.corrigida) {
      return <Badge className="bg-green-100 text-green-800">Corrigida</Badge>;
    } else if (redacao.status === 'em_correcao') {
      return <Badge className="bg-yellow-100 text-yellow-800">Em correção</Badge>;
    } else {
      return <Badge variant="outline">Aguardando correção</Badge>;
    }
  };

  const redacoesPendentes = redacoesVisitantes.filter(r => 
    r.status !== 'corrigida' && !r.corrigida
  );

  const redacoesCorrigidas = redacoesVisitantes.filter(r => 
    r.status === 'corrigida' || r.corrigida
  );

  if (loadingStats || loadingRedacoes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/corretor">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  Redações de Visitantes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Visualize e corrija redações enviadas por visitantes da plataforma
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visitantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.total_visitantes}</div>
                <p className="text-xs text-muted-foreground">Registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redações Pendentes</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{redacoesPendentes.length}</div>
                <p className="text-xs text-muted-foreground">Aguardando correção</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redações Corrigidas</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{redacoesCorrigidas.length}</div>
                <p className="text-xs text-muted-foreground">Finalizadas</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Redações Pendentes */}
        {redacoesPendentes.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Redações Pendentes ({redacoesPendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {redacoesPendentes.slice(0, 10).map((redacao) => (
                  <div 
                    key={redacao.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold line-clamp-1">{redacao.frase_tematica}</h3>
                        {getStatusBadge(redacao)}
                        {redacao.redacao_manuscrita_url && (
                          <Badge variant="secondary">Manuscrita</Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>👤 {redacao.nome_aluno}</span>
                        <span>📧 {redacao.email_aluno}</span>
                        <span>📅 {formatDate(redacao.data_envio)}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRedacao(redacao)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Redação
                    </Button>
                  </div>
                ))}

                {redacoesPendentes.length > 10 && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      Mostrando 10 de {redacoesPendentes.length} redações pendentes
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Redações Corrigidas Recentes */}
        {redacoesCorrigidas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Redações Corrigidas Recentemente ({redacoesCorrigidas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {redacoesCorrigidas.slice(0, 5).map((redacao) => (
                  <div 
                    key={redacao.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold line-clamp-1">{redacao.frase_tematica}</h3>
                        {getStatusBadge(redacao)}
                      </div>
                      
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>👤 {redacao.nome_aluno}</span>
                        <span>📧 {redacao.email_aluno}</span>
                        <span>📅 {formatDate(redacao.data_envio)}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRedacao(redacao)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Revisar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado vazio */}
        {redacoesVisitantes.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma redação de visitante</h3>
                <p className="text-muted-foreground">
                  Redações enviadas por visitantes aparecerão aqui para correção
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog para visualizar redação */}
        <Dialog open={!!selectedRedacao} onOpenChange={(open) => {
          if (!open) setSelectedRedacao(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Redação de Visitante</DialogTitle>
            </DialogHeader>
            
            {selectedRedacao && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tema</label>
                    <p className="font-semibold">{selectedRedacao.frase_tematica}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Aluno Visitante</label>
                    <p className="font-semibold">{selectedRedacao.nome_aluno}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p>{selectedRedacao.email_aluno}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Envio</label>
                    <p>{formatDate(selectedRedacao.data_envio)}</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Conteúdo da Redação</h4>
                  
                  {selectedRedacao.redacao_manuscrita_url ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Redação manuscrita:</p>
                      <img 
                        src={selectedRedacao.redacao_manuscrita_url} 
                        alt="Redação manuscrita" 
                        className="max-w-full border rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="bg-white p-4 border rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedRedacao.redacao_texto || 'Conteúdo não disponível'}
                    </div>
                  )}
                </div>

                {(!selectedRedacao.corrigida && selectedRedacao.status !== 'corrigida') && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Dica:</strong> Esta redação de visitante está disponível para correção. 
                      Para corrigir, acesse o painel principal de correções ou entre em contato com o administrador 
                      para atribuir esta redação a um corretor específico.
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CorretorVisitantes;