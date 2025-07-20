import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ajuda Rápida</h1>
        </div>
        <Button onClick={carregarConversas} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
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
        <div className="grid gap-4">
          {conversas.map((conversa) => (
            <Card key={`${conversa.aluno_id}-${conversa.corretor_id}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{conversa.aluno_nome}</h3>
                        <p className="text-sm text-muted-foreground">Aluno</p>
                      </div>
                      <div className="text-muted-foreground">↔</div>
                      <div>
                        <h3 className="font-semibold text-lg">{conversa.corretor_nome}</h3>
                        <p className="text-sm text-muted-foreground">Corretor</p>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Última mensagem:</p>
                      <p className="text-sm">{formatarMensagem(conversa.ultima_mensagem)}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatarData(conversa.ultima_data)}</span>
                      <Badge variant="secondary">
                        {conversa.total_mensagens} mensagem{conversa.total_mensagens !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConversaAtiva({
                        alunoId: conversa.aluno_id,
                        corretorId: conversa.corretor_id
                      })}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};