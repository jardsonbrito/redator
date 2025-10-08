import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  AlertTriangle,
  Download,
  Settings,
  ShieldCheck,
  Mail
} from "lucide-react";
import {
  BookOpen as PhosphorBookOpen,
  Star,
  PaperPlaneTilt,
  CalendarCheck,
  CheckSquare,
  Timer,
  Chalkboard,
  VideoCamera,
  PlayCircle,
  Books,
  PushPin,
  ChartPieSlice,
  Trophy,
  ChatCircle,
  UsersThree,
  MagnifyingGlass,
  GearSix,
  Export,
  Gear,
  Medal,
  FileText as PhosphorFileText,
  Video as PhosphorVideo,
  ClipboardCheck as PhosphorClipboardCheck,
  File as PhosphorFile,
  GraduationCap as PhosphorGraduationCap,
  NotebookPen as PhosphorNotebookPen,
  MessageSquare as PhosphorMessageSquare,
  Users as PhosphorUsers,
  UserCheck as PhosphorUserCheck,
  Presentation as PhosphorPresentation,
  Gamepad2 as PhosphorGamepad2,
  Award as PhosphorAward,
  Calendar as PhosphorCalendar
} from "phosphor-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DetailedDashboardCard } from "@/components/admin/DetailedDashboardCard";
import { getExerciseAvailability } from "@/utils/exerciseUtils";

// Import existing admin components with correct named imports
import { TemaForm } from "@/components/admin/TemaForm";
import { TemaList } from "@/components/admin/TemaList";
import { RedacaoForm } from "@/components/admin/RedacaoForm";
import { RedacaoList } from "@/components/admin/RedacaoList";
import { VideoFormModern as VideoForm } from "@/components/admin/VideoFormModern";
import { VideoList } from "@/components/admin/VideoList";
import { RedacaoEnviadaForm } from "@/components/admin/RedacaoEnviadaForm";

// Import simulado components
import { SimuladoForm } from "@/components/admin/SimuladoForm";
import SimuladoList from "@/components/admin/SimuladoList";
import RedacaoSimuladoList from "@/components/admin/RedacaoSimuladoList";

// Import biblioteca components
import { BibliotecaFormModern as BibliotecaForm } from "@/components/admin/BibliotecaFormModern";
import { BibliotecaList } from "@/components/admin/BibliotecaList";

// Import new components for Aulas and Exercicios
import { AulaFormModern as AulaForm } from "@/components/admin/AulaFormModern";
import { SimpleAulaList } from "@/components/admin/SimpleAulaList";
import { ExercicioForm } from "@/components/admin/ExercicioForm";
import { SimpleExercicioList } from "@/components/admin/SimpleExercicioList";
import { RedacaoExercicioList } from "@/components/admin/RedacaoExercicioList";

// Import avisos components
import { MuralFormModern as AvisoForm } from "@/components/admin/MuralFormModern";
import { AvisoList } from "@/components/admin/AvisoList";

// Import inbox components
import { InboxForm } from "@/components/admin/InboxForm";

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
import { AlunoFormModern } from "@/components/admin/AlunoFormModern";

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

// Import TOP 5 component
import { Top5Widget } from "@/components/shared/Top5Widget";

