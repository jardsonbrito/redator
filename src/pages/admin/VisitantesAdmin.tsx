import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminHeader } from '@/components/AdminHeader';
import { 
  Users, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Eye,
  ArrowUpDown,
  Download,
  UserPlus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface VisitanteSession {
  id: string;
  email_visitante: string;
  nome_visitante: string;
  session_id: string;
  primeiro_acesso: string;
  ultimo_acesso: string;
  ativo: boolean;
  created_at: string;
  total_redacoes?: number;
}

interface EstatisticasVisitantes {
  total_visitantes: number;
  visitantes_ativos_30_dias?: number;
  total_redacoes_visitantes: number;
  visitantes_ultima_semana?: number;
  total_conversas_ativas?: number;
  visitantes_ativos_ultimos_7_dias?: number;
  gerado_em?: string;
}

const VisitantesAdmin = () => {
  const [selectedVisitante, setSelectedVisitante] = useState<VisitanteSession | null>(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('ultimo_acesso');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  
  const { toast } = useToast();

  // Buscar estatísticas reais de visitantes
  const { data: estatisticas, isLoading: loadingStats } = useQuery({
    queryKey: ['estatisticas-visitantes'],
    queryFn: async (): Promise<EstatisticasVisitantes> => {
      console.log('📊 Buscando estatísticas reais de visitantes...');
      
      // Buscar total de visitantes na tabela visitante_sessoes
      const { count: totalVisitantes } = await supabase
        .from('visitante_sessoes')
        .select('id', { count: 'exact', head: true });
      
      // Buscar visitantes ativos nos últimos 30 dias
      const dataLimite30 = new Date();
      dataLimite30.setDate(dataLimite30.getDate() - 30);
      const { count: visitantesAtivos30 } = await supabase
        .from('visitante_sessoes')
        .select('id', { count: 'exact', head: true })
        .gte('ultimo_acesso', dataLimite30.toISOString());
      
      // Buscar visitantes ativos nos últimos 7 dias
      const dataLimite7 = new Date();
      dataLimite7.setDate(dataLimite7.getDate() - 7);
      const { count: visitantesAtivos7 } = await supabase
        .from('visitante_sessoes')
        .select('id', { count: 'exact', head: true })
        .gte('ultimo_acesso', dataLimite7.toISOString());
      
      // Buscar total de redações de visitantes
      const { count: totalRedacoesVisitantes } = await supabase
        .from('redacoes_enviadas')
        .select('id', { count: 'exact', head: true })
        .eq('turma', 'visitante');
      
      const stats: EstatisticasVisitantes = {
        total_visitantes: totalVisitantes || 0,
        total_redacoes_visitantes: totalRedacoesVisitantes || 0,
        visitantes_ativos_30_dias: visitantesAtivos30 || 0,
        visitantes_ultima_semana: visitantesAtivos7 || 0,
        gerado_em: new Date().toISOString()
      };
      
      console.log('✅ Estatísticas reais obtidas:', stats);
      return stats;
    },
    refetchInterval: 60000 // Atualizar a cada minuto
  });

  // Buscar sessões reais de visitantes
  const { data: visitantes = [], isLoading: loadingVisitantes } = useQuery({
    queryKey: ['visitantes-sessoes', sortBy, filterActive],
    queryFn: async (): Promise<VisitanteSession[]> => {
      console.log('👥 Buscando sessões reais de visitantes...');
      
      let query = supabase.from('visitante_sessoes').select('*');
      
      // Aplicar filtro de status ativo
      if (filterActive !== null) {
        query = query.eq('ativo', filterActive);
      }
      
      // Aplicar ordenação
      const isAscending = sortBy.startsWith('+');
      const field = isAscending ? sortBy.substring(1) : sortBy;
      query = query.order(field, { ascending: isAscending });
      
      const { data: sessoes, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar visitantes:', error);
        throw error;
      }
      
      // Para cada visitante, buscar contagem de redações
      const visitantesComRedacoes: VisitanteSession[] = [];
      
      for (const sessao of sessoes || []) {
        const { count: totalRedacoes } = await supabase
          .from('redacoes_enviadas')
          .select('id', { count: 'exact', head: true })
          .eq('turma', 'visitante')
          .ilike('email_aluno', sessao.email_visitante);
        
        visitantesComRedacoes.push({
          ...sessao,
          total_redacoes: totalRedacoes || 0
        });
      }
      
      console.log('✅ Sessões reais obtidas:', visitantesComRedacoes.length);
      return visitantesComRedacoes;
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Buscar lista de turmas para migração
  const { data: turmas = [] } = useQuery({
    queryKey: ['turmas-disponiveis'],
    queryFn: async () => {
      const { data } = await supabase
        .from('redacoes_enviadas')
        .select('turma')
        .neq('turma', 'visitante')
        .not('turma', 'is', null);
      
      const turmasUnicas = [...new Set(data?.map(r => r.turma))];
      return turmasUnicas.filter(Boolean);
    }
  });

  // Função para migrar visitante para aluno
  const handleMigrarVisitante = async () => {
    if (!selectedVisitante || !selectedTurma) {
      toast({
        title: "Erro",
        description: "Selecione uma turma para a migração.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔄 Migrando visitante real:', selectedVisitante.email_visitante);
      
      // Criar perfil de aluno
      const { data: newUser, error: userError } = await supabase.auth.signUp({
        email: selectedVisitante.email_visitante,
        password: 'tempPassword123!', // Senha temporária
        options: {
          data: {
            nome: selectedVisitante.nome_visitante,
            user_type: 'aluno',
            turma: selectedTurma,
            is_authenticated_student: true
          }
        }
      });
      
      if (userError) throw userError;
      
      // Atualizar redações do visitante para a nova turma
      const { error: redacoesError } = await supabase
        .from('redacoes_enviadas')
        .update({ turma: selectedTurma })
        .eq('turma', 'visitante')
        .ilike('email_aluno', selectedVisitante.email_visitante);
      
      if (redacoesError) throw redacoesError;
      
      // Marcar sessão de visitante como inativa (migrada)
      const { error: sessaoError } = await supabase
        .from('visitante_sessoes')
        .update({ ativo: false })
        .eq('id', selectedVisitante.id);
      
      if (sessaoError) throw sessaoError;
      
      toast({
        title: "Migração concluída",
        description: `${selectedVisitante.nome_visitante} foi migrado para ${selectedTurma} com sucesso!`,
        variant: "default"
      });
      
      // Fechar diálogos e recarregar dados
      setShowMigrationDialog(false);
      setSelectedVisitante(null);
      
      // Recarregar query de visitantes
      // queryClient.invalidateQueries(['visitantes-sessoes']);
      
    } catch (error: any) {
      console.error('❌ Erro na migração:', error);
      toast({
        title: "Erro na migração",
        description: error.message || "Não foi possível realizar a migração.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActivityBadge = (visitante: VisitanteSession) => {
    const agora = new Date();
    const ultimoAcesso = new Date(visitante.ultimo_acesso);
    const diffHoras = (agora.getTime() - ultimoAcesso.getTime()) / (1000 * 60 * 60);

    if (!visitante.ativo) {
      return <Badge variant="secondary">Migrado</Badge>;
    } else if (diffHoras < 1) {
      return <Badge className="bg-green-100 text-green-800">Ativo agora</Badge>;
    } else if (diffHoras < 24) {
      return <Badge className="bg-blue-100 text-blue-800">Ativo hoje</Badge>;
    } else if (diffHoras < 168) { // 7 dias
      return <Badge className="bg-yellow-100 text-yellow-800">Ativo esta semana</Badge>;
    } else {
      return <Badge variant="outline">Inativo</Badge>;
    }
  };

  if (loadingStats || loadingVisitantes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
        <AdminHeader />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      <AdminHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Gestão de Visitantes</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie as sessões de visitantes da plataforma
          </p>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Visitantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.total_visitantes}</div>
                <p className="text-xs text-muted-foreground">Registrados na plataforma</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos (30 dias)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.visitantes_ativos_30_dias}</div>
                <p className="text-xs text-muted-foreground">Acessaram recentemente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redações Enviadas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.total_redacoes_visitantes}</div>
                <p className="text-xs text-muted-foreground">Por todos os visitantes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos (7 dias)</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.visitantes_ultima_semana}</div>
                <p className="text-xs text-muted-foreground">Última semana</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros e Ordenação */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Ordenar por:</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultimo_acesso">Último acesso ↓</SelectItem>
                    <SelectItem value="+ultimo_acesso">Último acesso ↑</SelectItem>
                    <SelectItem value="primeiro_acesso">Primeiro acesso ↓</SelectItem>
                    <SelectItem value="+primeiro_acesso">Primeiro acesso ↑</SelectItem>
                    <SelectItem value="nome_visitante">Nome A-Z</SelectItem>
                    <SelectItem value="+nome_visitante">Nome Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filtrar:</label>
                <Select value={filterActive?.toString() || 'all'} onValueChange={(value) => {
                  setFilterActive(value === 'all' ? null : value === 'true');
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Ativos</SelectItem>
                    <SelectItem value="false">Migrados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Visitantes */}
        <Card>
          <CardHeader>
            <CardTitle>Sessões de Visitantes ({visitantes.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visitantes que acessaram a plataforma e podem ser convertidos em alunos oficiais
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visitantes.map((visitante) => (
                <div 
                  key={visitante.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{visitante.nome_visitante}</h3>
                      {getActivityBadge(visitante)}
                      {visitante.total_redacoes && visitante.total_redacoes > 0 && (
                        <Badge variant="outline">
                          {visitante.total_redacoes} redações
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      📧 {visitante.email_visitante}
                    </p>
                    
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Primeiro acesso: {formatDate(visitante.primeiro_acesso)}</span>
                      <span>Último acesso: {formatDate(visitante.ultimo_acesso)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVisitante(visitante)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                    
                    {visitante.ativo && visitante.total_redacoes && visitante.total_redacoes > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedVisitante(visitante);
                          setShowMigrationDialog(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Migrar para Aluno
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {visitantes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum visitante encontrado com os filtros aplicados.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Detalhes do Visitante */}
        <Dialog open={!!selectedVisitante && !showMigrationDialog} onOpenChange={(open) => {
          if (!open) setSelectedVisitante(null);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Visitante</DialogTitle>
            </DialogHeader>
            
            {selectedVisitante && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-semibold">{selectedVisitante.nome_visitante}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="font-semibold">{selectedVisitante.email_visitante}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                    <p className="font-mono text-sm">{selectedVisitante.session_id}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="pt-1">
                      {getActivityBadge(selectedVisitante)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Primeiro Acesso</label>
                    <p>{formatDate(selectedVisitante.primeiro_acesso)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Último Acesso</label>
                    <p>{formatDate(selectedVisitante.ultimo_acesso)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total de Redações</label>
                    <p className="font-semibold text-lg">{selectedVisitante.total_redacoes || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Migração */}
        <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Migrar Visitante para Aluno</DialogTitle>
            </DialogHeader>
            
            {selectedVisitante && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Visitante a ser migrado:</h4>
                  <p><strong>Nome:</strong> {selectedVisitante.nome_visitante}</p>
                  <p><strong>Email:</strong> {selectedVisitante.email_visitante}</p>
                  <p><strong>Redações:</strong> {selectedVisitante.total_redacoes}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Selecione a turma de destino:
                  </label>
                  <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma turma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {turmas.map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          {turma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowMigrationDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleMigrarVisitante} disabled={!selectedTurma}>
                    Migrar para Aluno
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VisitantesAdmin;