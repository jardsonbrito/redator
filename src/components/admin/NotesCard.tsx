import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-lg border-2',
        colorClass,
        note.fixado && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Pin indicator */}
      {note.fixado && (
        <div className="absolute top-2 left-2">
          <Pin className="w-4 h-4 text-primary fill-primary" />
        </div>
      )}

      {/* Menu dropdown */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <CardContent className={cn('p-4', note.fixado && 'pt-6')}>
        {/* Título */}
        <h3
          className="font-semibold text-lg mb-2 pr-8 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => onEdit(note)}
        >
          {note.titulo}
        </h3>

        {/* Conteúdo */}
        {note.conteudo && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-4 whitespace-pre-wrap">
            {note.conteudo}
          </p>
        )}

        {/* Imagens preview */}
        {hasImages && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <ImageIcon className="w-3 h-3" />
              <span>{note.imagens.length} {note.imagens.length === 1 ? 'imagem' : 'imagens'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {note.imagens.slice(0, 3).map((img, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                  <img
                    src={img.url}
                    alt={img.nome}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {note.imagens.length > 3 && (
                <div className="aspect-square flex items-center justify-center bg-muted rounded-md text-xs text-muted-foreground">
                  +{note.imagens.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links */}
        {hasLinks && (
          <div className="mb-3 space-y-1">
            {note.links.slice(0, 2).map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline truncate"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{link.titulo || link.url}</span>
              </a>
            ))}
            {note.links.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{note.links.length - 2} {note.links.length - 2 === 1 ? 'link' : 'links'}
              </span>
            )}
          </div>
        )}

        {/* Tags e Categoria */}
        <div className="flex flex-wrap gap-2 mb-3">
          {note.categoria && (
            <Badge variant="secondary" className="text-xs">
              {note.categoria}
            </Badge>
          )}
          {note.tags && note.tags.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {note.tags && note.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground mt-auto pt-2 border-t">
          Atualizada: {formatDate(note.atualizado_em)}
        </div>
      </CardContent>
    </Card>
  );
};
