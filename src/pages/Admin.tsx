
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  FileText, 
  Video,
  ClipboardCheck,
  Send,
  LogOut,
  Home,
  File,
  GraduationCap,
  NotebookPen
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Import existing admin components with correct named imports
import { TemaForm } from "@/components/admin/TemaForm";
import { TemaList } from "@/components/admin/TemaList";
import { RedacaoForm } from "@/components/admin/RedacaoForm";
import { RedacaoList } from "@/components/admin/RedacaoList";
import { VideoForm } from "@/components/admin/VideoForm";
import { VideoList } from "@/components/admin/VideoList";
import { RedacaoEnviadaForm } from "@/components/admin/RedacaoEnviadaForm";

// Import simulado components
import { SimuladoForm } from "@/components/admin/SimuladoForm";
import SimuladoList from "@/components/admin/SimuladoList";
import RedacaoSimuladoList from "@/components/admin/RedacaoSimuladoList";

// Import biblioteca components
import { BibliotecaForm } from "@/components/admin/BibliotecaForm";
import BibliotecaList from "@/components/admin/BibliotecaList";

// Import new components for Aulas and Exercicios
import { AulaForm } from "@/components/admin/AulaForm";
import { SimpleAulaList } from "@/components/admin/SimpleAulaList";
import { ExercicioForm } from "@/components/admin/ExercicioForm";
import { SimpleExercicioList } from "@/components/admin/SimpleExercicioList";
import { RedacaoExercicioList } from "@/components/admin/RedacaoExercicioList";

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");

  console.log('🔍 Admin component - User:', user?.email, 'IsAdmin:', isAdmin);

  if (!user || !isAdmin) {
    console.log('❌ Redirecionando para login - User:', !!user, 'IsAdmin:', isAdmin);
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
  };

  const menuItems = [
    { id: "temas", label: "Temas", icon: BookOpen },
    { id: "redacoes", label: "Redações", icon: FileText },
    { id: "videos", label: "Vídeos", icon: Video },
    { id: "biblioteca", label: "Biblioteca", icon: File },
    { id: "simulados", label: "Simulados", icon: ClipboardCheck },
    { id: "aulas", label: "Aulas", icon: GraduationCap },
    { id: "exercicios", label: "Exercícios", icon: NotebookPen },
    { id: "redacoes-enviadas", label: "Redações Enviadas", icon: Send },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "temas":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Temas</TabsTrigger>
              <TabsTrigger value="create">Criar Tema</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <TemaList />
            </TabsContent>
            <TabsContent value="create">
              <TemaForm />
            </TabsContent>
          </Tabs>
        );
      
      case "redacoes":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Redações</TabsTrigger>
              <TabsTrigger value="create">Criar Redação</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <RedacaoList />
            </TabsContent>
            <TabsContent value="create">
              <RedacaoForm />
            </TabsContent>
          </Tabs>
        );
      
      case "videos":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Vídeos</TabsTrigger>
              <TabsTrigger value="create">Criar Vídeo</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <VideoList />
            </TabsContent>
            <TabsContent value="create">
              <VideoForm />
            </TabsContent>
          </Tabs>
        );
      
      case "biblioteca":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Materiais</TabsTrigger>
              <TabsTrigger value="create">Cadastrar Material</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <BibliotecaList />
            </TabsContent>
            <TabsContent value="create">
              <BibliotecaForm />
            </TabsContent>
          </Tabs>
        );
      
      case "simulados":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Simulados</TabsTrigger>
              <TabsTrigger value="create">Criar Simulado</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <SimuladoList />
            </TabsContent>
            <TabsContent value="create">
              <SimuladoForm />
            </TabsContent>
          </Tabs>
        );

      case "aulas":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Aulas</TabsTrigger>
              <TabsTrigger value="create">Criar Aula</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <SimpleAulaList />
            </TabsContent>
            <TabsContent value="create">
              <AulaForm />
            </TabsContent>
          </Tabs>
        );

      case "exercicios":
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Listar Exercícios</TabsTrigger>
              <TabsTrigger value="create">Criar Exercício</TabsTrigger>
              <TabsTrigger value="redacoes">Redações</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <SimpleExercicioList />
            </TabsContent>
            <TabsContent value="create">
              <ExercicioForm />
            </TabsContent>
            <TabsContent value="redacoes">
              <RedacaoExercicioList />
            </TabsContent>
          </Tabs>
        );
      
      case "redacoes-enviadas":
        return (
          <Tabs defaultValue="avulsas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="avulsas">Redações Avulsas</TabsTrigger>
              <TabsTrigger value="simulados">Simulados</TabsTrigger>
            </TabsList>
            <TabsContent value="avulsas">
              <RedacaoEnviadaForm />
            </TabsContent>
            <TabsContent value="simulados">
              <RedacaoSimuladoList />
            </TabsContent>
          </Tabs>
        );
      
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView(item.id)}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <item.icon className="w-5 h-5 text-redator-primary" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Gerenciar {item.label.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
              <div className="w-px h-6 bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-redator-primary">Painel Administrativo</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Olá, {user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {activeView !== "dashboard" && (
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 py-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveView("dashboard")}>
                Dashboard
              </Button>
              <span className="text-gray-400">/</span>
              <span className="text-redator-primary font-medium">
                {menuItems.find(item => item.id === activeView)?.label}
              </span>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Admin;
