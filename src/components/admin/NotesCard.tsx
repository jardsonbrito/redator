import React, { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
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
  Download,
  Copy,
  X,
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
  const [showImagesDialog, setShowImagesDialog] = useState(false);
  const [showLinksDialog, setShowLinksDialog] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja deletar esta anotação?')) {
      onDelete(note.id);
    }
  };

  const handleDownloadImage = async (imageUrl: string, imageName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = imageName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download iniciado',
        description: 'A imagem está sendo baixada.',
      });
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar a imagem.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyImageLink = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast({
      title: 'Link copiado!',
      description: 'O link da imagem foi copiado para a área de transferência.',
    });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.',
    });
  };

  const colorClass = getColorClass(note.cor);
  const hasImages = note.imagens && note.imagens.length > 0;
  const hasLinks = note.links && note.links.length > 0;

  // Determinar cor do ícone baseado na cor da nota
  const getIconColor = (cor: string) => {
    const colorMap: Record<string, string> = {
      default: '#9CA3AF',
      yellow: '#F59E0B',
      green: '#10B981',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      pink: '#EC4899',
      red: '#EF4444',
    };
    return colorMap[cor] || '#9CA3AF';
  };

  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-all duration-200 cursor-pointer relative',
        colorClass,
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
            <div
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowImagesDialog(true);
              }}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{note.imagens.length} {note.imagens.length === 1 ? 'imagem' : 'imagens'}</span>
            </div>
          </div>
        )}

        {/* Links preview - chips style */}
        {hasLinks && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowLinksDialog(true);
              }}
            >
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

      {/* Dialog de visualização de imagens */}
      <Dialog open={showImagesDialog} onOpenChange={setShowImagesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Imagens da Anotação</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {note.imagens.map((img, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={img.url}
                    alt={img.nome}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate" title={img.nome}>
                    {img.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(img.tamanho / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownloadImage(img.url, img.nome)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopyImageLink(img.url)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                  </div>
                  <div className="mt-2 p-2 bg-muted rounded text-xs break-all">
                    {img.url}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualização de links */}
      <Dialog open={showLinksDialog} onOpenChange={setShowLinksDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Links da Anotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {note.links.map((link, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">{link.titulo}</h4>
                  {link.descricao && (
                    <p className="text-xs text-muted-foreground">{link.descricao}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(link.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopyLink(link.url)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                </div>
                <div className="p-2 bg-muted rounded text-xs break-all">
                  {link.url}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
