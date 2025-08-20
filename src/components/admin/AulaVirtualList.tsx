
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Calendar, Clock, Users, ExternalLink, Trash2, Power, PowerOff, Edit, Radio, BarChart3 } from "lucide-react";
import { computeStatus } from "@/utils/aulaStatus";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FrequenciaModal } from "./FrequenciaModal";

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
  eh_aula_ao_vivo?: boolean;
  status_transmissao?: string;
}

export const AulaVirtualList = ({ refresh, onEdit }: { refresh?: boolean; onEdit?: (aula: AulaVirtual) => void }) => {
  const [aulas, setAulas] = useState<AulaVirtual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [frequenciaModal, setFrequenciaModal] = useState<{
    isOpen: boolean;
    aulaId: string;
    aulaTitle: string;
  }>({
    isOpen: false,
    aulaId: '',
    aulaTitle: ''
  });

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

  const openFrequenciaModal = (aula: AulaVirtual) => {
    setFrequenciaModal({
      isOpen: true,
      aulaId: aula.id,
      aulaTitle: aula.titulo
    });
  };

  const closeFrequenciaModal = () => {
    setFrequenciaModal({
      isOpen: false,
      aulaId: '',
      aulaTitle: ''
    });
  };

  const getStatusBadge = (aula: AulaVirtual) => {
    if (!aula.eh_aula_ao_vivo) return null;
    
    try {
      // Converte a data do formato YYYY-MM-DD para DD/MM/YYYY
      const [year, month, day] = aula.data_aula.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      console.log('🔍 Data formatada para computeStatus:', {
        original: aula.data_aula,
        formatted: formattedDate,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });
      
      const status = computeStatus({
        data_aula: formattedDate,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });

      const statusMap = {
        'agendada': { emoji: '📅', text: 'Agendada' },
        'ao_vivo': { emoji: '🔴', text: 'Em Transmissão' },
        'encerrada': { emoji: '⏹️', text: 'Encerrada' },
        'indefinido': { emoji: '❓', text: 'Indefinido' }
      };

      const currentStatus = statusMap[status] || statusMap['indefinido'];
      
      return (
        <Badge variant="outline" className="text-xs mt-1">
          {currentStatus.emoji} {currentStatus.text}
        </Badge>
      );
    } catch (error) {
      console.error('🚨 Erro ao calcular status da aula:', error, aula);
      return (
        <Badge variant="outline" className="text-xs mt-1">
          ❓ Erro no Status
        </Badge>
      );
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
    <>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{aula.titulo}</p>
                            {aula.eh_aula_ao_vivo && (
                              <Badge variant="secondary" className="text-xs">
                                <Radio className="w-3 h-3 mr-1" />
                                Ao Vivo
                              </Badge>
                            )}
                          </div>
                          {aula.descricao && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {aula.descricao}
                            </p>
                          )}
                          {getStatusBadge(aula)}
                        </div>
                      </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(aula.data_aula + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
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
                          {aula.eh_aula_ao_vivo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFrequenciaModal(aula)}
                              title="Ver frequência"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(aula)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
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

      <FrequenciaModal
        isOpen={frequenciaModal.isOpen}
        onClose={closeFrequenciaModal}
        aulaId={frequenciaModal.aulaId}
        aulaTitle={frequenciaModal.aulaTitle}
      />
    </>
  );
};
