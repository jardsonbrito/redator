import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, Lock, AlertCircle, Shield, CheckCircle, User, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";
import { getStatusColor, getStatusLabel } from "@/utils/redacaoUtils";
import { downloadRedacaoCorrigida } from "@/utils/redacaoDownload";
import { useCancelRedacao } from "@/hooks/useCancelRedacao";
import { X, AlertTriangle } from "lucide-react";
import { getTurmaCode } from "@/utils/turmaUtils";
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

type RedacaoTurma = {
  id: string;
  frase_tematica: string;
  nome_aluno: string;
  email_aluno: string;
  tipo_envio: string;
  data_envio: string;
  status: string;
  corrigida: boolean;
  nota_total: number | null;
  comentario_admin: string | null;
  data_correcao: string | null;
  redacao_texto?: string;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
};

type AuthenticatedRedacao = RedacaoTurma & {
  redacao_texto: string;
  redacao_manuscrita_url?: string | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  // Campos dos comentários pedagógicos dos corretores
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
  // URLs de correções externas
  correcao_arquivo_url_corretor_1?: string | null;
  correcao_arquivo_url_corretor_2?: string | null;
  turma: string;
};

export const MinhasRedacoes = () => {
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [showDevolutionDialog, setShowDevolutionDialog] = useState(false);
  const [devolutionInfo, setDevolutionInfo] = useState<{ corretor: string; justificativa: string; tema: string; dataEnvio: string } | null>(null);
  const { toast } = useToast();

  // Hook para cancelamento de redações
  const { cancelRedacao, cancelRedacaoSimulado, canCancelRedacao, getCreditosACancelar, loading: cancelLoading } = useCancelRedacao({
    onSuccess: () => {
      refetch();
    }
  });

  console.log('🔧 MinhasRedacoes - Hook de cancelamento inicializado:', {
    cancelRedacao: !!cancelRedacao,
    canCancelRedacao: !!canCancelRedacao,
    getCreditosACancelar: !!getCreditosACancelar,
    cancelLoading
  });

  // Recupera dados do usuário com validação aprimorada
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const alunoData = localStorage.getItem("alunoData");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determinar código da turma e email do usuário
  let turmaCode = "";
  let visitanteEmail = "";
  let alunoEmail = "";
  
  if (userType === "aluno" && alunoTurma && alunoData) {
    try {
      const dados = JSON.parse(alunoData);
      alunoEmail = dados.email;
      turmaCode = getTurmaCode(alunoTurma);
    } catch (error) {
      console.error('❌ Erro ao parsear dados do aluno:', error);
    }
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      visitanteEmail = dados.email;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }


  // Query corrigida para visitantes
  const { data: redacoesTurma, isLoading, error, refetch } = useQuery({
    queryKey: ['redacoes-minhas', userType, alunoEmail || 'visitante'],
    queryFn: async () => {
      console.log('🔍 INICIANDO BUSCA DE REDAÇÕES - userType:', userType);
      
      if (userType === "aluno" && alunoEmail) {
        console.log('👨‍🎓 Buscando redações de aluno:', alunoEmail);
        
        const { data, error } = await supabase.rpc('get_student_redacoes_com_status_finalizado', {
          student_email: alunoEmail.toLowerCase().trim()
        });

        if (error) {
          console.error('❌ Erro ao buscar redações do aluno:', error);
          return [];
        }

        console.log('✅ Redações encontradas para aluno:', data?.length || 0);
        return data || [];
        
      } else if (userType === "visitante") {
        console.log('👤 Buscando TODAS as redações de visitantes (visualização pública)');
        
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select(`
            id,
            frase_tematica,
            nome_aluno,
            email_aluno,
            tipo_envio,
            data_envio,
            status,
            corrigida,
            nota_total,
            comentario_admin,
            data_correcao,
            turma
          `)
          .eq('turma', 'visitante')
          .order('data_envio', { ascending: false });
        
        console.log('🔍 Query executada para visitantes - resultado:', { data, error });
        
        if (error) {
          console.error('❌ Erro ao buscar redações de visitantes:', error);
          throw error;
        }
        
        console.log('✅ Redações de visitantes encontradas:', data?.length || 0);
        console.log('📋 Dados completos:', data);
        return data as RedacaoTurma[] || [];
      }
      
      console.log('⚠️ Nenhuma condição atendida - retornando array vazio');
      return [];
    },
    enabled: true, // SEMPRE HABILITADO PARA TESTAR
    staleTime: 30 * 1000,
    refetchInterval: false, // Desabilitando o refetch automático por enquanto
  });

  console.log('🔍 Estado da query:', {
    isLoading,
    error: error?.message,
    dataLength: redacoesTurma?.length,
    data: redacoesTurma
  });

  const handleViewRedacao = async (redacao: RedacaoTurma) => {
    console.log('🔐 Iniciando fluxo para visualização de redação');
    console.log('📊 Status da redação:', redacao.status, '| Tipo:', redacao.tipo_envio);
    
    // Verificar se é redação devolvida primeiro
    if (redacao.status === 'devolvida') {
      console.log('🔔 Redação devolvida detectada - abrindo modal de devolução');
      await handleRedacaoDevolvida(redacao);
      return;
    }
    
    // Para visitantes, acesso direto a todas as redações de visitantes (visualização pública)
    if (userType === "visitante") {
      console.log('👤 Fluxo direto para visitante - acesso público às redações de visitantes');
      
      // Processar redação diretamente para visitante (sem validação de email)
      await processarRedacaoAutenticada(redacao.id, redacao.email_aluno, redacao);
      return;
    }
    
    // Verificar se é redação manuscrita - se for, fazer download direto
    try {
      // Buscar dados completos da redação para verificar se tem imagem
      let redacaoCompleta;
      
      if (redacao.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select('redacao_manuscrita_url')
          .eq('id', redacao.id)
          .single();
        redacaoCompleta = data;
      } else {
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('redacao_manuscrita_url')
          .eq('id', redacao.id)
          .single();
        redacaoCompleta = data;
      }

      // Se tem URL de manuscrita, é redação por imagem -> fazer download direto
      if (redacaoCompleta?.redacao_manuscrita_url) {
        console.log('📄 Redação manuscrita detectada - iniciando download direto');
        
        // Validar email primeiro
        const isValid = await validarEmailRigoroso(redacao.email_aluno, alunoEmail || visitanteEmail);
        
        if (!isValid) {
          toast({
            title: "🚫 Acesso negado",
            description: "Não foi possível validar seu acesso a esta redação.",
            variant: "destructive",
          });
          return;
        }

        // Buscar dados completos para download
        await iniciarDownloadCorrecaoCompleta(redacao);
        return;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar tipo de redação:', error);
    }

    // Para redações de texto de alunos, seguir fluxo normal com pop-up
    setAuthenticatedRedacao(null);
    setShowRedacaoDialog(false);
    setSelectedRedacaoId(redacao.id);
    setEmailInput("");
    setIsAuthDialogOpen(true);
  };

  const validarEmailRigoroso = async (emailCorreto: string, emailDigitado: string): Promise<boolean> => {
    console.log('🔒 MINHAS REDAÇÕES: INICIANDO VALIDAÇÃO RIGOROSA:', { emailCorreto, emailDigitado });
    
    const emailCorretoNormalizado = emailCorreto.toLowerCase().trim();
    const emailDigitadoNormalizado = emailDigitado.toLowerCase().trim();
    
    console.log('📧 MINHAS REDAÇÕES: E-MAILS NORMALIZADOS:', { 
      emailCorretoNormalizado, 
      emailDigitadoNormalizado,
      saoIguais: emailCorretoNormalizado === emailDigitadoNormalizado
    });

    if (emailCorretoNormalizado !== emailDigitadoNormalizado) {
      console.log('❌ MINHAS REDAÇÕES: FALHA NA VALIDAÇÃO DIRETA');
      return false;
    }

    try {
      const { data: canAccess, error } = await supabase.rpc('can_access_redacao', {
        redacao_email: emailCorreto,
        user_email: emailDigitado
      });

      console.log('🔍 MINHAS REDAÇÕES: RESULTADO SUPABASE:', { canAccess, error });

      if (error || canAccess !== true) {
        console.log('❌ MINHAS REDAÇÕES: FALHA NA VALIDAÇÃO SUPABASE');
        return false;
      }
    } catch (error) {
      console.log('❌ MINHAS REDAÇÕES: ERRO NA VALIDAÇÃO SUPABASE:', error);
      return false;
    }

    console.log('✅ MINHAS REDAÇÕES: VALIDAÇÃO RIGOROSA APROVADA');
    return true;
  };

  const processarRedacaoAutenticada = async (redacaoId: string, emailUsuario: string, redacaoBasica: RedacaoTurma) => {
    try {
      console.log('📝 Processando redação autenticada para visitante');
      
      let redacaoCompleta;
      
      if (redacaoBasica.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select('*, simulados!inner(frase_tematica)')
          .eq('id', redacaoId)
          .single();
          
        if (error) {
          console.error('❌ Erro ao carregar redação de simulado:', error);
          throw new Error('Erro ao carregar redação de simulado');
        }
        
        redacaoCompleta = {
          ...data,
          redacao_texto: data.texto,
          frase_tematica: (data.simulados as any)?.frase_tematica || 'Simulado'
        };
      } else {
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', redacaoId)
          .single();

        if (error) {
          console.error('❌ Erro ao carregar redação regular:', error);
          throw new Error('Erro ao carregar redação regular');
        }
        
        redacaoCompleta = data;
      }

      // Verificar se é redação manuscrita
      if (redacaoCompleta?.redacao_manuscrita_url) {
        console.log('📄 Redação manuscrita detectada - iniciando download direto');
        
        // Preparar dados para download
        const dadosDownload = {
          id: redacaoCompleta.id,
          nome_aluno: redacaoCompleta.nome_aluno,
          email_aluno: redacaoCompleta.email_aluno,
          frase_tematica: redacaoCompleta.frase_tematica,
          redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "Redação manuscrita - veja imagem anexa",
          data_envio: redacaoCompleta.data_envio,
          nota_total: redacaoCompleta.nota_total,
          nota_c1: redacaoCompleta.nota_c1,
          nota_c2: redacaoCompleta.nota_c2,
          nota_c3: redacaoCompleta.nota_c3,
          nota_c4: redacaoCompleta.nota_c4,
          nota_c5: redacaoCompleta.nota_c5,
          comentario_admin: redacaoCompleta.comentario_admin || redacaoCompleta.comentario_pedagogico,
          comentario_c1_corretor_1: redacaoCompleta.comentario_c1_corretor_1,
          comentario_c2_corretor_1: redacaoCompleta.comentario_c2_corretor_1,
          comentario_c3_corretor_1: redacaoCompleta.comentario_c3_corretor_1,
          comentario_c4_corretor_1: redacaoCompleta.comentario_c4_corretor_1,
          comentario_c5_corretor_1: redacaoCompleta.comentario_c5_corretor_1,
          elogios_pontos_atencao_corretor_1: redacaoCompleta.elogios_pontos_atencao_corretor_1,
          comentario_c1_corretor_2: redacaoCompleta.comentario_c1_corretor_2,
          comentario_c2_corretor_2: redacaoCompleta.comentario_c2_corretor_2,
          comentario_c3_corretor_2: redacaoCompleta.comentario_c3_corretor_2,
          comentario_c4_corretor_2: redacaoCompleta.comentario_c4_corretor_2,
          comentario_c5_corretor_2: redacaoCompleta.comentario_c5_corretor_2,
          elogios_pontos_atencao_corretor_2: redacaoCompleta.elogios_pontos_atencao_corretor_2,
          data_correcao: redacaoCompleta.data_correcao,
          turma: redacaoCompleta.turma || "visitante",
          tipo_envio: redacaoBasica.tipo_envio
        };

        // Executar download
        downloadRedacaoCorrigida(dadosDownload);
        
        toast({
          title: "📥 Download iniciado!",
          description: "A correção completa será baixada em breve.",
        });
        return;
      }

      // Para redações de texto, exibir no modal
      const redacaoAutenticada: AuthenticatedRedacao = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacaoBasica.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacaoCompleta.status || (redacaoCompleta.corrigida ? 'corrigido' : 'aguardando'),
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin || redacaoCompleta.comentario_pedagogico,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "",
        redacao_manuscrita_url: redacaoCompleta.redacao_manuscrita_url,
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        // Incluindo comentários pedagógicos dos corretores
        comentario_c1_corretor_1: redacaoCompleta.comentario_c1_corretor_1,
        comentario_c2_corretor_1: redacaoCompleta.comentario_c2_corretor_1,
        comentario_c3_corretor_1: redacaoCompleta.comentario_c3_corretor_1,
        comentario_c4_corretor_1: redacaoCompleta.comentario_c4_corretor_1,
        comentario_c5_corretor_1: redacaoCompleta.comentario_c5_corretor_1,
        elogios_pontos_atencao_corretor_1: redacaoCompleta.elogios_pontos_atencao_corretor_1,
        comentario_c1_corretor_2: redacaoCompleta.comentario_c1_corretor_2,
        comentario_c2_corretor_2: redacaoCompleta.comentario_c2_corretor_2,
        comentario_c3_corretor_2: redacaoCompleta.comentario_c3_corretor_2,
        comentario_c4_corretor_2: redacaoCompleta.comentario_c4_corretor_2,
        comentario_c5_corretor_2: redacaoCompleta.comentario_c5_corretor_2,
        elogios_pontos_atencao_corretor_2: redacaoCompleta.elogios_pontos_atencao_corretor_2,
        // URLs de correções externas
        correcao_arquivo_url_corretor_1: redacaoCompleta.correcao_arquivo_url_corretor_1,
        correcao_arquivo_url_corretor_2: redacaoCompleta.correcao_arquivo_url_corretor_2,
        turma: redacaoCompleta.turma || "visitante",
      };

      setAuthenticatedRedacao(redacaoAutenticada);
      setShowRedacaoDialog(true);
      
      console.log('🎉 Redação liberada automaticamente para visitante');
      toast({
        title: "✅ Redação liberada!",
        description: "Acesso automático concedido para visitante.",
      });

    } catch (error) {
      console.error('💥 Erro ao processar redação autenticada:', error);
      toast({
        title: "❌ Erro ao carregar redação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRedacaoDevolvida = async (redacao: RedacaoTurma) => {
    console.log('🔄 Processando redação devolvida:', redacao);
    
    try {
      // Buscar informações da devolução e corretor
      let devolutionData;
      let justificativa = 'Motivo não especificado';
      
      if (redacao.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
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
          console.error('Erro ao buscar dados do simulado:', error);
        } else {
          devolutionData = data;
          // Priorizar justificativa_devolucao, depois elogios_pontos_atencao
          justificativa = data.justificativa_devolucao || 
                          data.elogios_pontos_atencao_corretor_1 || 
                          data.elogios_pontos_atencao_corretor_2 || 
                          'Motivo não especificado';
        }
      } else if (redacao.tipo_envio === 'exercicio') {
        const { data, error } = await supabase
          .from('redacoes_exercicio')
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
          console.error('Erro ao buscar dados do exercício:', error);
        } else {
          devolutionData = data;
          justificativa = data.justificativa_devolucao || 
                          data.elogios_pontos_atencao_corretor_1 || 
                          data.elogios_pontos_atencao_corretor_2 || 
                          'Motivo não especificado';
        }
      } else {
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
        
        setSelectedRedacaoId(redacao.id);
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

  const handleEntendi = async () => {
    if (!selectedRedacaoId) return;
    
    try {
      // Determinar tabela origem baseada no tipo de redação
      const redacao = redacoesTurma?.find(r => r.id === selectedRedacaoId);
      const tabelaOrigemMap = {
        'simulado': 'redacoes_simulado',
        'exercicio': 'redacoes_exercicio',
        'regular': 'redacoes_enviadas'
      };
      
      const tabelaOrigem = tabelaOrigemMap[redacao?.tipo_envio as keyof typeof tabelaOrigemMap] || 'redacoes_enviadas';
      
      // Marcar como visualizada
      await supabase.rpc('marcar_redacao_devolvida_como_visualizada', {
        redacao_id_param: selectedRedacaoId,
        tabela_origem_param: tabelaOrigem,
        email_aluno_param: (alunoEmail || visitanteEmail).toLowerCase().trim()
      });
      
      setShowDevolutionDialog(false);
      setSelectedRedacaoId(null);
      setDevolutionInfo(null);
      
    } catch (error) {
      console.error('Erro ao marcar como visualizada:', error);
    }
  };


  const handleEmailAuth = async () => {
    if (!selectedRedacaoId || !emailInput.trim()) {
      toast({
        title: "❌ E-mail obrigatório",
        description: "Digite o e-mail cadastrado na redação.",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    console.log('🔍 Iniciando validação segura de e-mail...');

    try {
      const redacaoBasica = redacoesTurma?.find(r => r.id === selectedRedacaoId);
      if (!redacaoBasica) {
        throw new Error('Redação não encontrada');
      }

      const isValid = await validarEmailRigoroso(redacaoBasica.email_aluno, emailInput.trim());

      if (!isValid) {
        console.error('🚫 MINHAS REDAÇÕES: ACESSO NEGADO - E-mail incorreto');
        toast({
          title: "🚫 E-mail incorreto",
          description: "Utilize o mesmo e-mail informado no envio da redação.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ E-mail validado com sucesso');

      let redacaoCompleta;
      
      if (redacaoBasica.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select('*, simulados!inner(frase_tematica)')
          .eq('id', selectedRedacaoId)
          .single();
          
        if (error) {
          console.error('❌ Erro ao carregar redação de simulado:', error);
          throw new Error('Erro ao carregar redação de simulado');
        }
        
        redacaoCompleta = {
          ...data,
          redacao_texto: data.texto,
          frase_tematica: (data.simulados as any)?.frase_tematica || 'Simulado'
        };
      } else {
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', selectedRedacaoId)
          .single();

        if (error) {
          console.error('❌ Erro ao carregar redação regular:', error);
          throw new Error('Erro ao carregar redação regular');
        }
        
        redacaoCompleta = data;
      }

      const redacaoAutenticada: AuthenticatedRedacao = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacaoBasica.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacaoCompleta.status || (redacaoCompleta.corrigida ? 'corrigido' : 'aguardando'),
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin || redacaoCompleta.comentario_pedagogico,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "",
        redacao_manuscrita_url: redacaoCompleta.redacao_manuscrita_url,
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        // Incluindo comentários pedagógicos dos corretores
        comentario_c1_corretor_1: redacaoCompleta.comentario_c1_corretor_1,
        comentario_c2_corretor_1: redacaoCompleta.comentario_c2_corretor_1,
        comentario_c3_corretor_1: redacaoCompleta.comentario_c3_corretor_1,
        comentario_c4_corretor_1: redacaoCompleta.comentario_c4_corretor_1,
        comentario_c5_corretor_1: redacaoCompleta.comentario_c5_corretor_1,
        elogios_pontos_atencao_corretor_1: redacaoCompleta.elogios_pontos_atencao_corretor_1,
        comentario_c1_corretor_2: redacaoCompleta.comentario_c1_corretor_2,
        comentario_c2_corretor_2: redacaoCompleta.comentario_c2_corretor_2,
        comentario_c3_corretor_2: redacaoCompleta.comentario_c3_corretor_2,
        comentario_c4_corretor_2: redacaoCompleta.comentario_c4_corretor_2,
        comentario_c5_corretor_2: redacaoCompleta.comentario_c5_corretor_2,
        elogios_pontos_atencao_corretor_2: redacaoCompleta.elogios_pontos_atencao_corretor_2,
        // URLs de correções externas
        correcao_arquivo_url_corretor_1: redacaoCompleta.correcao_arquivo_url_corretor_1,
        correcao_arquivo_url_corretor_2: redacaoCompleta.correcao_arquivo_url_corretor_2,
        turma: redacaoCompleta.turma || (userType === "aluno" ? turmaCode : "visitante"),
      };

      setIsAuthDialogOpen(false);
      setAuthenticatedRedacao(redacaoAutenticada);
      setShowRedacaoDialog(true);
      
      console.log('🎉 Redação liberada com segurança total');
      toast({
        title: "✅ Redação liberada!",
        description: "E-mail confirmado. Visualizando redação completa.",
      });

    } catch (error) {
      console.error('💥 Erro na autenticação:', error);
      toast({
        title: "❌ Erro na autenticação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const iniciarDownloadCorrecaoCompleta = async (redacao: RedacaoTurma) => {
    try {
      console.log('📥 Iniciando download da correção completa para redação manuscrita');
      
      // Buscar dados completos da redação
      let redacaoCompleta;
      
      if (redacao.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select('*, simulados!inner(frase_tematica)')
          .eq('id', redacao.id)
          .single();
          
        if (error) throw new Error('Erro ao carregar redação de simulado');
        
        redacaoCompleta = {
          ...data,
          redacao_texto: data.texto,
          frase_tematica: (data.simulados as any)?.frase_tematica || 'Simulado'
        };
      } else {
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', redacao.id)
          .single();

        if (error) throw new Error('Erro ao carregar redação');
        redacaoCompleta = data;
      }

      // Preparar dados para download
      const dadosDownload = {
        id: redacaoCompleta.id,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        frase_tematica: redacaoCompleta.frase_tematica,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "Redação manuscrita - veja imagem anexa",
        data_envio: redacaoCompleta.data_envio,
        nota_total: redacaoCompleta.nota_total,
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        comentario_admin: redacaoCompleta.comentario_admin || redacaoCompleta.comentario_pedagogico,
        comentario_c1_corretor_1: redacaoCompleta.comentario_c1_corretor_1,
        comentario_c2_corretor_1: redacaoCompleta.comentario_c2_corretor_1,
        comentario_c3_corretor_1: redacaoCompleta.comentario_c3_corretor_1,
        comentario_c4_corretor_1: redacaoCompleta.comentario_c4_corretor_1,
        comentario_c5_corretor_1: redacaoCompleta.comentario_c5_corretor_1,
        elogios_pontos_atencao_corretor_1: redacaoCompleta.elogios_pontos_atencao_corretor_1,
        comentario_c1_corretor_2: redacaoCompleta.comentario_c1_corretor_2,
        comentario_c2_corretor_2: redacaoCompleta.comentario_c2_corretor_2,
        comentario_c3_corretor_2: redacaoCompleta.comentario_c3_corretor_2,
        comentario_c4_corretor_2: redacaoCompleta.comentario_c4_corretor_2,
        comentario_c5_corretor_2: redacaoCompleta.comentario_c5_corretor_2,
        elogios_pontos_atencao_corretor_2: redacaoCompleta.elogios_pontos_atencao_corretor_2,
        data_correcao: redacaoCompleta.data_correcao,
        turma: redacaoCompleta.turma || (userType === "aluno" ? turmaCode : "visitante"),
        tipo_envio: redacao.tipo_envio
      };

      // Executar download
      downloadRedacaoCorrigida(dadosDownload);
      
      toast({
        title: "📥 Download iniciado!",
        description: "A correção completa será baixada em breve.",
      });

    } catch (error) {
      console.error('❌ Erro no download:', error);
      toast({
        title: "❌ Erro no download",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetAuthenticationState = () => {
    console.log('🔄 Resetando estados de autenticação');
    setSelectedRedacaoId(null);
    setAuthenticatedRedacao(null);
    setEmailInput("");
    setIsAuthDialogOpen(false);
    setShowRedacaoDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício',
      'simulado': 'Simulado',
      'visitante': 'Visitante'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoEnvioColor = (tipo: string) => {
    const cores = {
      'regular': 'bg-blue-100 text-blue-800',
      'exercicio': 'bg-purple-100 text-purple-800',
      'simulado': 'bg-orange-100 text-orange-800',
      'visitante': 'bg-gray-100 text-gray-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-blue-100 text-blue-800';
  };

  // Validação se há usuário logado
  if (!alunoEmail && !visitanteEmail) {
    return (
      <Card className="border-redator-accent/20">
        <CardContent className="text-center py-8">
          <Shield className="w-12 h-12 text-redator-accent mx-auto mb-4" />
          <p className="text-redator-accent">
            🔐 Faça login como aluno ou visitante para visualizar suas redações.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
        <p className="text-redator-accent">🔒 Carregando suas redações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">❌ Erro ao carregar suas redações. Tente novamente.</p>
          <Button onClick={() => refetch()} className="mt-2">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Mensagem quando não há redações do usuário logado
  if (!redacoesTurma || redacoesTurma.length === 0) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            📝 {userType === "visitante" ? "Redações de Visitantes" : "Minhas Redações"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-redator-accent mb-4 text-lg font-medium">
            {userType === "visitante" ? 
              "📋 Nenhuma redação de visitante foi enviada até o momento." :
              "🔔 Você ainda não enviou nenhuma redação."
            }
          </p>
          <p className="text-sm text-redator-accent/70">
            {userType === "visitante" ? 
              "As redações de visitantes aparecerão aqui quando disponíveis!" :
              "Suas redações corrigidas aparecerão aqui quando disponíveis!"
            }
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Verificar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Filtrar redações por status
  const redacoesFiltradas = redacoesTurma.filter(redacao => {
    if (statusFilter === "todos") return true;
    if (statusFilter === "corrigida") return redacao.corrigida;
    if (statusFilter === "aguardando") return !redacao.corrigida;
    return true;
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-redator-primary" />
          <h2 className="text-xl font-bold text-redator-primary">
            {userType === "visitante" ? 
              `📋 Redações de Visitantes (${redacoesTurma.length})` : 
              `🔐 Minhas Redações - ${alunoTurma} (${redacoesTurma.length})`
            }
          </h2>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
        
        {/* Filtros por status para visitantes */}
        {userType === "visitante" && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={statusFilter === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("todos")}
            >
              Todos ({redacoesTurma.length})
            </Button>
            <Button
              variant={statusFilter === "corrigida" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("corrigida")}
            >
              Corrigidas ({redacoesTurma.filter(r => r.corrigida).length})
            </Button>
            <Button
              variant={statusFilter === "aguardando" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("aguardando")}
            >
              Aguardando ({redacoesTurma.filter(r => !r.corrigida).length})
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {redacoesFiltradas.map((redacao) => (
            <Card key={redacao.id} className="border-redator-accent/20 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-redator-primary text-sm line-clamp-2 flex-1">
                      {redacao.frase_tematica}
                    </h3>
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* Tag do tipo de envio */}
                      <Badge variant="outline" className="text-xs">
                        {redacao.tipo_envio === 'simulado' ? 'Simulado' : 
                         redacao.tipo_envio === 'exercicio' ? 'Exercício' : 'Regular'}
                      </Badge>
                      {/* Tag do status - SEMPRE exibir se devolvida */}
                      {redacao.status === 'devolvida' ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                          Devolvida
                        </Badge>
                      ) : (
                        <Badge className={`${getStatusColor(redacao.status, redacao.corrigida)} text-xs`}>
                          {getStatusLabel(redacao.status, redacao.corrigida)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs text-redator-accent">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{redacao.nome_aluno}</span>
                    </div>
                    
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(redacao.data_envio)}</span>
                        </div>
                        
                        {redacao.corrigida && redacao.nota_total && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Nota: {redacao.nota_total}
                          </Badge>
                        )}
                      </div>
                    
                  </div>

                   {/* Botão de cancelamento - disponível apenas para regulares (simulados cancelam na rota do simulado) */}
                   {canCancelRedacao(redacao) && redacao.tipo_envio !== 'simulado' && (
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button
                           variant="outline"
                           size="sm"
                           className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs mb-2"
                           disabled={cancelLoading}
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
                               cancelRedacao(redacao.id, redacao.email_aluno);
                             }}
                             className="bg-red-600 hover:bg-red-700"
                             disabled={cancelLoading}
                           >
                             {cancelLoading ? "Cancelando..." : "Sim, cancelar envio"}
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   )}


                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500"
                     onClick={() => handleViewRedacao(redacao)}
                   >
                     <Shield className="w-3 h-3 mr-1" />
                     🔒 Ver {redacao.corrigida && redacao.status === "corrigido" ? "Correção" : "Redação"}
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isAuthDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetAuthenticationState();
        }
        setIsAuthDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              🔒 ACESSO SEGURO OBRIGATÓRIO
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>SEGURANÇA MÁXIMA:</strong> Digite o e-mail <strong>EXATO</strong> usado no envio da redação. Os dados só são carregados após validação rigorosa.
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email-auth" className="block text-sm font-bold text-red-700 mb-2">
                🔐 E-mail de Acesso * (obrigatório)
              </label>
              <Input
                id="email-auth"
                type="email"
                placeholder="Digite o e-mail EXATO cadastrado..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="border-2 border-red-300 focus:border-red-500"
                disabled={isAuthenticating}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEmailAuth}
                disabled={isAuthenticating || !emailInput.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isAuthenticating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Validando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    🔓 Verificar E-mail
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => resetAuthenticationState()}
                className="border-red-300"
                disabled={isAuthenticating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {authenticatedRedacao && showRedacaoDialog && (
        <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetAuthenticationState();
          }
          setShowRedacaoDialog(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Vista Pedagógica
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 p-3 rounded">
                <p className="text-sm text-green-800 font-medium">
                  ✅ E-mail validado com sucesso. Acesso liberado com segurança máxima.
                </p>
              </div>
              
              <RedacaoEnviadaCard
                redacao={{
                  id: authenticatedRedacao.id,
                  frase_tematica: authenticatedRedacao.frase_tematica,
                  redacao_texto: authenticatedRedacao.redacao_texto,
                  redacao_manuscrita_url: authenticatedRedacao.redacao_manuscrita_url,
                  data_envio: authenticatedRedacao.data_envio,
                  nota_c1: authenticatedRedacao.nota_c1,
                  nota_c2: authenticatedRedacao.nota_c2,
                  nota_c3: authenticatedRedacao.nota_c3,
                  nota_c4: authenticatedRedacao.nota_c4,
                  nota_c5: authenticatedRedacao.nota_c5,
                  nota_total: authenticatedRedacao.nota_total,
                  comentario_admin: authenticatedRedacao.comentario_admin,
                  corrigida: authenticatedRedacao.corrigida,
                  data_correcao: authenticatedRedacao.data_correcao,
                  nome_aluno: authenticatedRedacao.nome_aluno,
                  email_aluno: authenticatedRedacao.email_aluno,
                  tipo_envio: authenticatedRedacao.tipo_envio,
                  status: authenticatedRedacao.status,
                  turma: authenticatedRedacao.turma,
                  // Incluindo todos os comentários pedagógicos dos corretores
                  comentario_c1_corretor_1: authenticatedRedacao.comentario_c1_corretor_1,
                  comentario_c2_corretor_1: authenticatedRedacao.comentario_c2_corretor_1,
                  comentario_c3_corretor_1: authenticatedRedacao.comentario_c3_corretor_1,
                  comentario_c4_corretor_1: authenticatedRedacao.comentario_c4_corretor_1,
                  comentario_c5_corretor_1: authenticatedRedacao.comentario_c5_corretor_1,
                  elogios_pontos_atencao_corretor_1: authenticatedRedacao.elogios_pontos_atencao_corretor_1,
                  comentario_c1_corretor_2: authenticatedRedacao.comentario_c1_corretor_2,
                  comentario_c2_corretor_2: authenticatedRedacao.comentario_c2_corretor_2,
                  comentario_c3_corretor_2: authenticatedRedacao.comentario_c3_corretor_2,
                  comentario_c4_corretor_2: authenticatedRedacao.comentario_c4_corretor_2,
                  comentario_c5_corretor_2: authenticatedRedacao.comentario_c5_corretor_2,
                  elogios_pontos_atencao_corretor_2: authenticatedRedacao.elogios_pontos_atencao_corretor_2,
                  // URLs de correções externas
                  correcao_arquivo_url_corretor_1: authenticatedRedacao.correcao_arquivo_url_corretor_1,
                  correcao_arquivo_url_corretor_2: authenticatedRedacao.correcao_arquivo_url_corretor_2,
                  // Campos da tabela real
                  c1_corretor_1: authenticatedRedacao.nota_c1, // Mapear para compatibilidade
                  c1_corretor_2: null,
                }}
                onRedacaoCanceled={() => {
                  refetch();
                  resetAuthenticationState();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal EXCLUSIVO para redações devolvidas */}
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
    </>
  );
};
