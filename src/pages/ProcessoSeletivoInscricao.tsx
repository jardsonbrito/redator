import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserPlus,
  Home,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GraduationCap,
  LogIn,
  FileText
} from "lucide-react";
import { PSFormulario } from "@/components/processo-seletivo/PSFormulario";
import { FormularioCompleto, SecaoComPerguntas, Pergunta, Resposta } from "@/hooks/useProcessoSeletivo";

interface FormularioInfo {
  id: string;
  titulo: string;
  descricao: string | null;
  inscricoes_abertas: boolean;
  ativo: boolean;
  turma_processo: string | null;
}

// Validar número de WhatsApp brasileiro
const validarWhatsApp = (numero: string): boolean => {
  // Remove tudo que não é número
  const apenasNumeros = numero.replace(/\D/g, '');

  // WhatsApp brasileiro: 10 ou 11 dígitos (DDD + número)
  // 11 dígitos = DDD (2) + 9 + número (8)
  // 10 dígitos = DDD (2) + número (8) - formato antigo
  if (apenasNumeros.length < 10 || apenasNumeros.length > 11) {
    return false;
  }

  // Verifica se o DDD é válido (11 a 99)
  const ddd = parseInt(apenasNumeros.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }

  return true;
};

// Estado possível após cadastro
type EtapaFluxo = 'cadastro' | 'formulario' | 'concluido';

