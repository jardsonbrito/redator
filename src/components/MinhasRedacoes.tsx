import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, Lock, AlertCircle, Shield } from "lucide-react";
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
};

type AuthenticatedRedacao = RedacaoTurma & {
  redacao_texto: string;
};

export const MinhasRedacoes = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoTurma | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const { toast } = useToast();

  // Recupera dados do usuário com validação aprimorada
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determinar código da turma ou email do visitante
  let turmaCode = "";
  let visitanteEmail = "";
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "";
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      visitanteEmail = dados.email;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  // Query com segurança aprimorada usando novas políticas RLS
  const { data: redacoesTurma, isLoading, error } = useQuery({
    queryKey: ['redacoes-usuario-seguras', turmaCode, visitanteEmail],
    queryFn: async () => {
      console.log('🔒 Buscando redações com segurança aprimorada');
      
      if (userType === "aluno" && turmaCode) {
        console.log('👨‍🎓 Buscando redações da turma:', turmaCode);
        const { data, error } = await supabase
          .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
        
        if (error) {
          console.error('❌ Erro ao buscar redações da turma:', error);
          throw error;
        }
        
        console.log('✅ Redações da turma encontradas:', data?.length || 0);
        return data as RedacaoTurma[] || [];
      } else if (userType === "visitante" && visitanteEmail) {
        console.log('👤 Buscando redações do visitante:', visitanteEmail);
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
          .eq('email_aluno', visitanteEmail)
          .eq('tipo_envio', 'visitante')
          .order('data_envio', { ascending: false });
        
        if (error) {
          console.error('❌ Erro ao buscar redações do visitante:', error);
          throw error;
        }
        
        console.log('✅ Redações do visitante encontradas:', data?.length || 0);
        return data as RedacaoTurma[] || [];
      }
      
      return [];
    },
    enabled: !!(turmaCode || visitanteEmail),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const handleViewRedacao = (redacao: RedacaoTurma) => {
    console.log('🔐 Iniciando fluxo seguro para visualização de redação');
    setSelectedRedacao(redacao);
    setAuthenticatedRedacao(null);
    setShowRedacaoDialog(false);
    setEmailInput("");
    setIsDialogOpen(true);
  };

  const handleEmailAuth = async () => {
    if (!selectedRedacao || !emailInput.trim()) {
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
      // Usar nova função segura para validar acesso
      const { data: canAccess, error } = await supabase.rpc('can_access_redacao', {
        redacao_email: selectedRedacao.email_aluno,
        user_email: emailInput.trim()
      });

      if (error || !canAccess) {
        console.error('❌ Falha na validação de acesso:', error);
        toast({
          title: "E-mail incorreto",
          description: "O e-mail digitado não corresponde ao cadastrado nesta redação.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ E-mail validado com sucesso');

      // SOMENTE após validação, buscar texto completo da redação
      const { data: redacaoCompleta, error: errorCompleta } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('id', selectedRedacao.id)
        .single();

      if (errorCompleta) {
        console.error('❌ Erro ao buscar redação completa:', errorCompleta);
        throw new Error('Erro ao carregar redação completa');
      }

      // Preparar dados completos APENAS após autenticação
      const redacaoComTexto: AuthenticatedRedacao = {
        ...selectedRedacao,
        redacao_texto: redacaoCompleta.redacao_texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
      };

      // Fechar dialog de autenticação e exibir redação
      setIsDialogOpen(false);
      setAuthenticatedRedacao(redacaoComTexto);
      setShowRedacaoDialog(true);
      
      console.log('🎉 Redação liberada com segurança total');
      toast({
        title: "Redação liberada!",
        description: "Agora você pode visualizar sua redação completa.",
      });

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
    setSelectedRedacao(null);
    setAuthenticatedRedacao(null);
    setEmailInput("");
    setIsDialogOpen(false);
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

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício',
      'simulado': 'Simulado',
      'visitante': 'Visitante'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  if (!turmaCode && !visitanteEmail) {
    return (
      <Card className="border-redator-accent/20">
        <CardContent className="text-center py-8">
          <Shield className="w-12 h-12 text-redator-accent mx-auto mb-4" />
          <p className="text-redator-accent">
            🔐 Faça login como aluno ou visitante para visualizar suas redações com segurança.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
        <p className="text-redator-accent">🔒 Carregando suas redações com segurança...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">❌ Erro ao carregar suas redações. Tente novamente.</p>
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
            {userType === "aluno" ? 
              `Ainda não há redações da sua turma (${alunoTurma}).` : 
              "Você ainda não enviou nenhuma redação."
            }
          </p>
          <p className="text-sm text-redator-accent/70">
            Envie uma redação para começar a ver as correções aqui!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-redator-primary" />
          <h2 className="text-2xl font-bold text-redator-primary">
            {userType === "aluno" ? 
              `🔐 Minhas Redações - ${alunoTurma} (${redacoesTurma.length})` : 
              `🔐 Minhas Redações (${redacoesTurma.length})`
            }
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {redacoesTurma.map((redacao) => (
            <Card key={redacao.id} className="border-redator-accent/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-redator-primary text-sm line-clamp-2">
                      {redacao.frase_tematica}
                    </h3>
                    {redacao.corrigida ? (
                      <Badge className="bg-green-100 text-green-800 shrink-0 text-xs">✅ Corrigida</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 shrink-0 text-xs">⏳ Aguardando</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-xs text-redator-accent">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Aluno:</span>
                      <span>{redacao.nome_aluno}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Tipo:</span>
                      <span>{getTipoEnvioLabel(redacao.tipo_envio)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(redacao.data_envio)}</span>
                    </div>
                    
                    {redacao.corrigida && redacao.nota_total !== null && (
                      <div className="flex items-center gap-1 text-redator-primary font-medium">
                        <span>📊 Nota: {redacao.nota_total}/1000</span>
                      </div>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-redator-accent/50 text-redator-primary hover:bg-redator-accent/10"
                    onClick={() => handleViewRedacao(redacao)}
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    🔐 Ver Redação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialog de autenticação segura por email */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetAuthenticationState();
        }
        setIsDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-redator-primary">🔐 Acesso Seguro à Redação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Segurança Aprimorada:</strong> Para ver sua redação, digite o e-mail exato usado no envio.
                </div>
              </div>
            </div>

            {selectedRedacao && (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Redação:</span> {selectedRedacao.frase_tematica}</p>
                <p><span className="font-medium">Autor:</span> {selectedRedacao.nome_aluno}</p>
              </div>
            )}

            <div>
              <label htmlFor="email-auth" className="block text-sm font-medium text-redator-primary mb-2">
                E-mail de Acesso * (obrigatório)
              </label>
              <Input
                id="email-auth"
                type="email"
                placeholder="Digite o e-mail cadastrado..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="border-redator-accent/30 focus:border-redator-accent"
                disabled={isAuthenticating}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEmailAuth}
                disabled={isAuthenticating || !emailInput.trim()}
                className="flex-1 bg-redator-primary hover:bg-redator-primary/90"
              >
                {isAuthenticating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  "🔓 Acessar Redação"
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => resetAuthenticationState()}
                className="border-redator-accent/50"
                disabled={isAuthenticating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização da redação - APENAS após autenticação completa */}
      {authenticatedRedacao && showRedacaoDialog && (
        <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetAuthenticationState();
          }
          setShowRedacaoDialog(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary">
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
                  turma: userType === "aluno" ? turmaCode : "visitante",
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
