import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Send, ArrowLeft, FileText, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { computeSimuladoStatus, getSimuladoStatusInfo } from "@/utils/simuladoStatus";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { RedacaoTextarea } from "@/components/RedacaoTextarea";
import { CorretorSelector } from "@/components/CorretorSelector";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";

const SimuladoParticipacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [isRedacaoValid, setIsRedacaoValid] = useState(false);
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [redacaoManuscrita, setRedacaoManuscrita] = useState<File | null>(null);
  const [redacaoManuscritaUrl, setRedacaoManuscritaUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Preencher automaticamente os dados do usuário logado
    if (studentData.userType === "visitante" && studentData.visitanteInfo) {
      setNomeCompleto(studentData.visitanteInfo.nome);
      setEmail(studentData.visitanteInfo.email);
    } else if (studentData.nomeUsuario && studentData.email) {
      setNomeCompleto(studentData.nomeUsuario);
      setEmail(studentData.email);
    }
  }, [studentData]);

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

  const handleRedacaoManuscritaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione apenas arquivos de imagem (JPG, JPEG ou PNG).",
        variant: "destructive"
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setRedacaoManuscrita(file);
    const tempUrl = URL.createObjectURL(file);
    setRedacaoManuscritaUrl(tempUrl);
  };

  const handleRemoveRedacaoManuscrita = () => {
    if (redacaoManuscritaUrl && redacaoManuscritaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(redacaoManuscritaUrl);
    }
    setRedacaoManuscrita(null);
    setRedacaoManuscritaUrl(null);
  };

  const uploadRedacaoManuscrita = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `redacoes-manuscritas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('redacoes-manuscritas')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('redacoes-manuscritas')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da redação manuscrita:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeCompleto.trim() || !email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (!redacaoTexto.trim() && !redacaoManuscrita) {
      toast({
        title: "Redação obrigatória",
        description: "Digite sua redação ou envie uma redação manuscrita para continuar.",
        variant: "destructive"
      });
      return;
    }

    if (selectedCorretores.length !== 2) {
      toast({
        title: "Simulado requer 2 corretores",
        description: "Para simulados, é obrigatório selecionar exatamente 2 corretores.",
        variant: "destructive"
      });
      return;
    }

    const uniqueCorretores = new Set(selectedCorretores);
    if (uniqueCorretores.size !== selectedCorretores.length) {
      toast({
        title: "Corretores duplicados",
        description: "Não é possível selecionar o mesmo corretor duas vezes.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let manuscritaUrl = null;
      if (redacaoManuscrita) {
        manuscritaUrl = await uploadRedacaoManuscrita(redacaoManuscrita);
        if (!manuscritaUrl) {
          throw new Error("Erro ao fazer upload da redação manuscrita");
        }
      }

      const { error } = await supabase
        .from('redacoes_simulado')
        .insert({
          id_simulado: id,
          nome_aluno: nomeCompleto.trim(),
          email_aluno: email.trim().toLowerCase(),
          turma: studentData.turma || 'visitante',
          texto: redacaoTexto.trim(),
          redacao_manuscrita_url: manuscritaUrl,
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
        description: "Sua redação do simulado foi enviada e será corrigida pelos corretores selecionados.",
      });

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

  // Verificar status do simulado usando nossa utility
  const status = computeSimuladoStatus(simulado);
  const statusInfo = getSimuladoStatusInfo(status, simulado);
  const simuladoDisponivel = statusInfo.isActive;

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
                       <strong>Período:</strong> {simulado.data_inicio && simulado.hora_inicio && simulado.data_fim && simulado.hora_fim 
                         ? `${simulado.data_inicio} às ${simulado.hora_inicio} até ${simulado.data_fim} às ${simulado.hora_fim}`
                         : 'Período não definido'
                       }
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
                       <span>
                         {statusInfo.timeInfo || (simulado.data_fim && simulado.hora_fim 
                           ? `Término: ${simulado.data_fim} às ${simulado.hora_fim}`
                           : 'Horário não definido'
                         )}
                       </span>
                     </div>
                   </div>
                </CardHeader>
              </Card>
            </div>

            {simulado.temas && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-primary">
                    📝 Proposta de Redação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">
                      {simulado.temas.frase_tematica}
                    </h3>
                  </div>

                  {simulado.temas.imagem_texto_4_url && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={simulado.temas.imagem_texto_4_url} 
                        alt="Imagem do tema"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                    <p className="text-primary leading-relaxed font-medium text-sm">
                      {simulado.temas.cabecalho_enem || 
                        `A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "${simulado.temas.frase_tematica}", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.`
                      }
                    </p>
                  </div>

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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Enviar Redação do Simulado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome-completo">Nome Completo *</Label>
                      <Input
                        id="nome-completo"
                        type="text"
                        placeholder="Digite seu nome completo..."
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Digite seu e-mail..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <CorretorSelector
                    selectedCorretores={selectedCorretores}
                    onCorretoresChange={setSelectedCorretores}
                    isSimulado={true}
                    required={true}
                  />

                  <div>
                    <Label className="text-base font-medium">Redação Manuscrita (opcional)</Label>
                    <div className="space-y-4 mt-2">
                      <div className="flex items-center gap-4">
                        <label htmlFor="redacao-manuscrita" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">Selecionar imagem</span>
                          </div>
                        </label>
                        <input
                          id="redacao-manuscrita"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={handleRedacaoManuscritaChange}
                          className="hidden"
                        />
                      </div>

                      {redacaoManuscritaUrl && (
                        <div className="relative inline-block">
                          <img 
                            src={redacaoManuscritaUrl} 
                            alt="Preview da redação manuscrita" 
                            className="max-w-xs max-h-60 rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                            onClick={handleRemoveRedacaoManuscrita}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos aceitos: JPG, JPEG, PNG
                    </p>
                  </div>

                  <RedacaoTextarea
                    value={redacaoTexto}
                    onChange={setRedacaoTexto}
                    onValidChange={setIsRedacaoValid}
                    placeholder="Escreva sua redação completa aqui..."
                    className="w-full"
                  />

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Simulado:</strong> {simulado.titulo}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Sua redação será enviada para correção pelos corretores selecionados.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (!isRedacaoValid && !redacaoManuscrita)}
                    className="w-full bg-primary"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Redação do Simulado"}
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

export default SimuladoParticipacao;
