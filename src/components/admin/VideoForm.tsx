
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

interface VideoFormProps {
  mode: 'create' | 'edit';
  initialValues?: any;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const VideoForm = ({ mode, initialValues, onCancel, onSuccess }: VideoFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    titulo: '',
    eixo_tematico: '',
    status_publicacao: 'publicado' as 'publicado' | 'rascunho',
    video_url_original: '',
  });

  const [preview, setPreview] = useState({
    platform: '',
    video_id: '',
    embed_url: '',
    thumbnail_url: '',
  });

  // Detectar plataforma e extrair informações do vídeo
  const detectPlatformAndExtract = (url: string) => {
    if (!url) return null;
    
    // YouTube
    const youtubeMatch = url.match(/(youtu\.be\/([A-Za-z0-9_-]{11})|v=([A-Za-z0-9_-]{11})|shorts\/([A-Za-z0-9_-]{11})|embed\/([A-Za-z0-9_-]{11}))/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[2] || youtubeMatch[3] || youtubeMatch[4] || youtubeMatch[5];
      return {
        platform: 'youtube',
        video_id: videoId,
        embed_url: `https://www.youtube.com/embed/${videoId}`,
        thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
    
    // Instagram
    const instagramMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
    if (instagramMatch) {
      const videoId = instagramMatch[1];
      return {
        platform: 'instagram',
        video_id: videoId,
        embed_url: `https://www.instagram.com/p/${videoId}/embed`,
        thumbnail_url: '', // Instagram não permite thumbnail direto
      };
    }
    
    return null;
  };

  // Pré-preencher dados no modo edit
  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setFormData({
        titulo: initialValues.titulo || '',
        eixo_tematico: initialValues.eixo_tematico || initialValues.categoria || '',
        status_publicacao: initialValues.status_publicacao || 'publicado',
        video_url_original: initialValues.video_url_original || initialValues.youtube_url || '',
      });

      // Gerar preview se houver URL
      const url = initialValues.video_url_original || initialValues.youtube_url;
      if (url) {
        const detected = detectPlatformAndExtract(url);
        if (detected) {
          setPreview(detected);
        }
      }
    }
  }, [mode, initialValues]);

  // Atualizar preview quando URL mudar
  useEffect(() => {
    const detected = detectPlatformAndExtract(formData.video_url_original);
    if (detected) {
      setPreview(detected);
    } else {
      setPreview({ platform: '', video_id: '', embed_url: '', thumbnail_url: '' });
    }
  }, [formData.video_url_original]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.titulo.trim()) {
        throw new Error('Título é obrigatório');
      }
      
      if (!formData.eixo_tematico.trim()) {
        throw new Error('Eixo Temático é obrigatório');
      }
      
      if (!formData.video_url_original.trim()) {
        throw new Error('Link do vídeo é obrigatório');
      }

      if (!preview.platform) {
        throw new Error('URL de vídeo inválida. Use um link válido do YouTube ou Instagram.');
      }

      // Preparar dados para salvar
      const dataToSave = {
        titulo: formData.titulo.trim(),
        eixo_tematico: formData.eixo_tematico.trim(),
        status_publicacao: formData.status_publicacao,
        video_url_original: formData.video_url_original.trim(),
        platform: preview.platform,
        video_id: preview.video_id,
        embed_url: preview.embed_url,
        thumbnail_url: preview.thumbnail_url || null,
        // Manter campos antigos para compatibilidade
        categoria: formData.eixo_tematico.trim(),
        youtube_url: formData.video_url_original.trim(),
      };

      let result;
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('videos')
          .insert([dataToSave])
          .select('*')
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('videos')
          .update(dataToSave)
          .eq('id', initialValues?.id)
          .select('*')
          .single();
        result = { data, error };
      }

      if (result.error) {
        console.error('Erro do Supabase:', result.error);
        throw result.error;
      }

      // Invalidar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: mode === 'create' ? "Vídeo criado com sucesso!" : "Vídeo atualizado com sucesso!",
      });

      if (mode === 'create') {
        // Limpar formulário
        setFormData({
          titulo: '',
          eixo_tematico: '',
          status_publicacao: 'publicado',
          video_url_original: '',
        });
        setPreview({ platform: '', video_id: '', embed_url: '', thumbnail_url: '' });
      } else if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Erro ao salvar vídeo:', error);
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao salvar vídeo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {mode === 'edit' && onCancel && (
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <h3 className="text-lg font-semibold text-redator-primary">
            Editar Vídeo
          </h3>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="titulo">Título do Vídeo *</Label>
          <Input
            id="titulo"
            value={formData.titulo}
            onChange={(e) => setFormData({...formData, titulo: e.target.value})}
            placeholder="Ex: Como escrever uma boa introdução"
            required
          />
        </div>

        <div>
          <Label htmlFor="eixo_tematico">Eixo Temático *</Label>
          <Input
            id="eixo_tematico"
            value={formData.eixo_tematico}
            onChange={(e) => setFormData({...formData, eixo_tematico: e.target.value})}
            placeholder="Ex: social e tecnologia, educação e cultura"
            required
          />
        </div>

        <div>
          <Label htmlFor="status_publicacao">Status *</Label>
          <Select 
            value={formData.status_publicacao} 
            onValueChange={(value: 'publicado' | 'rascunho') => 
              setFormData({...formData, status_publicacao: value})
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publicado">Publicado</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="video_url_original">Link YouTube/Instagram *</Label>
          <Input
            id="video_url_original"
            type="url"
            value={formData.video_url_original}
            onChange={(e) => setFormData({...formData, video_url_original: e.target.value})}
            placeholder="https://www.youtube.com/watch?v=... ou https://www.instagram.com/reel/..."
            required
          />
          <p className="text-sm text-muted-foreground mt-1">
            Cole o link do YouTube ou Instagram. O preview será gerado automaticamente.
          </p>
        </div>

        {/* Preview */}
        {preview.platform && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={preview.platform === 'youtube' ? 'destructive' : 'default'}>
                {preview.platform === 'youtube' ? 'YouTube' : 'Instagram'}
              </Badge>
              <span className="text-sm text-muted-foreground">Preview detectado</span>
            </div>
            
            {preview.thumbnail_url ? (
              <img 
                src={preview.thumbnail_url} 
                alt="Preview do vídeo"
                className="w-full max-w-sm h-32 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full max-w-sm h-32 bg-muted rounded flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  {preview.platform === 'instagram' ? 'Preview Instagram' : 'Sem preview'}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading 
              ? (mode === 'create' ? 'Criando...' : 'Salvando...')
              : (mode === 'create' ? 'Criar Vídeo' : 'Salvar Alterações')
            }
          </Button>
          {mode === 'edit' && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
