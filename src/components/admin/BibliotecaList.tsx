
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Download, Search, Calendar, Grid, List, Eye, EyeOff } from 'lucide-react';
import { AdminUniformCard, BadgeType } from './AdminUniformCard';
import { CompactIconButton } from '@/components/ui/compact-icon-button';
import { BibliotecaForm } from './BibliotecaForm';
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
          materialEditando={materialEditando}
          onSuccess={handleSuccess}
          onCancelEdit={handleCancelEdit}
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
                  <h3 className="text-xl font-bold text-redator-primary">
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
                  <div className="grid gap-4">
                    {materiaisCategoria.map((material) => (
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
                                  {material.categorias?.nome || 'Categoria não definida'}
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
                                onClick={() => handleEdit(material)}
                                title="Editar material"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleStatusMutation.mutate({
                                  id: material.id,
                                  novoStatus: material.status === 'publicado' ? 'rascunho' : 'publicado'
                                })}
                                title={material.status === 'publicado' ? 'Tornar rascunho' : 'Publicar'}
                              >
                                {material.status === 'publicado' ? '📝' : '✅'}
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
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {materiais.map((material) => {
            // Calcular status baseado em datas - seguindo modelo da imagem
            const now = new Date();
            const publishedAt = material.published_at ? new Date(material.published_at) : null;
            const unpublishedAt = material.unpublished_at ? new Date(material.unpublished_at) : null;
            
            let statusInfo: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } = { label: 'Rascunho', variant: 'secondary' };
            if (material.status === 'publicado') {
              if (unpublishedAt && now >= unpublishedAt) {
                statusInfo = { label: 'Despublicado', variant: 'destructive' };
              } else if (!publishedAt || now >= publishedAt) {
                statusInfo = { label: 'Publicado', variant: 'default' };
              } else {
                statusInfo = { label: 'Agendado', variant: 'secondary' };
              }
            }

            // Preparar badges seguindo exatamente o modelo da imagem
            const badges: BadgeType[] = [
              {
                label: material.categorias?.nome || 'Sem categoria',
                variant: 'outline'
              },
              {
                label: statusInfo.label,
                variant: statusInfo.variant
              },
              {
                label: format(new Date(material.published_at || material.criado_em), "dd/MM/yyyy", { locale: ptBR }),
                variant: 'outline'
              }
            ];

            // Badge de público - seguindo exatamente o modelo da imagem
            const hasVisitantes = material.permite_visitante;
            const numTurmas = material.turmas_autorizadas?.length || 0;
            
            if (hasVisitantes && numTurmas > 0) {
              badges.push({
                label: `${numTurmas} turma(s) + Visitantes`,
                variant: 'outline'
              });
            } else if (hasVisitantes) {
              badges.push({
                label: 'Visitantes',
                variant: 'outline'
              });
            } else if (numTurmas > 0) {
              badges.push({
                label: `${numTurmas} turma(s)`,
                variant: 'outline'
              });
            }

            // Preparar ações seguindo cores da imagem
            const actions = (
              <>
                <CompactIconButton
                  icon={Edit}
                  label="Editar material"
                  intent="neutral"
                  onClick={() => handleEdit(material)}
                />
                
                <CompactIconButton
                  icon={material.status === 'publicado' ? EyeOff : Eye}
                  label={material.status === 'publicado' ? 'Tornar rascunho' : 'Publicar'}
                  intent="attention"
                  onClick={() => toggleStatusMutation.mutate({
                    id: material.id,
                    novoStatus: material.status === 'publicado' ? 'rascunho' : 'publicado'
                  })}
                />

                <CompactIconButton
                  icon={Download}
                  label="Baixar material"
                  intent="positive"
                  onClick={() => handleDownload(material.arquivo_url, material.arquivo_nome)}
                />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <CompactIconButton
                      icon={Trash2}
                      label="Excluir material"
                      intent="danger"
                    />
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
              </>
            );

            return (
              <AdminUniformCard
                key={material.id}
                title={material.titulo}
                coverUrl={material.thumbnail_url || undefined}
                coverAlt={`Thumbnail do material ${material.titulo}`}
                badges={badges}
                actions={actions}
                metaInfo={material.descricao?.substring(0, 100) + (material.descricao && material.descricao.length > 100 ? '...' : '')}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BibliotecaList;
