import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { Users, ArrowLeft, Eye, UserPlus, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface VisitanteSession {
  id: string;
  email_visitante: string;
  nome_visitante: string;
  primeiro_acesso: string;
  ultimo_acesso: string;
  ativo: boolean;
  total_redacoes?: number;
}

interface EstatisticasVisitantes {
  total_visitantes: number;
  visitantes_ativos_30_dias: number;
  total_redacoes_visitantes: number;
  visitantes_ultima_semana: number;
}

export const ProfessorVisitantes = () => {
  const { professor } = useProfessorAuth();
  const [selectedVisitante, setSelectedVisitante] = useState<VisitanteSession | null>(null);

  // Buscar estatísticas gerais
  const { data: estatisticas, isLoading: loadingStats } = useQuery({
    queryKey: ['professor-estatisticas-visitantes'],
    queryFn: async (): Promise<EstatisticasVisitantes> => {
      const { data, error } = await supabase.rpc('get_estatisticas_visitantes');
      
      if (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        throw error;
      }
      
      return data;
    },
    refetchInterval: 60000
  });

  // Buscar visitantes mais ativos (últimas 2 semanas)
  const { data: visitantesAtivos = [], isLoading: loadingVisitantes } = useQuery({
    queryKey: ['professor-visitantes-ativos'],
    queryFn: async (): Promise<VisitanteSession[]> => {
      const { data: sessoes, error } = await supabase
        .from('visitante_sessoes')
        .select('*')
        .eq('ativo', true)
        .gte('ultimo_acesso', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('ultimo_acesso', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Erro ao buscar visitantes ativos:', error);
        throw error;
      }

      // Buscar contagem de redações para cada visitante
      const sessoesComRedacoes = await Promise.all(
        (sessoes || []).map(async (sessao) => {
          const { data: redacoes } = await supabase
            .from('redacoes_enviadas')
            .select('id', { count: 'exact' })
            .eq('turma', 'visitante')
            .ilike('email_aluno', sessao.email_visitante);
          
          return {
            ...sessao,
            total_redacoes: redacoes?.length || 0
          };
        })
      );

      return sessoesComRedacoes.filter(v => v.total_redacoes > 0); // Só visitantes com redações
    },
    refetchInterval: 60000
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActivityBadge = (visitante: VisitanteSession) => {
    const agora = new Date();
    const ultimoAcesso = new Date(visitante.ultimo_acesso);
    const diffHoras = (agora.getTime() - ultimoAcesso.getTime()) / (1000 * 60 * 60);

    if (diffHoras < 24) {
      return <Badge className="bg-green-100 text-green-800">Ativo hoje</Badge>;
    } else if (diffHoras < 168) { // 7 dias
      return <Badge className="bg-blue-100 text-blue-800">Ativo esta semana</Badge>;
    } else {
      return <Badge variant="outline">Últimas 2 semanas</Badge>;
    }
  };

  if (loadingStats || loadingVisitantes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/professor/dashboard">
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
                  Visitantes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitore visitantes engajados - Professor: <strong>{professor?.nome_completo}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visitantes</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{estatisticas.total_visitantes}</div>
                <p className="text-xs text-muted-foreground">Registrados na plataforma</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos (30 dias)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{estatisticas.visitantes_ativos_30_dias}</div>
                <p className="text-xs text-muted-foreground">Acessaram recentemente</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Redações</CardTitle>
                <UserPlus className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{estatisticas.total_redacoes_visitantes}</div>
                <p className="text-xs text-muted-foreground">Enviadas por visitantes</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Potenciais Alunos</CardTitle>
                <UserPlus className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{visitantesAtivos.length}</div>
                <p className="text-xs text-muted-foreground">Com redações enviadas</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Visitantes Engajados */}
        <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Visitantes Engajados (Potenciais Alunos)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visitantes que enviaram redações nas últimas 2 semanas - candidatos para migração
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visitantesAtivos.map((visitante) => (
                <div 
                  key={visitante.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-white/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{visitante.nome_visitante}</h3>
                      {getActivityBadge(visitante)}
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {visitante.total_redacoes} redações
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      📧 {visitante.email_visitante}
                    </p>
                    
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Primeiro acesso: {formatDate(visitante.primeiro_acesso)}</span>
                      <span>Último acesso: {formatDate(visitante.ultimo_acesso)}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVisitante(visitante)}
                    className="border-primary/20 hover:bg-primary hover:text-white"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Detalhes
                  </Button>
                </div>
              ))}

              {visitantesAtivos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg mb-2">Nenhum visitante engajado no momento</p>
                  <p className="text-sm">
                    Visitantes que enviarem redações aparecerão aqui como potenciais alunos
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Detalhes do Visitante */}
        <Dialog open={!!selectedVisitante} onOpenChange={(open) => {
          if (!open) setSelectedVisitante(null);
        }}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-primary">Detalhes do Visitante Engajado</DialogTitle>
            </DialogHeader>
            
            {selectedVisitante && (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-semibold mb-2 text-primary">💡 Dica do Professor</h4>
                  <p className="text-sm text-muted-foreground">
                    Este visitante demonstrou engajamento enviando {selectedVisitante.total_redacoes} redação{selectedVisitante.total_redacoes > 1 ? 'ões' : ''}. 
                    Considere entrar em contato para convidar para uma turma oficial.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-semibold">{selectedVisitante.nome_visitante}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email de Contato</label>
                    <p className="font-semibold text-primary">{selectedVisitante.email_visitante}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="pt-1">
                      {getActivityBadge(selectedVisitante)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Engajamento</label>
                    <p className="font-semibold text-lg text-primary">{selectedVisitante.total_redacoes} redações</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Primeiro Acesso</label>
                    <p>{formatDate(selectedVisitante.primeiro_acesso)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Último Acesso</label>
                    <p>{formatDate(selectedVisitante.ultimo_acesso)}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-800">📞 Próximos Passos Sugeridos:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Entre em contato via email: {selectedVisitante.email_visitante}</li>
                    <li>• Convide para participar de uma turma oficial</li>
                    <li>• Mencione o histórico de {selectedVisitante.total_redacoes} redação{selectedVisitante.total_redacoes > 1 ? 'ões' : ''} já enviadas</li>
                    <li>• Use o painel administrativo para migrar este visitante quando necessário</li>
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};