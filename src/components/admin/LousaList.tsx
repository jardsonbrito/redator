import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, EyeOff, Clock, Users, Trash2 } from 'lucide-react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LousaForm from './LousaForm';

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
  respostas_pendentes?: number;
}

export default function LousaList() {
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Setup realtime subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('lousa-respostas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lousa_resposta'
        },
        () => {
          fetchLousas(); // Refresh data when responses change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLousas = async () => {
    try {
      const { data, error } = await supabase
        .from('lousa')
        .select(`
          *,
          respostas_pendentes:lousa_resposta(count)
        `)
        .not('lousa_resposta.status', 'eq', 'corrected')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the data to get the count properly
      const processedData = data?.map(lousa => ({
        ...lousa,
        respostas_pendentes: lousa.respostas_pendentes?.[0]?.count || 0
      })) || [];
      
      setLousas(processedData);
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lousas.map((lousa) => (
            <Card key={lousa.id} className="relative overflow-hidden">
              {lousa.capa_url && (
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${lousa.capa_url})` }} />
              )}
              {!lousa.capa_url && (
                <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-4xl">📝</div>
                </div>
              )}
              
              <div className="absolute top-2 right-2">
                {getStatusBadge(lousa)}
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg leading-tight line-clamp-2 mb-2">
                    {lousa.titulo}
                  </h3>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">{getPeriodText(lousa)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="line-clamp-1">
                        {lousa.turmas.length > 0 ? lousa.turmas.join(', ') : 'Nenhuma'}
                      </span>
                      {lousa.permite_visitante && (
                        <Badge variant="outline" className="text-xs">Visitantes</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 relative"
                    onClick={() => navigate(`/admin/lousa/${lousa.id}/respostas`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Respostas
                    {lousa.respostas_pendentes && lousa.respostas_pendentes > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                      >
                        {lousa.respostas_pendentes > 99 ? '99+' : lousa.respostas_pendentes}
                      </Badge>
                    )}
                  </Button>

                  <div className="flex gap-1">
                    {lousa.ativo && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
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
                        <Button variant="outline" size="sm">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}