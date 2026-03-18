import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { Pencil, Trash2, User, Loader2, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LaboratorioTableProps {
  onEditar: (aula: LaboratorioAula) => void;
  onNova?: () => void;
}

export function LaboratorioTable({ onEditar, onNova }: LaboratorioTableProps) {
  const { todasAulas, isLoadingAdmin, toggleAtivo, excluirAula, isExcluindo } =
    useRepertorioLaboratorio();

  const [confirmExcluir, setConfirmExcluir] = useState<LaboratorioAula | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const handleToggleAtivo = async (aula: LaboratorioAula) => {
    await toggleAtivo(aula.id, !aula.ativo);
  };

  const handleExcluir = async () => {
    if (!confirmExcluir) return;
    setExcluindoId(confirmExcluir.id);
    try {
      await excluirAula(confirmExcluir.id);
    } finally {
      setExcluindoId(null);
      setConfirmExcluir(null);
    }
  };

  if (isLoadingAdmin) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
      <div className="space-y-2">
        {todasAulas.map((aula) => (
          <div
            key={aula.id}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
              aula.ativo ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'
            }`}
          >
            {/* Imagem */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-purple-50 border border-gray-200 shrink-0">
              {aula.imagem_autor_url ? (
                <img
                  src={aula.imagem_autor_url}
                  alt={aula.nome_autor}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-300" />
                </div>
              )}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm truncate">{aula.titulo}</span>
                {!aula.ativo && (
                  <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
                    Inativa
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{aula.subtitulo}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {aula.eixos.slice(0, 3).map((eixo) => {
                  const colors = getEixoColors(eixo);
                  return (
                    <Badge
                      key={eixo}
                      variant="outline"
                      className={`${colors.bg} ${colors.text} ${colors.border} text-[10px] px-1.5 py-0`}
                    >
                      {eixo}
                    </Badge>
                  );
                })}
                {aula.eixos.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{aula.eixos.length - 3}</span>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Toggle ativo */}
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={aula.ativo}
                  onCheckedChange={() => handleToggleAtivo(aula)}
                  className="data-[state=checked]:bg-purple-600"
                />
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {aula.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditar(aula)}
                className="h-8 w-8 text-gray-500 hover:text-blue-600"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setTimeout(() => setConfirmExcluir(aula), 100);
                }}
                className="h-8 w-8 text-gray-500 hover:text-red-600"
                disabled={excluindoId === aula.id}
              >
                {excluindoId === aula.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!confirmExcluir} onOpenChange={(open) => !open && setConfirmExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
            <AlertDialogDescription>
              A aula "<strong>{confirmExcluir?.titulo}</strong>" será permanentemente removida, incluindo a
              imagem do autor. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
