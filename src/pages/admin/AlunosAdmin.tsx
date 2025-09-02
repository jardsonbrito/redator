import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminHeader } from '@/components/AdminHeader';
import { 
  Users, 
  Search, 
  Eye,
  UserPlus,
  GraduationCap,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Aluno {
  id: string;
  nome: string;
  email: string;
  turma: string;
  tipo: 'aluno' | 'visitante';
  primeiro_acesso?: string;
  ultimo_acesso?: string;
  ativo?: boolean;
  total_redacoes?: number;
  created_at?: string;
  session_id?: string;
}

const AlunosAdmin = () => {
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [turmaFilter, setTurmaFilter] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<string>(''); // '', 'aluno', 'visitante'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const { toast } = useToast();

  // Buscar todos os alunos e visitantes
  const { data: todosUsuarios = [], isLoading } = useQuery({
    queryKey: ['admin-alunos-visitantes', searchTerm, turmaFilter, tipoFilter],
    queryFn: async (): Promise<Aluno[]> => {
      const usuarios: Aluno[] = [];
      
      // Buscar alunos tradicionais
      if (tipoFilter === '' || tipoFilter === 'aluno') {
        let alunosQuery = supabase
          .from('profiles')
          .select('id, nome, email, turma, created_at, ativo')
          .eq('user_type', 'aluno');

        if (turmaFilter && turmaFilter !== 'visitante') {
          alunosQuery = alunosQuery.eq('turma', turmaFilter);
        }

        const { data: alunos, error: alunosError } = await alunosQuery;
        
        if (alunosError) {
          console.error('Erro ao buscar alunos:', alunosError);
        } else if (alunos) {
          // Buscar contagem de redações para cada aluno
          for (const aluno of alunos) {
            const { data: redacoes } = await supabase
              .from('redacoes_enviadas')
              .select('id', { count: 'exact' })
              .ilike('email_aluno', aluno.email);
            
            usuarios.push({
              id: aluno.id,
              nome: aluno.nome,
              email: aluno.email,
              turma: aluno.turma || 'Sem turma',
              tipo: 'aluno',
              created_at: aluno.created_at,
              ativo: aluno.ativo,
              total_redacoes: redacoes?.length || 0
            });
          }
        }
      }

      // Buscar visitantes
      if (tipoFilter === '' || tipoFilter === 'visitante') {
        const { data: visitantes, error: visitantesError } = await supabase
          .from('visitante_sessoes')
          .select('*')
          .order('ultimo_acesso', { ascending: false });

        if (visitantesError) {
          console.error('Erro ao buscar visitantes:', visitantesError);
        } else if (visitantes) {
          // Buscar contagem de redações para cada visitante
          for (const visitante of visitantes) {
            const { data: redacoes } = await supabase
              .from('redacoes_enviadas')
              .select('id', { count: 'exact' })
              .eq('turma', 'visitante')
              .ilike('email_aluno', visitante.email_visitante);
            
            usuarios.push({
              id: visitante.id,
              nome: visitante.nome_visitante,
              email: visitante.email_visitante,
              turma: 'visitante',
              tipo: 'visitante',
              primeiro_acesso: visitante.primeiro_acesso,
              ultimo_acesso: visitante.ultimo_acesso,
              ativo: visitante.ativo,
              session_id: visitante.session_id,
              total_redacoes: redacoes?.length || 0
            });
          }
        }
      }

      // Aplicar filtros de busca
      let usuariosFiltrados = usuarios;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        usuariosFiltrados = usuariosFiltrados.filter(usuario =>
          usuario.nome.toLowerCase().includes(searchLower) ||
          usuario.email.toLowerCase().includes(searchLower)
        );
      }

      if (turmaFilter) {
        usuariosFiltrados = usuariosFiltrados.filter(usuario =>
          usuario.turma === turmaFilter
        );
      }

      // Ordenar: visitantes com redações primeiro, depois alunos por nome
      usuariosFiltrados.sort((a, b) => {
        if (a.tipo === 'visitante' && b.tipo === 'aluno' && a.total_redacoes > 0) return -1;
        if (a.tipo === 'aluno' && b.tipo === 'visitante' && b.total_redacoes > 0) return 1;
        return a.nome.localeCompare(b.nome);
      });

      return usuariosFiltrados;
    },
    refetchInterval: 60000
  });

  // Buscar turmas disponíveis
  const { data: turmasDisponiveis = [] } = useQuery({
    queryKey: ['turmas-disponiveis'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('turma')
        .not('turma', 'is', null)
        .neq('turma', '');
      
      const { data: redacoes } = await supabase
        .from('redacoes_enviadas')
        .select('turma')
        .neq('turma', 'visitante')
        .not('turma', 'is', null);
      
      const todasTurmas = [
        ...(profiles?.map(p => p.turma) || []),
        ...(redacoes?.map(r => r.turma) || [])
      ];
      
      const turmasUnicas = [...new Set(todasTurmas)].filter(Boolean);
      return ['visitante', ...turmasUnicas].sort();
    }
  });

  // Função para migrar visitante para aluno
  const handleMigrarVisitante = async (visitante: Aluno, novaTurma: string) => {
    try {
      const { data: resultado, error } = await supabase.rpc('migrar_visitante_para_aluno', {
        p_email_visitante: visitante.email,
        p_nova_turma: novaTurma
      });

      if (error) throw error;

      if (resultado.success) {
        toast({
          title: "Migração realizada!",
          description: `${resultado.redacoes_migradas} redações migradas para ${resultado.turma_destino}`,
        });
        
        setSelectedAluno(null);
        window.location.reload();
      } else {
        throw new Error(resultado.message);
      }
    } catch (error: any) {
      console.error('❌ Erro na migração:', error);
      toast({
        title: "Erro na migração",
        description: error.message || "Não foi possível realizar a migração.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTipoBadge = (usuario: Aluno) => {
    if (usuario.tipo === 'visitante') {
      if (usuario.total_redacoes && usuario.total_redacoes > 0) {
        return <Badge className="bg-orange-100 text-orange-800">Visitante Engajado</Badge>;
      }
      return <Badge variant="outline">Visitante</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Aluno</Badge>;
  };

  const getStatusBadge = (usuario: Aluno) => {
    if (usuario.tipo === 'visitante') {
      if (usuario.ativo) {
        const ultimoAcesso = new Date(usuario.ultimo_acesso || '');
        const agora = new Date();
        const diffHoras = (agora.getTime() - ultimoAcesso.getTime()) / (1000 * 60 * 60);
        
        if (diffHoras < 24) {
          return <Badge className="bg-green-100 text-green-800">Ativo hoje</Badge>;
        } else if (diffHoras < 168) {
          return <Badge className="bg-blue-100 text-blue-800">Ativo esta semana</Badge>;
        }
      }
      return <Badge variant="secondary">Inativo</Badge>;
    }
    
    return usuario.ativo ? 
      <Badge className="bg-green-100 text-green-800">Ativo</Badge> :
      <Badge variant="secondary">Inativo</Badge>;
  };

  // Paginação
  const totalPages = Math.ceil(todosUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsuarios = todosUsuarios.slice(startIndex, endIndex);

  const visitantesEngajados = todosUsuarios.filter(u => u.tipo === 'visitante' && u.total_redacoes && u.total_redacoes > 0).length;
  const alunosAtivos = todosUsuarios.filter(u => u.tipo === 'aluno' && u.ativo).length;
  const totalVisitantes = todosUsuarios.filter(u => u.tipo === 'visitante').length;

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            Alunos e Visitantes
          </h1>
          
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todosUsuarios.length}</div>
                <p className="text-xs text-muted-foreground">Alunos + Visitantes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
                <GraduationCap className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{alunosAtivos}</div>
                <p className="text-xs text-muted-foreground">Cadastrados em turmas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
                <Users className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{totalVisitantes}</div>
                <p className="text-xs text-muted-foreground">Sem turma definida</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Potenciais Conversões</CardTitle>
                <UserPlus className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{visitantesEngajados}</div>
                <p className="text-xs text-muted-foreground">Visitantes com redações</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-64">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="aluno">Apenas Alunos</SelectItem>
                    <SelectItem value="visitante">Apenas Visitantes</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as turmas</SelectItem>
                    {turmasDisponiveis.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        {turma === 'visitante' ? '👥 Visitantes' : `🎓 ${turma}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Usuários ({currentUsuarios.length} de {todosUsuarios.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentUsuarios.map((usuario) => (
                <div 
                  key={`${usuario.tipo}-${usuario.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{usuario.nome}</h3>
                      {getTipoBadge(usuario)}
                      {getStatusBadge(usuario)}
                      {usuario.total_redacoes && usuario.total_redacoes > 0 && (
                        <Badge variant="outline">
                          {usuario.total_redacoes} redação{usuario.total_redacoes > 1 ? 'ões' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>📧 {usuario.email}</span>
                      <span>🎓 {usuario.turma}</span>
                      {usuario.tipo === 'visitante' && usuario.ultimo_acesso && (
                        <span>⏰ {formatDate(usuario.ultimo_acesso)}</span>
                      )}
                      {usuario.tipo === 'aluno' && usuario.created_at && (
                        <span>📅 Cadastrado: {formatDate(usuario.created_at)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAluno(usuario)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}

              {currentUsuarios.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhum usuário encontrado com os filtros aplicados.</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={!!selectedAluno} onOpenChange={(open) => {
          if (!open) setSelectedAluno(null);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAluno?.tipo === 'visitante' ? 'Detalhes do Visitante' : 'Detalhes do Aluno'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedAluno && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-semibold">{selectedAluno.nome}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="font-semibold">{selectedAluno.email}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                    <div className="pt-1">{getTipoBadge(selectedAluno)}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Turma</label>
                    <p className="font-semibold">{selectedAluno.turma}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="pt-1">{getStatusBadge(selectedAluno)}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Redações Enviadas</label>
                    <p className="font-semibold text-lg">{selectedAluno.total_redacoes || 0}</p>
                  </div>
                </div>

                {selectedAluno.tipo === 'visitante' && selectedAluno.ativo && selectedAluno.total_redacoes && selectedAluno.total_redacoes > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold mb-2 text-orange-800">🚀 Migração para Aluno</h4>
                    <p className="text-sm text-orange-700 mb-3">
                      Este visitante está engajado com {selectedAluno.total_redacoes} redação{selectedAluno.total_redacoes > 1 ? 'ões' : ''} enviada{selectedAluno.total_redacoes > 1 ? 's' : ''}. 
                      Considere migrar para aluno oficial.
                    </p>
                    <div className="flex gap-2">
                      {turmasDisponiveis.filter(t => t !== 'visitante').map((turma) => (
                        <Button
                          key={turma}
                          size="sm"
                          onClick={() => handleMigrarVisitante(selectedAluno, turma)}
                        >
                          Migrar para {turma}
                        </Button>
                      ))}
                    </div>
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

export default AlunosAdmin;