import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, User } from "lucide-react";

interface Turma {
  id: string;
  nome: string;
}

interface ProfessorFormProps {
  onSuccess: () => void;
  professorEditando?: any;
  onCancelEdit?: () => void;
}

export const ProfessorForm = ({ onSuccess, professorEditando, onCancelEdit }: ProfessorFormProps) => {
  const [nomeCompleto, setNomeCompleto] = useState(professorEditando?.nome_completo || "");
  const [email, setEmail] = useState(professorEditando?.email || "");
  const [turmaId, setTurmaId] = useState<string>(professorEditando?.turma_id || "none");
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTurmas = async () => {
      const { data } = await supabase
        .from("turmas_professores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      setTurmas(data || []);
    };
    fetchTurmas();
  }, []);

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "E-mail inválido", description: "Por favor, insira um e-mail válido.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (professorEditando) {
        const { data, error } = await supabase.rpc('atualizar_professor', {
          professor_id: professorEditando.id,
          p_nome_completo: nomeCompleto.trim(),
          p_email: email.toLowerCase().trim(),
          p_role: 'professor',
          p_turma_id: turmaId === "none" ? null : turmaId
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) {
          toast({ title: "Erro", description: result.message, variant: "destructive" });
          return;
        }

        toast({ title: "Professor atualizado", description: "Dados atualizados com sucesso." });
      } else {
        const { data, error } = await supabase.functions.invoke('criar-professor-auth', {
          body: {
            nome_completo: nomeCompleto.trim(),
            email: email.toLowerCase().trim(),
            role: 'professor',
            turma_id: turmaId === "none" ? null : turmaId
          }
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) {
          toast({ title: "Erro", description: result.message, variant: "destructive" });
          return;
        }

        toast({ title: "Professor criado", description: "Novo professor criado com sucesso." });
      }

      setNomeCompleto("");
      setEmail("");
      setTurmaId("none");
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar professor:', error);
      toast({ title: "Erro", description: "Ocorreu um erro ao salvar o professor. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNomeCompleto("");
    setEmail("");
    setTurmaId("none");
    if (onCancelEdit) onCancelEdit();
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
              <Label htmlFor="nome">Nome Completo *</Label>
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
              <Label htmlFor="email">E-mail *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="turma">Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger id="turma">
                <SelectValue placeholder="Selecione uma turma (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem turma</SelectItem>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
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
