
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';
import { useToast } from '@/hooks/use-toast';
import { AdminCard, AdminCardSkeleton } from '@/components/admin/AdminCard';
import { resolveCover } from '@/utils/coverUtils';
import { trackAdminEvent } from '@/utils/telemetry';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RedacaoEditForm } from './RedacaoEditForm';

export const RedacaoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: redacoes, isLoading, refetch } = useQuery({
    queryKey: ['admin-redacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (redacoes) {
      trackAdminEvent('admin_card_render', { module: 'exemplares', count: redacoes.length });
    }
  }, [redacoes]);

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão da redação com ID:', id);
      
      // Verificar autenticação do usuário
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('✅ Usuário autenticado:', user.email);

      // Verificar se é admin com query corrigida
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Erro ao verificar perfil:', profileError);
        throw new Error('Erro ao verificar permissões do usuário');
      }

      if (!profile || profile.user_type !== 'admin') {
        throw new Error('Usuário não tem permissões de administrador');
      }
      console.log('✅ Usuário confirmado como admin');

      // Verificar se a redação existe antes da exclusão
      const { data: existingRedacao, error: checkError } = await supabase
        .from('redacoes')
        .select('id, frase_tematica')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('❌ Erro ao verificar existência da redação:', checkError);
        throw new Error('Redação não encontrada ou erro ao verificar existência');
      }

      console.log('✅ Redação encontrada para exclusão:', existingRedacao.frase_tematica || 'Sem título');

      // Executar a exclusão
      const { error: deleteError, data: deleteData } = await supabase
        .from('redacoes')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        console.error('❌ Erro do Supabase ao excluir redação:', deleteError);
        throw new Error(`Erro na exclusão: ${deleteError.message}`);
      }

      console.log('✅ Resultado da exclusão:', deleteData);

      // Verificar se realmente foi excluído
      const { data: checkDeleted, error: verifyError } = await supabase
        .from('redacoes')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (verifyError) {
        console.error('⚠️ Erro ao verificar exclusão:', verifyError);
      } else if (checkDeleted) {
        console.error('❌ CRÍTICO: Redação ainda existe após exclusão!', checkDeleted);
        throw new Error('Falha na exclusão - registro ainda existe no banco de dados');
      } else {
        console.log('✅ CONFIRMADO: Redação foi excluída permanentemente do banco');
      }

      // Invalidar queries e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['admin-redacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['redacoes'] });
      await refetch();

      toast({
        title: "✅ Exclusão Confirmada",
        description: "A redação foi removida permanentemente do sistema.",
      });

    } catch (error: any) {
      console.error('💥 ERRO COMPLETO na exclusão:', error);
      toast({
        title: "❌ Falha na Exclusão",
        description: error.message || "Não foi possível excluir a redação. Verifique suas permissões.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AdminCardSkeleton />
        <AdminCardSkeleton />
        <AdminCardSkeleton />
      </div>
    );
  }

  if (editingId) {
    return (
      <RedacaoEditForm
        redacaoId={editingId}
        onCancel={() => setEditingId(null)}
        onSuccess={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-redator-primary">Redações Cadastradas</h3>
      
      {redacoes && redacoes.length > 0 ? (
        <>
          <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {redacoes.map((redacao) => (
              <AdminCard
                key={redacao.id}
                item={{
                  id: redacao.id,
                  module: 'exemplares',
                  coverUrl: resolveCover(undefined, redacao.pdf_url as string | null),
                  title: redacao.frase_tematica || 'Redação Exemplar',
                  badges: redacao.eixo_tematico
                    ? [{ label: redacao.eixo_tematico as string, tone: 'primary' }]
                    : [],
                  actions: [
                    { icon: Edit, label: 'Editar', onClick: () => setEditingId(redacao.id) },
                    { icon: Trash2, label: 'Excluir', tone: 'danger', onClick: () => setDeleteId(redacao.id) },
                  ],
                }}
              />
            ))}
          </div>

          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent className="max-w-md mx-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Confirmar Exclusão Permanente
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>ATENÇÃO:</strong> Esta ação é irreversível! A redação será removida permanentemente do banco de dados e não poderá ser recuperada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { if (deleteId) { handleDelete(deleteId); setDeleteId(null); } }}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <p className="text-redator-accent text-center py-8">Nenhuma redação cadastrada ainda.</p>
      )}
    </div>
  );
};
