
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const RedacaoForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    frase_tematica: '',
    eixo_tematico: '',
    conteudo: '',
    thumbnail_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Primeiro, criar o tema se necessário
      let tema_id = null;
      if (formData.frase_tematica && formData.eixo_tematico) {
        const { data: temaData, error: temaError } = await supabase
          .from('temas')
          .insert([{
            frase_tematica: formData.frase_tematica,
            eixo_tematico: formData.eixo_tematico
          }])
          .select()
          .single();

        if (temaError) throw temaError;
        tema_id = temaData.id;
      }

      // Inserir a redação
      const { error } = await supabase
        .from('redacoes')
        .insert([{
          conteudo: formData.conteudo,
          pdf_url: formData.thumbnail_url,
          tema_id: tema_id,
          nota_total: 1000, // Redação exemplar
          data_envio: new Date().toISOString(),
        }]);

      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['redacoes'] });

      toast({
        title: "Sucesso!",
        description: "Redação exemplar adicionada com sucesso.",
      });

      // Reset form
      setFormData({
        frase_tematica: '',
        eixo_tematico: '',
        conteudo: '',
        thumbnail_url: ''
      });
    } catch (error: any) {
      console.error('Erro ao salvar redação:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar redação exemplar.",
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
          placeholder="Ex: A importância da educação no Brasil"
          required
        />
      </div>

      <div>
        <Label htmlFor="eixo_tematico">Eixo Temático</Label>
        <Input
          id="eixo_tematico"
          value={formData.eixo_tematico}
          onChange={(e) => setFormData({...formData, eixo_tematico: e.target.value})}
          placeholder="Ex: Educação, Meio Ambiente, Tecnologia"
          required
        />
      </div>

      <div>
        <Label htmlFor="conteudo">Texto da Redação</Label>
        <Textarea
          id="conteudo"
          value={formData.conteudo}
          onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
          rows={15}
          placeholder="Digite aqui o texto completo da redação exemplar..."
          required
          className="min-h-[400px]"
        />
      </div>

      <div>
        <Label htmlFor="thumbnail_url">Imagem de Capa (URL)</Label>
        <Input
          id="thumbnail_url"
          type="url"
          value={formData.thumbnail_url}
          onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
          placeholder="https://exemplo.com/imagem.jpg"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando...' : 'Salvar Redação Exemplar'}
      </Button>
    </form>
  );
};
