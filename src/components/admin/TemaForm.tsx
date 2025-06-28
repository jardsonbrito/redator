
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const TemaForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    frase_tematica: '',
    eixo_tematico: '',
    texto_1: '',
    texto_2: '',
    texto_3: '',
    imagem_texto_4_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Salvando tema:', formData);

      const { data, error } = await supabase
        .from('temas')
        .insert([formData])
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao salvar tema:', error);
        throw error;
      }

      console.log('Tema salvo com sucesso:', data);

      // Invalidate and refetch queries immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['temas'] }),
        queryClient.refetchQueries({ queryKey: ['temas'] }),
      ]);

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
        imagem_texto_4_url: ''
      });
    } catch (error: any) {
      console.error('Erro completo ao salvar tema:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar tema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="frase_tematica">Frase Temática</Label>
        <Input
          id="frase_tematica"
          value={formData.frase_tematica}
          onChange={(e) => setFormData({...formData, frase_tematica: e.target.value})}
          placeholder="Ex: A importância da sustentabilidade no século XXI"
          required
        />
      </div>

      <div>
        <Label htmlFor="eixo_tematico">Eixo Temático</Label>
        <Input
          id="eixo_tematico"
          value={formData.eixo_tematico}
          onChange={(e) => setFormData({...formData, eixo_tematico: e.target.value})}
          placeholder="Ex: Meio Ambiente, Educação, Tecnologia"
          required
        />
      </div>

      <div>
        <Label htmlFor="texto_1">Texto Motivador 1</Label>
        <Textarea
          id="texto_1"
          value={formData.texto_1}
          onChange={(e) => setFormData({...formData, texto_1: e.target.value})}
          rows={4}
          placeholder="Primeiro texto motivador para a redação..."
        />
      </div>

      <div>
        <Label htmlFor="texto_2">Texto Motivador 2</Label>
        <Textarea
          id="texto_2"
          value={formData.texto_2}
          onChange={(e) => setFormData({...formData, texto_2: e.target.value})}
          rows={4}
          placeholder="Segundo texto motivador para a redação..."
        />
      </div>

      <div>
        <Label htmlFor="texto_3">Texto Motivador 3</Label>
        <Textarea
          id="texto_3"
          value={formData.texto_3}
          onChange={(e) => setFormData({...formData, texto_3: e.target.value})}
          rows={4}
          placeholder="Terceiro texto motivador para a redação..."
        />
      </div>

      <div>
        <Label htmlFor="imagem_texto_4_url">Imagem Motivadora - Texto 4 (URL)</Label>
        <Input
          id="imagem_texto_4_url"
          type="url"
          value={formData.imagem_texto_4_url}
          onChange={(e) => setFormData({...formData, imagem_texto_4_url: e.target.value})}
          placeholder="https://exemplo.com/imagem-motivadora.jpg"
          required
        />
        <p className="text-sm text-gray-600 mt-1">
          Cole a URL completa de uma imagem que servirá como texto motivador IV. A imagem deve estar hospedada online (ex: Unsplash, Imgur, etc.).
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando...' : 'Salvar Tema'}
      </Button>
    </form>
  );
};
