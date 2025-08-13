import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Users, AlertTriangle, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  turmas_autorizadas: string[] | null;
  data_agendamento: string | null;
  status: string;
  imagem_url?: string;
  link_externo?: string;
  prioridade: string;
  criado_em: string;
  atualizado_em: string;
}

interface AvisoLeitura {
  id: string;
  aviso_id: string;
  nome_aluno: string;
  sobrenome_aluno: string;
  turma: string;
  data_leitura: string;
}

interface AvisoListProps {
  refresh: boolean;
  onEdit: (aviso: Aviso) => void;
}

export const AvisoList = ({ refresh, onEdit }: AvisoListProps) => {
  const { toast } = useToast();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [leituras, setLeituras] = useState<AvisoLeitura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvisoLeituras, setSelectedAvisoLeituras] = useState<AvisoLeitura[]>([]);

  useEffect(() => {
    fetchAvisos();
    fetchLeituras();
  }, [refresh]);

  const fetchAvisos = async () => {
    try {
      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setAvisos(data || []);
    } catch (error) {
      console.error("Erro ao buscar avisos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeituras = async () => {
    try {
      const { data, error } = await supabase
        .from("avisos_leitura")
        .select("*")
        .order("data_leitura", { ascending: false });

      if (error) throw error;
      setLeituras(data || []);
    } catch (error) {
      console.error("Erro ao buscar leituras:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("avisos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Aviso excluído!",
        description: "O aviso foi excluído com sucesso.",
      });

      fetchAvisos();
    } catch (error) {
      console.error("Erro ao excluir aviso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o aviso. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (aviso: Aviso) => {
    try {
      const novoStatus = aviso.status === 'publicado' ? 'rascunho' : 'publicado';
      
      const { error } = await supabase
        .from("avisos")
        .update({ status: novoStatus })
        .eq("id", aviso.id);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Aviso ${novoStatus === 'publicado' ? 'publicado' : 'despublicado'} com sucesso.`,
      });

      fetchAvisos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'publicado':
        return <Badge className="bg-green-100 text-green-800">Publicado</Badge>;
      case 'agendado':
        return <Badge className="bg-blue-100 text-blue-800">Agendado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    if (prioridade === 'destaque') {
      return <Badge className="bg-orange-100 text-orange-800">Destaque</Badge>;
    }
    return <Badge variant="outline">Comum</Badge>;
  };

  const getLeiturasDoAviso = (avisoId: string) => {
    return leituras.filter(leitura => leitura.aviso_id === avisoId);
  };

  const handleVerLeituras = (avisoId: string) => {
    const leiturasAviso = getLeiturasDoAviso(avisoId);
    setSelectedAvisoLeituras(leiturasAviso);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p>Carregando avisos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Avisos</CardTitle>
      </CardHeader>
      <CardContent>
        {avisos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum aviso cadastrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Turmas</TableHead>
                  <TableHead>Leituras</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avisos.map((aviso) => {
                  const leiturasCount = getLeiturasDoAviso(aviso.id).length;
                  
                  return (
                    <TableRow key={aviso.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {aviso.prioridade === 'destaque' && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                          {aviso.titulo}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(aviso.status)}</TableCell>
                      <TableCell>{getPrioridadeBadge(aviso.prioridade)}</TableCell>
                      <TableCell>
                        {aviso.turmas_autorizadas && aviso.turmas_autorizadas.length > 0 
                          ? aviso.turmas_autorizadas.join(", ")
                          : "Todas as turmas"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{leiturasCount}</span>
                          {leiturasCount > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleVerLeituras(aviso.id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Confirmações de Leitura</DialogTitle>
                                  <DialogDescription>
                                    Lista de alunos que confirmaram a leitura do aviso: "{aviso.titulo}"
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead>Data/Hora</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedAvisoLeituras.map((leitura) => (
                                        <TableRow key={leitura.id}>
                                          <TableCell>
                                            {leitura.nome_aluno} {leitura.sobrenome_aluno}
                                          </TableCell>
                                          <TableCell>{leitura.turma}</TableCell>
                                          <TableCell>
                                            {format(new Date(leitura.data_leitura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(aviso.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(aviso)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(aviso)}
                            className={aviso.status === 'publicado' ? 'text-orange-600' : 'text-green-600'}
                          >
                            {aviso.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(aviso.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};