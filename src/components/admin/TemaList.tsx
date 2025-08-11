import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';
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
import { getTemaCoverUrl } from '@/utils/temaImageUtils';

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

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'publicado' ? 'rascunho' : 'publicado';
      
      const { error } = await supabase
        .from('temas')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "✅ Status alterado",
        description: `Tema agora está ${newStatus === 'publicado' ? 'publicado' : 'como rascunho'}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-temas'] });
      queryClient.invalidateQueries({ queryKey: ['temas'] }); // Para atualizar área pública
      
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "❌ Erro ao alterar status",
        description: error.message || "Não foi possível alterar o status do tema.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão do tema com ID:', id);
      
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

      // Executar a exclusão
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

      // Invalidar queries e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });
      await queryClient.invalidateQueries({ queryKey: ['temas'] });
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
              <div className="flex flex-col sm:flex-row">
                {/* Cover Image */}
                <div className="w-full sm:w-48 h-32 sm:h-auto overflow-hidden rounded-t-lg sm:rounded-l-lg sm:rounded-t-none bg-muted flex-shrink-0">
                  <img 
                    src={getTemaCoverUrl(tema)} 
                    alt={`Capa do tema: ${tema.frase_tematica}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
                    }}
                  />
                </div>
                
                <div className="flex-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base text-redator-primary line-clamp-2 mb-2">
                          {tema.frase_tematica}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {tema.eixo_tematico}
                          </Badge>
                          <Badge 
                            variant={tema.status === 'publicado' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {tema.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                      <IconAction
                        icon={ACTION_ICON.editar}
                        label="Editar"
                        intent="neutral"
                        onClick={() => setEditingId(tema.id)}
                        className="flex-1 sm:flex-none justify-center sm:justify-start"
                      />

                      <IconAction
                        icon={tema.status === 'publicado' ? ACTION_ICON.rascunho : ACTION_ICON.publicar}
                        label={tema.status === 'publicado' ? 'Tornar Rascunho' : 'Publicar'}
                        intent={tema.status === 'publicado' ? 'neutral' : 'positive'}
                        onClick={() => toggleStatus(tema.id, tema.status || 'publicado')}
                        className="flex-1 sm:flex-none justify-center sm:justify-start"
                        asSwitch
                        checked={tema.status === 'publicado'}
                      />
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <IconAction
                            icon={ACTION_ICON.excluir}
                            label="Excluir"
                            intent="danger"
                            className="flex-1 sm:flex-none justify-center sm:justify-start"
                          />
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-redator-accent text-center py-8">Nenhum tema cadastrado ainda.</p>
      )}
    </div>
  );
};