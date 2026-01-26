import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserPlus,
  Home,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GraduationCap,
  LogIn
} from "lucide-react";

interface FormularioInfo {
  id: string;
  titulo: string;
  descricao: string | null;
  inscricoes_abertas: boolean;
  ativo: boolean;
  turma_processo: string | null;
}

export default function ProcessoSeletivoInscricao() {
  const { formularioId } = useParams<{ formularioId: string }>();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState<FormularioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inscrito, setInscrito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  // Buscar informações do processo seletivo
  useEffect(() => {
    const buscarFormulario = async () => {
      if (!formularioId) {
        setErro("Link de inscrição inválido");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("ps_formularios")
          .select("id, titulo, descricao, inscricoes_abertas, ativo, turma_processo")
          .eq("id", formularioId)
          .single();

        if (error || !data) {
          setErro("Processo seletivo não encontrado");
          setLoading(false);
          return;
        }

        // Verificar se tem turma - se não tiver, gerar
        if (!data.turma_processo) {
          const { data: turmaData } = await supabase.rpc('gerar_e_atribuir_turma_processo', {
            formulario_id: formularioId
          });

          if (turmaData) {
            data.turma_processo = turmaData;
          }
        }

        setFormulario(data as FormularioInfo);
      } catch (err) {
        console.error("Erro ao buscar processo:", err);
        setErro("Erro ao carregar informações do processo seletivo");
      } finally {
        setLoading(false);
      }
    };

    buscarFormulario();
  }, [formularioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!formularioId) {
      toast.error("Erro: ID do processo não encontrado");
      return;
    }

    setSubmitting(true);

    try {
      // Chamar a função RPC para cadastrar candidato
      const { data, error } = await supabase.rpc('cadastrar_candidato_processo_seletivo', {
        p_nome: nome.trim(),
        p_email: email.trim().toLowerCase(),
        p_formulario_id: formularioId
      });

      if (error) {
        console.error("Erro RPC:", error);
        toast.error("Erro ao processar inscrição. Tente novamente.");
        return;
      }

      const resultado = data as { success: boolean; error?: string; candidato_id?: string };

      if (!resultado.success) {
        toast.error(resultado.error || "Erro ao realizar inscrição");
        return;
      }

      // Sucesso!
      setInscrito(true);
      toast.success("Inscrição realizada com sucesso!");

    } catch (err: any) {
      console.error("Erro ao inscrever:", err);
      toast.error(err.message || "Erro inesperado ao processar inscrição");
    } finally {
      setSubmitting(false);
    }
  };

  // Tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#3F0077]" />
              <p className="text-muted-foreground">Carregando processo seletivo...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de erro
  if (erro || !formulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Processo Indisponível</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pb-6">
            <p className="text-muted-foreground">
              {erro || "O processo seletivo solicitado não foi encontrado."}
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de inscrições fechadas
  if (!formulario.ativo || !formulario.inscricoes_abertas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-orange-600">Inscrições Encerradas</CardTitle>
            <CardDescription className="text-lg mt-2">{formulario.titulo}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 pb-6">
            <p className="text-muted-foreground">
              As inscrições para este processo seletivo foram encerradas.
            </p>
            <Alert variant="default" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Já está inscrito?</AlertTitle>
              <AlertDescription>
                Se você já realizou sua inscrição, acesse sua conta para acompanhar o processo.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Link to="/aluno-login">
                <Button className="w-full bg-[#3F0077] hover:bg-[#662F96]">
                  <LogIn className="w-4 h-4 mr-2" />
                  Acessar Minha Conta
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de inscrição concluída
  if (inscrito) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">Cadastro Realizado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pb-6">
            <p className="text-muted-foreground">
              Seu cadastro no processo seletivo <strong>{formulario.titulo}</strong> foi realizado com sucesso!
            </p>
            <Alert className="text-left bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">Próximo Passo: Preencher o Formulário</AlertTitle>
              <AlertDescription className="text-blue-600 space-y-2">
                <p>
                  Para completar sua inscrição, você precisa preencher o formulário com seus dados.
                </p>
                <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                  <li>Acesse sua conta com o email <strong>{email}</strong></li>
                  <li>Clique no card <strong>"Processo Seletivo"</strong></li>
                  <li>Preencha todas as informações solicitadas</li>
                </ol>
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/aluno-login">
                <Button className="w-full bg-[#3F0077] hover:bg-[#662F96]">
                  <LogIn className="w-4 h-4 mr-2" />
                  Acessar Minha Conta
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de inscrição
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-[#3F0077] p-3 rounded-full">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#3F0077]">{formulario.titulo}</CardTitle>
          {formulario.descricao && (
            <CardDescription className="mt-2 text-base">
              {formulario.descricao}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <UserPlus className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Inscrição Rápida</AlertTitle>
            <AlertDescription className="text-blue-600">
              Preencha seus dados abaixo para se inscrever no processo seletivo. Após a inscrição, você poderá acessar sua conta e preencher o formulário completo.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu melhor e-mail"
                required
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Você usará este e-mail para acessar sua conta
              </p>
            </div>

            <Button
              type="submit"
              disabled={!nome.trim() || !email.trim() || submitting}
              className="w-full bg-[#3F0077] hover:bg-[#662F96] h-11"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Fazer Inscrição
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 border-t">
            <p className="text-center text-sm text-muted-foreground">
              Já está inscrito?{" "}
              <Link to="/aluno-login" className="text-[#3F0077] hover:underline font-medium">
                Acessar minha conta
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
