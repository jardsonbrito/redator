
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RedacaoTextarea } from "@/components/RedacaoTextarea";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";

const EnvieRedacao = () => {
  const [searchParams] = useSearchParams();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [fraseTematica, setFraseTematica] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedacaoValid, setIsRedacaoValid] = useState(false);
  const { toast } = useToast();

  // Parâmetros da URL para pré-preenchimento
  const temaFromUrl = searchParams.get('tema');
  const fonteFromUrl = searchParams.get('fonte');

  // Recupera dados do usuário
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determina o tipo de envio e turma - baseado no tipo de login do usuário
  let tipoEnvio = "avulsa"; // Para visitantes sem turma
  let turmaCode = "visitante";
  
  if (userType === "aluno" && alunoTurma) {
    tipoEnvio = "regular"; // Para alunos logados com turma
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
  }

  // Pré-preencher dados se for visitante cadastrado ou se vier da URL
  useState(() => {
    if (userType === "visitante" && visitanteData) {
      const dados = JSON.parse(visitanteData);
      setNomeCompleto(dados.nome || "");
      setEmail(dados.email || "");
    }
    
    // Pré-preencher frase temática se vier da URL
    if (temaFromUrl) {
      setFraseTematica(decodeURIComponent(temaFromUrl));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeCompleto.trim() || !email.trim() || !fraseTematica.trim() || !redacaoTexto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios: nome completo, e-mail, frase temática e texto da redação.",
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

    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, digite um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('redacoes_enviadas')
        .insert({
          nome_aluno: nomeCompleto.trim(),
          email_aluno: email.trim(),
          frase_tematica: fraseTematica.trim(),
          redacao_texto: redacaoTexto.trim(),
          tipo_envio: tipoEnvio,
          turma: turmaCode,
          status: 'aguardando'
        });

      if (error) {
        console.error('Erro ao salvar redação:', error);
        throw error;
      }

      toast({
        title: "Redação enviada com sucesso!",
        description: `Sua redação foi salva e estará disponível para correção. Você poderá visualizá-la no card "Minhas Redações" na página inicial.`,
      });

      // Limpar formulário
      if (userType !== "visitante") {
        setNomeCompleto("");
        setEmail("");
      }
      setFraseTematica("");
      setRedacaoTexto("");

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
                : 'Preencha todos os campos abaixo para enviar sua redação sobre tema livre. Ela será corrigida e você poderá visualizar as notas e comentários no card "Minhas Redações" na página inicial.'
              }
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome-completo" className="block text-sm font-medium text-redator-primary mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    id="nome-completo"
                    type="text"
                    placeholder="Digite seu nome completo..."
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="border-redator-accent/30 focus:border-redator-accent"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-redator-primary mb-2">
                    E-mail *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite seu e-mail..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-redator-accent/30 focus:border-redator-accent"
                    maxLength={100}
                  />
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

              <RedacaoTextarea
                value={redacaoTexto}
                onChange={setRedacaoTexto}
                onValidChange={setIsRedacaoValid}
              />

              {/* Informações sobre tipo de envio */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Tipo de envio:</strong> {
                    tipoEnvio === 'regular' ? `Regular - Aluno da ${alunoTurma}` : 'Avulsa - Visitante'
                  }
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Sua redação ficará disponível no card "Minhas Redações" na página inicial.
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !isRedacaoValid}
                className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
              >
                {isSubmitting ? "Salvando..." : "Enviar Redação"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default EnvieRedacao;
