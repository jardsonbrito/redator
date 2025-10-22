import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Inbox, Archive } from "lucide-react";
import { useAjudaRapida, type Conversa } from "@/hooks/useAjudaRapida";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { ChatConversa } from "./ChatConversa";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MensagensCorretor = () => {
  const { conversas, loading, buscarConversasCorretor } = useAjudaRapida();
  const { corretor } = useCorretorAuth();
  const [conversaAtiva, setConversaAtiva] = useState<{
    alunoId: string;
    alunoNome: string;
  } | null>(null);

  useEffect(() => {
    if (corretor?.id) {
      console.log('🔍 Carregando conversas para corretor:', corretor.id);
      buscarConversasCorretor(corretor.id);
    }
  }, [corretor?.id]);

  if (conversaAtiva) {
    return (
      <ChatConversa
        alunoId={conversaAtiva.alunoId}
        corretorId={corretor?.id || ''}
        alunoNome={conversaAtiva.alunoNome}
        onVoltar={() => setConversaAtiva(null)}
        tipoUsuario="corretor"
      />
    );
  }

  // Pendentes: conversas onde a última mensagem foi do aluno (precisa resposta do corretor)
  // Inclui tanto conversas novas quanto continuações onde o aluno enviou nova mensagem
  const conversasPendentes = conversas.filter(c => !c.eh_respondida);

  // Respondidas: conversas onde a última mensagem foi do corretor (já respondeu)
  const conversasRespondidas = conversas.filter(c => c.eh_respondida);

  const ConversaCard = ({ conversa }: { conversa: Conversa }) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setConversaAtiva({
        alunoId: conversa.aluno_id,
        alunoNome: conversa.aluno_nome
      })}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-foreground">
                {conversa.aluno_nome}
              </h3>
              {conversa.mensagens_nao_lidas > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {conversa.mensagens_nao_lidas}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {conversa.ultima_mensagem}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {format(new Date(conversa.ultima_data), 'dd/MM HH:mm', { locale: ptBR })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Recados dos Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pendentes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pendentes" className="flex items-center space-x-2">
                  <Inbox className="w-4 h-4" />
                  <span>Pendentes</span>
                  {conversasPendentes.length > 0 && (
                    <Badge variant="destructive" className="rounded-full ml-2">
                      {conversasPendentes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="respondidas" className="flex items-center space-x-2">
                  <Archive className="w-4 h-4" />
                  <span>Respondidas</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pendentes" className="mt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : conversasPendentes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhuma conversa pendente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversasPendentes.map((conversa) => (
                      <ConversaCard key={conversa.aluno_id} conversa={conversa} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="respondidas" className="mt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : conversasRespondidas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhuma conversa respondida
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversasRespondidas.map((conversa) => (
                      <ConversaCard key={conversa.aluno_id} conversa={conversa} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};