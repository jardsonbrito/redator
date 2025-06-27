
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const VideoForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const thumbnailUrl = generateThumbnailUrl(formData.youtube_url);
      
      const { error } = await supabase
        .from('videos')
        .insert([{
          titulo: formData.titulo,
          youtube_url: formData.youtube_url,
          categoria: formData.categoria,
          thumbnail_url: thumbnailUrl
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Vídeo adicionado com sucesso à videoteca.",
      });

      // Reset form
      setFormData({
        titulo: '',
        youtube_url: '',
        categoria: ''
      });
    } catch (error: any) {
      console.error('Erro ao salvar vídeo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar vídeo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="titulo">Assunto do Vídeo</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          placeholder="Ex: Como escrever uma boa introdução"
          required
        />
      </div>

      <div>
        <Label htmlFor="categoria">Categoria</Label>
        <Input
          id="categoria"
          value={formData.categoria}
          onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          placeholder="Ex: Técnicas de Redação, Repertório, Estrutura"
        />
      </div>

      <div>
        <Label htmlFor="youtube_url">Link do YouTube</Label>
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando...' : 'Salvar Vídeo na Videoteca'}
      </Button>
    </form>
  );
};
