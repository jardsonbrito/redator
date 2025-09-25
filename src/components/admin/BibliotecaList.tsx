import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Grid, List } from 'lucide-react';
import { BibliotecaCardPadrao, BibliotecaCardData } from '@/components/shared/BibliotecaCardPadrao';
import { BibliotecaFormModern as BibliotecaForm } from './BibliotecaFormModern';
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
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [materialEditando, setMaterialEditando] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGrouped, setShowGrouped] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar categorias para o filtro
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('ativa', true)
        .order('ordem');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: materiais, isLoading, error } = useQuery({
    queryKey: ['admin-biblioteca', busca, categoriaFiltro, statusFiltro],
    queryFn: async () => {
      try {
        let query = supabase
          .from('biblioteca_materiais')
          .select(`
            *,
            categorias (
              id,
              nome,
              slug
            )
          `)
          .order('data_publicacao', { ascending: false });

        if (busca) {
          query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
        }

        if (categoriaFiltro && categoriaFiltro !== 'todas') {
          query = query.eq('categoria_id', categoriaFiltro);
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

  const handleDownloadAdmin = async (material: BibliotecaCardData) => {
    try {
      const { data, error } = await supabase.storage
        .from('biblioteca-pdfs')
        .download(material.arquivo_url || '');

      if (error) {
        throw new Error(`Erro no download: ${error.message}`);
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.arquivo_nome || 'documento.pdf';
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

  const handlePublicar = async (materialId: string) => {
    await toggleStatusMutation.mutateAsync({ id: materialId, novoStatus: 'publicado' });
  };

  const handleDespublicar = async (materialId: string) => {
    await toggleStatusMutation.mutateAsync({ id: materialId, novoStatus: 'rascunho' });
  };

  const handleInativar = async (materialId: string) => {
    // Implementar lógica de inativar se necessário
    await toggleStatusMutation.mutateAsync({ id: materialId, novoStatus: 'rascunho' });
  };

  const handleEdit = (material: any) => {
    setMaterialEditando(material);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setMaterialEditando(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setMaterialEditando(null);
    setShowForm(false);
  };

  // Agrupar materiais por categoria
  const materiaisAgrupados = materiais?.reduce((grupos: any, material: any) => {
    const categoriaNome = material.categorias?.nome || 'Sem categoria';
    if (!grupos[categoriaNome]) {
      grupos[categoriaNome] = [];
    }
    grupos[categoriaNome].push(material);
    return grupos;
  }, {}) || {};

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

  if (showForm) {
    return (
      <div className="space-y-4">
        <BibliotecaForm
          mode={materialEditando ? 'edit' : 'create'}
          initialValues={materialEditando}
          onSuccess={handleSuccess}
          onCancel={handleCancelEdit}
        />
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
          
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </SelectItem>
              ))}
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

          <div className="flex items-center gap-2">
            <Button
              variant={showGrouped ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGrouped(!showGrouped)}
            >
              {showGrouped ? <List className="w-4 h-4 mr-2" /> : <Grid className="w-4 h-4 mr-2" />}
              {showGrouped ? 'Lista' : 'Agrupar'}
            </Button>
            <div className="text-sm text-gray-600 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {materiais?.length || 0} material(is)
            </div>
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
      ) : showGrouped ? (
        <div className="space-y-8">
          {/* Exibir materiais agrupados por categoria */}
          {categorias.map((categoria) => {
            const materiaisCategoria = materiaisAgrupados[categoria.nome] || [];
            
            return (
              <div key={categoria.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-primary">
                    {categoria.nome}
                  </h3>
                  <Badge variant="outline" className="text-sm">
                    {materiaisCategoria.length} material(is)
                  </Badge>
                </div>
                
                {materiaisCategoria.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">Nenhum material nesta categoria</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materiaisCategoria.map((material) => {

                      const materialData: BibliotecaCardData = {
                        id: material.id,
                        titulo: material.titulo,
                        subtitulo: material.descricao,
                        competencia: material.competencia,
                        categoria: material.categorias?.nome,
                        status: material.status as 'publicado' | 'rascunho',
                        published_at: material.published_at,
                        unpublished_at: material.unpublished_at,
                        thumbnail_url: material.thumbnail_url,
                        arquivo_url: material.arquivo_url,
                        arquivo_nome: material.arquivo_nome,
                        turmas_autorizadas: material.turmas_autorizadas,
                        permite_visitante: material.permite_visitante
                      };

                      return (
                        <BibliotecaCardPadrao
                          key={material.id}
                          material={materialData}
                          perfil="admin"
                          actions={{
                            onEditar: () => handleEdit(material),
                            onExcluir: (id) => deleteMutation.mutate(id),
                            onPublicar: handlePublicar,
                            onDespublicar: handleDespublicar,
                            onInativar: handleInativar,
                            onDownloadAdmin: handleDownloadAdmin
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materiais.map((material) => {

            const materialData: BibliotecaCardData = {
              id: material.id,
              titulo: material.titulo,
              subtitulo: material.descricao,
              competencia: material.competencia,
              categoria: material.categorias?.nome,
              status: material.status as 'publicado' | 'rascunho',
              published_at: material.published_at,
              unpublished_at: material.unpublished_at,
              thumbnail_url: material.thumbnail_url,
              arquivo_url: material.arquivo_url,
              arquivo_nome: material.arquivo_nome,
              turmas_autorizadas: material.turmas_autorizadas,
              permite_visitante: material.permite_visitante
            };

            return (
              <BibliotecaCardPadrao
                key={material.id}
                material={materialData}
                perfil="admin"
                actions={{
                  onEditar: () => handleEdit(material),
                  onExcluir: (id) => deleteMutation.mutate(id),
                  onPublicar: handlePublicar,
                  onDespublicar: handleDespublicar,
                  onInativar: handleInativar,
                  onDownloadAdmin: handleDownloadAdmin
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BibliotecaList;