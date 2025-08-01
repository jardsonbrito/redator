import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, LogOut, Home, Check, X } from "lucide-react";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useNavigate } from "react-router-dom";
import { MensagemAcoes } from './MensagemAcoes';
import { useToast } from '@/hooks/use-toast';

interface ChatConversaProps {
  alunoId: string;
  corretorId: string;
  corretorNome?: string;
  alunoNome?: string;
  onVoltar: () => void;
  tipoUsuario: 'aluno' | 'corretor' | 'admin';
}

export const ChatConversa = ({ 
  alunoId, 
  corretorId, 
  corretorNome, 
  alunoNome,
  onVoltar, 
  tipoUsuario 
}: ChatConversaProps) => {
  const { 
    mensagens, 
    loading, 
    buscarMensagensConversa, 
    enviarMensagem, 
    editarMensagem, 
    apagarMensagem, 
    marcarComoLida, 
    marcarComoLidaAluno 
  } = useAjudaRapida();
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { logoutStudent, studentData } = useStudentAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    buscarMensagensConversa(alunoId, corretorId);
    
    // Marcar como lida quando carregar a conversa
    const marcarMensagensLidas = async () => {
      if (tipoUsuario === 'corretor') {
        await marcarComoLida(alunoId, corretorId);
      } else if (tipoUsuario === 'aluno' && studentData?.email) {
        await marcarComoLidaAluno(studentData.email, corretorId);
        // Disparar evento customizado para atualizar o badge
        window.dispatchEvent(new CustomEvent('mensagensLidas'));
      }
    };
    
    marcarMensagensLidas();
  }, [alunoId, corretorId, tipoUsuario, studentData?.email]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEnviar = async () => {
    if (!novaMensagem.trim() || tipoUsuario === 'admin') return;

    try {
      setEnviando(true);
      
      if (editingMessageId) {
        // Atualizar mensagem existente
        await editarMensagem(editingMessageId, novaMensagem.trim());
        await buscarMensagensConversa(alunoId, corretorId);
        setEditingMessageId(null);
        toast({
          title: "Sucesso",
          description: "Mensagem editada com sucesso",
        });
      } else {
        // Enviar nova mensagem
        await enviarMensagem(alunoId, corretorId, novaMensagem.trim(), tipoUsuario as 'aluno' | 'corretor');
      }
      
      setNovaMensagem('');
    } catch (error) {
      console.error('Erro ao enviar/editar mensagem:', error);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleEditarMensagem = (mensagem: any) => {
    // Copia o texto da mensagem para o campo de digitação original
    setNovaMensagem(mensagem.mensagem);
    setEditingMessageId(mensagem.id);
    
    // Foca no campo de digitação
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder="Digite sua mensagem..."]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        // Posiciona o cursor no final
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  };

  const handleApagarMensagem = async (mensagemId: string) => {
    try {
      await apagarMensagem(mensagemId);
      await buscarMensagensConversa(alunoId, corretorId);
      toast({
        title: "Sucesso",
        description: "Mensagem apagada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao apagar mensagem:', error);
    }
  };

  const handleCancelarEdicao = () => {
    setEditingMessageId(null);
    setNovaMensagem('');
  };

  const nomeExibicao = tipoUsuario === 'aluno' ? corretorNome : alunoNome;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      {/* Cabeçalho do aluno apenas se for aluno */}
      {tipoUsuario === 'aluno' && (
        <div className="bg-primary shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/app')}
                className="flex items-center gap-3 text-primary-foreground hover:text-secondary transition-colors duration-200 bg-transparent hover:bg-white/10 border-0 p-0"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Home className="w-5 h-5" />
                </div>
                <span className="hidden sm:inline font-semibold text-lg">Início</span>
              </Button>
              
              <h1 className="text-xl font-bold text-primary-foreground">{nomeExibicao || 'Conversa'}</h1>
              
              <Button 
                onClick={() => {
                  logoutStudent();
                  navigate('/', { replace: true });
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-secondary/30 text-primary-foreground hover:bg-secondary/20 hover:border-secondary/50 rounded-xl px-3 py-2 font-medium transition-colors duration-200 bg-transparent"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`max-w-4xl mx-auto ${tipoUsuario === 'aluno' ? 'p-4' : 'p-4'}`}>
        <Card className={tipoUsuario === 'aluno' ? "h-[calc(100vh-6rem)]" : "h-[calc(100vh-2rem)]"}>
          {/* Cabeçalho apenas para corretor/admin */}
          {tipoUsuario !== 'aluno' && (
            <CardHeader className="flex flex-row items-center space-y-0 pb-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={onVoltar}
                className="mr-4 p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle>{nomeExibicao || 'Conversa'}</CardTitle>
            </CardHeader>
          )}
          
          <CardContent className="flex flex-col h-full p-0">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mensagens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Ainda não há mensagens nesta conversa
                  </p>
                </div>
              ) : (
                mensagens.map((mensagem) => {
                  const isOwnMessage = tipoUsuario !== 'admin' && mensagem.autor === tipoUsuario;
                  
                  return (
                    <div
                      key={mensagem.id}
                      className={cn(
                        "flex group",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg relative",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {/* Botão de ações sempre visível para mensagens próprias */}
                        {isOwnMessage && (
                          <div className="absolute -top-1 -right-1">
                            <MensagemAcoes
                              onEditar={() => handleEditarMensagem(mensagem)}
                              onApagar={() => handleApagarMensagem(mensagem.id)}
                            />
                          </div>
                        )}

                        <div>
                          <p className="text-sm whitespace-pre-wrap">
                            {mensagem.mensagem}
                          </p>
                          {mensagem.editada && (
                            <p className="text-xs opacity-70 italic mt-1">
                              editada
                            </p>
                          )}
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isOwnMessage
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(mensagem.criado_em), 'dd/MM HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area - ocultar para admin */}
            {tipoUsuario !== 'admin' && (
              <div className="border-t p-4">
                {/* Indicador de modo de edição */}
                {editingMessageId && (
                  <div className="mb-2 px-3 py-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-sm text-yellow-800">
                    <div className="flex items-center justify-between">
                      <span>✏️ Editando mensagem</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelarEdicao}
                        className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={editingMessageId ? "Edite sua mensagem..." : "Digite sua mensagem..."}
                    rows={2}
                    className={cn(
                      "resize-none flex-1",
                      editingMessageId && "bg-yellow-50 border-yellow-300"
                    )}
                  />
                  <Button
                    onClick={handleEnviar}
                    disabled={enviando || !novaMensagem.trim()}
                    className="rounded-full w-12 h-12 p-0 self-end"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};