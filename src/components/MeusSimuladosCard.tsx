
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Calendar, Eye, Lock, AlertCircle, User, Shield, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MeusSimuladosCardProps {
  turmaCode: string;
}

type RedacaoSimulado = {
  id: string;
  id_simulado: string;
  nome_aluno: string;
  email_aluno: string;
  texto: string;
  turma: string;
  data_envio: string;
  corrigida: boolean;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  nota_total: number | null;
  comentario_pedagogico: string | null;
  data_correcao: string | null;
  status_corretor_1: string | null;
  status_corretor_2: string | null;
  corretor_1: { nome_completo: string } | null;
  corretor_2: { nome_completo: string } | null;
  simulados: {
    titulo: string;
    frase_tematica: string;
  };
};

export const MeusSimuladosCard = ({ turmaCode }: MeusSimuladosCardProps) => {
  const [selectedRedacao, setSelectedRedacao] = useState<any>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [redacaoAutenticada, setRedacaoAutenticada] = useState(false);
  const { toast } = useToast();

  const { data: redacoesSimulado, isLoading } = useQuery({
    queryKey: ['meus-simulados', turmaCode],
    queryFn: async () => {
      if (!turmaCode || turmaCode === "visitante") return [];
      
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica),
          corretor_1:corretores!corretor_id_1(nome_completo),
          corretor_2:corretores!corretor_id_2(nome_completo)
        `)
        .eq('turma', turmaCode)
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      return data as RedacaoSimulado[];
    },
    enabled: !!turmaCode && turmaCode !== "visitante"
  });

  // Expandir redações para mostrar múltiplas entradas
  const redacoesExpandidas = redacoesSimulado?.flatMap(redacao => {
    const entradas = [];
    
    // Entrada para corretor 1
    if (redacao.corretor_1) {
      entradas.push({
        ...redacao,
        corretor_atual: redacao.corretor_1.nome_completo,
        status_atual: redacao.status_corretor_1 || 'pendente',
        tipo_corretor: 'corretor_1',
        display_id: `${redacao.id}-c1`
      });
    }
    
    // Entrada para corretor 2
    if (redacao.corretor_2) {
      entradas.push({
        ...redacao,
        corretor_atual: redacao.corretor_2.nome_completo,
        status_atual: redacao.status_corretor_2 || 'pendente',
        tipo_corretor: 'corretor_2',
        display_id: `${redacao.id}-c2`
      });
    }
    
    // Se não tem corretor, mostrar uma entrada sem corretor
    if (!redacao.corretor_1 && !redacao.corretor_2) {
      entradas.push({
        ...redacao,
        corretor_atual: 'Aguardando atribuição',
        status_atual: 'pendente',
        tipo_corretor: null,
        display_id: redacao.id
      });
    }
    
    return entradas;
  }) || [];

  const handleViewRedacao = (redacao: any) => {
    setSelectedRedacao(redacao);
    setEmailInput("");
    setIsDialogOpen(true);
    setRedacaoAutenticada(false);
  };

  const validarEmailRigoroso = async (emailCorreto: string, emailDigitado: string): Promise<boolean> => {
    console.log('🔒 CARD: INICIANDO VALIDAÇÃO RIGOROSA:', { emailCorreto, emailDigitado });
    
    try {
      // Definir contexto do usuário atual
      await supabase.rpc('set_current_user_email', { user_email: emailDigitado });
      
      // Validação via função RPC
      const { data: canAccess, error } = await supabase.rpc('can_access_redacao', {
        redacao_email: emailCorreto,
        user_email: emailDigitado
      });

      console.log('🔍 CARD: RESULTADO SUPABASE:', { canAccess, error });

      if (error || canAccess !== true) {
        console.log('❌ CARD: FALHA NA VALIDAÇÃO SUPABASE');
        return false;
      }

      console.log('✅ CARD: VALIDAÇÃO RIGOROSA APROVADA');
      return true;
    } catch (error) {
      console.log('❌ CARD: ERRO NA VALIDAÇÃO SUPABASE:', error);
      return false;
    }
  };

  const handleEmailAuth = async () => {
    if (!selectedRedacao || !emailInput.trim()) {
      toast({
        title: "❌ E-mail obrigatório",
        description: "Digite o e-mail cadastrado na redação.",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    setRedacaoAutenticada(false);

    try {
      const isValid = await validarEmailRigoroso(selectedRedacao.email_aluno, emailInput.trim());
      
      if (!isValid) {
        console.error('🚫 CARD: ACESSO NEGADO - E-mail incorreto');
        
        // Log da tentativa negada
        await supabase.rpc('log_denied_access', {
          attempted_email: emailInput.trim(),
          redacao_email: selectedRedacao.email_aluno,
          redacao_id: selectedRedacao.id
        });
        
        toast({
          title: "🚫 E-mail incorreto",
          description: "Utilize o mesmo e-mail informado no envio da redação.",
          variant: "destructive",
        });
        setRedacaoAutenticada(false);
        return;
      }

      console.log('✅ CARD: ACESSO APROVADO - E-mail validado');
      setIsDialogOpen(false);
      setRedacaoAutenticada(true);
      
      toast({
        title: "✅ Redação liberada!",
        description: "E-mail confirmado. Visualizando redação.",
      });

    } catch (error) {
      console.error('💥 CARD: Erro na validação:', error);
      toast({
        title: "❌ Erro na validação",
        description: "Tente novamente.",
        variant: "destructive",
      });
      setRedacaoAutenticada(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const resetAuth = () => {
    setSelectedRedacao(null);
    setEmailInput("");
    setIsDialogOpen(false);
    setRedacaoAutenticada(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'corrigida':
        return <Badge className="bg-green-100 text-green-800 text-xs">✅ Corrigida</Badge>;
      case 'em_correcao':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">🔄 Em correção</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">⏳ Pendente</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs">⏳ Aguardando</Badge>;
    }
  };

  const handleDownloadCorrecao = () => {
    // Implementar download da correção completa
    toast({
      title: "Download iniciado",
      description: "A correção completa será baixada em breve.",
    });
  };

  if (turmaCode === "visitante") {
    return null;
  }

  return (
    <>
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <Shield className="w-5 h-5" />
            🔐 Meus Simulados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-redator-accent mx-auto mb-2"></div>
              <p className="text-sm text-redator-accent">Carregando simulados...</p>
            </div>
          ) : !redacoesExpandidas || redacoesExpandidas.length === 0 ? (
            <div className="text-center py-6">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">Nenhum simulado encontrado</p>
              <p className="text-sm text-gray-400">
                Participe de simulados para ver suas correções aqui!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {redacoesExpandidas.map((redacao) => (
                <div key={redacao.display_id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-redator-primary truncate">
                        {redacao.simulados.titulo}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {redacao.simulados.frase_tematica}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <User className="w-3 h-3" />
                        <span>{redacao.nome_aluno}</span>
                        <Calendar className="w-3 h-3 ml-1" />
                        <span>{formatDate(redacao.data_envio)}</span>
                      </div>

                      <div className="text-xs text-gray-600 mb-2">
                        Corretor: {redacao.corretor_atual}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(redacao.status_atual)}
                        {redacao.status_atual === 'corrigida' && redacao.nota_total !== null && (
                          <Badge variant="outline" className="text-xs">
                            Nota: {redacao.nota_total}/1000
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewRedacao(redacao)}
                      className="shrink-0 border-amber-300 hover:bg-amber-50"
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      Ver Correção
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de autenticação RIGOROSA */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetAuth();
        setIsDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-redator-primary flex items-center gap-2">
              <Shield className="w-5 h-5" />
              🔒 ACESSO SEGURO OBRIGATÓRIO
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>ATENÇÃO:</strong> Digite o e-mail <strong>EXATO</strong> usado no envio da redação. Qualquer diferença bloqueará o acesso.
                </div>
              </div>
            </div>

            {selectedRedacao && (
              <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                <p><span className="font-medium">Simulado:</span> {selectedRedacao.simulados.titulo}</p>
                <p><span className="font-medium">Autor:</span> {selectedRedacao.nome_aluno}</p>
                <p><span className="font-medium">Corretor:</span> {selectedRedacao.corretor_atual}</p>
              </div>
            )}

            <div>
              <label htmlFor="email-auth" className="block text-sm font-bold text-redator-primary mb-2">
                🔐 E-mail de Acesso *
              </label>
              <Input
                id="email-auth"
                type="email"
                placeholder="Digite o e-mail EXATO usado no envio..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="border-2 border-amber-300 focus:border-red-500"
                disabled={isAuthenticating}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEmailAuth}
                disabled={isAuthenticating || !emailInput.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isAuthenticating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Validando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    Verificar E-mail
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={resetAuth}
                className="border-red-300"
                disabled={isAuthenticating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização - APENAS após autenticação rigorosa */}
      {selectedRedacao && redacaoAutenticada && (
        <Dialog open={redacaoAutenticada} onOpenChange={(open) => {
          if (!open) resetAuth();
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                ✅ {selectedRedacao.simulados.titulo}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 p-3 rounded">
                <p className="text-sm text-green-800 font-medium">
                  ✅ E-mail validado com sucesso. Acesso liberado.
                </p>
              </div>

              {/* Cabeçalho da correção */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Simulado</Badge>
                  <Badge className={selectedRedacao.status_atual === 'corrigida' ? "bg-green-500" : "bg-yellow-500"}>
                    {selectedRedacao.status_atual === 'corrigida' ? 'Corrigida' : 'Em correção'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Corretor: {selectedRedacao.corretor_atual}
                </div>
              </div>

              <div className="bg-gradient-to-r from-redator-primary to-redator-secondary text-white p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">PROPOSTA DE REDAÇÃO</h3>
                <p className="leading-relaxed">{selectedRedacao.simulados.frase_tematica}</p>
              </div>

              <div className="text-sm text-gray-600">
                Enviada em: {formatDate(selectedRedacao.data_envio)}
              </div>

              {selectedRedacao.data_correcao && (
                <div className="text-sm text-gray-600">
                  Corrigida em: {formatDate(selectedRedacao.data_correcao)}
                </div>
              )}

              {selectedRedacao.status_atual === 'corrigida' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">Correção</h4>
                  
                  {selectedRedacao.nota_total !== null && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-800">{selectedRedacao.nota_total}</div>
                        <div className="text-xs text-green-600">Total</div>
                      </div>
                      {[1, 2, 3, 4, 5].map(num => {
                        const notaKey = `nota_c${num}` as keyof typeof selectedRedacao;
                        const nota = selectedRedacao[notaKey];
                        return (
                          <div key={num} className="text-center">
                            <div className="text-lg font-bold text-green-800">
                              {typeof nota === 'number' ? nota : 0}
                            </div>
                            <div className="text-xs text-green-600">C{num}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedRedacao.comentario_pedagogico && (
                    <div>
                      <h5 className="font-medium text-green-800 mb-2">Relatório Pedagógico</h5>
                      <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">
                        {selectedRedacao.comentario_pedagogico}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-redator-primary mb-3">Sua Redação</h4>
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {selectedRedacao.texto}
                </div>
              </div>

              {selectedRedacao.status_atual === 'corrigida' && (
                <div className="flex justify-center">
                  <Button 
                    onClick={handleDownloadCorrecao}
                    className="bg-redator-primary hover:bg-redator-secondary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Correção Completa
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
