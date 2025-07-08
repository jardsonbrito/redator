import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AlunoSelfServiceProps {
  onSuccess: () => void;
}

export const AlunoSelfService = ({ onSuccess }: AlunoSelfServiceProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [turma, setTurma] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const turmas = [
    "Turma A",
    "Turma B", 
    "Turma C",
    "Turma D",
    "Turma E"
  ];

  const isFormValid = nome.trim() && email.trim() && turma;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      // Verificar se já existe aluno com este email
      const { data: existingAluno } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email.trim().toLowerCase())
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

      const dadosAluno = {
        id: crypto.randomUUID(),
        nome: nome.trim(),
        sobrenome: "", // Mantém campo vazio para compatibilidade
        email: email.trim().toLowerCase(),
        turma,
        user_type: "aluno",
        is_authenticated_student: true
      };

      const { error } = await supabase
        .from("profiles")
        .insert(dadosAluno);

      if (error) throw error;

      toast({
        title: "Aluno cadastrado com sucesso!",
        description: `${nome} foi adicionado à ${turma}.`
      });

      // Limpar formulário
      setNome("");
      setEmail("");
      setTurma("");
      onSuccess();

    } catch (error: any) {
      console.error("Erro ao salvar aluno:", error);
      toast({
        title: "Erro ao salvar aluno",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulário de Autoatendimento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome completo do aluno"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite o e-mail do aluno"
              required
            />
          </div>

          <div>
            <Label htmlFor="turma">Turma *</Label>
            <Select value={turma} onValueChange={setTurma} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((turmaOption) => (
                  <SelectItem key={turmaOption} value={turmaOption}>
                    {turmaOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            disabled={!isFormValid || loading}
            className="w-full"
          >
            {loading ? "Salvando..." : "Cadastrar Aluno"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};