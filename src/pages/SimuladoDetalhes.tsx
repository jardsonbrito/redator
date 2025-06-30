
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, Calendar, Users, ArrowLeft, Send } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const SimuladoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nomeAluno, setNomeAluno] = useState("");
  const [emailAluno, setEmailAluno] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");

  // Recupera dados do usuário
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  // Pre-preenche dados se for visitante
  useState(() => {
    if (userType === "visitante" && visitanteData) {
      const dados = JSON.parse(visitanteData);
      setNomeAluno(dados.nome);
      setEmailAluno(dados.email);
    }
  });

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
  }

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
    }
  });

  const enviarRedacao = useMutation({
    mutationFn: async () => {
      if (!simulado) return;

      const dados = {
        id_simulado: simulado.id,
        nome_aluno: nomeAluno.trim(),
        email_aluno: emailAluno.trim().toLowerCase(),
        texto: redacaoTexto.trim(),
        turma: turmaCode,
        dados_visitante: userType === "visitante" && visitanteData ? JSON.parse(visitanteData) : null
      };

      const { data, error } = await supabase
        .from('redacoes_simulado')
        .insert([dados]);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Redação enviada com sucesso!",
        description: "Sua redação foi submetida e será corrigida em breve.",
      });
      navigate("/app");
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar redação",
        description: "Não foi possível enviar sua redação. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao enviar redação:", error);
    }
  });

  const handleEnviarRedacao = () => {
    if (!nomeAluno.trim() || !emailAluno.trim() || !redacaoTexto.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Nome, e-mail e redação são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validação de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAluno)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    if (redacaoTexto.trim().length < 50) {
      toast({
        title: "Redação muito curta",
        description: "Sua redação deve ter pelo menos 50 caracteres.",
        variant: "destructive",
      });
      return;
    }

    enviarRedacao.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <div className="text-center py-16">Carregando simulado...</div>
      </div>
    );
  }

  if (!simulado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Simulado não encontrado</h1>
          <Link to="/simulados" className="text-redator-primary hover:underline">
            Voltar para simulados
          </Link>
        </div>
      </div>
    );
  }

  // Verifica se o usuário tem acesso
  const temAcesso = simulado.turmas_autorizadas?.includes(turmaCode) || 
                   (simulado.permite_visitante && turmaCode === "visitante");

  if (!temAcesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Acesso não autorizado</h1>
          <p className="text-gray-500 mb-4">Você não tem permissão para acessar este simulado.</p>
          <Link to="/simulados" className="text-redator-primary hover:underline">
            Voltar para simulados
          </Link>
        </div>
      </div>
    );
  }

  // Verifica se está no período do simulado
  const agora = new Date();
  const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
  const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
  const simuladoAtivo = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/simulados" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar aos Simulados</span>
            </Link>
            <h1 className="text-2xl font-bold text-redator-primary">Simulado</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações do Simulado */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{simulado.titulo}</CardTitle>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant={simuladoAtivo ? "default" : "secondary"}>
                    <ClipboardCheck className="w-3 h-3 mr-1" />
                    {simuladoAtivo ? "Em andamento" : "Fora do período"}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {simulado.turmas_autorizadas?.length || 0} turma(s)
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Início: {format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  Término: {format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Frase Temática */}
            <div className="bg-gradient-to-r from-redator-primary to-redator-secondary text-white p-6 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">PROPOSTA DE REDAÇÃO</h3>
              <p className="text-lg leading-relaxed">{simulado.frase_tematica}</p>
            </div>

            {/* Status do Simulado */}
            {!simuladoAtivo && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">
                    {agora < inicioSimulado ? "Simulado ainda não iniciado" : "Simulado encerrado"}
                  </span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  {agora < inicioSimulado 
                    ? `Início em ${format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` 
                    : `Encerrado em ${format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  }
                </p>
              </div>
            )}

            {/* Formulário de Envio */}
            {simuladoAtivo && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-redator-primary">Envie sua Redação</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={nomeAluno}
                      onChange={(e) => setNomeAluno(e.target.value)}
                      placeholder="Digite seu nome completo"
                      disabled={userType === "visitante"} // Desabilita se for visitante
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={emailAluno}
                      onChange={(e) => setEmailAluno(e.target.value)}
                      placeholder="Digite seu e-mail"
                      disabled={userType === "visitante"} // Desabilita se for visitante
                    />
                    {userType === "visitante" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Este e-mail será usado para acessar sua correção
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="redacao">Sua Redação *</Label>
                  <Textarea
                    id="redacao"
                    value={redacaoTexto}
                    onChange={(e) => setRedacaoTexto(e.target.value)}
                    placeholder="Digite sua redação aqui..."
                    className="min-h-[400px] font-mono"
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {redacaoTexto.length} caracteres
                  </div>
                </div>

                <Button
                  onClick={handleEnviarRedacao}
                  disabled={enviarRedacao.isPending}
                  className="w-full bg-redator-primary hover:bg-redator-primary/90"
                  size="lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {enviarRedacao.isPending ? "Enviando..." : "Enviar Redação"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SimuladoDetalhes;
