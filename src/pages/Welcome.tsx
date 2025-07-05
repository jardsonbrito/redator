
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { ProfileSelector } from "@/components/ProfileSelector";
import { LoginForm } from "@/components/LoginForm";
import { LoginTestTool } from "@/components/LoginTestTool";

const Welcome = () => {
  const [selectedProfile, setSelectedProfile] = useState<"professor" | "aluno" | "visitante" | "corretor">("aluno");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsStudent, loginAsVisitante } = useStudentAuth();
  const { signIn } = useAuth();
  const { loginAsCorretor } = useCorretorAuth();

  const handleLogin = async (profileType: "professor" | "aluno" | "visitante" | "corretor", data: any) => {
    console.log('🔄 WELCOME - Login iniciado:', profileType, data);
    setLoading(true);

    try {
      if (profileType === "professor") {
        const { error } = await signIn(data.email, data.senha);
        if (error) {
          toast({
            title: "Erro no login",
            description: error.message || "Credenciais inválidas. Verifique email e senha.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Redirecionando para o painel administrativo..."
          });
          setTimeout(() => {
            navigate('/admin', { replace: true });
          }, 1000);
        }
      } else if (profileType === "aluno") {
        console.log('✅ WELCOME - Login bem-sucedido para aluno:', data.nome, 'Turma:', data.turma);
        loginAsStudent(data.turma);
        toast({
          title: "Acesso liberado!",
          description: `Bem-vindo, ${data.nome}!`
        });
        navigate("/app", { replace: true });
      } else if (profileType === "visitante") {
        console.log('✅ WELCOME - Login bem-sucedido para visitante:', data.nome);
        loginAsVisitante(data.nome, data.email);
        toast({
          title: "Bem-vindo, visitante!",
          description: `Olá, ${data.nome}! Acesso liberado.`
        });
        navigate("/app", { replace: true });
      } else if (profileType === "corretor") {
        console.log('✅ WELCOME - Login bem-sucedido para corretor:', data.email);
        const { error } = await loginAsCorretor(data.email, "temp_password");
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
            navigate('/corretor', { replace: true });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo do App do Redator" 
              className="w-24 h-24 object-contain" 
            />
          </div>
          
          <h1 className="text-3xl font-bold text-redator-primary mb-2">
            App do Redator
          </h1>
          <p className="text-lg text-redator-accent font-medium mb-8">
            Redação na Prática, Aprovação na Certa!
          </p>
        </div>

        <div className="space-y-6">
          <ProfileSelector 
            selectedProfile={selectedProfile}
            onProfileChange={setSelectedProfile}
          />

          <LoginForm
            selectedProfile={selectedProfile}
            onLogin={handleLogin}
            loading={loading}
          />

          {/* Ferramenta de teste - visível apenas em desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <LoginTestTool />
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
