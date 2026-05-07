import { useState, useRef } from "react";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import {
  useAulaPronta,
  type NivelTurma,
  type PlanoAulaParams,
  type QuizParams,
  type QuestaoAbertaParams,
  type ResultadoGeracao,
  type TipoMaterial,
  type EstadoGeracao,
} from "@/hooks/useAulaPronta";
import { StudentHeader } from "@/components/StudentHeader";
import { ProfessorBottomNavigation } from "@/components/professor/ProfessorBottomNavigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, BookOpen, HelpCircle, PenLine, Copy, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { toast } from "sonner";

// ─── Resultado formatado ────────────────────────────────────────────
const ResultadoMaterial = ({
  resultado,
  estado,
  erro,
  onRegen,
}: {
  resultado: ResultadoGeracao | null;
  estado: EstadoGeracao;
  erro: string | null;
  onRegen: () => void;
}) => {
  if (estado === "loading") {
    return (
      <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] py-10 text-[#4B0082]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-semibold">Gerando material com IA…</span>
      </div>
    );
  }

  if (estado === "error" && erro) {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{erro}</span>
      </div>
    );
  }

  if (estado === "success" && resultado) {
    const handleCopy = async () => {
      await navigator.clipboard.writeText(resultado.conteudo);
      toast.success("Material copiado para a área de transferência!");
    };

    return (
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#78668e]">
            1 crédito utilizado · Saldo: {resultado.creditos_restantes}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRegen}
              className="gap-1.5 border-[#dcc8f5] text-[#4B0082] hover:bg-[#efe4ff]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerar
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white hover:brightness-105"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dcc8f5] bg-white p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800">
            {resultado.conteudo}
          </pre>
        </div>
      </div>
    );
  }

  return null;
};

// ─── Plano de Aula ──────────────────────────────────────────────────
const SUGESTOES_ATIVIDADE = [
  "Produção de introdução",
  "Produção de parágrafo argumentativo",
  "Proposta de intervenção",
  "Análise de repertório",
  "Debate oral",
  "Correção coletiva",
];

const MATERIAIS_OPCOES = [
  "Slides",
  "Quadro",
  "Redação-modelo",
  "Texto motivador",
  "Vídeo",
  "Projetor",
  "Atividade impressa",
];

const TIPOS_CONDUCAO = [
  "Exposição dialogada",
  "Análise de texto",
  "Oficina prática",
  "Correção coletiva",
  "Debate orientado",
  "Outro",
];

