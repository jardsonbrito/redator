import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ProfessorLoginForm } from "@/components/login/ProfessorLoginForm";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export const ProfessorLogin = () => {
  const [loading, setLoading] = useState(false);
  const { loginAsProfessor, professor } = useProfessorAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (professor) {
      if (professor.primeiro_login) {
        navigate('/professor/trocar-senha');
      } else {
        navigate('/professor/dashboard');
      }
    }
  }, [professor, navigate]);

  const handleLogin = async (data: { email: string }) => {
    setLoading(true);
    try {
      const result = await loginAsProfessor(data.email);
      if (result.error) {
        toast({ title: "Erro no login", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro inesperado. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur xl:p-8">

          {/* Logo + título */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="Logo da plataforma"
              className="w-20 h-20 object-contain mb-3"
            />
            <h2 className="text-xl font-bold text-slate-900">Acesso Professor</h2>
            <p className="mt-1 text-sm text-slate-500 text-center">
              App do Redator — área exclusiva para professores
            </p>
          </div>

          <ProfessorLoginForm onLogin={handleLogin} loading={loading} />

          <div className="mt-5 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 hover:underline transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao início
            </Link>
          </div>

          <p className="mt-3 text-center text-xs text-slate-400">
            Problemas para acessar? Entre em contato com o administrador.
          </p>
        </div>
      </div>
    </div>
  );
};