import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, Trash2, X } from "lucide-react";
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
    if (!imageRef.current || !imageLoaded) return;

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

    const initAnnotorious = async () => {
      try {
        console.log('Inicializando Annotorious...');
        
        // Criar instância do Annotorious
        anno = new Annotorious({
          image: imageRef.current!,
          disableEditor: true, // Desabilitamos o editor padrão
          allowEmpty: false,
          drawOnSingleClick: false,
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
                  style: `fill: rgba(${r}, ${g}, ${b}, 0.12); stroke: ${corCompetencia.cor}; stroke-width: 1px; cursor: pointer;`
                };
              }
              return {};
            }
          ]
        });

        if (!readonly) {
          // Event listeners para modo de edição
          anno.on('createSelection', (selection: any) => {
            console.log('Selection created:', selection);
            
            // Cancelar seleção padrão e abrir nosso popup
            setTimeout(() => {
              anno.cancelSelected();
              
              // Extrair coordenadas da seleção
              const bounds = selection.target.selector.value;
              const x = Math.round(bounds.x * imageDimensions.width);
              const y = Math.round(bounds.y * imageDimensions.height);
              const width = Math.round(bounds.w * imageDimensions.width);
              const height = Math.round(bounds.h * imageDimensions.height);

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
              setDialogAberto(true);
            }, 10);
          });

          anno.on('clickAnnotation', (annotation: any) => {
            // Modo edição - confirmar remoção
            const comment = annotation.body?.[0]?.value || '';
            const competencia = annotation.body?.[0]?.purpose || 1;
            const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
            
            const shouldDelete = confirm(`Remover esta anotação?\n\n${corCompetencia?.label}: ${comment}`);
            if (shouldDelete && annotation.id) {
              removerAnotacao(annotation.id);
            }
          });
        } else {
          // Event listeners para modo de leitura
          anno.on('clickAnnotation', (annotation: any) => {
            const comment = annotation.body?.[0]?.value || '';
            const competencia = annotation.body?.[0]?.purpose || 1;
            const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
            
            toast({
              title: `${corCompetencia?.label || 'Anotação'}`,
              description: comment,
              duration: 4000,
            });
          });
        }

        annotoriousRef.current = anno;

        // Carregar anotações existentes
        await carregarEAplicarAnotacoes();

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

    const timer = setTimeout(initAnnotorious, 100);
    
    return () => {
      clearTimeout(timer);
      if (anno) {
        anno.destroy();
        annotoriousRef.current = null;
      }
    };
  }, [imageLoaded, readonly, competenciaSelecionada, imageDimensions]);

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
    if (!currentAnnotation || !comentarioTemp.trim()) {
      toast({
        title: "Erro",
        description: "Comentário não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { bounds } = currentAnnotation;

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

      console.log('Salvando anotação:', novaAnotacao);

      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .insert(novaAnotacao)
        .select()
        .single();

      if (error) throw error;

      console.log('Anotação salva com sucesso:', data);

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

      // Adicionar ao Annotorious
      if (annotoriousRef.current) {
        annotoriousRef.current.addAnnotation(annotoriousAnnotation);
      }

      toast({
        title: "Anotação salva!",
        description: "Comentário adicionado com sucesso.",
      });

      setDialogAberto(false);
      setCurrentAnnotation(null);
      setComentarioTemp("");
      
      // Recarregar anotações
      await carregarAnotacoes();

    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      toast({
        title: "Erro ao salvar anotação",
        description: "Não foi possível salvar a anotação.",
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
            className="w-full h-auto block mx-auto"
            onLoad={handleImageLoad}
            style={{ maxWidth: 'none', width: 'auto', height: 'auto' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ width: '100vw', maxWidth: 'none' }}>
      {/* Meta tag para desativar zoom em mobile */}
      <style>
        {`
          .painel-correcao {
            max-width: unset !important;
            transform: none !important;
            overflow: visible !important;
            zoom: 1 !important;
          }

          .img-redacao {
            max-width: 100% !important;
            max-height: 85vh !important;
            width: auto !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
            transform: none !important;
            cursor: default !important;
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

          @media (max-width: 1024px) {
            .painel-correcao {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Seletor de Competências */}
      <div className="mb-6 painel-correcao">
        <h3 className="text-lg font-semibold mb-3">Selecione a Competência para Marcar</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => (
            <Button
              key={num}
              variant={competenciaSelecionada === parseInt(num) ? "default" : "outline"}
              onClick={() => setCompetenciaSelecionada(parseInt(num))}
              className="flex items-center gap-2"
              style={{
                backgroundColor: competenciaSelecionada === parseInt(num) ? info.cor : 'transparent',
                borderColor: info.cor,
                color: competenciaSelecionada === parseInt(num) ? 'white' : info.cor
              }}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: info.cor }}
              ></div>
              {info.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Selecione uma competência e clique e arraste sobre a imagem para criar uma marcação.
        </p>
      </div>

      {/* Imagem da Redação */}
      <div ref={containerRef} className="border rounded-lg p-4 bg-white relative painel-correcao" style={{ width: '100%', overflowX: 'auto' }}>
        <img 
          ref={imageRef}
          src={imagemUrl} 
          alt="Redação para correção" 
          className="img-redacao block mx-auto"
          onLoad={handleImageLoad}
          style={{ 
            userSelect: 'none', 
            maxWidth: '100%',
            maxHeight: '85vh',
            width: 'auto', 
            height: 'auto',
            cursor: 'default' // Cursor sempre padrão
          }}
        />
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