import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ImageSelector } from './ImageSelector';

type ImageValue = {
  source: 'upload' | 'url';
  url?: string;
  file_path?: string;
  file_size?: number;
  dimensions?: { width: number; height: number };
} | null;

interface VideoFormModernProps {
  mode: 'create' | 'edit';
  initialValues?: {
    id?: string;
    titulo?: string;
    eixo_tematico?: string;
    categoria?: string;
    status_publicacao?: 'publicado' | 'rascunho';
    video_url_original?: string;
    youtube_url?: string;
    cover_source?: 'upload' | 'url' | 'youtube';
    cover_url?: string;
    cover_file_path?: string;
    cover_file_size?: number;
    cover_dimensions?: { width: number; height: number };
  };
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const VideoFormModern = ({ mode, initialValues, onCancel, onSuccess }: VideoFormModernProps) => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('detalhes');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    titulo: '',
    eixo_tematico: '',
    status_publicacao: 'publicado' as 'publicado' | 'rascunho',
    video_url_original: '',
    cover: null as ImageValue,
  });

  const [preview, setPreview] = useState({
    platform: '',
    video_id: '',
    embed_url: '',
    thumbnail_url: '',
  });

  // Detectar plataforma e extrair informações do vídeo
  const detectPlatformAndExtract = (url: string) => {
    if (!url) return null;

    // YouTube
    const youtubeMatch = url.match(/(youtu\.be\/([A-Za-z0-9_-]{11})|v=([A-Za-z0-9_-]{11})|shorts\/([A-Za-z0-9_-]{11})|embed\/([A-Za-z0-9_-]{11}))/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[2] || youtubeMatch[3] || youtubeMatch[4] || youtubeMatch[5];
      return {
        platform: 'youtube',
        video_id: videoId,
        embed_url: `https://www.youtube.com/embed/${videoId}`,
        thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }

    // Instagram
    const instagramMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
    if (instagramMatch) {
      const videoId = instagramMatch[1];
      return {
        platform: 'instagram',
        video_id: videoId,
        embed_url: `https://www.instagram.com/p/${videoId}/embed`,
        thumbnail_url: '',
      };
    }

    return null;
  };

  // Pré-preencher dados no modo edit
  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      // Pre-populate cover image
      let coverValue: ImageValue = null;
      if (initialValues.cover_source === 'upload' && initialValues.cover_file_path) {
        coverValue = {
          source: 'upload',
          file_path: initialValues.cover_file_path,
          file_size: initialValues.cover_file_size,
          dimensions: initialValues.cover_dimensions
        };
      } else if (initialValues.cover_source === 'url' && initialValues.cover_url) {
        coverValue = { source: 'url', url: initialValues.cover_url };
      }

      setFormData({
        titulo: initialValues.titulo || '',
        eixo_tematico: initialValues.eixo_tematico || initialValues.categoria || '',
        status_publicacao: initialValues.status_publicacao || 'publicado',
        video_url_original: initialValues.video_url_original || initialValues.youtube_url || '',
        cover: coverValue,
      });

      // Gerar preview se houver URL
      const url = initialValues.video_url_original || initialValues.youtube_url;
      if (url) {
        const metadata = detectPlatformAndExtract(url);
        if (metadata) {
          setPreview(metadata);
        }
      }
    }
  }, [mode, initialValues]);

  // Atualizar preview quando URL mudar
  useEffect(() => {
    if (formData.video_url_original) {
      const metadata = detectPlatformAndExtract(formData.video_url_original);
      if (metadata) {
        setPreview(metadata);
      } else {
        setPreview({ platform: '', video_id: '', embed_url: '', thumbnail_url: '' });
      }
    } else {
      setPreview({ platform: '', video_id: '', embed_url: '', thumbnail_url: '' });
    }
  }, [formData.video_url_original]);

  const handleAction = () => {
    // Validações básicas
    if (!formData.titulo.trim()) {
      toast.error('Título do vídeo é obrigatório');
      setActiveSection('detalhes');
      return;
    }

    if (!formData.eixo_tematico.trim()) {
      toast.error('Eixo temático é obrigatório');
      setActiveSection('detalhes');
      return;
    }

    if (!formData.video_url_original.trim()) {
      toast.error('Link do vídeo é obrigatório');
      setActiveSection('conteudo');
      return;
    }

    // Verificar se a URL é válida
    const metadata = detectPlatformAndExtract(formData.video_url_original);
    if (!metadata) {
      toast.error('Link deve ser do YouTube ou Instagram');
      setActiveSection('conteudo');
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Determinar a thumbnail final (prioridade: capa manual > YouTube automático)
      let finalThumbnailUrl = preview.thumbnail_url || null;
      if (formData.cover?.source === 'url' && formData.cover.url) {
        finalThumbnailUrl = formData.cover.url;
      } else if (formData.cover?.source === 'upload' && formData.cover.file_path) {
        const { data: publicData } = supabase.storage.from('videos').getPublicUrl(formData.cover.file_path);
        finalThumbnailUrl = publicData.publicUrl;
      }

      // Preparar dados para salvar
      const dataToSave = {
        titulo: formData.titulo.trim(),
        eixo_tematico: formData.eixo_tematico.trim(),
        status_publicacao: formData.status_publicacao,
        video_url_original: formData.video_url_original.trim(),
        platform: preview.platform,
        video_id: preview.video_id,
        embed_url: preview.embed_url,
        thumbnail_url: finalThumbnailUrl,
        // Campos de capa
        cover_source: formData.cover?.source || (preview.thumbnail_url ? 'youtube' : null),
        cover_url: formData.cover?.source === 'url' ? formData.cover.url : null,
        cover_file_path: formData.cover?.source === 'upload' ? formData.cover.file_path : null,
        cover_file_size: formData.cover?.file_size || null,
        cover_dimensions: formData.cover?.dimensions || null,
        // Manter campos antigos para compatibilidade
        categoria: formData.eixo_tematico.trim(),
        youtube_url: formData.video_url_original.trim(),
      };

      let result;
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('videos')
          .insert([dataToSave])
          .select('*')
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('videos')
          .update(dataToSave)
          .eq('id', initialValues?.id)
          .select('*')
          .single();
        result = { data, error };
      }

      if (result.error) {
        console.error('Erro do Supabase:', result.error);
        throw result.error;
      }

      // Invalidar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
      ]);

      toast.success(mode === 'create' ? "Vídeo criado com sucesso!" : "Vídeo atualizado com sucesso!");

      // Reset form ou callback
      if (mode === 'create') {
        setFormData({
          titulo: '',
          eixo_tematico: '',
          status_publicacao: 'publicado',
          video_url_original: '',
          cover: null,
        });
        setPreview({ platform: '', video_id: '', embed_url: '', thumbnail_url: '' });
      } else if (onSuccess) {
        onSuccess();
      }

    } catch (error: unknown) {
      console.error('Erro ao salvar vídeo:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar vídeo");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'conteudo', label: 'Conteúdo' },
  ];

  const toggleSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  return (
    <div className="min-h-screen" style={{ background: '#f7f7fb' }}>
      <div className="max-w-6xl mx-auto p-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header with chips and action buttons */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeSection === section.id
                      ? "text-white"
                      : "text-white",
                    activeSection === section.id
                      ? "bg-[#662F96]"
                      : "bg-[#B175FF] hover:bg-[#662F96]"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAction}
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading ? (mode === 'create' ? 'Criando...' : 'Salvando...') : (mode === 'create' ? 'Criar Vídeo' : 'Salvar Alterações')}
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Detalhes Section */}
            {activeSection === 'detalhes' && (
              <div className="space-y-4">
                {/* Título */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="titulo">Título do Vídeo *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="text-sm mt-2"
                    spellCheck={true}
                  />
                </div>

                {/* Eixo Temático */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="eixo_tematico">Eixo Temático *</Label>
                  <Input
                    id="eixo_tematico"
                    value={formData.eixo_tematico}
                    onChange={(e) => setFormData({...formData, eixo_tematico: e.target.value})}
                    className="text-sm mt-2"
                    spellCheck={true}
                  />
                </div>

                {/* Status */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="status_publicacao">Status *</Label>
                  <Select
                    value={formData.status_publicacao}
                    onValueChange={(value: 'publicado' | 'rascunho') =>
                      setFormData({...formData, status_publicacao: value})
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publicado">Publicado</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Capa/Thumbnail */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <ImageSelector
                    title="Capa do Vídeo"
                    description="Faça upload de uma imagem ou cole uma URL. Se não informar, será usada a thumbnail do YouTube automaticamente."
                    required={false}
                    value={formData.cover}
                    onChange={(value) => setFormData({...formData, cover: value})}
                    minDimensions={{ width: 300, height: 200 }}
                    bucket="videos"
                  />
                </div>
              </div>
            )}

            {/* Conteúdo Section */}
            {activeSection === 'conteudo' && (
              <div className="space-y-4">
                {/* Link do Vídeo */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="video_url_original">Link YouTube/Instagram *</Label>
                  <Input
                    id="video_url_original"
                    type="url"
                    value={formData.video_url_original}
                    onChange={(e) => setFormData({...formData, video_url_original: e.target.value})}
                    className="text-sm mt-2"
                    spellCheck={false}
                  />
                </div>

                {/* Preview */}
                {preview.platform && (
                  <div className="border border-gray-200 rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={preview.platform === 'youtube' ? 'destructive' : 'default'}>
                        {preview.platform === 'youtube' ? 'YouTube' : 'Instagram'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Preview detectado</span>
                    </div>

                    {preview.thumbnail_url ? (
                      <img
                        src={preview.thumbnail_url}
                        alt="Preview do vídeo"
                        className="w-full max-w-md h-auto rounded-lg border"
                      />
                    ) : (
                      <div className="w-full max-w-md h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <span className="text-gray-500">Preview não disponível</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};