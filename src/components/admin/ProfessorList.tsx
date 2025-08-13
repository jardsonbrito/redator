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
  Shield, 
  ShieldCheck, 
  Power, 
  PowerOff, 
  ArrowUpDown,
  AlertTriangle,
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  role: string;
  ativo: boolean;
  primeiro_login: boolean;
  ultimo_login: string | null;
  ultimo_ip: unknown;
  ultimo_browser: string | null;
  criado_em: string;
  atualizado_em: string;
  senha_hash: string;
}

interface ProfessorListProps {
  refresh: boolean;
  onEdit: (professor: Professor) => void;
}

export const ProfessorList = ({ refresh, onEdit }: ProfessorListProps) => {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const fetchProfessores = async () => {
    try {
      const { data, error } = await supabase
        .from('professores')
        .select('*')
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

  const handleChangeRole = async (professorId: string, novoRole: string) => {
    try {
      const { error } = await supabase
        .from('professores')
        .update({ role: novoRole })
        .eq('id', professorId);

      if (error) throw error;

      toast({
        title: "Tipo de acesso alterado",
        description: `Tipo de acesso alterado para ${novoRole === 'admin' ? 'Administrador' : 'Professor'}.`
      });

      fetchProfessores();
    } catch (error: any) {
      console.error('Erro ao alterar role:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o tipo de acesso.",
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
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer" onClick={handleSortByDate}>
                    <div className="flex items-center gap-1">
                      Data de Cadastro
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </TableHead>
                  <TableHead>Tipo de Acesso</TableHead>
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
                    <TableCell>
                      <Badge variant={professor.ativo ? "default" : "secondary"}>
                        {professor.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(professor.criado_em)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {professor.role === 'admin' ? (
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <Shield className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="capitalize">
                          {professor.role === 'admin' ? 'Administrador' : 'Professor'}
                        </span>
                      </div>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(professor)}
                          title="Editar dados"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAtivo(professor.id, !professor.ativo)}
                          title={professor.ativo ? "Inativar conta" : "Ativar conta"}
                        >
                          {professor.ativo ? (
                            <PowerOff className="w-4 h-4 text-red-500" />
                          ) : (
                            <Power className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChangeRole(professor.id, professor.role === 'admin' ? 'professor' : 'admin')}
                          title={`Alterar para ${professor.role === 'admin' ? 'Professor' : 'Administrador'}`}
                        >
                          {professor.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-blue-500" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
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