import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Home, Send, Upload, X, Camera, Edit3 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RedacaoTextarea } from "@/components/RedacaoTextarea";
import { CorretorSelector } from "@/components/CorretorSelector";
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
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [redacaoManuscrita, setRedacaoManuscrita] = useState<File | null>(null);
  const [redacaoManuscritaUrl, setRedacaoManuscritaUrl] = useState<string | null>(null);
  const [tipoRedacao, setTipoRedacao] = useState<"manuscrita" | "digitada">("digitada");
  const { toast } = useToast();

  const temaFromUrl = searchParams.get('tema');
  const fonteFromUrl = searchParams.get('fonte');

  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

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
  }

  useEffect(() => {
    // Preenchimento automático baseado no tipo de usuário
    if (userType === "visitante" && visitanteData) {
      const dados = JSON.parse(visitanteData);
      setNomeCompleto(dados.nome || "");
      setEmail(dados.email || "");
    } else if (userType === "aluno" && alunoTurma) {
      // Para alunos, preencher automaticamente o nome baseado nos dados armazenados
      const alunoData = localStorage.getItem("alunoData");
      if (alunoData) {
        const dados = JSON.parse(alunoData);
        setNomeCompleto(dados.nome || "");
        setEmail(dados.email || "");
      }
    }
    
    if (temaFromUrl) {
      setFraseTematica(decodeURIComponent(temaFromUrl));
    }
  }, [userType, visitanteData, alunoTurma, temaFromUrl]);

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
    
    if (!nomeCompleto.trim() || !email.trim() || !fraseTematica.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios: nome completo, e-mail e frase temática.",
        variant: "destructive",
      });
      return;
    }

    // Validação condicional baseada no tipo de redação
    if (tipoRedacao === "digitada" && !redacaoTexto.trim()) {
      toast({
        title: "Redação obrigatória",
        description: "Digite o texto da sua redação para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (tipoRedacao === "manuscrita" && !redacaoManuscrita) {
      toast({
        title: "Redação manuscrita obrigatória",
        description: "Selecione uma foto da sua redação manuscrita para continuar.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, digite um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

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

    const uniqueCorretores = new Set(selectedCorretores);
    if (uniqueCorretores.size !== selectedCorretores.length) {
      toast({
        title: "Corretores duplicados",
        description: "Não é possível selecionar o mesmo corretor duas vezes.",
        variant: "destructive",
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
        .from('redacoes_enviadas')
        .insert({
          nome_aluno: nomeCompleto.trim(),
          email_aluno: email.trim(),
          frase_tematica: fraseTematica.trim(),
          redacao_texto: redacaoTexto.trim() || "",
          redacao_manuscrita_url: manuscritaUrl,
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
        description: `Sua redação foi salva e será corrigida pelos corretores selecionados. Você poderá visualizá-la no card "Minhas Redações" na página inicial.`,
      });

      // Limpar formulário após sucesso
      if (userType !== "visitante") {
        setNomeCompleto("");
        setEmail("");
      }
      setFraseTematica("");
      setRedacaoTexto("");
      setSelectedCorretores([]);
      handleRemoveRedacaoManuscrita();

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

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="max-w-4xl mx-auto border-redator-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-redator-primary">
                  <Send className="w-5 h-5" />
                  {fonteFromUrl === 'tema' ? 'Redação sobre o Tema Selecionado' : 
                   (userType === "aluno" ? 'Enviar Redação – Tema Livre' : 'Enviar Redação Avulsa – Tema Livre')}
                </CardTitle>
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

                  <CorretorSelector
                    selectedCorretores={selectedCorretores}
                    onCorretoresChange={setSelectedCorretores}
                    isSimulado={false}
                    required={true}
                  />

                  {/* Radio buttons para tipo de redação */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg border" style={{ borderColor: '#662f96' }}>
                    <label className="block text-lg font-semibold text-redator-primary mb-4">
                      Como deseja enviar sua redação? *
                    </label>
                    <RadioGroup
                      value={tipoRedacao}
                      onValueChange={(value: "manuscrita" | "digitada") => {
                        setTipoRedacao(value);
                        // Limpar dados do tipo anterior quando mudar
                        if (value === "manuscrita") {
                          setRedacaoTexto("");
                        } else {
                          handleRemoveRedacaoManuscrita();
                        }
                      }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-redator-accent transition-colors cursor-pointer bg-white">
                        <RadioGroupItem value="manuscrita" id="manuscrita" />
                        <Label htmlFor="manuscrita" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Camera className="w-5 h-5 text-redator-primary" />
                          <div>
                            <div className="font-medium text-redator-primary">Redação manuscrita (foto)</div>
                            <div className="text-sm text-redator-accent">Envie uma foto da sua redação escrita à mão</div>
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-redator-accent transition-colors cursor-pointer bg-white">
                        <RadioGroupItem value="digitada" id="digitada" />
                        <Label htmlFor="digitada" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Edit3 className="w-5 h-5 text-redator-primary" />
                          <div>
                            <div className="font-medium text-redator-primary">Redação digitada (formulário)</div>
                            <div className="text-sm text-redator-accent">Digite o texto da sua redação no campo abaixo</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Campo para redação manuscrita - aparece apenas se selecionado */}
                  {tipoRedacao === "manuscrita" && (
                    <div className="bg-purple-50 p-6 rounded-lg border flex justify-center" style={{ borderColor: '#662f96' }}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <label htmlFor="redacao-manuscrita" className="cursor-pointer">
                            <div className="flex items-center gap-3 px-6 py-4 border-2 border-dashed rounded-lg transition-colors bg-white" style={{ borderColor: '#3f0077' }}>
                              <Camera className="w-6 h-6" style={{ color: '#3f0077' }} />
                              <div>
                                <span className="text-base font-medium" style={{ color: '#3f0077' }}>Selecionar foto da redação</span>
                                <div className="text-sm" style={{ color: '#3f0077' }}>JPG, JPEG ou PNG (máx. 5MB)</div>
                              </div>
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
                              className="max-w-sm max-h-80 rounded-lg border-2 border-amber-300 shadow-md"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0"
                              onClick={handleRemoveRedacaoManuscrita}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Campo para redação digitada - aparece apenas se selecionado */}
                  {tipoRedacao === "digitada" && (
                    <div className="bg-purple-50 p-6 rounded-lg border" style={{ borderColor: '#662f96' }}>
                      <RedacaoTextarea
                        value={redacaoTexto}
                        onChange={setRedacaoTexto}
                        onValidChange={setIsRedacaoValid}
                      />
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Tipo de envio:</strong> {
                        tipoEnvio === 'regular' ? `Regular - Aluno da ${alunoTurma}` : 'Avulsa - Visitante'
                      }
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Sua redação ficará disponível no card "Minhas Redações" na página inicial e será corrigida pelos corretores selecionados.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={
                      isSubmitting || 
                      (tipoRedacao === "digitada" && !isRedacaoValid) ||
                      (tipoRedacao === "manuscrita" && !redacaoManuscrita)
                    }
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