export default function ProcessoSeletivoInscricao() {
  const { formularioId } = useParams<{ formularioId: string }>();

  const [formulario, setFormulario] = useState<FormularioInfo | null>(null);
  const [formularioCompleto, setFormularioCompleto] = useState<FormularioCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFormulario, setLoadingFormulario] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enviandoFormulario, setEnviandoFormulario] = useState(false);
  const [etapaFluxo, setEtapaFluxo] = useState<EtapaFluxo>('cadastro');
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappErro, setWhatsappErro] = useState<string | null>(null);
  const [candidatoId, setCandidatoId] = useState<string | null>(null);

  // Buscar informações do processo seletivo
  useEffect(() => {
    const buscarFormulario = async () => {
      if (!formularioId) {
        setErro("Link de inscrição inválido");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("ps_formularios")
          .select("id, titulo, descricao, inscricoes_abertas, ativo, turma_processo")
          .eq("id", formularioId)
          .single();

        if (error || !data) {
          setErro("Processo seletivo não encontrado");
          setLoading(false);
          return;
        }

        // Verificar se tem turma - se não tiver, gerar
        if (!data.turma_processo) {
          const { data: turmaData } = await supabase.rpc('gerar_e_atribuir_turma_processo', {
            formulario_id: formularioId
          });

          if (turmaData) {
            data.turma_processo = turmaData;
          }
        }

        setFormulario(data as FormularioInfo);
      } catch (err) {
        console.error("Erro ao buscar processo:", err);
        setErro("Erro ao carregar informações do processo seletivo");
      } finally {
        setLoading(false);
      }
    };

    buscarFormulario();
  }, [formularioId]);

  // Carregar formulário completo com seções e perguntas
  const carregarFormularioCompleto = async () => {
    if (!formularioId) return;

    setLoadingFormulario(true);
    try {
      // Buscar seções do formulário
      const { data: secoesData, error: secoesError } = await supabase
        .from('ps_secoes')
        .select('*')
        .eq('formulario_id', formularioId)
        .order('ordem');

      if (secoesError) {
        console.error('Erro ao buscar seções:', secoesError);
        toast.error('Erro ao carregar formulário');
        return;
      }

      // Buscar perguntas de cada seção
      const secoesComPerguntas: SecaoComPerguntas[] = await Promise.all(
        (secoesData || []).map(async (secao) => {
          const { data: perguntasData } = await supabase
            .from('ps_perguntas')
            .select('*')
            .eq('secao_id', secao.id)
            .order('ordem');

          return {
            ...secao,
            perguntas: (perguntasData || []) as Pergunta[]
          };
        })
      );

      const formCompleto: FormularioCompleto = {
        id: formulario!.id,
        titulo: formulario!.titulo,
        descricao: formulario!.descricao,
        ativo: formulario!.ativo,
        inscricoes_abertas: formulario!.inscricoes_abertas,
        criado_em: '', // não temos esse dado na busca inicial
        turma_processo: formulario!.turma_processo,
        secoes: secoesComPerguntas
      };

      setFormularioCompleto(formCompleto);
      setEtapaFluxo('formulario');
    } catch (err) {
      console.error('Erro ao carregar formulário completo:', err);
      toast.error('Erro ao carregar formulário');
    } finally {
      setLoadingFormulario(false);
    }
  };

  // Enviar respostas do formulário
  const handleEnviarFormulario = async (respostas: Omit<Resposta, 'id' | 'candidato_id'>[]) => {
    if (!candidatoId) {
      toast.error('Erro: candidato não identificado');
      return;
    }

    setEnviandoFormulario(true);
    try {
      // Atualizar status do candidato para 'formulario_enviado'
      const { error: updateError } = await supabase
        .from('ps_candidatos')
        .update({
          status: 'formulario_enviado',
          data_inscricao: new Date().toISOString()
        })
        .eq('id', candidatoId);

      if (updateError) {
        console.error('Erro ao atualizar status do candidato:', updateError);
        throw new Error('Erro ao atualizar candidatura');
      }

      // Inserir respostas
      const respostasParaInserir = respostas.map(r => ({
        ...r,
        candidato_id: candidatoId
      }));

      const { error: respostasError } = await supabase
        .from('ps_respostas')
        .insert(respostasParaInserir);

      if (respostasError) {
        console.error('Erro ao salvar respostas:', respostasError);
        throw new Error('Erro ao salvar respostas do formulário');
      }

      toast.success('Formulário enviado com sucesso!');
      setEtapaFluxo('concluido');
    } catch (err: any) {
      console.error('Erro ao enviar formulário:', err);
      toast.error(err.message || 'Erro ao enviar formulário');
    } finally {
      setEnviandoFormulario(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || !whatsapp.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validar WhatsApp
    if (!validarWhatsApp(whatsapp)) {
      setWhatsappErro("Digite um número de WhatsApp válido (DDD + número)");
      toast.error("Número de WhatsApp inválido. Digite com DDD (ex: 11999998888)");
      return;
    }
    setWhatsappErro(null);

    if (!formularioId) {
      toast.error("Erro: ID do processo não encontrado");
      return;
    }

    setSubmitting(true);

    try {
      // Chamar a função RPC para cadastrar candidato
      const { data, error } = await supabase.rpc('cadastrar_candidato_processo_seletivo', {
        p_nome: nome.trim(),
        p_email: email.trim().toLowerCase(),
        p_formulario_id: formularioId,
        p_whatsapp: whatsapp.trim()
      });

      if (error) {
        console.error("Erro RPC:", error);
        toast.error("Erro ao processar inscrição. Tente novamente.");
        return;
      }

      const resultado = data as { success: boolean; error?: string; candidato_id?: string };

      if (!resultado.success) {
        // Verificar se o erro é de "já inscrito" - pode ser que o candidato já existe mas não completou o formulário
        if (resultado.error?.includes("já está inscrito")) {
          // Buscar o candidato existente para verificar status
          const { data: candidatoExistente, error: buscaError } = await supabase
            .from('ps_candidatos')
            .select('id, status')
            .ilike('email_aluno', email.trim().toLowerCase())
            .eq('formulario_id', formularioId)
            .single();

          if (buscaError || !candidatoExistente) {
            toast.error("Você já está inscrito neste processo seletivo. Faça login para acompanhar.");
            return;
          }

          // Verificar o status do candidato
          if (candidatoExistente.status === 'nao_inscrito') {
            // Candidato existe mas não completou o formulário - permitir continuar
            setCandidatoId(candidatoExistente.id);
            toast.info("Você já iniciou sua inscrição. Complete o formulário abaixo.");
            await carregarFormularioCompleto();
            return;
          } else if (candidatoExistente.status === 'formulario_enviado') {
            toast.info("Você já enviou seu formulário de inscrição. Aguarde a análise.");
            return;
          } else {
            toast.info("Você já está participando deste processo seletivo. Faça login para acompanhar.");
            return;
          }
        }

        toast.error(resultado.error || "Erro ao realizar inscrição");
        return;
      }

      // Sucesso! Guardar o ID do candidato e carregar o formulário completo
      if (resultado.candidato_id) {
        setCandidatoId(resultado.candidato_id);
      }

      toast.success("Cadastro realizado! Agora preencha o formulário para completar sua inscrição.");

      // Carregar o formulário completo automaticamente
      await carregarFormularioCompleto();

    } catch (err: any) {
      console.error("Erro ao inscrever:", err);
      toast.error(err.message || "Erro inesperado ao processar inscrição");
    } finally {
      setSubmitting(false);
    }
  };

  // Tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#3F0077]" />
              <p className="text-muted-foreground">Carregando processo seletivo...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de erro
  if (erro || !formulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Processo Indisponível</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pb-6">
            <p className="text-muted-foreground">
              {erro || "O processo seletivo solicitado não foi encontrado."}
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de inscrições fechadas
  if (!formulario.ativo || !formulario.inscricoes_abertas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-orange-600">Inscrições Encerradas</CardTitle>
            <CardDescription className="text-lg mt-2">{formulario.titulo}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 pb-6">
            <p className="text-muted-foreground">
              As inscrições para este processo seletivo foram encerradas.
            </p>
            <Alert variant="default" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Já está inscrito?</AlertTitle>
              <AlertDescription>
                Se você já realizou sua inscrição, acesse sua conta para acompanhar o processo.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Link to="/aluno-login">
                <Button className="w-full bg-[#3F0077] hover:bg-[#662F96]">
                  <LogIn className="w-4 h-4 mr-2" />
                  Acessar Minha Conta
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de carregamento do formulário
  if (loadingFormulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#3F0077]" />
              <p className="text-muted-foreground">Carregando formulário de inscrição...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela do formulário completo (fluxo integrado)
  if (etapaFluxo === 'formulario' && formularioCompleto) {
    // Verificar se o formulário tem seções configuradas
    if (!formularioCompleto.secoes || formularioCompleto.secoes.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">Cadastro Realizado!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4 pb-6">
              <p className="text-muted-foreground">
                Seu cadastro no processo seletivo <strong>{formulario?.titulo}</strong> foi realizado com sucesso!
              </p>
              <Alert className="text-left bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-700">Formulário em Configuração</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  O formulário de inscrição está sendo configurado. Você pode acessar sua conta mais tarde para completar sua inscrição quando disponível.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/aluno-login">
                  <Button className="w-full bg-[#3F0077] hover:bg-[#662F96]">
                    <LogIn className="w-4 h-4 mr-2" />
                    Acessar Minha Conta
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Indicador de progresso do fluxo */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700">Cadastro realizado para: <strong>{email}</strong></p>
                  <p className="text-xs text-green-600">Agora preencha o formulário abaixo para completar sua inscrição</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário completo */}
          <PSFormulario
            formulario={formularioCompleto}
            onSubmit={handleEnviarFormulario}
            isSubmitting={enviandoFormulario}
          />
        </div>
      </div>
    );
  }

  // Tela de inscrição concluída (formulário enviado com sucesso)
  if (etapaFluxo === 'concluido') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">Inscrição Completa!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pb-6">
            <p className="text-muted-foreground">
              Sua inscrição no processo seletivo <strong>{formulario?.titulo}</strong> foi enviada com sucesso!
            </p>
            <Alert className="text-left bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">Aguarde a Análise</AlertTitle>
              <AlertDescription className="text-blue-600 space-y-2">
                <p>
                  Nossa equipe irá analisar seus dados. Você pode acompanhar o status da sua inscrição acessando sua conta.
                </p>
                <p className="text-sm mt-2">
                  Use o e-mail <strong>{email}</strong> para fazer login.
                </p>
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/aluno-login">
                <Button className="w-full bg-[#3F0077] hover:bg-[#662F96]">
                  <LogIn className="w-4 h-4 mr-2" />
                  Acessar Minha Conta
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de inscrição
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3F0077]/10 via-purple-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-[#3F0077] p-3 rounded-full">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#3F0077]">{formulario.titulo}</CardTitle>
          {formulario.descricao && (
            <CardDescription className="mt-2 text-base">
              {formulario.descricao}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu melhor e-mail"
                required
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Você usará este e-mail para acessar sua conta
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  if (whatsappErro) setWhatsappErro(null);
                }}
                placeholder="(00) 00000-0000"
                required
                disabled={submitting}
                className={whatsappErro ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {whatsappErro ? (
                <p className="text-xs text-red-500">{whatsappErro}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Número para contato via WhatsApp (com DDD)
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!nome.trim() || !email.trim() || !whatsapp.trim() || submitting}
              className="w-full bg-[#3F0077] hover:bg-[#662F96] h-11"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Continuar para o Formulário
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 border-t">
            <p className="text-center text-sm text-muted-foreground">
              Já está inscrito?{" "}
              <Link to="/aluno-login" className="text-[#3F0077] hover:underline font-medium">
                Acessar minha conta
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
