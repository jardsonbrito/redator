
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Calendar, CheckCircle, AlertCircle, Home } from "lucide-react";
import { format, isWithinInterval, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useStudentAuth } from "@/hooks/useStudentAuth";

export default function SimuladoDetalhes() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { studentData } = useStudentAuth();

  const [formData, setFormData] = useState({
    nome_aluno: '',
    email_aluno: '',
    texto: ''
  });

  // Buscar dados do simulado e tema relacionado
  const { data: simulado, isLoading } = useQuery({
    queryKey: ['simulado-detalhes', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do simulado não encontrado');

      const { data, error } = await supabase
        .from('simulados')
        .select(`
          *,
          temas (
            id,
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
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Mutation para enviar redação
  const enviarRedacao = useMutation({
    mutationFn: async (dadosRedacao: any) => {
      const { error } = await supabase
        .from('redacoes_simulado')
        .insert([dadosRedacao]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "✅ Redação enviada!",
        description: "Sua redação foi enviada com sucesso para correção.",
      });

      // Limpar formulário
      setFormData({
        nome_aluno: '',
        email_aluno: '',
        texto: ''
      });
    },
    onError: (error: any) => {
      console.error('Erro ao enviar redação:', error);
      toast({
        title: "❌ Erro ao enviar",
        description: "Não foi possível enviar sua redação. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!simulado) return;

    // Validar campos obrigatórios
    if (!formData.nome_aluno.trim() || !formData.email_aluno.trim() || !formData.texto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    // Validar mínimo e máximo de linhas
    const linhas = formData.texto.split('\n').filter(linha => linha.trim().length > 0);
    if (linhas.length < 7) {
      toast({
        title: "Redação muito curta",
        description: "Sua redação deve ter pelo menos 7 linhas completas.",
        variant: "destructive",
      });
      return;
    }

    if (linhas.length > 30) {
      toast({
        title: "Redação muito longa",
        description: "Sua redação deve ter no máximo 30 linhas.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se email é válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_aluno)) {
      toast({
        title: "E-mail inválido",
        description: "Digite um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    // Determinar turma correta
    let turmaUsuario = "Visitante";
    if (studentData.userType === "aluno" && studentData.turma) {
      turmaUsuario = studentData.turma;
    }

    const dadosEnvio = {
      id_simulado: simulado.id,
      nome_aluno: formData.nome_aluno.trim(),
      email_aluno: formData.email_aluno.trim().toLowerCase(),
      texto: formData.texto.trim(),
      turma: turmaUsuario,
      data_envio: new Date().toISOString()
    };

    enviarRedacao.mutate(dadosEnvio);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando simulado...</div>
      </div>
    );
  }

  if (!simulado) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Simulado não encontrado.</div>
      </div>
    );
  }

  const agora = new Date();
  const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
  const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
  
  const simuladoDisponivel = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });
  const simuladoFuturo = isBefore(agora, inicioSimulado);
  const simuladoEncerrado = isAfter(agora, fimSimulado);

  const tema = simulado.temas;
  const linhasTexto = formData.texto.split('\n').filter(linha => linha.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <Home className="w-5 h-5" />
              <span>Início</span>
            </Link>
            <h1 className="text-2xl font-bold text-redator-primary">Simulado</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header do Simulado */}
        <Card className="mb-6 border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-600" />
                <div>
                  <CardTitle className="text-2xl font-bold text-purple-800">
                    {simulado.titulo}
                  </CardTitle>
                  <p className="text-gray-600">Simulado ENEM</p>
                </div>
              </div>
              <div className="text-right">
                {simuladoDisponivel && (
                  <Badge className="bg-green-500 text-white font-bold animate-pulse">
                    EM PROGRESSO
                  </Badge>
                )}
                {simuladoFuturo && (
                  <Badge className="bg-blue-500 text-white">AGENDADO</Badge>
                )}
                {simuladoEncerrado && (
                  <Badge className="bg-gray-500 text-white">ENCERRADO</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Início: {format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Término: {format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Conteúdo do Tema - SOMENTE SE SIMULADO ESTIVER EM PROGRESSO OU ENCERRADO */}
        {(simuladoDisponivel || simuladoEncerrado) && tema && (
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Cabeçalho ENEM */}
              {tema.cabecalho_enem && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm leading-relaxed text-gray-700">
                    {tema.cabecalho_enem}
                  </p>
                </div>
              )}

              {/* Frase Temática - COM FUNDO ESCURO E TEXTO LEGÍVEL */}
              <div className="mb-6 p-4 bg-gray-900 text-white rounded-lg border">
                <h3 className="text-lg font-bold mb-2 text-white">PROPOSTA DE REDAÇÃO</h3>
                <p className="text-white font-medium leading-relaxed">
                  {tema.frase_tematica}
                </p>
              </div>

              {/* Textos Motivadores */}
              <div className="space-y-6">
                {tema.texto_1 && (
                  <div>
                    <h4 className="font-bold text-purple-800 mb-2">TEXTO I</h4>
                    <div className="p-4 bg-gray-50 rounded border text-sm leading-relaxed">
                      {tema.texto_1}
                    </div>
                  </div>
                )}

                {tema.texto_2 && (
                  <div>
                    <h4 className="font-bold text-purple-800 mb-2">TEXTO II</h4>
                    <div className="p-4 bg-gray-50 rounded border text-sm leading-relaxed">
                      {tema.texto_2}
                    </div>
                  </div>
                )}

                {tema.texto_3 && (
                  <div>
                    <h4 className="font-bold text-purple-800 mb-2">TEXTO III</h4>
                    <div className="p-4 bg-gray-50 rounded border text-sm leading-relaxed">
                      {tema.texto_3}
                    </div>
                  </div>
                )}

                {tema.imagem_texto_4_url && (
                  <div>
                    <h4 className="font-bold text-purple-800 mb-2">TEXTO IV</h4>
                    <div className="p-4 bg-gray-50 rounded border">
                      <img 
                        src={tema.imagem_texto_4_url} 
                        alt="Texto motivador IV" 
                        className="w-full max-w-lg mx-auto rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de Envio - SOMENTE SE SIMULADO ESTIVER EM PROGRESSO */}
        {simuladoDisponivel && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-purple-800">
                Enviar Redação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome_aluno}
                      onChange={(e) => setFormData(prev => ({...prev, nome_aluno: e.target.value}))}
                      placeholder="Digite seu nome completo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email_aluno}
                      onChange={(e) => setFormData(prev => ({...prev, email_aluno: e.target.value}))}
                      placeholder="Digite seu e-mail"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="redacao">Sua Redação *</Label>
                    <div className="text-sm text-gray-600">
                      {linhasTexto} linha{linhasTexto !== 1 ? 's' : ''} 
                      {linhasTexto < 7 && (
                        <span className="text-red-500 ml-1">
                          (mínimo: 7 linhas)
                        </span>
                      )}
                      {linhasTexto > 30 && (
                        <span className="text-red-500 ml-1">
                          (máximo: 30 linhas)
                        </span>
                      )}
                    </div>
                  </div>
                  <Textarea
                    id="redacao"
                    value={formData.texto}
                    onChange={(e) => setFormData(prev => ({...prev, texto: e.target.value}))}
                    placeholder="Digite sua redação aqui..."
                    rows={20}
                    className="font-mono text-sm"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={enviarRedacao.isPending || linhasTexto < 7 || linhasTexto > 30}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {enviarRedacao.isPending ? 'Enviando...' : 'Enviar Redação'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Mensagens de Status */}
        {simuladoFuturo && (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Simulado Agendado</h3>
              <p className="text-gray-600">
                Este simulado será aberto em {format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  🔒 A frase temática será exibida apenas quando o simulado iniciar
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {simuladoEncerrado && (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Simulado Encerrado</h3>
              <p className="text-gray-600">
                Este simulado foi encerrado em {format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  📋 A proposta do simulado continua disponível para consulta
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
