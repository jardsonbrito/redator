import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ExternalLink, PlayCircle } from 'lucide-react';

function extrairYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function JarvisVideoInstrucao() {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState('Como usar o Jarvis Corretor');
  const [url, setUrl] = useState('');
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('jarvis_video_instrucao')
        .select('id, titulo, url_youtube')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setTitulo(data.titulo || '');
        setUrl(data.url_youtube || '');
      }
      setLoading(false);
    };
    carregar();
  }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      if (rowId) {
        const { error } = await supabase
          .from('jarvis_video_instrucao')
          .update({ titulo, url_youtube: url, atualizado_em: new Date().toISOString() })
          .eq('id', rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('jarvis_video_instrucao')
          .insert({ titulo, url_youtube: url })
          .select('id')
          .single();
        if (error) throw error;
        setRowId(data.id);
      }
      toast({ title: 'Vídeo salvo com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const videoId = extrairYoutubeId(url);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold text-gray-800">Vídeo de instrução para professores</h3>
        <p className="text-sm text-gray-500 mt-1">
          Este vídeo aparece automaticamente para o professor ao acessar a plataforma.
          Ele pode assistir agora ou optar por assistir depois.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="titulo-video">Título exibido no modal</Label>
          <Input
            id="titulo-video"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ex: Como usar o Jarvis Corretor"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="url-video">URL do YouTube</Label>
          <div className="flex gap-2">
            <Input
              id="url-video"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1"
            />
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline" size="icon" title="Abrir no YouTube">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>
          {url && !videoId && (
            <p className="text-xs text-red-500">URL inválida. Cole o link completo do YouTube.</p>
          )}
        </div>

        {videoId && (
          <div className="rounded-lg overflow-hidden border border-gray-200 aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {!url && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 p-6 text-gray-400">
            <PlayCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">Cole a URL do YouTube para visualizar o vídeo aqui.</span>
          </div>
        )}

        <Button onClick={salvar} disabled={salvando || !titulo.trim()} className="bg-indigo-600 hover:bg-indigo-700">
          {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar vídeo
        </Button>
      </div>
    </div>
  );
}
