import { useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StudentLoginForm } from "./login/StudentLoginForm";
import { ProfessorLoginForm } from "./login/ProfessorLoginForm";
import { VisitorLoginForm } from "./login/VisitorLoginForm";
import { CorretorLoginForm } from "./login/CorretorLoginForm";

interface LoginFormProps {
  selectedProfile: "professor" | "aluno" | "visitante" | "corretor";
  onLogin: (profileType: "professor" | "aluno" | "visitante" | "corretor", data: any) => void;
  loading: boolean;
}

export const LoginForm = ({ selectedProfile, onLogin, loading }: LoginFormProps) => {
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (data: any) => {
    console.log('🔄 LoginForm - Redirecionando login para Welcome');
    onLogin(selectedProfile, data);
  };

  return (
    <div className="space-y-5">
      {/* Formulário dinâmico — lógica inalterada */}
      <div>
        {selectedProfile === "professor" && (
          <ProfessorLoginForm onLogin={handleLogin} loading={loading} />
        )}
        {selectedProfile === "aluno" && (
          <StudentLoginForm onLogin={handleLogin} loading={loading} />
        )}
        {selectedProfile === "visitante" && (
          <VisitorLoginForm onLogin={handleLogin} loading={loading} />
        )}
        {selectedProfile === "corretor" && (
          <CorretorLoginForm onLogin={handleLogin} loading={loading} />
        )}
      </div>

      {/* Rodapé: Lembre-se de mim + Área administrativa */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            className="border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
          />
          <Label htmlFor="remember-me" className="text-sm text-slate-500 cursor-pointer select-none">
            Lembre-se de mim
          </Label>
        </div>
        <Link
          to="/login"
          className="text-xs text-violet-600 hover:text-violet-800 hover:underline transition-colors"
        >
          Área administrativa
        </Link>
      </div>
    </div>
  );
};
