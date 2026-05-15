import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, Clock } from 'lucide-react';

function extrairYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

interface JarvisVideoModalProps {
  aberto: boolean;
  titulo: string;
  urlYoutube: string;
  onAssistirDepois: () => void;
}

export function JarvisVideoModal({
  aberto,
  titulo,
  urlYoutube,
  onAssistirDepois,
}: JarvisVideoModalProps) {
  const [assistindo, setAssistindo] = useState(false);
  const videoId = extrairYoutubeId(urlYoutube);

  const handleAssistirAgora = () => {
    setAssistindo(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onAssistirDepois();
  };

  return (
    <Dialog open={aberto} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-indigo-600" />
            {titulo}
          </DialogTitle>
          {!assistindo && (
            <DialogDescription>
              Preparamos um vídeo de orientação para ajudar você a usar a plataforma.
            </DialogDescription>
          )}
        </DialogHeader>

        {assistindo && videoId ? (
          <div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {videoId && (
              <div
                className="relative rounded-lg overflow-hidden border border-gray-200 aspect-video cursor-pointer group"
                onClick={handleAssistirAgora}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt={titulo}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="bg-white/90 rounded-full p-4 shadow-lg">
                    <PlayCircle className="w-10 h-10 text-red-600" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAssistirAgora}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Assistir agora
              </Button>
              <Button
                variant="outline"
                onClick={onAssistirDepois}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                Assistir depois
              </Button>
            </div>
          </div>
        )}

        {assistindo && (
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onAssistirDepois}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
