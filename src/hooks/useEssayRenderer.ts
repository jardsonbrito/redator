import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RenderEssayParams {
  essayId: string;
  tableOrigin: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';
  text: string;
  studentName: string;
  thematicPhrase: string;
  sendDate: string;
  turma?: string;
}

export function useEssayRenderer() {
  const [isRendering, setIsRendering] = useState(false);
  const { toast } = useToast();

  const renderEssay = async (params: RenderEssayParams): Promise<string | null> => {
    setIsRendering(true);
    
    try {
      console.log('🎨 Starting essay render:', params.essayId);
      
      // Call the edge function to render the essay
      const { data, error } = await supabase.functions.invoke('render-essay-to-image', {
        body: params
      });

      if (error) {
        console.error('Render function error:', error);
        throw new Error(error.message || 'Failed to render essay');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Render failed');
      }

      console.log('✅ Essay rendered successfully:', data.imageUrl);
      return data.imageUrl;

    } catch (error) {
      console.error('💥 Render error:', error);
      toast({
        title: "Erro na renderização",
        description: "Não foi possível converter a redação em imagem. Tente novamente.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsRendering(false);
    }
  };

  const checkRenderStatus = async (essayId: string, tableOrigin: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio'): Promise<{
    status: string;
    imageUrl?: string;
  }> => {
    try {
      let data: any, error: any;

      if (tableOrigin === 'redacoes_enviadas') {
        ({ data, error } = await supabase
          .from('redacoes_enviadas')
          .select('render_status, render_image_url')
          .eq('id', essayId)
          .single());
      } else if (tableOrigin === 'redacoes_simulado') {
        ({ data, error } = await supabase
          .from('redacoes_simulado')
          .select('render_status, render_image_url')
          .eq('id', essayId)
          .single());
      } else if (tableOrigin === 'redacoes_exercicio') {
        ({ data, error } = await supabase
          .from('redacoes_exercicio')
          .select('render_status, render_image_url')
          .eq('id', essayId)
          .single());
      }

      if (error) {
        console.error('Error checking render status:', error);
        return { status: 'error' };
      }

      return {
        status: data?.render_status || 'pending',
        imageUrl: data?.render_image_url || undefined
      };
    } catch (error) {
      console.error('Error checking render status:', error);
      return { status: 'error' };
    }
  };

  const retryRender = async (params: RenderEssayParams): Promise<string | null> => {
    // Reset status to pending before retrying
    if (params.tableOrigin === 'redacoes_enviadas') {
      await supabase
        .from('redacoes_enviadas')
        .update({ render_status: 'pending' })
        .eq('id', params.essayId);
    } else if (params.tableOrigin === 'redacoes_simulado') {
      await supabase
        .from('redacoes_simulado')
        .update({ render_status: 'pending' })
        .eq('id', params.essayId);
    } else if (params.tableOrigin === 'redacoes_exercicio') {
      await supabase
        .from('redacoes_exercicio')
        .update({ render_status: 'pending' })
        .eq('id', params.essayId);
    }

    return renderEssay(params);
  };

  return {
    renderEssay,
    checkRenderStatus,
    retryRender,
    isRendering
  };
}