import { useState, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { JarvisCorrecao, useJarvisCorrecaoVersoes, useReprocessarCorrecao } from "@/hooks/useJarvisCorrecao";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle, CheckCircle2, XCircle, FileText,
  ChevronDown, ChevronUp, RefreshCw, History, Loader2, Mic, MicOff,
  Download, Share2, Copy, ExternalLink, Unlink,
} from "lucide-react";
import { useJarvisCorrecaoLink, type JarvisCorrecaoLink } from "@/hooks/useJarvisCorrecaoLink";
import { generateJarvisCorrecaoPDF } from "@/utils/jarvisCorrecaoPdfUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";

interface Props {
  correcao: JarvisCorrecao;
  professorEmail?: string;
  onReprocessado?: (novaCorrecaoId: string) => void;
}

const COMPETENCIAS = [
  { key: "c1", num: "1" },
  { key: "c2", num: "2" },
  { key: "c3", num: "3" },
  { key: "c4", num: "4" },
  { key: "c5", num: "5" },
];

const NOTA_COLOR = (nota: number, max = 200) => {
  const pct = nota / max;
  if (pct >= 0.8) return "text-emerald-700";
  if (pct >= 0.5) return "text-amber-600";
  return "text-red-600";
};

const NOTA_BG = (nota: number, max = 200) => {
  const pct = nota / max;
  if (pct >= 0.8) return "bg-emerald-50 border-emerald-200";
  if (pct >= 0.5) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
};

const TIPO_ERRO_LABELS: Record<string, string> = {
  // C1 — norma-padrão
  ortografia: "Ortografia",
  acentuacao: "Acentuação",
  pontuacao: "Pontuação",
  concordancia: "Concordância",
  regencia: "Regência",
  crase: "Crase",
  pronome: "Pronome",
  verbal: "Verbal",
  sintatico: "Sintático",
  vocabulario: "Vocabulário",
  // C4 — coesão
  conectivo_inadequado: "Conectivo inadequado",
  ausencia_de_conectivo: "Ausência de conectivo",
  ausencia_de_elo: "Ausência de elo interparagrafal",
  repeticao: "Repetição de conectivos",
  ambiguidade_referencial: "Ambiguidade referencial",
  retomada_incorreta: "Retomada incorreta",
  articulacao_fragil: "Articulação frágil",
};

function formatarTipoErro(tipo: string): string {
  if (!tipo) return tipo;
  const sep = tipo.indexOf(" — ");
  if (sep === -1) return TIPO_ERRO_LABELS[tipo] ?? tipo;
  const prefix = tipo.slice(0, sep);
  const rawSuffix = tipo.slice(sep + 3);
  const label = TIPO_ERRO_LABELS[rawSuffix] ?? rawSuffix;
  return `${prefix} — ${label}`;
}

function inferirCompetencia(tipo: string): string {
  if (["coesão", "coerência"].includes(tipo)) return "c4";
  return "c1";
}

