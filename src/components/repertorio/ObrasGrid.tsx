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
import { ObraCard } from "./ObraCard";
import { ObraNovaForm } from "./ObraNovaForm";
import { useRepertorioObras, NovaObraInput, TIPOS_OBRA, TipoObra } from "@/hooks/useRepertorioObras";
import { EIXOS_TEMATICOS, EixoTematico, getEixoColors } from "@/utils/eixoTematicoCores";
import { cn } from "@/lib/utils";

interface ObrasGridProps {
  usuarioAtualId?: string;
  usuarioNome?: string;
  usuarioTurma?: string | null;
  isAdmin?: boolean;
  podePublicar?: boolean;
  podeCurtir?: boolean;
  podeComentarFlag?: boolean;
}

// Ícones para tipos de obra
const getTipoObraIcon = (tipo: TipoObra): string => {
  switch (tipo) {
    case 'Livro': return '📚';
    case 'Filme': return '🎬';
    case 'Série': return '📺';
    case 'Documentário': return '🎥';
    case 'Peça teatral': return '🎭';
    case 'Música': return '🎵';
    case 'Podcast': return '🎙️';
    default: return '🎨';
  }
};

export const ObrasGrid = ({
  usuarioAtualId,
  usuarioNome,
  usuarioTurma,
  isAdmin = false,
  podePublicar = true,
  podeCurtir = true,
  podeComentarFlag = true,
}: ObrasGridProps) => {
  const [showNovaObraModal, setShowNovaObraModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEixo, setFiltroEixo] = useState<string>("todos");

  const {
    obras,
    isLoading,
    getCurtidasResumo,
    getComentariosObra,
    criarObra,
    editarObra,
    excluirObra,
    toggleCurtida,
    adicionarComentario,
    editarComentario,
    excluirComentario,
    refetchObras,
    isCriando,
    isCurtindo,
    isComentando,
  } = useRepertorioObras();

  // Filtrar obras por tipo e eixo
  const obrasFiltradas = useMemo(() => {
    let resultado = obras;
    if (filtroTipo !== "todos") {
      resultado = resultado.filter((o) => o.tipo_obra === filtroTipo);
    }
    if (filtroEixo !== "todos") {
      resultado = resultado.filter((o) => o.eixo_tematico === filtroEixo);
    }
    return resultado;
  }, [obras, filtroTipo, filtroEixo]);

  // Contar obras por tipo
  const contagemPorTipo = useMemo(() => {
    const contagem: Record<string, number> = {};
    obras.forEach((o) => {
      contagem[o.tipo_obra] = (contagem[o.tipo_obra] || 0) + 1;
    });
    return contagem;
  }, [obras]);

  // Contar obras por eixo
  const contagemPorEixo = useMemo(() => {
    const contagem: Record<string, number> = {};
    obras.forEach((o) => {
      contagem[o.eixo_tematico] = (contagem[o.eixo_tematico] || 0) + 1;
    });
    return contagem;
  }, [obras]);

  // Handlers
  const handleNovaObra = async (
    tipo_obra: TipoObra,
    titulo: string,
    criador: string,
    sinopse: string,
    eixo_tematico: EixoTematico
  ) => {
    if (!usuarioAtualId || !usuarioNome) {
      console.error("Usuário não identificado");
      return;
    }

    await criarObra({
      autor_id: usuarioAtualId,
      autor_nome: usuarioNome,
      autor_turma: usuarioTurma || null,
      tipo_obra,
      titulo,
      criador,
      sinopse,
      eixo_tematico,
    });

    setShowNovaObraModal(false);
  };

  const handleCurtir = async (obraId: string) => {
    if (!usuarioAtualId) return;
    await toggleCurtida(obraId, usuarioAtualId);
  };

  const handleEditar = async (
    id: string,
    tipo_obra: TipoObra,
    titulo: string,
    criador: string,
    sinopse: string,
    eixo_tematico: EixoTematico
  ) => {
    await editarObra(id, tipo_obra, titulo, criador, sinopse, eixo_tematico);
  };

  const handleAdicionarComentario = async (obraId: string, comentario: string) => {
    if (!usuarioAtualId || !usuarioNome) return;
    await adicionarComentario(obraId, usuarioAtualId, usuarioNome, comentario);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com filtros e ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {/* Filtro por tipo */}
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo de obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_OBRA.map((tipo) => {
                const count = contagemPorTipo[tipo] || 0;
                return (
                  <SelectItem key={tipo} value={tipo}>
                    <div className="flex items-center gap-2">
                      <span>{getTipoObraIcon(tipo)}</span>
                      {tipo}
                      {count > 0 && (
                        <span className="text-xs text-muted-foreground">({count})</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Filtro por eixo */}
          <Select value={filtroEixo} onValueChange={setFiltroEixo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Eixo temático" />
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
            {obrasFiltradas.length} {obrasFiltradas.length === 1 ? "obra" : "obras"}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchObras()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          {podePublicar && (
            <Button onClick={() => setShowNovaObraModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Obra
            </Button>
          )}
        </div>
      </div>

      {/* Badges de tipos (resumo visual) */}
      {Object.keys(contagemPorTipo).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TIPOS_OBRA.filter(tipo => contagemPorTipo[tipo]).map((tipo) => {
            const isSelected = filtroTipo === tipo;
            return (
              <Badge
                key={tipo}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all gap-1",
                  isSelected && "ring-2 ring-offset-1 ring-purple-500"
                )}
                onClick={() => setFiltroTipo(isSelected ? "todos" : tipo)}
              >
                {getTipoObraIcon(tipo)} {tipo}: {contagemPorTipo[tipo]}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Grid de obras */}
      {obrasFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="space-y-3 p-0">
            <p className="text-lg font-medium text-gray-900">
              Nenhuma obra encontrada
            </p>
            <p className="text-muted-foreground">
              {filtroTipo !== "todos" || filtroEixo !== "todos"
                ? "Tente mudar os filtros para ver mais obras."
                : "Seja o primeiro a compartilhar uma obra cultural!"}
            </p>
            {podePublicar && filtroTipo === "todos" && filtroEixo === "todos" && (
              <Button className="mt-4" onClick={() => setShowNovaObraModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeira Obra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {obrasFiltradas.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              curtidasResumo={getCurtidasResumo(obra.id, usuarioAtualId)}
              comentarios={getComentariosObra(obra.id)}
              usuarioAtualId={usuarioAtualId}
              usuarioNome={usuarioNome}
              isAdmin={isAdmin}
              podeCurtir={podeCurtir}
              podeComentarFlag={podeComentarFlag}
              onCurtir={handleCurtir}
              onEditar={handleEditar}
              onExcluir={excluirObra}
              onAdicionarComentario={handleAdicionarComentario}
              onEditarComentario={editarComentario}
              onExcluirComentario={excluirComentario}
              isCurtindo={isCurtindo}
              isComentando={isComentando}
            />
          ))}
        </div>
      )}

      {/* Modal de nova obra */}
      <ObraNovaForm
        open={showNovaObraModal}
        onOpenChange={setShowNovaObraModal}
        onSubmit={handleNovaObra}
        isSubmitting={isCriando}
      />
    </div>
  );
};
