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
import { useRepertorioLaboratorio, LaboratorioAula } from '@/hooks/useRepertorioLaboratorio';
import { getEixoColors } from '@/utils/eixoTematicoCores';
import { MoreVertical, Pencil, Trash2, Eye, EyeOff, Plus, User } from 'lucide-react';

const TIPO_PARAGRAFO_MAP: Record<string, { label: string; className: string }> = {
  introducao:    { label: 'Introdutório',   className: 'bg-blue-600 text-white' },
  argumentativo: { label: 'Argumentativo',  className: 'bg-purple-600 text-white' },
  conclusao:     { label: 'Conclusão',      className: 'bg-green-600 text-white' },
};

function TipoParagrafoTag({ tipo }: { tipo: string }) {
  const info = TIPO_PARAGRAFO_MAP[tipo] ?? { label: tipo, className: 'bg-gray-600 text-white' };
  return (
    <span className={`absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${info.className}`}>
      {info.label}
    </span>
  );
}
import { Skeleton } from '@/components/ui/skeleton';

interface LaboratorioTableProps {
  onEditar: (aula: LaboratorioAula) => void;
  onNova?: () => void;
}

// Card individual com dropdown de ações — padrão TemaCard
function LaboratorioAdminCard({
  aula,
  onEditar,
  onExcluir,
  onToggleAtivo,
}: {
  aula: LaboratorioAula;
  onEditar: (aula: LaboratorioAula) => void;
  onExcluir: (aula: LaboratorioAula) => void;
  onToggleAtivo: (aula: LaboratorioAula) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Imagem do autor */}
      <div className="aspect-square w-full bg-purple-50 overflow-hidden relative">
        {aula.imagem_autor_url ? (
          <img
            src={aula.imagem_autor_url}
            alt={`Foto de ${aula.nome_autor}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center">
              <User className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        )}

        {/* Badge de status sobreposto */}
        {!aula.ativo && (
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-white/90 text-gray-500 border-gray-300 text-xs">
              Inativa
            </Badge>
          </div>
        )}

        {/* Tag tipo de parágrafo */}
        {aula.tipo_paragrafo && <TipoParagrafoTag tipo={aula.tipo_paragrafo} />}

        {/* Menu 3-pontinhos sobreposto no canto superior direito */}
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
              {/* Editar — abre Dialog, precisa fechar dropdown antes com setTimeout */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  setTimeout(() => onEditar(aula), 100);
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
                  onToggleAtivo(aula);
                }}
                className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {aula.ativo ? (
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

              {/* Excluir — abre AlertDialog, precisa fechar dropdown antes com setTimeout */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  setTimeout(() => onExcluir(aula), 100);
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
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">{aula.titulo}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {aula.subtitulo}
          </p>
        </div>

        {aula.eixos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {aula.eixos.slice(0, 3).map((eixo) => {
              const colors = getEixoColors(eixo);
              return (
                <Badge
                  key={eixo}
                  variant="outline"
                  className={`${colors.bg} ${colors.text} ${colors.border} text-xs px-2 py-0.5`}
                >
                  {eixo}
                </Badge>
              );
            })}
            {aula.eixos.length > 3 && (
              <span className="text-xs text-gray-400">+{aula.eixos.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente principal
export function LaboratorioTable({ onEditar, onNova }: LaboratorioTableProps) {
  const { todasAulas, isLoadingAdmin, toggleAtivo, excluirAula } = useRepertorioLaboratorio();

  const [confirmExcluir, setConfirmExcluir] = useState<LaboratorioAula | null>(null);

  const handleToggleAtivo = (aula: LaboratorioAula) => {
    toggleAtivo(aula.id, !aula.ativo);
  };

  const handleExcluir = async () => {
    if (!confirmExcluir) return;
    await excluirAula(confirmExcluir.id);
    setConfirmExcluir(null);
  };

  if (isLoadingAdmin) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (todasAulas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
        <img
          src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
          alt=""
          className="w-14 h-14 rounded-xl opacity-60"
        />
        <div className="space-y-1">
          <p className="font-semibold text-gray-700">Você ainda não criou nenhuma aula</p>
          <p className="text-sm text-gray-400">
            Comece criando a primeira aula do Laboratório de Repertório.
          </p>
        </div>
        {onNova && (
          <Button onClick={onNova} className="gap-2 mt-2">
            <Plus className="h-4 w-4" />
            Criar primeira aula
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {todasAulas.map((aula) => (
          <LaboratorioAdminCard
            key={aula.id}
            aula={aula}
            onEditar={onEditar}
            onExcluir={setConfirmExcluir}
            onToggleAtivo={handleToggleAtivo}
          />
        ))}
      </div>

      {/* AlertDialog de exclusão — FORA do DropdownMenu para evitar conflito de focus trap */}
      <AlertDialog
        open={!!confirmExcluir}
        onOpenChange={(open) => !open && setConfirmExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
            <AlertDialogDescription>
              A aula <strong>"{confirmExcluir?.titulo}"</strong> será permanentemente removida,
              incluindo a imagem do autor. Esta ação não pode ser desfeita.
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
