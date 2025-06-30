
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";

const EnvieRedacao = () => {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [fraseTematica, setFraseTematica] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const { toast } = useToast();

  // Recupera dados do usuário
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determina o tipo de envio e turma
  let tipoEnvio = "visitante";
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
  }

  // Pré-preencher dados se for visitante cadastrado
  useState(() => {
    if (userType === "visitante" && visitanteData) {
      const dados = JSON.parse(visitanteData);
      setNomeCompleto(dados.nome || "");
      setEmail(dados.email || "");
    }
  });

  const { data: redacoesEnviadas, isLoading, refetch } = useQuery({
    queryKey: ['redacoes-enviadas'],
    queryFn: async () => {
      console.log('Buscando redações enviadas...');
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar redações enviadas:', error);
        throw error;
      }
      
      console.log('Redações enviadas encontradas:', data?.length || 0);
      return data || [];
    },
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
        description: `Sua redação foi salva e estará disponível para correção. ${
          tipoEnvio === 'regular' ? 'Você poderá visualizá-la no card "Minhas Redações" na página inicial.' : 'Você pode visualizá-la na lista abaixo.'
        }`,
      });

      // Limpar formulário
      if (userType !== "visitante") {
        setNomeCompleto("");
        setEmail("");
      }
      setFraseTematica("");
      setRedacaoTexto("");
      
      // Recarregar lista de redações
      refetch();

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-redator-accent hover:text-redator-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-redator-primary">Envie sua Redação</h1>
                <p className="text-redator-accent">Escreva sua redação e receba correção personalizada</p>
              </div>
            </div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src="/lovable-uploads/e8f3c7a9-a9bb-43ac-ba3d-e625d15834d8.png" alt="App do Redator - Voltar para Home" className="h-8 w-auto max-w-[120px] object-contain" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toggle entre formulário e lista */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setShowForm(true)}
            variant={showForm ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar Redação
          </Button>
          {tipoEnvio === "visitante" && (
            <Button
              onClick={() => setShowForm(false)}
              variant={!showForm ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Ver Redações Enviadas
            </Button>
          )}
        </div>

        {showForm ? (
          /* Formulário de envio */
          <Card className="max-w-4xl mx-auto border-redator-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-redator-primary">
                <Send className="w-5 h-5" />
                Envie sua Redação
              </CardTitle>
              <p className="text-redator-accent">
                Preencha todos os campos abaixo para enviar sua redação. Ela será corrigida e você poderá visualizar as notas e comentários {
                  tipoEnvio === 'regular' ? 'no card "Minhas Redações" na página inicial' : 'na seção "Ver Redações Enviadas"'
                }.
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
                  </label>
                  <Input
                    id="frase-tematica"
                    type="text"
                    placeholder="Digite a frase temática da sua redação..."
                    value={fraseTematica}
                    onChange={(e) => setFraseTematica(e.target.value)}
                    className="border-redator-accent/30 focus:border-redator-accent"
                    maxLength={200}
                  />
                  <p className="text-xs text-redator-accent mt-1">
                    {fraseTematica.length}/200 caracteres
                  </p>
                </div>

                <div>
                  <label htmlFor="redacao-texto" className="block text-sm font-medium text-redator-primary mb-2">
                    Texto da Redação *
                  </label>
                  <Textarea
                    id="redacao-texto"
                    placeholder="Escreva sua redação completa aqui..."
                    value={redacaoTexto}
                    onChange={(e) => setRedacaoTexto(e.target.value)}
                    className="min-h-[400px] border-redator-accent/30 focus:border-redator-accent resize-y"
                  />
                  <p className="text-xs text-redator-accent mt-1">
                    {redacaoTexto.length} caracteres
                  </p>
                </div>

                {/* Informações sobre tipo de envio */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Tipo de envio:</strong> {
                      tipoEnvio === 'regular' ? `Aluno da ${alunoTurma}` : 'Visitante'
                    }
                  </p>
                  {tipoEnvio === 'regular' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Sua redação ficará disponível no card "Minhas Redações" na página inicial, protegida por e-mail.
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
                >
                  {isSubmitting ? "Salvando..." : "Enviar Redação"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Lista de redações enviadas - apenas para visitantes */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-redator-primary">Redações Enviadas (Visitantes)</h2>
              {redacoesEnviadas && (
                <p className="text-sm text-redator-accent">
                  {redacoesEnviadas.filter(r => r.tipo_envio === 'visitante').length} redação{redacoesEnviadas.filter(r => r.tipo_envio === 'visitante').length !== 1 ? 'ões' : ''} encontrada{redacoesEnviadas.filter(r => r.tipo_envio === 'visitante').length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
                <p className="text-redator-accent">Carregando redações...</p>
              </div>
            ) : redacoesEnviadas && redacoesEnviadas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {redacoesEnviadas
                  .filter(redacao => redacao.tipo_envio === 'visitante')
                  .map((redacao) => (
                    <RedacaoEnviadaCard key={redacao.id} redacao={redacao} />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-redator-primary mb-2">Nenhuma redação encontrada</h3>
                <p className="text-redator-accent mb-4">
                  Ainda não há redações enviadas por visitantes.
                </p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-redator-primary hover:bg-redator-primary/90 text-white"
                >
                  Enviar Redação
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default EnvieRedacao;
