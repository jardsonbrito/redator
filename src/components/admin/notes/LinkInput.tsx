import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Plus, X, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { NoteLink } from '@/types/admin-notes';

interface LinkInputProps {
  links: NoteLink[];
  onLinksChange: (links: NoteLink[]) => void;
}

export const LinkInput: React.FC<LinkInputProps> = ({ links, onLinksChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [newLink, setNewLink] = useState<NoteLink>({
    url: '',
    titulo: '',
    descricao: '',
  });

  const handleAddLink = () => {
    if (!newLink.url) return;

    // Validar URL
    try {
      new URL(newLink.url);
    } catch {
      // Se não tiver protocolo, adicionar https://
      if (!newLink.url.startsWith('http://') && !newLink.url.startsWith('https://')) {
        newLink.url = 'https://' + newLink.url;
      }
    }

    onLinksChange([...links, newLink]);
    setNewLink({ url: '', titulo: '', descricao: '' });
    setShowForm(false);
  };

  const handleRemoveLink = (index: number) => {
    onLinksChange(links.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setNewLink({ url: '', titulo: '', descricao: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Links {links.length > 0 && `(${links.length})`}</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Adicione links úteis relacionados à sua anotação
        </p>
      </div>

      {/* Lista de links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, idx) => (
            <Card key={idx} className="relative">
              <CardContent className="p-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemoveLink(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="pr-8">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {link.titulo || 'Link sem título'}
                      </p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline truncate block"
                      >
                        {link.url}
                      </a>
                      {link.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {link.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Formulário para adicionar link */}
      {showForm ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                type="text"
                placeholder="https://exemplo.com"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="link-titulo">Título</Label>
              <Input
                id="link-titulo"
                type="text"
                placeholder="Título do link"
                value={newLink.titulo}
                onChange={(e) => setNewLink({ ...newLink, titulo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="link-descricao">Descrição</Label>
              <Textarea
                id="link-descricao"
                placeholder="Descrição opcional"
                value={newLink.descricao}
                onChange={(e) => setNewLink({ ...newLink, descricao: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAddLink}
                disabled={!newLink.url}
                className="flex-1"
              >
                Adicionar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar link
        </Button>
      )}

      {links.length === 0 && !showForm && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <LinkIcon className="mx-auto h-12 w-12 mb-2" />
          <p className="text-sm">Nenhum link adicionado</p>
        </div>
      )}
    </div>
  );
};
