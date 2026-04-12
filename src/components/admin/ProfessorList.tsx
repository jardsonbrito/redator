import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Edit,
  Power,
  PowerOff,
  ArrowUpDown,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
  primeiro_login: boolean;
  ultimo_login: string | null;
  ultimo_ip: unknown;
  criado_em: string;
  turmas_professores?: { nome: string } | null;
}

interface ProfessorListProps {
  refresh: boolean;
  onEdit: (professor: Professor) => void;
}

export const ProfessorList = ({ refresh, onEdit }: ProfessorListProps) => {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfessores = async () => {
    try {
      const { data, error } = await supabase
        .from('professores')
        .select('*, turmas_professores(nome)')
        .order('criado_em', { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setProfessores(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar professores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de professores.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessores();
  }, [refresh, sortOrder]);

  const handleToggleAtivo = async (professorId: string, novoStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('professores')
        .update({ ativo: novoStatus })
        .eq('id', professorId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Professor ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`
      });

      fetchProfessores();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do professor.",
        variant: "destructive"
      });
    }
  };

  const handleSortByDate = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando professores...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lista de Professores ({professores.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {professores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum professor cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer" onClick={handleSortByDate}>
                    <div className="flex items-center gap-1">
                      Data de Cadastro
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professores.map((professor) => (
                  <TableRow key={professor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={professor.primeiro_login ? "text-orange-600 font-medium" : ""}>
                          {professor.nome_completo}
                        </span>
                        {professor.primeiro_login && (
                          <Badge variant="secondary" className="text-orange-600 border-orange-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Primeiro acesso pendente
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{professor.email}</TableCell>
                    <TableCell className="text-sm">
                      {professor.turmas_professores?.nome ?? (
                        <span className="text-muted-foreground">Sem turma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={professor.ativo ? "default" : "secondary"}>
                        {professor.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(professor.criado_em)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {professor.ultimo_login ? (
                        <div>
                          {formatDate(professor.ultimo_login)}
                           {professor.ultimo_ip && (
                             <div className="text-xs text-muted-foreground">
                               IP: {String(professor.ultimo_ip)}
                             </div>
                           )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nunca logou</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu
                        open={openDropdownId === professor.id}
                        onOpenChange={(open) => setOpenDropdownId(open ? professor.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setOpenDropdownId(null);
                            onEdit(professor);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setOpenDropdownId(null);
                            handleToggleAtivo(professor.id, !professor.ativo);
                          }}>
                            {professor.ativo ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4 text-red-500" />
                                Inativar conta
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4 text-green-500" />
                                Ativar conta
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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