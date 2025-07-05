
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, AlertCircle, Shield, CheckCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";

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
  corretor_nome?: string;
};

type AuthenticatedRedacao = RedacaoTurma & {
  redacao_texto: string;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
};

export const MinhasRedacoes = () => {
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const { toast } = useToast();

  // Recupera dados do usuário logado
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determinar email do usuário logado para filtrar redações
  let currentUserEmail = "";
  let turmaCode = "";
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "";
    currentUserEmail = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      currentUserEmail = dados.email;
      turmaCode = "visitante";
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  console.log('🔍 Email do usuário atual:', currentUserEmail);

  // Query para buscar APENAS as redações do usuário logado
  const { data: redacoesTurma, isLoading, error, refetch } = useQuery({
    queryKey: ['minhas-redacoes-filtradas', currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) {
        console.log('❌ Nenhum e-mail de usuário identificado');
        return [];
      }

      console.log('🔍 Buscando redações do usuário:', currentUserEmail);
      
      // Buscar redações regulares do usuário
      const { data: redacoesRegulares, error: errorRegulares } = await supabase
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
          data_correcao
        `)
        .eq('email_aluno', currentUserEmail)
        .or('corrigida.eq.true,status.eq.corrigida,status_corretor_1.eq.corrigida,status_corretor_2.eq.corrigida')
        .order('data_envio', { ascending: false });

      if (errorRegulares) {
        console.error('❌ Erro ao buscar redações regulares:', errorRegulares);
      }

      // Buscar redações de simulado do usuário
      const { data: redacoesSimulado, error: errorSimulado } = await supabase
        .from('redacoes_simulado')
        .select(`
          id,
          nome_aluno,
          email_aluno,
          data_envio,
          corrigida,
          nota_total,
          data_correcao,
          simulados!inner(frase_tematica)
        `)
        .eq('email_aluno', currentUserEmail)
        .or('corrigida.eq.true,status_corretor_1.eq.corrigida,status_corretor_2.eq.corrigida')
        .order('data_envio', { ascending: false });

      if (errorSimulado) {
        console.error('❌ Erro ao buscar redações de simulado:', errorSimulado);
      }

      // Combinar e formatar os dados
      const todasRedacoes: RedacaoTurma[] = [];
      
      // Adicionar redações regulares
      if (redacoesRegulares) {
        const regularesFormatadas = redacoesRegulares.map(redacao => ({
          ...redacao,
          corrigida: true,
          status: 'corrigida',
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...regularesFormatadas);
      }

      // Adicionar redações de simulado
      if (redacoesSimulado) {
        const simuladosFormatados = redacoesSimulado.map(simulado => ({
          id: simulado.id,
          frase_tematica: (simulado.simulados as any)?.frase_tematica || 'Simulado',
          nome_aluno: simulado.nome_aluno,
          email_aluno: simulado.email_aluno,
          tipo_envio: 'simulado',
          data_envio: simulado.data_envio,
          status: 'corrigida',
          corrigida: true,
          nota_total: simulado.nota_total,
          comentario_admin: null,
          data_correcao: simulado.data_correcao,
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...simuladosFormatados);
      }

      // Ordenar por data de envio (mais recente primeiro)
      todasRedacoes.sort((a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime());
      
      console.log('✅ Redações do usuário encontradas:', todasRedacoes.length);
      return todasRedacoes;
    },
    enabled: !!currentUserEmail,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const handleViewRedacao = async (redacao: RedacaoTurma) => {
    console.log('🔐 Acessando redação autenticada:', redacao.id);
    
    try {
      // Buscar dados completos
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

        if (error) throw new Error('Erro ao carregar redação regular');
        
        redacaoCompleta = data;
      }

      const redacaoAutenticada: AuthenticatedRedacao = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacao.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacao.status,
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin || redacaoCompleta.comentario_pedagogico,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        corretor_nome: redacao.corretor_nome
      };

      setAuthenticatedRedacao(redacaoAutenticada);
      setShowRedacaoDialog(true);
      
      toast({
        title: "✅ Redação carregada!",
        description: "Visualizando sua redação corrigida.",
      });

    } catch (error) {
      console.error('💥 Erro ao carregar redação:', error);
      toast({
        title: "❌ Erro ao carregar redação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetState = () => {
    setSelectedRedacaoId(null);
    setAuthenticatedRedacao(null);
    setShowRedacaoDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUserEmail) {
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

  if (!redacoesTurma || redacoesTurma.length === 0) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            📝 Minhas Redações
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-redator-accent mb-4">
            Você ainda não enviou nenhuma redação.
          </p>
          <p className="text-sm text-redator-accent/70">
            Suas redações corrigidas aparecerão aqui quando disponíveis!
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Verificar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-redator-primary" />
          <h2 className="text-xl font-bold text-redator-primary">
            📝 Minhas Redações ({redacoesTurma.length})
          </h2>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {redacoesTurma.map((redacao) => (
            <Card key={redacao.id} className="border-redator-accent/20 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-redator-primary text-sm line-clamp-2 flex-1">
                      {redacao.frase_tematica}
                    </h3>
                    <Badge className="bg-green-100 text-green-800 shrink-0 text-xs">
                      ✅ Corrigida
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-xs text-redator-accent">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Corretor: {redacao.corretor_nome}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(redacao.data_envio)}</span>
                    </div>
                    
                    {redacao.nota_total !== null && (
                      <div className="flex items-center gap-1 text-redator-primary font-medium">
                        <span>📊 Nota: {redacao.nota_total}/1000</span>
                      </div>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500 mt-2"
                    onClick={() => handleViewRedacao(redacao)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    👁️ Ver Correção
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {authenticatedRedacao && showRedacaoDialog && (
        <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetState();
          }
          setShowRedacaoDialog(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                ✅ {authenticatedRedacao.frase_tematica}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 p-3 rounded">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Sua redação corrigida está disponível para visualização.
                </p>
              </div>
              
              <RedacaoEnviadaCard 
                redacao={{
                  id: authenticatedRedacao.id,
                  frase_tematica: authenticatedRedacao.frase_tematica,
                  redacao_texto: authenticatedRedacao.redacao_texto,
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
                  turma: turmaCode,
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
