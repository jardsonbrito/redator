import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Eye, Lock, AlertCircle, ArrowLeft, Search, Filter, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { Link } from "react-router-dom";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";

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

export default function MinhasRedacoesList() {
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<RedacaoTurma & { redacao_texto: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  const { data: redacoesTurma, isLoading, error } = useQuery({
    queryKey: ['redacoes-todas', studentData.userType, studentData.turma, studentData.visitanteInfo?.email],
    queryFn: async () => {
      console.log('Carregando redações - Tipo:', studentData.userType, 'Turma:', studentData.turma);
      
      if (studentData.userType === "aluno" && studentData.turma) {
        const codigoTurma = getTurmaCode(studentData.turma);
        console.log('Código da turma convertido:', codigoTurma);
        
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
          .order('data_envio', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar redações da turma:', error);
          throw error;
        }
        
        console.log('Redações encontradas:', data);
        return data as RedacaoTurma[] || [];
      } else if (studentData.userType === "visitante" && studentData.visitanteInfo?.email) {
        console.log('Buscando redações do visitante:', studentData.visitanteInfo.email);
        
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
          .eq('email_aluno', studentData.visitanteInfo.email)
          .eq('tipo_envio', 'visitante')
          .order('data_envio', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar redações do visitante:', error);
          throw error;
        }
        
        console.log('Redações do visitante encontradas:', data);
        return data as RedacaoTurma[] || [];
      }
      
      return [];
    },
    enabled: !!(studentData.userType && (studentData.turma || studentData.visitanteInfo?.email)),
  });

  const handleViewRedacao = (redacao: RedacaoTurma) => {
    console.log('🔐 Iniciando fluxo SEGURO para visualização de redação');
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
      const redacaoBasica = redacoesTurma?.find(r => r.id === selectedRedacaoId);
      if (!redacaoBasica) {
        throw new Error('Redação não encontrada');
      }

      // ETAPA 2: Verificação rigorosa de e-mail usando função segura
      const emailMatches = await supabase.rpc('can_access_redacao', {
        redacao_email: redacaoBasica.email_aluno,
        user_email: emailInput.trim()
      });

      // 🚨 VALIDAÇÃO RIGOROSA: deve ser exatamente true  
      if (emailMatches.error || emailMatches.data !== true) {
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
      const redacaoAutenticada: RedacaoTurma & { redacao_texto: string } = {
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
    setFiltroNome("");
  };

  // Aplicar filtros
  const redacoesFiltradas = redacoesTurma?.filter(redacao => {
    const tipoMatch = !filtroTipo || filtroTipo === 'all' || redacao.tipo_envio === filtroTipo;
    const statusMatch = !filtroStatus || filtroStatus === 'all' || (filtroStatus === 'corrigida' ? redacao.corrigida : !redacao.corrigida);
    const nomeMatch = !filtroNome || redacao.nome_aluno.toLowerCase().includes(filtroNome.toLowerCase());
    
    let dataMatch = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataRedacao = new Date(redacao.data_envio);
      const dataInicio = filtroDataInicio ? new Date(filtroDataInicio) : null;
      const dataFim = filtroDataFim ? new Date(filtroDataFim) : null;
      
      if (dataInicio && dataRedacao < dataInicio) dataMatch = false;
      if (dataFim && dataRedacao > dataFim) dataMatch = false;
    }
    
    return tipoMatch && statusMatch && nomeMatch && dataMatch;
  }) || [];

  if (!studentData.userType) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
            <StudentHeader pageTitle="Minhas Redações" />
            <div className="max-w-6xl mx-auto px-4 py-8">
              <Card className="border-primary/20">
                <CardContent className="text-center py-8">
                  <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                  <p className="text-primary">
                    Faça login como aluno ou visitante para visualizar suas redações.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
          <StudentHeader pageTitle="Minhas Redações" />
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
            {/* Header elegante - melhorado para mobile */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <Link to="/app" className="self-start sm:self-auto">
            <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Voltar</span>
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 flex-1 justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30"></div>
              <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Minhas Redações
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {studentData.userType === "aluno" ? 
                  `Todas as redações da ${studentData.turma}` : 
                  "Todas as suas redações enviadas"
                }
              </p>
            </div>
          </div>
          
          <div className="w-20 hidden sm:block"></div> {/* Spacer para centralização apenas em desktop */}
        </div>

        {/* Botão de filtros - melhorado para mobile */}
        <div className="mb-6 flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 border-primary/30 hover:bg-primary/10 text-sm"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
        </div>

        {/* Filtros colapsáveis - melhorado para mobile */}
        {showFilters && (
          <Card className="mb-6 sm:mb-8 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Search className="w-5 h-5" />
                Filtros de Pesquisa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium mb-2">Nome do Aluno</label>
                  <Input
                    placeholder="Buscar por nome..."
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    className="border-primary/30 focus:border-primary"
                  />
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
                  className="border-primary/30 hover:bg-primary/10 text-sm"
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
            <p className="text-primary text-lg">Carregando redações...</p>
          </div>
        ) : error ? (
          <Card className="border-red-200">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">Erro ao carregar redações.</p>
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
              {(filtroTipo || filtroStatus || filtroNome || filtroDataInicio || filtroDataFim) && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="border-primary/30 hover:bg-primary/10 text-sm"
                >
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Lista de Redações - completamente otimizada para mobile */
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <p className="text-muted-foreground text-sm sm:text-lg">
                {redacoesFiltradas.length} redação(ões) encontrada(s)
              </p>
            </div>
            
            {redacoesFiltradas.map((redacao) => (
              <Card key={redacao.id} className="border-primary/20 hover:shadow-xl transition-all duration-300 hover:border-primary/40">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {/* Header do card - restruturado para mobile */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <h3 className="font-bold text-lg sm:text-xl text-primary leading-tight pr-2">
                          {redacao.frase_tematica}
                        </h3>
                        
                        {/* Badges - melhor espaçamento no mobile */}
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {redacao.corrigida ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              🔓 Corrigido
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              ⏳ Aguardando
                            </Badge>
                          )}
                          <Badge className={`${getTipoEnvioColor(redacao.tipo_envio)} text-xs`}>
                            {getTipoEnvioLabel(redacao.tipo_envio)}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Informações do aluno - layout mobile otimizado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                          <span className="font-medium">Aluno:</span> 
                          <span className="truncate">{redacao.nome_aluno}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium">Enviado:</span> 
                          <span className="text-xs sm:text-sm">{formatDate(redacao.data_envio)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Ação - botão otimizado para mobile */}
                    <div className="flex justify-end pt-2 border-t border-muted/20">
                      {redacao.corrigida ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-primary/30 hover:bg-primary/10 hover:border-primary w-full sm:w-auto"
                          onClick={() => handleViewRedacao(redacao)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Correção
                        </Button>
                      ) : (
                        <div className="w-full sm:w-auto">
                          <div className="px-3 py-2 text-sm text-center sm:text-left text-muted-foreground border border-muted rounded-md bg-muted/10">
                            Aguardando correção
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de autenticação - melhorado para mobile */}
        <Dialog open={isAuthDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetAuthenticationState();
          }
          setIsAuthDialogOpen(open);
        }}>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5" />
                🔐 Acesso Seguro à Redação
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
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

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleEmailAuth}
                  disabled={isAuthenticating || !emailInput.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90 order-2 sm:order-1"
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
                  className="border-primary/30 order-1 sm:order-2"
                  disabled={isAuthenticating}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de visualização da redação - otimizado para mobile */}
        {authenticatedRedacao && showRedacaoDialog && (
          <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
            if (!open) {
              resetAuthenticationState();
            }
            setShowRedacaoDialog(open);
          }}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-primary text-lg sm:text-xl">
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
                    turma: studentData.userType === "aluno" ? (studentData.turma || "") : "visitante",
                  }} 
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  </TooltipProvider>
</ProtectedRoute>
  );
}
