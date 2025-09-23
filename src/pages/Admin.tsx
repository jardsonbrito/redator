import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
  File,
  GraduationCap,
  NotebookPen,
  MessageSquare,
  Radar,
  Users,
  UserCheck,
  AlertTriangle,
  Download,
  Settings,
  ShieldCheck,
  Presentation,
  Gamepad2,
  Award,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Import existing admin components with correct named imports
import { TemaForm } from "@/components/admin/TemaForm";
import { TemaList } from "@/components/admin/TemaList";
import { TemaCSVImport } from "@/components/admin/TemaCSVImport";
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
import { BibliotecaList } from "@/components/admin/BibliotecaList";

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
import { MonitoramentoPage } from "@/components/admin/MonitoramentoPage";
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

// Import professor components
import { ProfessorForm } from "@/components/admin/ProfessorForm";
import { ProfessorList } from "@/components/admin/ProfessorList";

// Import lousa components
import LousaForm from "@/components/admin/LousaForm";
import LousaList from "@/components/admin/LousaList";

// Import componentes de aprovação de alunos
import { AlunosAprovacaoPopup } from "@/components/admin/AlunosAprovacaoPopup";
import { useAlunosPendentes } from "@/hooks/useAlunosPendentes";

// Import configurações admin
import { AdminConfigForm } from "@/components/admin/AdminConfigForm";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminList } from "@/components/admin/AdminList";

// Import avatar component
import { AdminAvatar } from "@/components/admin/AdminAvatar";

// Import new modern components
import { ModernAdminHeader } from "@/components/admin/ModernAdminHeader";
import { ModernAdminCard } from "@/components/admin/ModernAdminCard";

// Import TOP 5 component
import { Top5Widget } from "@/components/shared/Top5Widget";

