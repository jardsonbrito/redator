
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

interface TemaEditFormProps {
  temaId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export const TemaEditForm = ({ temaId, onCancel, onSuccess }: TemaEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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

  useEffect(() => {
    const fetchTema = async () => {
      try {
        const { data, error } = await supabase
          .from('temas')
          .select('*')
          .eq('id', temaId)
          .single();

        if (error) throw error;

        setFormData({
          frase_tematica: data.frase_tematica || '',
          eixo_tematico: data.eixo_tematico || '',
          texto_1: data.texto_1 || '',
          texto_2: data.texto_2 || '',
          texto_3: data.texto_3 || '',
          imagem_texto_4_url: data.imagem_texto_4_url || ''
        });
      } catch (error: any) {
        toast({
          title: "❌ Erro",
          description: "Erro ao carregar dados do tema: " + error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchTema();
  }, [temaId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('temas')
        .update({
          frase_tematica: formData.frase_tematica.trim(),
          eixo_tematico: formData.eixo_tematico.trim(),
          texto_1: formData.texto_1.trim() || null,
          texto_2: formData.texto_2.trim() || null,
          texto_3: formData.texto_3.trim() || null,
          imagem_texto_4_url: formData.imagem_texto_4_url.trim() || null,
        })
        .eq('id', temaId);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['temas'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-temas'] }),
        queryClient.invalidateQueries({ queryKey: ['tema', temaId] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: "Tema atualizado com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar tema: " + error.message,
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
        <h3 className="text-lg font-semibold text-redator-primary">Editar Tema</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="frase_tematica">Frase Temática *</Label>
          <Input
            id="frase_tematica"
            value={formData.frase_tematica}
            onChange={(e) => setFormData({...formData, frase_tematica: e.target.value})}
            placeholder="Ex: A importância da sustentabilidade no século XXI"
            required
          />
        </div>

        <div>
          <Label htmlFor="eixo_tematico">Eixo Temático *</Label>
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
          <Label htmlFor="imagem_texto_4_url">URL da Imagem Motivadora (Texto 4) *</Label>
          <Input
            id="imagem_texto_4_url"
            type="url"
            value={formData.imagem_texto_4_url}
            onChange={(e) => setFormData({...formData, imagem_texto_4_url: e.target.value})}
            placeholder="https://exemplo.com/imagem-motivadora.jpg"
            required
          />
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
