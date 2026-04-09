import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useCredits } from "@/hooks/useCredits";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useQueryClient } from "@tanstack/react-query";
import { gerarImagemA4DeTexto, validarImagemGerada, gerarNomeArquivoA4, contarPalavras } from "@/utils/gerarImagemA4";
import { getTurmaCode, normalizeTurmaToLetter } from "@/utils/turmaUtils";
import { corrigirOrientacaoImagem } from "@/utils/corrigirOrientacaoImagem";

interface RedacaoFormUnificadoProps {
  // Configurações do formulário
  isSimulado?: boolean;
  simuladoId?: string;
  fraseTematica: string;
  readOnlyFraseTematica?: boolean;

  // Configurações de créditos e corretores
  requiredCorretores?: number; // 1 para regular, 2 para simulado
  requiredCredits?: number; // 1 para regular, 2 para simulado

  // Dados de contexto
  fonte?: string;
  exercicioId?: string;
  processoSeletivoCandidatoId?: string | null; // ID do candidato do processo seletivo

  // Callbacks
  onSubmitSuccess?: () => void;

  // Estilo
  className?: string;
}

export const RedacaoFormUnificado = ({
  isSimulado = false,
  simuladoId,
  fraseTematica,
  readOnlyFraseTematica = false,
  requiredCorretores = 1,
  requiredCredits = 1,
  fonte,
  exercicioId,
  processoSeletivoCandidatoId,
  onSubmitSuccess,
  className
}: RedacaoFormUnificadoProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  const queryClient = useQueryClient();

  // Estados do formulário
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [fraseTematicaLocal, setFraseTematicaLocal] = useState(fraseTematica);
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [palavras, setPalavras] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [redacaoManuscrita, setRedacaoManuscrita] = useState<File | null>(null);
  const [redacaoManuscritaUrl, setRedacaoManuscritaUrl] = useState<string | null>(null);
  const [tipoRedacao, setTipoRedacao] = useState<"manuscrita" | "digitada">("digitada");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  // todosCorretores: lista filtrada por turma mas ainda NÃO filtrada por tipo de redação
  const [todosCorretores, setTodosCorretores] = useState<any[]>([]);
  const [loadingCorretores, setLoadingCorretores] = useState(true);

  // Corretores compatíveis com o tipo de redação selecionado pelo aluno
  const corretores = useMemo(() => {
    return todosCorretores.filter((c) => {
      if (tipoRedacao === "manuscrita") return c.aceita_manuscrita !== false;
      if (tipoRedacao === "digitada")   return c.aceita_digitada   !== false;
      return true;
    });
  }, [todosCorretores, tipoRedacao]);

  // Determinar tipo de usuário e envio
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");

  let tipoEnvio = "avulsa";
  let turmaCode = "visitante";
  const isProcessoSeletivo = !!processoSeletivoCandidatoId;

  if (isSimulado) {
    tipoEnvio = "simulado";
    if (userType === "aluno") {
      turmaCode = studentData.turma || alunoTurma || "visitante";
    }
  } else if (isProcessoSeletivo) {
    tipoEnvio = "processo_seletivo";
    if (userType === "aluno") {
      turmaCode = studentData.turma || alunoTurma || "visitante";
    }
  } else if (exercicioId) {
    tipoEnvio = "exercicio";
    if (userType === "aluno") {
      turmaCode = studentData.turma || alunoTurma || "visitante";
    }
  } else if (userType === "aluno") {
    tipoEnvio = "regular";
    turmaCode = studentData.turma || alunoTurma || "visitante";
  }

  // Hook para gerenciar créditos
  const getCreditEmail = () => {
    if (userType === "aluno") {
      return studentData.email || localStorage.getItem("alunoEmail") || email;
    }
    return email || "";
  };

  const creditEmail = getCreditEmail();
  const { credits, loading: creditsLoading, consumeCredits, checkSufficientCredits } = useCredits(creditEmail);

  // Carregar dados do usuário
  useEffect(() => {
    if (userType === "aluno") {
      const alunoEmail = studentData.email || localStorage.getItem("alunoEmail");
      const alunoNome = localStorage.getItem("alunoNome") || "Aluno";

      if (alunoEmail && !email) {
        setEmail(alunoEmail);
      }
      if (!nomeCompleto && alunoNome) {
        setNomeCompleto(alunoNome);
      }
    } else if (studentData.userType === "visitante" && studentData.visitanteInfo) {
      setNomeCompleto(studentData.visitanteInfo.nome);
      setEmail(studentData.visitanteInfo.email);
    }

    // Atualizar frase temática se mudou
    setFraseTematicaLocal(fraseTematica);

    // Carregar corretores
    fetchCorretores();
  }, [userType, fraseTematica, studentData]);

  const fetchCorretores = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 RedacaoFormUnificado - BUSCA DE CORRETORES');
    console.log('═══════════════════════════════════════════════════════');

    try {
      const { data, error } = await supabase
        .from('corretores')
        .select('id, nome_completo, email, turmas_autorizadas, aceita_manuscrita, aceita_digitada')
        .eq('ativo', true)
        .eq('visivel_no_formulario', true)
        .order('nome_completo');

      if (error) throw error;

      console.log('📦 DADOS RECEBIDOS DO BANCO:', data);
      console.log('👤 TURMA DO ALUNO (alunoTurma):', alunoTurma);
      console.log('👤 TURMA DO ALUNO (studentData.turma):', studentData.turma);

      let corretoresFiltrados = data || [];

      // Obter a turma do aluno
      const turmaAluno = studentData.turma || alunoTurma;

      if (turmaAluno) {
        // Normalizar a turma do aluno usando a função do turmaUtils
        const turmaNormalizada = normalizeTurmaToLetter(turmaAluno);
        console.log('✨ TURMA NORMALIZADA (extraída):', turmaNormalizada);

        if (!turmaNormalizada) {
          console.log('⚠️ Turma do aluno inválida, mostrando todos os corretores');
        } else {
          corretoresFiltrados = corretoresFiltrados.filter(corretor => {
            // Se turmas_autorizadas é null, o corretor está disponível para todas as turmas
            if (!corretor.turmas_autorizadas || corretor.turmas_autorizadas.length === 0) {
              console.log(`✅ ${corretor.nome_completo} - Disponível para todas as turmas (null/vazio)`);
              return true;
            }

            // Normalizar as turmas autorizadas usando a mesma função
            const turmasNormalizadas = corretor.turmas_autorizadas
              .map(t => normalizeTurmaToLetter(t))
              .filter(Boolean);

            console.log(`🔍 ${corretor.nome_completo}:`);
            console.log(`   - Turmas autorizadas (original):`, corretor.turmas_autorizadas);
            console.log(`   - Turmas autorizadas (normalizado):`, turmasNormalizadas);
            console.log(`   - Turma do aluno (normalizada): "${turmaNormalizada}"`);

            // Verificar se a turma do aluno está nas turmas autorizadas
            const incluido = turmasNormalizadas.includes(turmaNormalizada);
            console.log(`   - ${incluido ? '✅ INCLUÍDO' : '❌ EXCLUÍDO'}`);

            return incluido;
          });
        }
      }

      console.log('🔍 DEBUG RedacaoFormUnificado - Corretores filtrados por turma:', corretoresFiltrados);
      setTodosCorretores(corretoresFiltrados);
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

  // Contador de palavras com validação de limite
  const handleTextoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value;
    setRedacaoTexto(texto);
    const textoLimpo = texto.trim();
    const totalPalavras = textoLimpo ? textoLimpo.split(/\s+/).length : 0;
    setPalavras(totalPalavras);

    // Validar limite de 550 palavras
    if (totalPalavras > 550) {
      toast({
        title: "Limite de palavras excedido",
        description: `Sua redação tem ${totalPalavras} palavras. O limite é 550 palavras.`,
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Verificar se o aluno tem redação pendente com o corretor
  const verificarPendenciaCorretor = async (corretorId: string): Promise<boolean> => {
    try {
      const emailCredito = getCreditEmail();
      if (!emailCredito) return false;

      const { data, error } = await supabase.rpc('verificar_redacao_pendente_corretor', {
        p_email_aluno: emailCredito,
        p_corretor_id: corretorId,
        p_tipo_envio: tipoEnvio
      });

      if (error) {
        console.error('Erro ao verificar pendência:', error);
        return false;
      }

      if (data && data.length > 0 && data[0].tem_pendente) {
        const temaExibicao = data[0].tema ?
          `"${data[0].tema.substring(0, 30)}${data[0].tema.length > 30 ? '...' : ''}"` :
          'uma redação';
        toast({
          title: "Corretor indisponível",
          description: `Você já tem uma redação pendente com este corretor (${temaExibicao}). Aguarde a correção para enviar outra.`,
          variant: "destructive",
          duration: 6000
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar pendência com corretor:', error);
      return false;
    }
  };

  // Seleção de corretores
  const handleCorretorToggle = async (corretorId: string, checked: boolean) => {
    let newSelected = [...selectedCorretores];

    if (checked) {
      if (newSelected.length >= requiredCorretores) {
        const maxMessage = isSimulado ?
          "Simulados requerem exatamente 2 corretores." :
          "Envios regulares são feitos para apenas um corretor.";
        toast({
          title: "Limite excedido",
          description: maxMessage,
          variant: "destructive"
        });
        return;
      }

      // Verificar se tem pendência com este corretor
      const temPendencia = await verificarPendenciaCorretor(corretorId);
      if (temPendencia) {
        return; // Não adicionar o corretor se já tem pendência
      }

      newSelected.push(corretorId);
    } else {
      newSelected = newSelected.filter(id => id !== corretorId);
    }

    setSelectedCorretores(newSelected);
  };

  // Upload de arquivo — com correção automática de orientação para imagens
  const handleRedacaoManuscritaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Verificar tipo — PDF não é aceito pois o sistema de correção requer imagem
    if (file.type === 'application/pdf') {
      toast({
        title: "Formato não aceito",
        description: "A redação deve ser enviada como foto (JPG ou PNG). Tire uma foto da sua redação manuscrita e envie no formato de imagem.",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Use apenas JPG ou PNG.",
        variant: "destructive",
      });
      return;
    }

    // Revogar URL anterior para evitar vazamento de memória
    if (redacaoManuscritaUrl) {
      URL.revokeObjectURL(redacaoManuscritaUrl);
      setRedacaoManuscritaUrl(null);
    }

    // Corrigir orientação da imagem (EXIF + landscape → portrait)
    setIsProcessingImage(true);
    try {
      const fileCorrigido = await corrigirOrientacaoImagem(file);
      setRedacaoManuscrita(fileCorrigido);
      setRedacaoManuscritaUrl(URL.createObjectURL(fileCorrigido));
    } finally {
      setIsProcessingImage(false);
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

    try {
      // Validações
      if (!fraseTematicaLocal.trim()) {
        throw new Error("Preencha a frase temática");
      }

      if (userType === "visitante" && (!nomeCompleto.trim() || !email.trim())) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      // Validação específica para simulados
      if (isSimulado && selectedCorretores.length !== 2) {
        throw new Error("Simulados requerem exatamente 2 corretores");
      } else if (!isSimulado && selectedCorretores.length === 0) {
        throw new Error("Selecione pelo menos um corretor");
      }

      // Verificar se corretores são únicos (para simulados)
      if (isSimulado && selectedCorretores.length === 2 && selectedCorretores[0] === selectedCorretores[1]) {
        throw new Error("Não é possível selecionar o mesmo corretor duas vezes");
      }

      if (tipoRedacao === "digitada" && !redacaoTexto.trim()) {
        throw new Error("O campo da redação não pode estar vazio");
      }

      if (tipoRedacao === "manuscrita" && !redacaoManuscrita) {
        throw new Error("Selecione o arquivo da redação manuscrita");
      }

      // Validar limite de 550 palavras para redação digitada
      if (tipoRedacao === "digitada" && palavras > 550) {
        throw new Error(`Sua redação tem ${palavras} palavras. O limite é 550 palavras.`);
      }

      // Verificar créditos para alunos
      if (userType === "aluno" && credits < requiredCredits) {
        throw new Error("Créditos insuficientes");
      }

      let redacaoUrl = null;
      let imagemGeradaUrl = null;

      // Função para sanitizar nome de arquivo
      const sanitizeFileName = (name: string): string => {
        return name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')     // Remove acentos
          .replace(/[^a-zA-Z0-9_.-]/g, '_');   // Substitui caracteres inválidos por "_"
      };

      // Upload do arquivo se manuscrita
      if (tipoRedacao === "manuscrita" && redacaoManuscrita) {
        const sanitizedName = sanitizeFileName(redacaoManuscrita.name);
        const fileName = `redacao_${Date.now()}_${sanitizedName}`;
        const bucketName = 'redacoes-manuscritas';

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, redacaoManuscrita);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        redacaoUrl = publicUrl;
      }

      // Gerar imagem A4 se redação digitada
      if (tipoRedacao === "digitada") {
        try {
          // Gerar imagem A4 do texto (sem frase temática)
          const imagemBlob = await gerarImagemA4DeTexto(
            redacaoTexto.trim()
          );

          // Validar imagem gerada
          const validacao = validarImagemGerada(imagemBlob);
          if (!validacao.valido) {
            throw new Error(validacao.erro || "Imagem gerada inválida");
          }

          // Upload da imagem gerada
          const nomeArquivo = gerarNomeArquivoA4('redacao');
          const bucketName = 'redacoes-manuscritas';

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(nomeArquivo, imagemBlob, {
              contentType: 'image/jpeg',
              cacheControl: '3600'
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(nomeArquivo);

          imagemGeradaUrl = publicUrl;

        } catch (erroGeracao) {
          console.error("Erro ao gerar imagem A4:", erroGeracao);
          throw new Error(`Erro ao gerar imagem da redação: ${erroGeracao.message || erroGeracao}`);
        }
      }

      // Preparar dados finais
      let finalNomeCompleto = nomeCompleto.trim();
      let finalEmail = email.toLowerCase().trim();

      if (userType === "aluno") {
        const alunoEmail = studentData.email || localStorage.getItem("alunoEmail");
        const alunoNome = studentData.nomeUsuario || (() => {
          try { return JSON.parse(localStorage.getItem("alunoData") || "{}").nome; } catch { return null; }
        })() || "";

        if (alunoEmail) {
          finalEmail = alunoEmail.toLowerCase().trim();
        }
        if (!finalNomeCompleto && alunoNome) {
          finalNomeCompleto = alunoNome;
        }
      }

      // Calcular contagem de palavras para redações digitadas
      const contagemPalavras = tipoRedacao === "digitada" ? contarPalavras(redacaoTexto) : null;

      // Inserir redação no banco apropriado
      if (isSimulado) {
        // Para simulados
        const { error: redacaoError } = await supabase
          .from('redacoes_simulado')
          .insert({
            id_simulado: simuladoId,
            nome_aluno: finalNomeCompleto,
            email_aluno: finalEmail,
            turma: studentData.turma || turmaCode !== "visitante" ? turmaCode : null,
            texto: redacaoTexto.trim(), // Sempre salvar texto original
            redacao_manuscrita_url: redacaoUrl,
            redacao_imagem_gerada_url: imagemGeradaUrl, // Nova: imagem A4 gerada
            tipo_redacao_original: tipoRedacao, // Nova: tipo original
            contagem_palavras: contagemPalavras, // Nova: contagem de palavras
            corretor_id_1: selectedCorretores[0] || null,
            corretor_id_2: selectedCorretores[1] || null,
            status_corretor_1: 'pendente',
            status_corretor_2: selectedCorretores[1] ? 'pendente' : null,
            corrigida: false,
            data_envio: new Date().toISOString()
          });

        if (redacaoError) throw redacaoError;
      } else {
        // Para redações regulares (incluindo exercícios e processo seletivo)
        const redacaoData: Record<string, any> = {
          nome_aluno: finalNomeCompleto,
          email_aluno: finalEmail,
          frase_tematica: fraseTematicaLocal.trim(),
          redacao_texto: redacaoTexto.trim() || ".", // Sempre salvar texto original
          redacao_manuscrita_url: redacaoUrl,
          redacao_imagem_gerada_url: imagemGeradaUrl, // Nova: imagem A4 gerada
          tipo_redacao_original: tipoRedacao, // Nova: tipo original
          contagem_palavras: contagemPalavras, // Nova: contagem de palavras
          tipo_envio: tipoEnvio,
          turma: turmaCode !== "visitante" ? turmaCode : null,
          corretor_id_1: selectedCorretores[0] || null,
          corretor_id_2: selectedCorretores[1] || null
        };

        // Se for processo seletivo, vincular ao candidato
        if (processoSeletivoCandidatoId) {
          redacaoData.processo_seletivo_candidato_id = processoSeletivoCandidatoId;
        }

        const { data: redacaoInserida, error: redacaoError } = await supabase
          .from('redacoes_enviadas')
          .insert(redacaoData)
          .select('id')
          .single();

        if (redacaoError) throw redacaoError;

        // Se for processo seletivo, atualizar o status do candidato para "concluido"
        if (processoSeletivoCandidatoId) {
          const { error: updateCandidatoError } = await supabase
            .from('ps_candidatos')
            .update({
              status: 'concluido',
              data_conclusao: new Date().toISOString()
            })
            .eq('id', processoSeletivoCandidatoId);

          if (updateCandidatoError) {
            console.error('Erro ao atualizar status do candidato:', updateCandidatoError);
            // Não lançar erro pois a redação já foi enviada
          }

          // Marcar participação no perfil
          await supabase
            .from('profiles')
            .update({ participou_processo_seletivo: true })
            .eq('email', finalEmail);
        }
      }

      // Consumir créditos se for aluno (exceto processo seletivo que é gratuito)
      if (userType === "aluno" && requiredCredits > 0 && !isProcessoSeletivo) {
        const success = await consumeCredits(
          requiredCredits,
          isSimulado ? `Envio de redação de simulado` : 'Envio de redação'
        );

        if (!success) {
          toast({
            title: "Erro",
            description: "Não foi possível debitar os créditos. Tente novamente.",
            variant: "destructive"
          });
          return;
        }
      } else {
        // Toast para visitantes ou processo seletivo
        const description = isProcessoSeletivo
          ? "Sua redação do Processo Seletivo foi enviada com sucesso! Aguarde o resultado."
          : isSimulado
            ? "Sua redação do simulado foi enviada para correção."
            : "Sua redação foi enviada para correção.";

        toast({
          title: "✅ Redação enviada com sucesso!",
          description,
          className: "border-green-200 bg-green-50 text-green-900",
          duration: 5000
        });
      }

      // Invalidar cache do exercício se for um exercício
      if (exercicioId) {
        queryClient.invalidateQueries({
          queryKey: ['exercise-submission', exercicioId, studentData.email]
        });
      }

      // Invalidar cache do processo seletivo se aplicável
      if (isProcessoSeletivo) {
        queryClient.invalidateQueries({ queryKey: ['ps-candidato'] });
        queryClient.invalidateQueries({ queryKey: ['ps-redacao'] });
        queryClient.invalidateQueries({ queryKey: ['processo-seletivo-participacao'] });
      }

      // Callback de sucesso
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        // Navegar para página apropriada
        if (isSimulado) {
          navigate('/app');
        } else if (isProcessoSeletivo) {
          navigate('/processo-seletivo');
        } else {
          navigate('/minhas-redacoes');
        }
      }

    } catch (error) {
      console.error('Erro ao enviar redação:', error);

      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

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

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-2">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-lg sm:text-xl font-semibold">
              {isSimulado ? 'Enviar Redação do Simulado' :
               isProcessoSeletivo ? 'Redação do Processo Seletivo' :
               (fonte === 'tema' ? 'Redação sobre o Tema Selecionado' :
                (userType === "aluno" ? 'Enviar Redação — Tema Livre' : 'Enviar Redação Avulsa — Tema Livre'))}
            </h2>
            <div className="flex items-center gap-2">
              {userType === "aluno" && !isProcessoSeletivo && (
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {creditsLoading ? "..." : credits}
                </div>
              )}
              {isProcessoSeletivo && (
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                  Gratuito
                </span>
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
              value={fraseTematicaLocal}
              onChange={(e) => setFraseTematicaLocal(e.target.value)}
              maxLength={200}
              readOnly={readOnlyFraseTematica}
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
                // Limpar corretores selecionados: a lista de compatíveis pode mudar
                setSelectedCorretores([]);
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
                  accept="image/png, image/jpeg"
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
                  Somente JPG ou PNG (máx. 5MB)
                </p>

                {/* Feedback de processamento de orientação */}
                {isProcessingImage && (
                  <div className="mt-4 text-sm text-purple-700 font-medium animate-pulse">
                    Ajustando orientação da imagem...
                  </div>
                )}

                {/* Preview do arquivo */}
                {!isProcessingImage && redacaoManuscritaUrl && (
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
                <span className={`text-xs font-medium ${
                  palavras > 550 ? 'text-red-600' :
                  palavras > 500 ? 'text-amber-600' :
                  'text-gray-500'
                }`}>
                  Palavras: {palavras}/550
                </span>
              </div>
              <Textarea
                id="redacao"
                rows={10}
                className={`resize-none ${palavras > 550 ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                value={redacaoTexto}
                onChange={handleTextoChange}
                required
              />
              {palavras > 550 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Você excedeu o limite de 550 palavras. Por favor, reduza o texto.
                </p>
              )}
            </div>
          )}

          {/* Corretores disponíveis */}
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              Corretores disponíveis:
              {isSimulado && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Simulado requer exatamente 2 corretores)
                </span>
              )}
            </h3>
            {loadingCorretores ? (
              <p className="text-sm text-gray-500">Carregando corretores...</p>
            ) : corretores.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Nenhum corretor disponível para redações{" "}
                {tipoRedacao === "manuscrita" ? "manuscritas / foto" : "digitadas"} no momento.
                Tente selecionar o outro tipo de envio ou aguarde a disponibilidade.
              </p>
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
            disabled={isSubmitting || isProcessingImage || (userType === "aluno" && !isProcessoSeletivo && (creditsLoading || credits < requiredCredits))}
          >
            {isSubmitting ? "Enviando..." : isProcessingImage ? "Processando imagem..." : isProcessoSeletivo ? "Enviar Redação do Processo Seletivo" : "Enviar Redação"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};