// Renderiza texto com parágrafos separados por \n\n como blocos distintos
const TextoParagrafado = ({ texto, className = "text-sm leading-relaxed text-zinc-700" }: { texto: string; className?: string }) => {
  const paragrafos = texto.split(/\n\n+/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  if (paragrafos.length > 1) {
    return (
      <div className="space-y-2">
        {paragrafos.map((p, i) => <p key={i} className={className}>{p}</p>)}
      </div>
    );
  }
  return <p className={className}>{texto}</p>;
};

export const DetalhesCorrecao = ({ correcao, professorEmail, onReprocessado }: Props) => {
  const { link: correcaoLink, isLoading: linkLoading, criarLink, desativarLink, buildUrl } =
    useJarvisCorrecaoLink(correcao.id);

  const handleBaixarPdf = () => {
    try {
      generateJarvisCorrecaoPDF(correcao);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar PDF.");
    }
  };

  const handleCopiarLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildUrl(token));
      toast.success("Link copiado com sucesso.");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente: " + buildUrl(token));
    }
  };

  // Normaliza correcao_ia: se resposta_bruta contém JSON estruturado (pipeline legado),
  // extrai os campos para usar a renderização pedagógica normal.
  const correcaoIA = (() => {
    const raw = correcao.correcao_ia;
    if (!raw) return null;
    if (raw.resposta_bruta && typeof raw.resposta_bruta === "string") {
      // Tenta extrair JSON estruturado do resposta_bruta
      const extrairJson = (s: string): object | null => {
        let text = s.trim();
        // Remove markdown fences
        if (text.startsWith("```")) {
          const nl = text.indexOf("\n");
          if (nl !== -1) {
            text = text.slice(nl + 1).trim();
            const lf = text.lastIndexOf("```");
            if (lf !== -1) text = text.slice(0, lf).trim();
          }
        }
        if (text.startsWith("{")) {
          try {
            const p = JSON.parse(text);
            if (p && typeof p === "object" && !Array.isArray(p)) return p;
          } catch {
            // Tenta extração por chaves
            const fb = text.indexOf("{"), lb = text.lastIndexOf("}");
            if (fb !== -1 && lb > fb) {
              try {
                const p = JSON.parse(text.slice(fb, lb + 1));
                if (p && typeof p === "object" && !Array.isArray(p)) return p;
              } catch {}
            }
          }
        }
        return null;
      };
      const parsed = extrairJson(raw.resposta_bruta);
      if (parsed) return parsed;
    }
    return raw;
  })();
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>("c1");
  const [showTexto, setShowTexto] = useState(false);
  const [showRevisaoDialog, setShowRevisaoDialog] = useState(false);
  const [observacaoRevisao, setObservacaoRevisao] = useState("");

  const queryClient = useQueryClient();
  const reprocessar = useReprocessarCorrecao(professorEmail || "");
  const { data: versoes } = useJarvisCorrecaoVersoes(correcao.grupo_id ?? null);

  const [transcricaoEditada, setTranscricaoEditada] = useState(
    correcao.transcricao_ocr_original ?? ""
  );

  // Sincroniza o estado local quando a prop correcao.id mudar (ex: dialog reaproveitado)
  const correcaoIdRef = useRef(correcao.id);
  if (correcaoIdRef.current !== correcao.id) {
    correcaoIdRef.current = correcao.id;
    setTranscricaoEditada(correcao.transcricao_ocr_original ?? "");
  }

  const transcricaoTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { isRecording, isSupported, toggleRecording, stopRecording } = useVoiceTranscription(
    setTranscricaoEditada,
    transcricaoEditada,
    transcricaoTextareaRef
  );

  // Bug fix #1: a transcrição é passada como variável explícita para não depender de closure
  const confirmarOcr = useMutation({
    mutationFn: async (transcricao: string) => {
      const usarV5 = queryClient.getQueryData<boolean>(["jarvis-config-pipeline-v5"]) === true;
      const functionName = usarV5 ? "jarvis-correcao-processar-v5" : "jarvis-correcao-processar";
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: {
          correcaoId: correcao.id,
          transcricaoConfirmada: transcricao,
          professorEmail: professorEmail ?? "",
        },
      });
      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-correcoes"] });
      queryClient.invalidateQueries({ queryKey: ["professor-creditos"] });
      toast.success(`Correção em andamento! Créditos restantes: ${result.creditos_restantes}`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao enviar para correção: ${err.message}`);
    },
  });

  const podeRevisar = !!professorEmail && correcao.status === "corrigida";
  const temVersoes = (versoes?.length ?? 0) > 1;

  const textoOriginal = correcao.transcricao_confirmada || correcao.transcricao_ocr_original;
  const competenciaAtiva = secaoAtiva && secaoAtiva !== "nota_final" ? secaoAtiva : null;

  const handleSolicitarRevisao = () => {
    const justificativa = observacaoRevisao.trim();
    setShowRevisaoDialog(false);
    setObservacaoRevisao("");
    // Atualiza cache otimisticamente para badge mudar imediatamente
    queryClient.setQueryData<JarvisCorrecao[]>(
      ["jarvis-correcoes", professorEmail],
      (old) => old?.map((c) =>
        c.id === correcao.id ? { ...c, status: "em_revisao" as const } : c
      )
    );
    // Fecha o dialog imediatamente para que o badge fique visível na tabela
    onReprocessado?.(correcao.id);
    // Dispara edge function em background — invalidateQueries roda no onSuccess do hook
    reprocessar.mutateAsync({
      correcaoId: correcao.id,
      observacao: justificativa || undefined,
    }).catch((error: any) => {
      toast.error(`Erro ao solicitar revisão: ${error.message}`);
    });
  };

  // Tela de revisão OCR — aluno/professor revisa a transcrição antes de enviar para correção
  if (correcao.status === "revisao_ocr") {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Revise a transcrição feita pelo Jarvis. Corrija qualquer erro de leitura e clique em{" "}
            <strong>Confirmar e enviar para correção</strong>.
          </AlertDescription>
        </Alert>
        <div className="rounded-xl border border-[#dcc8f5] bg-[#fbf8ff] px-4 py-3">
          <p className="text-base font-black text-[#4B0082]">{correcao.autor_nome}</p>
          <p className="mt-0.5 text-sm font-medium text-[#78668e]">{correcao.tema}</p>
        </div>
        <div className="relative">
          <Textarea
            ref={transcricaoTextareaRef}
            rows={22}
            className="font-mono text-sm pr-12"
            value={transcricaoEditada}
            onChange={(e) => setTranscricaoEditada(e.target.value)}
            placeholder="Transcrição OCR aparecerá aqui... ou clique no microfone para ditar."
          />
          {isSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? "Parar ditado" : "Ditar por voz (pt-BR)"}
              className={`absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                isRecording
                  ? "bg-red-500 text-white shadow-md animate-pulse"
                  : "bg-[#4B0082]/10 text-[#4B0082] hover:bg-[#4B0082]/20"
              }`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
        {isRecording && (
          <p className="text-xs text-red-500 flex items-center gap-1.5 -mt-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            Ouvindo... Fale a transcrição da redação.
          </p>
        )}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              stopRecording();
              const textoParaEnviar = transcricaoEditada.trim();
              if (!textoParaEnviar) return;
              // Bug fix #3: atualiza status imediatamente no cache para a badge refletir corretamente
              queryClient.setQueryData<JarvisCorrecao[]>(
                ["jarvis-correcoes", professorEmail],
                (old) => old?.map((c) =>
                  c.id === correcao.id ? { ...c, status: "aguardando_correcao" as const } : c
                )
              );
              onReprocessado?.(correcao.id);
              confirmarOcr.mutate(textoParaEnviar);
            }}
            disabled={confirmarOcr.isPending || !transcricaoEditada.trim()}
          >
            {confirmarOcr.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar e enviar para correção
          </Button>
        </div>
      </div>
    );
  }

  if (correcao.status !== "corrigida" || !correcaoIA) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {correcao.status === "erro"
            ? `Erro ao processar: ${correcao.erro_mensagem}`
            : "Esta redação ainda não foi corrigida."}
        </AlertDescription>
      </Alert>
    );
  }

  // Modo texto bruto — exibe como documento markdown simples
  if (correcaoIA.resposta_bruta) {
    return (
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-zinc-900">{correcao.autor_nome}</h3>
            <p className="text-sm font-medium text-zinc-600">{correcao.tema}</p>
            {correcao.corrigida_em && (
              <p className="text-xs text-zinc-400">
                Corrigida em{" "}
                {format(new Date(correcao.corrigida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {correcao.tipo_correcao === "recorrecao" && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    <RefreshCw className="h-2.5 w-2.5" />
                    Revisão #{correcao.numero_versao ?? ""}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {podeRevisar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevisaoDialog(true)}
                className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-900"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Solicitar recorreção
              </Button>
            )}
            {textoOriginal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTexto((v) => !v)}
                className="shrink-0 gap-1.5 text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                Texto da redação
                {showTexto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>

        <BotoesCompartilhamento
          correcao={correcao}
          link={correcaoLink}
          linkLoading={linkLoading}
          onBaixarPdf={handleBaixarPdf}
          onCriarLink={() => criarLink.mutate(correcao.professor_id)}
          onCopiarLink={handleCopiarLink}
          onDesativarLink={() => correcaoLink && desativarLink.mutate(correcaoLink.id)}
          criandoLink={criarLink.isPending}
          desativandoLink={desativarLink.isPending}
          buildUrl={buildUrl}
        />

        {textoOriginal && showTexto && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Texto da redação</p>
            <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">{textoOriginal}</p>
          </div>
        )}

        {/* Correção em texto corrido */}
        <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-6">
          {(() => {
            const bruta = String(correcaoIA.resposta_bruta ?? "");
            const pareceJson = bruta.trimStart().startsWith("{") && bruta.trimEnd().endsWith("}");
            if (pareceJson) {
              return (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-zinc-600 max-w-sm">
                    A correção foi processada, mas não pôde ser exibida no formato pedagógico.
                    Use <strong>Solicitar recorreção</strong> para tentar novamente.
                  </p>
                </div>
              );
            }
            return (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{bruta}</p>
            );
          })()}
        </div>

        {/* Dialog: Solicitação de revisão da correção */}
        <Dialog open={showRevisaoDialog} onOpenChange={setShowRevisaoDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-violet-600" />
                Solicitação de revisão da correção
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wide">
                  Justificativa
                </label>
                <Textarea
                  value={observacaoRevisao}
                  onChange={(e) => setObservacaoRevisao(e.target.value)}
                  className="min-h-[110px] text-sm resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowRevisaoDialog(false); setObservacaoRevisao(""); }}>
                Cancelar
              </Button>
              <Button onClick={handleSolicitarRevisao} className="bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white hover:brightness-105">
                <RefreshCw className="h-4 w-4 mr-2" />
                Solicitar revisão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const notasComp: Record<string, number> = {
    c1: correcao.nota_c1 ?? correcaoIA.competencias?.c1?.nota ?? 0,
    c2: correcao.nota_c2 ?? correcaoIA.competencias?.c2?.nota ?? 0,
    c3: correcao.nota_c3 ?? correcaoIA.competencias?.c3?.nota ?? 0,
    c4: correcao.nota_c4 ?? correcaoIA.competencias?.c4?.nota ?? 0,
    c5: correcao.nota_c5 ?? correcaoIA.competencias?.c5?.nota ?? 0,
  };

  const compIA = competenciaAtiva ? correcaoIA.competencias?.[competenciaAtiva] : null;
  const estrutura = correcaoIA.estrutura;
  const erros: any[] = correcaoIA.erros || [];

  const errosComClassificacao = erros.filter((e: any) => !!e.competencia_relacionada);
  const usaClassificacaoPorComp = errosComClassificacao.length === erros.length && erros.length > 0;

  const getErrosDaComp = (comp: string): any[] => {
    if (usaClassificacaoPorComp) return erros.filter((e: any) => e.competencia_relacionada === comp);
    return erros.filter((e: any) => inferirCompetencia(e.tipo ?? "") === comp);
  };

  const COMP_LABELS_ORIENTACOES: Record<string, string> = {
    geral: "Orientações Gerais", c1: "Competência 1", c2: "Competência 2",
    c3: "Competência 3", c4: "Competência 4", c5: "Competência 5",
  };
  const COMP_ORDER = ["geral", "c1", "c2", "c3", "c4", "c5"];

  const orientacoesAgrupadas: Array<{ label: string; items: string[] }> =
    correcaoIA.orientacoes_selecionadas
      ? COMP_ORDER
          .filter((k) => (correcaoIA.orientacoes_selecionadas[k] ?? []).length > 0)
          .map((k) => ({ label: COMP_LABELS_ORIENTACOES[k], items: correcaoIA.orientacoes_selecionadas[k] }))
      : [];

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <h3 className="text-xl font-black text-zinc-900">{correcao.autor_nome}</h3>
          <p className="text-sm font-medium text-zinc-600">{correcao.tema}</p>
          {correcao.corrigida_em && (
            <p className="text-xs text-zinc-400">
              Corrigida em{" "}
              {format(new Date(correcao.corrigida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {correcao.tipo_correcao === "recorrecao" && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  <RefreshCw className="h-2.5 w-2.5" />
                  Revisão #{correcao.numero_versao ?? ""}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {podeRevisar && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevisaoDialog(true)}
              className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Solicitar recorreção
            </Button>
          )}
          {textoOriginal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTexto((v) => !v)}
              className="shrink-0 gap-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              Texto da redação
              {showTexto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      <BotoesCompartilhamento
        correcao={correcao}
        link={correcaoLink}
        linkLoading={linkLoading}
        onBaixarPdf={handleBaixarPdf}
        onCriarLink={() => criarLink.mutate(correcao.professor_id)}
        onCopiarLink={handleCopiarLink}
        onDesativarLink={() => correcaoLink && desativarLink.mutate(correcaoLink.id)}
        criandoLink={criarLink.isPending}
        desativandoLink={desativarLink.isPending}
        buildUrl={buildUrl}
      />

      {/* Texto original da redação */}
      {textoOriginal && showTexto && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Texto da redação</p>
          <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">{textoOriginal}</p>
        </div>
      )}

      {/* Nota final + Cards de competência */}
      <div className="grid grid-cols-6 gap-2">
        <button
          type="button"
          onClick={() => setSecaoAtiva(secaoAtiva === "nota_final" ? null : "nota_final")}
          className={`flex flex-col items-center justify-center rounded-2xl py-3 transition ${
            secaoAtiva === "nota_final"
              ? "bg-gradient-to-b from-[#4B0082] to-[#7c2fd9] text-white shadow-[0_4px_14px_rgba(75,0,130,0.30)]"
              : "bg-gradient-to-b from-[#6B3294] to-[#9a3fe8] text-white opacity-80 hover:opacity-100"
          }`}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-75 sm:text-[10px]">Nota Final</p>
          <p className="mt-0.5 text-xl font-black leading-none sm:text-3xl">{correcao.nota_total}</p>
          <p className="mt-1 text-[9px] opacity-60 sm:text-[10px]">/1000</p>
        </button>

        {COMPETENCIAS.map((comp) => {
          const nota = notasComp[comp.key] ?? 0;
          const isAtiva = secaoAtiva === comp.key;
          return (
            <button
              key={comp.key}
              type="button"
              onClick={() => setSecaoAtiva(isAtiva ? null : comp.key)}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-3 transition ${
                isAtiva
                  ? "border-[#4B0082] bg-[#efe4ff] shadow-[0_4px_14px_rgba(75,0,130,0.14)]"
                  : `${NOTA_BG(nota)} hover:shadow-sm`
              }`}
            >
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-500 sm:text-[10px]">
                C{comp.num}
              </span>
              <span className={`text-lg font-black leading-none sm:text-2xl ${isAtiva ? "text-[#4B0082]" : NOTA_COLOR(nota)}`}>
                {nota}
              </span>
              <span className="text-[9px] font-medium text-zinc-400 sm:text-[10px]">/200</span>
            </button>
          );
        })}
      </div>

      {/* Detalhe da competência selecionada */}
      {competenciaAtiva && compIA && (
        <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">
          {compIA.justificativa && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">Comentário</p>
              <TextoParagrafado texto={compIA.justificativa} />
            </div>
          )}

          {competenciaAtiva === "c1" && (() => {
            const errosDaComp = getErrosDaComp("c1");
            if (!errosDaComp.length) return null;
            return <ErrosBlock erros={errosDaComp} />;
          })()}

          {competenciaAtiva === "c2" && (
            <div className="space-y-3">
              {estrutura?.estrutura_dissertativo_argumentativa && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {estrutura.estrutura_dissertativo_argumentativa.status === "completa"
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />}
                    <p className="text-xs font-bold text-zinc-500">
                      Estrutura dissertativo-argumentativa
                      <span className="ml-2 font-normal text-zinc-400">
                        ({estrutura.estrutura_dissertativo_argumentativa.status})
                      </span>
                    </p>
                  </div>
                  <TextoParagrafado texto={estrutura.estrutura_dissertativo_argumentativa.descricao} />
                </div>
              )}
              {estrutura?.tese_identificada && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {estrutura.possui_tese
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />}
                    <p className="text-xs font-bold text-zinc-500">Tese identificada</p>
                  </div>
                  <p className="text-sm italic text-zinc-700">"{estrutura.tese_identificada}"</p>
                </div>
              )}
              {estrutura?.uso_repertorio && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <p className="mb-1 text-xs font-bold text-zinc-500">Uso de Repertório</p>
                  <TextoParagrafado texto={estrutura.uso_repertorio} />
                </div>
              )}
              {(() => {
                const errosDaComp = getErrosDaComp("c2");
                if (!errosDaComp.length) return null;
                return <ErrosBlock erros={errosDaComp} />;
              })()}
            </div>
          )}

          {competenciaAtiva === "c3" && (
            <div className="space-y-3">
              {estrutura?.argumentos?.length > 0 && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <p className="mb-2 text-xs font-bold text-zinc-500">Argumentos identificados</p>
                  <ul className="space-y-1.5">
                    {estrutura.argumentos.map((arg: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#4B0082] opacity-60" />
                        {arg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(() => {
                const errosDaComp = getErrosDaComp("c3");
                if (!errosDaComp.length) return null;
                return <ErrosBlock erros={errosDaComp} />;
              })()}
            </div>
          )}

          {competenciaAtiva === "c4" && (() => {
            const errosDaComp = getErrosDaComp("c4");
            if (!errosDaComp.length) return null;
            return <ErrosBlock erros={errosDaComp} />;
          })()}

          {competenciaAtiva === "c5" && estrutura?.proposta_intervencao && (
            <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
              <p className="mb-1 text-xs font-bold text-zinc-500">Elementos da Proposta</p>
              <TextoParagrafado texto={estrutura.proposta_intervencao} />
            </div>
          )}

          {compIA.sugestoes && compIA.sugestoes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Orientações para melhoria
              </p>
              <ul className="space-y-1.5">
                {compIA.sugestoes.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Seção Nota Final */}
      {secaoAtiva === "nota_final" && (
        <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">
          {orientacoesAgrupadas.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Orientações pedagógicas
              </p>
              <div className="space-y-3">
                {orientacoesAgrupadas.map(({ label, items }) => (
                  <div key={label}>
                    <p className="mb-1.5 text-xs font-semibold text-[#4B0082]">{label}</p>
                    <ul className="space-y-1.5">
                      {items.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {orientacoesAgrupadas.length === 0 && correcaoIA.sugestoes_objetivas?.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Orientações gerais de melhoria
              </p>
              <ul className="space-y-2">
                {correcaoIA.sugestoes_objetivas.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {correcaoIA.resumo_geral && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#4B0082]">
                Comentário pedagógico final
              </p>
              <p className="text-sm leading-relaxed text-zinc-700">{correcaoIA.resumo_geral}</p>
            </div>
          )}

          {orientacoesAgrupadas.length === 0 && !correcaoIA.sugestoes_objetivas?.length && !correcaoIA.resumo_geral && (
            <p className="text-sm text-zinc-500">Nenhum comentário geral disponível.</p>
          )}
        </div>
      )}

      {/* Histórico de versões (só aparece quando há 2+ versões) */}
      {temVersoes && (
        <div className="rounded-2xl border border-[#dcc8f5] bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#4B0082]" />
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Versões desta correção ({versoes!.length})
            </p>
          </div>
          <div className="space-y-2">
            {versoes!.map((v) => (
              <div
                key={v.id}
                className={`rounded-xl border px-4 py-3 ${
                  v.is_versao_principal
                    ? "border-[#4B0082] bg-[#fbf8ff]"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    v.is_versao_principal
                      ? "bg-[#4B0082] text-white"
                      : "bg-zinc-200 text-zinc-600"
                  }`}>
                    v{v.numero_versao}
                    {v.is_versao_principal && " — atual"}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    v.tipo_correcao === "recorrecao"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {v.tipo_correcao === "recorrecao" ? "Revisão solicitada" : "Correção original"}
                  </span>
                  {v.nota_total !== null && (
                    <span className="text-xs font-bold text-zinc-700">
                      {v.nota_total} pts
                    </span>
                  )}
                  <span className="ml-auto text-xs text-zinc-400">
                    {v.corrigida_em
                      ? format(new Date(v.corrigida_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "–"}
                  </span>
                </div>

                {/* Notas por competência */}
                {v.nota_total !== null && (
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    {(["c1","c2","c3","c4","c5"] as const).map((c) => {
                      const nota = (v as any)[`nota_${c}`] ?? null;
                      return (
                        <span key={c} className="text-xs text-zinc-500">
                          <span className="font-bold text-zinc-700">{c.toUpperCase()}:</span>{" "}
                          {nota ?? "–"}
                        </span>
                      );
                    })}
                  </div>
                )}

                {v.motivo_recorrecao && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs font-semibold text-zinc-500">Justificativa</p>
                    <p className="text-xs text-zinc-600 italic">"{v.motivo_recorrecao}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: Solicitação de revisão da correção */}
      <Dialog open={showRevisaoDialog} onOpenChange={setShowRevisaoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-violet-600" />
              Solicitação de revisão da correção
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-600 uppercase tracking-wide">
                Justificativa
              </label>
              <Textarea
                value={observacaoRevisao}
                onChange={(e) => setObservacaoRevisao(e.target.value)}
                className="min-h-[110px] text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowRevisaoDialog(false); setObservacaoRevisao(""); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSolicitarRevisao}
              className="bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white hover:brightness-105"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Solicitar revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
interface BotoesCompartilhamentoProps {
  correcao: JarvisCorrecao;
  link: JarvisCorrecaoLink | null | undefined;
  linkLoading: boolean;
  onBaixarPdf: () => void;
  onCriarLink: () => void;
  onCopiarLink: (token: string) => void;
  onDesativarLink: () => void;
  criandoLink: boolean;
  desativandoLink: boolean;
  buildUrl: (token: string) => string;
}

function BotoesCompartilhamento({
  correcao,
  link,
  linkLoading,
  onBaixarPdf,
  onCriarLink,
  onCopiarLink,
  onDesativarLink,
  criandoLink,
  desativandoLink,
  buildUrl,
}: BotoesCompartilhamentoProps) {
  if (correcao.status !== "corrigida") return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      {/* Baixar PDF */}
      <Button
        variant="outline"
        size="sm"
        onClick={onBaixarPdf}
        className="shrink-0 gap-1.5 text-xs border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
      >
        <Download className="h-3.5 w-3.5" />
        Baixar correção
      </Button>

      {/* Botões de compartilhamento */}
      {linkLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      ) : link ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopiarLink(link.token)}
            className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-900"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(buildUrl(link.token), "_blank")}
            className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir visualização
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDesativarLink}
            disabled={desativandoLink}
            className="shrink-0 gap-1.5 text-xs text-zinc-400 hover:text-red-600 hover:bg-red-50"
          >
            {desativandoLink
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Unlink className="h-3.5 w-3.5" />}
            Desativar link
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onCriarLink}
          disabled={criandoLink}
          className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-900"
        >
          {criandoLink
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Share2 className="h-3.5 w-3.5" />}
          Compartilhar correção
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function ErrosBlock({ erros }: { erros: any[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
        Erros identificados ({erros.length})
      </p>
      <div className="space-y-2">
        {erros.map((erro: any, i: number) => (
          <div key={i} className="rounded-xl border-l-4 border-red-400 bg-white pl-4 pr-3 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-red-700">{formatarTipoErro(erro.tipo) || `Erro ${i + 1}`}</p>
              {erro.paragrafo && (
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5">
                  {erro.paragrafo}
                </span>
              )}
            </div>
            {erro.trecho_original && (
              <p className="mt-1 text-xs italic text-zinc-500">"{erro.trecho_original}"</p>
            )}
            {erro.descricao && <p className="mt-1 text-sm text-zinc-700">{erro.descricao}</p>}
            {erro.sugestao && (
              <p className="mt-1.5 text-xs font-medium text-emerald-700">✓ {erro.sugestao}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