// Import diário components
import GestaoEtapas from "@/pages/admin/GestaoEtapas";
import RegistroAulas from "@/pages/admin/RegistroAulas";
import ResumoTurma from "@/pages/admin/ResumoTurma";
import AvaliacaoPresencial from "@/pages/admin/AvaliacaoPresencial";

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState("dashboard");
  const [refreshAvisos, setRefreshAvisos] = useState(false);
  const [showAvisosList, setShowAvisosList] = useState(false);
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

      const temasPublicados = temas?.filter(t => !t.scheduled_publish_at || new Date(t.scheduled_publish_at) <= hoje).length || 0;
      const temasAgendados = temas?.filter(t => t.scheduled_publish_at && new Date(t.scheduled_publish_at) > hoje).length || 0;


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


      // Buscar especificamente as 3 redações mencionadas
      const { data: redacoesEspecificas, error: especificasError } = await supabase
        .from('redacoes_enviadas')
        .select('id, status, corretor_id_1, nome_aluno, email_aluno, corrigida, data_envio')
        .or('nome_aluno.ilike.%lara%,nome_aluno.ilike.%kauani%,nome_aluno.ilike.%anne%,nome_aluno.ilike.%isabele%,nome_aluno.ilike.%renam%');


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


      const aguardando = redacoesAguardando.length;

      // Buscar nomes dos corretores separadamente para evitar problemas de join
      const corretoresIds = [...new Set(redacoesAguardando.map(r => r.corretor_id_1).filter(Boolean))];
      const { data: corretoresRedacoes } = await supabase
        .from('corretores')
        .select('id, nome')
        .in('id', corretoresIds);

      // Agrupar apenas por corretores ATRIBUÍDOS (ignorar não atribuídas)
      const redacoesAtribuidas = redacoesAguardando.filter(r => r.corretor_id_1);
      const porCorretor = redacoesAtribuidas.reduce((acc: Record<string, number>, r: any) => {
        const corretor = corretoresRedacoes?.find(c => c.id === r.corretor_id_1);
        if (corretor?.nome) {
          acc[corretor.nome] = (acc[corretor.nome] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const corretorInfo = Object.keys(porCorretor).length > 0
        ? Object.entries(porCorretor).map(([nome, count]) => `${nome}: ${count}`).join(', ')
        : undefined;

      data["redacoes-enviadas"] = {
        info: `${aguardando} aguardando`,
        badge: corretorInfo, // Só mostra se houver redações atribuídas a corretores
        badgeVariant: aguardando > 0 ? "destructive" : undefined
      };

      // Exercícios - quantos disponíveis (usando função de disponibilidade oficial)
      const { data: exercicios } = await supabase
        .from('exercicios')
        .select('*')
        .eq('ativo', true);

      // Filtrar apenas exercícios que estão realmente disponíveis
      const exerciciosDisponiveis = exercicios?.filter(e => {
        const availability = getExerciseAvailability(e);
        return availability.status === 'disponivel';
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

      // Lousa - quantas disponíveis (considerando período de disponibilidade)
      const { data: lousas } = await supabase
        .from('lousa')
        .select('*')
        .eq('ativo', true);

      const lousasDisponiveis = lousas?.filter(l => {
        const dataInicio = l.inicio_em ? new Date(l.inicio_em) : null;
        const dataTermino = l.fim_em ? new Date(l.fim_em) : null;

        // Deve estar ativa
        if (!l.ativo) return false;

        // Se tem data de início, deve ter começado
        if (dataInicio && hoje < dataInicio) return false;

        // Se tem data de fim, não deve ter terminado
        if (dataTermino && hoje > dataTermino) return false;

        // Está no período válido para receber respostas
        return true;
      }).length || 0;

      data.lousa = {
        info: `${lousasDisponiveis} disponíveis`,
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

      // Biblioteca - materiais publicados
      const { data: bibliotecaItems } = await supabase
        .from('biblioteca_materiais')
        .select('id, status')
        .eq('status', 'publicado');

      const materiaisPublicados = bibliotecaItems?.length || 0;

      data.biblioteca = {
        info: `${materiaisPublicados} ${materiaisPublicados === 1 ? 'material publicado' : 'materiais publicados'}`,
        badge: undefined
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

      // Inbox - resumo de status das mensagens
      const { data: mensagensInbox } = await supabase
        .from('inbox_messages' as any)
        .select('*');

      const mensagensAtivas = mensagensInbox?.length || 0;

      // Buscar status agregado dos recipients
      const { data: recipients } = await supabase
        .from('inbox_recipients' as any)
        .select('status');

      const pendentes = recipients?.filter((r: any) => r.status === 'pendente').length || 0;
      const lidas = recipients?.filter((r: any) => r.status === 'lida').length || 0;
      const respondidas = recipients?.filter((r: any) => r.status === 'respondida').length || 0;

      // Montar badge com resumo de status
      const statusBadge = pendentes > 0 || lidas > 0 || respondidas > 0
        ? `${pendentes} pendentes • ${lidas} lidas • ${respondidas} respondidas`
        : undefined;

      data.inbox = {
        info: `${mensagensAtivas} mensagens`,
        badge: statusBadge
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

      // Diário Online - adicionar informação básica
      data.diario = {
        info: "Sistema ativo",
        badge: undefined
      };

      // Corretores - apenas quantidade disponível
      const { data: corretores } = await supabase
        .from('corretores')
        .select('id, ativo, visivel_no_formulario')
        .eq('ativo', true);

      const corretoresDisponiveis = corretores?.filter(c => c.visivel_no_formulario).length || 0;

      data.corretores = {
        info: `${corretoresDisponiveis} ${corretoresDisponiveis === 1 ? 'corretor disponível' : 'corretores disponíveis'}`,
        badge: undefined
      };

      // Ajuda Rápida - mensagens pendentes de resposta
      const { data: mensagensPendentes } = await supabase
        .from('ajuda_rapida')
        .select('id, respondida')
        .eq('respondida', false);

      const totalPendentes = mensagensPendentes?.length || 0;

      data["ajuda-rapida"] = {
        info: totalPendentes > 0
          ? `${totalPendentes} ${totalPendentes === 1 ? 'mensagem pendente' : 'mensagens pendentes'}`
          : "Todas respondidas",
        badge: undefined
      };

      // Gamificação - quantos jogos estão publicados
      const { data: jogos } = await supabase
        .from('games')
        .select('id, status')
        .eq('status', 'published');

      const jogosPublicados = jogos?.length || 0;

      data.gamificacao = {
        info: `${jogosPublicados} ${jogosPublicados === 1 ? 'jogo publicado' : 'jogos publicados'}`,
        badge: undefined
      };

      // Cards limpos - apenas título, sem informações adicionais
      const cardsLimpos = [
        "radar", "professores", "administradores", "exportacao", "top5", "configuracoes"
      ];

      cardsLimpos.forEach(cardId => {
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
        "lousa", "salas-virtuais", "aulas", "videos", "biblioteca", "avisos", "inbox",
        "radar", "gamificacao", "ajuda-rapida", "alunos", "corretores",
        "professores", "administradores", "exportacao", "configuracoes", "top5"
      ];

      // Cards que devem permanecer limpos mesmo em caso de erro
      const cardsLimpos = ["radar", "professores", "administradores", "exportacao", "top5", "configuracoes"];

      allCards.forEach(cardId => {
        defaultData[cardId] = {
          info: cardsLimpos.includes(cardId) ? "" : "Erro ao carregar",
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
    { id: "temas", label: "Temas", icon: PhosphorBookOpen, iconColor: "#FF6B35" },
    { id: "redacoes", label: "Redações Exemplares", icon: Star, iconColor: "#FFD700" },
    { id: "redacoes-enviadas", label: "Redações Enviadas", icon: PaperPlaneTilt, iconColor: "#4CAF50" },

    // Linha 2: Atividades e Avaliações
    { id: "diario", label: "Diário Online", icon: CalendarCheck, iconColor: "#2196F3", chips: ["Etapas", "Aulas", "Turma", "Avaliação"] },
    { id: "exercicios", label: "Exercícios", icon: CheckSquare, iconColor: "#9C27B0" },
    { id: "simulados", label: "Simulados", icon: Timer, iconColor: "#FF5722" },

    // Linha 3: Ferramentas de Ensino
    { id: "lousa", label: "Lousa", icon: Chalkboard, iconColor: "#795548" },
    { id: "salas-virtuais", label: "Aulas ao Vivo", icon: VideoCamera, iconColor: "#E91E63" },
    { id: "aulas", label: "Aulas Gravadas", icon: PlayCircle, iconColor: "#FF9800" },

    // Linha 4: Recursos e Comunicação
    { id: "videos", label: "Videoteca", icon: VideoCamera, iconColor: "#FF4444" },
    { id: "biblioteca", label: "Biblioteca", icon: Books, iconColor: "#607D8B" },
    { id: "avisos", label: "Mural de Avisos", icon: PushPin, iconColor: "#FFC107" },

    // Linha 5: Comunicação e Notificações
    { id: "inbox", label: "Inbox", icon: Mail, iconColor: "#FF9800" },

    // Linha 6: Análise e Engajamento
    { id: "radar", label: "Radar", icon: ChartPieSlice, iconColor: "#3F51B5" },
    { id: "gamificacao", label: "Gamificação", icon: Trophy, iconColor: "#FFD700" },
    { id: "ajuda-rapida", label: "Ajuda Rápida", icon: ChatCircle, iconColor: "#00BCD4" },

    // Linha 7: Gestão de Usuários
    { id: "alunos", label: "Alunos", icon: UsersThree, iconColor: "#4CAF50" },
    { id: "corretores", label: "Corretores", icon: MagnifyingGlass, iconColor: "#FF5722" },
    { id: "professores", label: "Professores", icon: GearSix, iconColor: "#9C27B0" },

    // Linha 8: Administração Avançada
    { id: "administradores", label: "Administradores", icon: ShieldCheck, iconColor: "#9E9E9E" },
    { id: "exportacao", label: "Exportação", icon: Export, iconColor: "#607D8B" },
    { id: "configuracoes", label: "Configurações", icon: Gear, iconColor: "#795548", chips: ["Conta", "Envios", "Créditos", "Assinatura"] },

    // Linha 9: Motivacional
    { id: "top5", label: "TOP 5", icon: Medal, iconColor: "#FFD700" }
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




  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    console.log('🔐 Iniciando logout do admin...');
    try {
      await supabase.auth.signOut();
      console.log('✅ Supabase auth signOut completo');
      signOut();
      console.log('✅ Context signOut completo');
      navigate('/login', { replace: true });
      console.log('✅ Navegação para /login completa');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    }
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
              <BibliotecaForm mode="create" />
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
              <ExercicioForm mode="create" />
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
          setShowAvisosList(false);
        };

        const handleCancelEdit = () => {
          setAvisoEditando(null);
          setShowAvisosList(false);
        };

        const handleViewAvisosList = () => {
          setShowAvisosList(true);
        };

        return (
          <div>
            {!showAvisosList ? (
              <AvisoForm
                mode={avisoEditando ? 'edit' : 'create'}
                initialValues={avisoEditando}
                onSuccess={handleAvisoSuccess}
                onCancel={handleCancelEdit}
                onViewList={handleViewAvisosList}
                showViewList={true}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowAvisosList(false)}
                    className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors text-white bg-[#662F96] hover:bg-[#3F0077]"
                  >
                    Novo Aviso
                  </button>
                  <span className="text-white bg-[#B175FF] px-4 py-2 rounded-full text-sm font-medium">Avisos</span>
                </div>

                <AvisoList
                  refresh={refreshAvisos}
                  onEdit={handleEditAviso}
                />
              </div>
            )}
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

      case "inbox":
        return <InboxForm />;

      case "alunos":
        const handleAlunoSuccess = () => {
          setRefreshAlunos(!refreshAlunos);
          setAlunoEditando(null);
        };

        const handleEditAluno = (aluno: any) => {
          setAlunoEditando(aluno);
        };

        const handleCancelAlunoEdit = () => {
          setAlunoEditando(null);
        };

        return (
          <AlunoFormModern
            onSuccess={handleAlunoSuccess}
            alunoEditando={alunoEditando}
            onCancelEdit={handleCancelAlunoEdit}
            refresh={refreshAlunos}
            onEdit={handleEditAluno}
          />
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
      
      case "diario":
        const subtab = searchParams.get('subtab');

        if (subtab === 'etapas') {
          return <GestaoEtapas />;
        }

        if (subtab === 'aulas') {
          return <RegistroAulas />;
        }

        if (subtab === 'turma') {
          return <ResumoTurma />;
        }

        if (subtab === 'avaliação') {
          return <AvaliacaoPresencial />;
        }

        // Default: mostrar primeira aba se não especificado
        return <GestaoEtapas />;

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {menuItems.map((item, index) => {



              // Cards normais para os outros itens
              return (
                <DetailedDashboardCard
                  key={item.id}
                  title={item.label}
                  icon={<item.icon size={32} color={item.iconColor} weight="fill" />}
                  primaryInfo={isLoadingCards ? "Carregando..." : (cardData[item.id]?.info || "")}
                  secondaryInfo={cardData[item.id]?.badge}
                  description=""
                  chips={item.chips}
                  chipColor={item.iconColor}
                  onClick={() => setActiveView(item.id)}
                  onChipClick={(chipIndex, chipValue) => {
                    // Handle Diário Online chips
                    if (item.id === "diario") {
                      const subtabMap: Record<string, string> = {
                        "Etapas": "etapas",
                        "Aulas": "aulas",
                        "Turma": "turma",
                        "Avaliação": "avaliação"
                      };
                      const subtab = subtabMap[chipValue];
                      if (subtab) {
                        setActiveView("diario");
                        const newParams = new URLSearchParams();
                        newParams.set('view', 'diario');
                        newParams.set('subtab', subtab);
                        navigate(`?${newParams.toString()}`);
                      }
                    }
                    // Handle Configurações chips
                    else if (item.id === "configuracoes") {
                      const subtabMap: Record<string, string> = {
                        "Conta": "account",
                        "Envios": "submissions",
                        "Créditos": "credits",
                        "Assinatura": "subscriptions"
                      };
                      const subtab = subtabMap[chipValue];
                      if (subtab) {
                        setActiveView("configuracoes");
                        const newParams = new URLSearchParams();
                        newParams.set('view', 'configuracoes');
                        newParams.set('subtab', subtab);
                        navigate(`?${newParams.toString()}`);
                      }
                    }
                  }}
                />
              );
            })}
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
