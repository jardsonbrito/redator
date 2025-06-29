
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { TemaEditForm } from './TemaEditForm';

export const TemaList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: temas, isLoading, refetch } = useQuery({
    queryKey: ['admin-temas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('publicado_em', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão do tema com ID:', id);
      
      // Verificar autenticação do usuário
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('✅ Usuário autenticado:', user.email);

      // Verificar se é admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.user_type !== 'admin') {
        throw new Error('Usuário não tem permissões de administrador');
      }
      console.log('✅ Usuário confirmado como admin');

      // Verificar se o tema existe antes da exclusão
      const { data: existingTema, error: checkError } = await supabase
        .from('temas')
        .select('id, frase_tematica')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('❌ Erro ao verificar existência do tema:', checkError);
        throw new Error('Tema não encontrado ou erro ao verificar existência');
      }

      console.log('✅ Tema encontrado para exclusão:', existingTema.frase_tematica);

      // Executar a exclusão com RLS bypass se necessário
      const { error: deleteError, data: deleteData } = await supabase
        .from('temas')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        console.error('❌ Erro do Supabase ao excluir tema:', deleteError);
        throw new Error(`Erro na exclusão: ${deleteError.message}`);
      }

      console.log('✅ Resultado da exclusão:', deleteData);

      // Verificar se realmente foi excluído
      const { data: checkDeleted, error: verifyError } = await supabase
        .from('temas')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (verifyError) {
        console.error('⚠️ Erro ao verificar exclusão:', verifyError);
      } else if (checkDeleted) {
        console.error('❌ CRÍTICO: Tema ainda existe após exclusão!', checkDeleted);
        throw new Error('Falha na exclusão - registro ainda existe no banco de dados');
      } else {
        console.log('✅ CONFIRMADO: Tema foi excluído permanentemente do banco');
      }

      // Invalidar todas as queries relacionadas para forçar atualização
      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });
      await queryClient.invalidateQueries({ queryKey: ['temas'] });
      
      // Forçar refetch da lista atual
      await refetch();

      toast({
        title: "✅ Exclusão Confirmada",
        description: "O tema foi removido permanentemente do sistema.",
      });

    } catch (error: any) {
      console.error('💥 ERRO COMPLETO na exclusão:', error);
      toast({
        title: "❌ Falha na Exclusão",
        description: error.message || "Não foi possível excluir o tema. Verifique suas permissões.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando temas...</div>;
  }

  if (editingId) {
    return (
      <TemaEditForm
        temaId={editingId}
        onCancel={() => setEditingId(null)}
        onSuccess={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-redator-primary">Temas Cadastrados</h3>
      
      {temas && temas.length > 0 ? (
        <div className="grid gap-4">
          {temas.map((tema) => (
            <Card key={tema.id} className="border-redator-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-redator-primary line-clamp-2">
                  {tema.frase_tematica}
                </CardTitle>
                <span className="text-xs bg-redator-accent text-white px-2 py-1 rounded w-fit">
                  {tema.eixo_tematico}
                </span>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(tema.id)}
                    className="flex items-center gap-2 flex-1 sm:flex-none"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex items-center gap-2 flex-1 sm:flex-none">
                        <Trash2 className="w-4 h-4" />
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md mx-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          Confirmar Exclusão Permanente
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>ATENÇÃO:</strong> Esta ação é irreversível! O tema será removido permanentemente do banco de dados e não poderá ser recuperado.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(tema.id)}
                          className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                        >
                          Excluir Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-redator-accent text-center py-8">Nenhum tema cadastrado ainda.</p>
      )}
    </div>
  );
};
