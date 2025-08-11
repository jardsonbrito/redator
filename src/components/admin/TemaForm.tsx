
import { useState, useEffect } from 'react';
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
import { ArrowLeft } from 'lucide-react';

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

interface TemaFormProps {
  mode?: 'create' | 'edit';
  temaId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const TemaForm = ({ mode = 'create', temaId, onCancel, onSuccess }: TemaFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
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

  // Load existing theme data when in edit mode
  useEffect(() => {
    if (mode === 'edit' && temaId) {
      const loadTheme = async () => {
        try {
          const { data, error } = await supabase
            .from('temas')
            .select('*')
            .eq('id', temaId)
            .single();

          if (error) throw error;

          // Pre-populate cover image
          let coverValue: ImageValue = null;
          if (data.cover_file_path) {
            coverValue = { 
              source: 'upload', 
              file_path: data.cover_file_path,
              file_size: data.cover_file_size,
              dimensions: data.cover_dimensions as { width: number; height: number } | undefined
            };
          } else if (data.cover_url) {
            coverValue = { source: 'url', url: data.cover_url };
          } else if (data.imagem_texto_4_url) {
            // Legacy fallback
            coverValue = { source: 'url', url: data.imagem_texto_4_url };
          }

          // Pre-populate motivator IV
          let motivator4Value: ImageValue = null;
          if (data.motivator4_source !== 'none' && data.motivator4_source) {
            if (data.motivator4_file_path) {
              motivator4Value = { 
                source: 'upload', 
                file_path: data.motivator4_file_path,
                file_size: data.motivator4_file_size,
                dimensions: data.motivator4_dimensions as { width: number; height: number } | undefined
              };
            } else if (data.motivator4_url) {
              motivator4Value = { source: 'url', url: data.motivator4_url };
            }
          }

          setFormData({
            frase_tematica: data.frase_tematica || '',
            eixo_tematico: data.eixo_tematico || '',
            status: data.status || 'publicado',
            cabecalho_enem: data.cabecalho_enem || 'Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema apresentado, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.',
            texto_1: data.texto_1 || '',
            texto_2: data.texto_2 || '',
            texto_3: data.texto_3 || '',
            cover: coverValue,
            motivator4: motivator4Value
          });
        } catch (error: any) {
          toast({
            title: "❌ Erro",
            description: "Erro ao carregar tema: " + error.message,
            variant: "destructive",
          });
        } finally {
          setLoadingData(false);
        }
      };

      loadTheme();
    }
  }, [mode, temaId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate cover image is required only for create mode
    if (mode === 'create' && !formData.cover) {
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
      const dataToSave: any = {
        frase_tematica: String(formData.frase_tematica || '').trim(),
        eixo_tematico: String(formData.eixo_tematico || '').trim(),
        status: formData.status,
        cabecalho_enem: String(formData.cabecalho_enem || '').trim(),
        texto_1: formData.texto_1 ? String(formData.texto_1).trim() : null,
        texto_2: formData.texto_2 ? String(formData.texto_2).trim() : null,
        texto_3: formData.texto_3 ? String(formData.texto_3).trim() : null,
        // Cover image fields
        cover_source: formData.cover?.source || 'url',
        cover_url: formData.cover?.url || null,
        cover_file_path: formData.cover?.file_path || null,
        cover_file_size: formData.cover?.file_size || null,
        cover_dimensions: formData.cover?.dimensions || null,
        // Motivator 4 fields
        motivator4_source: formData.motivator4?.source || 'none',
        motivator4_url: formData.motivator4?.url || null,
        motivator4_file_path: formData.motivator4?.file_path || null,
        motivator4_file_size: formData.motivator4?.file_size || null,
        motivator4_dimensions: formData.motivator4?.dimensions || null,
      };

      if (mode === 'create') {
        dataToSave.publicado_em = new Date().toISOString();
      }

      console.log('Dados preparados para salvar:', dataToSave);

      // Salvar no Supabase (create ou update)
      const { data, error } = mode === 'create' 
        ? await supabase.from('temas').insert([dataToSave]).select('*').single()
        : await supabase.from('temas').update(dataToSave).eq('id', temaId).select('*').single();

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
        ...(temaId ? [queryClient.invalidateQueries({ queryKey: ['tema', temaId] })] : [])
      ]);

      toast({
        title: "✅ Sucesso!",
        description: mode === 'create' 
          ? `Tema cadastrado como ${formData.status === 'rascunho' ? 'rascunho' : 'publicado'} no banco de dados.`
          : 'Tema atualizado com sucesso.',
      });

      if (mode === 'create') {
        // Limpar formulário apenas no modo create
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
      } else {
        // No modo edit, chamar onSuccess callback
        onSuccess?.();
      }

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

  if (loadingData) {
    return <div className="text-center py-4">Carregando dados do tema...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header with back button for edit mode */}
      {mode === 'edit' && (
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <h3 className="text-lg font-semibold text-redactor-primary">Editar Tema</h3>
        </div>
      )}

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

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (mode === 'edit' ? 'Salvando alterações...' : 'Salvando tema...') : (mode === 'edit' ? 'Salvar Alterações' : 'Salvar Tema')}
          </Button>
          {mode === 'edit' && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
        </div>
        
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
