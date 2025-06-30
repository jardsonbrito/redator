
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Calendar, Eye, Lock, AlertCircle, User } from "lucide-react";
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
  simulados: {
    titulo: string;
    frase_tematica: string;
  };
};

export const MeusSimuladosCard = ({ turmaCode }: MeusSimuladosCardProps) => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoSimulado | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showRedacao, setShowRedacao] = useState(false);
  const { toast } = useToast();

  const { data: redacoesSimulado, isLoading } = useQuery({
    queryKey: ['meus-simulados', turmaCode],
    queryFn: async () => {
      if (!turmaCode || turmaCode === "visitante") return [];
      
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica)
        `)
        .eq('turma', turmaCode)
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      return data as RedacaoSimulado[];
    },
    enabled: !!turmaCode && turmaCode !== "visitante"
  });

  const handleViewRedacao = (redacao: RedacaoSimulado) => {
    setSelectedRedacao(redacao);
    setEmailInput("");
    setIsDialogOpen(true);
    setShowRedacao(false);
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
      if (emailInput.trim().toLowerCase() !== selectedRedacao.email_aluno.toLowerCase()) {
        toast({
          title: "E-mail incorreto",
          description: "O e-mail digitado não corresponde ao cadastrado nesta redação.",
          variant: "destructive",
        });
        return;
      }

      // Fechar dialog de autenticação e mostrar redação
      setIsDialogOpen(false);
      setShowRedacao(true);
      
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

  if (turmaCode === "visitante") {
    return null; // Visitantes não têm acesso a esta seção
  }

  return (
    <>
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <Award className="w-5 h-5" />
            Meus Simulados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-redator-accent mx-auto mb-2"></div>
              <p className="text-sm text-redator-accent">Carregando simulados...</p>
            </div>
          ) : !redacoesSimulado || redacoesSimulado.length === 0 ? (
            <div className="text-center py-6">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">Nenhum simulado encontrado</p>
              <p className="text-sm text-gray-400">
                Participe de simulados para ver suas correções aqui!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {redacoesSimulado.map((redacao) => (
                <div key={redacao.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
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
                      
                      <div className="flex items-center gap-2">
                        {redacao.corrigida ? (
                          <>
                            <Badge className="bg-green-100 text-green-800 text-xs">Corrigida</Badge>
                            {redacao.nota_total !== null && (
                              <Badge variant="outline" className="text-xs">
                                Nota: {redacao.nota_total}/1000
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">Aguardando</Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewRedacao(redacao)}
                      className="shrink-0"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de autenticação por email */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-redator-primary">Acesso à Redação</DialogTitle>
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
                <p><span className="font-medium">Simulado:</span> {selectedRedacao.simulados.titulo}</p>
                <p><span className="font-medium">Autor:</span> {selectedRedacao.nome_aluno}</p>
              </div>
            )}

            <div>
              <label htmlFor="email-auth" className="block text-sm font-medium text-redator-primary mb-2">
                E-mail de Acesso
              </label>
              <Input
                id="email-auth"
                type="email"
                placeholder="Digite o e-mail cadastrado..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="border-redator-accent/30 focus:border-redator-accent"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEmailAuth}
                disabled={isAuthenticating}
                className="flex-1 bg-redator-primary hover:bg-redator-primary/90"
              >
                {isAuthenticating ? "Verificando..." : "Acessar Redação"}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-redator-accent/50"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização da redação */}
      {selectedRedacao && showRedacao && (
        <Dialog open={showRedacao} onOpenChange={() => setShowRedacao(false)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary">
                {selectedRedacao.simulados.titulo}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-redator-primary to-redator-secondary text-white p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">PROPOSTA DE REDAÇÃO</h3>
                <p className="leading-relaxed">{selectedRedacao.simulados.frase_tematica}</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-redator-primary mb-3">Sua Redação</h4>
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {selectedRedacao.texto}
                </div>
              </div>

              {selectedRedacao.corrigida && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">Correção</h4>
                  
                  {selectedRedacao.nota_total !== null && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-800">{selectedRedacao.nota_total}</div>
                        <div className="text-xs text-green-600">Total</div>
                      </div>
                      {[1, 2, 3, 4, 5].map(num => {
                        const notaKey = `nota_c${num}` as keyof RedacaoSimulado;
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
                      <h5 className="font-medium text-green-800 mb-2">Comentário Pedagógico</h5>
                      <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">
                        {selectedRedacao.comentario_pedagogico}
                      </div>
                    </div>
                  )}

                  {selectedRedacao.data_correcao && (
                    <div className="text-xs text-green-600 mt-2">
                      Corrigida em: {formatDate(selectedRedacao.data_correcao)}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500">
                Enviada em: {formatDate(selectedRedacao.data_envio)}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
