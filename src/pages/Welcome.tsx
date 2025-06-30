
import { Card, CardContent } from "@/components/ui/card";
import { User, UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

const Welcome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
      <div className="w-full max-w-3xl px-4">
        <div className="text-center">
          {/* Logo oficial do App do Redator */}
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
              alt="App do Redator Logo" 
              className="h-24 w-24 sm:h-32 sm:w-32 mb-6" 
            />
          </div>

          {/* Nome do aplicativo */}
          <h1 className="text-4xl sm:text-5xl font-bold text-redator-primary mb-4">
            App do Redator
          </h1>

          {/* Slogan */}
          <p className="text-xl sm:text-2xl font-semibold text-redator-accent mb-12 px-4">
            Redação na prática, aprovação na certa!
          </p>

          {/* Botões de navegação - agora com 3 opções */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Botão Sou Aluno */}
            <Link to="/aluno-login" className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-redator-accent/20 hover:border-redator-primary/50">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-redator-primary hover:bg-redator-primary/90 transition-colors duration-300 mb-6 group-hover:scale-110">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-redator-primary mb-2">
                    Sou Aluno
                  </h3>
                  
                  <p className="text-redator-accent text-sm">
                    Acesse com sua turma e senha
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Botão Sou Visitante */}
            <Link to="/visitante-login" className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-redator-accent/20 hover:border-green-500/50">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 transition-colors duration-300 mb-6 group-hover:scale-110">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-redator-primary mb-2">
                    Sou Visitante
                  </h3>
                  
                  <p className="text-redator-accent text-sm">
                    Acesse com nome e e-mail
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Botão Sou Professor */}
            <Link to="/login" className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-redator-accent/20 hover:border-redator-secondary/50">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-redator-secondary hover:bg-redator-secondary/90 transition-colors duration-300 mb-6 group-hover:scale-110">
                    <UserCheck className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-redator-primary mb-2">
                    Sou Professor
                  </h3>
                  
                  <p className="text-redator-accent text-sm">
                    Acesse o painel administrativo
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
