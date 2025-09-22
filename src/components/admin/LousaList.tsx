import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, EyeOff, Clock, Users, Trash2, UserCheck } from 'lucide-react';
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
import { LousaCardPadrao } from '@/components/shared/LousaCardPadrao';

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
  corretor_id?: string;
  corretor_nome?: string;
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
      // Get all lousas
      const { data: lousasData, error: lousasError } = await supabase
        .from('lousa')
        .select('*')
        .order('created_at', { ascending: false });

      if (lousasError) throw lousasError;

      // Then for each lousa, get corretor info and count pending responses
      const lousasWithPendingCount = await Promise.all(
        (lousasData || []).map(async (lousa) => {
          // Since corretor_id doesn't exist in the schema, set to null
          let corretorNome = null;

          // Count pending responses
          const { count, error: countError } = await supabase
            .from('lousa_resposta')
            .select('*', { count: 'exact', head: true })
            .eq('lousa_id', lousa.id)
            .neq('status', 'graded')
            .is('nota', null);

          if (countError) {
            console.error('Erro ao contar respostas pendentes:', countError);
            return { ...lousa, respostas_pendentes: 0, corretor_nome: corretorNome };
          }

          return { 
            ...lousa, 
            respostas_pendentes: count || 0,
            corretor_nome: corretorNome
          };
        })
      );

      setLousas(lousasWithPendingCount);
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
          <h1 className="text-3xl font-bold">Gerenciar Lousas</h1>
          <p className="text-muted-foreground">Visualize e gerencie todas as lousas da plataforma</p>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lousas.map((lousa) => (
            <LousaCardPadrao
              key={lousa.id}
              lousa={lousa}
              perfil="admin"
              actions={{
                onVerRespostas: (id) => navigate(`/admin/lousa/${id}/respostas`),
                onEditar: (id) => navigate(`/admin/lousa/${id}/editar`),
                onEncerrar: (id) => handleEndLousa(id),
                onDeletar: (id) => handleDeleteLousa(id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}