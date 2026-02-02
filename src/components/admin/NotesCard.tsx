import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pin,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Image as ImageIcon,
  StickyNote,
} from 'lucide-react';
import { AdminNote, getColorClass, formatDate } from '@/types/admin-notes';
import { cn } from '@/lib/utils';

interface NotesCardProps {
  note: AdminNote;
  onEdit: (note: AdminNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (noteId: string, fixado: boolean) => void;
  onToggleArchive: (noteId: string, arquivado: boolean) => void;
}

export const NotesCard: React.FC<NotesCardProps> = ({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
}) => {
  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja deletar esta anotação?')) {
      onDelete(note.id);
    }
  };

  const colorClass = getColorClass(note.cor);
  const hasImages = note.imagens && note.imagens.length > 0;
  const hasLinks = note.links && note.links.length > 0;

  // Determinar cor do ícone baseado na cor da nota
  const getIconColor = (cor: string) => {
    const colorMap: Record<string, string> = {
      default: '#9CA3AF',
      amarelo: '#F59E0B',
      verde: '#10B981',
      azul: '#3B82F6',
      roxo: '#8B5CF6',
      rosa: '#EC4899',
      laranja: '#F97316',
      vermelho: '#EF4444',
    };
    return colorMap[cor] || '#9CA3AF';
  };

  return (
    <Card
      className={cn(
        'border-gray-200 bg-white hover:shadow-lg transition-all duration-200 cursor-pointer relative',
        note.fixado && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={() => onEdit(note)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <div
            className="p-2 rounded-lg shadow-sm"
            style={{
              background: `linear-gradient(to bottom right, ${getIconColor(note.cor)}15, ${getIconColor(note.cor)}25)`
            }}
          >
            <StickyNote size={32} color={getIconColor(note.cor)} fill={getIconColor(note.cor)} opacity={0.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {note.titulo}
            </h3>
          </div>
        </div>

        {/* Menu dropdown */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {note.fixado && (
            <Pin className="w-4 h-4 text-primary fill-primary" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(note)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(note.id, !note.fixado)}>
                <Pin className="mr-2 h-4 w-4" />
                {note.fixado ? 'Desafixar' : 'Fixar'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(note.id, !note.arquivado)}>
                {note.arquivado ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Desarquivar
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Conteúdo preview */}
        {note.conteudo && (
          <div className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
            {note.conteudo}
          </div>
        )}

        {/* Imagens preview - chips style */}
        {hasImages && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <ImageIcon className="w-3 h-3" />
              <span>{note.imagens.length} {note.imagens.length === 1 ? 'imagem' : 'imagens'}</span>
            </div>
          </div>
        )}

        {/* Links preview - chips style */}
        {hasLinks && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              <ExternalLink className="w-3 h-3" />
              <span>{note.links.length} {note.links.length === 1 ? 'link' : 'links'}</span>
            </div>
          </div>
        )}

        {/* Tags e Categoria - chips style */}
        {(note.categoria || (note.tags && note.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1">
            {note.categoria && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                {note.categoria}
              </span>
            )}
            {note.tags && note.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: `${getIconColor(note.cor)}15`,
                  color: getIconColor(note.cor),
                  borderColor: `${getIconColor(note.cor)}30`,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                {tag}
              </span>
            ))}
            {note.tags && note.tags.length > 3 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer com linha separadora */}
        <div className="text-xs text-gray-500 leading-relaxed border-t pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span>Atualizada: {formatDate(note.atualizado_em)}</span>
            {note.arquivado && (
              <Badge variant="outline" className="text-xs">
                Arquivada
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
