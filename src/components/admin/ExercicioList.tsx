
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import ExercicioEditForm from './ExercicioEditForm';

const ExercicioList = () => {
  const [editingExercicio, setEditingExercicio] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exercicios, isLoading } = useQuery({
    queryKey: ['admin-exercicios'],
    queryFn: async () => {
      console.log('Fetching exercicios for admin...');
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Error fetching exercicios:', error);
        throw error;
      }

      console.log('Admin exercicios fetched:', data);
      return data;
    }
  });

  const deleteExercicioMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting exercicio:', id);
      const { error } = await supabase
        .from('exercicios')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting exercicio:', error);
        throw error;
      }

      console.log('Exercicio deleted successfully');
    },
    onSuccess: () => {
      toast({
        title: "Exercício excluído com sucesso!",
        description: "O exercício foi removido da plataforma.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] });
      queryClient.invalidateQueries({ queryKey: ['exercicios'] });
    },
    onError: (error) => {
      console.error('Error deleting exercicio:', error);
      toast({
        title: "Erro ao excluir exercício",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (id: string, titulo: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o exercício "${titulo}"?`)) {
      deleteExercicioMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-redator-accent">Carregando exercícios...</p>
        </div>
      </div>
    );
  }

  if (editingExercicio) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-redator-primary">
            Editando: {editingExercicio.titulo}
          </h3>
          <Button
            variant="outline"
            onClick={() => setEditingExercicio(null)}
          >
            Cancelar
          </Button>
        </div>
        <ExercicioEditForm 
          exercicio={editingExercicio} 
          onCancel={() => setEditingExercicio(null)}
        />
      </div>
    );
  }

  if (!exercicios || exercicios.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-16 h-16 text-orange-600 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-redator-primary mb-2">
          Nenhum exercício cadastrado
        </h3>
        <p className="text-redator-accent">
          Os exercícios cadastrados aparecerão aqui para gerenciamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {exercicios.map((exercicio) => (
          <Card key={exercicio.id} className="border-orange-600/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-redator-primary">
                    {exercicio.tipo === 'formulario' ? (
                      <ExternalLink className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                    {exercicio.titulo}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={exercicio.tipo === 'formulario' ? 'default' : 'secondary'}>
                      {exercicio.tipo === 'formulario' ? 'Formulário' : 'Redação'}
                    </Badge>
                    <Badge variant={exercicio.ativo ? 'default' : 'destructive'}>
                      {exercicio.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingExercicio(exercicio)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(exercicio.id, exercicio.titulo)}
                    disabled={deleteExercicioMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {exercicio.imagem_thumbnail && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={exercicio.imagem_thumbnail}
                    alt={exercicio.titulo}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
              
              {exercicio.tipo === 'formulario' ? (
                <div className="space-y-2">
                  <p className="text-sm text-redator-accent">
                    <strong>URL:</strong> {exercicio.url_formulario}
                  </p>
                  <p className="text-sm text-redator-accent">
                    <strong>Exibição:</strong> {exercicio.embed_formulario ? 'Embutido' : 'Nova aba'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-redator-accent">
                    <strong>Frase Temática:</strong>
                  </p>
                  <div className="bg-gray-50 p-3 rounded border-l-4 border-orange-600">
                    <p className="text-sm">
                      A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo da sua formação, redija texto dissertativo-argumentativo em norma padrão da língua portuguesa sobre o tema "<strong>{exercicio.frase_tematica}</strong>", apresentando proposta de intervenção para o problema abordado, respeitando os direitos humanos.
                    </p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Criado em: {new Date(exercicio.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExercicioList;
