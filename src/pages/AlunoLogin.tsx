
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const AlunoLogin = () => {
  const [turma, setTurma] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const turmasSenhas = {
    "Turma A": "LRA2025",
    "Turma B": "LRB2025", 
    "Turma C": "LRC2025",
    "Turma D": "LRD2025",
    "Turma E": "LRE2025"
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!turma || !senha) {
      setError("Por favor, selecione uma turma e digite a senha.");
      setLoading(false);
      return;
    }

    const senhaCorreta = turmasSenhas[turma as keyof typeof turmasSenhas];
    
    if (senha === senhaCorreta) {
      // Salva a turma no localStorage para referência futura
      localStorage.setItem("alunoTurma", turma);
      navigate("/app");
    } else {
      setError("Turma ou senha inválida");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          {/* Logo oficial do App do Redator */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
              alt="App do Redator Logo" 
              className="h-20 w-20 mb-4" 
            />
          </div>

          <h1 className="text-3xl font-bold text-redator-primary mb-2">
            Acesso do Aluno
          </h1>
          
          <p className="text-redator-accent text-lg mb-6">
            Selecione sua turma e digite a senha
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="turma" className="text-redator-primary font-medium">
                  Turma
                </Label>
                <Select value={turma} onValueChange={setTurma}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione sua turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Turma A">Turma A</SelectItem>
                    <SelectItem value="Turma B">Turma B</SelectItem>
                    <SelectItem value="Turma C">Turma C</SelectItem>
                    <SelectItem value="Turma D">Turma D</SelectItem>
                    <SelectItem value="Turma E">Turma E</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-redator-primary font-medium">
                  Senha da turma
                </Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha da sua turma"
                  className="w-full"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white py-3"
                disabled={loading}
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                {loading ? "Verificando..." : "Acessar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/" 
                className="flex items-center justify-center gap-2 text-redator-accent hover:text-redator-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar à tela inicial
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlunoLogin;
