import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Eye, Trash2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { ChatConversa } from "@/components/ajuda-rapida/ChatConversa";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface ConversaAdmin {
  aluno_id: string;
  corretor_id: string;
  aluno_nome: string;
  corretor_nome: string;
  ultima_mensagem: string;
  ultima_data: string;
  total_mensagens: number;
}

export const AjudaRapidaAdmin = () => {
  const [conversas, setConversas] = useState<ConversaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversaAtiva, setConversaAtiva] = useState<{ alunoId: string; corretorId: string } | null>(null);
  const { buscarTodasConversas, deletarConversa } = useAjudaRapida();
  const { toast } = useToast();

  const carregarConversas = async () => {
    setLoading(true);
    try {
      const dados = await buscarTodasConversas();
      setConversas(dados);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletarConversa = async (alunoId: string, corretorId: string) => {
    try {
      await deletarConversa(alunoId, corretorId);
      toast({
        title: "Sucesso",
        description: "Conversa excluída com sucesso",
      });
      carregarConversas(); // Recarregar a lista
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conversa",
        variant: "destructive",
      });
    }
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data inválida';
    }
  };

  const formatarMensagem = (mensagem: string) => {
    if (mensagem.length > 100) {
      return mensagem.substring(0, 100) + '...';
    }
    return mensagem;
  };

  // Carregar conversas ao montar o componente
  useEffect(() => {
    carregarConversas();
  }, []);

  // Se há uma conversa ativa, mostrar a visualização do chat
  if (conversaAtiva) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setConversaAtiva(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Lista
          </Button>
          <h1 className="text-3xl font-bold">Visualização da Conversa</h1>
        </div>
        
        <ChatConversa
          alunoId={conversaAtiva.alunoId}
          corretorId={conversaAtiva.corretorId}
          tipoUsuario="admin"
          onVoltar={() => setConversaAtiva(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Recados dos Alunos</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-muted-foreground">Gerenciar conversas entre alunos e corretores</p>
        <Button onClick={carregarConversas} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando conversas...</p>
        </div>
      ) : conversas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-60" />
            <p className="text-muted-foreground text-lg">
              Sem conversas no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversas.map((conversa) => (
            <Card key={`${conversa.aluno_id}-${conversa.corretor_id}`} className="bg-white hover:shadow-md transition-all duration-200 border border-border/20 rounded-lg shadow-sm">
              <CardContent className="p-4">
                {/* Topo com nomes - Layout responsivo */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-foreground">{conversa.aluno_nome}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Aluno</p>
                  </div>
                  <div className="hidden sm:block text-muted-foreground text-lg">↔</div>
                  <div className="flex-1 sm:text-right">
                    <h3 className="font-bold text-base sm:text-lg text-foreground">{conversa.corretor_nome}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Corretor</p>
                  </div>
                </div>
                
                {/* Centro com última mensagem */}
                <div className="bg-muted/30 p-3 rounded-md mb-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Última mensagem:</p>
                  <p className="text-sm text-foreground leading-relaxed">{formatarMensagem(conversa.ultima_mensagem)}</p>
                </div>
                
                {/* Data e contador */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <span className="text-xs sm:text-sm text-muted-foreground">{formatarData(conversa.ultima_data)}</span>
                  <Badge variant="secondary" className="text-xs w-fit">
                    {conversa.total_mensagens} mensagem{conversa.total_mensagens !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {/* Rodapé com botões - Layout responsivo */}
                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/20">
                  <Button
                    variant="outline"
                    onClick={() => setConversaAtiva({
                      alunoId: conversa.aluno_id,
                      corretorId: conversa.corretor_id
                    })}
                    className="flex items-center justify-center gap-2 h-10 w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 h-10 w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir permanentemente esta conversa entre{" "}
                          <strong>{conversa.aluno_nome}</strong> e{" "}
                          <strong>{conversa.corretor_nome}</strong>?
                          <br /><br />
                          Esta ação não pode ser desfeita e todas as mensagens serão perdidas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletarConversa(conversa.aluno_id, conversa.corretor_id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Excluir Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};