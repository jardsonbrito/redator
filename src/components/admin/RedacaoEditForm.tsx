
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

interface RedacaoEditFormProps {
  redacaoId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export const RedacaoEditForm = ({ redacaoId, onCancel, onSuccess }: RedacaoEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    frase_tematica: '',
    eixo_tematico: '',
    conteudo: '',
    pdf_url: '',
    dica_de_escrita: ''
  });

  useEffect(() => {
    const fetchRedacao = async () => {
      try {
        const { data, error } = await supabase
          .from('redacoes')
          .select('*')
          .eq('id', redacaoId)
          .single();

        if (error) throw error;

        setFormData({
          frase_tematica: data.frase_tematica || '',
          eixo_tematico: data.eixo_tematico || '',
          conteudo: data.conteudo || '',
          pdf_url: data.pdf_url || '',
          dica_de_escrita: data.dica_de_escrita || ''
        });
      } catch (error: any) {
        toast({
          title: "❌ Erro",
          description: "Erro ao carregar dados da redação: " + error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchRedacao();
  }, [redacaoId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('redacoes')
        .update({
          frase_tematica: formData.frase_tematica.trim(),
          eixo_tematico: formData.eixo_tematico.trim(),
          conteudo: formData.conteudo.trim(),
          pdf_url: formData.pdf_url.trim() || null,
          dica_de_escrita: formData.dica_de_escrita.trim() || null,
        })
        .eq('id', redacaoId);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['redacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-redacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['redacao', redacaoId] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: "Redação exemplar atualizada com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar redação: " + error.message,
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
        <h3 className="text-lg font-semibold text-redator-primary">Editar Redação Exemplar</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="frase_tematica">Frase Temática da Redação</Label>
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
          <Label htmlFor="conteudo">Texto da Redação Exemplar</Label>
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
          <Label htmlFor="dica_de_escrita">Dica de escrita (opcional)</Label>
          <Textarea
            id="dica_de_escrita"
            value={formData.dica_de_escrita}
            onChange={(e) => setFormData({...formData, dica_de_escrita: e.target.value})}
            rows={4}
            placeholder="Digite aqui uma dica ou comentário sobre esta redação exemplar..."
            className="min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="pdf_url">Imagem de Capa da Redação (URL)</Label>
          <Input
            id="pdf_url"
            type="url"
            value={formData.pdf_url}
            onChange={(e) => setFormData({...formData, pdf_url: e.target.value})}
            placeholder="https://exemplo.com/imagem-da-redacao.jpg"
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
