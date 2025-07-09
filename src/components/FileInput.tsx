
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileInputProps {
  onImageUpload: (url: string | null) => void;
  initialImageUrl?: string | null;
}

export const FileInput = ({ onImageUpload, initialImageUrl }: FileInputProps) => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - only JPEG and PNG
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos JPEG ou PNG.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // For now, we'll create a temporary URL
      // In a real implementation, you would upload to Supabase Storage
      const tempUrl = URL.createObjectURL(file);
      setImageUrl(tempUrl);
      onImageUpload(tempUrl);
      
      toast({
        title: "Sucesso",
        description: "Imagem carregada com sucesso!"
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar a imagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    onImageUpload(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label htmlFor="image-upload" className="cursor-pointer">
          <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm">
              {uploading ? "Carregando..." : "Selecionar imagem"}
            </span>
          </div>
        </Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {imageUrl && (
        <div className="relative inline-block">
          <img 
            src={imageUrl} 
            alt="Preview" 
            className="max-w-xs max-h-40 rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
            onClick={handleRemoveImage}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
