
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Calendar, Clock, Brain, AlertCircle } from "lucide-react";
import { format, isWithinInterval, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const SimuladoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Determina a turma/código do usuário
  let turmaCode = "visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[studentData.turma as keyof typeof turmasMap] || "visitante";
  }

  const { data: simulado, isLoading } = useQuery({
    queryKey: ['simulado', id],
    queryFn: async () => {
      if (!id) return null;
      
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

  // Validação do texto
  const linhas = texto.split('\n').filter(linha => linha.trim().length > 0);
  const linhasValidas = linhas.length >= 7 && linhas.length <= 30;
  const podeEnviar = nome.trim() && email.trim() && linhasValidas && !enviando;

  const handleEnvio = async () => {
    if (!podeEnviar || !simulado) return;

    setEnviando(true);
    try {
      const { error } = await supabase
        .from('redacoes_simulado')
        .insert({
          id_simulado: simulado.id,
          nome_aluno: nome.trim(),
          email_aluno: email.trim().toLowerCase(),
          texto: texto.trim(),
          turma: turmaCode,
          dados_visitante: turmaCode === "visitante" ? {
            nome: nome.trim(),
            email: email.trim().toLowerCase()
          } : null
        });

      if (error) throw error;

      toast({
        title: "Redação enviada com sucesso!",
        description: "Sua redação foi enviada e será corrigida em breve.",
      });

      // Volta para a home após envio
      navigate("/app");
    } catch (error) {
      console.error('Erro ao enviar redação:', error);
      toast({
        title: "Erro ao enviar redação",
        description: "Tente novamente em alguns minutos.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <header className="bg-white shadow-sm border-b border-redator-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">Carregando simulado...</div>
        </main>
      </div>
    );
  }

  if (!simulado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <header className="bg-white shadow-sm border-b border-redator-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-600 mb-4">Simulado não encontrado</h1>
            <p className="text-gray-500">O simulado solicitado não existe ou não está disponível.</p>
          </div>
        </main>
      </div>
    );
  }

  const agora = new Date();
  const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
  const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
  
  const simuladoDisponivel = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });
  const simuladoFuturo = isBefore(agora, inicioSimulado);
  const simuladoEncerrado = isAfter(agora, fimSimulado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar ao App</span>
            </Link>
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-redator-primary" />
              <h1 className="text-xl font-bold text-redator-primary">Simulado</h1>
              {simuladoDisponivel && (
                <Badge className="bg-green-500 text-white animate-pulse">EM PROGRESSO</Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações do simulado */}
        <Card className="mb-8 border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-800 mb-2">{simulado.titulo}</CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })} - {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Proposta de redação - com fundo escuro e texto claro para legibilidade */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-purple-800">Proposta de Redação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800 text-white p-6 rounded-lg border-l-4 border-l-purple-500">
              <p className="text-lg leading-relaxed font-medium">
                {simulado.frase_tematica}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Verificação de status */}
        {!simuladoDisponivel && (
          <Card className="mb-8 border-l-4 border-l-yellow-500 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-yellow-800">
                <AlertCircle className="w-6 h-6" />
                <div>
                  {simuladoFuturo && (
                    <p className="font-medium">
                      Este simulado ainda não está disponível. Estará ativo a partir de {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}.
                    </p>
                  )}
                  {simuladoEncerrado && (
                    <p className="font-medium">
                      Este simulado já foi encerrado em {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de redação - só aparece se o simulado estiver em progresso */}
        {simuladoDisponivel && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-xl text-green-800">Sua Redação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome completo *
                  </label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="texto" className="block text-sm font-medium text-gray-700 mb-2">
                  Texto da redação * (mínimo 7 linhas, máximo 30 linhas)
                </label>
                <Textarea
                  id="texto"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Digite sua redação aqui..."
                  rows={20}
                  className="min-h-[400px]"
                />
                <div className="mt-2 text-sm text-gray-600">
                  Linhas preenchidas: {linhas.length} (mínimo: 7, máximo: 30)
                  {linhas.length < 7 && (
                    <span className="text-red-500 ml-2">Adicione pelo menos {7 - linhas.length} linha(s)</span>
                  )}
                  {linhas.length > 30 && (
                    <span className="text-red-500 ml-2">Remova {linhas.length - 30} linha(s)</span>
                  )}
                </div>
              </div>

              <Button
                onClick={handleEnvio}
                disabled={!podeEnviar}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg"
              >
                {enviando ? (
                  "Enviando..."
                ) : (
                  <>
                    <ClipboardCheck className="w-5 h-5 mr-2" />
                    Enviar Redação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SimuladoDetalhes;
