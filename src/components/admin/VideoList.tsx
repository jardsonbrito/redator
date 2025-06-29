
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
import { VideoEditForm } from './VideoEditForm';

export const VideoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: videos, isLoading } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['videos'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-videos'] });

      toast({
        title: "✅ Sucesso!",
        description: "Vídeo excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao excluir vídeo: " + error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando vídeos...</div>;
  }

  if (editingId) {
    return (
      <VideoEditForm
        videoId={editingId}
        onCancel={() => setEditingId(null)}
        onSuccess={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-redator-primary">Vídeos Cadastrados</h3>
      
      {videos && videos.length > 0 ? (
        <div className="grid gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="border-redator-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-redator-primary line-clamp-2">
                  {video.titulo}
                </CardTitle>
                {video.categoria && (
                  <span className="text-xs bg-redator-secondary text-white px-2 py-1 rounded w-fit">
                    {video.categoria}
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(video.id)}
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
                          Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza de que deseja excluir este item? Esta ação é permanente e irreversível.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(video.id)}
                          className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                        >
                          Excluir
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
        <p className="text-redator-accent text-center py-8">Nenhum vídeo cadastrado ainda.</p>
      )}
    </div>
  );
};
