
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
    pdf_url: '',
    dica_de_escrita: '',
    autor: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Salvando redação exemplar...', formData);
      
      // Inserir APENAS na tabela redacoes - SEM criar entrada em temas
      const { data: redacaoData, error } = await supabase
        .from('redacoes')
        .insert([{
          conteudo: formData.conteudo.trim(),
          pdf_url: formData.pdf_url.trim() || null,
          dica_de_escrita: formData.dica_de_escrita.trim() || null,
          nota_total: 1000, // Redação exemplar
          data_envio: new Date().toISOString(),
          // Campos específicos para metadados da redação exemplar
          frase_tematica: formData.frase_tematica.trim(),
          eixo_tematico: formData.eixo_tematico.trim(),
          autor: formData.autor.trim() || null
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao inserir redação:', error);
        throw error;
      }

      console.log('Redação exemplar salva com sucesso:', redacaoData);

      // Invalidar apenas as queries de redações
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['redacoes'] }),
        queryClient.refetchQueries({ queryKey: ['redacoes'] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: "Redação exemplar adicionada com sucesso.",
      });

      // Limpar formulário
      setFormData({
        frase_tematica: '',
        eixo_tematico: '', 
        conteudo: '',
        pdf_url: '',
        dica_de_escrita: '',
        autor: ''
      });

    } catch (error: any) {
      console.error('Erro ao salvar redação exemplar:', error);
      toast({
        title: "❌ Erro",
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
        <Label htmlFor="frase_tematica">Frase Temática da Redação</Label>
        <Input
          id="frase_tematica"
          value={formData.frase_tematica}
          onChange={(e) => setFormData({...formData, frase_tematica: e.target.value})}
          placeholder="Ex: A importância da educação no Brasil"
          required
        />
        <p className="text-sm text-gray-600 mt-1">
          Esta será a frase temática exibida como título da redação exemplar.
        </p>
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
        <p className="text-sm text-gray-600 mt-1">
          Categoria temática que será exibida como subtítulo nos cards.
        </p>
      </div>

      <div>
        <Label htmlFor="autor">Autor da Redação</Label>
        <Input
          id="autor"
          value={formData.autor}
          onChange={(e) => setFormData({...formData, autor: e.target.value})}
          placeholder="Ex: João Silva, Maria Santos"
        />
        <p className="text-sm text-gray-600 mt-1">
          Nome do autor da redação exemplar que será exibido nos cards.
        </p>
      </div>

      <div>
        <Label htmlFor="conteudo">Texto da Redação Exemplar</Label>
        <Textarea
          id="conteudo"
          value={formData.conteudo}
          onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
          rows={15}
          placeholder="Digite aqui o texto completo da redação exemplar nota 1000..."
          required
          className="min-h-[400px]"
        />
        <p className="text-sm text-gray-600 mt-1">
          Este conteúdo será exibido apenas na página de detalhes da redação.
        </p>
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
        <p className="text-sm text-gray-600 mt-1">
          Este comentário será exibido ao público, abaixo da redação, como dica de escrita.
        </p>
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
        <p className="text-sm text-gray-600 mt-1">
          Link da imagem que será exibida como capa da redação exemplar.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando redação...' : 'Salvar Redação Exemplar'}
      </Button>
      
      {loading && (
        <p className="text-sm text-blue-600 text-center">
          ⚠️ Salvando APENAS na tabela de redações...
        </p>
      )}
    </form>
  );
};
