import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, Trash2, X, Maximize2, Minimize2 } from "lucide-react";
import html2canvas from 'html2canvas';

// Importar Annotorious
import { Annotorious } from '@recogito/annotorious';

// Importar CSS do Annotorious
import '@recogito/annotorious/dist/annotorious.min.css';

// Interface que corresponde à estrutura real da tabela no banco
interface AnotacaoVisual {
  id?: string;
  redacao_id: string;
  corretor_id: string;
  competencia: number;
  cor_marcacao: string;
  comentario: string;
  tabela_origem: string;
  x_start: number;
  y_start: number;
  x_end: number;
  y_end: number;
  imagem_largura: number;
  imagem_altura: number;
  criado_em?: string;
  atualizado_em?: string;
}

interface RedacaoAnotacaoVisualProps {
  imagemUrl: string;
  redacaoId: string;
  corretorId: string;
  readonly?: boolean;
}

interface RedacaoAnotacaoVisualRef {
  salvarTodasAnotacoes: () => Promise<void>;
  gerarImagemComAnotacoes: () => Promise<string>;
}

const CORES_COMPETENCIAS = {
  1: { cor: '#E53935', nome: 'Vermelho', label: 'Competência 1' },
  2: { cor: '#43A047', nome: 'Verde', label: 'Competência 2' },
  3: { cor: '#1E88E5', nome: 'Azul', label: 'Competência 3' },
  4: { cor: '#8E24AA', nome: 'Roxo', label: 'Competência 4' },
  5: { cor: '#FB8C00', nome: 'Laranja', label: 'Competência 5' },
};

