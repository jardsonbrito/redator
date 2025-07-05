
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";

interface AlunoInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  turma: string;
  onSuccess: () => void;
}

export const AlunoInsertModal = ({ isOpen, onClose, turma, onSuccess }: AlunoInsertModalProps) => {
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
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
      // Verificar se já existe aluno com este email
      const { data: existingAluno } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", formData.email.trim().toLowerCase())
        .maybeSingle();

      if (existingAluno) {
        toast({
          title: "Erro",
          description: "Já existe um aluno cadastrado com este e-mail.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Criar novo aluno
      const { error } = await supabase
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          nome: formData.nome_completo.trim(),
          sobrenome: "", // Mantém campo vazio para compatibilidade
          email: formData.email.trim().toLowerCase(),
          turma,
          creditos: 5, // Créditos padrão
          user_type: "aluno",
          is_authenticated_student: true
        });

      if (error) throw error;

      toast({
        title: "Aluno cadastrado com sucesso!",
        description: `${formData.nome_completo} foi adicionado à ${turma}.`
      });

      // Limpar formulário
      setFormData({
        nome_completo: "",
        email: "",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao cadastrar aluno:", error);
      toast({
        title: "Erro ao cadastrar aluno",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nome_completo: "",
      email: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Inserir Novo Aluno - {turma}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
              placeholder="Digite o nome completo do aluno"
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
              placeholder="Digite o e-mail do aluno"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Cadastrando..." : "Cadastrar Aluno"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
