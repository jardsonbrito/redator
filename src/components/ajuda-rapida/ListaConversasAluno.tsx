import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { NovaConversa } from "./NovaConversa";
import { ChatConversa } from "./ChatConversa";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ListaConversasAluno = () => {
  const { conversas, loading, buscarConversasAluno } = useAjudaRapida();
  const { studentData } = useStudentAuth();
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [conversaAtiva, setConversaAtiva] = useState<{
    corretorId: string;
    corretorNome: string;
  } | null>(null);

  useEffect(() => {
    if (studentData.id) {
      buscarConversasAluno(studentData.id);
    }
  }, [studentData.id]);

  if (conversaAtiva) {
    return (
      <ChatConversa
        alunoId={studentData.id}
        corretorId={conversaAtiva.corretorId}
        corretorNome={conversaAtiva.corretorNome}
        onVoltar={() => setConversaAtiva(null)}
        tipoUsuario="aluno"
      />
    );
  }

  if (showNovaConversa) {
    return (
      <NovaConversa 
        alunoId={studentData.id}
        onVoltar={() => setShowNovaConversa(false)}
        onConversaCriada={(corretorId, corretorNome) => {
          setShowNovaConversa(false);
          setConversaAtiva({ corretorId, corretorNome });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Ajuda Rápida</CardTitle>
            <Button
              onClick={() => setShowNovaConversa(true)}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : conversas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Você ainda não tem conversas ativas
                </p>
                <Button
                  onClick={() => setShowNovaConversa(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Iniciar nova conversa
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {conversas.map((conversa) => (
                  <Card 
                    key={conversa.corretor_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setConversaAtiva({
                      corretorId: conversa.corretor_id,
                      corretorNome: conversa.corretor_nome
                    })}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {conversa.corretor_nome}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};