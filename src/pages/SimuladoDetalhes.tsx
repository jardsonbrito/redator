
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

const SimuladoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [nomeAluno, setNomeAluno] = useState("");
  const [emailAluno, setEmailAluno] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recupera a turma do localStorage
  const alunoTurma = localStorage.getItem("alunoTurma");
  const turmasMap = {
    "Turma A": "LRA2025",
    "Turma B": "LRB2025", 
    "Turma C": "LRC2025",
    "Turma D": "LRD2025",
    "Turma E": "LRE2025"
  };
  const turmaCode = alunoTurma ? turmasMap[alunoTurma as keyof typeof turmasMap] : "visitante";

  const { data: simulado, isLoading } = useQuery({
    queryKey: ['simulado', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', id)
        .eq('ativo', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const isSimuladoAtivo = (simulado: any) => {
    if (!simulado) return false;
    const now = new Date();
    const inicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    return isAfter(now, inicio) && isBefore(now, fim);
  };

  const enviarRedacao = useMutation({
    mutationFn: async (dadosRedacao: any) => {
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .insert([dadosRedacao]);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Redação enviada com sucesso!",
        description: "Sua redação foi enviada e será corrigida em breve.",
      });
      queryClient.invalidateQueries({ queryKey: ['simulado', id] });
      navigate('/simulados');
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar redação",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      console.error("Erro ao enviar redação:", error);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeAluno.trim() || !emailAluno.trim() || !redacaoTexto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (!simulado || !isSimuladoAtivo(simulado)) {
      toast({
        title: "Simulado indisponível",
        description: "Este simulado não está mais disponível.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    enviarRedacao.mutate({
      id_simulado: simulado.id,
      nome_aluno: nomeAluno,
      email_aluno: emailAluno,
      texto: redacaoTexto,
      turma: turmaCode
    });

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-redator-primary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando simulado...</p>
        </div>
      </div>
    );
  }

  if (!simulado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-redator-primary mb-2">Simulado não encontrado</h1>
          <Button onClick={() => navigate('/simulados')} className="bg-redator-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Simulados
          </Button>
        </div>
      </div>
    );
  }

  const ativo = isSimuladoAtivo(simulado);

  if (!ativo) {
    const now = new Date();
    const inicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Clock className="w-16 h-16 text-redator-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-redator-primary mb-4">Simulado Indisponível</h1>
          <p className="text-redator-accent mb-6">
            {isBefore(now, inicio) 
              ? `Este simulado estará disponível a partir de ${format(inicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
              : "Este simulado foi encerrado"
            }
          </p>
          <Button onClick={() => navigate('/simulados')} className="bg-redator-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Simulados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/simulados')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Simulados
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-redator-primary text-white">
            <CardTitle className="text-center text-2xl">{simulado.titulo}</CardTitle>
            <div className="text-center text-sm opacity-90">
              Disponível até {format(new Date(`${simulado.data_fim}T${simulado.hora_fim}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Cabeçalho ENEM */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6 border">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">REDAÇÃO</h2>
                <p className="text-sm text-gray-600">A partir da leitura dos textos motivadores seguintes e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema:</p>
              </div>
              
              <div className="bg-white p-4 rounded border-l-4 border-redator-primary">
                <h3 className="font-bold text-redator-primary text-lg text-center">
                  {simulado.frase_tematica}
                </h3>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p className="mb-2">Apresente proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.</p>
                <p><strong>Atenção:</strong> Seu texto deve ter entre 8 e 30 linhas e ser escrito a caneta.</p>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={nomeAluno}
                    onChange={(e) => setNomeAluno(e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailAluno}
                    onChange={(e) => setEmailAluno(e.target.value)}
                    placeholder="Digite seu email"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="redacao">Sua Redação *</Label>
                <Textarea
                  id="redacao"
                  value={redacaoTexto}
                  onChange={(e) => setRedacaoTexto(e.target.value)}
                  placeholder="Digite sua redação aqui..."
                  className="min-h-[400px] resize-none"
                  required
                />
                <div className="text-sm text-gray-600 mt-2">
                  Caracteres: {redacaoTexto.length}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-redator-primary hover:bg-redator-primary/90 text-lg py-3"
                disabled={isSubmitting}
              >
                <Send className="w-5 h-5 mr-2" />
                {isSubmitting ? "Enviando..." : "Enviar Redação"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimuladoDetalhes;
