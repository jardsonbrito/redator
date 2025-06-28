
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const VideoForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Tentando salvar vídeo no Supabase:', formData);

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

      // Validar URL do YouTube
      if (!validateYouTubeUrl(formData.youtube_url)) {
        throw new Error('URL do YouTube inválida. Use um link válido do YouTube.');
      }

      // Gerar thumbnail automaticamente
      const thumbnailUrl = generateThumbnailUrl(formData.youtube_url);
      
      // Preparar dados garantindo que são strings
      const dataToInsert = {
        titulo: String(formData.titulo || '').trim(),
        youtube_url: String(formData.youtube_url || '').trim(),
        categoria: String(formData.categoria || '').trim(),
        thumbnail_url: thumbnailUrl || null,
        created_at: new Date().toISOString()
      };

      console.log('Dados preparados para inserção:', dataToInsert);

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('videos')
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

      console.log('Vídeo salvo com sucesso no Supabase:', data);

      // Invalidar e recarregar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.refetchQueries({ queryKey: ['videos'] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: "Vídeo adicionado com sucesso à videoteca.",
      });

      // Limpar formulário
      setFormData({
        titulo: '',
        youtube_url: '',
        categoria: ''
      });

    } catch (error: any) {
      console.error('Erro completo ao salvar vídeo:', error);
      
      let errorMessage = 'Erro desconhecido ao salvar vídeo.';
      
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
        <Label htmlFor="titulo">Título do Vídeo *</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          placeholder="Ex: Como escrever uma boa introdução"
          required
        />
      </div>

      <div>
        <Label htmlFor="categoria">Categoria *</Label>
        <Input
          id="categoria"
          value={formData.categoria}
          onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          placeholder="Ex: Técnicas de Redação, Repertório, Estrutura"
          required
        />
      </div>

      <div>
        <Label htmlFor="youtube_url">Link do YouTube *</Label>
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
        {loading ? 'Salvando vídeo...' : 'Salvar Vídeo na Videoteca'}
      </Button>
      
      {loading && (
        <p className="text-sm text-blue-600 text-center">
          Conectando com Supabase e salvando dados...
        </p>
      )}
    </form>
  );
};