const PlanoAulaForm = ({
  nivel,
  estado,
  resultado,
  erro,
  onGerar,
  onRegen,
}: {
  nivel: NivelTurma;
  estado: EstadoGeracao;
  resultado: ResultadoGeracao | null;
  erro: string | null;
  onGerar: (p: PlanoAulaParams) => void;
  onRegen: () => void;
}) => {
  const [tema, setTema] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [duracao, setDuracao] = useState<PlanoAulaParams["duracao"]>("60 min");
  const [habilidade, setHabilidade] = useState("");
  const [conducao, setConducao] = useState("Exposição dialogada");
  const [conducaoOutro, setConducaoOutro] = useState("");
  const [atividadeSelecionadas, setAtividadeSelecionadas] = useState<string[]>([]);
  const [atividadeLivre, setAtividadeLivre] = useState("");
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<string[]>([]);
  const [materiaisOutro, setMateriaisOutro] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const currentParams = useRef<PlanoAulaParams | null>(null);

  const toggleSugestao = (s: string) =>
    setAtividadeSelecionadas((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const toggleMaterial = (m: string) =>
    setMateriaisSelecionados((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const handleSubmit = () => {
    if (!tema.trim()) {
      toast.error("Preencha o tema/conteúdo da aula.");
      return;
    }
    const params: PlanoAulaParams = {
      tema: tema.trim(),
      objetivo: objetivo.trim() || undefined,
      duracao,
      habilidade: habilidade.trim() || undefined,
      tipo_conducao: conducao,
      tipo_conducao_outro: conducaoOutro.trim() || undefined,
      atividade_final: atividadeSelecionadas,
      atividade_final_livre: atividadeLivre.trim() || undefined,
      materiais: materiaisSelecionados,
      materiais_outro: materiaisOutro.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    };
    currentParams.current = params;
    onGerar(params);
  };

  const isLoading = estado === "loading";

  return (
    <div className="space-y-5 pt-1">
      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">
          Tema / Conteúdo <span className="text-red-500">*</span>
        </Label>
        <Textarea
          placeholder="Ex: Argumentação por exemplificação — como usar dados estatísticos na C3"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          disabled={isLoading}
          rows={3}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">Objetivo da aula</Label>
        <Input
          placeholder="Ex: O aluno saberá construir um argumento com dado estatístico e fonte"
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          disabled={isLoading}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-semibold text-zinc-700">
            Duração <span className="text-red-500">*</span>
          </Label>
          <Select
            value={duracao}
            onValueChange={(v) => setDuracao(v as PlanoAulaParams["duracao"])}
            disabled={isLoading}
          >
            <SelectTrigger className="border-[#dcc8f5] focus:ring-[#4B0082]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30 min">30 min</SelectItem>
              <SelectItem value="60 min">60 min</SelectItem>
              <SelectItem value="120 min">120 min</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold text-zinc-700">Habilidade a trabalhar</Label>
          <Input
            placeholder="Ex: Tese, repertório, C3, coesão…"
            value={habilidade}
            onChange={(e) => setHabilidade(e.target.value)}
            disabled={isLoading}
            className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">
          Tipo de condução <span className="text-red-500">*</span>
        </Label>
        <Select value={conducao} onValueChange={setConducao} disabled={isLoading}>
          <SelectTrigger className="border-[#dcc8f5] focus:ring-[#4B0082]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_CONDUCAO.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {conducao === "Outro" && (
          <Input
            placeholder="Descreva o tipo de condução…"
            value={conducaoOutro}
            onChange={(e) => setConducaoOutro(e.target.value)}
            disabled={isLoading}
            className="mt-2 border-[#dcc8f5] focus-visible:ring-[#4B0082]"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">Atividade final desejada</Label>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES_ATIVIDADE.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSugestao(s)}
              disabled={isLoading}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                atividadeSelecionadas.includes(s)
                  ? "border-[#4B0082] bg-[#4B0082] text-white"
                  : "border-[#dcc8f5] bg-white text-[#4B0082] hover:bg-[#efe4ff]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Input
          placeholder="Ou descreva livremente…"
          value={atividadeLivre}
          onChange={(e) => setAtividadeLivre(e.target.value)}
          disabled={isLoading}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">Materiais e recursos</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {MATERIAIS_OPCOES.map((m) => (
            <div key={m} className="flex items-center gap-2">
              <Checkbox
                id={`mat-${m}`}
                checked={materiaisSelecionados.includes(m)}
                onCheckedChange={() => toggleMaterial(m)}
                disabled={isLoading}
                className="border-[#dcc8f5] data-[state=checked]:bg-[#4B0082] data-[state=checked]:border-[#4B0082]"
              />
              <Label htmlFor={`mat-${m}`} className="cursor-pointer text-sm text-zinc-700">
                {m}
              </Label>
            </div>
          ))}
        </div>
        <Input
          placeholder="Adicionar outro recurso…"
          value={materiaisOutro}
          onChange={(e) => setMateriaisOutro(e.target.value)}
          disabled={isLoading}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">Observações adicionais</Label>
        <Textarea
          placeholder="Contexto especial, restrições, foco específico…"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          disabled={isLoading}
          rows={2}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white shadow-[0_10px_22px_rgba(124,43,216,0.18)] hover:brightness-105"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Gerando…
          </>
        ) : (
          "Gerar Plano de Aula"
        )}
      </Button>

      <ResultadoMaterial
        resultado={resultado}
        estado={estado}
        erro={erro}
        onRegen={onRegen}
      />
    </div>
  );
};

