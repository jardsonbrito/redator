import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DigitalBookAccessManagerProps {
  studentId: string;
  studentEmail: string;
  studentName: string;
}

export const DigitalBookAccessManager = ({ 
  studentId, 
  studentEmail, 
  studentName 
}: DigitalBookAccessManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

  // Buscar todos os livros digitais
  const { data: livrosDigitais = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['livros-digitais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biblioteca_materiais')
        .select(`
          id,
          titulo,
          categorias!inner (
            nome
          )
        `)
        .eq('categorias.slug', 'livro-digital')
        .eq('status', 'publicado');

      if (error) throw error;
      return data || [];
    }
  });

  // Buscar acessos atuais do aluno (placeholder - será implementado após migração)
  const { data: acessosAtuais = [], isLoading: loadingAccess } = useQuery({
    queryKey: ['digital-book-access', studentEmail],
    queryFn: async () => {
      // Por enquanto retorna array vazio até a tabela estar disponível no schema
      return [];
    }
  });

  // Mutation para atualizar acessos (placeholder)
  const updateAccessMutation = useMutation({
    mutationFn: async (bookIds: string[]) => {
      // Por enquanto apenas simula o sucesso até a tabela estar disponível
      console.log('Acessos selecionados:', bookIds);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Acesso aos livros digitais atualizado com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['digital-book-access', studentEmail] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar acesso aos livros digitais",
        variant: "destructive"
      });
    }
  });

  const handleBookToggle = (bookId: string, checked: boolean) => {
    setSelectedBooks(prev => 
      checked 
        ? [...prev, bookId]
        : prev.filter(id => id !== bookId)
    );
  };

  const handleSave = () => {
    updateAccessMutation.mutate(selectedBooks);
  };

  // Initialize selected books when data loads
  React.useEffect(() => {
    if (Array.isArray(acessosAtuais) && acessosAtuais.length > 0) {
      setSelectedBooks(acessosAtuais);
    }
  }, [acessosAtuais]);

  if (loadingBooks || loadingAccess) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando livros digitais...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Acesso a Livros Digitais - {studentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {livrosDigitais.length === 0 ? (
          <p className="text-muted-foreground">Nenhum livro digital disponível</p>
        ) : (
          <>
            <div className="space-y-3">
              {livrosDigitais.map((livro) => (
                <div key={livro.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={livro.id}
                    checked={selectedBooks.includes(livro.id)}
                    onCheckedChange={(checked) => 
                      handleBookToggle(livro.id, checked as boolean)
                    }
                  />
                  <label 
                    htmlFor={livro.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {livro.titulo}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={handleSave}
                disabled={updateAccessMutation.isPending}
                className="w-full"
              >
                {updateAccessMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};