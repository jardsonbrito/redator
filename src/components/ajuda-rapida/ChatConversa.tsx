import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

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
  const { mensagens, loading, buscarMensagensConversa, enviarMensagem, marcarComoLida } = useAjudaRapida();
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    buscarMensagensConversa(alunoId, corretorId);
    
    // Marcar como lida se for corretor
    if (tipoUsuario === 'corretor') {
      marcarComoLida(alunoId, corretorId);
    }
  }, [alunoId, corretorId, tipoUsuario]);

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
      await enviarMensagem(alunoId, corretorId, novaMensagem.trim(), tipoUsuario as 'aluno' | 'corretor');
      setNovaMensagem('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
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

  const nomeExibicao = tipoUsuario === 'aluno' ? corretorNome : alunoNome;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="h-[calc(100vh-2rem)]">
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
                        "flex",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {mensagem.mensagem}
                        </p>
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
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area - ocultar para admin */}
            {tipoUsuario !== 'admin' && (
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    rows={2}
                    className="resize-none flex-1"
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