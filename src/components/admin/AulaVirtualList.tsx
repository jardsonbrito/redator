import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Calendar, Clock, Users, ExternalLink, Trash2, Power, PowerOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface AulaVirtual {
  id: string;
  titulo: string;
  descricao: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  imagem_capa_url: string;
  link_meet: string;
  abrir_aba_externa: boolean;
  ativo: boolean;
  criado_em: string;
}

export const AulaVirtualList = ({ refresh }: { refresh?: boolean }) => {
  const [aulas, setAulas] = useState<AulaVirtual[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .order('data_aula', { ascending: false });

      if (error) throw error;
      setAulas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar aulas virtuais:', error);
      toast.error('Erro ao carregar aulas virtuais');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAulaStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('aulas_virtuais')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Aula ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (error: any) {
      console.error('Erro ao alterar status da aula:', error);
      toast.error('Erro ao alterar status da aula');
    }
  };

  const deleteAula = async (id: string) => {
    try {
      const { error } = await supabase
        .from('aulas_virtuais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Aula excluída com sucesso!');
      fetchAulas();
    } catch (error: any) {
      console.error('Erro ao excluir aula:', error);
      toast.error('Erro ao excluir aula');
    }
  };

  useEffect(() => {
    fetchAulas();
  }, [refresh]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando aulas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Aulas Virtuais ({aulas.length})
          </span>
          <Button onClick={fetchAulas} variant="outline" size="sm">
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aulas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhuma aula virtual criada ainda</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data/Horário</TableHead>
                  <TableHead>Turmas</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aulas.map((aula) => (
                  <TableRow key={aula.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{aula.titulo}</p>
                        {aula.descricao && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {aula.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(aula.data_aula).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {aula.horario_inicio} - {aula.horario_fim}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {aula.turmas_autorizadas.slice(0, 2).map((turma) => (
                          <Badge key={turma} variant="outline" className="text-xs">
                            {turma}
                          </Badge>
                        ))}
                        {aula.turmas_autorizadas.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{aula.turmas_autorizadas.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={aula.abrir_aba_externa ? "default" : "secondary"}>
                        {aula.abrir_aba_externa ? (
                          <><ExternalLink className="w-3 h-3 mr-1" />Externa</>
                        ) : (
                          <>Embutida</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={aula.ativo ? "default" : "secondary"}>
                        {aula.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAulaStatus(aula.id, aula.ativo)}
                        >
                          {aula.ativo ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza de que deseja excluir a aula "{aula.titulo}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAula(aula.id)}>
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