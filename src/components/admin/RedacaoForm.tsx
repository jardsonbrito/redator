
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const RedacaoForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
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
      // First create the tema if it doesn't exist
      let temaId = null;
      
      // Check if tema already exists
      const { data: existingTema } = await supabase
        .from('temas')
        .select('id')
        .eq('frase_tematica', formData.frase_tematica)
        .single();

      if (existingTema) {
        temaId = existingTema.id;
      } else {
        // Create new tema
        const { data: newTema, error: temaError } = await supabase
          .from('temas')
          .insert([{
            frase_tematica: formData.frase_tematica,
            eixo_tematico: formData.eixo_tematico
          }])
          .select()
          .single();

        if (temaError) throw temaError;
        temaId = newTema.id;
      }

      // Now create the redacao
      const { error } = await supabase
        .from('redacoes')
        .insert([{
          tema_id: temaId,
          conteudo: formData.conteudo,
          pdf_url: formData.thumbnail_url // Using as thumbnail for now
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Redação adicionada com sucesso.",
      });

      // Reset form
      setFormData({
        frase_tematica: '',
        eixo_tematico: '',
        conteudo: '',
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
        <Label htmlFor="conteudo">Texto da Redação</Label>
        <Textarea
          id="conteudo"
          value={formData.conteudo}
          onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
          rows={10}
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
        {loading ? 'Salvando...' : 'Salvar Redação'}
      </Button>
    </form>
  );
};
