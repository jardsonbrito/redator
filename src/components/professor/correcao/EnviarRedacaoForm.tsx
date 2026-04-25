import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useJarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Plus, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  professorEmail: string;
}

interface FormData {
  turmaId: string;
  autorNome: string;
  tema: string;
}

export const EnviarRedacaoForm = ({ professorEmail }: Props) => {
  const { turmas, creditos, enviarRedacao, processarCorrecao, criarTurma } =
    useJarvisCorrecao(professorEmail);

  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [showCriarTurma, setShowCriarTurma] = useState(false);
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [showRevisaoOCR, setShowRevisaoOCR] = useState(false);
  const [transcricaoOCR, setTranscricaoOCR] = useState("");
  const [correcaoIdEmRevisao, setCorrecaoIdEmRevisao] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      turmaId: "",
      autorNome: "",
      tema: "",
    },
  });

  const turmaIdSelecionada = watch("turmaId");

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo: 10MB");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagemPreview(result);
      setImagemBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const removerImagem = () => {
    setImagemPreview(null);
    setImagemBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  const onSubmit = async (data: FormData) => {
    // Validar créditos
    if (!creditos || creditos < 1) {
      toast.error("Você não tem créditos suficientes");
      return;
    }

    try {
      const result = await enviarRedacao.mutateAsync({
        turmaId: data.turmaId || null,
        autorNome: data.autorNome,
        tema: data.tema,
        imagemBase64: imagemBase64 || undefined,
      });

      // Se tem OCR, abrir dialog de revisão
      if (result.status === "revisao_ocr" && result.transcricaoOCR) {
        setTranscricaoOCR(result.transcricaoOCR);
        setCorrecaoIdEmRevisao(result.correcaoId);
        setShowRevisaoOCR(true);
      } else {
        // Sem OCR, sucesso
        toast.success("Redação enviada! Aguardando digitação do texto.");
        reset();
        removerImagem();
      }
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleConfirmarOCR = async () => {
    if (!correcaoIdEmRevisao) return;

    if (!transcricaoOCR.trim()) {
      toast.error("A transcrição não pode estar vazia");
      return;
    }

    try {
      await processarCorrecao.mutateAsync({
        correcaoId: correcaoIdEmRevisao,
        transcricaoConfirmada: transcricaoOCR,
      });

      setShowRevisaoOCR(false);
      setTranscricaoOCR("");
      setCorrecaoIdEmRevisao(null);
      reset();
      removerImagem();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Alerta de créditos */}
        {creditos !== undefined && creditos < 5 && (
          <Alert variant={creditos === 0 ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {creditos === 0
                ? "Você não tem créditos disponíveis. Entre em contato com o administrador."
                : `Atenção: Você tem apenas ${creditos} crédito(s) restante(s).`}
            </AlertDescription>
          </Alert>
        )}

        {/* Card: Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Redação</CardTitle>
            <CardDescription>
              Preencha os dados básicos da redação a ser corrigida
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Turma */}
            <div>
              <Label>Turma</Label>
              <div className="flex gap-2">
                <Select
                  value={turmaIdSelecionada}
                  onValueChange={(value) => setValue("turmaId", value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma turma (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem turma</SelectItem>
                    {turmas?.map((turma: any) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nome}
                        {turma.escola && ` - ${turma.escola}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCriarTurma(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Nome do Aluno */}
            <div>
              <Label htmlFor="autorNome">Nome do Aluno *</Label>
              <Input
                id="autorNome"
                placeholder="Digite o nome completo do aluno"
                {...register("autorNome", { required: "Nome do aluno é obrigatório" })}
              />
              {errors.autorNome && (
                <p className="text-sm text-destructive mt-1">{errors.autorNome.message}</p>
              )}
            </div>

            {/* Tema */}
            <div>
              <Label htmlFor="tema">Tema da Redação *</Label>
              <Input
                id="tema"
                placeholder="Ex: A importância da educação no Brasil"
                {...register("tema", { required: "Tema é obrigatório" })}
              />
              {errors.tema && (
                <p className="text-sm text-destructive mt-1">{errors.tema.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card: Upload de Imagem */}
        <Card>
          <CardHeader>
            <CardTitle>Imagem da Redação (Opcional)</CardTitle>
            <CardDescription>
              Envie uma foto da redação manuscrita. O sistema fará OCR automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!imagemPreview ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImagemChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-32"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8" />
                    <span>Clique para selecionar imagem</span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG (máx. 10MB)
                    </span>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={imagemPreview}
                  alt="Preview"
                  className="w-full max-h-96 object-contain rounded-md border"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={removerImagem}
                  className="w-full"
                >
                  Remover Imagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão de Envio */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={enviarRedacao.isPending || creditos === 0}
          >
            {enviarRedacao.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {imagemPreview ? "Enviar e Fazer OCR" : "Enviar Redação"}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Dialog: Criar Turma */}
      <Dialog open={showCriarTurma} onOpenChange={setShowCriarTurma}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Turma</DialogTitle>
            <DialogDescription>
              Digite o nome da turma que deseja criar
            </DialogDescription>
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

      {/* Dialog: Revisão de OCR */}
      <Dialog open={showRevisaoOCR} onOpenChange={setShowRevisaoOCR}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Transcrição do OCR</DialogTitle>
            <DialogDescription>
              O sistema extraiu o texto da imagem. Revise e corrija se necessário antes de enviar
              para correção.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Revise o texto com atenção. Erros no OCR podem afetar
                a qualidade da correção.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Texto Transcrito</Label>
              <Textarea
                rows={20}
                value={transcricaoOCR}
                onChange={(e) => setTranscricaoOCR(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {transcricaoOCR.split(/\s+/).length} palavras
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
              <Button
                onClick={handleConfirmarOCR}
                disabled={processarCorrecao.isPending}
              >
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
    </>
  );
};
