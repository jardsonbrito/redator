import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, Lock, AlertCircle, Shield, CheckCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";

type RedacaoTurma = {
  id: string;
  frase_tematica: string;
  nome_aluno: string;
  email_aluno: string;
  tipo_envio: string;
  data_envio: string;
  status: string;
  corrigida: boolean;
  nota_total: number | null;
  comentario_admin: string | null;
  data_correcao: string | null;
  redacao_texto?: string;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
};

type AuthenticatedRedacao = RedacaoTurma & {
  redacao_texto: string;
  redacao_manuscrita_url?: string | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  // Campos dos comentários pedagógicos dos corretores
  comentario_c1_corretor_1?: string | null;
  comentario_c2_corretor_1?: string | null;
  comentario_c3_corretor_1?: string | null;
  comentario_c4_corretor_1?: string | null;
  comentario_c5_corretor_1?: string | null;
  elogios_pontos_atencao_corretor_1?: string | null;
  comentario_c1_corretor_2?: string | null;
  comentario_c2_corretor_2?: string | null;
  comentario_c3_corretor_2?: string | null;
  comentario_c4_corretor_2?: string | null;
  comentario_c5_corretor_2?: string | null;
  elogios_pontos_atencao_corretor_2?: string | null;
  // URLs de correções externas
  correcao_arquivo_url_corretor_1?: string | null;
  correcao_arquivo_url_corretor_2?: string | null;
  turma: string;
};

