import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, User, AlertTriangle, Loader2 } from "lucide-react";

type Etapa = "carregando" | "invalido" | "expirado" | "ja_usado" | "email" | "nome";

const MENSAGENS_ERRO: Record<string, { titulo: string; descricao: string }> = {
  convite_invalido: {
    titulo: "Convite inválido",
    descricao: "Este link de convite não existe ou não é válido. Solicite um novo convite.",
  },
  convite_expirado: {
    titulo: "Convite expirado",
    descricao: "Este convite expirou e não pode mais ser utilizado. Solicite um novo convite.",
  },
  email_nao_permitido: {
    titulo: "E-mail não permitido",
    descricao: "Este convite foi gerado para outro e-mail. Verifique o e-mail informado ou solicite um novo convite.",
  },
  turma_inativa: {
    titulo: "Turma indisponível",
    descricao: "A turma associada a este convite está inativa. Entre em contato com o suporte.",
  },
};

export default function AlunoAutoAtendimento() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginAsStudent } = useStudentAuth();
  const { toast } = useToast();

  const codigoConvite = (searchParams.get("convite") ?? "").toUpperCase();

  const [nomeTurma, setNomeTurma] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [erroMotivo, setErroMotivo] = useState<string>("convite_invalido");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  // Validação inicial do convite ao montar
  useEffect(() => {
    if (!codigoConvite) {
      setErroMotivo("convite_invalido");
      setEtapa("invalido");
      return;
    }

    const validar = async () => {
      const { data } = await supabase
        .from("convites_alunos")
        .select("usado, expira_em, turmas_alunos(nome)")
        .eq("codigo", codigoConvite)
        .maybeSingle();

      if (!data) {
        setErroMotivo("convite_invalido");
        setEtapa("invalido");
        return;
      }

      if (data.usado) {
        setErroMotivo("convite_invalido");
        setEtapa("invalido");
        return;
      }

      if (data.expira_em && new Date(data.expira_em) < new Date()) {
        setErroMotivo("convite_expirado");
        setEtapa("invalido");
        return;
      }

      if (data.turmas_alunos) {
        setNomeTurma((data.turmas_alunos as any).nome);
        setEtapa("email");
      } else {
        setErroMotivo("turma_inativa");
        setEtapa("invalido");
      }
    };

    validar();
  }, [codigoConvite]);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("aluno_entrar_por_convite" as any, {
        p_codigo: codigoConvite,
        p_email: email.toLowerCase().trim(),
      });

      if (error) throw error;

      const result = data as any;

      if (result.needs_name) {
        setEtapa("nome");
        return;
      }

      if (!result.success) {
        const msg = MENSAGENS_ERRO[result.motivo] ?? MENSAGENS_ERRO.convite_invalido;
        toast({ title: msg.titulo, description: msg.descricao, variant: "destructive" });
        return;
      }

      await finalizarAcesso(result.profile);
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("aluno_entrar_por_convite" as any, {
        p_codigo: codigoConvite,
        p_email: email.toLowerCase().trim(),
        p_nome: nome.trim(),
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        const msg = MENSAGENS_ERRO[result.motivo] ?? MENSAGENS_ERRO.convite_invalido;
        toast({ title: msg.titulo, description: msg.descricao, variant: "destructive" });
        return;
      }

      await finalizarAcesso(result.profile);
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const finalizarAcesso = async (profile: { nome: string; email: string; turma: string }) => {
    // Usa o sistema de sessão existente do aluno — não altera nenhuma lógica de auth
    await loginAsStudent(profile.turma, profile.nome, profile.email);
    toast({ title: "Acesso liberado!", description: `Bem-vindo, ${profile.nome}!` });
    navigate("/app", { replace: true });
  };

  // ── Tela de loading ──
  if (etapa === "carregando") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-redator-primary" />
      </div>
    );
  }

  // ── Convite inválido / expirado / já usado ──
  if (etapa === "invalido") {
    const msg = MENSAGENS_ERRO[erroMotivo] ?? MENSAGENS_ERRO.convite_invalido;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto" />
            <h2 className="text-xl font-bold text-redator-primary">{msg.titulo}</h2>
            <p className="text-sm text-redator-accent">{msg.descricao}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Formulário ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="Logo"
              className="w-28 h-28 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-redator-primary mb-1">Acesso do Aluno</h1>
          <p className="text-sm text-redator-accent">
            Turma: <span className="font-semibold">{nomeTurma}</span>
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardContent className="p-6 space-y-6">

            {/* Etapa 1 — e-mail */}
            {etapa === "email" && (
              <form onSubmit={handleSubmitEmail} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Digite seu e-mail"
                      className="pl-10 border-redator-accent/30"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar →"}
                </Button>
              </form>
            )}

            {/* Etapa 2 — nome (aluno novo) */}
            {etapa === "nome" && (
              <form onSubmit={handleSubmitNome} className="space-y-4">
                <p className="text-sm text-redator-accent">
                  E-mail não encontrado. Informe seu nome completo para criar o acesso.
                </p>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    value={email}
                    readOnly
                    className="mt-1 bg-gray-50 border-redator-accent/30"
                  />
                </div>
                <div>
                  <Label htmlFor="nome">Nome completo</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="pl-10 border-redator-accent/30"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEtapa("email")}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar acesso"}
                  </Button>
                </div>
              </form>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