export const RedacaoAnotacaoVisual = forwardRef<RedacaoAnotacaoVisualRef, RedacaoAnotacaoVisualProps>(({ 
  imagemUrl, 
  redacaoId, 
  corretorId,
  readonly = false 
}, ref) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annotoriousRef = useRef<any>(null);
  
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [dialogAberto, setDialogAberto] = useState<boolean>(false);
  const [comentarioTemp, setComentarioTemp] = useState<string>("");
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisual[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  // Expor métodos para o componente pai
  useImperativeHandle(ref, () => ({
    salvarTodasAnotacoes,
    gerarImagemComAnotacoes
  }));

  // Carregar anotações existentes
  const carregarAnotacoes = async () => {
    try {
      const { data: marcacoesData, error: marcacoesError } = await supabase
        .from('marcacoes_visuais')
        .select('*')
        .eq('redacao_id', redacaoId);
      
      if (marcacoesError) {
        console.error('Erro ao carregar anotações:', marcacoesError);
        setAnotacoes([]);
        return;
      }
      
      const convertedData: AnotacaoVisual[] = (marcacoesData || []).map(item => ({
        id: item.id,
        redacao_id: item.redacao_id,
        corretor_id: item.corretor_id,
        competencia: item.competencia,
        cor_marcacao: item.cor_marcacao,
        comentario: item.comentario,
        tabela_origem: item.tabela_origem,
        x_start: Number(item.x_start),
        y_start: Number(item.y_start),
        x_end: Number(item.x_end),
        y_end: Number(item.y_end),
        imagem_largura: item.imagem_largura,
        imagem_altura: item.imagem_altura,
        criado_em: item.criado_em,
        atualizado_em: item.atualizado_em
      }));
      
      setAnotacoes(convertedData);
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
      setAnotacoes([]);
    }
  };

  // Handle image load
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
      console.log('Imagem carregada:', {
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  };

  // Inicializar Annotorious
  useEffect(() => {
    if (!imageRef.current || !imageLoaded || imageDimensions.width === 0) return;

    // Verificar se é desktop (>= 1024px)
    if (window.innerWidth < 1024) {
      toast({
        title: "Aviso",
        description: "A ferramenta de correção visual não está disponível para dispositivos móveis.",
        variant: "destructive"
      });
      return;
    }

    let anno: any = null;
    let cleanupFunctions: (() => void)[] = [];

    const initAnnotorious = async () => {
      try {
        console.log('Inicializando Annotorious...');
        console.log('Image dimensions:', imageDimensions);
        
        // Limpar instância anterior
        if (annotoriousRef.current) {
          try {
            annotoriousRef.current.destroy();
          } catch (e) {
            console.log('Erro ao destruir instância anterior:', e);
          }
          annotoriousRef.current = null;
        }

        // Aguardar um momento para garantir que a imagem esteja totalmente carregada
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar se a imagem ainda existe e está carregada
        if (!imageRef.current || !imageRef.current.complete) {
          console.error('Imagem não está pronta');
          return;
        }
        
        // Configuração mais robusta do Annotorious
        anno = new Annotorious({
          image: imageRef.current,
          disableEditor: true,
          allowEmpty: false,
          drawOnSingleClick: false,
          readOnly: readonly,
          formatters: [
            function(annotation: any) {
              const competencia = annotation.body?.[0]?.purpose || competenciaSelecionada;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              
              if (corCompetencia) {
                const r = parseInt(corCompetencia.cor.slice(1, 3), 16);
                const g = parseInt(corCompetencia.cor.slice(3, 5), 16);
                const b = parseInt(corCompetencia.cor.slice(5, 7), 16);
                
                return {
                  className: `competencia-${competencia}`,
                  style: `fill: rgba(${r}, ${g}, ${b}, 0.15); stroke: ${corCompetencia.cor}; stroke-width: 2px; cursor: pointer;`
                };
              }
              return {
                style: 'fill: rgba(255, 0, 0, 0.15); stroke: #ff0000; stroke-width: 2px; cursor: pointer;'
              };
            }
          ]
        });

        if (!readonly) {
          // Configurar eventos para modo de edição
          const onCreateSelection = (selection: any) => {
            console.log('Selection created:', selection);
            
            try {
              // Extrair e validar coordenadas
              const selectorValue = selection.target?.selector?.value;
              if (!selectorValue) {
                console.error('Seletor inválido:', selection);
                return;
              }
              
              console.log('Selector value:', selectorValue);
              
              let x: number, y: number, width: number, height: number;
              
              // Parse das coordenadas - suportar múltiplos formatos
              if (selectorValue.includes('xywh=percent:')) {
                const match = selectorValue.match(/xywh=percent:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
                if (!match || match.length !== 5) {
                  console.error('Formato percent inválido:', selectorValue);
                  return;
                }
                
                const [, xPercent, yPercent, wPercent, hPercent] = match.map(parseFloat);
                
                x = Math.round(xPercent / 100 * imageDimensions.width);
                y = Math.round(yPercent / 100 * imageDimensions.height);
                width = Math.round(wPercent / 100 * imageDimensions.width);
                height = Math.round(hPercent / 100 * imageDimensions.height);
              } else if (selectorValue.includes('xywh=pixel:')) {
                const match = selectorValue.match(/xywh=pixel:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
                if (!match || match.length !== 5) {
                  console.error('Formato pixel inválido:', selectorValue);
                  return;
                }
                
                [, x, y, width, height] = match.map(parseFloat);
              } else {
                console.error('Formato desconhecido do seletor:', selectorValue);
                return;
              }

              console.log('Coordenadas calculadas:', { x, y, width, height });

              // Validar coordenadas finais
              if (x < 0 || y < 0 || width <= 0 || height <= 0) {
                console.error('Coordenadas fora dos limites:', { x, y, width, height });
                return;
              }

              const annotationData = {
                id: `temp_${Date.now()}`,
                target: {
                  selector: {
                    type: "FragmentSelector",
                    value: `xywh=pixel:${x},${y},${width},${height}`
                  }
                },
                body: [{
                  type: "TextualBody",
                  purpose: competenciaSelecionada,
                  value: ""
                }],
                bounds: { x, y, width, height }
              };

              setCurrentAnnotation(annotationData);
              setComentarioTemp("");
              console.log('Abrindo popup de anotação');
              // Forçar abertura imediata do dialog
              setTimeout(() => setDialogAberto(true), 0);
              
            } catch (error) {
              console.error('Erro ao processar seleção:', error);
            }
          };

          const onClickAnnotation = (annotation: any) => {
            try {
              const comment = annotation.body?.[0]?.value || '';
              const competencia = annotation.body?.[0]?.purpose || 1;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              
              const shouldDelete = confirm(`Remover esta anotação?\n\n${corCompetencia?.label}: ${comment}`);
              if (shouldDelete && annotation.id) {
                removerAnotacao(annotation.id);
              }
            } catch (error) {
              console.error('Erro ao processar clique na anotação:', error);
            }
          };

          // Registrar eventos corretamente (sem duplicação)
          anno.on('createSelection', onCreateSelection);
          anno.on('clickAnnotation', onClickAnnotation);

          // Adicionar às funções de limpeza
          cleanupFunctions.push(() => {
            if (anno) {
              anno.off('createSelection', onCreateSelection);
              anno.off('clickAnnotation', onClickAnnotation);
            }
          });
        } else {
          // Modo de leitura
          const onClickAnnotation = (annotation: any) => {
            try {
              const comment = annotation.body?.[0]?.value || '';
              const competencia = annotation.body?.[0]?.purpose || 1;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              
              toast({
                title: `${corCompetencia?.label || 'Anotação'}`,
                description: comment,
                duration: 4000,
              });
            } catch (error) {
              console.error('Erro ao mostrar anotação:', error);
            }
          };

          anno.on('clickAnnotation', onClickAnnotation);
          cleanupFunctions.push(() => {
            if (anno) {
              anno.off('clickAnnotation', onClickAnnotation);
            }
          });
        }

        annotoriousRef.current = anno;

        // Carregar anotações existentes
        setTimeout(() => {
          carregarEAplicarAnotacoes();
        }, 100);

        console.log('Annotorious inicializado com sucesso');

      } catch (error) {
        console.error('Erro ao inicializar Annotorious:', error);
        toast({
          title: "Erro",
          description: "Não foi possível inicializar o sistema de anotações.",
          variant: "destructive"
        });
      }
    };

    // Inicializar após um pequeno delay
    const timer = setTimeout(initAnnotorious, 200);
    
    return () => {
      clearTimeout(timer);
      
      // Executar todas as funções de limpeza
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (e) {
          console.log('Erro na limpeza:', e);
        }
      });
      
      if (anno) {
        try {
          anno.destroy();
        } catch (e) {
          console.log('Erro ao destruir Annotorious:', e);
        }
        annotoriousRef.current = null;
      }
    };
  }, [imageLoaded, imageDimensions.width, imageDimensions.height, readonly]);

  // Carregar e aplicar anotações no Annotorious
  const carregarEAplicarAnotacoes = async () => {
    if (!annotoriousRef.current) return;
    
    try {
      await carregarAnotacoes();
      
      // Converter anotações do banco para formato Annotorious
      const annotoriousAnnotations = anotacoes.map((anotacao) => {
        const x = anotacao.x_start / imageDimensions.width;
        const y = anotacao.y_start / imageDimensions.height;
        const w = (anotacao.x_end - anotacao.x_start) / imageDimensions.width;
        const h = (anotacao.y_end - anotacao.y_start) / imageDimensions.height;

        return {
          id: anotacao.id,
          type: "Annotation",
          target: {
            selector: {
              type: "FragmentSelector",
              value: `xywh=percent:${x},${y},${w},${h}`
            }
          },
          body: [{
            type: "TextualBody",
            purpose: anotacao.competencia,
            value: anotacao.comentario
          }]
        };
      });

      // Aplicar anotações no Annotorious
      annotoriousRef.current.setAnnotations(annotoriousAnnotations);

    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  // Atualizar anotações quando mudarem
  useEffect(() => {
    if (annotoriousRef.current && anotacoes.length >= 0) {
      carregarEAplicarAnotacoes();
    }
  }, [anotacoes, imageDimensions]);

  // Salvar anotação
  const salvarAnotacao = async () => {
    console.log('=== INICIANDO SALVAMENTO ===');
    console.log('currentAnnotation:', currentAnnotation);
    console.log('comentarioTemp:', comentarioTemp);
    console.log('competenciaSelecionada:', competenciaSelecionada);
    console.log('redacaoId:', redacaoId);
    console.log('corretorId:', corretorId);
    
    if (!currentAnnotation || !comentarioTemp.trim()) {
      toast({
        title: "Erro",
        description: "Comentário não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const bounds = currentAnnotation.bounds;
      console.log('bounds:', bounds);

      if (!bounds || bounds.x === undefined || bounds.y === undefined) {
        console.error('Bounds inválido:', bounds);
        throw new Error('Coordenadas da anotação não encontradas');
      }

      const novaAnotacao = {
        redacao_id: redacaoId,
        corretor_id: corretorId,
        competencia: competenciaSelecionada,
        cor_marcacao: CORES_COMPETENCIAS[competenciaSelecionada].cor,
        comentario: comentarioTemp.trim(),
        tabela_origem: 'redacoes_enviadas',
        x_start: bounds.x,
        y_start: bounds.y,
        x_end: bounds.x + bounds.width,
        y_end: bounds.y + bounds.height,
        imagem_largura: imageDimensions.width,
        imagem_altura: imageDimensions.height
      };

      console.log('=== DADOS DA ANOTAÇÃO ===');
      console.log('novaAnotacao:', JSON.stringify(novaAnotacao, null, 2));

      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .insert(novaAnotacao)
        .select()
        .single();

      console.log('=== RESULTADO DO SUPABASE ===');
      console.log('data:', data);
      console.log('error:', error);

      if (error) {
        console.error('=== ERRO SUPABASE DETALHADO ===');
        console.error('message:', error.message);
        console.error('details:', error.details);
        console.error('hint:', error.hint);
        console.error('code:', error.code);
        throw error;
      }

      console.log('=== ANOTAÇÃO SALVA COM SUCESSO ===');
      console.log('data salva:', data);

      // Criar anotação para Annotorious
      const x = bounds.x / imageDimensions.width;
      const y = bounds.y / imageDimensions.height;
      const w = bounds.width / imageDimensions.width;
      const h = bounds.height / imageDimensions.height;

      const annotoriousAnnotation = {
        id: data.id,
        type: "Annotation",
        target: {
          selector: {
            type: "FragmentSelector",
            value: `xywh=percent:${x},${y},${w},${h}`
          }
        },
        body: [{
          type: "TextualBody",
          purpose: competenciaSelecionada,
          value: comentarioTemp.trim()
        }]
      };

      console.log('=== ADICIONANDO AO ANNOTORIOUS ===');
      console.log('annotoriousAnnotation:', annotoriousAnnotation);

      // Adicionar ao Annotorious
      if (annotoriousRef.current) {
        annotoriousRef.current.addAnnotation(annotoriousAnnotation);
        console.log('Anotação adicionada ao Annotorious');
      } else {
        console.warn('Annotorious não disponível');
      }

      toast({
        title: "Anotação salva!",
        description: "Comentário adicionado com sucesso.",
      });

      setDialogAberto(false);
      setCurrentAnnotation(null);
      setComentarioTemp("");
      
      // Recarregar anotações
      console.log('=== RECARREGANDO ANOTAÇÕES ===');
      await carregarAnotacoes();
      console.log('=== FINALIZADO COM SUCESSO ===');

    } catch (error) {
      console.error('=== ERRO GERAL NO SALVAMENTO ===');
      console.error('Error object:', error);
      
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido ao salvar anotação';
      console.error('Error message:', errorMessage);
      
      if (error?.stack) {
        console.error('Error stack:', error.stack);
      }
      
      toast({
        title: "Erro ao salvar anotação",
        description: `Erro detalhado: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Cancelar anotação
  const cancelarAnotacao = () => {
    setDialogAberto(false);
    setCurrentAnnotation(null);
    setComentarioTemp("");
  };

  // Salvar todas as anotações pendentes
  const salvarTodasAnotacoes = async () => {
    // As anotações já são salvas individualmente
    return;
  };

  // Remover anotação
  const removerAnotacao = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from('marcacoes_visuais')
        .delete()
        .eq('id', annotationId);
      
      if (error) throw error;

      // Remover do Annotorious
      if (annotoriousRef.current) {
        annotoriousRef.current.removeAnnotation(annotationId);
      }

      toast({
        title: "Anotação removida",
        description: "A marcação foi excluída com sucesso.",
      });

      // Recarregar anotações
      await carregarAnotacoes();
    } catch (error) {
      console.error('Erro ao remover anotação:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a anotação.",
        variant: "destructive",
      });
    }
  };

  // Gerar imagem com anotações para download
  const gerarImagemComAnotacoes = async (): Promise<string> => {
    if (!containerRef.current) throw new Error('Container não encontrado');

    const canvas = await html2canvas(containerRef.current, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    return canvas.toDataURL('image/png');
  };

  // Função para download da imagem corrigida
  const baixarImagemCorrigida = async () => {
    try {
      const dataUrl = await gerarImagemComAnotacoes();
      const link = document.createElement('a');
      link.download = `redacao_corrigida_${redacaoId.substring(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Download iniciado",
        description: "A imagem da correção está sendo baixada.",
      });
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível gerar a imagem.",
        variant: "destructive",
      });
    }
  };

  // Função para entrar/sair de tela cheia
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Detectar saída de tela cheia via ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Carregar anotações no início
  useEffect(() => {
    carregarAnotacoes();
  }, [redacaoId]);

  if (readonly) {
    return (
      <div className="w-full">
        {/* Controles para aluno */}
        <div className="mb-6">
          <Button 
            onClick={baixarImagemCorrigida}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Correção Visual
          </Button>
        </div>

        {/* Vista pedagógica simplificada para aluno */}
        {anotacoes.length > 0 && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Resumo da Correção</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => {
                const anotacoesCompetencia = anotacoes.filter(a => a.competencia === parseInt(num));
                return (
                  <div key={num} className="text-center">
                    <div 
                      className="w-3 h-3 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: info.cor }}
                    ></div>
                    <div className="text-sm font-medium">C{num}</div>
                    <div className="text-xs text-gray-600">
                      {anotacoesCompetencia.length} marcação{anotacoesCompetencia.length !== 1 ? 'ões' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Imagem da Redação - Modo Leitura */}
        <div ref={containerRef} className="border rounded-lg p-4 bg-white relative overflow-hidden">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação corrigida" 
            className="img-redacao block mx-auto"
            onLoad={handleImageLoad}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '85vh', 
              width: 'auto', 
              height: 'auto' 
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-black" : "w-full"}>
      {/* Estilos melhorados para imagem e correção do salto */}
      <style>
        {`
          .painel-correcao {
            max-width: none !important;
            transform: none !important;
            overflow: visible !important;
            zoom: 1 !important;
          }

          .container-imagem-redacao {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            min-height: ${isFullscreen ? '100vh' : '70vh'};
            background: ${isFullscreen ? 'black' : 'white'};
          }

          .img-redacao {
            max-width: ${isFullscreen ? '95vw' : '100%'} !important;
            max-height: ${isFullscreen ? '95vh' : '75vh'} !important;
            width: auto !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
            transform: none !important;
            cursor: default !important;
            object-fit: contain !important;
          }

          .annotorious-annotationlayer .a9s-annotation {
            cursor: pointer !important;
          }

          .annotorious-editor {
            display: none !important;
          }

          /* Garantir cursor padrão em todas as interações */
          .annotorious-annotationlayer, 
          .annotorious-annotationlayer svg,
          .annotorious-annotationlayer * {
            cursor: default !important;
          }

          /* Prevenir scrolling desnecessário */
          .painel-correcao .container-imagem-redacao {
            overflow: hidden;
          }

          /* Modo tela cheia */
          .fullscreen-controls {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          @media (max-width: 1024px) {
            .painel-correcao {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Seletor de Competências - Layout melhorado com lupa */}
      <div className="mb-4 painel-correcao">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Selecione a Competência</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="flex items-center gap-2"
            title="Visualizar em tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
            Ampliar
          </Button>
        </div>
        <div className="flex gap-4 items-center">
          {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => (
            <button
              key={num}
              onClick={() => setCompetenciaSelecionada(parseInt(num))}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                competenciaSelecionada === parseInt(num) 
                  ? 'border-gray-800 shadow-lg scale-110' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ 
                backgroundColor: info.cor,
                boxShadow: competenciaSelecionada === parseInt(num) 
                  ? `0 0 0 3px ${info.cor}33` 
                  : 'none'
              }}
              title={info.label}
            />
          ))}
        </div>
      </div>

      {/* Barra flutuante para tela cheia */}
      {isFullscreen && (
        <div className="fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-3 border">
          <div className="flex gap-3 items-center">
            <span className="text-sm font-medium">Competência:</span>
            {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => (
              <button
                key={num}
                onClick={() => setCompetenciaSelecionada(parseInt(num))}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                  competenciaSelecionada === parseInt(num) 
                    ? 'border-gray-800 shadow-lg scale-110' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ 
                  backgroundColor: info.cor,
                  boxShadow: competenciaSelecionada === parseInt(num) 
                    ? `0 0 0 2px ${info.cor}33` 
                    : 'none'
                }}
                title={info.label}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="ml-2"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Container da Imagem da Redação com melhor estrutura */}
      <div className={`container-imagem-redacao border rounded-lg relative painel-correcao ${isFullscreen ? 'fixed inset-0 z-40' : ''}`}>
        {!isFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white"
            title="Visualizar em tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
        
        <div ref={containerRef} className="flex justify-center items-center w-full h-full p-4">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação para correção" 
            className="img-redacao"
            onLoad={handleImageLoad}
            style={{ 
              userSelect: 'none',
              cursor: 'default'
            }}
          />
        </div>
      </div>

      {/* Dialog para adicionar comentário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: CORES_COMPETENCIAS[competenciaSelecionada]?.cor }}
              ></div>
              {CORES_COMPETENCIAS[competenciaSelecionada]?.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Digite seu comentário sobre esta marcação..."
              value={comentarioTemp}
              onChange={(e) => setComentarioTemp(e.target.value)}
              rows={4}
              autoFocus
            />
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelarAnotacao}>
                Cancelar
              </Button>
              <Button onClick={salvarAnotacao}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Comentário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

RedacaoAnotacaoVisual.displayName = "RedacaoAnotacaoVisual";