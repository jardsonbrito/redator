
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ImageSelector } from './ImageSelector';

type ImageValue = {
  source: 'upload' | 'url';
  url?: string;
  file_path?: string;
  file_size?: number;
  dimensions?: { width: number; height: number };
} | null;

interface FormData {
  frase_tematica: string;
  eixo_tematico: string;
  status: string;
  cabecalho_enem: string;
  texto_1: string;
  texto_2: string;
  texto_3: string;
  cover: ImageValue;
  motivator4: ImageValue;
}

export const TemaForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<FormData>({
    frase_tematica: '',
    eixo_tematico: '',
    status: 'publicado',
    cabecalho_enem: 'Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema apresentado, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.',
    texto_1: '',
    texto_2: '',
    texto_3: '',
    cover: null,
    motivator4: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate cover image is required
    if (!formData.cover) {
      toast({
        title: "❌ Campo obrigatório",
        description: "Selecione um arquivo de imagem ou informe uma URL para a capinha.",
        variant: "destructive",
      });
      return;
    }

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

      // Preparar dados com nova estrutura
      const dataToInsert = {
        frase_tematica: String(formData.frase_tematica || '').trim(),
        eixo_tematico: String(formData.eixo_tematico || '').trim(),
        status: formData.status,
        cabecalho_enem: String(formData.cabecalho_enem || '').trim(),
        texto_1: formData.texto_1 ? String(formData.texto_1).trim() : null,
        texto_2: formData.texto_2 ? String(formData.texto_2).trim() : null,
        texto_3: formData.texto_3 ? String(formData.texto_3).trim() : null,
        // Cover image fields
        cover_source: formData.cover.source,
        cover_url: formData.cover.url || null,
        cover_file_path: formData.cover.file_path || null,
        cover_file_size: formData.cover.file_size || null,
        cover_dimensions: formData.cover.dimensions || null,
        // Motivator 4 fields
        motivator4_source: formData.motivator4?.source || 'none',
        motivator4_url: formData.motivator4?.url || null,
        motivator4_file_path: formData.motivator4?.file_path || null,
        motivator4_file_size: formData.motivator4?.file_size || null,
        motivator4_dimensions: formData.motivator4?.dimensions || null,
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
        queryClient.invalidateQueries({ queryKey: ['admin-temas'] }),
        queryClient.refetchQueries({ queryKey: ['temas'] }),
      ]);

      toast({
        title: "✅ Sucesso!",
        description: `Tema cadastrado como ${formData.status === 'rascunho' ? 'rascunho' : 'publicado'} no banco de dados.`,
      });

      // Limpar formulário
      setFormData({
        frase_tematica: '',
        eixo_tematico: '',
        status: 'publicado',
        cabecalho_enem: 'Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema apresentado, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.',
        texto_1: '',
        texto_2: '',
        texto_3: '',
        cover: null,
        motivator4: null
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
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Cover Image (Required) */}
        <Card>
          <CardContent className="p-6">
            <ImageSelector
              title="Capinha (Imagem de Capa)"
              description="Imagem usada na listagem e no topo do tema. Escolha upload ou URL."
              required={true}
              value={formData.cover}
              onChange={(value) => setFormData({...formData, cover: value})}
              minDimensions={{ width: 300, height: 200 }}
              bucket="themes"
            />
          </CardContent>
        </Card>

        {/* 2. Frase Temática */}
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

        {/* 3. Eixo Temático */}
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

        {/* 4. Status de Publicação */}
        <div>
          <Label htmlFor="status">Status de Publicação *</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publicado">Publicado (visível para todos)</SelectItem>
              <SelectItem value="rascunho">Rascunho (usado apenas em simulados)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Temas em rascunho ficam ocultos do público, mas podem ser usados em simulados.
          </p>
        </div>

        {/* 5. Cabeçalho ENEM (readonly) */}
        <div>
          <Label htmlFor="cabecalho_enem">Cabeçalho ENEM</Label>
          <Textarea
            id="cabecalho_enem"
            value={formData.cabecalho_enem}
            onChange={(e) => setFormData({...formData, cabecalho_enem: e.target.value})}
            rows={4}
            className="bg-muted/50"
            readOnly
            placeholder="O sistema preenche automaticamente..."
          />
          <p className="text-sm text-muted-foreground mt-1">
            Este campo é preenchido automaticamente pelo sistema com as instruções padrão do ENEM.
          </p>
        </div>

        {/* 6. Texto Motivador I */}
        <div>
          <Label htmlFor="texto_1">Texto Motivador I</Label>
          <Textarea
            id="texto_1"
            value={formData.texto_1}
            onChange={(e) => setFormData({...formData, texto_1: e.target.value})}
            rows={4}
            placeholder="Primeiro texto motivador para a redação..."
          />
        </div>

        {/* 7. Texto Motivador II */}
        <div>
          <Label htmlFor="texto_2">Texto Motivador II</Label>
          <Textarea
            id="texto_2"
            value={formData.texto_2}
            onChange={(e) => setFormData({...formData, texto_2: e.target.value})}
            rows={4}
            placeholder="Segundo texto motivador para a redação..."
          />
        </div>

        {/* 8. Texto Motivador III */}
        <div>
          <Label htmlFor="texto_3">Texto Motivador III</Label>
          <Textarea
            id="texto_3"
            value={formData.texto_3}
            onChange={(e) => setFormData({...formData, texto_3: e.target.value})}
            rows={4}
            placeholder="Terceiro texto motivador para a redação..."
          />
        </div>

        {/* 9. Texto Motivador IV (Image/Charge) - Optional */}
        <Card>
          <CardContent className="p-6">
            <ImageSelector
              title="Texto Motivador IV (Imagem/Charge)"
              description="Use uma charge/infográfico como 4º texto motivador. Escolha upload ou URL."
              required={false}
              value={formData.motivator4}
              onChange={(value) => setFormData({...formData, motivator4: value})}
              minDimensions={{ width: 200, height: 150 }}
              bucket="themes"
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando tema...' : 'Salvar Tema'}
        </Button>
        
        {loading && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Conectando com Supabase e salvando dados...
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
