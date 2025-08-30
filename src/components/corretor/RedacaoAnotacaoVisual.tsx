import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, Eye, Edit3 } from "lucide-react";
import html2canvas from 'html2canvas';

// Importar Annotorious
import { Annotorious } from '@recogito/annotorious';

// Importar CSS do Annotorious
import '@recogito/annotorious/dist/annotorious.min.css';

// Estilos customizados para desabilitar pop-ups nativos e estilizar anotações
const customStyles = `
  /* DESABILITAR POP-UPS NATIVOS DO ANNOTORIOUS */
  .r6o-editor, 
  .r6o-widget, 
  .r6o-popup,
  .r6o-annotation-popup {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
  
  /* Estilos para anotações por competência */
  .r6o-annotation.competencia-1 .r6o-shape {
    fill: rgba(229, 57, 53, 0.15) !important;
    stroke: #E53935 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-2 .r6o-shape {
    fill: rgba(67, 160, 71, 0.15) !important;
    stroke: #43A047 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-3 .r6o-shape {
    fill: rgba(33, 150, 243, 0.15) !important;
    stroke: #2196F3 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-4 .r6o-shape {
    fill: rgba(255, 152, 0, 0.15) !important;
    stroke: #FF9800 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-5 .r6o-shape {
    fill: rgba(156, 39, 176, 0.15) !important;
    stroke: #9C27B0 !important;
    stroke-width: 2px !important;
  }
  
  /* Garantir que a imagem não se mova */
  .container-imagem-redacao img {
    transition: none !important;
    transform: none !important;
  }
  
  /* Removido modo de tela cheia */

  /* Efeito de destaque para comentários */
  .comentario-destacado {
    animation: pulseGlow 2s ease-in-out !important;
    border: 3px solid hsl(var(--annotation-highlight)) !important;
    border-radius: 8px !important;
    box-shadow: 0 0 20px hsl(var(--annotation-highlight) / 0.6) !important;
  }

  /* Efeito de destaque para retângulos */
  .pulse-highlight {
    animation: pulseRetangulo 2s ease-in-out !important;
  }

  @keyframes pulseGlow {
    0% {
      box-shadow: 0 0 5px hsl(var(--annotation-highlight) / 0.3);
      border-color: hsl(var(--annotation-highlight) / 0.5);
    }
    50% {
      box-shadow: 0 0 25px hsl(var(--annotation-highlight) / 0.8);
      border-color: hsl(var(--annotation-highlight));
    }
    100% {
      box-shadow: 0 0 5px hsl(var(--annotation-highlight) / 0.3);
      border-color: hsl(var(--annotation-highlight) / 0.5);
    }
  }

  @keyframes pulseRetangulo {
    0% {
      stroke: currentColor !important;
      stroke-width: 2px !important;
      filter: none !important;
    }
    25% {
      stroke: hsl(var(--annotation-highlight)) !important;
      stroke-width: 5px !important;
      filter: drop-shadow(0 0 12px hsl(var(--annotation-highlight) / 1)) !important;
    }
    50% {
      stroke: hsl(var(--annotation-highlight)) !important;
      stroke-width: 6px !important;
      filter: drop-shadow(0 0 15px hsl(var(--annotation-highlight) / 1)) drop-shadow(0 0 25px hsl(var(--annotation-highlight) / 0.8)) !important;
    }
    75% {
      stroke: hsl(var(--annotation-highlight)) !important;
      stroke-width: 5px !important;
      filter: drop-shadow(0 0 12px hsl(var(--annotation-highlight) / 1)) !important;
    }
    100% {
      stroke: currentColor !important;
      stroke-width: 2px !important;
      filter: none !important;
    }
  }
`;

