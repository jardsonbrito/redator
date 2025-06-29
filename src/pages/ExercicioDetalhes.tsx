
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Home, ArrowLeft, ExternalLink, FileText, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ExercicioDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");

  const { data: exercicio, isLoading } = useQuery({
    queryKey: ['exercicio', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do exercício não encontrado');
      
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('id', id)
        .eq('ativo', true)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const enviarRedacaoMutation = useMutation({
    mutationFn: async ({ texto, fraseOriginal, exercicioId, nome, emailAluno }: { 
      texto: string, 
      fraseOriginal: string, 
      exercicioId: string,
      nome: string,
      emailAluno: string
    }) => {
      const { error } = await supabase
        .from('redacoes_enviadas')
        .insert({
          redacao_texto: texto,
          frase_tematica: fraseOriginal,
          id_exercicio: exercicioId,
          nome_aluno: nome,
          email_aluno: emailAluno,
          data_envio: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Redação enviada com sucesso!",
        description: "Sua redação foi enviada e estará disponível para correção.",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas'] });
      navigate('/exercicios');
    },
    onError: (error) => {
      console.error('Erro ao enviar redação:', error);
      toast({
        title: "Erro ao enviar redação",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  });

  const handleEnviarRedacao = () => {
    if (!nomeCompleto.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha seu nome completo.",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, preencha seu e-mail.",
        variant: "destructive",
      });
      return;
    }

    if (!redacaoTexto.trim()) {
      toast({
        title: "Redação vazia",
        description: "Por favor, escreva sua redação antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    if (!exercicio) return;

    enviarRedacaoMutation.mutate({
      texto: redacaoTexto,
      fraseOriginal: exercicio.frase_tematica || '',
      exercicioId: exercicio.id,
      nome: nomeCompleto,
      emailAluno: email
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-redator-primary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando exercício...</p>
        </div>
      </div>
    );
  }

  if (!exercicio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-redator-primary mb-4">Exercício não encontrado</h2>
          <Link to="/exercicios">
            <Button>Voltar aos exercícios</Button>
          </Link>
        </div>
      </div>
    );
  }

  const criarCabecalhoEnem = (fraseTematica: string) => {
    return `A partir da leitura da frase temática abaixo e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo em norma padrão da língua portuguesa sobre o tema "${fraseTematica}", apresentando proposta de intervenção para o problema abordado, respeitando os direitos humanos.`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Início</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-redator-accent/20"></div>
              <Link to="/exercicios" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Exercícios</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-redator-accent/20"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-redator-primary">
                {exercicio.titulo}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {exercicio.tipo === 'formulario' ? (
          <Card className="border-redator-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-redator-primary">
                <ExternalLink className="w-6 h-6" />
                {exercicio.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {exercicio.imagem_thumbnail && (
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={exercicio.imagem_thumbnail} 
                    alt={exercicio.titulo}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}
              
              <div className="text-center">
                <p className="text-redator-accent mb-6">
                  Clique no botão abaixo para acessar o formulário
                </p>
                
                {exercicio.embed_formulario && exercicio.url_formulario ? (
                  <div className="space-y-4">
                    <iframe
                      src={exercicio.url_formulario}
                      className="w-full h-96 border border-redator-accent/20 rounded-lg"
                      title={exercicio.titulo}
                    />
                    <Button asChild className="bg-orange-600 hover:bg-orange-700">
                      <a href={exercicio.url_formulario} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir em nova aba
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="bg-orange-600 hover:bg-orange-700">
                    <a href={exercicio.url_formulario || '#'} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar Formulário
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-redator-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-redator-primary">
                  <FileText className="w-6 h-6" />
                  {exercicio.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exercicio.imagem_thumbnail && (
                  <div className="mb-6 rounded-lg overflow-hidden">
                    <img 
                      src={exercicio.imagem_thumbnail} 
                      alt={exercicio.titulo}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}
                
                <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-redator-primary">
                  <h3 className="font-semibold text-redator-primary mb-3">Proposta de Redação:</h3>
                  <p className="text-redator-accent leading-relaxed">
                    {criarCabecalhoEnem(exercicio.frase_tematica || '')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-redator-accent/20">
              <CardHeader>
                <CardTitle className="text-redator-primary">Dados do Aluno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-redator-primary mb-2">
                      Nome Completo *
                    </label>
                    <Input
                      placeholder="Digite seu nome completo"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      className="border-redator-accent/30 focus:border-redator-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-redator-primary mb-2">
                      E-mail *
                    </label>
                    <Input
                      type="email"
                      placeholder="Digite seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-redator-accent/30 focus:border-redator-accent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-redator-accent/20">
              <CardHeader>
                <CardTitle className="text-redator-primary">Escreva sua redação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Digite sua redação aqui..."
                  value={redacaoTexto}
                  onChange={(e) => setRedacaoTexto(e.target.value)}
                  className="min-h-[400px] resize-none"
                />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleEnviarRedacao}
                    disabled={enviarRedacaoMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {enviarRedacaoMutation.isPending ? 'Enviando...' : 'Enviar Redação'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExercicioDetalhes;
