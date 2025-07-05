import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Eye, ArrowLeft, Search, Filter, FolderOpen, User, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { Link } from "react-router-dom";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { linkOldEssaysToStudents } from "@/utils/linkOldEssays";

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
  comentario_c1_corretor_1: string;
  comentario_c2_corretor_1: string;
  comentario_c3_corretor_1: string;
  comentario_c4_corretor_1: string;
  comentario_c5_corretor_1: string;
  elogios_pontos_atencao_corretor_1: string;
  comentario_c1_corretor_2: string;
  comentario_c2_corretor_2: string;
  comentario_c3_corretor_2: string;
  comentario_c4_corretor_2: string;
  comentario_c5_corretor_2: string;
  elogios_pontos_atencao_corretor_2: string;
};

export default function MinhasRedacoesList() {
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<RedacaoTurma & { redacao_texto: string } | null>(null);
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

  // Determinar email do usuário logado
  let currentUserEmail = "";
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    const codigoTurma = turmasMap[alunoTurma as keyof typeof turmasMap] || "";
    currentUserEmail = `aluno.${codigoTurma.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      currentUserEmail = dados.email;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  // Executar vinculação de redações antigas na inicialização
  useEffect(() => {
    const initializeOldEssays = async () => {
      await linkOldEssaysToStudents();
    };
    initializeOldEssays();
  }, []);

  const { data: redacoesTurma, isLoading, error } = useQuery({
    queryKey: ['redacoes-todas-usuario', currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) {
        console.log('❌ Nenhum e-mail de usuário identificado');
        return [];
      }

      console.log('🔍 Carregando todas as redações do usuário:', currentUserEmail);
      
      // Buscar redações regulares
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
        .order('data_envio', { ascending: false });
      
      if (errorRegulares) {
        console.error('❌ Erro ao buscar redações regulares:', errorRegulares);
      }

      // Buscar redações de simulado
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
        .order('data_envio', { ascending: false });

      if (errorSimulado) {
        console.error('❌ Erro ao buscar redações de simulado:', errorSimulado);
      }

      // Combinar dados
      const todasRedacoes: RedacaoTurma[] = [];
      
      if (redacoesRegulares) {
        const regularesFormatadas = redacoesRegulares.map(redacao => ({
          ...redacao,
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...regularesFormatadas);
      }

      if (redacoesSimulado) {
        const simuladosFormatados = redacoesSimulado.map(simulado => ({
          id: simulado.id,
          frase_tematica: (simulado.simulados as any)?.frase_tematica || 'Simulado',
          nome_aluno: simulado.nome_aluno,
          email_aluno: simulado.email_aluno,
          tipo_envio: 'simulado',
          data_envio: simulado.data_envio,
          status: simulado.corrigida ? 'corrigida' : 'aguardando',
          corrigida: simulado.corrigida,
          nota_total: simulado.nota_total,
          comentario_admin: null,
          data_correcao: simulado.data_correcao,
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...simuladosFormatados);
      }

      console.log('✅ Total de redações encontradas:', todasRedacoes.length);
      return todasRedacoes || [];
    },
    enabled: !!currentUserEmail,
  });

  const handleViewRedacao = async (redacao: RedacaoTurma) => {
    console.log('🔐 Acessando redação:', redacao.id);
    
    try {
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

      const redacaoAutenticada: RedacaoTurma & { redacao_texto: string } = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacao.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacao.status,
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        corretor_nome: redacao.corretor_nome,
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
      };

      setAuthenticatedRedacao(redacaoAutenticada);
      setShowRedacaoDialog(true);
      
      toast({
        title: "Redação carregada!",
        description: "Visualizando sua redação completa.",
      });

    } catch (error) {
      console.error('💥 Erro ao carregar redação:', error);
      toast({
        title: "Erro ao carregar redação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetState = () => {
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

  if (!currentUserEmail) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
            <StudentHeader pageTitle="Minhas Redações" />
            <div className="max-w-6xl mx-auto px-4 py-8">
              <Card className="border-primary/20">
                <CardContent className="text-center py-8">
                  <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
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
            {/* Header elegante */}
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
                    Todas as suas redações enviadas
                  </p>
                </div>
              </div>
              
              <div className="w-20 hidden sm:block"></div>
            </div>

            {/* Botão de filtros */}
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

            {/* Filtros colapsáveis */}
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

            {/* States */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-primary text-lg">Carregando redações...</p>
              </div>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="text-center py-8">
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
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <h3 className="font-bold text-lg sm:text-xl text-primary leading-tight pr-2">
                              {redacao.frase_tematica}
                            </h3>
                            
                            <div className="flex flex-wrap gap-2 shrink-0">
                              {redacao.corrigida ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  ✅ Corrigido
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  ⏳ Pendente
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-medium">Enviado:</span> 
                              <span className="text-xs sm:text-sm">{formatDate(redacao.data_envio)}</span>
                            </div>
                            {redacao.corrigida && redacao.nota_total && (
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500 shrink-0" />
                                <span className="font-medium">Nota:</span> 
                                <span className="font-bold text-green-600">{redacao.nota_total}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
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

            {/* Modal de visualização da redação */}
            {authenticatedRedacao && showRedacaoDialog && (
              <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
                if (!open) {
                  resetState();
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
                        turma: userType === "aluno" ? (alunoTurma || "") : "visitante",
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
                      }}
                      showStudentInfo={false}
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
