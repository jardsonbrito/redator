
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Edit, Trash2, ExternalLink, Play, List } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const AulaList = () => {
  const [editingAula, setEditingAula] = useState<any>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aulasWithModules, isLoading } = useQuery({
    queryKey: ['aulas-with-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select(`
          *,
          aula_modules (
            nome,
            tipo
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: modules } = useQuery({
    queryKey: ['aula-modules-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_modules')
        .select('*')
        .order('ordem');
      
      if (error) throw error;
      return data;
    }
  });

  const updateAulaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('aulas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Aula atualizada com sucesso!",
      });
      setIsEditSheetOpen(false);
      setEditingAula(null);
      queryClient.invalidateQueries({ queryKey: ['aulas-with-modules'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar aula. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error updating aula:", error);
    }
  });

  const deleteAulaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aulas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Aula excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['aulas-with-modules'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir aula. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error deleting aula:", error);
    }
  });

  const handleEdit = (aula: any) => {
    setEditingAula(aula);
    setIsEditSheetOpen(true);
  };

  const handleSave = () => {
    if (!editingAula) return;

    const updates = {
      titulo: editingAula.titulo,
      descricao: editingAula.descricao,
      youtube_url: editingAula.youtube_url,
      google_meet_url: editingAula.google_meet_url,
      ativo: editingAula.ativo,
      updated_at: new Date().toISOString(),
    };

    updateAulaMutation.mutate({ id: editingAula.id, updates });
  };

  const handleDelete = (id: string) => {
    deleteAulaMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando aulas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Aulas Cadastradas ({aulasWithModules?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aulasWithModules && aulasWithModules.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aulasWithModules.map((aula) => (
                  <TableRow key={aula.id}>
                    <TableCell className="font-medium">{aula.titulo}</TableCell>
                    <TableCell>{aula.aula_modules?.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {aula.aula_modules?.tipo === 'ao_vivo' ? (
                          <>
                            <ExternalLink className="w-4 h-4 text-red-500" />
                            <span>Ao Vivo</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 text-blue-500" />
                            <span>Gravada</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        aula.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {aula.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Sheet open={isEditSheetOpen && editingAula?.id === aula.id} onOpenChange={setIsEditSheetOpen}>
                          <SheetTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(aula)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>Editar Aula</SheetTitle>
                              <SheetDescription>
                                Faça as alterações necessárias na aula.
                              </SheetDescription>
                            </SheetHeader>
                            
                            {editingAula && (
                              <div className="space-y-4 mt-6">
                                <div>
                                  <Label htmlFor="edit-titulo">Título *</Label>
                                  <Input
                                    id="edit-titulo"
                                    value={editingAula.titulo}
                                    onChange={(e) => setEditingAula({
                                      ...editingAula,
                                      titulo: e.target.value
                                    })}
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-descricao">Descrição</Label>
                                  <Textarea
                                    id="edit-descricao"
                                    value={editingAula.descricao || ''}
                                    onChange={(e) => setEditingAula({
                                      ...editingAula,
                                      descricao: e.target.value
                                    })}
                                    rows={3}
                                  />
                                </div>

                                {aula.youtube_url !== null && (
                                  <div>
                                    <Label htmlFor="edit-youtube">Link do YouTube</Label>
                                    <Input
                                      id="edit-youtube"
                                      value={editingAula.youtube_url || ''}
                                      onChange={(e) => setEditingAula({
                                        ...editingAula,
                                        youtube_url: e.target.value
                                      })}
                                    />
                                  </div>
                                )}

                                {aula.google_meet_url !== null && (
                                  <div>
                                    <Label htmlFor="edit-meet">Link do Google Meet</Label>
                                    <Input
                                      id="edit-meet"
                                      value={editingAula.google_meet_url || ''}
                                      onChange={(e) => setEditingAula({
                                        ...editingAula,
                                        google_meet_url: e.target.value
                                      })}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={editingAula.ativo}
                                    onCheckedChange={(checked) => setEditingAula({
                                      ...editingAula,
                                      ativo: checked
                                    })}
                                  />
                                  <Label>Aula ativa</Label>
                                </div>

                                <Button 
                                  onClick={handleSave} 
                                  className="w-full"
                                  disabled={updateAulaMutation.isPending}
                                >
                                  {updateAulaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a aula "{aula.titulo}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(aula.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-redator-accent">Nenhuma aula cadastrada ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AulaList;
