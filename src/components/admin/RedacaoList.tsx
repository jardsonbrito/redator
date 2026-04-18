
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RedacaoExemplarCardPadrao } from '@/components/shared/RedacaoExemplarCardPadrao';
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
import { RedacaoForm } from './RedacaoForm';

export const RedacaoList = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: redacoes, isLoading, refetch } = useQuery({
    queryKey: ['admin-redacoes', 'with-foto-autor'], // Cache com foto_autor
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes')
        .select('id, frase_tematica, eixo_tematico, conteudo, data_envio, nota_total, pdf_url, autor, foto_autor, atualizado_banca, ano_banca, ativo')
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

  const handleToggleAtivo = async (id: string, currentStatus: boolean) => {
    try {
      if (!isAdmin || !user) {
        throw new Error('Usuário não tem permissões de administrador');
      }

      const { error } = await supabase
        .from('redacoes')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Invalidar queries e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['admin-redacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['redacoes'] });
      await refetch();

      toast({
        title: currentStatus ? "Redação Inativada" : "Redação Ativada",
        description: currentStatus
          ? "A redação não estará mais visível para os usuários."
          : "A redação está agora visível para os usuários.",
      });

    } catch (error: any) {
      console.error('Erro ao alterar status da redação:', error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Não foi possível alterar o status da redação.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão da redação com ID:', id);

      if (!isAdmin || !user) {
        throw new Error('Usuário não tem permissões de administrador');
      }

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
      <div className="space-y-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[16/9] bg-gray-200 animate-pulse"></div>
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (editingId) {
    return (
      <RedacaoForm
        mode="edit"
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
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...redacoes]
              .sort((a, b) =>
                (a.frase_tematica || '').localeCompare(b.frase_tematica || '', 'pt-BR')
              )
              .map((redacao) => (
                <RedacaoExemplarCardPadrao
                  key={redacao.id}
                  redacao={{
                    id: redacao.id,
                    frase_tematica: redacao.frase_tematica || 'Redação Exemplar',
                    eixo_tematico: redacao.eixo_tematico,
                    conteudo: redacao.conteudo,
                    data_envio: redacao.data_envio,
                    autor: redacao.autor,
                    foto_autor: redacao.foto_autor,
                    pdf_url: redacao.pdf_url,
                    atualizado_banca: redacao.atualizado_banca,
                    ano_banca: redacao.ano_banca,
                    ativo: redacao.ativo ?? true,
                  }}
                  perfil="admin"
                  actions={{
                    onEditar: () => setEditingId(redacao.id),
                    onExcluir: () => setDeleteId(redacao.id),
                    onToggleAtivo: () => handleToggleAtivo(redacao.id, redacao.ativo ?? true)
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
