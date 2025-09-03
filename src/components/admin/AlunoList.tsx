import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Search, UserX, UserCheck, Users, Info } from "lucide-react";
import { VisitanteInfoModal } from "./VisitanteInfoModal";
import { MigrarVisitanteModal } from "./MigrarVisitanteModal";

interface Aluno {
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
  whatsapp?: string;
}

interface AlunoListProps {
  refresh: boolean;
  onEdit: (aluno: Aluno) => void;
}

export const AlunoList = ({ refresh, onEdit }: AlunoListProps) => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTurma, setActiveTurma] = useState("todos");
  const [selectedVisitante, setSelectedVisitante] = useState<Aluno | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [visitanteParaMigrar, setVisitanteParaMigrar] = useState<Aluno | null>(null);
  const [isMigrarModalOpen, setIsMigrarModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchAlunos = async () => {
    setLoading(true);
    try {
      const todosUsuarios: Aluno[] = [];

      // Buscar alunos tradicionais e visitantes em paralelo
      const [
        { data: alunosData, error: alunosError },
        { data: visitantesData, error: visitantesError },
        { data: todasRedacoes, error: redacoesError }
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, turma, created_at, ativo")
          .eq("user_type", "aluno")
          .eq("is_authenticated_student", true)
          .order("nome", { ascending: true }),
        
        // Simulate visitor data (no visitante_sessoes table exists)
        Promise.resolve({ data: [], error: null }),
        
        // Buscar TODAS as redações de uma vez
        supabase
          .from('redacoes_enviadas')
          .select('email_aluno, turma')
      ]);

      if (alunosError) throw alunosError;
      if (redacoesError) throw redacoesError;

      // Criar mapa de contagem de redações por email (otimização)
      const redacoesPorEmail = new Map<string, number>();
      
      if (todasRedacoes) {
        todasRedacoes.forEach(redacao => {
          const email = redacao.email_aluno.toLowerCase();
          redacoesPorEmail.set(email, (redacoesPorEmail.get(email) || 0) + 1);
        });
      }

      // Processar alunos
      if (alunosData) {
        alunosData.forEach(aluno => {
          const emailLower = aluno.email.toLowerCase();
          const totalRedacoes = redacoesPorEmail.get(emailLower) || 0;
          
          todosUsuarios.push({
            ...aluno,
            tipo: 'aluno',
            total_redacoes: totalRedacoes
          });
        });
      }

      // Processar visitantes (no table exists, create from redacoes data)
      if (todasRedacoes) {
        const visitantesEmails = new Set<string>();
        todasRedacoes.forEach(redacao => {
          if (redacao.turma === 'visitante') {
            visitantesEmails.add(redacao.email_aluno.toLowerCase());
          }
        });

        visitantesEmails.forEach(email => {
          const redacoesVisitante = todasRedacoes.filter(r => 
            r.turma === 'visitante' && r.email_aluno.toLowerCase() === email
          ).length;
          
          todosUsuarios.push({
            id: `visitante-${email}`,
            nome: 'Visitante',
            email: email,
            turma: 'visitante',
            created_at: new Date().toISOString(),
            ativo: true,
            tipo: 'visitante',
            ultimo_acesso: new Date().toISOString(),
            session_id: null,
            total_redacoes: redacoesVisitante,
            whatsapp: null
          });
        });
      }

      // Ordenar: visitantes engajados primeiro, depois alunos por nome
      todosUsuarios.sort((a, b) => {
        if (a.tipo === 'visitante' && b.tipo === 'aluno' && a.total_redacoes > 0) return -1;
        if (a.tipo === 'aluno' && b.tipo === 'visitante' && b.total_redacoes > 0) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setAlunos(todosUsuarios);
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
    fetchAlunos();
  }, [refresh]);

  // Lista fixa de turmas do sistema + visitantes
  const turmasDisponiveis = useMemo(() => {
    const turmasFixas = ['visitante', 'Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'];
    return turmasFixas;
  }, []);

  // Filtrar alunos baseado na turma ativa e termo de busca
  const filteredAlunos = useMemo(() => {
    let filtered = alunos;

    // Filtrar por turma
    if (activeTurma !== "todos") {
      filtered = filtered.filter(aluno => aluno.turma === activeTurma);
    }

    // Filtrar por termo de busca (apenas nome e email)
    if (searchTerm.trim()) {
      filtered = filtered.filter(aluno => 
        aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [alunos, activeTurma, searchTerm]);

  // Contar alunos por turma
  const contadorPorTurma = useMemo(() => {
    const contador: { [key: string]: number } = {};
    alunos.forEach(aluno => {
      contador[aluno.turma] = (contador[aluno.turma] || 0) + 1;
    });
    return contador;
  }, [alunos]);


  const handleEdit = (aluno: Aluno) => {
    console.log("AlunoList - Clicou em editar aluno:", aluno);
    console.log("AlunoList - Dados do aluno:", {
      id: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      turma: aluno.turma,
      created_at: aluno.created_at
    });
    
    // Garantir que todos os dados necessários estão presentes
    const alunoParaEdicao = {
      id: aluno.id,
      nome: aluno.nome || '',
      email: aluno.email || '',
      turma: aluno.turma || '',
      created_at: aluno.created_at,
      ativo: aluno.ativo
    };
    
    console.log("AlunoList - Enviando para onEdit:", alunoParaEdicao);
    onEdit(alunoParaEdicao);
  };

  const handleDelete = async (aluno: Aluno) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", aluno.id);

      if (error) throw error;

      toast({
        title: "Aluno excluído",
        description: `${aluno.nome} foi removido do sistema.`
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao excluir aluno:", error);
      toast({
        title: "Erro ao excluir aluno",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (aluno: Aluno) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !aluno.ativo })
        .eq("id", aluno.id);

      if (error) throw error;

      toast({
        title: aluno.ativo ? "Aluno desativado" : "Aluno ativado",
        description: `${aluno.nome} foi ${aluno.ativo ? 'desativado' : 'ativado'} com sucesso.`
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao alterar status do aluno:", error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleShowVisitanteInfo = (visitante: Aluno) => {
    setSelectedVisitante(visitante);
    setIsInfoModalOpen(true);
  };

  const handleShowMigrarModal = (visitante: Aluno) => {
    setVisitanteParaMigrar(visitante);
    setIsMigrarModalOpen(true);
  };

  const handleMigracaoSuccess = () => {
    // Recarregar a lista após migração bem-sucedida
    fetchAlunos();
  };

  const getTurmaColor = (turma: string) => {
    const colors = {
      "visitante": "bg-teal-100 text-teal-800",        // Teal único para visitante
      "Turma A": "bg-blue-100 text-blue-800",
      "Turma B": "bg-green-100 text-green-800", 
      "Turma C": "bg-purple-100 text-purple-800",
      "Turma D": "bg-orange-100 text-orange-800",
      "Turma E": "bg-pink-100 text-pink-800"
    };
    return colors[turma as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getTipoBadge = (usuario: Aluno) => {
    if (usuario.tipo === 'visitante') {
      if (usuario.total_redacoes && usuario.total_redacoes > 0) {
        return <Badge className="bg-orange-100 text-orange-800 text-xs px-2">Engajado</Badge>;
      }
      return <Badge variant="outline" className="text-xs px-2">Visitante</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 text-xs px-2">Aluno</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando alunos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lista de Alunos e Visitantes
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTurma} onValueChange={setActiveTurma} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger value="todos" className="flex items-center gap-2">
              Todos ({alunos.length})
            </TabsTrigger>
            {turmasDisponiveis.map((turma) => (
              <TabsTrigger 
                key={turma} 
                value={turma}
                className="flex items-center gap-2"
              >
                {turma === 'visitante' ? 'Visitante' : turma} ({contadorPorTurma[turma] || 0})
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
            <AlunoTable 
              alunos={filteredAlunos} 
              loading={loading}
              searchTerm={searchTerm}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              getTurmaColor={getTurmaColor}
              getTipoBadge={getTipoBadge}
              onShowVisitanteInfo={handleShowVisitanteInfo}
              onShowMigrarModal={handleShowMigrarModal}
            />
          </TabsContent>

          {turmasDisponiveis.map((turma) => (
            <TabsContent key={turma} value={turma} className="mt-0">
              <AlunoTable 
                alunos={filteredAlunos} 
                loading={loading}
                searchTerm={searchTerm}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                getTurmaColor={getTurmaColor}
                getTipoBadge={getTipoBadge}
                onShowVisitanteInfo={handleShowVisitanteInfo}
                onShowMigrarModal={handleShowMigrarModal}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Modal de Informações do Visitante */}
      <VisitanteInfoModal
        visitante={selectedVisitante && selectedVisitante.tipo === 'visitante' ? {
          id: selectedVisitante.id,
          nome: selectedVisitante.nome,
          email: selectedVisitante.email,
          turma: selectedVisitante.turma,
          created_at: selectedVisitante.created_at,
          ativo: selectedVisitante.ativo,
          tipo: 'visitante' as const,
          ultimo_acesso: selectedVisitante.ultimo_acesso,
          total_redacoes: selectedVisitante.total_redacoes,
          session_id: selectedVisitante.session_id,
          whatsapp: selectedVisitante.whatsapp
        } : null}
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setSelectedVisitante(null);
        }}
        onMigrar={handleShowMigrarModal}
      />

      {/* Modal de Migração do Visitante */}
      <MigrarVisitanteModal
        visitante={visitanteParaMigrar && visitanteParaMigrar.tipo === 'visitante' ? {
          id: visitanteParaMigrar.id,
          nome: visitanteParaMigrar.nome,
          email: visitanteParaMigrar.email,
          turma: visitanteParaMigrar.turma,
          created_at: visitanteParaMigrar.created_at,
          ativo: visitanteParaMigrar.ativo,
          tipo: 'visitante' as const,
          ultimo_acesso: visitanteParaMigrar.ultimo_acesso,
          total_redacoes: visitanteParaMigrar.total_redacoes,
          session_id: visitanteParaMigrar.session_id,
          whatsapp: visitanteParaMigrar.whatsapp
        } : null}
        isOpen={isMigrarModalOpen}
        onClose={() => {
          setIsMigrarModalOpen(false);
          setVisitanteParaMigrar(null);
        }}
        onSuccess={handleMigracaoSuccess}
      />
    </Card>
  );
};

// Componente separado para a tabela
interface AlunoTableProps {
  alunos: Aluno[];
  loading: boolean;
  searchTerm: string;
  onEdit: (aluno: Aluno) => void;
  onDelete: (aluno: Aluno) => void;
  onToggleStatus: (aluno: Aluno) => void;
  getTurmaColor: (turma: string) => string;
  getTipoBadge: (usuario: Aluno) => React.ReactNode;
  onShowVisitanteInfo: (visitante: Aluno) => void;
  onShowMigrarModal: (visitante: Aluno) => void;
}

const AlunoTable = ({ 
  alunos, 
  loading, 
  searchTerm, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  getTurmaColor,
  getTipoBadge,
  onShowVisitanteInfo,
  onShowMigrarModal
}: AlunoTableProps) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Carregando alunos...</div>
      </div>
    );
  }

  if (alunos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchTerm ? "Nenhum aluno encontrado com os critérios de busca." : "Nenhum aluno cadastrado nesta turma."}
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
          {alunos.map((aluno) => (
            <TableRow key={aluno.id}>
              <TableCell className="font-medium text-xs p-2 max-w-[120px] truncate" title={aluno.nome}>
                {aluno.nome}
              </TableCell>
              <TableCell className="text-xs p-2 max-w-[160px] truncate" title={aluno.email}>
                {aluno.email}
              </TableCell>
              <TableCell className="p-2">
                <div className={`text-xs px-2 py-1 rounded text-center font-medium ${aluno.tipo === 'visitante' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-800'}`}>
                  {aluno.tipo === 'visitante' ? 'Visitante' : 'Aluno'}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <div className={`text-xs px-1 py-0.5 rounded text-center font-medium ${getTurmaColor(aluno.turma)}`}>
                  {aluno.turma === 'visitante' ? 'V' : aluno.turma?.slice(-1) || ''}
                </div>
              </TableCell>
              <TableCell className="text-center p-2">
                <div className="text-xs font-medium">
                  {aluno.total_redacoes || 0}
                </div>
              </TableCell>
              <TableCell className="text-center p-2">
                <div className={`text-xs ${aluno.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                  {aluno.ativo ? "✓" : "✗"}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <div className="text-xs">
                  <div className="font-medium">
                    {new Date(aluno.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                  {aluno.tipo === 'visitante' && aluno.ultimo_acesso && (
                    <div className="text-muted-foreground">
                      {new Date(aluno.ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right p-2">
                <div className="flex flex-col gap-1">
                  {aluno.tipo === 'visitante' ? (
                    // Ações para visitantes
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onShowVisitanteInfo(aluno)}
                        className="text-green-600 hover:text-green-700 text-xs h-6 px-2"
                      >
                        <Info className="w-3 h-3 mr-1" />
                        Info
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onShowMigrarModal(aluno)}
                        className="text-blue-600 hover:text-blue-700 text-xs h-6 px-2"
                      >
                        Migrar
                      </Button>
                    </>
                  ) : (
                    // Ações para alunos regulares
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(aluno)}
                        className={`${aluno.ativo ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"} text-xs h-6 px-2`}
                      >
                        {aluno.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(aluno);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-xs h-6 px-2"
                      >
                        Editar
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Excluir ${aluno.nome}?`)) {
                            onDelete(aluno);
                          }
                        }}
                        className="text-xs h-6 px-2"
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
