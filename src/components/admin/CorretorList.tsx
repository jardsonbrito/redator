
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, UserCheck, UserX } from "lucide-react";
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

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
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
    return <div>Carregando corretores(as)...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Corretores(as) ({corretores.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {corretores.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum(a) corretor(a) cadastrado(a) ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {corretores.map((corretor) => (
              <div
                key={corretor.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{corretor.nome_completo}</h3>
                    <Badge variant={corretor.ativo ? "default" : "secondary"}>
                      {corretor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{corretor.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastrado em: {new Date(corretor.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(corretor)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(corretor)}
                  >
                    {corretor.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o(a) corretor(a) "{corretor.nome_completo}"? 
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
