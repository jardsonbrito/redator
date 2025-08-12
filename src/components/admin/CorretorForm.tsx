
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CorretorFormProps {
  onSuccess?: () => void;
  corretorEditando?: any;
  onCancelEdit?: () => void;
}

export const CorretorForm = ({ onSuccess, corretorEditando, onCancelEdit }: CorretorFormProps) => {
  const [formData, setFormData] = useState({
    nome_completo: corretorEditando?.nome_completo || "",
    email: corretorEditando?.email || "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_completo.trim() || !formData.email.trim()) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (corretorEditando) {
        // Atualizar corretor existente
        const { error } = await supabase
          .from("corretores")
          .update({
            nome_completo: formData.nome_completo.trim(),
            email: formData.email.trim().toLowerCase(),
          })
          .eq("id", corretorEditando.id);

        if (error) throw error;

        toast({
          title: "Corretor atualizado com sucesso!",
          description: "Os dados do corretor foram atualizados.",
        });
      } else {
        // Criar novo corretor
        const { error } = await supabase
          .from("corretores")
          .insert({
            nome_completo: formData.nome_completo.trim(),
            email: formData.email.trim().toLowerCase(),
          });

        if (error) throw error;

        toast({
          title: "Corretor cadastrado com sucesso!",
          description: "O corretor foi adicionado ao sistema.",
        });
      }

      // Limpar formulário
      setFormData({
        nome_completo: "",
        email: "",
      });

      onSuccess?.();
      onCancelEdit?.();
    } catch (error: any) {
      console.error("Erro ao salvar corretor:", error);
      toast({
        title: "Erro ao salvar corretor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      nome_completo: "",
      email: "",
    });
    onCancelEdit?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {corretorEditando ? "Editar Corretor(a)" : "Adicionar Novo(a) Corretor(a)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
              placeholder="Digite o nome completo do(a) corretor(a)"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Digite o e-mail do(a) corretor(a)"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : (corretorEditando ? "Atualizar" : "Cadastrar")}
            </Button>
            {corretorEditando && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
