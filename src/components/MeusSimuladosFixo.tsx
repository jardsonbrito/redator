
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";

interface MeusSimuladosFixoProps {
  turmaCode: string;
}

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

export const MeusSimuladosFixo = ({ turmaCode }: MeusSimuladosFixoProps) => {
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [showCorrecaoDialog, setShowCorrecaoDialog] = useState(false);
  const { toast } = useToast();

  // Mapear nomes de turma para códigos corretos
  const getTurmaCode = (turmaNome: string) => {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    return turmasMap[turmaNome as keyof typeof turmasMap] || turmaNome;
  };

  // Determinar email do usuário logado
  let currentUserEmail = "";
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  if (userType === "aluno" && alunoTurma) {
    const codigoTurma = getTurmaCode(alunoTurma);
    currentUserEmail = `aluno.${codigoTurma.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      currentUserEmail = dados.email;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  // Query otimizada filtrando apenas pelo email do usuário logado
  const { data: redacoesRecentes, isLoading } = useQuery({
    queryKey: ['redacoes-recentes-usuario', currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) {
        console.log('❌ Nenhum e-mail de usuário identificado');
        return [];
      }

      console.log('🔒 Buscando redações do usuário:', currentUserEmail);
      
      // Buscar da tabela redacoes_enviadas
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
        .eq('corrigida', true)
        .order('data_envio', { ascending: false });

      if (errorRegulares) {
        console.error('❌ Erro ao buscar redações regulares:', errorRegulares);
      }

      // Buscar da tabela redacoes_simulado
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
        .eq('corrigida', true)
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
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...regularesFormatadas);
      }

      // Adicionar redações de simulado (formatadas)
      if (redacoesSimulado) {
        const simuladosFormatados = redacoesSimulado.map(simulado => ({
          id: simulado.id,
          frase_tematica: (simulado.simulados as any)?.frase_tematica || 'Simulado',
          nome_aluno: simulado.nome_aluno,
          email_aluno: simulado.email_aluno,
          tipo_envio: 'simulado',
          data_envio: simulado.data_envio,
          status: 'corrigido',
          corrigida: simulado.corrigida,
          nota_total: simulado.nota_total,
          comentario_admin: null,
          data_correcao: simulado.data_correcao,
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...simuladosFormatados);
      }

      // Ordenar por data de envio (mais recente primeiro) e limitar a 3
      todasRedacoes.sort((a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime());
      
      console.log('✅ Redações encontradas para o usuário:', todasRedacoes.length);
      return todasRedacoes.slice(0, 3);
    },
    enabled: !!currentUserEmail,
    staleTime: 5 * 60 * 1000,
  });

  const handleViewCorrection = async (redacao: RedacaoTurma) => {
    console.log('🔐 Acessando correção autenticada:', redacao.id);
    
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
      setShowCorrecaoDialog(true);
      
      toast({
        title: "Correção liberada!",
        description: "Agora você pode visualizar sua correção completa.",
      });

    } catch (error) {
      console.error('💥 Erro ao carregar correção:', error);
      toast({
        title: "Erro ao carregar correção",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetState = () => {
    console.log('🔄 Resetando estados');
    setAuthenticatedRedacao(null);
    setShowCorrecaoDialog(false);
  };

  return (
    <>
      {/* Container com visibilidade garantida */}
      <div className="w-full block visible opacity-100 mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-visible">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-1">
            <CardHeader className="bg-white/90 rounded-t-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30"></div>
                    <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      📝 Minhas Redações
                    </CardTitle>
                    <p className="text-muted-foreground font-medium text-sm sm:text-base">Suas redações corrigidas mais recentes</p>
                  </div>
                </div>
                <Link to="/minhas-redacoes" className="shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20 font-medium w-full sm:w-auto"
                  >
                    Ver Todas
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="space-y-4 p-4 sm:p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="mt-4 text-muted-foreground">Carregando suas redações...</p>
              </div>
            ) : !redacoesRecentes || redacoesRecentes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">Você ainda não enviou nenhuma redação</p>
                <p className="text-sm text-muted-foreground">
                  Suas redações corrigidas aparecerão aqui quando disponíveis
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {redacoesRecentes.map((redacao) => (
                  <Card key={redacao.id} className="border border-primary/20 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-2">
                        {/* Linha 1: Título e Status */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-primary leading-tight break-words flex-1">
                            {redacao.frase_tematica}
                          </h4>
                          <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                            ✅ Corrigido
                          </Badge>
                        </div>
                        
                        {/* Linha 2: Corretor */}
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            Corretor: {redacao.corretor_nome}
                          </span>
                        </div>
                        
                        {/* Linha 3: Data e Nota */}
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(redacao.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                          </div>
                          {redacao.nota_total && (
                            <Badge variant="outline" className="text-xs">
                              📊 {redacao.nota_total}/1000
                            </Badge>
                          )}
                        </div>
                        
                        {/* Linha 4: Botão */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-primary/30 hover:bg-primary/10 w-full mt-1"
                          onClick={() => handleViewCorrection(redacao)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver Correção
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {redacoesRecentes.length >= 3 && (
                  <div className="text-center pt-2">
                    <Link to="/minhas-redacoes">
                      <Button 
                        variant="outline"
                        className="border-primary/30 hover:bg-primary/10 w-full sm:w-auto"
                      >
                        Ver todas as redações
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de visualização da correção */}
      {authenticatedRedacao && showCorrecaoDialog && (
        <Dialog open={showCorrecaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetState();
          }
          setShowCorrecaoDialog(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">
                ✅ {authenticatedRedacao.frase_tematica}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
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
                  turma: turmaCode === "visitante" ? "visitante" : turmaCode,
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
