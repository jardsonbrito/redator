import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, Lock, AlertCircle, ArrowLeft, FolderOpen, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { Link } from "react-router-dom";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getStatusColor, getStatusLabel } from "@/utils/redacaoUtils";

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
  redacao_manuscrita_url?: string | null;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  // Campos para comentários pedagógicos
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
};

export default function MinhasRedacoesList() {
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<RedacaoTurma | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Obter dados do usuário logado
  const userType = localStorage.getItem("userType");
  const alunoData = localStorage.getItem("alunoData");
  const visitanteData = localStorage.getItem("visitanteData");
  
  let alunoEmail = "";
  let visitanteEmail = "";
  
  if (userType === "aluno" && alunoData) {
    try {
      const dados = JSON.parse(alunoData);
      alunoEmail = dados.email;
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

  const { data: redacoesTurma, isLoading, error, refetch } = useQuery({
    queryKey: ['redacoes-usuario-logado', alunoEmail, visitanteEmail],
    queryFn: async () => {
      console.log('🔒 Buscando redações do usuário logado');
      
      if (userType === "aluno" && alunoEmail) {
        console.log('👨‍🎓 Buscando redações de aluno usando função get_student_redacoes:', alunoEmail);
        
        const { data, error } = await supabase.rpc('get_student_redacoes', {
          student_email: alunoEmail.toLowerCase().trim()
        });

        if (error) {
          console.error('❌ Erro ao buscar redações do aluno:', error);
          throw error;
        }

        console.log('✅ Total de redações encontradas para aluno:', data?.length || 0);
        return data || [];
        
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
          .ilike('email_aluno', visitanteEmail.toLowerCase().trim())
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
    enabled: !!(alunoEmail || visitanteEmail),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const handleViewRedacao = (redacao: RedacaoTurma) => {
    console.log('🔐 Iniciando fluxo SEGURO para visualização de redação');
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
      const redacaoBasica = redacoesTurma?.find(r => r.id === selectedRedacaoId);
      if (!redacaoBasica) {
        throw new Error('Redação não encontrada');
      }

      // Verificação rigorosa de e-mail
      const emailMatches = await supabase.rpc('can_access_redacao', {
        redacao_email: redacaoBasica.email_aluno,
        user_email: emailInput.trim()
      });

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

      // Buscar dados COMPLETOS da redação incluindo comentários pedagógicos
      let redacaoCompleta;
      
      if (redacaoBasica.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select(`
            *,
            simulados!inner(frase_tematica)
          `)
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

      // Estruturar dados completos para o RedacaoEnviadaCard
      const redacaoAutenticada: RedacaoTurma = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacaoBasica.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacaoBasica.status,
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
        // Incluir TODOS os campos de comentários pedagógicos
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
        correcao_arquivo_url_corretor_1: redacaoCompleta.correcao_arquivo_url_corretor_1,
        correcao_arquivo_url_corretor_2: redacaoCompleta.correcao_arquivo_url_corretor_2,
      };

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

  // Filtrar redações com base no termo de busca
  const filteredRedacoes = useMemo(() => {
    if (!redacoesTurma) return [];
    
    if (!searchTerm.trim()) return redacoesTurma;
    
    const termo = searchTerm.toLowerCase().trim();
    return redacoesTurma.filter(redacao => 
      redacao.nome_aluno.toLowerCase().includes(termo) ||
      redacao.email_aluno.toLowerCase().includes(termo) ||
      redacao.frase_tematica.toLowerCase().includes(termo)
    );
  }, [redacoesTurma, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredRedacoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRedacoes = filteredRedacoes.slice(startIndex, endIndex);

  // Reset page quando busca muda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Gerar números de página para exibir
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  // Validação se há usuário logado
  if (!alunoEmail && !visitanteEmail) {
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
                </div>
              </div>
              
              <div className="w-20 hidden sm:block"></div>
            </div>

            {/* Estados de carregamento/erro/vazio */}
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
                  <Button variant="outline" onClick={() => refetch()}>
                    Tentar Novamente
                  </Button>
                </CardContent>
              </Card>
            ) : !redacoesTurma || redacoesTurma.length === 0 ? (
              <Card className="border-primary/20">
                <CardContent className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                  <p className="text-primary/70 mb-4 text-lg">
                    Nenhuma redação encontrada.
                  </p>
                  <p className="text-sm text-primary/50">
                    Suas redações aparecerão aqui após o envio.
                  </p>
                  <Button onClick={() => refetch()} className="mt-4">
                    Verificar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Lista de Redações */
              <div className="space-y-4 sm:space-y-6">
                {/* Filtro de busca */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, e-mail ou tema..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 border-primary/30 focus:border-primary"
                    />
                  </div>
                  <Button onClick={() => refetch()} variant="outline" size="sm" className="shrink-0">
                    Atualizar
                  </Button>
                </div>

                {/* Contador de resultados */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {filteredRedacoes.length} redação(ões) encontrada(s)
                    {searchTerm && ` para "${searchTerm}"`}
                  </p>
                </div>

                {/* Lista de redações */}
                {currentRedacoes.length === 0 ? (
                  <Card className="border-primary/20">
                    <CardContent className="text-center py-12">
                      <Search className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                      <p className="text-primary/70 mb-2 text-lg">
                        Nenhuma redação encontrada
                      </p>
                      <p className="text-sm text-primary/50">
                        Tente ajustar os termos de busca
                      </p>
                      <Button 
                        onClick={() => handleSearchChange("")} 
                        variant="outline" 
                        className="mt-4"
                      >
                        Limpar busca
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {currentRedacoes.map((redacao) => (
                      <Card key={redacao.id} className="border-primary/20 hover:shadow-xl transition-all duration-300 hover:border-primary/40">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                            {/* Informações da redação */}
                            <div className="flex-1">
                              <h3 className="font-bold text-lg sm:text-xl text-primary mb-2 line-clamp-2">
                                {redacao.frase_tematica}
                              </h3>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge className={getTipoEnvioColor(redacao.tipo_envio)}>
                                  {getTipoEnvioLabel(redacao.tipo_envio)}
                                </Badge>
                                <Badge className={getStatusColor(redacao.status, redacao.corrigida)}>
                                  {getStatusLabel(redacao.status, redacao.corrigida)}
                                </Badge>
                              </div>

                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Aluno:</span>
                                  <span>{redacao.nome_aluno}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Enviado em {formatDate(redacao.data_envio)}</span>
                                </div>
                                {redacao.data_correcao && (
                                  <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    <span>Corrigido em {formatDate(redacao.data_correcao)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-primary/30 hover:bg-primary/10 hover:border-primary w-full sm:w-auto"
                                onClick={() => handleViewRedacao(redacao)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Correção
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>

                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground mr-2">
                            Página {currentPage} de {totalPages}
                          </span>
                          
                          {getPageNumbers().map(pageNum => (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="gap-1"
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Dialog de autenticação */}
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
                        <strong>Segurança Máxima:</strong> Para visualizar sua redação, digite o e-mail exato usado no envio.
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

            {/* Modal de visualização da redação */}
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
                        redacao_texto: authenticatedRedacao.redacao_texto || "",
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
                        turma: userType === "aluno" ? "Turma A" : "visitante",
                        // Incluir todos os campos de comentários pedagógicos
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
                        correcao_arquivo_url_corretor_1: authenticatedRedacao.correcao_arquivo_url_corretor_1,
                        correcao_arquivo_url_corretor_2: authenticatedRedacao.correcao_arquivo_url_corretor_2,
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
