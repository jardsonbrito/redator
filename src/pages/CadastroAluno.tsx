import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function CadastroAluno() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [turma, setTurma] = useState("");
  const [loading, setLoading] = useState(false);
  const [cadastrado, setCadastrado] = useState(false);
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
          title: "Cadastro já realizado",
          description: "Já existe um aluno cadastrado com este e-mail. Entre em contato com o administrador se necessário.",
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
        is_authenticated_student: true,
        ativo: false // Alunos cadastrados via link ficam inativos
      };

      const { error } = await supabase
        .from("profiles")
        .insert(dadosAluno);

      if (error) throw error;

      setCadastrado(true);
      toast({
        title: "Cadastro enviado com sucesso!",
        description: "Aguarde a liberação do seu acesso por um administrador."
      });

    } catch (error: any) {
      console.error("Erro ao cadastrar aluno:", error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (cadastrado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <UserCheck className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-2xl text-primary">Cadastro Concluído!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Cadastro enviado com sucesso. Aguarde a liberação do seu acesso por um administrador.
            </p>
            <Link to="/">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Cadastro de Aluno</CardTitle>
          <p className="text-muted-foreground">
            Preencha os campos abaixo para realizar seu cadastro
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
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
                placeholder="Digite seu e-mail"
                required
              />
            </div>

            <div>
              <Label htmlFor="turma">Turma *</Label>
              <Select value={turma} onValueChange={setTurma} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua turma" />
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
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}