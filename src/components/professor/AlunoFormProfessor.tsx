import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { TODAS_TURMAS, formatTurmaDisplay } from "@/utils/turmaUtils";

interface AlunoFormProfessorProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const AlunoFormProfessor = ({ onSuccess, onCancel }: AlunoFormProfessorProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [turma, setTurma] = useState("");
  const [turmasDisponíveis, setTurmasDisponíveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { professor } = useProfessorAuth();

  // Buscar turmas vinculadas ao professor logado
  useEffect(() => {
    const fetchTurmasProfessor = async () => {
      if (!professor?.id) return;

      try {
        // Buscar turmas onde o professor é responsável
        const { data, error } = await supabase
          .from("profiles")
          .select("turma")
          .eq("user_type", "turma")
          .eq("aprovado_por", professor.id)
          .eq("ativo", true);

        if (error) throw error;

        const turmas = data?.map(item => item.turma).filter(Boolean) || [];
        setTurmasDisponíveis([...new Set(turmas)]); // Remove duplicatas

      } catch (error) {
        console.error("Erro ao buscar turmas do professor:", error);
        // Fallback para turmas padrão se houver erro
        setTurmasDisponíveis(TODAS_TURMAS.map(turma => formatTurmaDisplay(turma)));
      }
    };

    fetchTurmasProfessor();
  }, [professor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !turma) return;

    setLoading(true);
    try {
      // Verificar se já existe aluno com este email
      const { data: existingAluno } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .eq("user_type", "aluno")
        .single();

      if (existingAluno) {
        toast({
          title: "Email já cadastrado",
          description: "Já existe um aluno cadastrado com este e-mail.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Criar novo aluno
      const alunoData = {
        id: `aluno-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nome: nome.trim(),
        sobrenome: "",
        email: email.trim().toLowerCase(),
        turma,
        user_type: "aluno",
        is_authenticated_student: false, // Aluno simples criado pelo professor
        ativo: true,
        status_aprovacao: "ativo",
        aprovado_por: professor?.id
      };

      const { error } = await supabase
        .from("profiles")
        .insert(alunoData);

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

  const isFormValid = nome.trim() && email.trim() && turma;

  if (turmasDisponíveis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastrar Novo Aluno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Você precisa criar pelo menos uma turma antes de cadastrar alunos.
            </p>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Voltar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Cadastrar Novo Aluno
        </CardTitle>
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
                {turmasDisponíveis.map((turmaOption) => (
                  <SelectItem key={turmaOption} value={turmaOption}>
                    {turmaOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!isFormValid || loading}
              className="flex-1"
            >
              {loading ? "Cadastrando..." : "Cadastrar Aluno"}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};