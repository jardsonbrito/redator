import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, Shield, ShieldCheck } from "lucide-react";

interface ProfessorFormProps {
  onSuccess: () => void;
  professorEditando?: any;
  onCancelEdit?: () => void;
}

export const ProfessorForm = ({ onSuccess, professorEditando, onCancelEdit }: ProfessorFormProps) => {
  const [nomeCompleto, setNomeCompleto] = useState(professorEditando?.nome_completo || "");
  const [email, setEmail] = useState(professorEditando?.email || "");
  const [role, setRole] = useState(professorEditando?.role || "professor");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeCompleto.trim() || !email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome completo e e-mail são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (professorEditando) {
        // Atualizar professor existente
        const { data, error } = await supabase.rpc('atualizar_professor', {
          professor_id: professorEditando.id,
          p_nome_completo: nomeCompleto.trim(),
          p_email: email.toLowerCase().trim(),
          p_role: role
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) {
          toast({
            title: "Erro",
            description: result.message,
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Professor atualizado",
          description: "Os dados do professor foram atualizados com sucesso."
        });
      } else {
        // Criar novo professor com usuário Auth
        const { data, error } = await supabase.functions.invoke('criar-professor-auth', {
          body: {
            nome_completo: nomeCompleto.trim(),
            email: email.toLowerCase().trim(),
            role: role
          }
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) {
          toast({
            title: "Erro",
            description: result.message,
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Professor criado",
          description: "Novo professor criado com sucesso. Senha padrão: 123456"
        });
      }

      // Limpar formulário
      setNomeCompleto("");
      setEmail("");
      setRole("professor");
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar professor:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o professor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNomeCompleto("");
    setEmail("");
    setRole("professor");
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {professorEditando ? "Editar Professor" : "Adicionar Novo Professor"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome Completo *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="nome"
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  placeholder="Digite o nome completo"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o e-mail"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Acesso *</Label>
            <RadioGroup value={role} onValueChange={setRole}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professor" id="professor" />
                <Label htmlFor="professor" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Professor
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin" className="flex items-center gap-2 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  Administrador
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {!professorEditando && "Senha temporária: 123456 (será solicitada troca no primeiro login)"}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : professorEditando ? "Atualizar Professor" : "Criar Professor"}
            </Button>
            {professorEditando && (
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