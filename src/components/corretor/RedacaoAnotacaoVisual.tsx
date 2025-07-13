import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, Trash2, X, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
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
  numero_sequencial?: number;
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
  3: { cor: '#2196F3', nome: 'Azul', label: 'Competência 3' },
  4: { cor: '#FF9800', nome: 'Laranja', label: 'Competência 4' },
  5: { cor: '#9C27B0', nome: 'Roxo', label: 'Competência 5' }
} as const;

const RedacaoAnotacaoVisual = forwardRef<RedacaoAnotacaoVisualRef, RedacaoAnotacaoVisualProps>(({
  imagemUrl,
  redacaoId,
  corretorId,
  readonly = false
}, ref) => {
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annotoriousRef = useRef<any>(null);
  
  // Estados
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisual[]>([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
  const [comentarioTemp, setComentarioTemp] = useState("");
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [contadorSequencial, setContadorSequencial] = useState(1);

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    salvarTodasAnotacoes,
    gerarImagemComAnotacoes
  }));

  // Função para carregar dimensões da imagem
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      console.log('Dimensões da imagem carregadas:', { width: naturalWidth, height: naturalHeight });
    }
  };

  // Carregar anotações do banco
  const carregarAnotacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .select('*')
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', 'redacoes_enviadas')
        .order('criado_em', { ascending: true });

      if (error) {
        console.error('Erro ao carregar anotações:', error);
        return;
      }

      console.log('Anotações carregadas:', data);
      setAnotacoes(data || []);
      
      // Definir próximo número sequencial
      const proximoNumero = (data?.length || 0) + 1;
      setContadorSequencial(proximoNumero);
      
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  // Carregar anotações no Annotorious
  const carregarEAplicarAnotacoes = () => {
    if (!annotoriousRef.current || !imageDimensions.width || !imageDimensions.height) {
      return;
    }

    try {
      // Converter anotações do banco para formato Annotorious
      const annotoriousAnnotations = anotacoes.map((anotacao, index) => {
        const x = (anotacao.x_start / anotacao.imagem_largura) * 100;
        const y = (anotacao.y_start / anotacao.imagem_altura) * 100;
        const w = ((anotacao.x_end - anotacao.x_start) / anotacao.imagem_largura) * 100;
        const h = ((anotacao.y_end - anotacao.y_start) / anotacao.imagem_altura) * 100;

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
          }],
          numero: index + 1
        };
      });

      // Aplicar anotações no Annotorious
      annotoriousRef.current.setAnnotations(annotoriousAnnotations);

    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  // Inicializar Annotorious
  useEffect(() => {
    let cleanupFunctions: (() => void)[] = [];

    const initAnnotorious = () => {
      if (!imageRef.current || !imageDimensions.width) {
        return;
      }

      try {
        console.log('Inicializando Annotorious...');
        
        // Destruir instância anterior se existir
        if (annotoriousRef.current) {
          annotoriousRef.current.destroy();
          annotoriousRef.current = null;
        }

        const anno = new Annotorious({
          image: imageRef.current,
          locale: 'auto',
          allowEmpty: false,
          drawOnSingleClick: false,
          readOnly: readonly,
          formatters: [
            function(annotation: any) {
              const competencia = annotation.body?.[0]?.purpose || competenciaSelecionada;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              const numero = annotation.numero || '';
              
              if (corCompetencia) {
                const r = parseInt(corCompetencia.cor.slice(1, 3), 16);
                const g = parseInt(corCompetencia.cor.slice(3, 5), 16);
                const b = parseInt(corCompetencia.cor.slice(5, 7), 16);
                
                return {
                  className: `competencia-${competencia}`,
                  style: `fill: rgba(${r}, ${g}, ${b}, 0.15); stroke: ${corCompetencia.cor}; stroke-width: 2px; cursor: pointer;`,
                  'data-numero': numero
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
                bounds: { x, y, width, height },
                numero: contadorSequencial
              };

              setCurrentAnnotation(annotationData);
              setComentarioTemp("");
              console.log('Abrindo popup de anotação');
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

          // Registrar eventos
          anno.on('createSelection', onCreateSelection);
          anno.on('clickAnnotation', onClickAnnotation);

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

    if (imageDimensions.width > 0) {
      setTimeout(initAnnotorious, 100);
    }

    return () => {
      cleanupFunctions.forEach(fn => fn());
      if (annotoriousRef.current) {
        try {
          annotoriousRef.current.destroy();
        } catch (error) {
          console.warn('Erro ao destruir Annotorious:', error);
        }
        annotoriousRef.current = null;
      }
    };
  }, [imageDimensions, readonly, competenciaSelecionada]);

  // Carregar anotações quando o componente monta
  useEffect(() => {
    carregarAnotacoes();
  }, [redacaoId]);

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
        imagem_altura: imageDimensions.height,
        numero_sequencial: contadorSequencial
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
            value: `xywh=percent:${x * 100},${y * 100},${w * 100},${h * 100}`
          }
        },
        body: [{
          type: "TextualBody",
          purpose: competenciaSelecionada,
          value: comentarioTemp.trim()
        }],
        numero: contadorSequencial
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

      // Incrementar contador
      setContadorSequencial(prev => prev + 1);

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

  // Gerar imagem com anotações
  const gerarImagemComAnotacoes = async (): Promise<string> => {
    if (!containerRef.current) {
      throw new Error('Container não encontrado');
    }

    try {
      const canvas = await html2canvas(containerRef.current, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        scale: 2
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      throw error;
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Toggle zoom
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Estilo dinâmico para a imagem
  const getImageStyle = () => {
    const baseStyle = {
      userSelect: 'none' as const,
      cursor: 'default' as const,
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      transition: 'transform 0.3s ease',
    };

    if (isZoomed) {
      return {
        ...baseStyle,
        width: '95vw',
        height: '95vh',
        transform: 'scale(1)',
      };
    }

    if (isFullscreen) {
      return {
        ...baseStyle,
        width: '90vw',
        height: '90vh',
      };
    }

    return {
      ...baseStyle,
      width: 'auto',
      height: '70vh',
    };
  };

  return (
    <div className="space-y-4">
      {/* Painel de competências */}
      <div className="mb-4 painel-correcao">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Selecione a Competência</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleZoom}
              className="flex items-center gap-2"
              title={isZoomed ? "Reduzir zoom" : "Ampliar com zoom"}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
              title="Visualizar em tela cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
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

      {/* Barra flutuante para modo zoom/fullscreen */}
      {(isFullscreen || isZoomed) && (
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
              onClick={isZoomed ? toggleZoom : toggleFullscreen}
              className="ml-2"
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Container da Imagem da Redação */}
      <div className={`container-imagem-redacao border rounded-lg relative painel-correcao ${
        isFullscreen || isZoomed ? 'fixed inset-0 z-40 bg-white' : ''
      }`}>
        
        <div ref={containerRef} className="flex justify-center items-center w-full h-full p-4">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação para correção" 
            className="img-redacao"
            onLoad={handleImageLoad}
            style={getImageStyle()}
          />
        </div>
      </div>

      {/* Lista de comentários */}
      {anotacoes.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3">Comentários ({anotacoes.length})</h4>
          <div className="space-y-2">
            {anotacoes.map((anotacao, index) => (
              <div key={anotacao.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: anotacao.cor_marcacao }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" style={{ color: anotacao.cor_marcacao, borderColor: anotacao.cor_marcacao }}>
                      {CORES_COMPETENCIAS[anotacao.competencia as keyof typeof CORES_COMPETENCIAS]?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{anotacao.comentario}</p>
                </div>
                {!readonly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerAnotacao(anotacao.id!)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog para adicionar comentário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: CORES_COMPETENCIAS[competenciaSelecionada]?.cor }}
              >
                {contadorSequencial}
              </div>
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

export { RedacaoAnotacaoVisual };
export type { RedacaoAnotacaoVisualRef, RedacaoAnotacaoVisualProps };