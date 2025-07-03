
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { ProfileSelector } from "@/components/ProfileSelector";
import { LoginForm } from "@/components/LoginForm";

const Welcome = () => {
  const [selectedProfile, setSelectedProfile] = useState<"professor" | "aluno" | "visitante">("aluno");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsStudent, loginAsVisitante } = useStudentAuth();
  const { signIn } = useAuth();

  const handleLogin = async (profileType: "professor" | "aluno" | "visitante", data: any) => {
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
        // Login bem-sucedido - usar a turma do aluno encontrado
        console.log('✅ Login bem-sucedido para aluno:', data.nome, 'Turma:', data.turma);
        loginAsStudent(data.turma);
        toast({
          title: "Acesso liberado!",
          description: `Bem-vindo, ${data.nome}!`
        });
        navigate("/app", { replace: true });
      } else if (profileType === "visitante") {
        loginAsVisitante(data.nome, data.email);
        toast({
          title: "Bem-vindo, visitante!",
          description: `Olá, ${data.nome}! Acesso liberado.`
        });
        navigate("/app", { replace: true });
      }
    } catch (error: any) {
      console.error('🚨 Erro no login:', error);
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
              alt="Logo da plataforma" 
              className="w-20 h-20 object-contain" 
            />
          </div>
          
          <h1 className="text-2xl font-bold text-redator-primary mb-2">
            Bem-vindo(a) à nossa plataforma
          </h1>
          <p className="text-sm text-redator-accent mb-8">
            Antes de entrar, selecione o tipo de perfil e em seguida preencha os dados solicitados.
          </p>
        </div>

        <div className="space-y-6">
          {/* Botões de perfil */}
          <ProfileSelector 
            selectedProfile={selectedProfile}
            onProfileChange={setSelectedProfile}
          />

          {/* Formulário de login */}
          <LoginForm
            selectedProfile={selectedProfile}
            onLogin={handleLogin}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
