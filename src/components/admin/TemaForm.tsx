
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const TemaForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    frase_tematica: '',
    eixo_tematico: '',
    texto_1: '',
    texto_2: '',
    texto_3: '',
    imagem_texto_4_url: '',
    video_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('temas')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Tema adicionado com sucesso.",
      });

      // Reset form
      setFormData({
        frase_tematica: '',
        eixo_tematico: '',
        texto_1: '',
        texto_2: '',
        texto_3: '',
        imagem_texto_4_url: '',
        video_url: ''
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
        <Label htmlFor="frase_tematica">Frase Temática</Label>
        <Input
          id="frase_tematica"
          value={formData.frase_tematica}
          onChange={(e) => setFormData({...formData, frase_tematica: e.target.value})}
          required
        />
      </div>

      <div>
        <Label htmlFor="eixo_tematico">Eixo Temático</Label>
        <Input
          id="eixo_tematico"
          value={formData.eixo_tematico}
          onChange={(e) => setFormData({...formData, eixo_tematico: e.target.value})}
          required
        />
      </div>

      <div>
        <Label htmlFor="texto_1">Texto Motivador 1</Label>
        <Textarea
          id="texto_1"
          value={formData.texto_1}
          onChange={(e) => setFormData({...formData, texto_1: e.target.value})}
        />
      </div>

      <div>
        <Label htmlFor="texto_2">Texto Motivador 2</Label>
        <Textarea
          id="texto_2"
          value={formData.texto_2}
          onChange={(e) => setFormData({...formData, texto_2: e.target.value})}
        />
      </div>

      <div>
        <Label htmlFor="texto_3">Texto Motivador 3</Label>
        <Textarea
          id="texto_3"
          value={formData.texto_3}
          onChange={(e) => setFormData({...formData, texto_3: e.target.value})}
        />
      </div>

      <div>
        <Label htmlFor="imagem_texto_4_url">URL da Imagem Motivadora</Label>
        <Input
          id="imagem_texto_4_url"
          type="url"
          value={formData.imagem_texto_4_url}
          onChange={(e) => setFormData({...formData, imagem_texto_4_url: e.target.value})}
        />
      </div>

      <div>
        <Label htmlFor="video_url">URL do Vídeo (opcional)</Label>
        <Input
          id="video_url"
          type="url"
          value={formData.video_url}
          onChange={(e) => setFormData({...formData, video_url: e.target.value})}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Tema'}
      </Button>
    </form>
  );
};
