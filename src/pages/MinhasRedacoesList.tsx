import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, AlertCircle, X, AlertTriangle } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModalDevolucaoRedacao } from "@/components/ModalDevolucaoRedacao";
import { ModalRevisualizacaoRedacao } from "@/components/ModalRevisualizacaoRedacao";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { useVisualizacoesRealtime } from "@/hooks/useVisualizacoesRealtime";
import { useCancelRedacao } from "@/hooks/useCancelRedacao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Email validation será importada dinamicamente
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Tipo para representar uma redação com informações básicas compatível com RedacaoEnviadaCard
interface RedacaoTurma {
  id: string;
  frase_tematica: string;
  redacao_texto: string;
  redacao_manuscrita_url?: string | null;
  data_envio: string;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  nota_total?: number | null;
  comentario_admin?: string | null;
  corrigida: boolean;
  data_correcao?: string | null;
  nome_aluno: string;
  email_aluno: string;
  tipo_envio: string;
  status: string;
  turma: string;
  created_at?: string;
  corretor?: string;
  corretor_numero?: number;
  original_id?: string;
  observacoes_coordenacao?: string;
  audio_url?: string | null;
  audio_url_corretor_1?: string | null;
  audio_url_corretor_2?: string | null;
  // Campos pedagógicos
  comentario_c1_corretor_1?: string | null;
  comentario_c2_corretor_1?: string | null;
  comentario_c3_corretor_1?: string | null;
  comentario_c4_corretor_1?: string | null;
  comentario_c5_corretor_1?: string | null;
  elogios_pontos_atencao_corretor_1?: string | null;
  comentario_c1_corretor_2?: string | null;
  comentario_c2_corretor_2?: string | null;
  comentario_c3_corretor_2?: string | null;
  comentario_c4_corretor_2?: string | null;
  comentario_c5_corretor_2?: string | null;
  elogios_pontos_atencao_corretor_2?: string | null;
  correcao_arquivo_url_corretor_1?: string | null;
  correcao_arquivo_url_corretor_2?: string | null;
}

// Função para verificar se deve mostrar as notas
// Para simulados, só mostra quando ambas as correções estiverem finalizadas
const shouldShowScores = (redacao: RedacaoTurma) => {
  if (redacao.tipo_envio === 'simulado') {
    // Para simulados, precisamos verificar se AMBAS as correções foram finalizadas
    // Primeiro buscamos a redação original para ter acesso aos dados completos
    const originalId = redacao.original_id || redacao.id;
    
    // Se não temos dados completos dos dois corretores, não mostramos
    // Para simulados, verificar se as notas já foram mapeadas corretamente
    const temTodasNotasCorretor1 = [1, 2, 3, 4, 5].every(comp => {
      const nota = (redacao as any)[`nota_c${comp}`];
      return nota !== null && nota !== undefined;
    });
    
    // Se é uma redação específica de um corretor, só precisa verificar se tem todas as notas
    if (redacao.corretor_numero) {
      return temTodasNotasCorretor1;
    }
    
    // Se não tem corretor número específico, é uma redação original - não mostrar notas ainda
    return false;
  }
  
  // Para outros tipos de redação (regular, exercício, visitante), usar lógica atual
  return true;
};

