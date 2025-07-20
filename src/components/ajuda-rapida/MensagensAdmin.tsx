import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatConversa } from "./ChatConversa";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversaAdmin {
  aluno_id: string;
  corretor_id: string;
  aluno_nome: string;
  corretor_nome: string;
  ultima_mensagem: string;
  ultima_data: string;
  total_mensagens: number;
}

export const MensagensAdmin = () => {
  const [conversas, setConversas] = useState<ConversaAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversaAtiva, setConversaAtiva] = useState<{
    alunoId: string;
    corretorId: string;
    alunoNome: string;
    corretorNome: string;
  } | null>(null);
  const { toast } = useToast();

  const buscarTodasConversas = async () => {
    try {
      setLoading(true);
      
      const { data: mensagens, error } = await supabase
        .from('ajuda_rapida_mensagens')
        .select(`
          aluno_id,
          corretor_id,
          mensagem,
          criado_em
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // Buscar nomes de alunos e corretores separadamente
      const alunoIds = [...new Set(mensagens?.map(m => m.aluno_id) || [])];
      const corretorIds = [...new Set(mensagens?.map(m => m.corretor_id) || [])];

      const [profilesResponse, corretoresResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nome, sobrenome')
          .in('id', alunoIds),
        supabase
          .from('corretores')
          .select('id, nome_completo')
          .in('id', corretorIds)
      ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (corretoresResponse.error) throw corretoresResponse.error;

      // Criar mapas de nomes
      const alunosMap = new Map(profilesResponse.data?.map(p => [p.id, `${p.nome} ${p.sobrenome || ''}`.trim()]) || []);
      const corretoresMap = new Map(corretoresResponse.data?.map(c => [c.id, c.nome_completo]) || []);

      // Agrupar conversas
      const conversasMap = new Map<string, ConversaAdmin>();
      
      mensagens?.forEach((msg: any) => {
        const key = `${msg.aluno_id}-${msg.corretor_id}`;
        
        if (!conversasMap.has(key)) {
          conversasMap.set(key, {
            aluno_id: msg.aluno_id,
            corretor_id: msg.corretor_id,
            aluno_nome: alunosMap.get(msg.aluno_id) || 'Aluno',
            corretor_nome: corretoresMap.get(msg.corretor_id) || 'Corretor',
            ultima_mensagem: msg.mensagem,
            ultima_data: msg.criado_em,
            total_mensagens: 1
          });
        } else {
          const conversa = conversasMap.get(key)!;
          conversa.total_mensagens++;
          // Manter a mensagem mais recente
          if (new Date(msg.criado_em) > new Date(conversa.ultima_data)) {
            conversa.ultima_mensagem = msg.mensagem;
            conversa.ultima_data = msg.criado_em;
          }
        }
      });

      setConversas(Array.from(conversasMap.values()));
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarTodasConversas();
  }, []);

  const deletarConversa = async (alunoId: string, corretorId: string) => {
    try {
      const { error } = await supabase
        .from('ajuda_rapida_mensagens')
        .delete()
        .eq('aluno_id', alunoId)
        .eq('corretor_id', corretorId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conversa deletada com sucesso",
      });

      // Recarregar lista
      buscarTodasConversas();
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conversa",
        variant: "destructive"
      });
    }
  };

  if (conversaAtiva) {
    return (
      <ChatConversa
        alunoId={conversaAtiva.alunoId}
        corretorId={conversaAtiva.corretorId}
        alunoNome={conversaAtiva.alunoNome}
        corretorNome={conversaAtiva.corretorNome}
        onVoltar={() => setConversaAtiva(null)}
        tipoUsuario="admin"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Recados dos Alunos - Administração</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conversas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma conversa encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversas.map((conversa) => (
                <Card key={`${conversa.aluno_id}-${conversa.corretor_id}`} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Aluno</p>
                            <p className="font-semibold">{conversa.aluno_nome}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Corretor</p>
                            <p className="font-semibold">{conversa.corretor_nome}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {conversa.ultima_mensagem}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(conversa.ultima_data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                          <span>
                            {conversa.total_mensagens} mensagem{conversa.total_mensagens !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConversaAtiva({
                            alunoId: conversa.aluno_id,
                            corretorId: conversa.corretor_id,
                            alunoNome: conversa.aluno_nome,
                            corretorNome: conversa.corretor_nome
                          })}
                          className="p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="p-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar conversa</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar permanentemente esta conversa entre {conversa.aluno_nome} e {conversa.corretor_nome}?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletarConversa(conversa.aluno_id, conversa.corretor_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
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
        </CardContent>
      </Card>
    </div>
  );
};