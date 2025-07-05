
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StudentLoginForm } from "./login/StudentLoginForm";
import { VisitorLoginForm } from "./login/VisitorLoginForm";
import { CorretorLoginForm } from "./login/CorretorLoginForm";

interface LoginFormProps {
  selectedProfile: "aluno" | "visitante" | "corretor";
  onLogin: (profileType: "aluno" | "visitante" | "corretor", data: any) => void;
  loading: boolean;
}

export const LoginForm = ({ selectedProfile, onLogin, loading }: LoginFormProps) => {
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (data: any) => {
    console.log('🔄 LoginForm - Redirecionando login para Welcome');
    onLogin(selectedProfile, data);
  };

  return (
    <Card className="shadow-xl border-redator-accent/20">
      <CardContent className="p-6 space-y-6">
        {selectedProfile === "aluno" && (
          <StudentLoginForm onLogin={handleLogin} loading={loading} />
        )}

        {selectedProfile === "visitante" && (
          <VisitorLoginForm onLogin={handleLogin} loading={loading} />
        )}

        {selectedProfile === "corretor" && (
          <CorretorLoginForm onLogin={handleLogin} loading={loading} />
        )}

        {/* Checkbox Lembre-se de mim */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label htmlFor="remember-me" className="text-sm text-redator-accent">
            Lembre-se de mim
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
