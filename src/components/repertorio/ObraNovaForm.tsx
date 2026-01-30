import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { EIXOS_TEMATICOS, EixoTematico, getEixoColors } from "@/utils/eixoTematicoCores";
import { TIPOS_OBRA, TipoObra, getCreatorLabel } from "@/hooks/useRepertorioObras";
import { cn } from "@/lib/utils";

interface ObraNovaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    tipo_obra: TipoObra,
    titulo: string,
    criador: string,
    sinopse: string,
    eixo_tematico: EixoTematico
  ) => void;
  initialData?: {
    tipo_obra: TipoObra;
    titulo: string;
    criador: string;
    sinopse: string;
    eixo_tematico: EixoTematico;
  };
  isEditing?: boolean;
  isSubmitting?: boolean;
}

const MIN_TITULO = 2;
const MAX_TITULO = 200;
const MIN_CRIADOR = 2;
const MAX_CRIADOR = 150;
const MIN_SINOPSE = 50;
const MAX_SINOPSE = 2000;

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

export const ObraNovaForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
  isSubmitting = false,
}: ObraNovaFormProps) => {
  const [tipoObra, setTipoObra] = useState<TipoObra | "">("");
  const [titulo, setTitulo] = useState("");
  const [criador, setCriador] = useState("");
  const [sinopse, setSinopse] = useState("");
  const [eixoTematico, setEixoTematico] = useState<EixoTematico | "">("");

  // Reset form quando abrir/fechar ou mudar initialData
  useEffect(() => {
    if (open) {
      setTipoObra(initialData?.tipo_obra || "");
      setTitulo(initialData?.titulo || "");
      setCriador(initialData?.criador || "");
      setSinopse(initialData?.sinopse || "");
      setEixoTematico(initialData?.eixo_tematico || "");
    }
  }, [open, initialData]);

  const tituloLength = titulo.length;
  const criadorLength = criador.length;
  const sinopseLength = sinopse.length;

  const isTituloValid = tituloLength >= MIN_TITULO && tituloLength <= MAX_TITULO;
  const isCriadorValid = criadorLength >= MIN_CRIADOR && criadorLength <= MAX_CRIADOR;
  const isSinopseValid = sinopseLength >= MIN_SINOPSE && sinopseLength <= MAX_SINOPSE;

  const isValid =
    tipoObra !== "" &&
    isTituloValid &&
    isCriadorValid &&
    isSinopseValid &&
    eixoTematico !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && tipoObra && eixoTematico) {
      onSubmit(
        tipoObra as TipoObra,
        titulo.trim(),
        criador.trim(),
        sinopse.trim(),
        eixoTematico as EixoTematico
      );
    }
  };

  const selectedEixoColors = eixoTematico ? getEixoColors(eixoTematico) : null;
  const creatorLabel = tipoObra ? getCreatorLabel(tipoObra as TipoObra) : "Autor(a) / Criador(a)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Obra" : "Nova Obra (Produto Cultural)"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Obra */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Obra</Label>
            <Select
              value={tipoObra}
              onValueChange={(value) => setTipoObra(value as TipoObra)}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo de obra" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_OBRA.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    <div className="flex items-center gap-2">
                      <span>{getTipoObraIcon(tipo)}</span>
                      {tipo}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título da Obra */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Obra</Label>
            <Input
              id="titulo"
              placeholder="Ex: Vidas Secas, Parasita, Black Mirror..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={MAX_TITULO + 20}
              className={cn(
                !isTituloValid && tituloLength > 0 && "border-red-300 focus:border-red-500"
              )}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {MIN_TITULO}-{MAX_TITULO} caracteres
              </p>
              <p className={cn(
                "text-xs",
                tituloLength < MIN_TITULO && "text-amber-600",
                tituloLength > MAX_TITULO && "text-red-600",
                isTituloValid && "text-green-600"
              )}>
                {tituloLength}/{MAX_TITULO}
              </p>
            </div>
          </div>

          {/* Criador (label dinâmico) */}
          <div className="space-y-2">
            <Label htmlFor="criador">{creatorLabel}</Label>
            <Input
              id="criador"
              placeholder={
                tipoObra === 'Livro' ? "Ex: Graciliano Ramos" :
                tipoObra === 'Filme' ? "Ex: Bong Joon-ho" :
                tipoObra === 'Série' ? "Ex: Charlie Brooker" :
                "Ex: Nome do criador ou responsável"
              }
              value={criador}
              onChange={(e) => setCriador(e.target.value)}
              maxLength={MAX_CRIADOR + 20}
              className={cn(
                !isCriadorValid && criadorLength > 0 && "border-red-300 focus:border-red-500"
              )}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {MIN_CRIADOR}-{MAX_CRIADOR} caracteres
              </p>
              <p className={cn(
                "text-xs",
                criadorLength < MIN_CRIADOR && "text-amber-600",
                criadorLength > MAX_CRIADOR && "text-red-600",
                isCriadorValid && "text-green-600"
              )}>
                {criadorLength}/{MAX_CRIADOR}
              </p>
            </div>
          </div>

          {/* Eixo Temático */}
          <div className="space-y-2">
            <Label htmlFor="eixo">Eixo Temático</Label>
            <Select
              value={eixoTematico}
              onValueChange={(value) => setEixoTematico(value as EixoTematico)}
            >
              <SelectTrigger id="eixo">
                <SelectValue placeholder="Selecione o eixo temático" />
              </SelectTrigger>
              <SelectContent>
                {EIXOS_TEMATICOS.map((eixo) => {
                  const colors = getEixoColors(eixo);
                  return (
                    <SelectItem key={eixo} value={eixo}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", colors.text.replace('text-', 'bg-'))} />
                        {eixo}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Preview do eixo selecionado */}
            {selectedEixoColors && (
              <Badge className={cn("text-xs", selectedEixoColors.bg, selectedEixoColors.text)}>
                {eixoTematico}
              </Badge>
            )}
          </div>

          {/* Sinopse / Apresentação Crítica */}
          <div className="space-y-2">
            <Label htmlFor="sinopse">Sinopse / Apresentação Crítica</Label>
            <Textarea
              id="sinopse"
              placeholder="Descreva a obra abordando: tema central, contexto social/histórico/cultural e potencial de uso como repertório argumentativo em redações..."
              value={sinopse}
              onChange={(e) => setSinopse(e.target.value)}
              className={cn(
                "min-h-[180px] resize-none",
                !isSinopseValid && sinopseLength > 0 && "border-red-300 focus:border-red-500"
              )}
              maxLength={MAX_SINOPSE + 100}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {MIN_SINOPSE}-{MAX_SINOPSE} caracteres
              </p>
              <p className={cn(
                "text-xs",
                sinopseLength < MIN_SINOPSE && "text-amber-600",
                sinopseLength > MAX_SINOPSE && "text-red-600",
                isSinopseValid && "text-green-600"
              )}>
                {sinopseLength}/{MAX_SINOPSE}
              </p>
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Compartilhe obras que podem enriquecer redações.
              Na sinopse, destaque os temas abordados e como a obra pode ser usada
              como repertório sociocultural.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Publicar Obra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
