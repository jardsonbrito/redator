import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useGuiaTematico, GuiaTematico } from '@/hooks/useGuiaTematico';
import { getGuiaCoverUrl } from '@/utils/guiaTematicoImageUtils';
import { MoreVertical, Pencil, Trash2, Eye, EyeOff, GraduationCap, Map, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ==================== CARD INDIVIDUAL ====================

function GuiaTematicoAdminCard({
  guia,
  onEditar,
  onExcluir,
  onToggleAtivo,
}: {
  guia: GuiaTematico;
  onEditar: (guia: GuiaTematico) => void;
  onExcluir: (guia: GuiaTematico) => void;
  onToggleAtivo: (guia: GuiaTematico) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Imagem de capa */}
      <div className="relative w-full h-40 overflow-hidden bg-purple-50">
        <img
          src={getGuiaCoverUrl(guia)}
          alt={`Capa: ${guia.frase_tematica}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
          }}
        />

        {/* Badge inativo */}
        {!guia.ativo && (
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-white/90 text-gray-500 border-gray-300 text-xs">
              Inativo
            </Badge>
          </div>
        )}

        {/* Menu três pontinhos */}
        <div className="absolute top-2 right-2">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 shadow-lg border border-gray-200"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {/* Ver como aluno — navigate direto, sem setTimeout */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  sessionStorage.removeItem(`guia_step_${guia.id}`);
                  navigate(`/guia-tematico/${guia.id}`);
                }}
                className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Ver como aluno
              </DropdownMenuItem>

              {/* Editar — abre Dialog, usa setTimeout */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  setTimeout(() => onEditar(guia), 100);
                }}
                className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>

              {/* Toggle ativo — sem dialog, sem setTimeout */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  onToggleAtivo(guia);
                }}
                className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {guia.ativo ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>

              {/* Excluir — seta estado no pai (AlertDialog fora do dropdown) */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  setTimeout(() => onExcluir(guia), 100);
                }}
                className="flex items-center cursor-pointer text-red-600 hover:bg-red-50 focus:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Map className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">
            Guia Temático
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900 line-clamp-3 leading-snug">
          {guia.frase_tematica}
        </p>
      </div>
    </div>
  );
}

// ==================== GRID PRINCIPAL ====================

interface GuiaTematicoGridProps {
  onEditar: (guia: GuiaTematico) => void;
  onNovo?: () => void;
}

export function GuiaTematicoGrid({ onEditar, onNovo }: GuiaTematicoGridProps) {
  const { todosGuias, isLoadingAdmin, excluirGuia, toggleAtivo } = useGuiaTematico();
  const [confirmExcluir, setConfirmExcluir] = useState<GuiaTematico | null>(null);

  const handleToggleAtivo = (guia: GuiaTematico) => {
    toggleAtivo(guia.id, !guia.ativo);
  };

  const handleExcluir = async () => {
    if (!confirmExcluir) return;
    await excluirGuia(confirmExcluir.id);
    setConfirmExcluir(null);
  };

  if (isLoadingAdmin) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (todosGuias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
        <Map className="w-12 h-12 opacity-30 text-purple-400" />
        <div className="space-y-1">
          <p className="font-semibold text-gray-700">Nenhum guia cadastrado ainda</p>
          <p className="text-sm text-gray-400">
            Crie o primeiro Guia Temático da plataforma.
          </p>
        </div>
        {onNovo && (
          <Button onClick={onNovo} className="gap-2 mt-2">
            <Plus className="h-4 w-4" />
            Criar primeiro guia
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {todosGuias.map((guia) => (
          <GuiaTematicoAdminCard
            key={guia.id}
            guia={guia}
            onEditar={onEditar}
            onExcluir={setConfirmExcluir}
            onToggleAtivo={handleToggleAtivo}
          />
        ))}
      </div>

      {/* AlertDialog de exclusão — FORA do DropdownMenu */}
      <AlertDialog
        open={!!confirmExcluir}
        onOpenChange={(open) => !open && setConfirmExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir guia?</AlertDialogTitle>
            <AlertDialogDescription>
              O guia <strong>"{confirmExcluir?.frase_tematica}"</strong> será permanentemente removido.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
