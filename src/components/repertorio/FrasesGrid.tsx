import { useState, useMemo } from "react";
import { Plus, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FraseCard } from "./FraseCard";
import { FraseNovaForm } from "./FraseNovaForm";
import { useRepertorioFrases, NovaFraseInput } from "@/hooks/useRepertorioFrases";
import { EIXOS_TEMATICOS, EixoTematico, getEixoColors } from "@/utils/eixoTematicoCores";
import { cn } from "@/lib/utils";

interface FrasesGridProps {
  usuarioAtualId?: string;
  usuarioNome?: string;
  usuarioTurma?: string | null;
  isAdmin?: boolean;
  podePublicar?: boolean;
  podeCurtir?: boolean;
}

export const FrasesGrid = ({
  usuarioAtualId,
  usuarioNome,
  usuarioTurma,
  isAdmin = false,
  podePublicar = true,
  podeCurtir = true,
}: FrasesGridProps) => {
  const [showNovaFraseModal, setShowNovaFraseModal] = useState(false);
  const [filtroEixo, setFiltroEixo] = useState<string>("todos");

  const {
    frases,
    isLoading,
    getCurtidasResumo,
    criarFrase,
    editarFrase,
    excluirFrase,
    toggleCurtida,
    refetchFrases,
    isCriando,
    isCurtindo,
  } = useRepertorioFrases();

  // Filtrar frases por eixo
  const frasesFiltradas = useMemo(() => {
    if (filtroEixo === "todos") return frases;
    return frases.filter((f) => f.eixo_tematico === filtroEixo);
  }, [frases, filtroEixo]);

  // Contar frases por eixo
  const contagemPorEixo = useMemo(() => {
    const contagem: Record<string, number> = {};
    frases.forEach((f) => {
      contagem[f.eixo_tematico] = (contagem[f.eixo_tematico] || 0) + 1;
    });
    return contagem;
  }, [frases]);

  // Handlers
  const handleNovaFrase = async (frase: string, eixo_tematico: EixoTematico, autoria?: string) => {
    if (!usuarioAtualId || !usuarioNome) {
      console.error("Usuário não identificado");
      return;
    }

    await criarFrase({
      autor_id: usuarioAtualId,
      autor_nome: usuarioNome,
      autor_turma: usuarioTurma || null,
      frase,
      eixo_tematico,
      autoria: autoria || null,
    });

    setShowNovaFraseModal(false);
  };

  const handleCurtir = async (fraseId: string) => {
    if (!usuarioAtualId) return;
    await toggleCurtida(fraseId, usuarioAtualId);
  };

  const handleEditar = async (id: string, frase: string, eixo_tematico: EixoTematico, autoria?: string) => {
    await editarFrase(id, frase, eixo_tematico, autoria);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com filtros e ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtroEixo} onValueChange={setFiltroEixo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por eixo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eixos</SelectItem>
              {EIXOS_TEMATICOS.map((eixo) => {
                const colors = getEixoColors(eixo);
                const count = contagemPorEixo[eixo] || 0;
                return (
                  <SelectItem key={eixo} value={eixo}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", colors.text.replace('text-', 'bg-'))} />
                      {eixo}
                      {count > 0 && (
                        <span className="text-xs text-muted-foreground">({count})</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {frasesFiltradas.length} {frasesFiltradas.length === 1 ? "frase" : "frases"}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchFrases()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          {podePublicar && (
            <Button onClick={() => setShowNovaFraseModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Frase
            </Button>
          )}
        </div>
      </div>

      {/* Badges de eixos (resumo visual) */}
      {Object.keys(contagemPorEixo).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {EIXOS_TEMATICOS.filter(eixo => contagemPorEixo[eixo]).map((eixo) => {
            const colors = getEixoColors(eixo);
            const isSelected = filtroEixo === eixo;
            return (
              <Badge
                key={eixo}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all",
                  colors.bg,
                  colors.text,
                  colors.border,
                  isSelected && "ring-2 ring-offset-1"
                )}
                onClick={() => setFiltroEixo(isSelected ? "todos" : eixo)}
              >
                {eixo}: {contagemPorEixo[eixo]}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Grid de frases */}
      {frasesFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="space-y-3 p-0">
            <p className="text-lg font-medium text-gray-900">
              Nenhuma frase encontrada
            </p>
            <p className="text-muted-foreground">
              {filtroEixo !== "todos"
                ? "Tente mudar o filtro para ver mais frases."
                : "Seja o primeiro a compartilhar uma frase com repertório!"}
            </p>
            {podePublicar && filtroEixo === "todos" && (
              <Button className="mt-4" onClick={() => setShowNovaFraseModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeira Frase
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {frasesFiltradas.map((frase) => (
            <FraseCard
              key={frase.id}
              frase={frase}
              curtidasResumo={getCurtidasResumo(frase.id, usuarioAtualId)}
              usuarioAtualId={usuarioAtualId}
              isAdmin={isAdmin}
              podeCurtir={podeCurtir}
              onCurtir={handleCurtir}
              onEditar={handleEditar}
              onExcluir={excluirFrase}
              isCurtindo={isCurtindo}
            />
          ))}
        </div>
      )}

      {/* Modal de nova frase */}
      <FraseNovaForm
        open={showNovaFraseModal}
        onOpenChange={setShowNovaFraseModal}
        onSubmit={handleNovaFrase}
        isSubmitting={isCriando}
      />
    </div>
  );
};
