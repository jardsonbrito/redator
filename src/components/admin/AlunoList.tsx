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
import { Edit, Trash2, Search, UserX, UserCheck, Users } from "lucide-react";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  turma: string;
  created_at: string;
  ativo: boolean;
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
  const { toast } = useToast();

  const fetchAlunos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma, created_at, ativo")
        .eq("user_type", "aluno")
        .eq("is_authenticated_student", true)
        .order("nome", { ascending: true }); // Ordenar por nome alfabeticamente

      if (error) throw error;

      setAlunos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        title: "Erro ao carregar alunos",
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

  // Lista fixa de turmas do sistema
  const turmasDisponiveis = useMemo(() => {
    const turmasFixas = ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'];
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

  // Determinar a classe de grid baseada no número de turmas
  const getGridClass = () => {
    const totalTabs = turmasDisponiveis.length + 1; // +1 para a aba "Todos"
    if (totalTabs <= 2) return "grid-cols-2";
    if (totalTabs <= 3) return "grid-cols-3";
    if (totalTabs <= 4) return "grid-cols-4";
    if (totalTabs <= 5) return "grid-cols-5";
    return "grid-cols-6";
  };

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

  const getTurmaColor = (turma: string) => {
    const colors = {
      "Turma A": "bg-blue-100 text-blue-800",
      "Turma B": "bg-green-100 text-green-800", 
      "Turma C": "bg-purple-100 text-purple-800",
      "Turma D": "bg-orange-100 text-orange-800",
      "Turma E": "bg-pink-100 text-pink-800"
    };
    return colors[turma as keyof typeof colors] || "bg-gray-100 text-gray-800";
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
          Lista de Alunos Cadastrados
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTurma} onValueChange={setActiveTurma} className="w-full">
          <TabsList className={`grid w-full ${getGridClass()}`}>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              Todos ({alunos.length})
            </TabsTrigger>
            {turmasDisponiveis.map((turma) => (
              <TabsTrigger 
                key={turma} 
                value={turma}
                className="flex items-center gap-2"
              >
                {turma} ({contadorPorTurma[turma] || 0})
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
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
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
}

const AlunoTable = ({ 
  alunos, 
  loading, 
  searchTerm, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  getTurmaColor 
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
            <TableHead>Nome Completo</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Turma</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data de Cadastro</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alunos.map((aluno) => (
            <TableRow key={aluno.id}>
              <TableCell className="font-medium">{aluno.nome}</TableCell>
              <TableCell>{aluno.email}</TableCell>
              <TableCell>
                <Badge className={getTurmaColor(aluno.turma)}>
                  {aluno.turma?.replace('Turma ', '') || ''}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={aluno.ativo ? "default" : "secondary"}
                  className={aluno.ativo ? "bg-purple-600 text-white" : "bg-purple-200 text-purple-800"}
                >
                  {aluno.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(aluno.created_at).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(aluno)}
                    className={aluno.ativo ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                  >
                    {aluno.ativo ? (
                      <UserX className="w-4 h-4 mr-1" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-1" />
                    )}
                    {aluno.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Botão Editar clicado para aluno:", aluno.nome);
                      onEdit(aluno);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você tem certeza que deseja excluir o aluno <strong>{aluno.nome}</strong>?
                          <br />
                          <br />
                          <em>Nota: O histórico de redações e notas do aluno será mantido para referência futura.</em>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(aluno)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
