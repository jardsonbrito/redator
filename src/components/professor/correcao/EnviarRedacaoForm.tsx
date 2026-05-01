import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useJarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, AlertCircle, Check, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";

interface Props {
  professorEmail: string;
  onConcluida?: (correcaoId: string) => void;
}

interface FormData {
  turmaId: string;
  autorNome: string;
  tema: string;
}

export const EnviarRedacaoForm = ({ professorEmail, onConcluida }: Props) => {
  const { turmas, creditos, enviarRedacao, processarCorrecao, criarTurma, deletarTurma } =
    useJarvisCorrecao(professorEmail);

  const [modo, setModo] = useState<"manuscrita" | "digitada" | null>(null);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [textoDigitado, setTextoDigitado] = useState("");
  const [showCriarTurma, setShowCriarTurma] = useState(false);
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [showDeleteTurma, setShowDeleteTurma] = useState(false);
  const [showRevisaoOCR, setShowRevisaoOCR] = useState(false);
  const [transcricaoOCR, setTranscricaoOCR] = useState("");
  const [correcaoIdEmRevisao, setCorrecaoIdEmRevisao] = useState<string | null>(null);
  const [showImagemAmpliada, setShowImagemAmpliada] = useState(false);
  const [showProcessando, setShowProcessando] = useState(false);
  const dismissedRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { turmaId: "", autorNome: "", tema: "" } });

  const turmaIdSelecionada = watch("turmaId");

  const handleSelecionarManuscrita = () => {
    setModo("manuscrita");
    fileInputRef.current?.click();
  };

  const handleRemoverImagem = () => {
    setImagemBase64(null);
    setArquivoNome(null);
    setModo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas JPG, JPEG ou PNG são permitidos");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo: 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagemBase64(result);
      setArquivoNome(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleCriarTurma = async () => {
    if (!novaTurmaNome.trim()) {
      toast.error("Digite o nome da turma");
      return;
    }
    await criarTurma.mutateAsync(novaTurmaNome);
    setShowCriarTurma(false);
    setNovaTurmaNome("");
  };

  const resetForm = () => {
    reset();
    setModo(null);
    setArquivoNome(null);
    setImagemBase64(null);
    setTextoDigitado("");
    setShowProcessando(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDismissProcessando = () => {
    dismissedRef.current = true;
    resetForm();
  };

  const onSubmit = async (data: FormData) => {
    if (!creditos || creditos < 1) {
      toast.error("Você não tem créditos disponíveis");
      return;
    }

    if (!modo) {
      toast.error("Selecione o tipo de redação: manuscrita ou digitada");
      return;
    }

    if (modo === "digitada" && !textoDigitado.trim()) {
      toast.error("Digite ou cole o texto da redação");
      return;
    }

    if (modo === "manuscrita" && !imagemBase64) {
      toast.error("Selecione uma imagem da redação");
      return;
    }

    dismissedRef.current = false;
    setShowProcessando(true);

    try {
      if (modo === "digitada") {
        const result = await enviarRedacao.mutateAsync({
          turmaId: data.turmaId || null,
          autorNome: data.autorNome,
          tema: data.tema,
        });
        const correcao = await processarCorrecao.mutateAsync({
          correcaoId: result.correcaoId,
          transcricaoConfirmada: textoDigitado,
        });
        resetForm();
        if (!dismissedRef.current) onConcluida?.(correcao.correcaoId);
        dismissedRef.current = false;
      } else {
        const result = await enviarRedacao.mutateAsync({
          turmaId: data.turmaId || null,
          autorNome: data.autorNome,
          tema: data.tema,
          imagemBase64,
        });
        if (result.status === "revisao_ocr" && result.transcricaoOCR) {
          setShowProcessando(false);
          setTranscricaoOCR(result.transcricaoOCR);
          setCorrecaoIdEmRevisao(result.correcaoId);
          setShowRevisaoOCR(true);
        }
      }
    } catch {
      setShowProcessando(false);
    }
  };

  const handleConfirmarOCR = async () => {
    if (!correcaoIdEmRevisao || !transcricaoOCR.trim()) {
      toast.error("A transcrição não pode estar vazia");
      return;
    }
    dismissedRef.current = false;
    setShowRevisaoOCR(false);
    setShowProcessando(true);
    try {
      await processarCorrecao.mutateAsync({
        correcaoId: correcaoIdEmRevisao,
        transcricaoConfirmada: transcricaoOCR,
      });
      setTranscricaoOCR("");
      const idConcluido = correcaoIdEmRevisao;
      resetForm();
      setCorrecaoIdEmRevisao(null);
      if (!dismissedRef.current && idConcluido) onConcluida?.(idConcluido);
      dismissedRef.current = false;
    } catch {
      setShowProcessando(false);
    }
  };

  const mensagemProcessando = processarCorrecao.isPending
    ? "Jarvis está corrigindo sua redação..."
    : modo === "manuscrita"
    ? "Jarvis está lendo a redação manuscrita..."
    : "Jarvis está preparando a correção...";

  const submensagemProcessando = processarCorrecao.isPending
    ? "A IA está avaliando as 5 competências do ENEM. Isso pode levar alguns segundos."
    : modo === "manuscrita"
    ? "O Jarvis está realizando o OCR da imagem. Aguarde um instante."
    : "Registrando sua redação e iniciando a correção...";

  return (
    <>
      {showProcessando && (
        <div className="relative flex flex-col items-center justify-center rounded-3xl border border-[#dcc8f5] bg-[#fbf8ff] px-8 py-16 text-center">
          <button
            type="button"
            onClick={handleDismissProcessando}
            className="absolute right-4 top-4 rounded-xl p-1.5 text-[#b09cc8] transition hover:bg-[#efe4ff] hover:text-[#4B0082]"
            title="Voltar ao formulário"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Ícone animado */}
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#8624d6]/20" style={{ animationDuration: "1.5s" }} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#efe4ff] to-[#dcc8f5] text-4xl shadow-[0_0_0_6px_rgba(134,36,214,0.08)]">
              🤖
            </div>
          </div>

          {/* Dots */}
          <div className="mb-5 flex gap-2">
            {[0, 0.15, 0.3].map((delay, i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8624d6]"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>

          <p className="text-base font-bold text-[#4B0082]">{mensagemProcessando}</p>
          <p className="mt-2 max-w-xs text-sm text-[#78668e]">{submensagemProcessando}</p>
          <p className="mt-4 text-xs text-[#b09cc8]">
            Clique no <strong>✕</strong> para enviar outra redação.<br />
            Esta já foi registrada e aparecerá no histórico.
          </p>
        </div>
      )}

      {!showProcessando && (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Campos principais */}
        <div className="rounded-3xl border border-[#dcc8f5] bg-[#fbf8ff] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Turma */}
            <div>
              <Label className="mb-2 block text-sm font-extrabold">Turma</Label>
              <div className="flex gap-2">
                <Select
                  value={turmaIdSelecionada}
                  onValueChange={(v) => setValue("turmaId", v)}
                >
                  <SelectTrigger className="h-12 flex-1 rounded-xl border-[#c9a6ed] focus:border-[#6B3294] focus:ring-[#a463f2]/15">
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas?.map((turma: any) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nome}{turma.escola ? ` — ${turma.escola}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-xl border-[#c9a6ed] text-[#4B0082] hover:bg-[#efe4ff]"
                  onClick={() => setShowCriarTurma(true)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30"
                  disabled={!turmaIdSelecionada}
                  onClick={() => setShowDeleteTurma(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Aluno */}
            <div>
              <Label htmlFor="autorNome" className="mb-2 block text-sm font-extrabold">
                Nome do aluno *
              </Label>
              <Input
                id="autorNome"
                className="h-12 rounded-xl border-[#c9a6ed] focus-visible:ring-[#a463f2]/15 focus-visible:border-[#6B3294]"
                placeholder="Digite o nome completo"
                {...register("autorNome", { required: "Nome do aluno é obrigatório" })}
              />
              {errors.autorNome && (
                <p className="mt-1 text-xs text-destructive">{errors.autorNome.message}</p>
              )}
            </div>
          </div>

          {/* Tema */}
          <div className="mt-4">
            <Label htmlFor="tema" className="mb-2 block text-sm font-extrabold">
              Tema da redação *
            </Label>
            <Input
              id="tema"
              className="h-12 rounded-xl border-[#c9a6ed] focus-visible:ring-[#a463f2]/15 focus-visible:border-[#6B3294]"
              placeholder="Ex: A importância da educação no Brasil"
              {...register("tema", { required: "Tema é obrigatório" })}
            />
            {errors.tema && (
              <p className="mt-1 text-xs text-destructive">{errors.tema.message}</p>
            )}
          </div>
        </div>

        {/* Seleção de modo */}
        <div className="rounded-3xl border border-[#dcc8f5] bg-[#fbf8ff] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Manuscrita */}
            <button
              type="button"
              onClick={handleSelecionarManuscrita}
              className={`rounded-2xl border px-5 py-5 text-left transition ${
                modo === "manuscrita"
                  ? "border-[#4B0082] bg-[#efe4ff] text-[#4B0082]"
                  : "border-[#d8c1f3] bg-white text-[#4f3a68] hover:bg-[#f7f0ff]"
              }`}
            >
              <div className="flex items-center gap-2 text-base font-black">
                <span aria-hidden="true">⇧</span>
                Manuscrita
              </div>
              <p className="mt-1.5 text-sm text-[#78668e]">Upload da imagem com OCR</p>
              {arquivoNome && modo === "manuscrita" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#4B0082]">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{arquivoNome}</span>
                </p>
              )}
            </button>

            {/* Digitada */}
            <button
              type="button"
              onClick={() => setModo("digitada")}
              className={`rounded-2xl border px-5 py-5 text-left transition ${
                modo === "digitada"
                  ? "border-[#4B0082] bg-[#efe4ff] text-[#4B0082]"
                  : "border-[#d8c1f3] bg-white text-[#4f3a68] hover:bg-[#f7f0ff]"
              }`}
            >
              <div className="flex items-center gap-2 text-base font-black">
                <span aria-hidden="true">⌨</span>
                Digitada
              </div>
              <p className="mt-1.5 text-sm text-[#78668e]">
                Digite sua redação ou cole seu texto aqui
              </p>
            </button>
          </div>

          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={handleArquivoChange}
          />

          {/* Prévia da imagem manuscrita */}
          {modo === "manuscrita" && imagemBase64 && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#c9a6ed] bg-white p-3">
              <button
                type="button"
                onClick={() => setShowImagemAmpliada(true)}
                className="group relative flex-shrink-0"
                title="Clique para ampliar"
              >
                <img
                  src={imagemBase64}
                  alt="Prévia da redação"
                  className="h-20 w-20 rounded-xl border border-[#dcc8f5] object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 transition group-hover:opacity-100">
                  <ZoomIn className="h-5 w-5 text-white" />
                </div>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#4f3a68]">{arquivoNome}</p>
                <p className="mt-0.5 text-xs text-[#78668e]">Clique na imagem para ampliar</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 text-xs font-medium text-[#6B3294] underline underline-offset-2 hover:text-[#4B0082]"
                >
                  Substituir imagem
                </button>
              </div>
              <button
                type="button"
                onClick={handleRemoverImagem}
                className="flex-shrink-0 rounded-xl p-1.5 text-[#78668e] transition hover:bg-[#f0e6ff] hover:text-[#4B0082]"
                title="Remover imagem"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Textarea para modo digitada */}
          {modo === "digitada" && (
            <div className="mt-4">
              <Textarea
                className="min-h-[220px] rounded-2xl border-[#c9a6ed] bg-white p-4 text-base leading-relaxed focus-visible:ring-[#a463f2]/15 focus-visible:border-[#6B3294]"
                placeholder="Digite sua redação ou cole seu texto aqui"
                value={textoDigitado}
                onChange={(e) => setTextoDigitado(e.target.value)}
              />
              {textoDigitado && (
                <p className="mt-1.5 text-xs text-[#78668e]">
                  {textoDigitado.split(/\s+/).filter(Boolean).length} palavras
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botão de envio */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creditos === 0}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#4B0082] to-[#8624d6] px-8 py-4 text-base font-black text-white shadow-[0_12px_24px_rgba(75,0,130,0.22)] transition hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Enviar redação
          </button>
        </div>
      </form>
      )}

      {/* AlertDialog: Deletar Turma */}
      <AlertDialog open={showDeleteTurma} onOpenChange={setShowDeleteTurma}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover turma?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá a turma da sua lista. As redações associadas a ela não serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                await deletarTurma.mutateAsync(turmaIdSelecionada);
                setValue("turmaId", "");
              }}
            >
              {deletarTurma.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Criar Turma */}
      <Dialog open={showCriarTurma} onOpenChange={setShowCriarTurma}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Turma</DialogTitle>
            <DialogDescription>Digite o nome da turma que deseja criar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Turma</Label>
              <Input
                placeholder="Ex: 3º Ano A"
                value={novaTurmaNome}
                onChange={(e) => setNovaTurmaNome(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCriarTurma(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCriarTurma} disabled={criarTurma.isPending}>
                {criarTurma.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Revisão do OCR */}
      <Dialog open={showRevisaoOCR} onOpenChange={setShowRevisaoOCR}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Transcrição do OCR</DialogTitle>
            <DialogDescription>
              O sistema extraiu o texto da imagem. Revise e corrija se necessário antes de enviar para correção.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Revise o texto com atenção. Erros no OCR podem afetar a qualidade da correção.</span>
            </div>
            <div>
              <Label>Texto Transcrito</Label>
              <Textarea
                rows={20}
                value={transcricaoOCR}
                onChange={(e) => setTranscricaoOCR(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {transcricaoOCR.split(/\s+/).filter(Boolean).length} palavras
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevisaoOCR(false);
                  setTranscricaoOCR("");
                  setCorrecaoIdEmRevisao(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmarOCR} disabled={processarCorrecao.isPending}>
                {processarCorrecao.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando Correção...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar e Corrigir
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ampliar imagem da redação manuscrita */}
      <Dialog open={showImagemAmpliada} onOpenChange={setShowImagemAmpliada}>
        <DialogContent className="max-w-3xl p-3">
          <DialogHeader className="pb-1">
            <DialogTitle className="truncate text-sm font-semibold text-[#4f3a68]">
              {arquivoNome}
            </DialogTitle>
            <DialogDescription className="sr-only">Visualização da redação manuscrita</DialogDescription>
          </DialogHeader>
          {imagemBase64 && (
            <img
              src={imagemBase64}
              alt="Redação manuscrita"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
