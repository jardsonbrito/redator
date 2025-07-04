import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Send, ArrowLeft, FileText } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { RedacaoTextarea } from "@/components/RedacaoTextarea";
import { CorretorSelector } from "@/components/CorretorSelector";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreditInfoDialog } from "@/components/CreditInfoDialog";
import { useCredits } from "@/hooks/useCredits";

const SimuladoParticipacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  const { consumeCreditsByEmail } = useCredits();

  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [isRedacaoValid, setIsRedacaoValid] = useState(false);
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  // Obter dados do usuário logado automaticamente
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  let nomeCompleto = "";
  let email = "";
  let turmaCode = "visitante";
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
    nomeCompleto = `Aluno da ${alunoTurma}`;
    email = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    const dados = JSON.parse(visitanteData);
    nomeCompleto = dados.nome || "";
    email = dados.email || "";
    turmaCode = "visitante";
  }

  const { data: simulado, isLoading, error } = useQuery({
    queryKey: ['simulado-participacao', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do simulado não fornecido');

      console.log('🎯 Carregando simulado para participação:', id);
      
      const { data, error } = await supabase
        .from('simulados')
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico,
            texto_1,
            texto_2,
            texto_3,
            imagem_texto_4_url,
            cabecalho_enem
          )
        `)
        .eq('id', id)
        .eq('ativo', true)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar simulado:', error);
        throw error;
      }

      console.log('✅ Simulado carregado:', data);
      return data;
    },
    enabled: !!id
  });

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!redacaoTexto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, escreva sua redação.",
        variant: "destructive"
      });
      return;
    }

    if (!isRedacaoValid) {
      toast({
        title: "Redação inválida",
        description: "Por favor, escreva sua redação completa.",
        variant: "destructive"
      });
      return;
    }

    if (!email || !nomeCompleto) {
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível identificar o usuário logado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCorretores.length === 0) {
      toast({
        title: "Selecione pelo menos um corretor",
        description: "É necessário selecionar pelo menos um corretor.",
        variant: "destructive"
      });
      return;
    }

    if (selectedCorretores.length > 2) {
      toast({
        title: "Limite de corretores excedido",
        description: "Você pode selecionar no máximo 2 corretores.",
        variant: "destructive"
      });
      return;
    }

    // Mostrar dialog de créditos antes de continuar
    setShowCreditDialog(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Primeiro, consumir os créditos
      const creditsConsumed = await consumeCreditsByEmail(email, selectedCorretores.length);
      
      if (!creditsConsumed) {
        toast({
          title: "Créditos insuficientes",
          description: "Você não possui créditos suficientes para este envio.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Créditos consumidos com sucesso no simulado');

      const { error } = await supabase
        .from('redacoes_simulado')
        .insert({
          id_simulado: id,
          nome_aluno: nomeCompleto,
          email_aluno: email.toLowerCase(),
          turma: turmaCode,
          texto: redacaoTexto.trim(),
          corretor_id_1: selectedCorretores[0] || null,
          corretor_id_2: selectedCorretores[1] || null,
          status_corretor_1: 'pendente',
          status_corretor_2: selectedCorretores[1] ? 'pendente' : null,
          corrigida: false,
          data_envio: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Redação enviada com sucesso!",
        description: `Sua redação do simulado foi enviada e será corrigida pelos corretores selecionados. ${selectedCorretores.length} crédito(s) foram consumidos.`,
      });

      // Redirecionar para a home após sucesso
      navigate('/app');

    } catch (error: any) {
      console.error("❌ Erro ao enviar redação do simulado:", error);
      toast({
        title: "Erro ao enviar redação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Carregando simulado..." />
            <main className="max-w-4xl mx-auto px-4 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando dados do simulado...</p>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error || !simulado) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Erro" />
            <main className="max-w-4xl mx-auto px-4 py-8">
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-600 mb-2">
                    Simulado não encontrado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    O simulado solicitado não foi encontrado ou não está mais ativo.
                  </p>
                  <Button onClick={() => navigate('/app')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Home
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  // Verificar se simulado está no período correto
  const agora = new Date();
  const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
  const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
  const simuladoDisponivel = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });

  if (!simuladoDisponivel) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Simulado Indisponível" />
            <main className="max-w-4xl mx-auto px-4 py-8">
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-600 mb-2">
                    Simulado não está disponível
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Este simulado não está no período de participação.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>Período:</strong> {format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} até {format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Button onClick={() => navigate('/app')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Home
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle={`Simulado: ${simulado.titulo}`} />
          
          <main className="max-w-4xl mx-auto px-4 py-8">
            {/* Header do simulado */}
            <div className="mb-8">
              <Button 
                onClick={() => navigate('/app')} 
                variant="ghost" 
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Home
              </Button>

              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-800">
                      🎯 {simulado.titulo}
                    </CardTitle>
                    <Badge className="bg-green-500 text-white">
                      EM PROGRESSO
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-green-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Término: {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Proposta de redação */}
            {simulado.temas && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-primary">
                    📝 Proposta de Redação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Frase temática */}
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">
                      {simulado.temas.frase_tematica}
                    </h3>
                  </div>

                  {/* Imagem se disponível */}
                  {simulado.temas.imagem_texto_4_url && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={simulado.temas.imagem_texto_4_url} 
                        alt="Imagem do tema"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Cabeçalho padrão */}
                  <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                    <p className="text-primary leading-relaxed font-medium text-sm">
                      {simulado.temas.cabecalho_enem || 
                        `A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "${simulado.temas.frase_tematica}", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.`
                      }
                    </p>
                  </div>

                  {/* Textos motivadores */}
                  {simulado.temas.texto_1 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="font-semibold text-primary mb-3">Texto Motivador I</h4>
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {simulado.temas.texto_1}
                      </p>
                    </div>
                  )}

                  {simulado.temas.texto_2 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="font-semibold text-primary mb-3">Texto Motivador II</h4>
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {simulado.temas.texto_2}
                      </p>
                    </div>
                  )}

                  {simulado.temas.texto_3 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="font-semibold text-primary mb-3">Texto Motivador III</h4>
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {simulado.temas.texto_3}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Formulário de envio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Enviar Redação do Simulado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePrimarySubmit} className="space-y-6">
                  {/* Informações do usuário logado - apenas visualização */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-800 mb-2">📋 Dados do envio (automático)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-700">👤 Nome:</span> {nomeCompleto}
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">📧 E-mail:</span> {email}
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">🏫 Turma:</span> {turmaCode}
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">🎯 Tipo:</span> Simulado
                      </div>
                    </div>
                  </div>

                  <CorretorSelector
                    selectedCorretores={selectedCorretores}
                    onCorretoresChange={setSelectedCorretores}
                    isSimulado={true}
                    required={true}
                  />

                  <RedacaoTextarea
                    value={redacaoTexto}
                    onChange={setRedacaoTexto}
                    onValidChange={setIsRedacaoValid}
                  />

                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !isRedacaoValid}
                    className="w-full bg-primary"
                  >
                    {isSubmitting ? "Enviando..." : "Verificar Créditos e Enviar"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <CreditInfoDialog
              isOpen={showCreditDialog}
              onClose={() => setShowCreditDialog(false)}
              onProceed={handleFinalSubmit}
              userEmail={email}
              selectedCorretores={selectedCorretores}
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default SimuladoParticipacao;
