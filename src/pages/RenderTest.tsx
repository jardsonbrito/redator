import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EssayData {
  render_image_url?: string;
  render_status?: string;
  render_width?: number;
  render_height?: number;
  nome_aluno?: string;
  texto?: string;
}

const RenderTest = () => {
  const { id } = useParams<{ id: string }>();
  const [essayData, setEssayData] = useState<EssayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEssayData = async () => {
      if (!id) return;

      try {
        // Try different tables to find the essay
        let data = null;
        
        // Try redacoes_enviadas first
        const { data: result1, error: error1 } = await supabase
          .from('redacoes_enviadas')
          .select('render_image_url, render_status, render_width, render_height, nome_aluno, texto')
          .eq('id', id)
          .single();
        
        if (result1 && !error1) {
          data = result1;
        } else {
          // Try redacoes_simulado
          const { data: result2, error: error2 } = await supabase
            .from('redacoes_simulado')
            .select('render_image_url, render_status, render_width, render_height, nome_aluno, texto')
            .eq('id', id)
            .single();
          
          if (result2 && !error2) {
            data = result2;
          } else {
            // Try redacoes_exercicio
            const { data: result3, error: error3 } = await supabase
              .from('redacoes_exercicio')
              .select('render_image_url, render_status, render_width, render_height, nome_aluno, texto')
              .eq('id', id)
              .single();
            
            if (result3 && !error3) {
              data = result3;
            }
          }
        }

        if (data) {
          setEssayData(data);
        } else {
          setError('Essay not found');
        }
      } catch (err) {
        setError(`Error fetching essay: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEssayData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!essayData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-2">Essay Not Found</h1>
          <p className="text-gray-600">No essay data found for ID: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header com informações de debug */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h1 className="text-2xl font-bold mb-4">Essay Render Test - ID: {id}</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Student:</strong> {essayData.nome_aluno || 'N/A'}
            </div>
            <div>
              <strong>Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                essayData.render_status === 'ready' ? 'bg-green-100 text-green-800' :
                essayData.render_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                essayData.render_status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {essayData.render_status || 'unknown'}
              </span>
            </div>
            <div>
              <strong>Render Size:</strong> {essayData.render_width || 'N/A'}x{essayData.render_height || 'N/A'}
            </div>
            <div>
              <strong>Image URL:</strong> 
              {essayData.render_image_url ? (
                <a 
                  href={essayData.render_image_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  View Raw
                </a>
              ) : (
                <span className="ml-1 text-gray-500 text-xs">None</span>
              )}
            </div>
          </div>
        </div>

        {/* Container da imagem - COMPLETAMENTE ISOLADO - TESTE PURO */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">TESTE PURO - Imagem Sem CSS do App</h2>
            <p className="text-sm text-gray-600">
              Validação: Esta imagem deve ter largura natural ~2400px e ocupar toda largura disponível
            </p>
          </div>
          
          {essayData.render_image_url && essayData.render_status === 'ready' ? (
            <div 
              className="w-full"
              style={{
                // ZERO CSS inheritance - completely clean
                padding: 0,
                margin: 0,
                maxWidth: 'none',
                width: '100%',
                display: 'block',
                overflow: 'auto'
              }}
            >
              <img 
                src={essayData.render_image_url}
                alt="Pure Essay Render Test"
                style={{
                  // Pure image display with no constraints
                  display: 'block',
                  width: '100%', // fit-to-width do container 
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: 'none',
                  transform: 'none',
                  zoom: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'white'
                }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  console.log('🖼️ TESTE PURO - Image loaded:', {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: img.offsetWidth,
                    displayHeight: img.offsetHeight,
                    url: img.src,
                    containerWidth: img.parentElement?.offsetWidth
                  });
                  
                  // Verificações de validação
                  if (img.naturalWidth < 2000) {
                    console.warn('⚠️ PROBLEMA NO BACKEND: naturalWidth muito pequena:', img.naturalWidth);
                  }
                  
                  const container = img.parentElement;
                  if (container && Math.abs(container.offsetWidth - img.offsetWidth) > 10) {
                    console.warn('⚠️ PROBLEMA NO FRONTEND: imagem não ocupa toda largura');
                  }
                  
                  if (img.naturalWidth && img.offsetWidth) {
                    const scaleRatio = img.offsetWidth / img.naturalWidth;
                    console.log('📐 Scale ratio:', scaleRatio.toFixed(3));
                  }
                }}
                onError={(e) => {
                  console.error('❌ Erro ao carregar imagem:', e.currentTarget.src);
                }}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {essayData.render_status === 'pending' && (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Renderizando PNG...</p>
                </div>
              )}
              {essayData.render_status === 'error' && (
                <div>
                  <p className="text-red-600">Falha na renderização</p>
                  <p className="text-sm text-gray-500">Verifique logs do backend</p>
                </div>
              )}
              {essayData.render_status === 'rendering' && (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Processando...</p>
                </div>
              )}
              {!essayData.render_status && (
                <p>Nenhum status de renderização disponível</p>
              )}
            </div>
          )}
        </div>

        {/* Text content for comparison */}
        {essayData.texto && (
          <div className="bg-white rounded-lg shadow p-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Original Text Content</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap border p-3 rounded bg-gray-50">
              {essayData.texto}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenderTest;