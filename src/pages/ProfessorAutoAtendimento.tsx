import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, User, AlertTriangle, Loader2 } from "lucide-react";

type Etapa = "carregando" | "invalido" | "email" | "nome";

export default function ProfessorAutoAtendimento() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const codigoConvite = (searchParams.get("convite") ?? "").toUpperCase();

  const [nomeTurma, setNomeTurma] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  // Valida o convite ao montar
  useEffect(() => {
    if (!codigoConvite) {
      setEtapa("invalido");
      return;
    }

    const validar = async () => {
      const { data } = await supabase
        .from("convites_professores")
        .select("turmas_professores(nome)")
        .eq("codigo", codigoConvite)
        .eq("usado", false)
        .single();

      if (data?.turmas_professores) {
        setNomeTurma((data.turmas_professores as any).nome);
        setEtapa("email");
      } else {
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
      const { data, error } = await supabase.rpc("professor_entrar_por_convite", {
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
        toast({ title: "Erro", description: result.message, variant: "destructive" });
        return;
      }

      finalizarLogin(result.professor);
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
      const { data, error } = await supabase.rpc("professor_entrar_por_convite", {
        p_codigo: codigoConvite,
        p_email: email.toLowerCase().trim(),
        p_nome: nome.trim(),
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
        return;
      }

      finalizarLogin(result.professor);
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const finalizarLogin = (professor: any) => {
    localStorage.setItem("professor_session", JSON.stringify(professor));
    toast({ title: "Acesso liberado!", description: `Bem-vindo, ${professor.nome_completo}!` });
    navigate("/professor/dashboard", { replace: true });
  };

  // ── Tela de loading ──
  if (etapa === "carregando") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-redator-primary" />
      </div>
    );
  }

  // ── Convite inválido ──
  if (etapa === "invalido") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto" />
            <h2 className="text-xl font-bold text-redator-primary">Convite inválido</h2>
            <p className="text-sm text-redator-accent">
              Este link de convite não é válido, já foi utilizado ou expirou.<br />
              Solicite um novo convite ao seu coordenador.
            </p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="Logo"
              className="w-28 h-28 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-redator-primary mb-1">Acesso do Professor</h1>
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

            {/* Etapa 2 — nome (professor novo) */}
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
