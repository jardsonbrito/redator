import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  extraLink: z.string().url("Deve ser uma URL válida").optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

export interface InboxExtras {
  extraLink?: string;
  extraImage?: string;
}

interface InboxExtrasFormProps {
  onExtrasChange: (extras: InboxExtras) => void;
  initialExtras?: InboxExtras;
}

export function InboxExtrasForm({ onExtrasChange, initialExtras }: InboxExtrasFormProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(initialExtras?.extraImage);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      extraLink: initialExtras?.extraLink || "",
    },
  });

  const handleFormChange = () => {
    const values = form.getValues();
    onExtrasChange({
      extraLink: values.extraLink || undefined,
      extraImage: selectedImage,
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    // Validar tamanho (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Imagem muito grande. Máximo 5MB permitido");
      return;
    }

    setUploadingImage(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `inbox_${Date.now()}.${fileExt}`;

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('inbox-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('inbox-images')
        .getPublicUrl(fileName);

      setSelectedImage(publicUrl);
      handleFormChange();
      toast.success("Imagem carregada com sucesso!");

    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (selectedImage) {
      try {
        // Extrair nome do arquivo da URL
        const fileName = selectedImage.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('inbox-images')
            .remove([fileName]);
        }
      } catch (error) {
        console.error('Erro ao remover imagem:', error);
      }
    }

    setSelectedImage(undefined);
    handleFormChange();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Campos Extras</h3>

        <Form {...form}>
          <div className="space-y-6">
            {/* Link Extra */}
            <FormField
              control={form.control}
              name="extraLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://exemplo.com"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFormChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-sm text-muted-foreground">
                    Adicione um link que será exibido na mensagem para direcionamento
                  </div>
                </FormItem>
              )}
            />

            {/* Upload de Imagem */}
            <div>
              <Label className="flex items-center mb-2">
                <ImageIcon className="h-4 w-4 mr-2" />
                Imagem (Opcional)
              </Label>

              {selectedImage ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={selectedImage}
                      alt="Imagem selecionada"
                      className="max-w-sm max-h-48 rounded-lg border object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Clique no X para remover a imagem
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <Label
                        htmlFor="image-upload"
                        className="cursor-pointer text-primary hover:text-primary/80"
                      >
                        Clique para selecionar uma imagem
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG ou GIF até 5MB
                      </p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </div>
                  {uploadingImage && (
                    <div className="text-sm text-muted-foreground text-center">
                      Fazendo upload da imagem...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}