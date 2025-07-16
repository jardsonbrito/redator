import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertTriangle, Users, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AlunoPendente {
  id: string;
  nome: string;
  email: string;
  turma: string;
  data_solicitacao: string;
}

interface AlunosAprovacaoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAlunosProcessados: () => void;
}

export const AlunosAprovacaoPopup = ({ isOpen, onClose, onAlunosProcessados }: AlunosAprovacaoPopupProps) => {
  const [alunos, setAlunos] = useState<AlunoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Buscar o profile ID do admin atual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (profileError) {
        throw new Error('Perfil do administrador não encontrado');
      }

      setAdminProfileId(profile.id);

      // Buscar alunos pendentes
      const { data: alunosPendentes, error: alunosError } = await supabase.rpc('get_alunos_pendentes');
      
      if (alunosError) {
        throw alunosError;
      }

      setAlunos(alunosPendentes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de alunos pendentes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.email) {
      carregarDados();
    }
  }, [isOpen, user?.email]);

  // Adicionar suporte para ESC
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const aprovarAluno = async (alunoId: string, nomeAluno: string) => {
    if (!adminProfileId) {
      toast({
        title: "Erro de autenticação",
        description: "Perfil do administrador não encontrado. Tente fazer login novamente.",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessando(alunoId);
      
      const { data, error } = await supabase.rpc('aprovar_aluno', {
        aluno_id: alunoId,
        admin_id: adminProfileId
      });

      if (error) {
        throw error;
      }

      if (data) {
        toast({
          title: "Aluno aprovado!",
          description: `${nomeAluno} foi aprovado e pode agora acessar a plataforma.`
        });
        
        // Remover aluno da lista local
        setAlunos(prev => prev.filter(aluno => aluno.id !== alunoId));
      } else {
        throw new Error('Falha ao aprovar aluno');
      }
    } catch (error: any) {
      console.error('Erro ao aprovar aluno:', error);
      toast({
        title: "Erro ao aprovar aluno",
        description: error.message || "Não foi possível aprovar o aluno. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessando(null);
    }
  };

  const recusarAluno = async (alunoId: string, nomeAluno: string) => {
    if (!adminProfileId) {
      toast({
        title: "Erro de autenticação",
        description: "Perfil do administrador não encontrado. Tente fazer login novamente.",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessando(alunoId);
      
      const { data, error } = await supabase.rpc('recusar_aluno', {
        aluno_id: alunoId,
        admin_id: adminProfileId
      });

      if (error) {
        throw error;
      }

      if (data) {
        toast({
          title: "Aluno recusado",
          description: `O cadastro de ${nomeAluno} foi recusado.`,
          variant: "destructive"
        });
        
        // Remover aluno da lista local
        setAlunos(prev => prev.filter(aluno => aluno.id !== alunoId));
      } else {
        throw new Error('Falha ao recusar aluno');
      }
    } catch (error: any) {
      console.error('Erro ao recusar aluno:', error);
      toast({
        title: "Erro ao recusar aluno",
        description: error.message || "Não foi possível recusar o aluno. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessando(null);
    }
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClose = () => {
    setProcessando(null); // Limpar processamento
    onClose();
    if (alunos.length === 0) {
      onAlunosProcessados();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span>Novos alunos aguardando aprovação</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando alunos pendentes...</p>
              </div>
            </div>
          ) : alunos.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-medium text-green-700">Todos os alunos foram processados!</p>
                <p className="text-sm text-muted-foreground">Não há novos cadastros pendentes de aprovação.</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Data de Inscrição</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunos.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">{aluno.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{aluno.turma}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{aluno.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {formatarData(aluno.data_solicitacao)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                           <Button
                            size="sm"
                            onClick={() => aprovarAluno(aluno.id, aluno.nome)}
                            disabled={processando !== null}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processando === aluno.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Ativar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => recusarAluno(aluno.id, aluno.nome)}
                            disabled={processando !== null}
                          >
                            {processando === aluno.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Recusar
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={processando !== null}
            >
              {alunos.length === 0 ? 'Fechar' : 'Fechar e revisar depois'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};