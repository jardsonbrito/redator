import { useState, useEffect } from "react";
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
  NotebookPen,
  MessageSquare,
  Radar,
  Users,
  UserCheck,
  AlertTriangle
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

// Import avisos components
import { AvisoForm } from "@/components/admin/AvisoForm";
import { AvisoList } from "@/components/admin/AvisoList";

// Import radar components
import { RadarUpload } from "@/components/admin/RadarUpload";
import { RadarList } from "@/components/admin/RadarList";
import { RadarRedacoes } from "@/components/admin/RadarRedacoes";
import { AulaVirtualForm } from "@/components/admin/AulaVirtualForm";
import { AulaVirtualList } from "@/components/admin/AulaVirtualList";
import { AulaVirtualEditForm } from "@/components/admin/AulaVirtualEditForm";
import { FrequenciaAulas } from "@/components/admin/FrequenciaAulas";

// Import aluno components
import { AlunoForm } from "@/components/admin/AlunoForm";
import { AlunoList } from "@/components/admin/AlunoList";

// Import corretor components
import { CorretorForm } from "@/components/admin/CorretorForm";
import { CorretorList } from "@/components/admin/CorretorList";

// Import componentes de aprovação de alunos
import { AlunosAprovacaoPopup } from "@/components/admin/AlunosAprovacaoPopup";
import { useAlunosPendentes } from "@/hooks/useAlunosPendentes";

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [refreshAvisos, setRefreshAvisos] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState(null);
  const [aulaEditando, setAulaEditando] = useState(null);
  const [refreshAlunos, setRefreshAlunos] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [refreshCorretores, setRefreshCorretores] = useState(false);
  const [corretorEditando, setCorretorEditando] = useState(null);
  
  // Hook para gerenciar alunos pendentes
  const { temAlunosPendentes, verificarAlunosPendentes, resetarVerificacao } = useAlunosPendentes();
  const [mostrarPopupAprovacao, setMostrarPopupAprovacao] = useState(false);

  // Mostrar popup automaticamente quando há alunos pendentes
  useEffect(() => {
    if (temAlunosPendentes && !mostrarPopupAprovacao) {
      setMostrarPopupAprovacao(true);
    }
  }, [temAlunosPendentes, mostrarPopupAprovacao]);

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
    { id: "redacoes-enviadas", label: "Redações Enviadas", icon: Send },
    { id: "simulados", label: "Simulados", icon: ClipboardCheck },
    { id: "exercicios", label: "Exercícios", icon: NotebookPen },
    { id: "salas-virtuais", label: "Salas Virtuais", icon: Video },
    { id: "aulas", label: "Aulas", icon: GraduationCap },
    { id: "avisos", label: "Mural de Avisos", icon: MessageSquare },
    { id: "videos", label: "Vídeos", icon: Video },
    { id: "biblioteca", label: "Biblioteca", icon: File },
    { id: "radar", label: "Radar", icon: Radar },
    { id: "cadastro-alunos", label: "Cadastro de Alunos", icon: Users },
    { id: "corretores", label: "Corretores", icon: UserCheck },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "corretores":
        const handleCorretorSuccess = () => {
          setRefreshCorretores(!refreshCorretores);
          setCorretorEditando(null);
        };

        const handleEditCorretor = (corretor: any) => {
          setCorretorEditando(corretor);
        };

        const handleCancelCorretorEdit = () => {
          setCorretorEditando(null);
        };

        return (
          <div className="space-y-6">
            <CorretorForm 
              onSuccess={handleCorretorSuccess}
              corretorEditando={corretorEditando}
              onCancelEdit={handleCancelCorretorEdit}
            />
            <CorretorList 
              refresh={refreshCorretores}
              onEdit={handleEditCorretor}
            />
          </div>
        );

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Exercícios</TabsTrigger>
              <TabsTrigger value="create">Criar Exercício</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <SimpleExercicioList />
            </TabsContent>
            <TabsContent value="create">
              <ExercicioForm />
            </TabsContent>
          </Tabs>
        );

      case "avisos":
        const handleAvisoSuccess = () => {
          setRefreshAvisos(!refreshAvisos);
        };

        const handleEditAviso = (aviso: any) => {
          setAvisoEditando(aviso);
        };

        const handleCancelEdit = () => {
          setAvisoEditando(null);
        };

        return (
          <div className="space-y-6">
            <AvisoForm 
              onSuccess={handleAvisoSuccess}
              avisoEditando={avisoEditando}
              onCancelEdit={handleCancelEdit}
            />
            <AvisoList 
              refresh={refreshAvisos}
              onEdit={handleEditAviso}
            />
          </div>
        );

      case "salas-virtuais":
        const handleAulaSuccess = () => {
          setAulaEditando(null);
        };

        const handleEditAula = (aula: any) => {
          setAulaEditando(aula);
        };

        const handleCancelAulaEdit = () => {
          setAulaEditando(null);
        };

        if (aulaEditando) {
          return (
            <AulaVirtualEditForm 
              aula={aulaEditando}
              onSuccess={handleAulaSuccess}
              onCancel={handleCancelAulaEdit}
            />
          );
        }

        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Listar Salas</TabsTrigger>
              <TabsTrigger value="create">Criar Sala</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <AulaVirtualList onEdit={handleEditAula} />
            </TabsContent>
            <TabsContent value="create">
              <AulaVirtualForm onSuccess={() => {}} />
            </TabsContent>
          </Tabs>
        );

      case "radar":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Painel de Resultados - Radar</h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe aqui o desempenho geral dos alunos nos exercícios e redações corrigidas.
              </p>
            </div>
            <Tabs defaultValue="exercicios" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="exercicios">Dados de Exercícios</TabsTrigger>
                <TabsTrigger value="redacoes">Redações Corrigidas</TabsTrigger>
                <TabsTrigger value="frequencia">Frequência</TabsTrigger>
              </TabsList>
              <TabsContent value="exercicios" className="space-y-6">
                <RadarUpload />
                <RadarList />
              </TabsContent>
              <TabsContent value="redacoes">
                <RadarRedacoes />
              </TabsContent>
              <TabsContent value="frequencia">
                <FrequenciaAulas />
              </TabsContent>
            </Tabs>
          </div>
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

      case "cadastro-alunos":
        const handleAlunoSuccess = () => {
          console.log("Admin - handleAlunoSuccess chamado");
          setRefreshAlunos(!refreshAlunos);
          setAlunoEditando(null);
        };

        const handleEditAluno = (aluno: any) => {
          console.log("Admin - handleEditAluno chamado com:", aluno);
          console.log("Admin - Definindo alunoEditando para:", {
            id: aluno.id,
            nome: aluno.nome,
            email: aluno.email,
            turma: aluno.turma
          });
          setAlunoEditando(aluno);
        };

        const handleCancelAlunoEdit = () => {
          console.log("Admin - handleCancelAlunoEdit chamado");
          setAlunoEditando(null);
        };

        return (
          <div className="space-y-6">
            <AlunoForm 
              onSuccess={handleAlunoSuccess}
              alunoEditando={alunoEditando}
              onCancelEdit={handleCancelAlunoEdit}
            />
            <AlunoList 
              refresh={refreshAlunos}
              onEdit={handleEditAluno}
            />
          </div>
        );
      
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {menuItems.map((item) => (
              <Card 
                key={item.id} 
                className="group cursor-pointer bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border border-primary/10 hover:border-primary/20 rounded-2xl overflow-hidden" 
                onClick={() => setActiveView(item.id)}
              >
                <CardHeader className="p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                      <item.icon className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-primary group-hover:text-accent transition-colors duration-300">
                      {item.label}
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        );
    }
  };

  const handleFecharPopupAprovacao = () => {
    setMostrarPopupAprovacao(false);
  };

  const handleAlunosProcessados = () => {
    resetarVerificacao();
    verificarAlunosPendentes(); // Recarregar para verificar se ainda há pendentes
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/app" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-all duration-300 text-primary hover:text-primary font-medium">
                <Home className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Painel Administrativo
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-secondary/20 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-primary">Olá, {user.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-primary/20 hover:bg-primary hover:text-white transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {activeView !== "dashboard" && (
        <nav className="bg-white/80 backdrop-blur-sm border-b border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveView("dashboard")}
                className="hover:bg-primary/10 text-primary"
              >
                Dashboard
              </Button>
              <span className="text-primary/40">/</span>
              <span className="text-primary font-semibold">
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

      {/* Pop-up de aprovação de alunos */}
      <AlunosAprovacaoPopup
        isOpen={mostrarPopupAprovacao}
        onClose={handleFecharPopupAprovacao}
        onAlunosProcessados={handleAlunosProcessados}
      />
    </div>
  );
};

export default Admin;
