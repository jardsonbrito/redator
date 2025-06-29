
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

interface VideoEditFormProps {
  videoId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export const VideoEditForm = ({ videoId, onCancel, onSuccess }: VideoEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    titulo: '',
    youtube_url: '',
    categoria: ''
  });

  const extractYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const generateThumbnailUrl = (url: string) => {
    const videoId = extractYouTubeID(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
  };

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .single();

        if (error) throw error;

        setFormData({
          titulo: data.titulo || '',
          youtube_url: data.youtube_url || '',
          categoria: data.categoria || ''
        });
      } catch (error: any) {
        toast({
          title: "❌ Erro",
          description: "Erro ao carregar dados do vídeo: " + error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchVideo();
  }, [videoId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateYouTubeUrl(formData.youtube_url)) {
        throw new Error('URL do YouTube inválida. Use um link válido do YouTube.');
      }

      const thumbnailUrl = generateThumbnailUrl(formData.youtube_url);

      const { error } = await supabase
        .from('videos')
        .update({
          titulo: formData.titulo.trim(),
          youtube_url: formData.youtube_url.trim(),
          categoria: formData.categoria.trim(),
          thumbnail_url: thumbnailUrl || null,
        })
        .eq('id', videoId);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: "Vídeo atualizado com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar vídeo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="text-center py-4">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h3 className="text-lg font-semibold text-redator-primary">Editar Vídeo</h3>
      </div>

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
          <Label htmlFor="categoria">Categoria *</Label>
          <Input
            id="categoria"
            value={formData.categoria}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            placeholder="Ex: Técnicas de Redação, Repertório, Estrutura"
            required
          />
        </div>

        <div>
          <Label htmlFor="youtube_url">Link do YouTube *</Label>
          <Input
            id="youtube_url"
            type="url"
            value={formData.youtube_url}
            onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <p className="text-sm text-gray-600 mt-1">
            Cole o link completo do vídeo do YouTube. O thumbnail será gerado automaticamente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Salvando alterações...' : 'Salvar Alterações'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
};
