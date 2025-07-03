
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Eye, Lock, AlertCircle, ArrowLeft, Search, Filter } from "lucide-react";
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
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");

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
      // Verificar se o email corresponde ao da redação
      if (emailInput.trim().toLowerCase() !== selectedRedacao.email_aluno?.toLowerCase()) {
        toast({
          title: "E-mail incorreto",
          description: "O e-mail digitado não corresponde ao cadastrado nesta redação.",
          variant: "destructive",
        });
        return;
      }

      // Buscar texto completo da redação
      const { data: redacaoCompleta, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('id', selectedRedacao.id)
        .single();

      if (error) {
        console.error('Erro ao buscar redação completa:', error);
        throw error;
      }

      // Preparar dados completos da redação
      const redacaoComTexto: RedacaoTurma & { redacao_texto: string } = {
        ...selectedRedacao,
        redacao_texto: redacaoCompleta.redacao_texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
      };

      // Fechar dialog de autenticação e abrir visualização
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

  // Aplicar filtros
  const redacoesFiltradas = redacoesTurma?.filter(redacao => {
    const tipoMatch = !filtroTipo || redacao.tipo_envio === filtroTipo;
    const nomeMatch = !filtroNome || redacao.nome_aluno.toLowerCase().includes(filtroNome.toLowerCase());
    const emailMatch = !filtroEmail || redacao.email_aluno?.toLowerCase().includes(filtroEmail.toLowerCase());
    
    let dataMatch = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataRedacao = new Date(redacao.data_envio);
      const dataInicio = filtroDataInicio ? new Date(filtroDataInicio) : null;
      const dataFim = filtroDataFim ? new Date(filtroDataFim) : null;
      
      if (dataInicio && dataRedacao < dataInicio) dataMatch = false;
      if (dataFim && dataRedacao > dataFim) dataMatch = false;
    }
    
    return tipoMatch && nomeMatch && emailMatch && dataMatch;
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/app">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">
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
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
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
                <label className="block text-sm font-medium mb-2">Data Início</label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Data Fim</label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Aluno</label>
                <Input
                  placeholder="Buscar por nome..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">E-mail</label>
                <Input
                  type="email"
                  placeholder="Buscar por e-mail..."
                  value={filtroEmail}
                  onChange={(e) => setFiltroEmail(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading/Error/Empty States */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-primary">Carregando redações...</p>
          </div>
        ) : error ? (
          <Card className="border-red-200">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Erro ao carregar redações. Tente novamente.</p>
            </CardContent>
          </Card>
        ) : !redacoesFiltradas || redacoesFiltradas.length === 0 ? (
          <Card className="border-primary/20">
            <CardContent className="text-center py-8">
              <Search className="w-12 h-12 text-primary/50 mx-auto mb-4" />
              <p className="text-primary/70 mb-4">
                Nenhuma redação encontrada.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiltroTipo("");
                  setFiltroDataInicio("");
                  setFiltroDataFim("");
                  setFiltroNome("");
                  setFiltroEmail("");
                }}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Lista de Redações */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {redacoesFiltradas.length} redação(ões) encontrada(s)
              </p>
            </div>
            
            {redacoesFiltradas.map((redacao) => (
              <Card key={redacao.id} className="border-primary/20 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-lg text-primary">
                          {redacao.frase_tematica}
                        </h3>
                        {redacao.corrigida ? (
                          <Badge className="bg-green-100 text-green-800">Corrigida</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Aguardando</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Aluno:</span> {redacao.nome_aluno}
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span> {getTipoEnvioLabel(redacao.tipo_envio)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(redacao.data_envio)}
                        </div>
                        {redacao.corrigida && redacao.nota_total !== null && (
                          <div className="text-primary font-medium">
                            Nota: {redacao.nota_total}/1000
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-primary/30 hover:bg-primary/10"
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
              <DialogTitle className="text-primary">Acesso à Redação</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    Para ver sua redação, digite o e-mail que você usou no envio.
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
                <label htmlFor="email-auth" className="block text-sm font-medium text-primary mb-2">
                  E-mail de Acesso
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
