
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
    categoria: '',
    youtube_url: '',
    thumbnail_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('videos')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Vídeo adicionado com sucesso.",
      });

      // Reset form
      setFormData({
        titulo: '',
        categoria: '',
        youtube_url: '',
        thumbnail_url: ''
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="titulo">Título do Vídeo</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          required
        />
      </div>

      <div>
        <Label htmlFor="categoria">Categoria</Label>
        <Input
          id="categoria"
          value={formData.categoria}
          onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          required
        />
      </div>

      <div>
        <Label htmlFor="youtube_url">URL do YouTube</Label>
        <Input
          id="youtube_url"
          type="url"
          value={formData.youtube_url}
          onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
          required
        />
      </div>

      <div>
        <Label htmlFor="thumbnail_url">URL da Thumbnail</Label>
        <Input
          id="thumbnail_url"
          type="url"
          value={formData.thumbnail_url}
          onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Vídeo'}
      </Button>
    </form>
  );
};
