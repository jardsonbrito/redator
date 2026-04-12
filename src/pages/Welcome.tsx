import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const {
    toast
  } = useToast();
  const {
    loginAsStudent,
    loginAsVisitante
  } = useStudentAuth();
  const { loginAsProfessor } = useProfessorAuth();
  const { loginAsCorretor } = useCorretorAuth();
  const handleLogin = async (profileType: "professor" | "aluno" | "visitante" | "corretor", data: any) => {
    console.log('🔄 WELCOME - Login iniciado:', profileType, data);
    setLoading(true);
    try {
      if (profileType === "professor") {
        const { error } = await loginAsProfessor(data.email);
        if (error) {
          toast({
            title: "Erro no login",
            description: error,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Redirecionando para o painel do professor..."
          });
          setTimeout(async () => {
            const professorData = JSON.parse(localStorage.getItem('professor_session') || '{}');
            if (professorData.primeiro_login) {
              navigate('/professor/trocar-senha', { replace: true });
            } else {
              navigate('/professor/dashboard', { replace: true });
            }
          }, 1000);
        }
      } else if (profileType === "aluno") {
        console.log('✅ WELCOME - Login bem-sucedido para aluno:', data.nome, 'Turma:', data.turma);
        await loginAsStudent(data.turma, data.nome, data.email);
        toast({
          title: "Acesso liberado!",
          description: `Bem-vindo, ${data.nome}!`
        });
        navigate("/app", {
          replace: true
        });
      } else if (profileType === "visitante") {
        console.log('✅ WELCOME - Login bem-sucedido para visitante:', data.nome);
        await loginAsVisitante(data.nome, data.email, data.whatsapp);
        toast({
          title: "Bem-vindo, visitante!",
          description: `Olá, ${data.nome}! Acesso liberado.`
        });
        navigate("/app", {
          replace: true
        });
      } else if (profileType === "corretor") {
        console.log('✅ WELCOME - Login bem-sucedido para corretor:', data.email);
        const {
          error
        } = await loginAsCorretor(data.email, "temp_password");
        if (error) {
          toast({
            title: "Erro no login",
            description: "E-mail não encontrado ou corretor inativo.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Acesso liberado!",
            description: "Redirecionando para o painel do corretor..."
          });
          setTimeout(() => {
            navigate('/corretor', {
              replace: true
            });
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('🚨 WELCOME - Erro no login:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" alt="Logo da plataforma" className="w-28 h-28 md:w-32 md:h-32 object-contain" />
          </div>
          
          <h1 className="text-2xl font-bold text-redator-primary mb-2">App do Redator</h1>
          <p className="text-sm text-redator-accent mb-8">Para continuar, escolha o tipo de perfil e informe os dados solicitados.</p>
        </div>

        <div className="space-y-6">
          <ProfileSelector selectedProfile={selectedProfile} onProfileChange={setSelectedProfile} />

          <LoginForm selectedProfile={selectedProfile} onLogin={handleLogin} loading={loading} />

        </div>
      </div>
    </div>;
};
export default Welcome;