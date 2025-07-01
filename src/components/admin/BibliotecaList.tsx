
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Download, Search, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

export const BibliotecaList = () => {
  const [busca, setBusca] = useState('');
  const [competenciaFiltro, setCompetenciaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materiais, isLoading, error } = useQuery({
    queryKey: ['admin-biblioteca', busca, competenciaFiltro, statusFiltro],
    queryFn: async () => {
      try {
        let query = supabase
          .from('biblioteca_materiais')
          .select('*')
          .order('data_publicacao', { ascending: false });

        if (busca) {
          query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
        }

        if (competenciaFiltro && competenciaFiltro !== 'todas') {
          query = query.eq('competencia', competenciaFiltro);
        }

        if (statusFiltro && statusFiltro !== 'todos') {
          query = query.eq('status', statusFiltro);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Query error:', error);
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Erro ao buscar materiais:', error);
        throw error;
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        // Primeiro, buscar o material para obter a URL do arquivo
        const { data: material, error: fetchError } = await supabase
          .from('biblioteca_materiais')
          .select('arquivo_url')
          .eq('id', id)
          .single();

        if (fetchError) {
          throw new Error(`Erro ao buscar material: ${fetchError.message}`);
        }

        // Deletar o arquivo do storage
        if (material?.arquivo_url) {
          const { error: storageError } = await supabase.storage
            .from('biblioteca-pdfs')
            .remove([material.arquivo_url]);
          
          if (storageError) {
            console.warn('Erro ao deletar arquivo do storage:', storageError);
          }
        }

        // Deletar o registro do banco
        const { error } = await supabase
          .from('biblioteca_materiais')
          .delete()
          .eq('id', id);

        if (error) {
          throw new Error(`Erro ao deletar material: ${error.message}`);
        }
      } catch (error) {
        console.error('Erro na deleção:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "✅ Material excluído",
        description: "O material foi removido da biblioteca.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-biblioteca'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao excluir",
        description: error.message || "Não foi possível excluir o material.",
        variant: "destructive",
      });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, novoStatus }: { id: string; novoStatus: 'publicado' | 'rascunho' }) => {
      const { error } = await supabase
        .from('biblioteca_materiais')
        .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao alterar status: ${error.message}`);
      }
    },
    onSuccess: (_, { novoStatus }) => {
      toast({
        title: "✅ Status alterado",
        description: `Material ${novoStatus === 'publicado' ? 'publicado' : 'movido para rascunho'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-biblioteca'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao alterar status",
        description: error.message || "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  });

  const handleDownload = async (arquivoUrl: string, arquivoNome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('biblioteca-pdfs')
        .download(arquivoUrl);

      if (error) {
        throw new Error(`Erro no download: ${error.message}`);
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivoNome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "❌ Erro ao baixar",
        description: error.message || "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando materiais...</div>;
  }

  if (error) {
    console.error('Erro ao carregar biblioteca:', error);
    return (
      <div className="text-center py-8 text-red-600">
        Erro ao carregar materiais. Tente novamente.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar materiais..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={competenciaFiltro} onValueChange={setCompetenciaFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Competência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="C1">C1</SelectItem>
              <SelectItem value="C2">C2</SelectItem>
              <SelectItem value="C3">C3</SelectItem>
              <SelectItem value="C4">C4</SelectItem>
              <SelectItem value="C5">C5</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="publicado">Publicados</SelectItem>
              <SelectItem value="rascunho">Rascunhos</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-gray-600 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {materiais?.length || 0} material(is)
          </div>
        </div>
      </div>

      {!materiais || materiais.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum material encontrado
            </h3>
            <p className="text-gray-500">
              Nenhum material corresponde aos filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {materiais.map((material) => (
            <Card key={material.id} className="border-l-4 border-l-redator-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{material.titulo}</CardTitle>
                    {material.descricao && (
                      <p className="text-gray-600 mb-3">{material.descricao}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className="bg-redator-primary text-white">
                        {material.competencia}
                      </Badge>
                      <Badge variant={material.status === 'publicado' ? 'default' : 'secondary'}>
                        {material.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(material.data_publicacao), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                      {material.permite_visitante && (
                        <Badge variant="outline" className="text-redator-secondary">
                          Visitantes
                        </Badge>
                      )}
                      {material.turmas_autorizadas && material.turmas_autorizadas.length > 0 && (
                        <Badge variant="outline">
                          {material.turmas_autorizadas.length} turma(s)
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-500">
                      Arquivo: {material.arquivo_nome}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(material.arquivo_url, material.arquivo_nome)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate({
                        id: material.id,
                        novoStatus: material.status === 'publicado' ? 'rascunho' : 'publicado'
                      })}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(material.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BibliotecaList;
