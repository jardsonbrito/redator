
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RedacaoTextarea } from "@/components/RedacaoTextarea";
import { CorretorSelector } from "@/components/CorretorSelector";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreditInfoDialog } from "@/components/CreditInfoDialog";
import { useCredits } from "@/hooks/useCredits";

const EnvieRedacao = () => {
  const [searchParams] = useSearchParams();
  const [fraseTematica, setFraseTematica] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedacaoValid, setIsRedacaoValid] = useState(false);
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const { toast } = useToast();
  const { consumeCreditsByEmail } = useCredits();

  // Parâmetros da URL para pré-preenchimento
  const temaFromUrl = searchParams.get('tema');
  const fonteFromUrl = searchParams.get('fonte');

  // Recupera dados do usuário logado
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

  // Obter dados do usuário logado automaticamente
  let nomeCompleto = "";
  let email = "";
  let tipoEnvio = "avulsa";
  let turmaCode = "visitante";
  
  if (userType === "aluno" && alunoTurma) {
    tipoEnvio = "regular";
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
    
    // Para alunos, usar dados padrão baseados na turma
    nomeCompleto = `Aluno da ${alunoTurma}`;
    email = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    const dados = JSON.parse(visitanteData);
    nomeCompleto = dados.nome || "";
    email = dados.email || "";
    tipoEnvio = "visitante";
    turmaCode = "visitante";
  }

  // Pré-preencher frase temática se vier da URL
  useState(() => {
    if (temaFromUrl) {
      setFraseTematica(decodeURIComponent(temaFromUrl));
    }
  });

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fraseTematica.trim() || !redacaoTexto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha a frase temática e o texto da redação.",
        variant: "destructive",
      });
      return;
    }

    if (!isRedacaoValid) {
      toast({
        title: "Redação obrigatória",
        description: "Por favor, escreva sua redação.",
        variant: "destructive",
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

    // Validação de corretores
    if (selectedCorretores.length === 0) {
      toast({
        title: "Selecione pelo menos um corretor",
        description: "É necessário selecionar pelo menos um corretor para sua redação.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCorretores.length > 2) {
      toast({
        title: "Limite de corretores excedido",
        description: "Você pode selecionar no máximo 2 corretores.",
        variant: "destructive",
      });
      return;
    }

    // Verificar duplicados
    const uniqueCorretores = new Set(selectedCorretores);
    if (uniqueCorretores.size !== selectedCorretores.length) {
      toast({
        title: "Corretores duplicados",
        description: "Não é possível selecionar o mesmo corretor duas vezes.",
        variant: "destructive",
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
        setShowCreditDialog(false);
        return;
      }

      console.log('✅ Créditos consumidos com sucesso');

      const { error } = await supabase
        .from('redacoes_enviadas')
        .insert({
          nome_aluno: nomeCompleto,
          email_aluno: email,
          frase_tematica: fraseTematica.trim(),
          redacao_texto: redacaoTexto.trim(),
          tipo_envio: tipoEnvio,
          turma: turmaCode,
          status: 'aguardando',
          corretor_id_1: selectedCorretores[0] || null,
          corretor_id_2: selectedCorretores[1] || null,
          status_corretor_1: 'pendente',
          status_corretor_2: selectedCorretores[1] ? 'pendente' : null,
          corrigida: false,
          data_envio: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao salvar redação:', error);
        throw error;
      }

      toast({
        title: "Redação enviada com sucesso!",
        description: `Sua redação foi salva e será corrigida pelos corretores selecionados. ${selectedCorretores.length} crédito(s) foram consumidos.`,
      });

      // Limpar formulário
      setFraseTematica("");
      setRedacaoTexto("");
      setSelectedCorretores([]);
      setShowCreditDialog(false);

    } catch (error) {
      console.error('Erro ao enviar redação:', error);
      toast({
        title: "Erro ao enviar redação",
        description: "Ocorreu um erro ao salvar sua redação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle={fonteFromUrl === 'tema' ? 'Redação sobre Tema' : 
               (userType === "aluno" ? 'Enviar Redação – Tema Livre' : 'Enviar Redação Avulsa – Tema Livre')} />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Formulário de envio */}
        <Card className="max-w-4xl mx-auto border-redator-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-redator-primary">
              <Send className="w-5 h-5" />
              {fonteFromUrl === 'tema' ? 'Redação sobre o Tema Selecionado' : 
               (userType === "aluno" ? 'Enviar Redação – Tema Livre' : 'Enviar Redação Avulsa – Tema Livre')}
            </CardTitle>
            <p className="text-redator-accent">
              {fonteFromUrl === 'tema' 
                ? 'Complete os dados abaixo para enviar sua redação sobre o tema escolhido. A frase temática já foi preenchida automaticamente.'
                : 'Preencha os campos abaixo para enviar sua redação sobre tema livre. Ela será corrigida pelos corretores selecionados e você poderá visualizar as notas e comentários no card "Minhas Redações" na página inicial.'
              }
            </p>
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
                    <span className="font-medium text-blue-700">🎯 Tipo:</span> {
                      tipoEnvio === 'regular' ? `Regular - Aluno da ${alunoTurma}` : 
                      tipoEnvio === 'visitante' ? 'Visitante' : 'Avulsa'
                    }
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">🏫 Turma:</span> {turmaCode}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="frase-tematica" className="block text-sm font-medium text-redator-primary mb-2">
                  Frase Temática *
                  {fonteFromUrl === 'tema' && (
                    <span className="text-xs text-green-600 ml-2">(Preenchida automaticamente)</span>
                  )}
                </label>
                <Input
                  id="frase-tematica"
                  type="text"
                  placeholder="Digite a frase temática da sua redação..."
                  value={fraseTematica}
                  onChange={(e) => setFraseTematica(e.target.value)}
                  className="border-redator-accent/30 focus:border-redator-accent"
                  maxLength={200}
                  readOnly={fonteFromUrl === 'tema'}
                />
                <p className="text-xs text-redator-accent mt-1">
                  {fraseTematica.length}/200 caracteres
                  {fonteFromUrl === 'tema' && (
                    <span className="text-green-600 ml-2">✓ Tema selecionado automaticamente</span>
                  )}
                </p>
              </div>

              {/* Seleção de Corretores */}
              <CorretorSelector
                selectedCorretores={selectedCorretores}
                onCorretoresChange={setSelectedCorretores}
                isSimulado={false}
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
                className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
              >
                {isSubmitting ? "Salvando..." : "Verificar Créditos e Enviar"}
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

export default EnvieRedacao;
