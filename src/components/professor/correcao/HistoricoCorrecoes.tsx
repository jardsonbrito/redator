import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useJarvisCorrecao, JarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Search,
  Trash2,
  UserX,
  MoreVertical,
  RefreshCw,
  User,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalhesCorrecao } from "./DetalhesCorrecao";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  professorEmail: string;
  autoOpenCorrecaoId?: string | null;
  onAutoOpenCleared?: () => void;
}

type DialogState =
  | { tipo: "individual"; correcao: JarvisCorrecao }
  | { tipo: "aluno"; autorNome: string }
  | null;

type StudentModal = {
  autorNome: string;
  turmaId: string | null;
  turmaNome: string;
} | null;

interface PastaTurma {
  turmaId: string | null;
  turmaNome: string;
  alunos: Map<string, JarvisCorrecao[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusBadge = (correcao: JarvisCorrecao) => {
  if (correcao.status === "em_revisao") {
    return (
      <Badge className="bg-amber-500 text-white animate-pulse text-xs font-semibold">
        Em recorreção...
      </Badge>
    );
  }
  if (correcao.status === "corrigida" && correcao.tipo_correcao === "recorrecao") {
    return (
      <Badge className="bg-indigo-500 text-white text-xs font-semibold">
        Revisada{correcao.numero_versao > 1 ? ` v${correcao.numero_versao}` : ""}
      </Badge>
    );
  }
  switch (correcao.status) {
    case "corrigida":
      return (
        <Badge className="bg-emerald-500 text-white text-xs font-semibold">Corrigida</Badge>
      );
    case "revisao_ocr":
      return (
        <Badge className="bg-orange-500 text-white text-xs font-semibold">
          Aguardando Revisão
        </Badge>
      );
    case "aguardando_correcao":
      return (
        <Badge className="bg-sky-100 text-sky-700 border border-sky-200 text-xs font-medium">
          Aguardando Correção
        </Badge>
      );
    case "erro":
      return <Badge variant="destructive" className="text-xs">Erro</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{correcao.status}</Badge>;
  }
};

const notaColor = (nota: number | null) => {
  if (nota === null) return "text-[#9c7dc0]";
  if (nota >= 800) return "text-emerald-600";
  if (nota >= 500) return "text-amber-600";
  return "text-red-500";
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const HistoricoCorrecoes = ({
  professorEmail,
  autoOpenCorrecaoId,
  onAutoOpenCleared,
}: Props) => {
  const queryClient = useQueryClient();
  const { correcoes, turmas, isLoading, deletarCorrecao, deletarPorAluno, processarCorrecao, deletarTurma } =
    useJarvisCorrecao(professorEmail);

  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");

  const [showDetalhes, setShowDetalhes] = useState(false);
  const [correcaoSelecionada, setCorrecaoSelecionada] = useState<JarvisCorrecao | null>(null);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogTurma, setDialogTurma] = useState<{ turmaId: string; turmaNome: string } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [studentModal, setStudentModal] = useState<StudentModal>(null);

  // Correções do aluno selecionado (todas, sem filtro de status/aluno)
  const studentModalCorrecoes = useMemo(() => {
    if (!studentModal || !correcoes) return [];
    return correcoes.filter(
      (c) =>
        c.autor_nome === studentModal.autorNome && c.turma_id === studentModal.turmaId
    );
  }, [correcoes, studentModal]);

  // Fecha o modal quando não há mais correções para o aluno
  useEffect(() => {
    if (studentModal && studentModalCorrecoes.length === 0) {
      setStudentModal(null);
    }
  }, [studentModal, studentModalCorrecoes.length]);

  // Auto-abre o dialog de revisão OCR quando a correção detectada aparece na lista
  useEffect(() => {
    if (!autoOpenCorrecaoId || !correcoes) return;
    const correcao = correcoes.find((c) => c.id === autoOpenCorrecaoId);
    if (correcao) {
      setCorrecaoSelecionada(correcao);
      setShowDetalhes(true);
      onAutoOpenCleared?.();
    }
  }, [correcoes, autoOpenCorrecaoId, onAutoOpenCleared]);

  // Correções filtradas (para o grid de pastas)
  const correcoesFiltradas = useMemo(() => {
    if (!correcoes) return [];
    return correcoes.filter((c) => {
      if (filtroAluno && !c.autor_nome.toLowerCase().includes(filtroAluno.toLowerCase()))
        return false;
      if (filtroTurma !== "all" && c.turma_id !== filtroTurma) return false;
      if (filtroStatus !== "all" && c.status !== filtroStatus) return false;
      return true;
    });
  }, [correcoes, filtroAluno, filtroTurma, filtroStatus]);

  // Agrupa por turma, depois por aluno
  const pastasPorTurma = useMemo<PastaTurma[]>(() => {
    const map = new Map<string, PastaTurma>();

    correcoesFiltradas.forEach((c) => {
      const key = c.turma_id ?? "__sem_turma__";
      if (!map.has(key)) {
        const turmaObj = turmas?.find((t: any) => t.id === c.turma_id);
        map.set(key, {
          turmaId: c.turma_id,
          turmaNome: turmaObj?.nome ?? "Sem turma",
          alunos: new Map(),
        });
      }
      const pasta = map.get(key)!;
      if (!pasta.alunos.has(c.autor_nome)) {
        pasta.alunos.set(c.autor_nome, []);
      }
      pasta.alunos.get(c.autor_nome)!.push(c);
    });

    // Inclui turmas sem nenhuma correção (permitem deleção direta do Histórico)
    turmas?.forEach((turma: any) => {
      if (!map.has(turma.id)) {
        const temCorrecao = correcoes?.some((c) => c.turma_id === turma.id);
        if (!temCorrecao) {
          map.set(turma.id, {
            turmaId: turma.id,
            turmaNome: turma.nome,
            alunos: new Map(),
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.turmaNome.localeCompare(b.turmaNome)
    );
  }, [correcoesFiltradas, turmas, correcoes]);

  const handleVisualizar = (correcao: JarvisCorrecao) => {
    setCorrecaoSelecionada(correcao);
    setShowDetalhes(true);
  };

  const abrirStudentModal = (autorNome: string, turmaId: string | null, turmaNome: string) => {
    setStudentModal({ autorNome, turmaId, turmaNome });
  };

  const confirmarDelecao = async () => {
    if (!dialog) return;
    if (dialog.tipo === "individual") {
      await deletarCorrecao.mutateAsync(dialog.correcao.id);
    } else {
      await deletarPorAluno.mutateAsync(dialog.autorNome);
    }
    setDialog(null);
  };

  const isPending = deletarCorrecao.isPending || deletarPorAluno.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* ── Barra de filtros compacta ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] px-4 py-3 shadow-[0_4px_12px_rgba(75,0,130,0.06)]">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9c7dc0]" />
            <Input
              placeholder="Buscar aluno..."
              value={filtroAluno}
              onChange={(e) => setFiltroAluno(e.target.value)}
              className="pl-9 h-8 text-sm bg-white border-[#dcc8f5] text-[#4f3a68] placeholder:text-[#9c7dc0] focus-visible:ring-[#4B0082]/30"
            />
          </div>

          <Select value={filtroTurma} onValueChange={setFiltroTurma}>
            <SelectTrigger className="h-8 w-auto min-w-32 text-sm bg-white border-[#dcc8f5] text-[#4f3a68]">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas?.map((turma: any) => (
                <SelectItem key={turma.id} value={turma.id}>
                  {turma.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-8 w-auto min-w-32 text-sm bg-white border-[#dcc8f5] text-[#4f3a68]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="corrigida">Corrigida</SelectItem>
              <SelectItem value="em_revisao">Em revisão</SelectItem>
              <SelectItem value="revisao_ocr">Aguardando Revisão OCR</SelectItem>
              <SelectItem value="aguardando_correcao">Aguardando Correção</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>

          {(filtroAluno || filtroTurma !== "all" || filtroStatus !== "all") && (
            <button
              onClick={() => { setFiltroAluno(""); setFiltroTurma("all"); setFiltroStatus("all"); }}
              className="text-xs text-[#4B0082] hover:underline font-medium shrink-0"
            >
              Limpar
            </button>
          )}
        </div>

        {/* ── Grid de pastas ─────────────────────────────────────────────────── */}
        {pastasPorTurma.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#9c7dc0]">
            <FolderOpen className="h-10 w-10 text-[#dcc8f5]" />
            <p className="text-sm">
              {correcoes?.length === 0
                ? "Nenhuma correção enviada ainda"
                : "Nenhuma correção encontrada com os filtros aplicados"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10 pt-2">
            {pastasPorTurma.map((pasta) => {
              const temCorrecao = correcoes?.some((c) => c.turma_id === pasta.turmaId) ?? false;
              return (
                <PastaCard
                  key={pasta.turmaId ?? "__sem_turma__"}
                  pasta={pasta}
                  canDelete={!!pasta.turmaId && !temCorrecao}
                  onChipClick={abrirStudentModal}
                  onDeletarTurma={() =>
                    setDialogTurma({ turmaId: pasta.turmaId!, turmaNome: pasta.turmaNome })
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal do aluno ────────────────────────────────────────────────────── */}
      <Dialog open={!!studentModal} onOpenChange={(open) => { if (!open) setStudentModal(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-[#dcc8f5] bg-[#fbf8ff]">
            <DialogTitle className="flex items-center gap-2 text-base text-[#4B0082]">
              <User className="h-4 w-4 shrink-0" />
              {studentModal?.autorNome}
            </DialogTitle>
            <DialogDescription className="text-[#9c7dc0]">
              {studentModal?.turmaNome} ·{" "}
              <span className="font-semibold text-[#4f3a68]">
                {studentModalCorrecoes.length}
              </span>{" "}
              redação(ões)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-100px)] bg-white">
            <div className="px-6 py-4 space-y-3">
              {studentModalCorrecoes.map((correcao) => (
                <CorrecaoCard
                  key={correcao.id}
                  correcao={correcao}
                  professorEmail={professorEmail}
                  queryClient={queryClient}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  processarCorrecao={processarCorrecao}
                  onVerDetalhes={handleVisualizar}
                  onRemoverIndividual={(c) => {
                    setOpenDropdownId(null);
                    setTimeout(() => setDialog({ tipo: "individual", correcao: c }), 100);
                  }}
                  onRemoverTodas={(nome) => {
                    setOpenDropdownId(null);
                    setTimeout(() => setDialog({ tipo: "aluno", autorNome: nome }), 100);
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhes da Correção ──────────────────────────────────────── */}
      {correcaoSelecionada && (
        <Dialog
          open={showDetalhes}
          onOpenChange={(open) => {
            // Não permite fechar o dialog enquanto aguarda revisão OCR
            if (!open && correcaoSelecionada.status === "revisao_ocr") return;
            setShowDetalhes(open);
          }}
        >
          <DialogContent
            className="max-w-6xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => {
              if (correcaoSelecionada.status === "revisao_ocr") e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (correcaoSelecionada.status === "revisao_ocr") e.preventDefault();
            }}
          >
            {correcaoSelecionada.status !== "revisao_ocr" && (
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Correção pedagógica detalhada
                </DialogTitle>
              </DialogHeader>
            )}
            <DetalhesCorrecao
              key={correcaoSelecionada.id}
              correcao={correcaoSelecionada}
              professorEmail={professorEmail}
              onReprocessado={() => setShowDetalhes(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── AlertDialog: Confirmação de exclusão de turma ────────────────────── */}
      <AlertDialog
        open={!!dialogTurma}
        onOpenChange={(open) => { if (!open) setDialogTurma(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma "{dialogTurma?.turmaNome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma será removida permanentemente da sua lista. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletarTurma.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletarTurma.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!dialogTurma) return;
                await deletarTurma.mutateAsync(dialogTurma.turmaId);
                setDialogTurma(null);
              }}
            >
              {deletarTurma.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Confirmação de deleção ───────────────────────────────── */}
      <AlertDialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.tipo === "individual" && "Remover correção?"}
              {dialog?.tipo === "aluno" &&
                `Remover todas as correções de ${dialog?.autorNome}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.tipo === "individual" && (
                <>
                  A correção de <strong>{dialog.correcao.autor_nome}</strong> —{" "}
                  <em>{dialog.correcao.tema}</em> será removida permanentemente.
                </>
              )}
              {dialog?.tipo === "aluno" && (
                <>
                  Todas as correções de <strong>{dialog.autorNome}</strong> serão
                  removidas permanentemente. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelecao}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Helper: cor dominante do chip baseada no status das correções ────────────

const getChipStyle = (correcoes: JarvisCorrecao[]) => {
  const ss = correcoes.map((c) => c.status);
  // Prioridade: erro > revisao_ocr (ação humana urgente) > em_revisao > aguardando_correcao > corrigida
  if (ss.includes("erro"))
    return {
      badge:  "bg-red-500 text-white",
      border: "border-red-200",
      hover:  "hover:bg-red-50 hover:border-red-300",
    };
  if (ss.includes("revisao_ocr"))
    return {
      badge:  "bg-orange-500 text-white",
      border: "border-orange-200",
      hover:  "hover:bg-orange-50 hover:border-orange-300",
    };
  if (ss.includes("em_revisao"))
    return {
      badge:  "bg-amber-400 text-white",
      border: "border-amber-200",
      hover:  "hover:bg-amber-50 hover:border-amber-300",
    };
  if (ss.includes("aguardando_correcao"))
    return {
      badge:  "bg-sky-400 text-white",
      border: "border-sky-200",
      hover:  "hover:bg-sky-50 hover:border-sky-300",
    };
  if (ss.every((s) => s === "corrigida"))
    return {
      badge:  "bg-emerald-500 text-white",
      border: "border-emerald-200",
      hover:  "hover:bg-emerald-50 hover:border-emerald-300",
    };
  // Misto (parcialmente corrigida)
  return {
    badge:  "bg-violet-100 text-violet-600",
    border: "border-[#dcc8f5]",
    hover:  "hover:bg-[#ede9fe] hover:border-[#4B0082]/30",
  };
};

// ─── PastaCard — folder visual de uma turma ───────────────────────────────────

const PastaCard = ({
  pasta,
  canDelete,
  onChipClick,
  onDeletarTurma,
}: {
  pasta: PastaTurma;
  canDelete: boolean;
  onChipClick: (autorNome: string, turmaId: string | null, turmaNome: string) => void;
  onDeletarTurma: () => void;
}) => {
  const alunos = Array.from(pasta.alunos.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="relative pt-7">
      {/* Aba da pasta */}
      <div className="absolute top-0 left-0 z-10 flex items-center gap-1.5 pr-2 pl-4 py-1.5 bg-gradient-to-r from-[#4B0082] to-[#8a25d9] rounded-t-lg shadow-sm">
        <span className="text-xs font-extrabold text-white uppercase tracking-widest">
          {pasta.turmaNome}
        </span>
        {canDelete && (
          <button
            type="button"
            title="Excluir turma"
            onClick={onDeletarTurma}
            className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/25 transition-colors"
          >
            <Trash2 className="h-2.5 w-2.5 text-white/80" />
          </button>
        )}
      </div>

      {/* Corpo da pasta */}
      <div className="bg-[#fbf8ff] border border-[#dcc8f5] rounded-b-2xl rounded-tr-2xl min-h-[80px] p-4 shadow-[0_4px_14px_rgba(75,0,130,0.08)]">
        {alunos.length === 0 ? (
          <p className="text-[#9c7dc0] text-xs">Nenhum aluno</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {alunos.map(([nome, corrs]) => {
              const chipStyle = getChipStyle(corrs);
              return (
                <button
                  key={nome}
                  onClick={() => onChipClick(nome, pasta.turmaId, pasta.turmaNome)}
                  className={`flex items-center gap-1.5 bg-white border transition-all rounded-full pl-3 pr-2 py-1.5 text-sm text-[#4f3a68] shadow-sm ${chipStyle.border} ${chipStyle.hover}`}
                >
                  <span className="font-medium leading-none">{nome}</span>
                  <span className={`flex items-center justify-center font-semibold text-[11px] rounded-full w-5 h-5 leading-none shrink-0 ${chipStyle.badge}`}>
                    {corrs.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CorrecaoCard — card de uma redação dentro do modal do aluno ──────────────

interface CorrecaoCardProps {
  correcao: JarvisCorrecao;
  professorEmail: string;
  queryClient: ReturnType<typeof useQueryClient>;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  processarCorrecao: ReturnType<typeof useJarvisCorrecao>["processarCorrecao"];
  onVerDetalhes: (c: JarvisCorrecao) => void;
  onRemoverIndividual: (c: JarvisCorrecao) => void;
  onRemoverTodas: (autorNome: string) => void;
}

const CorrecaoCard = ({
  correcao,
  professorEmail,
  queryClient,
  openDropdownId,
  setOpenDropdownId,
  processarCorrecao,
  onVerDetalhes,
  onRemoverIndividual,
  onRemoverTodas,
}: CorrecaoCardProps) => {
  const textoPreview =
    correcao.transcricao_confirmada || correcao.transcricao_ocr_original || null;

  const podeReenviar =
    correcao.status === "erro" &&
    !!(correcao.transcricao_confirmada || correcao.transcricao_ocr_original);

  return (
    // Bug fix #6/#8: card inteiro clicável, cursor pointer, hover sutil
    <div
      className="border border-[#dcc8f5] rounded-xl bg-white shadow-[0_2px_8px_rgba(75,0,130,0.06)] cursor-pointer hover:border-[#4B0082]/40 hover:shadow-[0_4px_14px_rgba(75,0,130,0.12)] transition-all"
      onClick={() => onVerDetalhes(correcao)}
    >
      <div className="p-4 space-y-2.5">
        {/* Linha 1: tema + data + três pontos */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#4f3a68] leading-snug line-clamp-2">
              {correcao.tema}
            </p>
            <p className="text-xs text-[#9c7dc0] mt-0.5">
              {format(new Date(correcao.criado_em), "dd/MM/yy", { locale: ptBR })}
            </p>
          </div>

          {/* Bug fix #7: dropdown para ações secundárias/destrutivas — stopPropagation */}
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu
              open={openDropdownId === correcao.id}
              onOpenChange={(open) => setOpenDropdownId(open ? correcao.id : null)}
            >
              <DropdownMenuTrigger asChild>
                <button className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#ede9fe] transition-colors">
                  <MoreVertical className="h-3.5 w-3.5 text-[#9c7dc0]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                {podeReenviar && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setOpenDropdownId(null);
                        queryClient.setQueryData<JarvisCorrecao[]>(
                          ["jarvis-correcoes", professorEmail],
                          (old) =>
                            old?.map((c) =>
                              c.id === correcao.id
                                ? { ...c, status: "aguardando_correcao" as const, erro_mensagem: null }
                                : c
                            )
                        );
                        processarCorrecao.mutate({
                          correcaoId: correcao.id,
                          transcricaoConfirmada: (correcao.transcricao_confirmada ||
                            correcao.transcricao_ocr_original) as string,
                        });
                      }}
                      disabled={processarCorrecao.isPending}
                    >
                      {processarCorrecao.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reenviar para correção
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemoverIndividual(correcao)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover esta correção
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemoverTodas(correcao.autor_nome)}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Remover todas de {correcao.autor_nome}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bug fix #5: status em destaque + nota ao lado quando corrigida */}
        <div className="flex items-center gap-2">
          {getStatusBadge(correcao)}
          {correcao.nota_total !== null && (
            <span className={`text-base font-black leading-none ${notaColor(correcao.nota_total)}`}>
              {correcao.nota_total}
              <span className="text-[10px] font-normal text-[#9c7dc0] ml-0.5">pts</span>
            </span>
          )}
        </div>

        {/* Preview do texto */}
        {textoPreview && (
          <p className="text-xs text-[#9c7dc0] line-clamp-2 border-t border-[#ede9fe] pt-2 leading-relaxed">
            {textoPreview}
          </p>
        )}
      </div>
    </div>
  );
};
