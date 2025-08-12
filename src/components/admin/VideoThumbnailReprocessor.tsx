import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { processAulaVideoMetadata } from "@/utils/aulaImageUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Video } from "lucide-react";
import { useState } from "react";

interface VideoThumbnailReprocessorProps {
  aulaId: string;
  linkConteudo: string;
  platform?: string | null;
  videoThumbnailUrl?: string | null;
  onThumbnailUpdated?: (newUrl: string) => void;
}

export function VideoThumbnailReprocessor({ 
  aulaId, 
  linkConteudo, 
  platform, 
  videoThumbnailUrl,
  onThumbnailUpdated 
}: VideoThumbnailReprocessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReprocess = async () => {
    if (!linkConteudo) {
      toast.error("Link do conteúdo não encontrado");
      return;
    }

    setIsProcessing(true);
    toast.info("Processando thumbnail do vídeo...");

    try {
      const success = await processAulaVideoMetadata(aulaId, linkConteudo);
      
      if (success) {
        // Fetch updated aula data to get new thumbnail
        const { data: aulaData, error } = await supabase
          .from('aulas')
          .select('*')
          .eq('id', aulaId)
          .single();

        if (!error && aulaData && (aulaData as any).video_thumbnail_url) {
          toast.success("Thumbnail gerada com sucesso!");
          onThumbnailUpdated?.((aulaData as any).video_thumbnail_url);
        } else {
          toast.warning("Não foi possível gerar thumbnail para este vídeo");
        }
      } else {
        toast.error("Falha ao processar o vídeo");
      }
    } catch (error) {
      console.error("Error reprocessing video thumbnail:", error);
      toast.error("Erro ao processar thumbnail");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlatformColor = (platform: string | null) => {
    switch (platform) {
      case 'youtube': return 'bg-red-500 text-white';
      case 'vimeo': return 'bg-blue-500 text-white';
      case 'instagram': return 'bg-pink-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const needsProcessing = platform && platform !== 'youtube' && !videoThumbnailUrl;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="w-4 h-4" />
          Gestão de Thumbnail do Vídeo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {platform && (
            <Badge className={getPlatformColor(platform)}>
              {platform.toUpperCase()}
            </Badge>
          )}
          
          {videoThumbnailUrl ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✅ Thumbnail Disponível
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              ⚠️ Sem Thumbnail
            </Badge>
          )}
        </div>

        <div className="text-sm text-gray-600">
          {platform === 'youtube' && videoThumbnailUrl && 
            "Thumbnail do YouTube carregada automaticamente"}
          {platform === 'youtube' && !videoThumbnailUrl && 
            "YouTube deveria ter thumbnail automática"}
          {needsProcessing && 
            "Este vídeo pode ter thumbnail gerada automaticamente a partir de um frame"}
          {!platform && 
            "Link não reconhecido como vídeo suportado"}
        </div>

        {videoThumbnailUrl && (
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <img 
              src={videoThumbnailUrl}
              alt="Thumbnail atual"
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        {(needsProcessing || !videoThumbnailUrl) && (
          <Button 
            onClick={handleReprocess}
            disabled={isProcessing}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Processando...' : 'Gerar Thumbnail do Vídeo'}
          </Button>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          <strong>Como funciona:</strong>
          <br />• YouTube: Thumbnail automática
          <br />• Vimeo/Instagram: Captura frame do vídeo
          <br />• Outros: Tentativa de captura de frame
        </div>
      </CardContent>
    </Card>
  );
}