const MinhasRedacoesList = () => {
  // Configurar título da página
  usePageTitle('Minhas Redações');
  
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoTurma | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para o modal de devolução
  const [showDevolutionDialog, setShowDevolutionDialog] = useState(false);
  const [devolutionInfo, setDevolutionInfo] = useState<{ 
    corretor: string; 
    justificativa: string; 
    tema: string; 
    dataEnvio: string 
  } | null>(null);
  
  // Estados para modal de devolução novo
  const [showModalDevolucao, setShowModalDevolucao] = useState(false);
  const [redacaoDevolvida, setRedacaoDevolvida] = useState<RedacaoTurma | null>(null);
  
  // Estados para modal de revisualização (quando já está ciente)
  const [showModalRevisualizacao, setShowModalRevisualizacao] = useState(false);
  const [redacaoRevisualizacao, setRedacaoRevisualizacao] = useState<RedacaoTurma | null>(null);
  
  const itemsPerPage = 10;
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isRedacaoVisualizada } = useVisualizacoesRealtime();

  // Hook para cancelamento de redações
  const { cancelRedacao, cancelRedacaoSimulado, canCancelRedacao, getCreditosACancelar, loading: cancelLoading } = useCancelRedacao({
    onSuccess: () => {
      // Recarregar a lista após cancelamento
      window.location.reload();
    }
  });

  // Debug apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 MinhasRedacoesList - Hook de cancelamento inicializado:', {
      cancelRedacao: !!cancelRedacao,
      canCancelRedacao: !!canCancelRedacao,
      getCreditosACancelar: !!getCreditosACancelar,
      cancelLoading
    });
  }

  // Obter dados do usuário do localStorage
  const studentDataStr = localStorage.getItem('alunoData');
  const studentData = studentDataStr ? JSON.parse(studentDataStr) : null;
  
  // Obter dados de visitante do localStorage
  const visitanteDataStr = localStorage.getItem('visitanteData');
  const visitanteData = visitanteDataStr ? JSON.parse(visitanteDataStr) : null;
  
  // Verificar se o usuário está logado
  const userType = localStorage.getItem('userType');
  const isStudentLoggedIn = userType === 'aluno';
  const isVisitanteLoggedIn = userType === 'visitante';

  console.log('🐛 DEBUG MinhasRedacoesList:', {
    userType,
    isStudentLoggedIn,
    isVisitanteLoggedIn,
    studentData,
    visitanteData
  });

  const { data: redacoes = [], isLoading, error } = useQuery({
    queryKey: ['minhas-redacoes', studentData?.email, visitanteData?.email, userType, 'visitor-essays'],
    queryFn: async () => {
      console.log('🔍 Iniciando busca de redações - userType:', userType);
      
      if (userType === 'visitante') {
        // Para visitantes, buscar apenas redações do próprio email
        const emailVisitante = visitanteData?.email?.toLowerCase().trim();
        
        if (!emailVisitante) {
          console.log('❌ Email do visitante não encontrado:', visitanteData);
          return [];
        }
        
        console.log('👤 Buscando redações específicas do visitante:', emailVisitante);
        
        const { data: redacoesVisitantes, error: errorVisitantes } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('turma', 'visitante')
          .ilike('email_aluno', emailVisitante)
          .order('data_envio', { ascending: false });
          
        if (errorVisitantes) {
          console.error('❌ Erro ao buscar redações do visitante:', errorVisitantes);
          throw errorVisitantes;
        }
        
        console.log('✅ Redações do visitante encontradas:', redacoesVisitantes?.length || 0);
        console.log('📋 Dados das redações:', redacoesVisitantes);
        
        // Processar redações de visitantes com tipo correto
        const redacoesFormatadas = redacoesVisitantes?.map(item => ({
          ...item,
          redacao_texto: item.redacao_texto || '',
          tipo_envio: 'avulsa', // Forçar tipo avulsa para visitantes
          corrigida: item.status === 'corrigida' || item.status === 'corrigido' || item.corrigida,
          status: item.status || 'aguardando'
        } as RedacaoTurma)) || [];
        
        console.log('✅ Redações formatadas para o visitante:', redacoesFormatadas);
        return redacoesFormatadas;
      }
      
      if (!studentData?.email) {
        console.log('❌ Email não encontrado nos dados do estudante:', studentData);
        return [];
      }

      const emailBusca = studentData.email.toLowerCase().trim();
      console.log('🔍 Buscando redações para email:', emailBusca);

      try {
        // Buscar redações regulares com informações do corretor
        const { data: redacoesRegulares, error: errorRegulares } = await supabase
          .from('redacoes_enviadas')
          .select(`
            *,
            corretor1:corretores!corretor_id_1(id, nome_completo),
            corretor2:corretores!corretor_id_2(id, nome_completo)
          `)
          .ilike('email_aluno', emailBusca);

        if (errorRegulares) {
          console.error('❌ Erro ao buscar redações regulares:', errorRegulares);
          throw errorRegulares;
        }

        // MINHAS REDAÇÕES: Exibir apenas redações regulares, excluindo simulados e exercícios
        // As redações de simulados devem aparecer apenas na seção "Simulados"

        // Processar e combinar resultados
        const todasRedacoes: RedacaoTurma[] = [];

        // Adicionar redações regulares
        if (redacoesRegulares && redacoesRegulares.length > 0) {
          console.log('✅ Processando', redacoesRegulares.length, 'redações regulares');
          redacoesRegulares.forEach((item: any) => {
            // Determinar nome do corretor baseado no que está atribuído
            let nomeCorretor = null;
            if (item.corretor_id_1 && item.corretor1) {
              nomeCorretor = item.corretor1.nome_completo;
            } else if (item.corretor_id_2 && item.corretor2) {
              nomeCorretor = item.corretor2.nome_completo;
            }

            todasRedacoes.push({
              ...item,
              tipo_envio: item.tipo_envio || 'tema_livre',
              corrigida: item.status === 'corrigida' || item.status === 'corrigido' || item.corrigida,
              status: item.status || 'aguardando',
              corretor: nomeCorretor
            } as RedacaoTurma);
          });
        }

        // SIMULADOS: Redações de simulados agora aparecem exclusivamente na seção "Simulados"
        // Não incluir redações de simulado em "Minhas Redações"

        // EXERCÍCIOS: Redações de exercícios também ficam exclusivas em suas respectivas seções
        // Não incluir redações de exercício em "Minhas Redações"

        // Ordenar por data de envio (mais recente primeiro)
        const redacoesOrdenadas = todasRedacoes.sort((a, b) => 
          new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
        );

        console.log('📄 Total de redações encontradas:', redacoesOrdenadas.length);
        console.log('📝 Redações do usuário', emailBusca, ':', redacoesOrdenadas);

        return redacoesOrdenadas;
      } catch (error) {
        console.error('❌ Erro geral ao buscar redações:', error);
        throw error;
      }
    },
    enabled: (!!studentData?.email && isStudentLoggedIn) || (isVisitanteLoggedIn),
    refetchOnWindowFocus: true
  });

  // Função para buscar justificativa da devolução
  const buscarJustificativaDevolucao = async (redacao: RedacaoTurma) => {
    console.log('🔍 Buscando justificativa para redação devolvida:', redacao);
    
    let justificativa = 'Motivo não especificado';
    
    try {
      console.log('🔍 Buscando justificativa para redação:', {
        id: redacao.id,
        original_id: redacao.original_id,
        tipo_envio: redacao.tipo_envio
      });

      // Buscar justificativa apenas para redações regulares (simulados e exercícios não estão mais nesta página)
      console.log('🔍 Buscando redação regular com ID:', redacao.id);

      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('justificativa_devolucao, elogios_pontos_atencao_corretor_1, elogios_pontos_atencao_corretor_2')
        .eq('id', redacao.id)
        .single();

      console.log('🔍 Resultado redação regular:', { data, error });

      if (!error && data) {
        console.log('🔍 Dados da redação regular:', data);
        justificativa = data.justificativa_devolucao ||
                        data.elogios_pontos_atencao_corretor_1 ||
                        data.elogios_pontos_atencao_corretor_2 ||
                        'Motivo não especificado';
      } else {
        console.error('❌ Erro ao buscar redação regular:', error);
      }
      
      console.log('📝 Justificativa encontrada (bruta):', justificativa);
      
      // Limpar formatação desnecessária da justificativa
      const justificativaLimpa = justificativa
        .replace('Sua redação foi devolvida pelo corretor com a seguinte justificativa:\n\n', '')
        .replace(/^\s*"?\s*/, '') // Remove aspas iniciais e espaços
        .replace(/\s*"?\s*$/, '') // Remove aspas finais e espaços
        .trim();
      
      console.log('📝 Justificativa limpa:', justificativaLimpa);
      justificativa = justificativaLimpa;
      
      // Verificar se já foi visualizada para passar para o modal
      const jaFoiVisualizada = studentData?.email && isRedacaoVisualizada(
        redacao.original_id || redacao.id, 
        studentData.email
      );
      
      // Criar redação com justificativa para o modal
      const redacaoComJustificativa = {
        ...redacao,
        justificativa_devolucao: justificativa,
        ja_visualizada: jaFoiVisualizada
      };
      
      // Usar modal apropriado baseado no status
      if (jaFoiVisualizada) {
        // Já foi visualizada - usar modal de revisualização
        setRedacaoRevisualizacao(redacaoComJustificativa);
        setShowModalRevisualizacao(true);
      } else {
        // Primeira visualização - usar modal normal
        setRedacaoDevolvida(redacaoComJustificativa);
        setShowModalDevolucao(true);
      }
      
    } catch (error) {
      console.error('Erro ao buscar justificativa:', error);
      // Verificar se já foi visualizada mesmo em caso de erro
      const jaFoiVisualizada = studentData?.email && isRedacaoVisualizada(
        redacao.original_id || redacao.id, 
        studentData.email
      );
      
      // Abrir modal mesmo sem justificativa
      const redacaoComErro = { 
        ...redacao, 
        justificativa_devolucao: 'Erro ao carregar motivo',
        ja_visualizada: jaFoiVisualizada
      };
      
      // Usar modal apropriado baseado no status
      if (jaFoiVisualizada) {
        // Já foi visualizada - usar modal de revisualização
        setRedacaoRevisualizacao(redacaoComErro);
        setShowModalRevisualizacao(true);
      } else {
        // Primeira visualização - usar modal normal
        setRedacaoDevolvida(redacaoComErro);
        setShowModalDevolucao(true);
      }
    }
  };

  const handleViewRedacao = async (redacao: RedacaoTurma) => {
    console.log('🔍 Iniciando visualização da redação:', redacao.id, 'Status:', redacao.status);
    
    // VERIFICAR SE É REDAÇÃO DEVOLVIDA PRIMEIRO
    if (redacao.status === 'devolvida') {
      console.log('🔔 Redação devolvida detectada - abrindo modal de devolução');
      
      // Verificar se já foi visualizada
      const foiVisualizada = studentData?.email && isRedacaoVisualizada(
        redacao.original_id || redacao.id, 
        studentData.email
      );
      
      if (foiVisualizada) {
        console.log('✓ Redação já foi visualizada, abrindo modal apenas para leitura');
      }
      
      console.log('🔴 MinhasRedacoes: Abrindo modal novo para redação devolvida:', redacao);
      
      // Buscar justificativa da devolução antes de abrir o modal
      await buscarJustificativaDevolucao(redacao);
      return;
    }
    
    // Verificar se é redação manuscrita (pela presença de imagem)
    if (redacao.redacao_manuscrita_url) {
      console.log('📝 Redação manuscrita detectada - abrindo página dedicada');
      navigate(`/redacoes/manuscrita/${redacao.id}?origem=listagem`);
      return;
    }

    // Para redações digitadas, validar automaticamente se o email bate
    if (studentData?.email) {
      const normalizeEmail = (email: string) => email?.trim().toLowerCase() || '';
      const emailUsuario = normalizeEmail(studentData.email);
      const emailRedacao = normalizeEmail(redacao.email_aluno);
      
      if (emailUsuario === emailRedacao) {
        console.log('✅ Email validado automaticamente - abrindo redação diretamente');
        setSelectedRedacao(redacao);
        setShowAuthDialog(false);
        return;
      }
    }

    // Se não conseguir validar automaticamente, pedir autenticação
    setSelectedRedacao(redacao);
    setEmailInput("");
    setShowAuthDialog(true);
  };

  const handleEmailAuth = async () => {
    if (!selectedRedacao) return;
    
    console.log('🔐 Iniciando validação de email para redação:', selectedRedacao.id);
    
    if (!emailInput || emailInput.trim() === '') {
      toast({
        title: "Erro",
        description: "Por favor, digite o email para verificação.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAuthenticating(true);
    
    try {
      // Validação de email digitado vs email da redação
      const normalizeEmail = (email: string) => email?.trim().toLowerCase() || '';
      const emailDigitado = normalizeEmail(emailInput);
      const emailRedacao = normalizeEmail(selectedRedacao.email_aluno);
      
      console.log('🔍 Validando email:', {
        emailDigitado,
        emailRedacao,
        match: emailDigitado === emailRedacao
      });
      
      if (emailDigitado === emailRedacao) {
        console.log('✅ Email validado com sucesso');
        setShowAuthDialog(false);
        
        // Buscar redação completa de acordo com o tipo
        let redacaoCompleta = null;
        let error = null;
        
        // Buscar redação completa apenas de redacoes_enviadas
        const { data, error: err } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', selectedRedacao.id)
          .single();
        redacaoCompleta = data;
        error = err;

        if (error) {
          console.error('❌ Erro ao buscar redação completa:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar os detalhes da redação.",
            variant: "destructive"
          });
          return;
        }

        if (redacaoCompleta) {
          // Manter a redação atual já formatada
          setShowAuthDialog(false);
        }
      } else {
        console.log('❌ Falha na validação do email automática');
        // Permitir autenticação manual
        const isEmailValid = normalizeEmail(selectedRedacao.email_aluno) === normalizeEmail(emailInput);
        
        if (isEmailValid) {
          console.log('✅ Email validado manualmente');
          setShowAuthDialog(false);
        } else {
          toast({
            title: "Email incorreto",
            description: "O email digitado não confere com o email de envio da redação.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro durante autenticação:', error);
      toast({
        title: "Erro",
        description: "Erro durante a validação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // FUNÇÃO PARA TRATAR REDAÇÃO DEVOLVIDA
  const handleRedacaoDevolvida = async (redacao: RedacaoTurma) => {
    console.log('🔄 Processando redação devolvida:', redacao);
    
    // Verificar se já foi visualizada (está ciente)
    const jaFoiVisualizada = isRedacaoVisualizada(redacao.id, studentData?.email || '');
    console.log('🔍 Status de visualização:', { jaFoiVisualizada });
    
    try {
      // Buscar informações da devolução e corretor
      let devolutionData;
      let justificativa = 'Motivo não especificado';
      
      // Buscar dados da devolução apenas para redações regulares
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select(`
          justificativa_devolucao,
          elogios_pontos_atencao_corretor_1,
          elogios_pontos_atencao_corretor_2,
          data_envio,
          devolvida_por,
          corretor_id_1,
          corretores!devolvida_por(nome_completo)
        `)
        .eq('id', redacao.id)
        .single();

      if (error) {
        console.error('Erro ao buscar dados da redação regular:', error);
      } else {
        devolutionData = data;
        justificativa = data.justificativa_devolucao ||
                        data.elogios_pontos_atencao_corretor_1 ||
                        data.elogios_pontos_atencao_corretor_2 ||
                        'Motivo não especificado';
      }

      if (devolutionData) {
        console.log('📋 Dados da devolução encontrados:', devolutionData);
        
        // Buscar nome do corretor que devolveu
        let nomeCorretor = 'Corretor';
        
        if (devolutionData.devolvida_por && devolutionData.corretores) {
          nomeCorretor = (devolutionData.corretores as any)?.nome_completo || 'Corretor';
        } else if (devolutionData.corretor_id_1) {
          // Se não tem devolvida_por mas tem corretor_id_1, buscar nome do corretor 1
          const { data: corretorData } = await supabase
            .from('corretores')
            .select('nome_completo')
            .eq('id', devolutionData.corretor_id_1)
            .single();
          nomeCorretor = corretorData?.nome_completo || 'Corretor';
        }
        
        // Limpar formatação desnecessária da justificativa
        const justificativaLimpa = justificativa
          .replace('Sua redação foi devolvida pelo corretor com a seguinte justificativa:\n\n', '')
          .replace(/^\s*"?\s*/, '') // Remove aspas iniciais e espaços
          .replace(/\s*"?\s*$/, '') // Remove aspas finais e espaços
          .trim();
        
        console.log('💬 Justificativa processada:', justificativaLimpa);
        
        setDevolutionInfo({
          corretor: nomeCorretor,
          justificativa: justificativaLimpa,
          tema: redacao.frase_tematica,
          dataEnvio: new Date(devolutionData.data_envio).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
          })
        });
        
        setShowDevolutionDialog(true);
        
        console.log('✅ Modal de devolução configurado e exibido');
      } else {
        console.error('❌ Nenhum dado de devolução encontrado');
        toast({
          title: "Erro",
          description: "Não foi possível encontrar os dados da devolução.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 Erro ao buscar informações da devolução:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações da devolução.",
        variant: "destructive"
      });
    }
  };

  // FUNÇÃO PARA MARCAR DEVOLUÇÃO COMO VISUALIZADA
  const handleEntendi = async () => {
    if (!selectedRedacao) return;
    
    try {
      // Para redações regulares, usar sempre a tabela redacoes_enviadas
      const tabelaOrigem = 'redacoes_enviadas';
      const redacaoId = selectedRedacao.original_id || selectedRedacao.id;
      
      console.log('🔄 Marcando redação como visualizada:', {
        redacaoId,
        tabelaOrigem,
        email: (studentData?.email || '').toLowerCase().trim()
      });
      
      // Marcar como visualizada
      const { data, error } = await supabase.rpc('marcar_redacao_devolvida_como_visualizada', {
        redacao_id_param: redacaoId,
        tabela_origem_param: tabelaOrigem,
        email_aluno_param: (studentData?.email || '').toLowerCase().trim()
      });
      
      if (error) {
        console.error('❌ Erro ao marcar como visualizada:', error);
        toast({
          title: "Erro",
          description: "Não foi possível marcar como ciente. Tente novamente.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Redação marcada como visualizada:', data);
      
      // Debug: Verificar se o registro foi realmente inserido
      const { data: verificacao } = await supabase
        .from('redacao_devolucao_visualizacoes')
        .select('*')
        .eq('redacao_id', redacaoId)
        .eq('email_aluno', (studentData?.email || '').toLowerCase().trim());
      
      console.log('🔍 Verificação na tabela MinhasRedacoesList:', verificacao);
      
      toast({
        title: "Marcado como ciente",
        description: "Redação marcada como ciente com sucesso.",
      });
      
      setShowDevolutionDialog(false);
      setSelectedRedacao(null);
      setDevolutionInfo(null);
      
      // Recarregar a lista para atualizar o status
      window.location.reload();
      
    } catch (error) {
      console.error('💥 Erro inesperado ao marcar como visualizada:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const iniciarDownloadCorrecaoCompleta = async (redacao: RedacaoTurma) => {
    console.log('📥 Iniciando download da correção completa para redação:', redacao.id);
    
    try {
      toast({
        title: "Download iniciado",
        description: "Seu arquivo será baixado em breve",
      });

      // Para redações manuscritas, usar função específica
      if (redacao.redacao_manuscrita_url) {
        const { downloadRedacaoManuscritaCorrigida } = await import('@/utils/redacaoDownload');
        await downloadRedacaoManuscritaCorrigida(redacao);
      } else {
        // Para redações digitadas, usar nova função
        const { downloadRedacaoDigitadaCorrigida } = await import('@/utils/redacaoDownload');
        await downloadRedacaoDigitadaCorrigida(redacao);
      }
    } catch (error) {
      console.error('❌ Erro ao baixar correção:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a correção. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const resetAuthenticationState = () => {
    setSelectedRedacao(null);
    setEmailInput("");
    setShowAuthDialog(false);
    setIsAuthenticating(false);
  };

  // Filtrar redações baseado no termo de busca
  const filteredRedacoes = redacoes.filter(redacao => 
    redacao.frase_tematica?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.tipo_envio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de paginação
  const totalPages = Math.ceil(filteredRedacoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRedacoes = filteredRedacoes.slice(startIndex, endIndex);

  // Função para gerar números das páginas
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getTipoEnvioLabel = (tipo: string) => {
    switch (tipo) {
      case 'tema_livre': return 'Exercício';
      case 'simulado': return 'Simulado';
      case 'exercicio': return 'Exercício';
      case 'manuscrita': return 'Regular';
      case 'regular': return 'Regular';
      case 'avulsa': return 'Avulsa';
      default: return 'Regular';
    }
  };

  const getTipoEnvioColor = (tipo: string) => {
    switch (tipo) {
      case 'tema_livre': return 'bg-green-100 text-green-800';
      case 'simulado': return 'bg-purple-100 text-purple-800';
      case 'exercicio': return 'bg-green-100 text-green-800';
      case 'manuscrita': return 'bg-blue-100 text-blue-800';
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'avulsa': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Verificação removida - a proteção de rota já é feita no App.tsx

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      <StudentHeader />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-6">Minhas Redações</h1>
          
          {/* Barra de pesquisa */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por tema, status ou tipo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset para primeira página ao buscar
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-destructive mb-4">Erro ao carregar redações.</p>
              <Button onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredRedacoes.length === 0 && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma redação encontrada com esse termo.' : 'Você ainda não enviou nenhuma redação.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lista de redações */}
        {!isLoading && !error && currentRedacoes.length > 0 && (
          <div className="space-y-4">
            {currentRedacoes.map((redacao) => (
              <Card
                key={redacao.id}
                className="transition-all hover:shadow-md hover:scale-[1.01]"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={getTipoEnvioColor(redacao.tipo_envio)}
                        >
                          {getTipoEnvioLabel(redacao.tipo_envio)}
                        </Badge>
                        
                        {/* TAG DEVOLVIDA/CIENTE - SEMPRE EXIBIR SE STATUS FOR DEVOLVIDA */}
                        {redacao.status === 'devolvida' && (() => {
                          const foiVisualizada = studentData?.email && isRedacaoVisualizada(
                            redacao.original_id || redacao.id, 
                            studentData.email
                          );
                          
                          return foiVisualizada ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Ciente
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Devolvida
                            </Badge>
                          );
                        })()}
                        
                        {redacao.status === 'corrigida' && (
                          <Badge variant="default">
                            Corrigida
                          </Badge>
                        )}
                        {redacao.status === 'em_andamento' && (
                          <Badge variant="secondary">
                            Em andamento
                          </Badge>
                        )}
                      </div>

                      {/* Botão de cancelamento - apenas para redações que NÃO são simulados */}
                      {(() => {
                        const podeCancel = canCancelRedacao(redacao) && redacao.tipo_envio !== 'simulado';
                        // Debug apenas em desenvolvimento
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`🔍 Redação ${redacao.id}: pode cancelar = ${podeCancel}`);
                        }
                        return podeCancel;
                      })() && (
                        <div className="mb-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                disabled={cancelLoading}
                                onClick={(e) => e.stopPropagation()} // Evitar propagação do click do card
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancelar envio
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  Cancelar envio da redação
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>Tem certeza que deseja cancelar o envio desta redação?</p>
                                  <p className="font-medium">
                                    <strong>Tema:</strong> {redacao.frase_tematica}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <strong>Tipo:</strong> {getTipoEnvioLabel(redacao.tipo_envio)}
                                  </p>
                                  {getCreditosACancelar(redacao.tipo_envio) > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                                      <p className="text-green-800 text-sm">
                                        ✅ <strong>{getCreditosACancelar(redacao.tipo_envio)} crédito(s)</strong> serão devolvidos à sua conta.
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-red-600 text-sm mt-3">
                                    ⚠️ Esta ação não pode ser desfeita. A redação será removida permanentemente.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Não, manter redação</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (redacao.tipo_envio === 'simulado') {
                                      cancelRedacaoSimulado(redacao.id, redacao.email_aluno);
                                    } else {
                                      cancelRedacao(redacao.id, redacao.email_aluno);
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={cancelLoading}
                                >
                                  {cancelLoading ? "Cancelando..." : "Sim, cancelar envio"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}


                       <h3 className="font-semibold text-foreground mb-1 line-clamp-2 cursor-pointer" onClick={() => handleViewRedacao(redacao)}>
                        {redacao.frase_tematica}
                       </h3>
                       
                       {redacao.corretor && (
                         <p className="text-sm text-muted-foreground font-medium">
                           Corretor: {redacao.corretor}
                         </p>
                       )}

                      {/* Exibir notas por competência se a correção foi finalizada */}
                      {redacao.corrigida && shouldShowScores(redacao) && (redacao.nota_c1 || redacao.nota_c2 || redacao.nota_c3 || redacao.nota_c4 || redacao.nota_c5) && (
                        <div className="text-sm text-muted-foreground mt-2 mb-1">
                          <span className="font-medium">
                            C1: {redacao.nota_c1 || '-'} | C2: {redacao.nota_c2 || '-'} | C3: {redacao.nota_c3 || '-'} | C4: {redacao.nota_c4 || '-'} | C5: {redacao.nota_c5 || '-'} | Nota: {redacao.nota_total || '-'}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground">
                        Enviado em: {formatDate(redacao.data_envio)}
                        {redacao.corrigida && redacao.data_correcao && (
                          <span> • Corrigido em: {formatDate(redacao.data_correcao)}</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {redacao.status === 'devolvida' ? (() => {
                        const foiVisualizada = studentData?.email && isRedacaoVisualizada(
                          redacao.original_id || redacao.id, 
                          studentData.email
                        );
                        
                        return foiVisualizada ? (
                          <span className="text-green-600 font-medium">Clique para rever motivo</span>
                        ) : (
                          <span className="text-red-600 font-medium">Clique para ver o motivo →</span>
                        );
                      })() : redacao.corrigida ? (
                        <span>Ver detalhes →</span>
                      ) : (
                        <span>Ver redação →</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Dialog de autenticação por email */}
        <Dialog open={showAuthDialog} onOpenChange={(open) => {
          if (!open) resetAuthenticationState();
        }}>
          <DialogContent className="max-w-md">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Confirme seu email</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Por segurança, digite o email usado para enviar esta redação:
                </p>
              </div>
              
              <Input
                type="email"
                placeholder="seu-email@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isAuthenticating) {
                    handleEmailAuth();
                  }
                }}
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleEmailAuth} 
                  disabled={!emailInput.trim() || isAuthenticating}
                  className="flex-1"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetAuthenticationState}
                  disabled={isAuthenticating}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL EXCLUSIVO PARA REDAÇÕES DEVOLVIDAS */}
        <Dialog open={showDevolutionDialog} onOpenChange={setShowDevolutionDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-center">
                {devolutionInfo?.tema}
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Enviado em: {devolutionInfo?.dataEnvio}
              </p>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Segundo {devolutionInfo?.corretor?.toLowerCase().endsWith('a') ? 'a corretora' : 'o corretor'}{' '}
                      <span className="font-semibold">{devolutionInfo?.corretor}</span>, sua redação foi devolvida 
                      com base na seguinte justificativa:
                    </p>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded border-l-4 border-yellow-400">
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                        "{devolutionInfo?.justificativa}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center pt-2">
                <Button 
                  onClick={handleEntendi}
                  className="px-8 py-2 bg-primary hover:bg-primary/90"
                >
                  Entendi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para exibir redação autenticada */}
        {selectedRedacao && !showAuthDialog && !showDevolutionDialog && (
          <Dialog open={true} onOpenChange={resetAuthenticationState}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <RedacaoEnviadaCard redacao={selectedRedacao} />
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de devolução novo para manuscritas */}
        {redacaoDevolvida && showModalDevolucao && studentData?.email && (() => {
          console.log('🔴 MinhasRedacoes: Renderizando modal com props:', {
            redacaoDevolvida,
            showModalDevolucao,
            email: studentData?.email
          });
          return true;
        })() && (
          <ModalDevolucaoRedacao
            isOpen={showModalDevolucao}
            onClose={() => {
              setShowModalDevolucao(false);
              setRedacaoDevolvida(null);
            }}
            redacao={{
              id: redacaoDevolvida.original_id || redacaoDevolvida.id,
              frase_tematica: redacaoDevolvida.frase_tematica,
              tabela_origem: 'redacoes_enviadas',
              justificativa_devolucao: (redacaoDevolvida as any).justificativa_devolucao || 'Motivo não especificado',
              data_envio: redacaoDevolvida.data_envio
            }}
            emailAluno={studentData.email}
            corretorNome="Corretor"
          />
        )}

        {/* Modal de revisualização para redações já cientes */}
        {redacaoRevisualizacao && showModalRevisualizacao && (
          <ModalRevisualizacaoRedacao
            isOpen={showModalRevisualizacao}
            onClose={() => {
              setShowModalRevisualizacao(false);
              setRedacaoRevisualizacao(null);
            }}
            redacao={{
              id: redacaoRevisualizacao.original_id || redacaoRevisualizacao.id,
              frase_tematica: redacaoRevisualizacao.frase_tematica,
              justificativa_devolucao: (redacaoRevisualizacao as any).justificativa_devolucao || 'Motivo não especificado',
              data_envio: redacaoRevisualizacao.data_envio
            }}
          />
        )}
      </main>
    </div>
  );
};

export default MinhasRedacoesList;