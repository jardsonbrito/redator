import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Power, Trash } from "lucide-react";

interface AdminActionsProps {
  exercicio: any;
  onEdit?: (exercicio: any) => void;
  onToggleActive?: (exercicio: any) => void;
  onDelete?: (exercicio: any) => void;
  variant?: 'desktop' | 'mobile';
}

export function AdminActions({ 
  exercicio, 
  onEdit, 
  onToggleActive, 
  onDelete, 
  variant = 'desktop' 
}: AdminActionsProps) {
  const isGoogleForms = exercicio?.tipo?.toLowerCase()?.includes('google') || false;
  const hasFormUrl = Boolean(exercicio?.link_forms);

  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-1">
        {isGoogleForms && hasFormUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(exercicio.link_forms, "_blank", "noopener")}
            title="Abrir formulário"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}

        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(exercicio)}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}

        {onToggleActive && (
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 text-xs"
            onClick={() => onToggleActive(exercicio)}
          >
            {exercicio.ativo ? 'Desativar' : 'Ativar'}
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(exercicio)}
            title="Excluir"
          >
            <Trash className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  // Mobile variant
  return (
    <div className="flex flex-wrap gap-2">
      {isGoogleForms && hasFormUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(exercicio.link_forms, "_blank", "noopener")}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Ver Forms
        </Button>
      )}

      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(exercicio)}
        >
          <Edit className="w-3 h-3 mr-1" />
          Editar
        </Button>
      )}

      {onToggleActive && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleActive(exercicio)}
        >
          <Power className="w-3 h-3 mr-1" />
          {exercicio.ativo ? 'Desativar' : 'Ativar'}
        </Button>
      )}

      {onDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(exercicio)}
        >
          <Trash className="w-3 h-3 mr-1" />
          Excluir
        </Button>
      )}
    </div>
  );
}