import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X, Camera } from "lucide-react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useCredits } from "@/hooks/useCredits";
import { useBreadcrumbs, usePageTitle } from "@/hooks/useBreadcrumbs";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const EnvieRedacao = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Configurar breadcrumbs e título
  const fonte = searchParams.get('fonte');
  const tema = searchParams.get('tema');

  if (fonte === 'tema' && tema) {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Temas', href: '/temas' },
      { label: 'Enviar Redação' }
    ]);
  } else if (fonte === 'exercicio') {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Exercícios', href: '/exercicios' },
      { label: 'Enviar Redação' }
    ]);
  } else {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Enviar Redação' }
    ]);
  }

  usePageTitle('Enviar Redação');

  // Determinar tipo de usuário
  const userType = localStorage.getItem("userType");

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [fraseTematica, setFraseTematica] = useState("");
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [palavras, setPalavras] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [redacaoManuscrita, setRedacaoManuscrita] = useState<File | null>(null);
  const [redacaoManuscritaUrl, setRedacaoManuscritaUrl] = useState<string | null>(null);
  const [tipoRedacao, setTipoRedacao] = useState<"manuscrita" | "digitada">("digitada");
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loadingCorretores, setLoadingCorretores] = useState(true);
  const [forceCredits, setForceCredits] = useState<number | null>(null);
  const { toast } = useToast();
  const { settings, loading: settingsLoading } = useAppSettings();
  const { studentData } = useStudentAuth();
  const { isFeatureEnabled } = usePlanFeatures(studentData.email);

  const temaFromUrl = searchParams.get('tema');
  const fonteFromUrl = searchParams.get('fonte');
  const exercicioFromUrl = searchParams.get('exercicio');

  // Verificar se acesso ao tema livre está desabilitado
  const isFreeTopicAccess = !temaFromUrl && !exercicioFromUrl;
  const isFreeTopicDisabled = isFreeTopicAccess && settings && settings.free_topic_enabled === false;

  const alunoTurma = localStorage.getItem("alunoTurma");

  // Determinar tipo de envio primeiro
  let tipoEnvio = "avulsa";
  let turmaCode = "visitante";

  // Se há exercício na URL, é um envio de exercício
  if (exercicioFromUrl) {
    tipoEnvio = "exercicio";
  } else if (userType === "aluno" && alunoTurma) {
    tipoEnvio = "regular";
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025",
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma] || "visitante";
  }

  // Determinar quantos créditos são necessários (depois de definir tipoEnvio)
  // Para envios regulares (alunos), sempre 1 crédito independente do número de corretores
  // Para envios avulsos, pode ser 1 ou 2 dependendo dos corretores selecionados
  const requiredCredits = tipoEnvio === "regular" ? 1 : (selectedCorretores.length === 2 ? 2 : 1);

  // Hook para gerenciar créditos - garantir email correto para alunos
  // CORREÇÃO: Garantir que sempre tenhamos um email válido antes de chamar o hook
  const getCreditEmail = () => {
    console.log('🔍 getCreditEmail - INICIANDO');
    console.log('🔍 userType:', userType);
    console.log('🔍 studentData:', studentData);
    console.log('🔍 studentData.email:', studentData.email);
    console.log('🔍 localStorage alunoEmail:', localStorage.getItem("alunoEmail"));
    console.log('🔍 localStorage alunoData:', localStorage.getItem("alunoData"));
    console.log('🔍 email do estado:', email);

    if (userType === "aluno") {
      // Primeiro tentar studentData.email
      if (studentData.email) {
        console.log('✅ Usando studentData.email:', studentData.email);
        return studentData.email;
      }

      // Depois tentar localStorage alunoEmail
      const localEmail = localStorage.getItem("alunoEmail");
      if (localEmail) {
        console.log('✅ Usando localStorage alunoEmail:', localEmail);
        return localEmail;
      }

      // Tentar extrair do alunoData
      const alunoData = localStorage.getItem("alunoData");
      if (alunoData) {
        try {
          const parsed = JSON.parse(alunoData);
          if (parsed.email) {
            console.log('✅ Usando email do alunoData:', parsed.email);
            return parsed.email;
          }
        } catch (e) {
          console.error('❌ Erro ao parsear alunoData:', e);
        }
      }

      // Por último o email do estado
      if (email) {
        console.log('✅ Usando email do estado:', email);
        return email;
      }

      console.log('❌ Nenhum email encontrado para aluno');
      return "";
    }

    console.log('✅ Usando email para visitante:', email);
    return email || "";
  };

  const creditEmail = getCreditEmail();

  console.log('💳 Email FINAL para useCredits:', creditEmail);

  const { credits, loading: creditsLoading, consumeCredits, checkSufficientCredits, refreshCredits, addCredits } = useCredits(creditEmail);

  // DEBUG: Logs para verificar se o email do hook está sincronizado
  console.log('🔄 VERIFICAÇÃO CRÍTICA - creditEmail atual:', creditEmail);
  console.log('🔄 VERIFICAÇÃO CRÍTICA - credits:', credits);

  useEffect(() => {
    console.log('🔄 useEffect EXECUTADO - userType:', userType);

    if (userType === "aluno") {
      // Verificar todas as possíveis chaves no localStorage
      const keys = Object.keys(localStorage);
      console.log('🔍 Todas as chaves do localStorage:', keys);

      const alunoEmail = localStorage.getItem("alunoEmail");
      const alunoNome = localStorage.getItem("alunoNome");
      const alunoData = localStorage.getItem("alunoData");

      console.log('🔍 localStorage alunoEmail:', alunoEmail);
      console.log('🔍 localStorage alunoNome:', alunoNome);
      console.log('🔍 localStorage alunoData:', alunoData);
      console.log('🔍 Email atual do estado:', email);
      console.log('🔍 Nome atual do estado:', nomeCompleto);

      if (alunoData) {
        try {
          const parsed = JSON.parse(alunoData);
          console.log('🔍 alunoData parsed:', parsed);

          if (parsed.email && !email) {
            console.log('✅ Definindo email do alunoData:', parsed.email);
            setEmail(parsed.email);
          }
          if (parsed.nome && !nomeCompleto) {
            console.log('✅ Definindo nome do alunoData:', parsed.nome);
            setNomeCompleto(parsed.nome);
          }
        } catch (e) {
          console.error('❌ Erro ao parsear alunoData:', e);
        }
      }

      if (alunoEmail && !email) {
        console.log('✅ Definindo email do localStorage:', alunoEmail);
        setEmail(alunoEmail);
      }
      if (alunoNome && !nomeCompleto) {
        console.log('✅ Definindo nome do localStorage:', alunoNome);
        setNomeCompleto(alunoNome);
      }
    }

    if (temaFromUrl) {
      setFraseTematica(decodeURIComponent(temaFromUrl));
    }

    // Carregar corretores
    fetchCorretores();
  }, [userType, temaFromUrl]);

  // Carregar créditos forçados se existirem
  useEffect(() => {
    const forcedCredits = localStorage.getItem('forced_credits_' + creditEmail);
    if (forcedCredits) {
      const creditsValue = parseInt(forcedCredits);
      if (!isNaN(creditsValue)) {
        setForceCredits(creditsValue);
        console.log('🔧 Créditos forçados carregados do localStorage:', creditsValue);
      }
    }
  }, [creditEmail]);


  const fetchCorretores = async () => {
    try {
      const { data, error } = await supabase
        .from('corretores')
        .select('id, nome_completo, email')
        .eq('ativo', true)
        .eq('visivel_no_formulario', true)
        .order('nome_completo');

      if (error) throw error;
      setCorretores(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar corretores:', error);
      toast({
        title: "Erro ao carregar corretores",
        description: "Não foi possível carregar a lista de corretores.",
        variant: "destructive"
      });
    } finally {
      setLoadingCorretores(false);
    }
  };


  // Contador de palavras
  const handleTextoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value;
    setRedacaoTexto(texto);
    const textoLimpo = texto.trim();
    const totalPalavras = textoLimpo ? textoLimpo.split(/\s+/).length : 0;
    setPalavras(totalPalavras);
  };

  // Seleção de corretores
  const handleCorretorToggle = (corretorId: string, checked: boolean) => {
    let newSelected = [...selectedCorretores];

    if (checked) {
      // Para envio regular (alunos), só permite 1 corretor
      if (tipoEnvio === "regular" && newSelected.length >= 1) {
        toast({
          title: "Limite excedido",
          description: "Envios regulares são feitos para apenas um corretor.",
          variant: "destructive"
        });
        return;
      }
      // Para envios avulsos, máximo 2 corretores
      if (tipoEnvio === "avulsa" && newSelected.length >= 2) {
        toast({
          title: "Limite excedido",
          description: "Máximo de 2 corretores por envio.",
          variant: "destructive"
        });
        return;
      }
      newSelected.push(corretorId);
    } else {
      newSelected = newSelected.filter(id => id !== corretorId);
    }

    setSelectedCorretores(newSelected);
  };

  // Upload de arquivo
  const handleRedacaoManuscritaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Verificar tipo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Use apenas JPG, PNG ou PDF.",
          variant: "destructive",
        });
        return;
      }

      setRedacaoManuscrita(file);
      const url = URL.createObjectURL(file);
      setRedacaoManuscritaUrl(url);
    }
  };

  const handleRemoveRedacaoManuscrita = () => {
    setRedacaoManuscrita(null);
    if (redacaoManuscritaUrl) {
      URL.revokeObjectURL(redacaoManuscritaUrl);
      setRedacaoManuscritaUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log('🚀 Iniciando envio de redação...');
    console.log('📋 Dados do formulário:', {
      userType,
      nomeCompleto,
      email,
      fraseTematica,
      tipoRedacao,
      selectedCorretores,
      palavras,
      credits,
      requiredCredits
    });

    try {
      console.log('✅ Iniciando validações...');

      // Validações
      if (!fraseTematica.trim()) {
        console.log('❌ Frase temática vazia');
        throw new Error("Preencha a frase temática");
      }
      console.log('✅ Frase temática OK');

      if (userType === "visitante" && (!nomeCompleto.trim() || !email.trim())) {
        console.log('❌ Dados visitante incompletos');
        throw new Error("Preencha todos os campos obrigatórios");
      }
      console.log('✅ Dados visitante OK');

      if (selectedCorretores.length === 0) {
        console.log('❌ Nenhum corretor selecionado');
        throw new Error("Selecione pelo menos um corretor");
      }
      console.log('✅ Corretor selecionado OK');

      if (tipoRedacao === "digitada" && !redacaoTexto.trim()) {
        console.log('❌ Redação digitada vazia');
        throw new Error("O campo da redação não pode estar vazio");
      }
      console.log('✅ Redação digitada OK');

      if (tipoRedacao === "manuscrita" && !redacaoManuscrita) {
        console.log('❌ Arquivo manuscrita não selecionado');
        throw new Error("Selecione o arquivo da redação manuscrita");
      }
      console.log('✅ Redação manuscrita OK');

      // Verificar créditos para alunos
      if (userType === "aluno" && credits < requiredCredits) {
        console.log('❌ Créditos insuficientes:', { creditsAtuais: credits, requiredCredits });
        throw new Error("Créditos insuficientes");
      }
      console.log('✅ Créditos OK');

      console.log('✅ Todas as validações passaram! Prosseguindo...');

      let redacaoUrl = null;

      // Upload do arquivo se manuscrita
      if (tipoRedacao === "manuscrita" && redacaoManuscrita) {
        const fileName = `redacao_${Date.now()}_${redacaoManuscrita.name}`;
        const { error: uploadError } = await supabase.storage
          .from('redacoes')
          .upload(fileName, redacaoManuscrita);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('redacoes')
          .getPublicUrl(fileName);

        redacaoUrl = publicUrl;
      }

      // Garantir que nome e email estejam preenchidos
      let finalNomeCompleto = nomeCompleto.trim();
      let finalEmail = email.toLowerCase().trim();

      if (userType === "aluno") {
        // Priorizar studentData.email > localStorage > email do estado
        const alunoEmail = studentData.email || localStorage.getItem("alunoEmail");
        const alunoNome = localStorage.getItem("alunoNome") || "Aluno";

        console.log('📧 DEBUG - Emails disponíveis:', {
          studentDataEmail: studentData.email,
          localStorageEmail: localStorage.getItem("alunoEmail"),
          estadoEmail: email,
          emailEscolhido: alunoEmail
        });

        if (alunoEmail) {
          finalEmail = alunoEmail.toLowerCase().trim();
        }
        if (!finalNomeCompleto && alunoNome) {
          finalNomeCompleto = alunoNome;
        }
      }

      console.log('📧 Email final que será salvo:', finalEmail);

      // Inserir redação - usando schema real do TypeScript
      const redacaoData = {
        nome_aluno: finalNomeCompleto,
        email_aluno: finalEmail,
        frase_tematica: fraseTematica.trim(),
        redacao_texto: tipoRedacao === "digitada" ? redacaoTexto.trim() : ".",
        redacao_manuscrita_url: redacaoUrl,
        tipo_envio: tipoEnvio,
        turma: turmaCode !== "visitante" ? turmaCode : null,
        corretor_id_1: selectedCorretores[0] || null,
        corretor_id_2: selectedCorretores[1] || null
      };

      console.log('📝 Dados que serão inseridos:', redacaoData);

      const { data: redacaoInsertData, error: redacaoError } = await supabase
        .from('redacoes_enviadas')
        .insert(redacaoData)
        .select()
        .single();

      if (redacaoError) {
        console.error('❌ Erro ao inserir redação:', redacaoError);
        throw redacaoError;
      }

      console.log('✅ Redação inserida com sucesso:', {
        id: redacaoInsertData.id,
        email_salvo: redacaoInsertData.email_aluno,
        email_original: finalEmail,
        nome_salvo: redacaoInsertData.nome_aluno
      });

      console.log('✅ Redação salva com sucesso!');

      // Consumir créditos se for aluno
      if (userType === "aluno") {
        console.log('💰 Consumindo créditos para aluno...');

        try {
          const success = await consumeCredits(requiredCredits, 'Envio de redação');

          if (!success) {
            console.log('❌ Falha no consumo de créditos');
            toast({
              title: "Erro",
              description: "Não foi possível debitar os créditos. Tente novamente.",
              variant: "destructive"
            });
            return; // Parar o envio se o consumo falhou
          }

          console.log('✅ Créditos consumidos com sucesso!');
        } catch (error) {
          console.error('💥 Erro no consumo de créditos:', error);
          toast({
            title: "Erro",
            description: "Erro ao processar créditos. Tente novamente.",
            variant: "destructive"
          });
          return; // Parar o envio se houve erro
        }
      }

      toast({
        title: "✅ Redação enviada com sucesso!",
        description: "Sua redação foi enviada para correção.",
        className: "border-green-200 bg-green-50 text-green-900",
        duration: 5000
      });

      // Navegar para página de sucesso ou lista
      navigate('/minhas-redacoes');

    } catch (error) {
      console.error('💥 Erro ao enviar redação:', error);
      console.error('💥 Tipo do erro:', typeof error);
      console.error('💥 Stack trace:', error instanceof Error ? error.stack : 'N/A');

      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      console.error('💥 Mensagem final do erro:', errorMessage);

      toast({
        title: "Erro ao enviar redação",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verificar se tema livre está desabilitado
  if (isFreeTopicDisabled) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Enviar Redação" />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🔒</div>
                  <h2 className="text-2xl font-bold text-amber-800 mb-4">
                    Função Temporariamente Desabilitada
                  </h2>
                  <p className="text-amber-700 mb-6">
                    O envio de redações por tema livre está temporariamente desabilitado.
                  </p>
                  <Button
                    onClick={() => navigate('/app')}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Voltar ao Início
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
          <StudentHeader pageTitle="Enviar Redação" />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-2">
                  {/* Cabeçalho */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {fonteFromUrl === 'tema' ? 'Redação sobre o Tema Selecionado' :
                       (userType === "aluno" ? 'Enviar Redação — Tema Livre' : 'Enviar Redação Avulsa — Tema Livre')}
                    </h2>
                    <div className="flex items-center gap-2">
                      {userType === "aluno" && (
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {creditsLoading ? "..." : (forceCredits !== null ? forceCredits : credits)}
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Nome completo e email - só para visitantes */}
                  {userType === "visitante" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="nome-completo" className="text-sm">Nome Completo *</Label>
                        <Input
                          id="nome-completo"
                          type="text"
                          placeholder="Digite seu nome completo..."
                          value={nomeCompleto}
                          onChange={(e) => setNomeCompleto(e.target.value)}
                          maxLength={100}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-sm">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Digite seu e-mail..."
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          maxLength={100}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Frase Temática */}
                  <div className="space-y-1">
                    <Label htmlFor="frase-tematica" className="text-sm">Frase Temática *</Label>
                    <Input
                      id="frase-tematica"
                      type="text"
                      value={fraseTematica}
                      onChange={(e) => setFraseTematica(e.target.value)}
                      maxLength={200}
                      readOnly={fonteFromUrl === 'tema'}
                      required
                    />
                  </div>

                  {/* Tipo de envio */}
                  <div className="space-y-1">
                    <Label className="text-sm">Como deseja enviar sua redação?</Label>
                    <RadioGroup
                      value={tipoRedacao}
                      onValueChange={(value: "manuscrita" | "digitada") => {
                        setTipoRedacao(value);
                        if (value === "manuscrita") {
                          setRedacaoTexto("");
                          setPalavras(0);
                        } else {
                          handleRemoveRedacaoManuscrita();
                        }
                      }}
                      className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manuscrita" id="manuscrita" />
                        <Label htmlFor="manuscrita" className="text-sm">Manuscrita / Foto</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="digitada" id="digitada" />
                        <Label htmlFor="digitada" className="text-sm">Digitada</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Upload de manuscrita */}
                  {tipoRedacao === "manuscrita" && (
                    <Card>
                      <CardContent className="p-4 text-center border-2 border-dashed border-purple-400 rounded-xl">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, application/pdf"
                          className="hidden"
                          id="upload-file"
                          onChange={handleRedacaoManuscritaChange}
                        />
                        <label
                          htmlFor="upload-file"
                          className="cursor-pointer text-purple-700 font-medium flex flex-col items-center gap-2"
                        >
                          <Camera className="w-6 h-6" />
                          Selecionar arquivo da redação
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Somente JPG, PNG ou PDF (máx. 5MB)
                        </p>

                        {/* Preview do arquivo */}
                        {redacaoManuscritaUrl && (
                          <div className="relative mt-4 max-w-md mx-auto">
                            {redacaoManuscrita?.type === 'application/pdf' ? (
                              <div className="bg-white rounded-lg border p-4">
                                <div className="text-2xl mb-2">📄</div>
                                <p className="text-sm font-medium">{redacaoManuscrita.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(redacaoManuscrita.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            ) : (
                              <img
                                src={redacaoManuscritaUrl}
                                alt="Preview da redação"
                                className="w-full h-auto max-h-96 rounded-lg border object-contain bg-white"
                              />
                            )}
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
                      </CardContent>
                    </Card>
                  )}

                  {/* Texto digitado */}
                  {tipoRedacao === "digitada" && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="redacao" className="text-sm">Texto da Redação</Label>
                        <span className="text-xs text-gray-500">Palavras: {palavras}</span>
                      </div>
                      <Textarea
                        id="redacao"
                        rows={10}
                        className="resize-none"
                        value={redacaoTexto}
                        onChange={handleTextoChange}
                        required
                      />
                    </div>
                  )}

                  {/* Corretores disponíveis */}
                  <div className="mt-4">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Corretores disponíveis:</h3>
                    {loadingCorretores ? (
                      <p className="text-sm text-gray-500">Carregando corretores...</p>
                    ) : (
                      <div className="space-y-2">
                        {corretores.map((corretor) => (
                          <div key={corretor.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`corretor-${corretor.id}`}
                              checked={selectedCorretores.includes(corretor.id)}
                              onCheckedChange={(checked) =>
                                handleCorretorToggle(corretor.id, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`corretor-${corretor.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {corretor.nome_completo}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botão Enviar */}
                  <Button
                    type="submit"
                    className="w-full text-white bg-purple-600 hover:bg-purple-700 rounded-xl py-3 text-lg font-semibold mt-6"
                    disabled={isSubmitting || (userType === "aluno" && (creditsLoading || credits < requiredCredits))}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Redação"}
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