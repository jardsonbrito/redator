
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Calendar, User, Mail, FileText, CheckCircle, Home, Shield, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const MeusSimulados = () => {
  const { toast } = useToast();
  const [emailVerificacao, setEmailVerificacao] = useState<{[key: string]: string}>({});
  const [redacaoAutenticada, setRedacaoAutenticada] = useState<{[key: string]: boolean}>({});
  const [isValidating, setIsValidating] = useState<{[key: string]: boolean}>({});

  // Recupera a turma do usuário
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  
  let turmaUsuario = "visitante";
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaUsuario = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
  }

  const { data: redacoesCorrigidas, isLoading } = useQuery({
    queryKey: ['redacoes-simulado-corrigidas', turmaUsuario],
    queryFn: async () => {
      let query = supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica, turmas_autorizadas)
        `)
        .eq('corrigida', true)
        .order('data_envio', { ascending: false });

      // Filtra por turma
      if (turmaUsuario !== "visitante") {
        query = query.eq('turma', turmaUsuario);
      } else {
        query = query.eq('turma', 'visitante');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  // Função de validação RIGOROSA
  const validarEmailRigoroso = async (redacaoId: string, emailCorreto: string, emailDigitado: string): Promise<boolean> => {
    console.log('🔒 INICIANDO VALIDAÇÃO RIGOROSA:', { redacaoId, emailCorreto, emailDigitado });
    
    // Normalização dos e-mails
    const emailCorretoNormalizado = emailCorreto.toLowerCase().trim();
    const emailDigitadoNormalizado = emailDigitado.toLowerCase().trim();
    
    console.log('📧 E-MAILS NORMALIZADOS:', { 
      emailCorretoNormalizado, 
      emailDigitadoNormalizado,
      saoIguais: emailCorretoNormalizado === emailDigitadoNormalizado
    });

    // VALIDAÇÃO 1: Comparação direta rigorosa
    if (emailCorretoNormalizado !== emailDigitadoNormalizado) {
      console.log('❌ FALHA NA VALIDAÇÃO DIRETA');
      return false;
    }

    // VALIDAÇÃO 2: Verificação via Supabase
    try {
      const { data: canAccess, error } = await supabase.rpc('can_access_redacao', {
        redacao_email: emailCorreto,
        user_email: emailDigitado
      });

      console.log('🔍 RESULTADO SUPABASE:', { canAccess, error });

      if (error || canAccess !== true) {
        console.log('❌ FALHA NA VALIDAÇÃO SUPABASE');
        return false;
      }
    } catch (error) {
      console.log('❌ ERRO NA VALIDAÇÃO SUPABASE:', error);
      return false;
    }

    console.log('✅ VALIDAÇÃO RIGOROSA APROVADA');
    return true;
  };

  const verificarEmailEMostrarRedacao = async (redacaoId: string, emailCorreto: string) => {
    const emailDigitado = emailVerificacao[redacaoId]?.trim();
    
    if (!emailDigitado) {
      toast({
        title: "❌ E-mail obrigatório",
        description: "Digite o e-mail para acessar a correção.",
        variant: "destructive",
      });
      return;
    }

    // Resetar estado de autenticação antes de validar
    setRedacaoAutenticada(prev => ({ ...prev, [redacaoId]: false }));
    setIsValidating(prev => ({ ...prev, [redacaoId]: true }));

    try {
      const isValid = await validarEmailRigoroso(redacaoId, emailCorreto, emailDigitado);
      
      if (!isValid) {
        console.log('🚫 ACESSO NEGADO - E-mail incorreto');
        toast({
          title: "🚫 E-mail incorreto",
          description: "Utilize o mesmo e-mail informado no envio da redação.",
          variant: "destructive",
        });
        // Garantir que redação não seja mostrada
        setRedacaoAutenticada(prev => ({ ...prev, [redacaoId]: false }));
        return;
      }

      // ✅ ACESSO APROVADO
      console.log('✅ ACESSO APROVADO - E-mail validado com sucesso');
      setRedacaoAutenticada(prev => ({ ...prev, [redacaoId]: true }));
      toast({
        title: "✅ Correção liberada!",
        description: "E-mail confirmado. Visualizando correção.",
      });

    } catch (error) {
      console.error('💥 Erro na validação:', error);
      toast({
        title: "❌ Erro na validação", 
        description: "Tente novamente.",
        variant: "destructive",
      });
      setRedacaoAutenticada(prev => ({ ...prev, [redacaoId]: false }));
    } finally {
      setIsValidating(prev => ({ ...prev, [redacaoId]: false }));
    }
  };

  // Função para resetar autenticação ao limpar campo
  const handleEmailChange = (redacaoId: string, value: string) => {
    setEmailVerificacao(prev => ({ ...prev, [redacaoId]: value }));
    // Resetar autenticação sempre que o e-mail mudar
    if (redacaoAutenticada[redacaoId]) {
      setRedacaoAutenticada(prev => ({ ...prev, [redacaoId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <header className="bg-white shadow-sm border-b border-redator-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <Home className="w-5 h-5" />
              <span>Início</span>
            </Link>
              <h1 className="text-2xl font-bold text-redator-primary">Meus Simulados</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">Carregando simulados...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <Home className="w-5 h-5" />
              <span>Início</span>
            </Link>
            <h1 className="text-2xl font-bold text-redator-primary">🔐 Meus Simulados</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">
            📝 Redações Corrigidas
          </h2>
          <p className="text-redator-accent">
            🔒 Digite seu e-mail para acessar sua correção com segurança máxima.
          </p>
        </div>

        {!redacoesCorrigidas || redacoesCorrigidas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma redação corrigida
              </h3>
              <p className="text-gray-500">
                Ainda não há redações de simulados corrigidas para sua turma.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {redacoesCorrigidas.map((redacao) => (
              <Card key={redacao.id} className="border-l-4 border-l-redator-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{redacao.simulados.titulo}</CardTitle>
                      <p className="text-sm text-gray-600 mb-3">{redacao.simulados.frase_tematica}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Corrigida
                        </Badge>
                        <Badge variant="outline">
                          Nota: {redacao.nota_total}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {redacao.nome_aluno}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Enviado em {format(new Date(redacao.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>

                      {/* CAMPO DE VERIFICAÇÃO DE E-MAIL - SEMPRE VISÍVEL */}
                      {!redacaoAutenticada[redacao.id] && (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-amber-600" />
                            <span className="text-sm font-bold text-amber-900">
                              🔒 ACESSO SEGURO OBRIGATÓRIO
                            </span>
                          </div>
                          <p className="text-sm text-amber-800 mb-3">
                            Para visualizar sua correção, digite o e-mail <strong>exato</strong> usado no envio da redação.
                          </p>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="Digite o e-mail exato usado no envio"
                              value={emailVerificacao[redacao.id] || ""}
                              onChange={(e) => handleEmailChange(redacao.id, e.target.value)}
                              className="flex-1 border-amber-300 focus:border-amber-500"
                              disabled={isValidating[redacao.id]}
                            />
                            <Button
                              onClick={() => verificarEmailEMostrarRedacao(redacao.id, redacao.email_aluno)}
                              size="sm"
                              className="bg-redator-primary hover:bg-redator-primary/90"
                              disabled={isValidating[redacao.id] || !emailVerificacao[redacao.id]?.trim()}
                            >
                              {isValidating[redacao.id] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Validando...
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 mr-1" />
                                  Verificar E-mail
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* MOSTRAR CORREÇÃO APENAS APÓS AUTENTICAÇÃO RIGOROSA */}
                      {redacaoAutenticada[redacao.id] && (
                        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-bold text-green-900">
                              ✅ E-MAIL VALIDADO - ACESSO LIBERADO
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            <div className="text-center">
                              <Label className="text-xs">C1</Label>
                              <div className="font-bold text-lg text-redator-primary">{redacao.nota_c1}</div>
                            </div>
                            <div className="text-center">
                              <Label className="text-xs">C2</Label>
                              <div className="font-bold text-lg text-redator-primary">{redacao.nota_c2}</div>
                            </div>
                            <div className="text-center">
                              <Label className="text-xs">C3</Label>
                              <div className="font-bold text-lg text-redator-primary">{redacao.nota_c3}</div>
                            </div>
                            <div className="text-center">
                              <Label className="text-xs">C4</Label>
                              <div className="font-bold text-lg text-redator-primary">{redacao.nota_c4}</div>
                            </div>
                            <div className="text-center">
                              <Label className="text-xs">C5</Label>
                              <div className="font-bold text-lg text-redator-primary">{redacao.nota_c5}</div>
                            </div>
                          </div>
                          
                          {redacao.comentario_pedagogico && (
                            <div>
                              <Label className="font-medium text-redator-primary">Comentário Pedagógico:</Label>
                              <div className="mt-2 p-3 bg-white rounded border text-sm">
                                {redacao.comentario_pedagogico}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Redação
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Redação - {redacao.nome_aluno}</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <div className="bg-gray-50 p-4 rounded mb-4">
                              <h3 className="font-bold text-redator-primary mb-2">{redacao.simulados.frase_tematica}</h3>
                            </div>
                            <div className="bg-white p-4 border rounded whitespace-pre-wrap">
                              {redacao.texto}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MeusSimulados;