// ─── Quiz ────────────────────────────────────────────────────────────
const QuizForm = ({
  nivel,
  estado,
  resultado,
  erro,
  onGerar,
  onRegen,
}: {
  nivel: NivelTurma;
  estado: EstadoGeracao;
  resultado: ResultadoGeracao | null;
  erro: string | null;
  onGerar: (p: QuizParams) => void;
  onRegen: () => void;
}) => {
  const [conteudo, setConteudo] = useState("");
  const [qtd, setQtd] = useState(5);
  const [alternativas, setAlternativas] = useState<4 | 5>(5);

  const handleSubmit = () => {
    if (!conteudo.trim()) {
      toast.error("Preencha o conteúdo do quiz.");
      return;
    }
    if (qtd < 1 || qtd > 20) {
      toast.error("Quantidade de questões deve ser entre 1 e 20.");
      return;
    }
    onGerar({ conteudo: conteudo.trim(), quantidade_questoes: qtd, quantidade_alternativas: alternativas });
  };

  const isLoading = estado === "loading";

  return (
    <div className="space-y-5 pt-1">
      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">
          Conteúdo do quiz <span className="text-red-500">*</span>
        </Label>
        <Textarea
          placeholder="Ex: Uso de conectivos de oposição e concessão na coesão textual"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          disabled={isLoading}
          rows={3}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-semibold text-zinc-700">
            Quantidade de questões <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={qtd}
            onChange={(e) => setQtd(Math.max(1, Math.min(20, Number(e.target.value))))}
            disabled={isLoading}
            className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-semibold text-zinc-700">Alternativas por questão</Label>
          <Select
            value={String(alternativas)}
            onValueChange={(v) => setAlternativas(Number(v) as 4 | 5)}
            disabled={isLoading}
          >
            <SelectTrigger className="border-[#dcc8f5] focus:ring-[#4B0082]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 alternativas</SelectItem>
              <SelectItem value="5">5 alternativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white shadow-[0_10px_22px_rgba(124,43,216,0.18)] hover:brightness-105"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Gerando…
          </>
        ) : (
          "Gerar Quiz"
        )}
      </Button>

      <ResultadoMaterial resultado={resultado} estado={estado} erro={erro} onRegen={onRegen} />
    </div>
  );
};

// ─── Questão Aberta ──────────────────────────────────────────────────
const QuestaoAbertaForm = ({
  nivel,
  estado,
  resultado,
  erro,
  onGerar,
  onRegen,
}: {
  nivel: NivelTurma;
  estado: EstadoGeracao;
  resultado: ResultadoGeracao | null;
  erro: string | null;
  onGerar: (p: QuestaoAbertaParams) => void;
  onRegen: () => void;
}) => {
  const [conteudo, setConteudo] = useState("");
  const [qtd, setQtd] = useState(2);

  const handleSubmit = () => {
    if (!conteudo.trim()) {
      toast.error("Preencha o conteúdo da questão.");
      return;
    }
    if (qtd < 1 || qtd > 10) {
      toast.error("Quantidade de questões deve ser entre 1 e 10.");
      return;
    }
    onGerar({ conteudo: conteudo.trim(), quantidade_questoes: qtd });
  };

  const isLoading = estado === "loading";

  return (
    <div className="space-y-5 pt-1">
      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">
          Conteúdo da questão <span className="text-red-500">*</span>
        </Label>
        <Textarea
          placeholder="Ex: Argumento de autoridade e sua aplicação em redações nota 1000"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          disabled={isLoading}
          rows={3}
          className="border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-zinc-700">
          Quantidade de questões <span className="text-red-500">*</span>
        </Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={qtd}
          onChange={(e) => setQtd(Math.max(1, Math.min(10, Number(e.target.value))))}
          disabled={isLoading}
          className="w-40 border-[#dcc8f5] focus-visible:ring-[#4B0082]"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white shadow-[0_10px_22px_rgba(124,43,216,0.18)] hover:brightness-105"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Gerando…
          </>
        ) : (
          "Gerar Questão Aberta"
        )}
      </Button>

      <ResultadoMaterial resultado={resultado} estado={estado} erro={erro} onRegen={onRegen} />
    </div>
  );
};