export const MinhasRedacoes = () => {
  const [selectedRedacaoId, setSelectedRedacaoId] = useState<string | null>(null);
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<AuthenticatedRedacao | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const { toast } = useToast();

  // Recupera dados do usuário com validação aprimorada
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const alunoData = localStorage.getItem("alunoData");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determinar código da turma e email do usuário
  let turmaCode = "";
  let visitanteEmail = "";
  let alunoEmail = "";
  
  if (userType === "aluno" && alunoTurma && alunoData) {
    try {
      const dados = JSON.parse(alunoData);
      alunoEmail = dados.email;
      const turmasMap = {
        "Turma A": "LRA2025",
        "Turma B": "LRB2025", 
        "Turma C": "LRC2025",
        "Turma D": "LRD2025",
        "Turma E": "LRE2025"
      };
      turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "";
    } catch (error) {
      console.error('❌ Erro ao parsear dados do aluno:', error);
    }
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      visitanteEmail = dados.email;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  // Query usando função atualizada que busca por user_id primeiro
  const { data: redacoesTurma, isLoading, error, refetch } = useQuery({
    queryKey: ['redacoes-turma-funcionando', alunoEmail, visitanteEmail],
    queryFn: async () => {
      console.log('🔍 Buscando redações usando função atualizada');
      
      if (userType === "aluno" && alunoEmail) {
        // Para alunos, usar a função atualizada que busca por user_id primeiro
        console.log('👨‍🎓 Buscando redações de aluno usando função get_student_redacoes:', alunoEmail);
        
        const { data, error } = await supabase.rpc('get_student_redacoes', {
          student_email: alunoEmail.toLowerCase().trim()
        });

        if (error) {
          console.error('❌ Erro ao buscar redações do aluno:', error);
          return [];
        }

        console.log('✅ Redações encontradas para aluno:', data?.length || 0);
        return data || [];
        
      } else if (userType === "visitante" && visitanteEmail) {
        // Para visitantes, ainda usar busca direta pois não estão na tabela profiles
        console.log('👤 Buscando redações do visitante:', visitanteEmail);
        
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select(`
            id,
            frase_tematica,
            nome_aluno,
            email_aluno,
            tipo_envio,
            data_envio,
            status,
            corrigida,
            nota_total,
            comentario_admin,
            data_correcao
          `)
          .eq('email_aluno', visitanteEmail.toLowerCase().trim())
          .eq('tipo_envio', 'visitante')
          .order('data_envio', { ascending: false });
        
        if (error) {
          console.error('❌ Erro ao buscar redações do visitante:', error);
          throw error;
        }
        
        console.log('✅ Redações do visitante encontradas:', data?.length || 0);
        return data as RedacaoTurma[] || [];
      }
      
      return [];
    },
    enabled: !!(alunoEmail || visitanteEmail),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const handleViewRedacao = (redacao: RedacaoTurma) => {
    console.log('🔐 Iniciando fluxo SEGURO para visualização de redação');
    setAuthenticatedRedacao(null);
    setShowRedacaoDialog(false);
    setSelectedRedacaoId(redacao.id);
    setEmailInput("");
    setIsAuthDialogOpen(true);
  };

  const validarEmailRigoroso = async (emailCorreto: string, emailDigitado: string): Promise<boolean> => {
    console.log('🔒 MINHAS REDAÇÕES: INICIANDO VALIDAÇÃO RIGOROSA:', { emailCorreto, emailDigitado });
    
    const emailCorretoNormalizado = emailCorreto.toLowerCase().trim();
    const emailDigitadoNormalizado = emailDigitado.toLowerCase().trim();
    
    console.log('📧 MINHAS REDAÇÕES: E-MAILS NORMALIZADOS:', { 
      emailCorretoNormalizado, 
      emailDigitadoNormalizado,
      saoIguais: emailCorretoNormalizado === emailDigitadoNormalizado
    });

    if (emailCorretoNormalizado !== emailDigitadoNormalizado) {
      console.log('❌ MINHAS REDAÇÕES: FALHA NA VALIDAÇÃO DIRETA');
      return false;
    }

    try {
      const { data: canAccess, error } = await supabase.rpc('can_access_redacao', {
        redacao_email: emailCorreto,
        user_email: emailDigitado
      });

      console.log('🔍 MINHAS REDAÇÕES: RESULTADO SUPABASE:', { canAccess, error });

      if (error || canAccess !== true) {
        console.log('❌ MINHAS REDAÇÕES: FALHA NA VALIDAÇÃO SUPABASE');
        return false;
      }
    } catch (error) {
      console.log('❌ MINHAS REDAÇÕES: ERRO NA VALIDAÇÃO SUPABASE:', error);
      return false;
    }

    console.log('✅ MINHAS REDAÇÕES: VALIDAÇÃO RIGOROSA APROVADA');
    return true;
  };

  const handleEmailAuth = async () => {
    if (!selectedRedacaoId || !emailInput.trim()) {
      toast({
        title: "❌ E-mail obrigatório",
        description: "Digite o e-mail cadastrado na redação.",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    console.log('🔍 Iniciando validação segura de e-mail...');

    try {
      const redacaoBasica = redacoesTurma?.find(r => r.id === selectedRedacaoId);
      if (!redacaoBasica) {
        throw new Error('Redação não encontrada');
      }

      const isValid = await validarEmailRigoroso(redacaoBasica.email_aluno, emailInput.trim());

      if (!isValid) {
        console.error('🚫 MINHAS REDAÇÕES: ACESSO NEGADO - E-mail incorreto');
        toast({
          title: "🚫 E-mail incorreto",
          description: "Utilize o mesmo e-mail informado no envio da redação.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ E-mail validado com sucesso');

      let redacaoCompleta;
      
      if (redacaoBasica.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select('*, simulados!inner(frase_tematica)')
          .eq('id', selectedRedacaoId)
          .single();
          
        if (error) {
          console.error('❌ Erro ao carregar redação de simulado:', error);
          throw new Error('Erro ao carregar redação de simulado');
        }
        
        redacaoCompleta = {
          ...data,
          redacao_texto: data.texto,
          frase_tematica: (data.simulados as any)?.frase_tematica || 'Simulado'
        };
      } else {
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', selectedRedacaoId)
          .single();

        if (error) {
          console.error('❌ Erro ao carregar redação regular:', error);
          throw new Error('Erro ao carregar redação regular');
        }
        
        redacaoCompleta = data;
      }

      const redacaoAutenticada: AuthenticatedRedacao = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacaoBasica.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacaoCompleta.corrigida ? 'corrigida' : 'aguardando', // Corrigindo status
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin || redacaoCompleta.comentario_pedagogico,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "",
        redacao_manuscrita_url: redacaoCompleta.redacao_manuscrita_url,
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        // Incluindo comentários pedagógicos dos corretores
        comentario_c1_corretor_1: redacaoCompleta.comentario_c1_corretor_1,
        comentario_c2_corretor_1: redacaoCompleta.comentario_c2_corretor_1,
        comentario_c3_corretor_1: redacaoCompleta.comentario_c3_corretor_1,
        comentario_c4_corretor_1: redacaoCompleta.comentario_c4_corretor_1,
        comentario_c5_corretor_1: redacaoCompleta.comentario_c5_corretor_1,
        elogios_pontos_atencao_corretor_1: redacaoCompleta.elogios_pontos_atencao_corretor_1,
        comentario_c1_corretor_2: redacaoCompleta.comentario_c1_corretor_2,
        comentario_c2_corretor_2: redacaoCompleta.comentario_c2_corretor_2,
        comentario_c3_corretor_2: redacaoCompleta.comentario_c3_corretor_2,
        comentario_c4_corretor_2: redacaoCompleta.comentario_c4_corretor_2,
        comentario_c5_corretor_2: redacaoCompleta.comentario_c5_corretor_2,
        elogios_pontos_atencao_corretor_2: redacaoCompleta.elogios_pontos_atencao_corretor_2,
        // URLs de correções externas
        correcao_arquivo_url_corretor_1: redacaoCompleta.correcao_arquivo_url_corretor_1,
        correcao_arquivo_url_corretor_2: redacaoCompleta.correcao_arquivo_url_corretor_2,
        turma: redacaoCompleta.turma || (userType === "aluno" ? turmaCode : "visitante"),
      };

      setIsAuthDialogOpen(false);
      setAuthenticatedRedacao(redacaoAutenticada);
      setShowRedacaoDialog(true);
      
      console.log('🎉 Redação liberada com segurança total');
      toast({
        title: "✅ Redação liberada!",
        description: "E-mail confirmado. Visualizando redação completa.",
      });

    } catch (error) {
      console.error('💥 Erro na autenticação:', error);
      toast({
        title: "❌ Erro na autenticação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const resetAuthenticationState = () => {
    console.log('🔄 Resetando estados de autenticação');
    setSelectedRedacaoId(null);
    setAuthenticatedRedacao(null);
    setEmailInput("");
    setIsAuthDialogOpen(false);
    setShowRedacaoDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício',
      'simulado': 'Simulado',
      'visitante': 'Visitante'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoEnvioColor = (tipo: string) => {
    const cores = {
      'regular': 'bg-blue-100 text-blue-800',
      'exercicio': 'bg-purple-100 text-purple-800',
      'simulado': 'bg-orange-100 text-orange-800',
      'visitante': 'bg-gray-100 text-gray-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-blue-100 text-blue-800';
  };

  // Validação se há usuário logado
  if (!alunoEmail && !visitanteEmail) {
    return (
      <Card className="border-redator-accent/20">
        <CardContent className="text-center py-8">
          <Shield className="w-12 h-12 text-redator-accent mx-auto mb-4" />
          <p className="text-redator-accent">
            🔐 Faça login como aluno ou visitante para visualizar suas redações.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
        <p className="text-redator-accent">🔒 Carregando suas redações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">❌ Erro ao carregar suas redações. Tente novamente.</p>
          <Button onClick={() => refetch()} className="mt-2">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Mensagem quando não há redações do usuário logado
  if (!redacoesTurma || redacoesTurma.length === 0) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            📝 Minhas Redações
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="w-16 h-16 text-redator-accent/50 mx-auto mb-4" />
          <p className="text-redator-accent mb-4 text-lg font-medium">
            🔔 Você ainda não enviou nenhuma redação.
          </p>
          <p className="text-sm text-redator-accent/70">
            Suas redações corrigidas aparecerão aqui quando disponíveis!
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Verificar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-redator-primary" />
          <h2 className="text-xl font-bold text-redator-primary">
            {userType === "aluno" ? 
              `🔐 Minhas Redações - ${alunoTurma} (${redacoesTurma.length})` : 
              `🔐 Minhas Redações (${redacoesTurma.length})`
            }
          </h2>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {redacoesTurma.map((redacao) => (
            <Card key={redacao.id} className="border-redator-accent/20 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-redator-primary text-sm line-clamp-2 flex-1">
                      {redacao.frase_tematica}
                    </h3>
                    <Badge className="bg-green-100 text-green-800 shrink-0 text-xs">
                      ✅ Corrigida
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-xs text-redator-accent">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{redacao.nome_aluno}</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(redacao.data_envio)}</span>
                      </div>
                      
                      <Badge className={`${getTipoEnvioColor(redacao.tipo_envio)} text-xs`}>
                        {getTipoEnvioLabel(redacao.tipo_envio)}
                      </Badge>
                    </div>
                    
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500 mt-2"
                    onClick={() => handleViewRedacao(redacao)}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    🔒 Ver Correção
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isAuthDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetAuthenticationState();
        }
        setIsAuthDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              🔒 ACESSO SEGURO OBRIGATÓRIO
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>SEGURANÇA MÁXIMA:</strong> Digite o e-mail <strong>EXATO</strong> usado no envio da redação. Os dados só são carregados após validação rigorosa.
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email-auth" className="block text-sm font-bold text-red-700 mb-2">
                🔐 E-mail de Acesso * (obrigatório)
              </label>
              <Input
                id="email-auth"
                type="email"
                placeholder="Digite o e-mail EXATO cadastrado..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="border-2 border-red-300 focus:border-red-500"
                disabled={isAuthenticating}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEmailAuth}
                disabled={isAuthenticating || !emailInput.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isAuthenticating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Validando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    🔓 Verificar E-mail
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => resetAuthenticationState()}
                className="border-red-300"
                disabled={isAuthenticating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {authenticatedRedacao && showRedacaoDialog && (
        <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetAuthenticationState();
          }
          setShowRedacaoDialog(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Vista Pedagógica
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 p-3 rounded">
                <p className="text-sm text-green-800 font-medium">
                  ✅ E-mail validado com sucesso. Acesso liberado com segurança máxima.
                </p>
              </div>
              
              <RedacaoEnviadaCard 
                redacao={{
                  id: authenticatedRedacao.id,
                  frase_tematica: authenticatedRedacao.frase_tematica,
                  redacao_texto: authenticatedRedacao.redacao_texto,
                  redacao_manuscrita_url: authenticatedRedacao.redacao_manuscrita_url,
                  data_envio: authenticatedRedacao.data_envio,
                  nota_c1: authenticatedRedacao.nota_c1,
                  nota_c2: authenticatedRedacao.nota_c2,
                  nota_c3: authenticatedRedacao.nota_c3,
                  nota_c4: authenticatedRedacao.nota_c4,
                  nota_c5: authenticatedRedacao.nota_c5,
                  nota_total: authenticatedRedacao.nota_total,
                  comentario_admin: authenticatedRedacao.comentario_admin,
                  corrigida: authenticatedRedacao.corrigida,
                  data_correcao: authenticatedRedacao.data_correcao,
                  nome_aluno: authenticatedRedacao.nome_aluno,
                  email_aluno: authenticatedRedacao.email_aluno,
                  tipo_envio: authenticatedRedacao.tipo_envio,
                  status: authenticatedRedacao.status,
                  turma: authenticatedRedacao.turma,
                  // Incluindo todos os comentários pedagógicos dos corretores
                  comentario_c1_corretor_1: authenticatedRedacao.comentario_c1_corretor_1,
                  comentario_c2_corretor_1: authenticatedRedacao.comentario_c2_corretor_1,
                  comentario_c3_corretor_1: authenticatedRedacao.comentario_c3_corretor_1,
                  comentario_c4_corretor_1: authenticatedRedacao.comentario_c4_corretor_1,
                  comentario_c5_corretor_1: authenticatedRedacao.comentario_c5_corretor_1,
                  elogios_pontos_atencao_corretor_1: authenticatedRedacao.elogios_pontos_atencao_corretor_1,
                  comentario_c1_corretor_2: authenticatedRedacao.comentario_c1_corretor_2,
                  comentario_c2_corretor_2: authenticatedRedacao.comentario_c2_corretor_2,
                  comentario_c3_corretor_2: authenticatedRedacao.comentario_c3_corretor_2,
                  comentario_c4_corretor_2: authenticatedRedacao.comentario_c4_corretor_2,
                  comentario_c5_corretor_2: authenticatedRedacao.comentario_c5_corretor_2,
                  elogios_pontos_atencao_corretor_2: authenticatedRedacao.elogios_pontos_atencao_corretor_2,
                  // URLs de correções externas
                  correcao_arquivo_url_corretor_1: authenticatedRedacao.correcao_arquivo_url_corretor_1,
                  correcao_arquivo_url_corretor_2: authenticatedRedacao.correcao_arquivo_url_corretor_2,
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