// Import diário components
import GestaoEtapas from "@/pages/admin/GestaoEtapas";
import RegistroAulas from "@/pages/admin/RegistroAulas";
import ResumoTurma from "@/pages/admin/ResumoTurma";

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState("dashboard");
  const [refreshAvisos, setRefreshAvisos] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState(null);
  const [aulaEditando, setAulaEditando] = useState(null);
  const [refreshAlunos, setRefreshAlunos] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [refreshCorretores, setRefreshCorretores] = useState(false);
  const [corretorEditando, setCorretorEditando] = useState(null);
  const [refreshProfessores, setRefreshProfessores] = useState(false);
  const [professorEditando, setProfessorEditando] = useState(null);
  
  // Hook para gerenciar alunos pendentes
  const { temAlunosPendentes, verificarAlunosPendentes, resetarVerificacao } = useAlunosPendentes();
  const [mostrarPopupAprovacao, setMostrarPopupAprovacao] = useState(false);

  // Estados para dados dos cards
  const [cardData, setCardData] = useState<Record<string, { info: string; badge?: string; badgeVariant?: "default" | "secondary" | "destructive" | "outline" }>>({});

  // Definir menuItems seguindo ordem pedagógica (desktop: 3 colunas, celular: 1 coluna)
  const menuItems = [
    // Linha 1: Conteúdo Pedagógico Principal
    { id: "temas", label: "Temas", icon: BookOpen },
    { id: "redacoes", label: "Redações Exemplares", icon: FileText },
    { id: "redacoes-enviadas", label: "Redações Enviadas", icon: Send },

    // Linha 2: Atividades e Avaliações
    { id: "diario", label: "Diário Online", icon: Calendar },
    { id: "exercicios", label: "Exercícios", icon: NotebookPen },
    { id: "simulados", label: "Simulados", icon: ClipboardCheck },

    // Linha 3: Ferramentas de Ensino
    { id: "lousa", label: "Lousa", icon: Presentation },
    { id: "salas-virtuais", label: "Aula ao Vivo", icon: Video },
    { id: "aulas", label: "Aulas Gravadas", icon: GraduationCap },

    // Linha 4: Recursos e Comunicação
    { id: "videos", label: "Videoteca", icon: Video },
    { id: "biblioteca", label: "Biblioteca", icon: File },
    { id: "avisos", label: "Mural de Avisos", icon: MessageSquare },

    // Linha 5: Análise e Engajamento
    { id: "radar", label: "Radar", icon: Radar },
    { id: "gamificacao", label: "Gamificação", icon: Gamepad2 },
    { id: "ajuda-rapida", label: "Ajuda Rápida", icon: MessageSquare },

    // Linha 6: Gestão de Usuários
    { id: "alunos", label: "Alunos", icon: Users },
    { id: "corretores", label: "Corretores", icon: UserCheck },
    { id: "professores", label: "Professores", icon: GraduationCap },

    // Linha 7: Administração Avançada
    { id: "administradores", label: "Administradores", icon: ShieldCheck },
    { id: "exportacao", label: "Exportação", icon: Download },
    { id: "configuracoes", label: "Configurações", icon: Settings },

    // Linha 8: Motivacional
    { id: "top5", label: "TOP 5", icon: Award }
  ];

  // Verificar parâmetros de query string para definir view inicial
  useEffect(() => {
    const view = searchParams.get('view');
    if (view && menuItems.some(item => item.id === view)) {
      setActiveView(view);
    }
  }, [searchParams, menuItems]);

  // Mostrar popup automaticamente quando há alunos pendentes
  useEffect(() => {
    if (temAlunosPendentes && !mostrarPopupAprovacao) {
      setMostrarPopupAprovacao(true);
    }
  }, [temAlunosPendentes, mostrarPopupAprovacao]);

  // Carregar dados dos cards
  useEffect(() => {
    loadCardData();
  }, []);

  const loadCardData = async () => {
    try {
      const data: Record<string, { info: string; badge?: string; badgeVariant?: "default" | "secondary" | "destructive" | "outline" }> = {};

      // Temas
      const { data: temas } = await supabase
        .from('temas')
        .select('*');

      const totalTemas = temas?.length || 0;
      data.temas = {
        info: `${totalTemas} disponíveis`,
        badge: undefined
      };

      // Redações Exemplares - tabela 'redacoes' (todas são publicadas)
      const { data: redacoes } = await supabase
        .from('redacoes')
        .select('id');

      const totalRedacoes = redacoes?.length || 0;
      data.redacoes = {
        info: `${totalRedacoes} disponíveis`,
        badge: undefined
      };

      // Redações Enviadas
      const { data: redacoesEnviadas } = await supabase
        .from('redacoes_enviadas')
        .select('status, corretor_id, corretores(nome)')
        .eq('status', 'enviada');

      const pendentes = redacoesEnviadas?.length || 0;
      data["redacoes-enviadas"] = {
        info: `${pendentes} pendentes`,
        badge: pendentes > 0 ? "Correção" : undefined,
        badgeVariant: pendentes > 0 ? "destructive" : undefined
      };

      // Alunos
      const { data: alunos } = await supabase
        .from('profiles')
        .select('ativo')
        .eq('user_type', 'aluno');

      const alunosAtivos = alunos?.filter(a => a.ativo).length || 0;
      const alunosInativos = alunos?.filter(a => !a.ativo).length || 0;
      data.alunos = {
        info: `${alunosAtivos} ativos`,
        badge: alunosInativos > 0 ? `${alunosInativos} inativos` : undefined,
        badgeVariant: "outline"
      };

      // Corretores
      const { data: corretores } = await supabase
        .from('corretores')
        .select('ativo');

      const corretoresAtivos = corretores?.filter(c => c.ativo).length || 0;
      const corretoresInativos = corretores?.filter(c => !c.ativo).length || 0;
      data.corretores = {
        info: `${corretoresAtivos} disponíveis`,
        badge: corretoresInativos > 0 ? `${corretoresInativos} indisponíveis` : undefined,
        badgeVariant: "outline"
      };

      // Ajuda Rápida
      const { data: ajudaRapida } = await supabase
        .from('ajuda_rapida')
        .select('respondida')
        .eq('respondida', false);

      const naoRespondidas = ajudaRapida?.length || 0;
      data["ajuda-rapida"] = {
        info: naoRespondidas > 0 ? `${naoRespondidas} não respondidas` : "Todas respondidas",
        badge: naoRespondidas > 0 ? "Pendente" : undefined,
        badgeVariant: naoRespondidas > 0 ? "destructive" : undefined
      };

      // Biblioteca - verificar materiais da biblioteca
      const { data: biblioteca } = await supabase
        .from('biblioteca_materiais')
        .select('status')
        .eq('status', 'publicado');

      const totalBiblioteca = biblioteca?.length || 0;
      data.biblioteca = {
        info: `${totalBiblioteca} materiais`,
        badge: undefined
      };

      // Vídeos - verificar vídeos da videoteca
      const { data: videos } = await supabase
        .from('videos')
        .select('id');

      const totalVideos = videos?.length || 0;
      data.videos = {
        info: `${totalVideos} vídeos`,
        badge: undefined
      };

      // Aulas gravadas
      const { data: aulas } = await supabase
        .from('aulas')
        .select('id');

      const totalAulas = aulas?.length || 0;
      data.aulas = {
        info: `${totalAulas} aulas`,
        badge: undefined
      };

      // Exercícios
      const { data: exercicios } = await supabase
        .from('exercicios')
        .select('id');

      const totalExercicios = exercicios?.length || 0;
      data.exercicios = {
        info: `${totalExercicios} exercícios`,
        badge: undefined
      };

      // Simulados
      const { data: simulados } = await supabase
        .from('simulados')
        .select('id');

      const totalSimulados = simulados?.length || 0;
      data.simulados = {
        info: `${totalSimulados} simulados`,
        badge: undefined
      };

      // Avisos ativos
      const { data: avisos } = await supabase
        .from('avisos')
        .select('id')
        .eq('ativo', true);

      const totalAvisos = avisos?.length || 0;
      data.avisos = {
        info: `${totalAvisos} ativos`,
        badge: undefined
      };

      // Cards sem dados específicos
      const defaultCards = [
        "diario", "lousa", "salas-virtuais", "radar", "gamificacao",
        "professores", "administradores", "exportacao", "configuracoes", "top5"
      ];

      defaultCards.forEach(cardId => {
        if (!data[cardId]) {
          data[cardId] = {
            info: "Sistema",
            badge: undefined
          };
        }
      });

      setCardData(data);
    } catch (error) {
      console.error('Erro ao carregar dados dos cards:', error);
    }
  };

  console.log('🔍 Admin component - User:', user?.email, 'IsAdmin:', isAdmin);

  if (!user || !isAdmin) {
    console.log('❌ Redirecionando para login - User:', !!user, 'IsAdmin:', isAdmin);
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate('/login', { replace: true });
  };


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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Listar Temas</TabsTrigger>
              <TabsTrigger value="create">Criar Tema</TabsTrigger>
              <TabsTrigger value="import">Importar CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <TemaList />
            </TabsContent>
            <TabsContent value="create">
              <TemaForm />
            </TabsContent>
            <TabsContent value="import">
              <TemaCSVImport />
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
              <VideoForm mode="create" />
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

      case "diario":
        return (
          <Tabs defaultValue="etapas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="etapas" className="flex items-center gap-1 sm:gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Gestão de Etapas</span>
                <span className="sm:hidden">Etapas</span>
              </TabsTrigger>
              <TabsTrigger value="aulas" className="flex items-center gap-1 sm:gap-2">
                <NotebookPen className="w-4 h-4" />
                <span className="hidden sm:inline">Registro de Aulas</span>
                <span className="sm:hidden">Aulas</span>
              </TabsTrigger>
              <TabsTrigger value="resumo" className="flex items-center gap-1 sm:gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Resumo da Turma</span>
                <span className="sm:hidden">Resumo</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="etapas" className="space-y-6">
              <GestaoEtapas />
            </TabsContent>
            <TabsContent value="aulas" className="space-y-6">
              <RegistroAulas />
            </TabsContent>
            <TabsContent value="resumo" className="space-y-6">
              <ResumoTurma />
            </TabsContent>
          </Tabs>
        );

      case "lousa":
        return <LousaList />;

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
            <Tabs defaultValue="monitoramento" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
                <TabsTrigger value="exercicios">Dados de Exercícios</TabsTrigger>
                <TabsTrigger value="redacoes">Redações Corrigidas</TabsTrigger>
              </TabsList>
              <TabsContent value="monitoramento" className="space-y-6">
                <MonitoramentoPage />
              </TabsContent>
              <TabsContent value="exercicios" className="space-y-6">
                <RadarUpload />
                <RadarList />
              </TabsContent>
              <TabsContent value="redacoes">
                <RadarRedacoes />
              </TabsContent>
            </Tabs>
          </div>
        );
      
      case "redacoes-enviadas":
        return (
          <Tabs defaultValue="avulsas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="avulsas">Redações</TabsTrigger>
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

      case "alunos":
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

      case "professores":
        const handleProfessorSuccess = () => {
          setRefreshProfessores(!refreshProfessores);
          setProfessorEditando(null);
        };

        const handleEditProfessor = (professor: any) => {
          setProfessorEditando(professor);
        };

        const handleCancelProfessorEdit = () => {
          setProfessorEditando(null);
        };

        return (
          <div className="space-y-6">
            <ProfessorForm 
              onSuccess={handleProfessorSuccess}
              professorEditando={professorEditando}
              onCancelEdit={handleCancelProfessorEdit}
            />
            <ProfessorList 
              refresh={refreshProfessores}
              onEdit={handleEditProfessor}
            />
          </div>
        );

      case "ajuda-rapida":
        navigate('/admin/ajuda-rapida');
        return null;

      case "exportacao":
        navigate('/admin/exportacao');
        return null;

      case "configuracoes":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Configurações do Administrador</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie suas credenciais de acesso e configurações de segurança.
              </p>
            </div>
            <AdminConfigForm />
          </div>
        );
        
      case "administradores":
        return (
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Listar Administradores</TabsTrigger>
              <TabsTrigger value="create">Cadastrar Administrador</TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="space-y-4">
              <AdminList />
            </TabsContent>
            <TabsContent value="create" className="space-y-4">
              <AdminForm />
            </TabsContent>
          </Tabs>
        );

      case "gamificacao":
        navigate('/admin/gamificacao');
        return null;

      case "top5":
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">TOP 5 - Rankings</h3>
            <Top5Widget variant="admin" showHeader={false} />
          </div>
        );
      
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {menuItems.map((item, index) => (
              <ModernAdminCard
                key={item.id}
                id={item.id}
                title={item.label}
                info={cardData[item.id]?.info || "Carregando..."}
                badge={cardData[item.id]?.badge}
                badgeVariant={cardData[item.id]?.badgeVariant || "default"}
                icon={item.icon}
                onClick={setActiveView}
                colorIndex={index}
              />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <ModernAdminHeader
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Navigation */}
      {activeView !== "dashboard" && (
        <nav className="bg-white/80 backdrop-blur-sm border-b border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setActiveView("dashboard");
                  navigate('/admin', { replace: true });
                }}
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
