import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, MessageSquare, EyeOff, Plus, Clock, Users, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LousaForm from './LousaForm';
import LousaRespostas from './LousaRespostas';

interface Lousa {
  id: string;
  titulo: string;
  enunciado: string;
  status: string;
  inicio_em: string | null;
  fim_em: string | null;
  turmas: string[];
  permite_visitante: boolean;
  ativo: boolean;
  created_at: string;
  capa_url: string | null;
}

export default function LousaList() {
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLousa, setEditingLousa] = useState<Lousa | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Lousa | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  const fetchLousas = async () => {
    try {
      const { data, error } = await supabase
        .from('lousa')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLousas(data || []);
    } catch (error) {
      console.error('Erro ao carregar lousas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lousas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLousas();
  }, []);

  const getStatusBadge = (lousa: Lousa) => {
    const now = new Date();
    const inicio = lousa.inicio_em ? new Date(lousa.inicio_em) : null;
    const fim = lousa.fim_em ? new Date(lousa.fim_em) : null;

    if (lousa.status === 'draft') {
      return <Badge variant="outline">Rascunho</Badge>;
    }

    if (!lousa.ativo) {
      return <Badge variant="destructive">Inativa</Badge>;
    }

    if (inicio && now < inicio) {
      return <Badge variant="secondary">Programada</Badge>;
    }

    if (fim && now > fim) {
      return <Badge variant="destructive">Encerrada</Badge>;
    }

    return <Badge variant="default">Publicada</Badge>;
  };

  const getPeriodText = (lousa: Lousa) => {
    if (!lousa.inicio_em && !lousa.fim_em) {
      return 'Disponível agora';
    }

    const formatDate = (date: string) => 
      format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });

    if (lousa.inicio_em && lousa.fim_em) {
      return `${formatDate(lousa.inicio_em)} - ${formatDate(lousa.fim_em)}`;
    }

    if (lousa.inicio_em) {
      return `A partir de ${formatDate(lousa.inicio_em)}`;
    }

    if (lousa.fim_em) {
      return `Até ${formatDate(lousa.fim_em)}`;
    }

    return 'Disponível agora';
  };

  const handleEndLousa = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lousa')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Lousa encerrada com sucesso'
      });

      fetchLousas();
    } catch (error) {
      console.error('Erro ao encerrar lousa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao encerrar lousa',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteLousa = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lousa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Lousa excluída com sucesso'
      });

      fetchLousas();
    } catch (error) {
      console.error('Erro ao excluir lousa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir lousa',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Minhas Lousas</h1>
          <p className="text-muted-foreground">Gerencie suas lousas e acompanhe as respostas dos alunos</p>
        </div>
        
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Lousa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Lousa</DialogTitle>
            </DialogHeader>
            <LousaForm onSuccess={() => {
              setShowCreateForm(false);
              fetchLousas();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {lousas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
              📝
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma lousa criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira lousa para começar a interagir com os alunos
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Lousa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Turmas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lousas.map((lousa) => (
                <TableRow key={lousa.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lousa.titulo}</div>
                      <div className="text-sm text-muted-foreground">
                        {lousa.enunciado.length > 80 
                          ? `${lousa.enunciado.substring(0, 80)}...` 
                          : lousa.enunciado
                        }
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(lousa)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4" />
                      {getPeriodText(lousa)}
                    </div>
                  </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-1 text-sm">
                       <Users className="w-4 h-4" />
                       {lousa.turmas.length > 0 
                         ? lousa.turmas.join(', ')
                         : 'Nenhuma'
                       }
                       {lousa.permite_visitante && (
                         <Badge variant="outline" className="ml-1">Visitantes</Badge>
                       )}
                     </div>
                   </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">

                       <Dialog>
                         <DialogTrigger asChild>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => setViewingResponses(lousa)}
                           >
                             <MessageSquare className="w-4 h-4" />
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                           <DialogHeader>
                             <DialogTitle>Respostas - {lousa.titulo}</DialogTitle>
                           </DialogHeader>
                           {viewingResponses && (
                             <LousaRespostas lousa={viewingResponses} />
                           )}
                         </DialogContent>
                       </Dialog>

                       {lousa.ativo && (
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="sm">
                               <EyeOff className="w-4 h-4" />
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Encerrar Lousa</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Tem certeza que deseja encerrar esta lousa? 
                                 Os alunos não poderão mais enviar respostas.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancelar</AlertDialogCancel>
                               <AlertDialogAction 
                                 onClick={() => handleEndLousa(lousa.id)}
                               >
                                 Encerrar
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       )}

                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="sm">
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Excluir Lousa</AlertDialogTitle>
                             <AlertDialogDescription>
                               Tem certeza que deseja excluir esta lousa? 
                               Esta ação não pode ser desfeita e todas as respostas serão perdidas.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Cancelar</AlertDialogCancel>
                             <AlertDialogAction 
                               onClick={() => handleDeleteLousa(lousa.id)}
                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </Card>
      )}
    </div>
  );
}