// ─── Página principal ────────────────────────────────────────────────
export const ProfessorAulasProntas = () => {
  const { professor } = useProfessorAuth();
  const navigate = useNavigate();
  const [nivel, setNivel] = useState<NivelTurma>("Intermediário");
  const [accordionAberto, setAccordionAberto] = useState<string>("");

  const { creditos, creditosLoading, estados, resultados, erros, gerar, regenerar } =
    useAulaPronta(professor?.email || "");

  // Refs para último conjunto de params usado (para regeneração)
  const lastParams = useRef<{
    plano_aula: PlanoAulaParams | null;
    quiz: QuizParams | null;
    questao_aberta: QuestaoAbertaParams | null;
  }>({ plano_aula: null, quiz: null, questao_aberta: null });

  const handleGerar = (tipo: TipoMaterial, params: PlanoAulaParams | QuizParams | QuestaoAbertaParams) => {
    (lastParams.current as any)[tipo] = params;
    gerar(tipo, nivel, params);
  };

  const handleRegen = (tipo: TipoMaterial) => {
    const params = (lastParams.current as any)[tipo];
    if (params) regenerar(tipo, nivel, params);
  };

  if (!professor) return <div className="p-6">Carregando…</div>;

  const niveis: NivelTurma[] = ["Iniciante", "Intermediário", "Avançado"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 pb-24">
      <StudentHeader />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dcc8f5] bg-white text-[#4B0082] hover:bg-[#efe4ff] transition"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d9c5f3]">
              <JarvisIcon size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">Aula Pronta</h1>
              <p className="text-xs text-[#78668e]">Materiais pedagógicos gerados por IA</p>
            </div>
          </div>

          <div className="inline-flex flex-col rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] px-5 py-3 shadow-[0_8px_18px_rgba(75,0,130,0.06)]">
            <span className="text-xs font-bold text-[#4f3a68]">Créditos disponíveis</span>
            <span className="mt-0.5 text-2xl font-black leading-none text-[#4B0082]">
              {creditosLoading ? "–" : creditos ?? 0}
            </span>
          </div>
        </header>

        {/* Seletor de nível */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#78668e]">Nível da turma</p>
          <div className="flex gap-2">
            {niveis.map((n) => (
              <button
                key={n}
                onClick={() => setNivel(n)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                  nivel === n
                    ? "border-[#4B0082] bg-gradient-to-r from-[#4B0082] to-[#8a25d9] text-white shadow-[0_6px_16px_rgba(124,43,216,0.18)]"
                    : "border-[#dcc8f5] bg-white text-[#4B0082] hover:bg-[#efe4ff]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Acordeões */}
        <Accordion
          type="single"
          collapsible
          value={accordionAberto}
          onValueChange={setAccordionAberto}
          className="space-y-3"
        >
          {/* Plano de Aula */}
          <AccordionItem
            value="plano_aula"
            className="overflow-hidden rounded-2xl border border-[#dcc8f5] bg-white shadow-sm"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-[#4B0082]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ede3fa]">
                  <BookOpen className="h-4 w-4 text-[#4B0082]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">Plano de Aula</p>
                  <p className="text-xs text-[#78668e]">Roteiro completo com objetivos, etapas e atividade final</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <PlanoAulaForm
                nivel={nivel}
                estado={estados.plano_aula}
                resultado={resultados.plano_aula}
                erro={erros.plano_aula}
                onGerar={(p) => handleGerar("plano_aula", p)}
                onRegen={() => handleRegen("plano_aula")}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Quiz */}
          <AccordionItem
            value="quiz"
            className="overflow-hidden rounded-2xl border border-[#dcc8f5] bg-white shadow-sm"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-[#4B0082]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ede3fa]">
                  <HelpCircle className="h-4 w-4 text-[#4B0082]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">Quiz</p>
                  <p className="text-xs text-[#78668e]">Questões de múltipla escolha com gabarito</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <QuizForm
                nivel={nivel}
                estado={estados.quiz}
                resultado={resultados.quiz}
                erro={erros.quiz}
                onGerar={(p) => handleGerar("quiz", p)}
                onRegen={() => handleRegen("quiz")}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Questão Aberta */}
          <AccordionItem
            value="questao_aberta"
            className="overflow-hidden rounded-2xl border border-[#dcc8f5] bg-white shadow-sm"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-[#4B0082]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ede3fa]">
                  <PenLine className="h-4 w-4 text-[#4B0082]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">Questão Aberta</p>
                  <p className="text-xs text-[#78668e]">Questões discursivas com gabarito comentado</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <QuestaoAbertaForm
                nivel={nivel}
                estado={estados.questao_aberta}
                resultado={resultados.questao_aberta}
                erro={erros.questao_aberta}
                onGerar={(p) => handleGerar("questao_aberta", p)}
                onRegen={() => handleRegen("questao_aberta")}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <ProfessorBottomNavigation />
    </div>
  );
};

export default ProfessorAulasProntas;
