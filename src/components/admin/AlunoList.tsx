import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Search } from "lucide-react";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  turma: string;
  created_at: string;
}

interface AlunoListProps {
  refresh: boolean;
  onEdit: (aluno: Aluno) => void;
}

export const AlunoList = ({ refresh, onEdit }: AlunoListProps) => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [filteredAlunos, setFilteredAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchAlunos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma, created_at")
        .eq("user_type", "aluno")
        .eq("is_authenticated_student", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAlunos(data || []);
      setFilteredAlunos(data || []);
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

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAlunos(alunos);
      return;
    }

    const filtered = alunos.filter(aluno => 
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.turma.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredAlunos(filtered);
  }, [searchTerm, alunos]);

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
        <CardTitle className="flex items-center justify-between">
          Lista de Alunos Cadastrados
          <Badge variant="secondary">{filteredAlunos.length} aluno(s)</Badge>
        </CardTitle>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, e-mail ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAlunos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "Nenhum aluno encontrado com os critérios de busca." : "Nenhum aluno cadastrado ainda."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlunos.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-medium">{aluno.nome}</TableCell>
                    <TableCell>{aluno.email}</TableCell>
                    <TableCell>
                      <Badge className={getTurmaColor(aluno.turma)}>
                        {aluno.turma}
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
                          onClick={() => onEdit(aluno)}
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
                                onClick={() => handleDelete(aluno)}
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
        )}
      </CardContent>
    </Card>
  );
};