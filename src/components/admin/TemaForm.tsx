
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
      console.log('Tentando salvar tema no Supabase:', formData);

      // Verificar se o usuário está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Sessão atual:', session);
      
      if (sessionError) {
        console.error('Erro ao verificar sessão:', sessionError);
        throw new Error('Erro de autenticação: ' + sessionError.message);
      }

      if (!session) {
        throw new Error('Usuário não está autenticado. Faça login novamente.');
      }

      // Preparar dados garantindo que são strings
      const dataToInsert = {
        frase_tematica: String(formData.frase_tematica || '').trim(),
        eixo_tematico: String(formData.eixo_tematico || '').trim(),
        texto_1: formData.texto_1 ? String(formData.texto_1).trim() : null,
        texto_2: formData.texto_2 ? String(formData.texto_2).trim() : null,
        texto_3: formData.texto_3 ? String(formData.texto_3).trim() : null,
        imagem_texto_4_url: formData.imagem_texto_4_url ? String(formData.imagem_texto_4_url).trim() : null,
        publicado_em: new Date().toISOString()
      };

      console.log('Dados preparados para inserção:', dataToInsert);

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('temas')
        .insert([dataToInsert])
        .select('*')
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        console.error('Código do erro:', error.code);
        console.error('Detalhes do erro:', error.details);
        console.error('Dica do erro:', error.hint);
        throw error;
      }

      console.log('Tema salvo com sucesso no Supabase:', data);

      // Invalidar e recarregar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['temas'] }),
        queryClient.refetchQueries({ queryKey: ['temas'] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: "Tema cadastrado com sucesso no banco de dados.",
      });

      // Limpar formulário
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
      
      let errorMessage = 'Erro desconhecido ao salvar tema.';
      
      if (error.message?.includes('row-level security')) {
        errorMessage = 'Erro de permissão: Verifique se você está logado como administrador.';
      } else if (error.message?.includes('not-null violation')) {
        errorMessage = 'Erro: Todos os campos obrigatórios devem ser preenchidos.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "❌ Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <p className="text-sm text-gray-600 mt-1">
          Cole a URL completa de uma imagem que servirá como texto motivador IV. 
          Use serviços como Unsplash, Imgur ou faça upload no Supabase Storage.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando tema...' : 'Salvar Tema no Banco'}
      </Button>
      
      {loading && (
        <p className="text-sm text-blue-600 text-center">
          Conectando com Supabase e salvando dados...
        </p>
      )}
    </form>
  );
};
