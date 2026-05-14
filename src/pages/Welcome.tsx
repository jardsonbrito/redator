import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { ProfileSelector } from "@/components/ProfileSelector";
import { LoginForm } from "@/components/LoginForm";

const Welcome = () => {
  const [selectedProfile, setSelectedProfile] = useState<"professor" | "aluno" | "visitante" | "corretor">("aluno");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsStudent, loginAsVisitante } = useStudentAuth();
  const { loginAsProfessor } = useProfessorAuth();
  const { loginAsCorretor } = useCorretorAuth();

  const handleLogin = async (profileType: "professor" | "aluno" | "visitante" | "corretor", data: any) => {
    console.log('🔄 WELCOME - Login iniciado:', profileType, data);
    setLoading(true);
    try {
      if (profileType === "professor") {
        const { error } = await loginAsProfessor(data.email);
        if (error) {
          toast({ title: "Erro no login", description: error, variant: "destructive" });
        } else {
          toast({ title: "Login realizado com sucesso!", description: "Redirecionando para o painel do professor..." });
          setTimeout(async () => {
            const professorData = JSON.parse(localStorage.getItem('professor_session') || '{}');
            if (professorData.primeiro_login) {
              navigate('/professor/trocar-senha', { replace: true });
            } else {
              navigate('/professor', { replace: true });
            }
          }, 1000);
        }
      } else if (profileType === "aluno") {
        console.log('✅ WELCOME - Login bem-sucedido para aluno:', data.nome, 'Turma:', data.turma);
        await loginAsStudent(data.turma, data.nome, data.email);
        toast({ title: "Acesso liberado!", description: `Bem-vindo, ${data.nome}!` });
        navigate("/app", { replace: true });
      } else if (profileType === "visitante") {
        console.log('✅ WELCOME - Login bem-sucedido para visitante:', data.nome);
        await loginAsVisitante(data.nome, data.email, data.whatsapp);
        toast({ title: "Bem-vindo, visitante!", description: `Olá, ${data.nome}! Acesso liberado.` });
        navigate("/app", { replace: true });
      } else if (profileType === "corretor") {
        console.log('✅ WELCOME - Login bem-sucedido para corretor:', data.email);
        const { error } = await loginAsCorretor(data.email, "temp_password");
        if (error) {
          toast({ title: "Erro no login", description: "E-mail não encontrado ou corretor inativo.", variant: "destructive" });
        } else {
          toast({ title: "Acesso liberado!", description: "Redirecionando para o painel do corretor..." });
          setTimeout(() => { navigate('/corretor', { replace: true }); }, 1000);
        }
      }
    } catch (error: any) {
      console.error('🚨 WELCOME - Erro no login:', error);
      toast({ title: "Erro inesperado", description: "Ocorreu um erro inesperado. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      <main className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_520px]">

        {/* Lado esquerdo — visível apenas no desktop */}
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-950">
              Redação na prática,<br />aprovação na certa.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Uma plataforma completa para quem quer estudar ou corrigir redação.
            </p>
          </div>
        </section>

        {/* Card de login */}
        <section className="mx-auto w-full max-w-[520px]">
          <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur xl:p-8">

            {/* Logo + título */}
            <div className="flex flex-col items-center mb-6">
              <img
                src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
                alt="Logo da plataforma"
                className="w-20 h-20 object-contain mb-3"
              />
              <h2 className="text-xl font-bold text-slate-900">App do Redator</h2>
              <p className="mt-1 text-sm text-slate-500 text-center">
                Para continuar, escolha o tipo de perfil e informe os dados solicitados.
              </p>
            </div>

            <div className="space-y-5">
              <ProfileSelector
                selectedProfile={selectedProfile}
                onProfileChange={setSelectedProfile}
              />
              <LoginForm
                selectedProfile={selectedProfile}
                onLogin={handleLogin}
                loading={loading}
              />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Welcome;
