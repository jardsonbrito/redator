import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Eye } from 'lucide-react';
import { useEssayRenderer } from '@/hooks/useEssayRenderer';
import { getEssayDisplayUrl, isTypedEssay, needsRendering, getEssayText } from '@/utils/essayUtils';

interface EssayRendererProps {
  redacao: {
    id: string;
    redacao_manuscrita_url?: string;
    redacao_texto?: string;
    texto?: string;
    render_image_url?: string;
    render_status?: string;
    nome_aluno?: string;
    frase_tematica?: string;
    data_envio?: string;
    turma?: string;
    tipo_redacao?: string;
  };
  tableOrigin: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';
  onImageReady: (imageUrl: string) => void;
  className?: string;
}

export function EssayRenderer({ redacao, tableOrigin, onImageReady, className = "" }: EssayRendererProps) {
  const [renderStatus, setRenderStatus] = useState(redacao.render_status || 'pending');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  
  const { renderEssay, checkRenderStatus, retryRender, isRendering } = useEssayRenderer();

  // Check if this is a typed essay that needs rendering
  const needsRender = isTypedEssay(redacao) && needsRendering(redacao);

  useEffect(() => {
    console.log('🎯 EssayRenderer Effect:', {
      essayId: redacao.id,
      needsRender,
      render_status: redacao.render_status,
      hasImage: !!redacao.render_image_url,
      isTyped: isTypedEssay(redacao),
      manuscritaUrl: redacao.redacao_manuscrita_url
    });

    const currentImageUrl = getEssayDisplayUrl(redacao);
    
    if (currentImageUrl) {
      console.log('✅ Image already available:', currentImageUrl);
      setImageUrl(currentImageUrl);
      setRenderStatus('ready');
      onImageReady(currentImageUrl);
      return;
    }

    // If it's a typed essay without image, start rendering immediately
    if (needsRender) {
      console.log('🎨 Starting render process for typed essay');
      handleManualRender();
    }
  }, [redacao.render_status, redacao.render_image_url, redacao.redacao_manuscrita_url, redacao.id]);

  const startPolling = async () => {
    if (polling) return;
    
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      const result = await checkRenderStatus(redacao.id, tableOrigin);
      setRenderStatus(result.status);
      
      if (result.status === 'ready' && result.imageUrl) {
        setImageUrl(result.imageUrl);
        onImageReady(result.imageUrl);
        clearInterval(pollInterval);
        setPolling(false);
        return;
      }
      
      if (result.status === 'error' || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setPolling(false);
        return;
      }
    }, 2000);
  };

  const handleManualRender = async () => {
    console.log('🚀 Manual render triggered for essay:', redacao.id);
    
    const params = {
      essayId: redacao.id,
      tableOrigin,
      text: getEssayText(redacao),
      studentName: redacao.nome_aluno || 'Aluno',
      thematicPhrase: redacao.frase_tematica || 'Tema Livre',
      sendDate: redacao.data_envio ? new Date(redacao.data_envio).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      turma: redacao.turma || 'Visitante'
    };

    console.log('📋 Render params:', params);
    setRenderStatus('rendering');

    const result = await renderEssay(params);
    
    console.log('🎯 Render result:', result);
    
    if (result) {
      setImageUrl(result);
      setRenderStatus('ready');
      onImageReady(result);
      console.log('✅ Render completed successfully:', result);
    } else {
      setRenderStatus('error');
      console.log('❌ Render failed');
    }
  };

  const handleRetry = async () => {
    console.log('🔄 Retry render for essay:', redacao.id);
    
    const params = {
      essayId: redacao.id,
      tableOrigin,
      text: getEssayText(redacao),
      studentName: redacao.nome_aluno || 'Aluno',
      thematicPhrase: redacao.frase_tematica || 'Tema Livre',
      sendDate: redacao.data_envio ? new Date(redacao.data_envio).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      turma: redacao.turma || 'Visitante'
    };

    setRenderStatus('rendering');
    const result = await retryRender(params);
    
    if (result) {
      setImageUrl(result);
      setRenderStatus('ready');
      onImageReady(result);
      console.log('✅ Retry completed successfully:', result);
    } else {
      setRenderStatus('error');
      console.log('❌ Retry failed');
    }
  };

  // If it's a handwritten essay, just return the image
  if (!isTypedEssay(redacao) && redacao.redacao_manuscrita_url) {
    return (
      <div className={`correction-pane ${className}`}>
        <div className="essay-image-wrapper">
          <img 
            src={redacao.redacao_manuscrita_url} 
            alt="Redação manuscrita"
            className="essay-image"
            onLoad={() => onImageReady(redacao.redacao_manuscrita_url!)}
          />
        </div>
      </div>
    );
  }

  // For typed essays, show rendering status
  if (needsRender) {
    return (
      <div className={`correction-pane ${className}`}>
        <div className="p-8 text-center space-y-4">
          {renderStatus === 'pending' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Preparando visualização da redação digitada...
                {polling && <div className="text-xs text-muted-foreground mt-1">Verificando status...</div>}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={handleManualRender} disabled={isRendering}>
                    {isRendering ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />}
                    {isRendering ? 'Processando...' : 'Forçar renderização'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {renderStatus === 'rendering' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Gerando imagem da redação...
              </AlertDescription>
            </Alert>
          )}
          
          {renderStatus === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>
                Falha ao preparar visualização. 
                <div className="mt-2 space-x-2">
                  <Button size="sm" variant="outline" onClick={handleRetry} disabled={isRendering}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tentar novamente
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleManualRender} disabled={isRendering}>
                    <Eye className="h-3 w-3 mr-1" />
                    Processar agora
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {(!renderStatus || renderStatus === 'unknown') && (
            <Alert>
              <AlertDescription>
                Redação digitada detectada.
                <div className="mt-2">
                  <Button size="sm" onClick={handleManualRender} disabled={isRendering}>
                    <Eye className="h-3 w-3 mr-1" />
                    {isRendering ? 'Processando...' : 'Preparar para correção'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  // If any image URL is available (typed or handwritten), show it
  if (imageUrl) {
    return (
      <div className={`correction-pane ${className}`}>
        <div className="essay-image-wrapper">
          <img 
            src={imageUrl} 
            alt={isTypedEssay(redacao) ? "Redação renderizada" : "Redação manuscrita"}
            className="essay-image"
            onLoad={() => onImageReady(imageUrl)}
          />
        </div>
      </div>
    );
  }

  return null;
}