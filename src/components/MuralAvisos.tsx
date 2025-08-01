import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { MessageSquare, ExternalLink, AlertTriangle, CheckCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  turmas_autorizadas: string[] | null;
  imagem_url?: string;
  link_externo?: string;
  prioridade: string;
  criado_em: string;
  permite_visitante?: boolean;
}

interface AvisoLeitura {
  id: string;
  aviso_id: string;
  nome_aluno: string;
  sobrenome_aluno: string;
  email_aluno: string;
}

interface MuralAvisosProps {
  turmaCode: string;
}

export const MuralAvisos = ({ turmaCode }: MuralAvisosProps) => {
  const { studentData } = useStudentAuth();
  const { toast } = useToast();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [leituras, setLeituras] = useState<AvisoLeitura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingReading, setConfirmingReading] = useState<string | null>(null);

  useEffect(() => {
    fetchAvisos();
    fetchLeituras();
  }, [turmaCode]);

  const fetchAvisos = async () => {
    try {
      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .eq("status", "publicado")
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (error) throw error;

      // Filtrar avisos pela turma
      const avisosFiltrados = (data || []).filter(aviso => {
        const turmasAutorizadas = aviso.turmas_autorizadas || [];
        const isVisitante = studentData.userType === "visitante";

        // Se for visitante, mostrar apenas avisos que permitem visitante
        if (isVisitante) {
          return aviso.permite_visitante === true;
        }

        // Se não há turmas especificadas E não permite visitante, mostrar para todos os alunos
        if (turmasAutorizadas.length === 0 && !aviso.permite_visitante) {
          return true;
        }

        // Se há turmas especificadas, verificar se a turma do usuário está autorizada
        if (turmasAutorizadas.length > 0) {
          return turmasAutorizadas.some(turma => 
            turma.toUpperCase() === turmaCode.toUpperCase()
          );
        }

        return false;
      });

      setAvisos(avisosFiltrados);
    } catch (error) {
      console.error("Erro ao buscar avisos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeituras = async () => {
    try {
      const { data, error } = await supabase
        .from("avisos_leitura")
        .select("*");
      
      if (error) throw error;
      setLeituras(data || []);
    } catch (error) {
      console.error("Erro ao buscar leituras:", error);
    }
  };

  const handleConfirmarLeitura = async (avisoId: string) => {
    if (!studentData.nomeUsuario || !studentData.turma) {
      toast({
        title: "Erro",
        description: "Dados do aluno não encontrados. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    setConfirmingReading(avisoId);

    try {
      // Extrair nome e sobrenome do nome completo do studentData
      const nomeCompleto = studentData.nomeUsuario.trim();
      const partesNome = nomeCompleto.split(' ');
      const nome = partesNome[0] || '';
      const sobrenome = partesNome.slice(1).join(' ') || '';

      const { error } = await supabase
        .from("avisos_leitura")
        .insert([{
          aviso_id: avisoId,
          nome_aluno: nome,
          sobrenome_aluno: sobrenome,
          turma: studentData.turma,
          email_aluno: studentData.email || studentData.nomeUsuario
        }]);

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          toast({
            title: "Leitura já confirmada",
            description: "Você já confirmou a leitura deste aviso.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "✅ Leitura registrada com sucesso!",
        description: "Sua confirmação de leitura foi registrada."
      });

      fetchLeituras();
    } catch (error) {
      console.error("Erro ao confirmar leitura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível confirmar a leitura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setConfirmingReading(null);
    }
  };

  const jaLeu = (avisoId: string) => {
    if (!studentData.nomeUsuario) return false;
    
    return leituras.some(leitura => {
      const emailMatch = leitura.email_aluno === studentData.email || 
                        leitura.email_aluno === studentData.nomeUsuario;
      return leitura.aviso_id === avisoId && emailMatch;
    });
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Carregando avisos...</p>
        </CardContent>
      </Card>
    );
  }

  if (avisos.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Nenhum aviso disponível no momento. Fique atento às atualizações da coordenação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-primary">
          <div className="p-2 bg-gradient-to-r from-primary to-secondary rounded-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Mural de Avisos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {avisos.map(aviso => (
          <Card 
            key={aviso.id} 
            className={`${
              aviso.prioridade === 'destaque' 
                ? 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' 
                : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {aviso.prioridade === 'destaque' && (
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    )}
                    {aviso.titulo}
                  </CardTitle>
                  {aviso.prioridade === 'destaque' && (
                    <Badge variant="secondary" className="mt-2 bg-orange-100 text-orange-800">
                      Destaque
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(aviso.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {aviso.descricao}
              </div>
              
              {aviso.imagem_url && (
                <div className="mt-3">
                  <img 
                    src={aviso.imagem_url} 
                    alt="Imagem do aviso" 
                    className="max-w-full h-auto rounded-lg border" 
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                {aviso.link_externo && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(aviso.link_externo, '_blank')}
                    className="w-full sm:w-auto"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Acessar Link
                  </Button>
                )}
                
                {jaLeu(aviso.id) ? (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-600 cursor-default"
                    disabled
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Leitura confirmada
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800"
                    onClick={() => handleConfirmarLeitura(aviso.id)}
                    disabled={confirmingReading === aviso.id}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {confirmingReading === aviso.id ? "Confirmando..." : "Confirmar Leitura"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};