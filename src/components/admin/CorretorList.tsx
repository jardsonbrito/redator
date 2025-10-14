
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, UserCheck, UserX, MoreVertical, Eye, EyeOff } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CorretorTurmasDialog } from "./CorretorTurmasDialog";
import { formatTurmaDisplay } from "@/utils/turmaUtils";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
  visivel_no_formulario: boolean;
  turmas_autorizadas: string[] | null;
  criado_em: string;
  atualizado_em: string;
}

interface CorretorListProps {
  refresh?: boolean;
  onEdit?: (corretor: Corretor) => void;
}

export const CorretorList = ({ refresh, onEdit }: CorretorListProps) => {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [turmasDialogOpen, setTurmasDialogOpen] = useState(false);
  const [corretorSelecionado, setCorretorSelecionado] = useState<Corretor | null>(null);
  const { toast } = useToast();

  const fetchCorretores = async () => {
    try {
      const { data, error } = await supabase
        .from("corretores")
        .select("*")
        .order("nome_completo");

      if (error) throw error;

      setCorretores(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar corretores:", error);
      toast({
        title: "Erro ao carregar corretores",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorretores();
  }, [refresh]);

  const handleToggleStatus = async (corretor: Corretor) => {
    try {
      const { error } = await supabase
        .from("corretores")
        .update({ ativo: !corretor.ativo })
        .eq("id", corretor.id);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Corretor ${corretor.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      });

      fetchCorretores();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibilityInForm = async (corretor: Corretor) => {
    // Se está disponível, tornar indisponível diretamente
    if (corretor.visivel_no_formulario) {
      try {
        const { error } = await supabase
          .from("corretores")
          .update({ visivel_no_formulario: false })
          .eq("id", corretor.id);

        if (error) throw error;

        toast({
          title: "Disponibilidade atualizada!",
          description: "Corretor agora está indisponível para seleção.",
        });

        fetchCorretores();
      } catch (error: any) {
        console.error("Erro ao alterar visibilidade:", error);
        toast({
          title: "Erro ao alterar disponibilidade",
          description: error.message || "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
      }
    } else {
      // Se está indisponível, abrir dialog para selecionar turmas
      setCorretorSelecionado(corretor);
      setTurmasDialogOpen(true);
    }
  };

  const handleDelete = async (corretor: Corretor) => {
    try {
      const { error } = await supabase
        .from("corretores")
        .delete()
        .eq("id", corretor.id);

      if (error) throw error;

      toast({
        title: "Corretor excluído!",
        description: "O corretor foi removido do sistema.",
      });

      fetchCorretores();
    } catch (error: any) {
      console.error("Erro ao excluir corretor:", error);
      toast({
        title: "Erro ao excluir corretor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Carregando corretores...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Corretores ({corretores.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {corretores.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum corretor cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {corretores.map((corretor) => (
              <div
                key={corretor.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{corretor.nome_completo}</h3>
                    <Badge variant={corretor.ativo ? "default" : "secondary"}>
                      {corretor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant={corretor.visivel_no_formulario ? "default" : "outline"}>
                      {corretor.visivel_no_formulario ? "Disponível" : "Indisponível"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{corretor.email}</p>
                  {corretor.visivel_no_formulario && corretor.turmas_autorizadas && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Turmas: {corretor.turmas_autorizadas.map(t => formatTurmaDisplay(t)).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cadastrado em: {new Date(corretor.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onEdit?.(corretor)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => handleToggleStatus(corretor)}>
                        {corretor.ativo ? (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => handleToggleVisibilityInForm(corretor)}>
                        {corretor.visivel_no_formulario ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Indisponível
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Disponível
                          </>
                        )}
                      </DropdownMenuItem>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o corretor "{corretor.nome_completo}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(corretor)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {corretorSelecionado && (
        <CorretorTurmasDialog
          open={turmasDialogOpen}
          onOpenChange={(open) => {
            setTurmasDialogOpen(open);
            // Limpar o corretor selecionado quando o dialog é fechado
            if (!open) {
              setTimeout(() => {
                setCorretorSelecionado(null);
              }, 200);
            }
          }}
          corretor={corretorSelecionado}
          onSuccess={fetchCorretores}
        />
      )}
    </Card>
  );
};
