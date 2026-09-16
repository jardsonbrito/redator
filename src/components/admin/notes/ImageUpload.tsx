import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { NoteImage } from '@/types/admin-notes';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
  existingImages?: NoteImage[];
  onRemoveExisting?: (imageUrl: string) => void;
  maxImages?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesChange,
  existingImages = [],
  onRemoveExisting,
  maxImages = 10,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const totalImages = existingImages.length + selectedFiles.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validar número máximo de imagens
    if (totalImages + files.length > maxImages) {
      toast({
        title: 'Limite excedido',
        description: `Você pode adicionar no máximo ${maxImages} imagens.`,
        variant: 'destructive',
      });
      return;
    }

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas imagens JPG, PNG, GIF e WebP são permitidas.',
        variant: 'destructive',
      });
      return;
    }

    // Criar previews
    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newPreviews.push(event.target?.result as string);
        if (newPreviews.length === files.length) {
          setPreviewUrls([...previewUrls, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    onImagesChange(newFiles);
  };

  const handleRemoveNew = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
    onImagesChange(newFiles);

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExisting = (imageUrl: string) => {
    if (onRemoveExisting) {
      onRemoveExisting(imageUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Imagens {totalImages > 0 && `(${totalImages}/${maxImages})`}</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Adicione até {maxImages} imagens (sem limite de tamanho)
        </p>
      </div>

      {/* Grid de imagens */}
      {totalImages > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {/* Imagens existentes */}
          {existingImages.map((img, idx) => (
            <div key={`existing-${idx}`} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={img.url}
                  alt={img.nome}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveExisting(img.url)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {img.nome}
              </div>
            </div>
          ))}

          {/* Novas imagens */}
          {previewUrls.map((url, idx) => (
            <div key={`new-${idx}`} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={url}
                  alt={selectedFiles[idx].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveNew(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {selectedFiles[idx].name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão para adicionar mais imagens */}
      {totalImages < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {totalImages === 0 ? 'Adicionar imagens' : 'Adicionar mais imagens'}
          </Button>
        </div>
      )}

      {totalImages === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 mb-2" />
          <p className="text-sm">Nenhuma imagem adicionada</p>
        </div>
      )}
    </div>
  );
};
