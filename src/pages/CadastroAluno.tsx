import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, Home, XCircle, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { TURMAS_VALIDAS, formatTurmaDisplay, TurmaLetra } from "@/utils/turmaUtils";

type TurmasConfig = Record<string, boolean>;

export default function CadastroAluno() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [turma, setTurma] = useState("");
  const [loading, setLoading] = useState(false);
  const [cadastrado, setCadastrado] = useState(false);
  const [turmasHabilitadas, setTurmasHabilitadas] = useState<TurmaLetra[]>([]);
  const [verificandoConfig, setVerificandoConfig] = useState(true);
  const [turmaDesabilitada, setTurmaDesabilitada] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Verificar configuração das turmas
  useEffect(() => {
    const verificarConfiguracao = async () => {
      try {
        const { data, error } = await supabase
          .from("configuracoes_sistema")
          .select("valor")
          .eq("chave", "autoatendimento_turmas")
          .maybeSingle();

        if (error) throw error;

        let turmasAtivas: TurmaLetra[] = [];

        if (data?.valor) {
          const config = data.valor as TurmasConfig;
          // Filtrar apenas turmas habilitadas
          turmasAtivas = TURMAS_VALIDAS.filter(t => config[t] !== false);
        } else {
          // Se não existir configuração, assume todas habilitadas
          turmasAtivas = [...TURMAS_VALIDAS];
        }

        setTurmasHabilitadas(turmasAtivas);

        // Verificar se há turma na URL e se está habilitada
        const turmaParam = searchParams.get('turma')?.toUpperCase();
        if (turmaParam && TURMAS_VALIDAS.includes(turmaParam as TurmaLetra)) {
          if (turmasAtivas.includes(turmaParam as TurmaLetra)) {
            setTurma(turmaParam);
          } else {
            // Turma específica da URL está desabilitada
            setTurmaDesabilitada(true);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar configuração:", error);
        // Em caso de erro, assume todas habilitadas
        setTurmasHabilitadas([...TURMAS_VALIDAS]);
      } finally {
        setVerificandoConfig(false);
      }
    };

    verificarConfiguracao();
  }, [searchParams]);

  const isFormValid = nome.trim() && email.trim() && turma;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Verificar novamente se a turma está habilitada (proteção extra)
    if (!turmasHabilitadas.includes(turma as TurmaLetra)) {
      toast({
        title: "Turma não disponível",
        description: "Esta turma não está aceitando novos cadastros no momento.",
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
        ativo: false, // Alunos cadastrados via autoatendimento ficam inativos
        status_aprovacao: 'pendente', // Status pendente para aprovação
        data_solicitacao: new Date().toISOString()
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

  // Tela de carregamento
  if (verificandoConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando disponibilidade...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de turma específica desabilitada
  if (turmaDesabilitada) {
    const turmaParam = searchParams.get('turma')?.toUpperCase();
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Cadastro Indisponível</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              O cadastro para a Turma {turmaParam} está temporariamente desabilitado.
            </p>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador para mais informações.
            </p>
            <Link to="/">
              <Button className="w-full" variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de nenhuma turma disponível
  if (turmasHabilitadas.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Cadastro Indisponível</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              O cadastro de novos alunos está temporariamente desabilitado.
            </p>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador para mais informações.
            </p>
            <Link to="/">
              <Button className="w-full" variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de cadastro concluído
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

  // Formulário de cadastro
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
                  {turmasHabilitadas.map((turmaOption) => (
                    <SelectItem key={turmaOption} value={turmaOption}>
                      {formatTurmaDisplay(turmaOption)}
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
