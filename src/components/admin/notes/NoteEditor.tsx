import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { AdminNote, NoteFormData, NoteColor, NOTE_COLORS, NoteImage } from '@/types/admin-notes';
import { ImageUpload } from './ImageUpload';
import { LinkInput } from './LinkInput';

interface NoteEditorProps {
  note?: AdminNote;
  onSave: (data: NoteFormData, images?: File[], imagesToRemove?: string[]) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
  isOpen,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NoteFormData>({
    titulo: '',
    conteudo: '',
    cor: 'default',
    categoria: '',
    tags: [],
    links: [],
    fixado: false,
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<NoteImage[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Carregar dados da nota se estiver editando
  useEffect(() => {
    if (note) {
      setFormData({
        titulo: note.titulo,
        conteudo: note.conteudo || '',
        cor: note.cor,
        categoria: note.categoria || '',
        tags: note.tags || [],
        links: note.links || [],
        fixado: note.fixado,
      });
      setExistingImages(note.imagens || []);
    } else {
      // Reset para criar nova nota
      setFormData({
        titulo: '',
        conteudo: '',
        cor: 'default',
        categoria: '',
        tags: [],
        links: [],
        fixado: false,
      });
      setExistingImages([]);
    }
    setNewImages([]);
    setImagesToRemove([]);
    setTagInput('');
  }, [note, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return;

    setLoading(true);
    try {
      await onSave(formData, newImages, imagesToRemove);
      onCancel();
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages(existingImages.filter(img => img.url !== imageUrl));
    // Encontrar o bucket_path da imagem
    const img = existingImages.find(i => i.url === imageUrl);
    if (img?.bucket_path) {
      setImagesToRemove([...imagesToRemove, img.bucket_path]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {note ? 'Editar Anotação' : 'Nova Anotação'}
          </DialogTitle>
          <DialogDescription>
            {note ? 'Edite sua anotação abaixo' : 'Crie uma nova anotação com texto, imagens e links'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="midia">Mídia</TabsTrigger>
              <TabsTrigger value="organizacao">Organização</TabsTrigger>
            </TabsList>

            {/* Tab: Básico */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  type="text"
                  placeholder="Digite o título da anotação"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  placeholder="Digite o conteúdo da sua anotação..."
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  rows={10}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Você pode usar quebras de linha para formatar o texto
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="fixado">Fixar anotação</Label>
                  <p className="text-xs text-muted-foreground">
                    Anotações fixadas aparecem no topo
                  </p>
                </div>
                <Switch
                  id="fixado"
                  checked={formData.fixado}
                  onCheckedChange={(checked) => setFormData({ ...formData, fixado: checked })}
                />
              </div>
            </TabsContent>

            {/* Tab: Mídia */}
            <TabsContent value="midia" className="space-y-6 mt-4">
              <ImageUpload
                onImagesChange={setNewImages}
                existingImages={existingImages}
                onRemoveExisting={handleRemoveExistingImage}
              />

              <LinkInput
                links={formData.links}
                onLinksChange={(links) => setFormData({ ...formData, links })}
              />
            </TabsContent>

            {/* Tab: Organização */}
            <TabsContent value="organizacao" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="cor">Cor do card</Label>
                <Select
                  value={formData.cor}
                  onValueChange={(value: NoteColor) => setFormData({ ...formData, cor: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  type="text"
                  placeholder="Ex: Trabalho, Pessoal, Ideias..."
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tags"
                    type="text"
                    placeholder="Digite uma tag e pressione Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Adicionar
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer com botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.titulo.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {note ? 'Salvar alterações' : 'Criar anotação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
