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

        {/* Container da imagem - COMPLETAMENTE ISOLADO */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Rendered Essay Image (No CSS Inheritance)</h2>
            <p className="text-sm text-gray-600">
              This image should display at full size without any form constraints
            </p>
          </div>
          
          {essayData.render_image_url && essayData.render_status === 'ready' ? (
            <div 
              className="w-full overflow-auto"
              style={{
                // ZERO CSS inheritance - completely clean
                padding: 0,
                margin: 0,
                maxWidth: 'none',
                width: '100%',
                display: 'block'
              }}
            >
              <img 
                src={essayData.render_image_url}
                alt="Rendered Essay"
                style={{
                  // Pure image display with no constraints
                  display: 'block',
                  width: 'auto', // Use natural width
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: 'none',
                  transform: 'none',
                  zoom: 1,
                  border: 'none',
                  outline: 'none'
                }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  console.log('🖼️ Image loaded:', {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: img.offsetWidth,
                    displayHeight: img.offsetHeight,
                    url: img.src
                  });
                }}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {essayData.render_status === 'pending' && (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Rendering in progress...</p>
                </div>
              )}
              {essayData.render_status === 'error' && (
                <div>
                  <p className="text-red-600">Render failed</p>
                  <p className="text-sm text-gray-500">Check backend logs for details</p>
                </div>
              )}
              {!essayData.render_status && (
                <p>No render status available</p>
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