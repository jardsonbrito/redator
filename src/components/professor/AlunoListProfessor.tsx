import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Mail, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AlunoVisitante {
  id: string;
  nome: string;
  email: string;
  turma: string;
  created_at: string;
  ativo: boolean;
  tipo?: 'aluno' | 'visitante';
  ultimo_acesso?: string;
  total_redacoes?: number;
  session_id?: string;
}

interface AlunoListProfessorProps {
  refresh: boolean;
}

export const AlunoListProfessor = ({ refresh }: AlunoListProfessorProps) => {
  const [usuarios, setUsuarios] = useState<AlunoVisitante[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTurma, setActiveTurma] = useState("todos");
  const [selectedVisitante, setSelectedVisitante] = useState<AlunoVisitante | null>(null);
  const { toast } = useToast();

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const todosUsuarios: AlunoVisitante[] = [];

      // Buscar alunos tradicionais
      const { data: alunosData, error: alunosError } = await supabase
        .from("profiles")
        .select("id, nome, email, turma, created_at, ativo")
        .eq("user_type", "aluno")
        .eq("is_authenticated_student", true)
        .order("nome", { ascending: true });

      if (alunosError) throw alunosError;

      // Buscar contagem de redações para cada aluno
      if (alunosData) {
        for (const aluno of alunosData) {
          const { data: redacoes } = await supabase
            .from('redacoes_enviadas')
            .select('id', { count: 'exact' })
            .ilike('email_aluno', aluno.email);
          
          todosUsuarios.push({
            ...aluno,
            tipo: 'aluno',
            total_redacoes: redacoes?.length || 0
          });
        }
      }

      // Buscar visitantes engajados (com redações)
      const { data: visitantesData, error: visitantesError } = await supabase
        .from("visitante_sessoes")
        .select("*")
        .eq("ativo", true)
        .order("nome_visitante", { ascending: true });

      if (visitantesError) {
        console.warn("Erro ao buscar visitantes:", visitantesError);
      } else if (visitantesData) {
        // Buscar contagem de redações para cada visitante
        for (const visitante of visitantesData) {
          const { data: redacoes } = await supabase
            .from('redacoes_enviadas')
            .select('id', { count: 'exact' })
            .eq('turma', 'visitante')
            .ilike('email_aluno', visitante.email_visitante);
          
          const totalRedacoes = redacoes?.length || 0;
          
          // Só incluir visitantes com redações (engajados)
          if (totalRedacoes > 0) {
            todosUsuarios.push({
              id: visitante.id,
              nome: visitante.nome_visitante,
              email: visitante.email_visitante,
              turma: 'visitante',
              created_at: visitante.primeiro_acesso,
              ativo: visitante.ativo,
              tipo: 'visitante',
              ultimo_acesso: visitante.ultimo_acesso,
              session_id: visitante.session_id,
              total_redacoes: totalRedacoes
            });
          }
        }
      }

      // Ordenar: visitantes engajados primeiro, depois alunos por nome
      todosUsuarios.sort((a, b) => {
        if (a.tipo === 'visitante' && b.tipo === 'aluno') return -1;
        if (a.tipo === 'aluno' && b.tipo === 'visitante') return 1;
        return a.nome.localeCompare(b.nome);
      });

      setUsuarios(todosUsuarios);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [refresh]);

  // Lista de turmas disponíveis
  const turmasDisponiveis = useMemo(() => {
    const turmasUnicas = [...new Set(usuarios.map(u => u.turma))];
    return turmasUnicas.sort((a, b) => {
      if (a === 'visitante') return -1; // Visitante primeiro
      if (b === 'visitante') return 1;
      return a.localeCompare(b);
    });
  }, [usuarios]);

  // Filtrar usuários
  const filteredUsuarios = useMemo(() => {
    let filtered = usuarios;

    // Filtrar por turma
    if (activeTurma !== "todos") {
      filtered = filtered.filter(usuario => usuario.turma === activeTurma);
    }

    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(usuario => 
        usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [usuarios, activeTurma, searchTerm]);

  // Contar usuários por turma
  const contadorPorTurma = useMemo(() => {
    const contador: { [key: string]: number } = {};
    usuarios.forEach(usuario => {
      contador[usuario.turma] = (contador[usuario.turma] || 0) + 1;
    });
    return contador;
  }, [usuarios]);

  const getTurmaColor = (turma: string) => {
    const colors = {
      "visitante": "bg-orange-100 text-orange-800",
      "Turma A": "bg-blue-100 text-blue-800",
      "Turma B": "bg-green-100 text-green-800", 
      "Turma C": "bg-purple-100 text-purple-800",
      "Turma D": "bg-orange-100 text-orange-800",
      "Turma E": "bg-pink-100 text-pink-800"
    };
    return colors[turma as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getTipoBadge = (usuario: AlunoVisitante) => {
    if (usuario.tipo === 'visitante') {
      return <Badge className="bg-orange-100 text-orange-800 text-xs px-2">Engajado</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 text-xs px-2">Aluno</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando dados...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Alunos e Visitantes Engajados
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Monitore seus alunos oficiais e visitantes que demonstraram interesse
        </p>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTurma} onValueChange={setActiveTurma} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger value="todos" className="flex items-center gap-2">
              Todos ({usuarios.length})
            </TabsTrigger>
            {turmasDisponiveis.map((turma) => (
              <TabsTrigger 
                key={turma} 
                value={turma}
                className="flex items-center gap-2"
              >
                {turma === 'visitante' ? 'Visitantes' : turma} ({contadorPorTurma[turma] || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="todos" className="mt-0">
            <UsuarioTable 
              usuarios={filteredUsuarios} 
              loading={loading}
              searchTerm={searchTerm}
              getTurmaColor={getTurmaColor}
              getTipoBadge={getTipoBadge}
              formatDate={formatDate}
              onViewVisitante={setSelectedVisitante}
            />
          </TabsContent>

          {turmasDisponiveis.map((turma) => (
            <TabsContent key={turma} value={turma} className="mt-0">
              <UsuarioTable 
                usuarios={filteredUsuarios} 
                loading={loading}
                searchTerm={searchTerm}
                getTurmaColor={getTurmaColor}
                getTipoBadge={getTipoBadge}
                formatDate={formatDate}
                onViewVisitante={setSelectedVisitante}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Dialog de detalhes do visitante */}
        <Dialog open={!!selectedVisitante} onOpenChange={(open) => {
          if (!open) setSelectedVisitante(null);
        }}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-primary">Visitante Engajado</DialogTitle>
            </DialogHeader>
            
            {selectedVisitante && (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-semibold mb-2 text-primary">💡 Oportunidade</h4>
                  <p className="text-sm text-muted-foreground">
                    Este visitante enviou {selectedVisitante.total_redacoes} redação{selectedVisitante.total_redacoes! > 1 ? 'ões' : ''}. 
                    Considere convidá-lo para uma turma oficial.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-semibold">{selectedVisitante.nome}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email de Contato</label>
                    <p className="font-semibold text-primary">{selectedVisitante.email}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total de Redações</label>
                    <p className="font-semibold text-lg text-primary">{selectedVisitante.total_redacoes}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="pt-1">
                      {getTipoBadge(selectedVisitante)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Primeiro Acesso</label>
                    <p>{formatDate(selectedVisitante.created_at)}</p>
                  </div>
                  
                  {selectedVisitante.ultimo_acesso && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Último Acesso</label>
                      <p>{formatDate(selectedVisitante.ultimo_acesso)}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => window.open(`mailto:${selectedVisitante?.email}?subject=Convite%20para%20turma%20oficial&body=Olá%20${selectedVisitante?.nome},%0A%0AVimos%20que%20você%20enviou%20${selectedVisitante?.total_redacoes}%20redação(ões)%20como%20visitante.%20Gostaria%20de%20fazer%20parte%20de%20uma%20turma%20oficial?`, '_blank')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Convite por Email
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Componente da tabela
interface UsuarioTableProps {
  usuarios: AlunoVisitante[];
  loading: boolean;
  searchTerm: string;
  getTurmaColor: (turma: string) => string;
  getTipoBadge: (usuario: AlunoVisitante) => React.ReactNode;
  formatDate: (dateString: string) => string;
  onViewVisitante: (visitante: AlunoVisitante) => void;
}

const UsuarioTable = ({ 
  usuarios, 
  loading, 
  searchTerm, 
  getTurmaColor,
  getTipoBadge,
  formatDate,
  onViewVisitante
}: UsuarioTableProps) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchTerm ? "Nenhum usuário encontrado." : "Nenhum aluno ou visitante cadastrado."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Nome</TableHead>
            <TableHead className="w-[160px]">E-mail</TableHead>
            <TableHead className="w-[80px]">Tipo</TableHead>
            <TableHead className="w-[60px]">Turma</TableHead>
            <TableHead className="w-[50px]">Red.</TableHead>
            <TableHead className="w-[50px]">Status</TableHead>
            <TableHead className="w-[70px]">Data</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell className="font-medium text-xs p-2 max-w-[120px] truncate" title={usuario.nome}>
                {usuario.nome}
              </TableCell>
              <TableCell className="text-xs p-2 max-w-[160px] truncate" title={usuario.email}>
                {usuario.email}
              </TableCell>
              <TableCell className="p-2">
                <div className={`text-xs px-2 py-1 rounded text-center font-medium ${usuario.tipo === 'visitante' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                  {usuario.tipo === 'visitante' ? 'Visitante' : 'Aluno'}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <div className={`text-xs px-1 py-0.5 rounded text-center font-medium ${getTurmaColor(usuario.turma)}`}>
                  {usuario.turma === 'visitante' ? 'V' : usuario.turma?.slice(-1) || ''}
                </div>
              </TableCell>
              <TableCell className="text-center p-2">
                <div className="text-xs font-medium">
                  {usuario.total_redacoes || 0}
                </div>
              </TableCell>
              <TableCell className="text-center p-2">
                <div className={`text-xs ${usuario.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                  {usuario.ativo ? "✓" : "✗"}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <div className="text-xs">
                  <div className="font-medium">
                    {new Date(usuario.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                  {usuario.tipo === 'visitante' && usuario.ultimo_acesso && (
                    <div className="text-muted-foreground">
                      {new Date(usuario.ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right p-2">
                {usuario.tipo === 'visitante' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewVisitante(usuario)}
                    className="text-orange-600 hover:text-orange-700 text-xs h-6 px-2"
                  >
                    Detalhes
                  </Button>
                ) : (
                  <div className="text-xs text-center text-muted-foreground">
                    Oficial
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};