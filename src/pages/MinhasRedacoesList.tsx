
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
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoTurma | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
          .select('*')
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
          .select('*')
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
    setSelectedRedacao(redacao);
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

    try {
      if (emailInput.trim().toLowerCase() !== selectedRedacao.email_aluno?.toLowerCase()) {
        toast({
          title: "E-mail incorreto",
          description: "O e-mail digitado não corresponde ao cadastrado nesta redação.",
          variant: "destructive",
        });
        return;
      }

      const { data: redacaoCompleta, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('id', selectedRedacao.id)
        .single();

      if (error) {
        console.error('Erro ao buscar redação completa:', error);
        throw error;
      }

      const redacaoComTexto: RedacaoTurma & { redacao_texto: string } = {
        ...selectedRedacao,
        redacao_texto: redacaoCompleta.redacao_texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
      };

      setIsDialogOpen(false);
      setSelectedRedacao(redacaoComTexto);
      
      toast({
        title: "Redação liberada!",
        description: "Agora você pode visualizar sua redação completa.",
      });

    } catch (error) {
      console.error('Erro na autenticação:', error);
      toast({
        title: "Erro na autenticação",
        description: "Ocorreu um erro ao verificar o e-mail. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
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
    setFiltroTipo("");
    setFiltroStatus("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroNome("");
  };

  // Aplicar filtros
  const redacoesFiltradas = redacoesTurma?.filter(redacao => {
    const tipoMatch = !filtroTipo || redacao.tipo_envio === filtroTipo;
    const statusMatch = !filtroStatus || (filtroStatus === 'corrigida' ? redacao.corrigida : !redacao.corrigida);
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
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header elegante */}
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
                {studentData.userType === "aluno" ? 
                  `Todas as redações da ${studentData.turma}` : 
                  "Todas as suas redações enviadas"
                }
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
                      <SelectItem value="">Todos os tipos</SelectItem>
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
                      <SelectItem value="">Todos os status</SelectItem>
                      <SelectItem value="corrigida">Corrigido</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
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
                            <Badge className="bg-green-100 text-green-800">Corrigido</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Aguardando</Badge>
                          )}
                          <Badge className={getTipoEnvioColor(redacao.tipo_envio)}>
                            {getTipoEnvioLabel(redacao.tipo_envio)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="font-medium">Aluno:</span> {redacao.nome_aluno}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">Enviado em:</span> {formatDate(redacao.data_envio)}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-primary/30 hover:bg-primary/10 hover:border-primary shrink-0"
                      onClick={() => handleViewRedacao(redacao)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Redação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de autenticação por email */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Acesso à Redação
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    Para visualizar sua redação corrigida, digite o e-mail que você usou no envio.
                  </div>
                </div>
              </div>

              {selectedRedacao && (
                <div className="space-y-2 text-sm bg-primary/5 p-3 rounded-lg">
                  <p><span className="font-medium text-primary">Redação:</span> {selectedRedacao.frase_tematica}</p>
                  <p><span className="font-medium text-primary">Autor:</span> {selectedRedacao.nome_aluno}</p>
                </div>
              )}

              <div>
                <label htmlFor="email-auth" className="block text-sm font-medium text-primary mb-2">
                  E-mail de Acesso *
                </label>
                <Input
                  id="email-auth"
                  type="email"
                  placeholder="Digite o e-mail cadastrado..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="border-primary/30 focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleEmailAuth}
                  disabled={isAuthenticating}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isAuthenticating ? "Verificando..." : "Acessar Redação"}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-primary/30"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de visualização da redação autenticada */}
        {selectedRedacao && selectedRedacao.redacao_texto && (
          <Dialog open={!!selectedRedacao.redacao_texto} onOpenChange={() => setSelectedRedacao(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-primary">
                  {selectedRedacao.frase_tematica}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <RedacaoEnviadaCard 
                  redacao={{
                    id: selectedRedacao.id,
                    frase_tematica: selectedRedacao.frase_tematica,
                    redacao_texto: selectedRedacao.redacao_texto,
                    data_envio: selectedRedacao.data_envio,
                    nota_c1: selectedRedacao.nota_c1,
                    nota_c2: selectedRedacao.nota_c2,
                    nota_c3: selectedRedacao.nota_c3,
                    nota_c4: selectedRedacao.nota_c4,
                    nota_c5: selectedRedacao.nota_c5,
                    nota_total: selectedRedacao.nota_total,
                    comentario_admin: selectedRedacao.comentario_admin,
                    corrigida: selectedRedacao.corrigida,
                    data_correcao: selectedRedacao.data_correcao,
                    nome_aluno: selectedRedacao.nome_aluno,
                    email_aluno: selectedRedacao.email_aluno,
                    tipo_envio: selectedRedacao.tipo_envio,
                    status: selectedRedacao.status,
                    turma: studentData.userType === "aluno" ? (studentData.turma || "") : "visitante",
                  }} 
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
