import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

  // Função para carregar dados dos cards
  const loadCardData = async () => {
    try {
      const data: Record<string, { info: string; badge?: string; badgeVariant?: "default" | "secondary" | "destructive" | "outline" }> = {};
      const hoje = new Date();

      // Temas - quantos publicados e quantos agendados
      const { data: temas } = await supabase
        .from('temas')
        .select('*');

      const temasPublicados = temas?.filter(t => !t.data_agendamento || new Date(t.data_agendamento) <= hoje).length || 0;
      const temasAgendados = temas?.filter(t => t.data_agendamento && new Date(t.data_agendamento) > hoje).length || 0;

      data.temas = {
        info: `${temasPublicados} publicados`,
        badge: temasAgendados > 0 ? `${temasAgendados} agendados` : undefined
      };

      // Redações Exemplares - quantas publicadas e quantas agendadas
      const { data: redacoes } = await supabase
        .from('redacoes')
        .select('*');

      const redacoesPublicadas = redacoes?.filter(r => !r.data_agendamento || new Date(r.data_agendamento) <= hoje).length || 0;
      const redacoesAgendadas = redacoes?.filter(r => r.data_agendamento && new Date(r.data_agendamento) > hoje).length || 0;

      data.redacoes = {
        info: `${redacoesPublicadas} publicadas`,
        badge: redacoesAgendadas > 0 ? `${redacoesAgendadas} agendadas` : undefined
      };

      // Redações Enviadas - testar query mais ampla primeiro
      const { data: todasRedacoes, error: todasError } = await supabase
        .from('redacoes_enviadas')
        .select('id, status, corretor_id_1, nome_aluno, email_aluno, corrigida')
        .order('data_envio', { ascending: false })
        .limit(10);

      console.log('🔍 Todas as redações (últimas 10):', { todasRedacoes, todasError });

      // Buscar especificamente as 3 redações mencionadas
      const { data: redacoesEspecificas, error: especificasError } = await supabase
        .from('redacoes_enviadas')
        .select('id, status, corretor_id_1, nome_aluno, email_aluno, corrigida, data_envio')
        .or('nome_aluno.ilike.%lara%,nome_aluno.ilike.%kauani%,nome_aluno.ilike.%anne%,nome_aluno.ilike.%isabele%,nome_aluno.ilike.%renam%');

      console.log('🔍 Redações dos 3 alunos mencionados:', { redacoesEspecificas, especificasError });

      // Query original com log detalhado
      const { data: redacoesEnviadas, error: redacoesError } = await supabase
        .from('redacoes_enviadas')
        .select('id, status, corretor_id_1, nome_aluno, email_aluno, corrigida')
        .eq('corrigida', false);

      console.log('🔍 Query redações NÃO corrigidas (todas):', {
        total: redacoesEnviadas?.length,
        redacoesEnviadas,
        redacoesError
      });

      // Filtrar apenas aguardando e em_correcao
      const redacoesAguardando = redacoesEnviadas?.filter(r =>
        r.status === 'aguardando' || r.status === 'em_correcao'
      ) || [];

      console.log('🔍 Redações aguardando/em_correção:', {
        quantidade: redacoesAguardando.length,
        redacoes: redacoesAguardando
      });

      const aguardando = redacoesAguardando.length;

      // Buscar nomes dos corretores separadamente para evitar problemas de join
      const corretoresIds = [...new Set(redacoesAguardando.map(r => r.corretor_id_1).filter(Boolean))];
      const { data: corretoresRedacoes } = await supabase
        .from('corretores')
        .select('id, nome')
        .in('id', corretoresIds);

      // Agrupar por corretor
      const porCorretor = redacoesAguardando.reduce((acc: Record<string, number>, r: any) => {
        const corretor = corretoresRedacoes?.find(c => c.id === r.corretor_id_1);
        const nome = corretor?.nome || 'Não atribuído';
        acc[nome] = (acc[nome] || 0) + 1;
        return acc;
      }, {}) || {};

      const corretorInfo = Object.keys(porCorretor).length > 0
        ? Object.entries(porCorretor).map(([nome, count]) => `${nome}: ${count}`).join(', ')
        : undefined;

      data["redacoes-enviadas"] = {
        info: `${aguardando} aguardando`,
        badge: corretorInfo,
        badgeVariant: aguardando > 0 ? "destructive" : undefined
      };

      // Exercícios - quantos publicados e disponíveis (considerando intervalo de datas)
      const { data: exercicios } = await supabase
        .from('exercicios')
        .select('*');

      const exerciciosDisponiveis = exercicios?.filter(e => {
        const dataInicio = e.data_inicio ? new Date(e.data_inicio) : null;
        const dataTermino = e.data_termino ? new Date(e.data_termino) : null;

        // Disponível se não tem data_inicio ou se está no período válido
        if (!dataInicio) return true;
        if (dataInicio > hoje) return false;
        if (dataTermino && dataTermino < hoje) return false;

        return true;
      }).length || 0;

      data.exercicios = {
        info: `${exerciciosDisponiveis} disponíveis`,
        badge: undefined
      };

      // Simulados - quantos agendados (futuros baseado na data_inicio)
      const { data: simulados } = await supabase
        .from('simulados')
        .select('*')
        .eq('ativo', true);

      const simuladosAgendados = simulados?.filter(s => {
        if (!s.data_inicio) return false;
        const dataInicio = new Date(s.data_inicio);
        return dataInicio > hoje;
      }).length || 0;

      data.simulados = {
        info: `${simuladosAgendados} agendados`,
        badge: undefined
      };

      // Lousa - quantas publicadas
      const { data: lousas } = await supabase
        .from('lousa')
        .select('*');

      const lousasPublicadas = lousas?.length || 0;

      data.lousa = {
        info: `${lousasPublicadas} publicadas`,
        badge: undefined
      };

      // Aula ao Vivo (salas-virtuais) - quantas agendadas
      const { data: aulasVirtuais } = await supabase
        .from('aulas_virtuais')
        .select('*');

      const aulasAgendadas = aulasVirtuais?.filter(a => {
        return a.data_aula && new Date(a.data_aula) > hoje;
      }).length || 0;

      data["salas-virtuais"] = {
        info: `${aulasAgendadas} agendadas`,
        badge: undefined
      };

      // Aulas Gravadas - quantas disponíveis
      const { data: aulas } = await supabase
        .from('aulas')
        .select('*');

      const aulasDisponiveis = aulas?.length || 0;

      data.aulas = {
        info: `${aulasDisponiveis} disponíveis`,
        badge: undefined
      };

      // Videos (Videoteca) - quantos publicados e agendados
      const { data: videos } = await supabase
        .from('videos')
        .select('*');

      const videosPublicados = videos?.filter(v => !v.data_agendamento || new Date(v.data_agendamento) <= hoje).length || 0;
      const videosAgendados = videos?.filter(v => v.data_agendamento && new Date(v.data_agendamento) > hoje).length || 0;

      data.videos = {
        info: `${videosPublicados} publicados`,
        badge: videosAgendados > 0 ? `${videosAgendados} agendados` : undefined
      };

      // Biblioteca - dividir entre vídeos e arquivos
      const { data: bibliotecaItems } = await supabase
        .from('biblioteca')
        .select('*');

      // Assumindo que há um campo 'tipo' ou podemos distinguir por extensão
      const bibliotecaVideos = bibliotecaItems?.filter(b => {
        // Se há campo tipo, usar ele. Caso contrário, verificar extensão
        if (b.tipo) return b.tipo === 'video';
        const ext = b.arquivo_url?.split('.').pop()?.toLowerCase();
        return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '');
      }) || [];

      const bibliotecaArquivos = bibliotecaItems?.filter(b => {
        // Se há campo tipo, usar ele. Caso contrário, verificar se não é vídeo
        if (b.tipo) return b.tipo !== 'video';
        const ext = b.arquivo_url?.split('.').pop()?.toLowerCase();
        return !['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '');
      }) || [];

      const videosPublicadosBib = bibliotecaVideos.filter(v => !v.data_agendamento || new Date(v.data_agendamento) <= hoje).length;
      const videosAgendadosBib = bibliotecaVideos.filter(v => v.data_agendamento && new Date(v.data_agendamento) > hoje).length;
      const arquivosDisponiveis = bibliotecaArquivos.length;

      // Para o card biblioteca, mostrar principalmente arquivos disponíveis
      data.biblioteca = {
        info: `${arquivosDisponiveis} disponíveis`,
        badge: videosPublicadosBib > 0 ? `${videosPublicadosBib} vídeos publicados` : undefined
      };

      // Mural de Avisos - quantos publicados
      const { data: avisos } = await supabase
        .from('avisos')
        .select('*');

      const avisosPublicados = avisos?.length || 0;

      data.avisos = {
        info: `${avisosPublicados} publicados`,
        badge: undefined
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
      const { data: dadosCorretores } = await supabase
        .from('corretores')
        .select('ativo');

      const corretoresAtivos = dadosCorretores?.filter(c => c.ativo).length || 0;
      const corretoresInativos = dadosCorretores?.filter(c => !c.ativo).length || 0;
      data.corretores = {
        info: `${corretoresAtivos} disponíveis`,
        badge: corretoresInativos > 0 ? `${corretoresInativos} indisponíveis` : undefined,
        badgeVariant: "outline"
      };

      // Diário Online - adicionar informação básica
      data.diario = {
        info: "Sistema ativo",
        badge: undefined
      };

      // Cards deixados em branco conforme solicitado
      const cardsVazios = [
        "radar", "professores", "administradores", "exportacao", "configuracoes", "top5", "gamificacao", "ajuda-rapida"
      ];

      cardsVazios.forEach(cardId => {
        data[cardId] = {
          info: "",
          badge: undefined
        };
      });

      return data;
    } catch (error) {
      console.error('Erro ao carregar dados dos cards:', error);

      // Em caso de erro, retornar dados padrão
      const defaultData: Record<string, { info: string; badge?: string; badgeVariant?: "default" | "secondary" | "destructive" | "outline" }> = {};
      const allCards = [
        "temas", "redacoes", "redacoes-enviadas", "diario", "exercicios", "simulados",
        "lousa", "salas-virtuais", "aulas", "videos", "biblioteca", "avisos",
        "radar", "gamificacao", "ajuda-rapida", "alunos", "corretores",
        "professores", "administradores", "exportacao", "configuracoes", "top5"
      ];

      allCards.forEach(cardId => {
        defaultData[cardId] = {
          info: "Erro ao carregar",
          badge: undefined
        };
      });

      return defaultData;
    }
  };

  // Cache dos dados dos cards com React Query
  const { data: cardData = {}, isLoading: isLoadingCards } = useQuery({
    queryKey: ['admin-dashboard-cards'],
    queryFn: loadCardData,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1
  });

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
                info={isLoadingCards ? "Carregando..." : (cardData[item.id]?.info || "Sem dados")}
                badge={isLoadingCards ? undefined : cardData[item.id]?.badge}
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
