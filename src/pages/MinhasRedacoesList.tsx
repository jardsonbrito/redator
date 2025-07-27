import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/hooks/use-toast";
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
  observacoes_coordenacao?: string;
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

const MinhasRedacoesList = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoTurma | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Obter dados do usuário do localStorage
  const studentDataStr = localStorage.getItem('student_data');
  const studentData = studentDataStr ? JSON.parse(studentDataStr) : null;

  // Verificar se o usuário está logado
  const isStudentLoggedIn = localStorage.getItem('isStudentLoggedIn') === 'true';

  const { data: redacoes = [], isLoading, error } = useQuery({
    queryKey: ['minhas-redacoes', studentData?.email],
    queryFn: async () => {
      if (!studentData?.email) {
        console.log('❌ Email não encontrado nos dados do estudante');
        return [];
      }

      console.log('🔍 Buscando redações para:', studentData.email);
      console.log('📊 Tipo de usuário:', studentData.userType);

      try {
        let query;
        
        if (studentData.userType === "aluno") {
          // Para alunos, usar a função get_student_redacoes
          const { data, error } = await supabase.rpc('get_student_redacoes', {
            student_email: studentData.email
          });
          
          if (error) {
            console.error('❌ Erro na função get_student_redacoes:', error);
            throw error;
          }
          
          return data || [];
        } else {
          // Para visitantes, buscar direto na tabela redacoes_enviadas
          query = supabase
            .from('redacoes_enviadas')
            .select('*')
            .eq('email_aluno', studentData.email)
            .order('created_at', { ascending: false });

          const { data, error } = await query;
          
          if (error) {
            console.error('❌ Erro na consulta direta:', error);
            throw error;
          }

          return data || [];
        }
      } catch (error) {
        console.error('❌ Erro geral ao buscar redações:', error);
        throw error;
      }
    },
    enabled: !!studentData?.email,
  });

  const handleViewRedacao = (redacao: RedacaoTurma) => {
    console.log('🔍 Iniciando visualização da redação:', redacao.id);
    
    // Verificar se é redação manuscrita
    if (redacao.tipo_envio === 'manuscrita') {
      console.log('📝 Redação manuscrita detectada - iniciando download direto');
      iniciarDownloadCorrecaoCompleta(redacao);
      return;
    }

    // Para redações digitadas, seguir o fluxo de autenticação
    setSelectedRedacao(redacao);
    setEmailInput("");
    setShowAuthDialog(true);
  };

  const handleEmailAuth = async () => {
    if (!selectedRedacao) return;
    
    console.log('🔐 Iniciando autenticação por email para redação:', selectedRedacao.id);
    
    setIsAuthenticating(true);
    
    try {
      // Validação simples de email
      const normalizeEmail = (email: string) => email?.trim().toLowerCase() || '';
      const isEmailValid = normalizeEmail(selectedRedacao.email_aluno) === normalizeEmail(emailInput);
      
      if (isEmailValid) {
        console.log('✅ Email validado com sucesso');
        setShowAuthDialog(false);
        
        // Buscar redação completa autenticada
        const { data: redacaoCompleta, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', selectedRedacao.id)
          .single();

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
          // Converter dados para o formato esperado pelo RedacaoEnviadaCard
          const redacaoFormatada: RedacaoTurma = {
            ...redacaoCompleta,
            corrigida: redacaoCompleta.status === 'corrigida',
            redacao_texto: (redacaoCompleta as any).redacao_texto || (redacaoCompleta as any).texto_redacao || '',
            nota_c1: (redacaoCompleta as any).nota_c1,
            nota_c2: (redacaoCompleta as any).nota_c2,
            nota_c3: (redacaoCompleta as any).nota_c3,
            nota_c4: (redacaoCompleta as any).nota_c4,
            nota_c5: (redacaoCompleta as any).nota_c5,
          };
          setSelectedRedacao(redacaoFormatada);
          setShowAuthDialog(false);
        }
      } else {
        console.log('❌ Falha na validação do email');
        toast({
          title: "Email incorreto",
          description: "O email digitado não confere com o email de envio da redação.",
          variant: "destructive"
        });
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

  const iniciarDownloadCorrecaoCompleta = async (redacao: RedacaoTurma) => {
    console.log('📥 Iniciando download da correção completa para redação:', redacao.id);
    
    try {
      const { downloadRedacaoManuscritaCorrigida } = await import('@/utils/redacaoDownload');
      await downloadRedacaoManuscritaCorrigida(redacao);
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
      case 'tema_livre': return 'Tema Livre';
      case 'simulado': return 'Simulado';
      case 'exercicio': return 'Exercício';
      case 'manuscrita': return 'Manuscrita';
      default: return tipo;
    }
  };

  const getTipoEnvioColor = (tipo: string) => {
    switch (tipo) {
      case 'tema_livre': return 'bg-blue-100 text-blue-800';
      case 'simulado': return 'bg-purple-100 text-purple-800';
      case 'exercicio': return 'bg-green-100 text-green-800';
      case 'manuscrita': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]"
                onClick={() => handleViewRedacao(redacao)}
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
                        <Badge 
                          variant={redacao.status === 'corrigida' ? 'default' : 'secondary'}
                        >
                          {redacao.status === 'corrigida' ? 'Corrigida' : 'Em correção'}
                        </Badge>
                        {redacao.nota_total && (
                          <Badge variant="outline">
                            Nota: {redacao.nota_total}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                        {redacao.frase_tematica}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground">
                        Enviado em: {formatDate(redacao.data_envio)}
                        {redacao.data_correcao && (
                          <span> • Corrigido em: {formatDate(redacao.data_correcao)}</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Ver detalhes →</span>
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

        {/* Dialog para exibir redação autenticada */}
        {selectedRedacao && !showAuthDialog && (
          <Dialog open={true} onOpenChange={resetAuthenticationState}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <RedacaoEnviadaCard redacao={selectedRedacao} />
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default MinhasRedacoesList;