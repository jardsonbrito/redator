import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, ArrowLeft, Search, Filter, FolderOpen, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { Link, Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type StudentRedacao = {
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
};

type AuthenticatedRedacao = StudentRedacao & {
  redacao_texto: string;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
};

export default function StudentRedacoes() {
  const { studentProfile, isAuthenticated } = useSupabaseAuth();
  const { toast } = useToast();

  // Estados para autenticação segura
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);

  // Estados para filtros
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Query segura - apenas dados básicos
  const { data: redacoes, isLoading, error } = useQuery({
    queryKey: ['student-all-redacoes', studentProfile?.email],
    queryFn: async () => {
      if (!studentProfile?.email) return [];

      console.log('🔍 Carregando todas as redações do aluno:', studentProfile.email);
      
      const { data, error } = await supabase
        .rpc('get_student_redacoes', { 
          student_email: studentProfile.email 
        });

      if (error) {
        console.error('❌ Erro ao buscar redações:', error);
        throw error;
      }

      console.log('✅ Redações carregadas:', data?.length || 0);
      return data as StudentRedacao[] || [];
    },
    enabled: isAuthenticated && !!studentProfile?.email,
  });

  // Redirecionar se não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/student-auth" replace />;
  }

  const handleViewRedacao = (redacao: StudentRedacao) => {
    console.log('🔐 Iniciando fluxo seguro para visualização de redação');
    // Reset completo de estados para garantir segurança
    setAuthenticatedRedacao(null);
    setShowRedacaoDialog(false);
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
      const redacaoBasica = redacoes?.find(r => r.id === selectedRedacaoId);
      if (!redacaoBasica) {
        throw new Error('Redação não encontrada');
      }

      // ETAPA 2: Verificação rigorosa de e-mail usando função segura
      const emailMatches = await supabase.rpc('can_access_redacao', {
        redacao_email: redacaoBasica.email_aluno,
        user_email: emailInput.trim()
      });

      if (emailMatches.error || !emailMatches.data) {
        console.error('❌ Falha na validação de acesso:', emailMatches.error);
        toast({
          title: "E-mail incorreto. Acesso negado à redação.",
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
        console.error('❌ Erro ao carregar redação completa:', errorCompleto);
        throw new Error('Erro ao carregar redação completa');
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

      // ETAPA 5: Fechar autenticação e exibir redação
      setIsAuthDialogOpen(false);
      setAuthenticatedRedacao(redacaoAutenticada);
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

  const clearFilters = () => {
    setFiltroTipo("all");
    setFiltroStatus("all");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  // Aplicar filtros
  const redacoesFiltradas = redacoes?.filter(redacao => {
    const tipoMatch = !filtroTipo || filtroTipo === 'all' || redacao.tipo_envio === filtroTipo;
    const statusMatch = !filtroStatus || filtroStatus === 'all' || (filtroStatus === 'corrigida' ? redacao.corrigida : !redacao.corrigida);
    
    let dataMatch = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataRedacao = new Date(redacao.data_envio);
      const dataInicio = filtroDataInicio ? new Date(filtroDataInicio) : null;
      const dataFim = filtroDataFim ? new Date(filtroDataFim) : null;
      
      if (dataInicio && dataRedacao < dataInicio) dataMatch = false;
      if (dataFim && dataRedacao > dataFim) dataMatch = false;
    }
    
    return tipoMatch && statusMatch && dataMatch;
  }) || [];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link to="/app">
              <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 flex-1 justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30"></div>
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Minhas Redações
                </h1>
                <p className="text-muted-foreground">
                  Todas as suas redações enviadas - {studentProfile?.nome} {studentProfile?.sobrenome}
                </p>
              </div>
            </div>
            
            <div className="w-20"></div> {/* Spacer para centralização */}
          </div>

          {/* Botão de filtros */}
          <div className="mb-6 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 border-primary/30 hover:bg-primary/10"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </Button>
          </div>

          {/* Filtros colapsáveis */}
          {showFilters && (
            <Card className="mb-8 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Search className="w-5 h-5" />
                  Filtros de Pesquisa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Envio</label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="border-primary/30">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="simulado">Simulado</SelectItem>
                        <SelectItem value="exercicio">Exercício</SelectItem>
                        <SelectItem value="visitante">Avulsa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="border-primary/30">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="corrigida">Corrigido</SelectItem>
                        <SelectItem value="aguardando">Aguardando</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Data Início</label>
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="border-primary/30 focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Data Fim</label>
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="border-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading/Error/Empty States */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-primary text-lg">Carregando suas redações...</p>
            </div>
          ) : error ? (
            <Card className="border-red-200">
              <CardContent className="text-center py-8">
                <p className="text-red-600 mb-4">Erro ao carregar suas redações.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          ) : !redacoesFiltradas || redacoesFiltradas.length === 0 ? (
            <Card className="border-primary/20">
              <CardContent className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                <p className="text-primary/70 mb-4 text-lg">
                  Nenhuma redação encontrada.
                </p>
                {(filtroTipo !== 'all' || filtroStatus !== 'all' || filtroDataInicio || filtroDataFim) && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Lista de Redações */
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground text-lg">
                  {redacoesFiltradas.length} redação(ões) encontrada(s)
                </p>
              </div>
              
              {redacoesFiltradas.map((redacao) => (
                <Card key={redacao.id} className="border-primary/20 hover:shadow-xl transition-all duration-300 hover:border-primary/40">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-xl text-primary leading-tight">
                            {redacao.frase_tematica}
                          </h3>
                          <div className="flex gap-2 shrink-0">
                            {redacao.corrigida ? (
                              <Badge className="bg-green-100 text-green-800">✅ Corrigido</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">⏳ Aguardando</Badge>
                            )}
                            <Badge className={getTipoEnvioColor(redacao.tipo_envio)}>
                              {getTipoEnvioLabel(redacao.tipo_envio)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">Enviado em:</span> {formatDate(redacao.data_envio)}
                          </div>
                          {redacao.data_correcao && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Corrigido em:</span> {formatDate(redacao.data_correcao)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {redacao.corrigida ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-primary/30 hover:bg-primary/10 hover:border-primary shrink-0"
                          onClick={() => handleViewRedacao(redacao)}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Ver Correção
                        </Button>
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground border border-muted rounded-md">
                          Aguardando correção
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog de autenticação RIGOROSA por email */}
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
              🔐 Acesso Seguro à Redação
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Segurança Máxima:</strong> Para visualizar sua redação, digite o e-mail exato usado no envio. Os dados só são carregados após validação.
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
                  "🔓 Acessar Redação"
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
                  turma: studentProfile?.turma || "",
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}