// Adicionar estilos ao head
if (typeof document !== 'undefined' && !document.getElementById('custom-annotation-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'custom-annotation-styles';
  styleSheet.type = 'text/css';
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

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
  destacarRetangulo: (annotationId: string) => void;
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
  
  // Novos estados para o dialog de 5 bolinhas
  const [competenciaDialog, setCompetenciaDialog] = useState<number | null>(null);
  const [competenciasExpanded, setCompetenciasExpanded] = useState<boolean>(true);
  const [editandoAnotacao, setEditandoAnotacao] = useState<AnotacaoVisual | null>(null);
  
  const [contadorSequencial, setContadorSequencial] = useState(1);

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    salvarTodasAnotacoes,
    gerarImagemComAnotacoes,
    destacarRetangulo
  }));

  // Função para destacar retângulo específico - VERSÃO DEFINITIVA
  const destacarRetangulo = (annotationId: string) => {
    console.log('=== CLIQUE NO OLHO ===', annotationId);
    
    try {
      if (!annotoriousRef.current) {
        console.error('❌ Annotorious não inicializado');
        return;
      }

      // Encontrar a anotação correspondente
      const annotations = annotoriousRef.current.getAnnotations();
      const annotationIndex = annotations.findIndex((ann: any) => ann.id === annotationId);
      
      if (annotationIndex === -1) {
        console.error('❌ Anotação não encontrada');
        return;
      }

      console.log('✅ Anotação encontrada no índice:', annotationIndex);

      // Buscar o SVG no container (qualquer SVG)
      const containerElement = containerRef.current;
      if (!containerElement) {
        console.error('❌ Container não encontrado');
        return;
      }

      const svgElement = containerElement.querySelector('svg');
      if (!svgElement) {
        console.error('❌ SVG não encontrado');
        return;
      }

      console.log('✅ SVG encontrado');

      // Buscar TODOS os grupos g no SVG
      const allGroups = svgElement.querySelectorAll('g');
      console.log('📍 Total de grupos no SVG:', allGroups.length);

      // Buscar TODOS os elementos rect, path, polygon, circle
      const allShapes = svgElement.querySelectorAll('rect, path, polygon, circle, ellipse');
      console.log('📍 Total de shapes no SVG:', allShapes.length);

      let targetShape: HTMLElement | null = null;

      // MÉTODO 1: Buscar por data-id exato no grupo
      for (let i = 0; i < allGroups.length; i++) {
        const group = allGroups[i];
        if (group.getAttribute('data-id') === annotationId) {
          const shape = group.querySelector('rect, path, polygon, circle, ellipse') as HTMLElement;
          if (shape) {
            targetShape = shape;
            console.log('✅ MÉTODO 1: Encontrado por data-id:', annotationId);
            break;
          }
        }
      }

      // MÉTODO 2: Se não encontrou, usar índice direto
      if (!targetShape && annotationIndex >= 0 && annotationIndex < allShapes.length) {
        targetShape = allShapes[annotationIndex] as HTMLElement;
        console.log('✅ MÉTODO 2: Encontrado por índice:', annotationIndex);
      }

      // MÉTODO 3: Se ainda não encontrou, usar índice no grupo
      if (!targetShape && annotationIndex >= 0 && annotationIndex < allGroups.length) {
        const group = allGroups[annotationIndex];
        const shape = group.querySelector('rect, path, polygon, circle, ellipse') as HTMLElement;
        if (shape) {
          targetShape = shape;
          console.log('✅ MÉTODO 3: Encontrado shape no grupo por índice:', annotationIndex);
        }
      }

      if (targetShape) {
        console.log('🎯 ELEMENTO ENCONTRADO! Aplicando destaque...');

        // Limpar destaques anteriores
        document.querySelectorAll('[data-highlighted="true"]').forEach(el => {
          const element = el as HTMLElement;
          element.style.stroke = '';
          element.style.strokeWidth = '';
          element.style.fill = '';
          element.style.filter = '';
          element.removeAttribute('data-highlighted');
        });

        // Aplicar destaque DUPLO
        targetShape.setAttribute('data-highlighted', 'true');
        
        // Estilo direto
        targetShape.style.stroke = '#FFD700 !important';
        targetShape.style.strokeWidth = '6px !important';
        targetShape.style.fill = 'rgba(255, 215, 0, 0.4) !important';
        targetShape.style.filter = 'drop-shadow(0 0 15px #FFD700) !important';
        
        // CSS Class também
        targetShape.classList.add('pulse-highlight');

        console.log('✅ DESTAQUE APLICADO COM SUCESSO!');

        // Scroll para o retângulo
        targetShape.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });

        // Remover destaque após 4 segundos
        setTimeout(() => {
          targetShape!.style.stroke = '';
          targetShape!.style.strokeWidth = '';
          targetShape!.style.fill = '';
          targetShape!.style.filter = '';
          targetShape!.classList.remove('pulse-highlight');
          targetShape!.removeAttribute('data-highlighted');
          console.log('✅ DESTAQUE REMOVIDO');
        }, 4000);

      } else {
        console.error('❌ FALHA TOTAL - Elemento não encontrado por nenhum método');
        console.log('Debug - Total grupos:', allGroups.length);
        console.log('Debug - Total shapes:', allShapes.length);
        console.log('Debug - Índice procurado:', annotationIndex);
      }

    } catch (error) {
      console.error('❌ ERRO CRÍTICO:', error);
    }
  };

  // Função para carregar dimensões da imagem
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      console.log('Dimensões da imagem carregadas:', { width: naturalWidth, height: naturalHeight });
    }
  };

  // Função para destacar comentário
  const destacarComentario = (annotationId: string) => {
    const comentarioElement = document.querySelector(`[data-comentario-id="${annotationId}"]`);
    if (comentarioElement) {
      comentarioElement.classList.add('comentario-destacado');
      
      // Remover destaque após 2 segundos
      setTimeout(() => {
        comentarioElement.classList.remove('comentario-destacado');
      }, 2000);
      
      // Scroll para o comentário se necessário
      comentarioElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Carregar anotações do banco
  const carregarAnotacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .select('*')
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', 'redacoes_enviadas') // TODO: make this dynamic based on redacao type
        .order('criado_em', { ascending: true }); // Ordenar pela data real de criação

      if (error) {
        console.error('Erro ao carregar anotações:', error);
        return;
      }

      console.log('Anotações carregadas:', data);
      
      // Carregar anotações sem numeração
      setAnotacoes(data || []);
      
      // Definir próximo número sequencial para novas anotações
      const maiorNumero = Math.max(0, ...(data?.map(a => a.numero_sequencial || 0) || []));
      const proximoNumero = maiorNumero + 1;
      setContadorSequencial(proximoNumero);
      
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  // Carregar anotações e aplicar no Annotorious
  const carregarEAplicarAnotacoes = () => {
    if (!annotoriousRef.current || !imageDimensions.width || !imageDimensions.height) {
      console.log('❌ Não pode aplicar anotações:', { 
        annotorious: !!annotoriousRef.current, 
        imageDimensions 
      });
      return;
    }

    if (anotacoes.length === 0) {
      console.log('📝 Nenhuma anotação para aplicar');
      return;
    }

    try {
      console.log('🔄 Iniciando aplicação de', anotacoes.length, 'anotações');
      
      // Limpar anotações existentes primeiro
      annotoriousRef.current.clearAnnotations();

      // Converter anotações do banco para formato Annotorious
      const annotoriousAnnotations = anotacoes.map((anotacao, index) => {
        const x = (anotacao.x_start / anotacao.imagem_largura) * 100;
        const y = (anotacao.y_start / anotacao.imagem_altura) * 100;
        const w = ((anotacao.x_end - anotacao.x_start) / anotacao.imagem_largura) * 100;
        const h = ((anotacao.y_end - anotacao.y_start) / anotacao.imagem_altura) * 100;

        console.log(`📍 Anotação ${index + 1}:`, {
          original: { x: anotacao.x_start, y: anotacao.y_start, w: anotacao.x_end - anotacao.x_start, h: anotacao.y_end - anotacao.y_start },
          converted: { x, y, w, h },
          competencia: anotacao.competencia
        });

        return {
          id: anotacao.id,
          type: "Annotation",
          target: {
            source: imagemUrl,
            selector: {
              type: "FragmentSelector",
              conformsTo: "http://www.w3.org/TR/media-frags/",
              value: `xywh=percent:${x},${y},${w},${h}`
            }
          },
          body: [{
            type: "TextualBody",
            purpose: anotacao.competencia, // Usar a competência da anotação salva
            value: anotacao.comentario
          }],
          // Dados customizados para a competência
          competencia: anotacao.competencia
        };
      });

      console.log('✅ Anotações convertidas para Annotorious:', annotoriousAnnotations.length);

      // Usar setAnnotations para aplicar todas de uma vez
      try {
        annotoriousRef.current.setAnnotations(annotoriousAnnotations);
        console.log(`✅ ${annotoriousAnnotations.length} anotações aplicadas com sucesso`);
        
        // Verificar se as anotações foram aplicadas
        const appliedAnnotations = annotoriousRef.current.getAnnotations();
        console.log('🔍 Anotações atualmente no Annotorious:', appliedAnnotations.length);

      } catch (error) {
        console.error('❌ Erro ao aplicar anotações:', error);
        
        // Fallback: tentar adicionar uma por uma
        annotoriousAnnotations.forEach((annotation, index) => {
          try {
            annotoriousRef.current.addAnnotation(annotation);
            console.log(`✅ Anotação ${index + 1} adicionada individualmente`);
          } catch (err) {
            console.error(`❌ Erro na anotação ${index + 1}:`, err);
          }
        });
      }

    } catch (error) {
      console.error('❌ Erro ao carregar anotações:', error);
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
          widgets: [], // Desabilitar widgets nativos
          formatters: [
            function(annotation: any) {
              // Primeiro tentar pegar a competência do body, depois do objeto de anotação, senão usar a selecionada
              const competencia = annotation.body?.[0]?.purpose || annotation.competencia || competenciaSelecionada;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              
              console.log('🎨 Formatando anotação:', { 
                competencia, 
                corCompetencia: corCompetencia?.cor,
                annotation: annotation
              });
              
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
              // Prevenir pop-up nativo
              selection.preventDefault?.();
              
              // Extrair coordenadas
              const selectorValue = selection.target?.selector?.value || '';
              console.log('Selector value:', selectorValue);
              
              let x: number, y: number, width: number, height: number;
              
              // Parse das coordenadas
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

              // Validar coordenadas
              if (x < 0 || y < 0 || width <= 0 || height <= 0) {
                console.error('Coordenadas inválidas:', { x, y, width, height });
                return;
              }

              // Criar dados da anotação (SEM competência predefinida)
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
                  purpose: null, // SEM competência inicial
                  value: ""
                }],
                bounds: { x, y, width, height },
                numero: contadorSequencial
              };

              // CRIAÇÃO: abrir sempre com as 5 bolinhas visíveis
              setEditandoAnotacao(null);
              setCurrentAnnotation(annotationData);
              setComentarioTemp("");
              setCompetenciaDialog(null);
              setCompetenciasExpanded(true);
              setDialogAberto(true);
              
              console.log('CRIAÇÃO -> Dialog aberto', {
                editandoAnotacao: null,
                competenciaDialog: null,
                competenciasExpanded: true
              });
              
            } catch (error) {
              console.error('Erro ao processar seleção:', error);
            }
          };

          const onClickAnnotation = (annotation: any) => {
            try {
              console.log('🎯 Clique na anotação (modo edição):', annotation.id);
              
              // Destacar o comentário correspondente (sem popup)
              if (annotation.id) {
                destacarComentario(annotation.id);
              }

              // Mostrar toast informativo sem popup de remoção
              const comment = annotation.body?.[0]?.value || '';
              const competencia = annotation.body?.[0]?.purpose || 1;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              
              toast({
                title: `${corCompetencia?.label || 'Anotação'}`,
                description: comment,
                duration: 3000,
              });
            } catch (error) {
              console.error('Erro ao processar clique na anotação:', error);
            }
          };

          // Registrar eventos
          anno.on('createSelection', onCreateSelection);
          anno.on('clickAnnotation', onClickAnnotation);

          // Desabilitar completamente editores nativos
          setTimeout(() => {
            const editors = document.querySelectorAll('.r6o-editor, .r6o-widget, .r6o-popup');
            editors.forEach(el => {
              (el as HTMLElement).style.display = 'none';
              (el as HTMLElement).style.visibility = 'hidden';
              (el as HTMLElement).style.opacity = '0';
              (el as HTMLElement).style.pointerEvents = 'none';
            });
          }, 100);

          cleanupFunctions.push(() => {
            if (anno) {
              anno.off('createSelection', onCreateSelection);
              anno.off('clickAnnotation', onClickAnnotation);
            }
          });
        } else {
          // Modo de leitura (aluno) - scroll + piscar + destacar comentário
          const onClickAnnotation = (annotation: any) => {
            try {
              const id = annotation.id;
              console.log('🎯 Clique na anotação (modo leitura):', id);
              
              if (id) {
                // Mesmo comportamento do clique no ícone de olho
                destacarRetangulo(id);
                destacarComentario(id);
              }

              // Mostrar breve toast informativo
              const comment = annotation.body?.[0]?.value || '';
              const competencia = annotation.body?.[0]?.purpose || 1;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              
              toast({
                title: `${corCompetencia?.label || 'Anotação'}`,
                description: comment,
                duration: 3000,
              });
            } catch (error) {
              console.error('Erro ao mostrar anotação (aluno):', error);
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
  }, [imageDimensions, readonly]);

  // Carregar anotações quando o componente monta
  useEffect(() => {
    carregarAnotacoes();
  }, [redacaoId]);

  // Atualizar anotações quando mudarem
  useEffect(() => {
    if (annotoriousRef.current && imageDimensions.width > 0) {
      // Aguardar um frame para garantir que o Annotorious está pronto
      requestAnimationFrame(() => {
        carregarEAplicarAnotacoes();
      });
    }
  }, [anotacoes, imageDimensions]);

  // Proteção contra efeitos que derrubam o header novo
  useEffect(() => {
    if (dialogAberto && !editandoAnotacao) {
      // Em CRIAÇÃO, o header tem que começar expandido SEMPRE
      setCompetenciasExpanded(true);
      setCompetenciaDialog(null);
      console.log('GUARDA-CHUVA: Forçando 5 bolinhas na criação');
    }
  }, [dialogAberto, editandoAnotacao]);

  // Seleção de competência no dialog
  const selecionarCompetencia = (competencia: number) => {
    setCompetenciaDialog(competencia);
    setCompetenciasExpanded(false);
    console.log('COMPETÊNCIA SELECIONADA:', competencia);
  };

  // Editar anotação
  const editarAnotacao = (anotacao: AnotacaoVisual) => {
    setEditandoAnotacao(anotacao);
    setCurrentAnnotation({
      bounds: {
        x: anotacao.x_start,
        y: anotacao.y_start,
        width: anotacao.x_end - anotacao.x_start,
        height: anotacao.y_end - anotacao.y_start
      }
    });
    setComentarioTemp(anotacao.comentario);
    setCompetenciaDialog(anotacao.competencia);
    setCompetenciasExpanded(false); // edição inicia colapsada
    setDialogAberto(true);
    
    console.log('EDIÇÃO -> Dialog aberto', {
      competenciasExpanded: false,
      competenciaDialog: anotacao.competencia
    });
  };

  // Salvar anotação
  const salvarAnotacao = async () => {
    console.log('=== INICIANDO SALVAMENTO ===');
    console.log('currentAnnotation:', currentAnnotation);
    console.log('comentarioTemp:', comentarioTemp);
    console.log('competenciaDialog:', competenciaDialog);
    
    const competenciaFinal = competenciaDialog;
    if (!competenciaFinal) {
      toast({
        title: "Atenção",
        description: "Selecione a competência",
        variant: "destructive",
      });
      return;
    }

    if (!comentarioTemp.trim()) {
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

      // Verificar se corretorId é um UUID válido
      if (!corretorId || corretorId === '1' || corretorId === '2' || corretorId.length < 10) {
        console.error('corretorId inválido recebido:', corretorId);
        throw new Error('ID do corretor deve ser um UUID válido. Recebido: ' + corretorId);
      }

      if (editandoAnotacao?.id) {
        // Editando anotação existente
        const { error } = await supabase
          .from('marcacoes_visuais')
          .update({
            competencia: competenciaFinal,
            cor_marcacao: CORES_COMPETENCIAS[competenciaFinal as keyof typeof CORES_COMPETENCIAS].cor,
            comentario: comentarioTemp.trim(),
          })
          .eq('id', editandoAnotacao.id);

        if (error) throw error;

        toast({
          title: "Marcação atualizada!",
          description: "Comentário editado com sucesso.",
        });
      } else {
        // Criando nova anotação
        const novaAnotacao = {
          redacao_id: redacaoId,
          corretor_id: corretorId,
          competencia: competenciaFinal,
          cor_marcacao: CORES_COMPETENCIAS[competenciaFinal as keyof typeof CORES_COMPETENCIAS].cor,
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

        if (error) throw error;

        console.log('=== ANOTAÇÃO SALVA COM SUCESSO ===');
        console.log('data salva:', data);

        // Incrementar contador para próxima marcação
        setContadorSequencial(prev => prev + 1);

        toast({
          title: "Comentário salvo!",
          description: "Marcação adicionada com sucesso.",
        });
      }

      setDialogAberto(false);
      setCurrentAnnotation(null);
      setComentarioTemp("");
      setCompetenciaDialog(null);
      setEditandoAnotacao(null);
      
      // Recarregar anotações para sincronizar
      await carregarAnotacoes();

    } catch (error: any) {
      console.error('Erro ao salvar anotação:', error);
      
      let errorMessage = 'Erro desconhecido ao salvar comentário';
      
      if (error && typeof error === 'object') {
        if (error.message && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (typeof error.toString === 'function') {
          errorMessage = error.toString();
        }
      }
      
      toast({
        title: "Erro ao salvar comentário",
        description: errorMessage,
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

  // Limpar todas as anotações
  const limparTodasAnotacoes = async () => {
    const shouldClear = confirm('Tem certeza que deseja limpar todas as anotações? Esta ação não pode ser desfeita.');
    
    if (!shouldClear) return;

    try {
      // Remover do banco de dados
      const { error } = await supabase
        .from('marcacoes_visuais')
        .delete()
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', 'redacoes_enviadas');
      
      if (error) throw error;

      // Limpar do Annotorious
      if (annotoriousRef.current) {
        annotoriousRef.current.clearAnnotations();
      }

      // Resetar estados
      setAnotacoes([]);
      setContadorSequencial(1);

      toast({
        title: "Anotações removidas",
        description: "Todas as marcações foram excluídas com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao limpar anotações:', error);
      toast({
        title: "Erro ao limpar",
        description: "Não foi possível remover todas as anotações.",
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


  // Estilo estático para a imagem (sem modo de tela cheia)
  const getImageStyle = () => {
    return {
      userSelect: 'none' as const,
      cursor: 'default' as const,
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      transition: 'none', // Remover transição para evitar movimento
      width: '100%',
      height: 'auto',
      minHeight: '80vh',
    };
  };

  return (
    <div className="space-y-4">
      {/* Painel de competências */}
      {!readonly && (
        <div className="mb-4 painel-correcao">
          <div className="flex gap-4 items-center">
            {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => (
              <div
                key={num}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: info.cor }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  C{num}
                </span>
              </div>
            ))}
            
            {/* Botão para limpar todas as anotações */}
            {!readonly && anotacoes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={limparTodasAnotacoes}
                className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Limpar todas as anotações"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}


      {/* Container da Imagem da Redação */}
      <div className={`container-imagem-redacao border rounded-lg relative painel-correcao`}>
        
        <div ref={containerRef} className="flex justify-center items-center w-full h-full p-2">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação para correção" 
            className="img-redacao"
            onLoad={handleImageLoad}
            loading="lazy"
            style={getImageStyle()}
          />
        </div>
      </div>

      {/* Lista de comentários */}
      {anotacoes.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3">Comentários ({anotacoes.length})</h4>
          <div className="space-y-2">
            {anotacoes.map((anotacao) => (
              <div 
                key={anotacao.id} 
                className="flex items-start gap-3 p-3 bg-white rounded border transition-all duration-300"
                data-comentario-id={anotacao.id}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: anotacao.cor_marcacao }}
                >
                  C{anotacao.competencia}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" style={{ color: anotacao.cor_marcacao, borderColor: anotacao.cor_marcacao }}>
                      {CORES_COMPETENCIAS[anotacao.competencia as keyof typeof CORES_COMPETENCIAS]?.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-annotation-id={anotacao.id}
                      onClick={() => { destacarRetangulo(anotacao.id!); destacarComentario(anotacao.id!); }}
                      className="h-6 w-6 p-0 text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors"
                      title="Mostrar marcação"
                      aria-label="Mostrar marcação deste comentário"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          destacarRetangulo(anotacao.id!);
                          destacarComentario(anotacao.id!);
                        }
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    {!readonly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editarAnotacao(anotacao)}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors"
                        aria-label="Editar comentário"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{anotacao.comentario}</p>
                </div>
                {!readonly && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Deseja excluir este comentário?")) {
                          removerAnotacao(anotacao.id!);
                        }
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label="Excluir comentário"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
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
            <DialogTitle>
              {editandoAnotacao ? "Editar Comentário" : "Redação Manuscrita"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* TOPO DO DIALOG */}
            <div className="flex items-center gap-2">
              {(() => {
                const compAtual = competenciaDialog ?? null;
                
                return (competenciasExpanded || !compAtual) ? (
                  // EXPANDIDO → 5 bolinhas
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map((num) => (
                      <button
                        key={num}
                        onClick={() => selecionarCompetencia(num)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all"
                        style={{ backgroundColor: CORES_COMPETENCIAS[num as keyof typeof CORES_COMPETENCIAS].cor }}
                        aria-label={`Competência ${num}`}
                        data-testid={`bolinha-c${num}`}
                      />
                    ))}
                  </div>
                ) : (
                  // COLAPSADO → 1 bolinha + texto
                  <button
                    onClick={() => setCompetenciasExpanded(true)}
                    className="flex items-center gap-2"
                    data-testid="bolinha-colapsada"
                  >
                    <span
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: CORES_COMPETENCIAS[compAtual].cor }}
                    />
                    <span>Competência {compAtual}</span>
                  </button>
                );
              })()}
            </div>
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