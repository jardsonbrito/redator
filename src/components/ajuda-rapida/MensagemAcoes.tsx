import { useState } from 'react';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MensagemAcoesProps {
  onEditar: () => void;
  onApagar: () => void;
}

export const MensagemAcoes = ({ onEditar, onApagar }: MensagemAcoesProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-32">
        <DropdownMenuItem
          onClick={() => {
            onEditar();
            setOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <Edit className="h-3 w-3" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onApagar();
            setOpen(false);
          }}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Apagar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};