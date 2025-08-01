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
          className="h-9 w-8 p-1 bg-purple-200 hover:bg-purple-300 text-purple-800 rounded-xl shadow-sm border-0 opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-32 bg-white z-50">
        <DropdownMenuItem
          onClick={() => {
            onEditar();
            setOpen(false);
          }}
          className="flex items-center gap-2 hover:bg-gray-100"
        >
          <Edit className="h-3 w-3" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onApagar();
            setOpen(false);
          }}
          className="flex items-center gap-2 text-destructive focus:text-destructive hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
          Apagar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};