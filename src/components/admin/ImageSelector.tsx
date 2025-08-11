import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Link, X, Check, AlertCircle, Loader2 } from 'lucide-react';

type ImageValue = {
  source: 'upload' | 'url';
  url?: string;
  file_path?: string;
  file_size?: number;
  dimensions?: { width: number; height: number };
} | null;

interface ImageSelectorProps {
  title: string;
  description: string;
  required?: boolean;
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  minDimensions?: { width: number; height: number };
  bucket: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALIDATION_TIMEOUT = 10000; // 10 seconds

export const ImageSelector = ({ 
  title, 
  description, 
  required = false, 
  value, 
  onChange,
  minDimensions = { width: 200, height: 150 },
  bucket = 'themes'
}: ImageSelectorProps) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url'>(value?.source || 'url');
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState(value?.url || '');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'success' | 'error' | null>(null);

  const { toast } = useToast();

  // Update preview when value changes
  useEffect(() => {
    if (value?.source === 'url' && value.url) {
      setPreviewUrl(value.url);
      setTempUrl(value.url);
    } else if (value?.source === 'upload' && value.file_path) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(value.file_path);
      setPreviewUrl(data.publicUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [value, bucket]);

  const validateImageDimensions = async (imageUrl: string): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = imageUrl;
    });
  };

  const isValidImageUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && 
             /\.(jpg|jpeg|png|webp)$/i.test(urlObj.pathname);
    } catch {
      return false;
    }
  };

  const validateUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      setValidationMessage(null);
      setValidationStatus(null);
      return;
    }

    if (!isValidImageUrl(url)) {
      setValidationMessage('Forneça uma URL pública válida de imagem (jpg, png, webp).');
      setValidationStatus('error');
      return;
    }

    setIsValidating(true);
    setValidationMessage('Verificando imagem...');
    setValidationStatus(null);

    try {
      // Validate dimensions
      const dimensions = await validateImageDimensions(url);
      
      if (!dimensions) {
        setValidationMessage('Não foi possível carregar a imagem da URL fornecida.');
        setValidationStatus('error');
        return;
      }

      if (dimensions.width < minDimensions.width || dimensions.height < minDimensions.height) {
        setValidationMessage(`Imagem muito pequena. Mínimo ${minDimensions.width}x${minDimensions.height}px.`);
        setValidationStatus('error');
        return;
      }

      setValidationMessage('Imagem carregada com sucesso!');
      setValidationStatus('success');
      setPreviewUrl(url);
      
      onChange({
        source: 'url',
        url,
        dimensions
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        if (validationStatus === 'success') {
          setValidationMessage(null);
          setValidationStatus(null);
        }
      }, 3000);

    } catch (error) {
      setValidationMessage('Falha na conexão. Verifique sua internet e tente novamente.');
      setValidationStatus('error');
    } finally {
      setIsValidating(false);
    }
  }, [minDimensions, onChange, validationStatus]);

  const handleUrlChange = (url: string) => {
    setTempUrl(url);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateUrl(url);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "❌ Formato não suportado",
        description: "Use jpg, jpeg, png ou webp (até 10 MB).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "❌ Arquivo muito grande",
        description: "Tamanho máximo de 10 MB permitido.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate dimensions before upload
      const fileUrl = URL.createObjectURL(file);
      const dimensions = await validateImageDimensions(fileUrl);
      URL.revokeObjectURL(fileUrl);

      if (!dimensions) {
        throw new Error('Não foi possível processar a imagem.');
      }

      if (dimensions.width < minDimensions.width || dimensions.height < minDimensions.height) {
        throw new Error(`Imagem muito pequena. Mínimo ${minDimensions.width}x${minDimensions.height}px.`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}-${randomId}.${extension}`;
      const filePath = `uploads/${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      setPreviewUrl(publicData.publicUrl);

      onChange({
        source: 'upload',
        file_path: filePath,
        file_size: file.size,
        dimensions
      });

      toast({
        title: "✅ Sucesso!",
        description: "Imagem enviada com sucesso!",
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Não foi possível salvar a imagem. Tente novamente.';
      if (error.message?.includes('dimensions')) {
        errorMessage = error.message;
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Muitos uploads. Aguarde 1 minuto e tente novamente.';
      }

      toast({
        title: "❌ Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = async () => {
    if (value?.source === 'upload' && value.file_path) {
      try {
        await supabase.storage.from(bucket).remove([value.file_path]);
      } catch (error) {
        console.error('Error removing file:', error);
      }
    }

    setPreviewUrl(null);
    setTempUrl('');
    setValidationMessage(null);
    setValidationStatus(null);
    onChange(null);
  };

  const handleSourceChange = (newSource: 'upload' | 'url') => {
    setSourceType(newSource);
    setValidationMessage(null);
    setValidationStatus(null);
    
    // Clear current value when switching source
    if (newSource !== value?.source) {
      handleRemoveImage();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">
          {title} {required && <span className="text-destructive">*</span>}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>

      {/* Source Selection */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={sourceType === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSourceChange('upload')}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload
        </Button>
        <Button
          type="button"
          variant={sourceType === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSourceChange('url')}
          className="flex items-center gap-2"
        >
          <Link className="w-4 h-4" />
          URL
        </Button>
      </div>

      {/* Upload Section */}
      {sourceType === 'upload' && (
        <div>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
            disabled={isUploading}
            className="hidden"
            id={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
          />
          <label
            htmlFor={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isUploading ? 'border-muted bg-muted/50 cursor-not-allowed' : 'border-input hover:border-primary hover:bg-accent/50'}
            `}
          >
            {isUploading ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Enviando imagem...</p>
                <div className="w-32 mx-auto mt-2 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP (máx. 10MB)</p>
              </div>
            )}
          </label>
        </div>
      )}

      {/* URL Section */}
      {sourceType === 'url' && (
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={tempUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isValidating}
              className={`pr-10 ${
                validationStatus === 'success' ? 'border-green-500' :
                validationStatus === 'error' ? 'border-destructive' : ''
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              {validationStatus === 'success' && <Check className="w-4 h-4 text-green-500" />}
              {validationStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
            </div>
          </div>
          
          {validationMessage && (
            <p className={`text-sm ${
              validationStatus === 'success' ? 'text-green-600' : 
              validationStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {validationMessage}
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <img
                  src={previewUrl}
                  alt="Preview da imagem selecionada"
                  className="max-w-full max-h-48 object-contain rounded border"
                  onError={() => {
                    setPreviewUrl(null);
                    setValidationMessage('Erro ao carregar preview da imagem.');
                    setValidationStatus('error');
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {value?.dimensions && (
              <p className="text-xs text-muted-foreground mt-2">
                Dimensões: {value.dimensions.width}x{value.dimensions.height}px
                {value.file_size && ` • Tamanho: ${(value.file_size / 1024 / 1024).toFixed(2)}MB`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};