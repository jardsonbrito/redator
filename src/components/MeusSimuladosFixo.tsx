import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Calendar, User, FileText, Lock } from "lucide-react";
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
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
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

  // Query otimizada com as novas políticas RLS
  const { data: redacoesRecentes, isLoading } = useQuery({
    queryKey: ['redacoes-recentes-seguras', turmaCode],
    queryFn: async () => {
      console.log('🔒 Buscando redações com segurança aprimorada para:', turmaCode);
      
      if (turmaCode === "visitante" || turmaCode === "Visitante") {
        // Para visitantes, usar nova política segura
        const visitanteData = localStorage.getItem("visitanteData");
        if (!visitanteData) return [];
        
        const dados = JSON.parse(visitanteData);
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
            data_correcao
          `)
          .eq('email_aluno', dados.email)
          .eq('tipo_envio', 'visitante')
          .eq('corrigida', true)
          .order('data_envio', { ascending: false })
          .limit(3);
        
        if (error) {
          console.error('❌ Erro ao buscar redações do visitante:', error);
          return [];
        }
        
        console.log('✅ Redações corrigidas encontradas para visitante:', data);
        return data || [];
      } else {
        // Para alunos, usar nova política segura com função otimizada
        const codigoTurma = getTurmaCode(turmaCode);
        console.log('🔄 Código da turma convertido:', codigoTurma);
        
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
            data_correcao
          `)
          .eq('turma', codigoTurma)
          .neq('tipo_envio', 'visitante')
          .eq('corrigida', true)
          .order('data_envio', { ascending: false })
          .limit(3);
        
        if (error) {
          console.error('❌ Erro ao buscar redações da turma:', error);
          return [];
        }
        
        console.log('✅ Redações corrigidas encontradas para turma:', data);
        return data || [];
      }
    },
    enabled: !!turmaCode,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos para melhor performance
  });

  const handleViewCorrection = (redacao: RedacaoTurma) => {
    console.log('🔐 Iniciando fluxo seguro de visualização de correção');
    // Reset completo de estados para garantir segurança
    setAuthenticatedRedacao(null);
    setShowCorrecaoDialog(false);
    setSelectedRedacaoId(redacao.id);
    setEmailInput("");
    setIsAuthDialogOpen(true);
  };

  const handleEmailAuth = async () => {
    if (!selectedRedacaoId || !emailInput.trim()) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, digite o e-mail cadastrado na redação.",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    console.log('🔍 Iniciando validação segura de e-mail...');

    try {
      // ETAPA 1: Validação básica sem carregar dados sensíveis
      const { data: redacaoBasica, error: errorBasico } = await supabase
        .from('redacoes_enviadas')
        .select('id, email_aluno, frase_tematica, nome_aluno')
        .eq('id', selectedRedacaoId)
        .single();

      if (errorBasico) {
        console.error('❌ Erro ao validar redação:', errorBasico);
        throw new Error('Redação não encontrada ou inacessível');
      }

      // ETAPA 2: Verificação rigorosa de e-mail usando nova função segura
      const emailMatches = await supabase.rpc('can_access_redacao', {
        redacao_email: redacaoBasica.email_aluno,
        user_email: emailInput.trim()
      });

      // 🚨 VALIDAÇÃO RIGOROSA: deve ser exatamente true
      if (emailMatches.error || emailMatches.data !== true) {
        console.error('❌ Falha na validação de acesso:', emailMatches.error);
        toast({
          title: "E-mail incorreto. Acesso negado à correção.",
          description: "O e-mail digitado não corresponde ao cadastrado nesta redação.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ E-mail validado com sucesso');

      // ETAPA 3: SOMENTE após validação, buscar dados completos sensíveis
      const { data: redacaoCompleta, error: errorCompleto } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('id', selectedRedacaoId)
        .single();

      if (errorCompleto) {
        console.error('❌ Erro ao carregar correção completa:', errorCompleto);
        throw new Error('Erro ao carregar correção completa');
      }

      // ETAPA 4: Preparar dados APENAS após autenticação bem-sucedida
      const redacaoAutenticada: AuthenticatedRedacao = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacaoCompleta.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacaoCompleta.status,
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
      };

      // ETAPA 5: Fechar autenticação e exibir correção
      setIsAuthDialogOpen(false);
      setAuthenticatedRedacao(redacaoAutenticada);
      setShowCorrecaoDialog(true);
      
      console.log('🎉 Correção liberada com segurança total');
      toast({
        title: "Correção liberada!",
        description: "Agora você pode visualizar sua correção completa.",
      });

      // Log de auditoria automático via trigger criado na migração
      console.log('📝 Log de acesso registrado automaticamente');

    } catch (error) {
      console.error('💥 Erro na autenticação:', error);
      toast({
        title: "Erro na autenticação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao verificar o e-mail. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const resetAuthenticationState = () => {
    console.log('🔄 Resetando estados de autenticação');
    setSelectedRedacaoId(null);
    setAuthenticatedRedacao(null);
    setEmailInput("");
    setIsAuthDialogOpen(false);
    setShowCorrecaoDialog(false);
  };

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício', 
      'simulado': 'Simulado',
      'visitante': 'Avulsa'
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

  return (
    <>
      <div className="mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-1">
            <CardHeader className="bg-white/90 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30"></div>
                    <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      📝 Minhas Redações
                    </CardTitle>
                    <p className="text-muted-foreground font-medium">Acompanhe todas as suas redações corrigidas com segurança</p>
                  </div>
                </div>
                <Link to="/minhas-redacoes">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20 font-medium"
                  >
                    Ver Todas
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando redações com segurança...</p>
              </div>
            ) : !redacoesRecentes || redacoesRecentes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">Nenhuma redação corrigida ainda</p>
                <p className="text-sm text-muted-foreground">
                  Suas redações corrigidas aparecerão aqui quando disponíveis
                </p>
              </div>
            ) : (
              <>
                {redacoesRecentes.slice(0, 3).map((redacao) => (
                  <Card key={redacao.id} className="border border-primary/20 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-primary mb-2 leading-tight">
                            {redacao.frase_tematica}
                          </h4>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className="bg-green-100 text-green-800">
                              🔐 Corrigido
                            </Badge>
                            <Badge className={getTipoEnvioColor(redacao.tipo_envio)}>
                              {getTipoEnvioLabel(redacao.tipo_envio)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {redacao.nome_aluno}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(redacao.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-primary/30 hover:bg-primary/10"
                            onClick={() => handleViewCorrection(redacao)}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Ver Correção
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {redacoesRecentes.length >= 3 && (
                  <div className="text-center pt-4">
                    <Link to="/minhas-redacoes">
                      <Button 
                        variant="outline"
                        className="border-primary/30 hover:bg-primary/10"
                      >
                        Ver todas as redações
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de autenticação segura por email */}
      <Dialog open={isAuthDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetAuthenticationState();
        }
        setIsAuthDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <Lock className="w-5 h-5" />
              🔐 Acesso Seguro à Correção
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Segurança Aprimorada:</strong> Para visualizar sua correção, digite o e-mail exato que você usou no envio da redação.
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email-auth" className="block text-sm font-medium text-primary mb-2">
                E-mail de Acesso * (obrigatório)
              </label>
              <Input
                id="email-auth"
                type="email"
                placeholder="Digite o e-mail cadastrado..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="border-primary/30 focus:border-primary"
                disabled={isAuthenticating}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEmailAuth}
                disabled={isAuthenticating || !emailInput.trim()}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isAuthenticating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  "🔓 Acessar Correção"
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => resetAuthenticationState()}
                className="border-primary/30"
                disabled={isAuthenticating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização da correção - APENAS após autenticação completa */}
      {authenticatedRedacao && showCorrecaoDialog && (
        <Dialog open={showCorrecaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetAuthenticationState();
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
