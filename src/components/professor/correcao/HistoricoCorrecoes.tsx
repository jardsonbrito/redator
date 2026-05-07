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
  Eye,
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
    return <Badge className="bg-amber-500 text-white animate-pulse">Em recorreção...</Badge>;
  }
  if (correcao.status === "corrigida" && correcao.tipo_correcao === "recorrecao") {
    return (
      <Badge className="bg-indigo-500 text-white">
        Revisada{correcao.numero_versao > 1 ? ` v${correcao.numero_versao}` : ""}
      </Badge>
    );
  }
  switch (correcao.status) {
    case "corrigida":
      return <Badge className="bg-emerald-500 text-white">Corrigida</Badge>;
    case "revisao_ocr":
      return <Badge className="bg-orange-500 text-white">Aguardando Revisão</Badge>;
    case "aguardando_correcao":
      return <Badge variant="outline">Aguardando Correção</Badge>;
    case "erro":
      return <Badge variant="destructive">Erro</Badge>;
    default:
      return <Badge variant="outline">{correcao.status}</Badge>;
  }
};

const notaColor = (nota: number | null) => {
  if (nota === null) return "text-slate-400";
  if (nota >= 800) return "text-emerald-400";
  if (nota >= 500) return "text-amber-400";
  return "text-red-400";
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const HistoricoCorrecoes = ({
  professorEmail,
  autoOpenCorrecaoId,
  onAutoOpenCleared,
}: Props) => {
  const queryClient = useQueryClient();
  const { correcoes, turmas, isLoading, deletarCorrecao, deletarPorAluno, processarCorrecao } =
    useJarvisCorrecao(professorEmail);

  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");

  const [showDetalhes, setShowDetalhes] = useState(false);
  const [correcaoSelecionada, setCorrecaoSelecionada] = useState<JarvisCorrecao | null>(null);

  const [dialog, setDialog] = useState<DialogState>(null);
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

    return Array.from(map.values()).sort((a, b) =>
      a.turmaNome.localeCompare(b.turmaNome)
    );
  }, [correcoesFiltradas, turmas]);

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
      <div className="space-y-6">
        {/* ── Filtros ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno..."
              value={filtroAluno}
              onChange={(e) => setFiltroAluno(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>

          <Select value={filtroTurma} onValueChange={setFiltroTurma}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todas as turmas" />
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
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos os status" />
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
        </div>

        {/* ── Grid de pastas ─────────────────────────────────────────────────── */}
        {pastasPorTurma.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FolderOpen className="h-10 w-10 text-slate-300" />
            <p className="text-sm">
              {correcoes?.length === 0
                ? "Nenhuma correção enviada ainda"
                : "Nenhuma correção encontrada com os filtros aplicados"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10 pt-4">
            {pastasPorTurma.map((pasta) => (
              <PastaCard
                key={pasta.turmaId ?? "__sem_turma__"}
                pasta={pasta}
                onChipClick={abrirStudentModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal do aluno ────────────────────────────────────────────────────── */}
      <Dialog open={!!studentModal} onOpenChange={(open) => { if (!open) setStudentModal(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-violet-500 shrink-0" />
              {studentModal?.autorNome}
            </DialogTitle>
            <DialogDescription>
              {studentModal?.turmaNome} ·{" "}
              <span className="font-medium text-foreground">
                {studentModalCorrecoes.length}
              </span>{" "}
              redação(ões)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-100px)]">
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
        <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Correção pedagógica detalhada
              </DialogTitle>
            </DialogHeader>
            <DetalhesCorrecao
              correcao={correcaoSelecionada}
              professorEmail={professorEmail}
              onReprocessado={() => setShowDetalhes(false)}
            />
          </DialogContent>
        </Dialog>
      )}

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

// ─── PastaCard — folder visual de uma turma ───────────────────────────────────

const PastaCard = ({
  pasta,
  onChipClick,
}: {
  pasta: PastaTurma;
  onChipClick: (autorNome: string, turmaId: string | null, turmaNome: string) => void;
}) => {
  const alunos = Array.from(pasta.alunos.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="relative pt-7">
      {/* Aba da pasta */}
      <div className="absolute top-0 left-0 z-10 px-4 py-1.5 bg-amber-400 rounded-t-lg">
        <span className="text-xs font-extrabold text-amber-900 uppercase tracking-widest">
          {pasta.turmaNome}
        </span>
      </div>

      {/* Corpo da pasta */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-b-xl rounded-tr-xl min-h-[80px] p-4">
        {alunos.length === 0 ? (
          <p className="text-slate-500 text-xs">Nenhum aluno</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {alunos.map(([nome, corrs]) => (
              <button
                key={nome}
                onClick={() => onChipClick(nome, pasta.turmaId, pasta.turmaNome)}
                className="group flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 transition-colors rounded-full pl-3 pr-2 py-1.5 text-sm text-slate-100"
              >
                <span className="font-medium leading-none">{nome}</span>
                <span className="flex items-center justify-center bg-amber-400 group-hover:bg-amber-300 text-amber-900 font-bold text-xs rounded-full w-5 h-5 leading-none shrink-0">
                  {corrs.length}
                </span>
              </button>
            ))}
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
    <div className="border rounded-xl p-4 bg-white space-y-2 shadow-sm">
      {/* Linha superior: tema + nota + status + 3 pontos */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 leading-snug line-clamp-2">
            {correcao.tema}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(correcao.criado_em), "dd/MM/yy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Nota */}
          <span
            className={`text-xl font-black leading-none ${notaColor(correcao.nota_total)}`}
          >
            {correcao.nota_total !== null ? correcao.nota_total : "—"}
          </span>

          {/* Status */}
          {getStatusBadge(correcao)}

          {/* 3 pontos */}
          <DropdownMenu
            open={openDropdownId === correcao.id}
            onOpenChange={(open) => setOpenDropdownId(open ? correcao.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <MoreVertical className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem
                onClick={() => {
                  setOpenDropdownId(null);
                  onVerDetalhes(correcao);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>

              {podeReenviar && (
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
              )}

              <DropdownMenuSeparator />

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

      {/* Preview do texto */}
      {textoPreview && (
        <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2 leading-relaxed">
          {textoPreview}
        </p>
      )}
    </div>
  );
};
