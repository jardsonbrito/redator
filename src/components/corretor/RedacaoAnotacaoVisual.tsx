import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, Maximize2, Minimize2 } from "lucide-react";
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
  
  /* Numeração das anotações - Forçar exibição */
  .r6o-annotation {
    position: relative !important;
  }
  
  /* Numeração via CSS como backup */
  .r6o-annotation::before {
    content: attr(data-numero) !important;
    position: absolute !important;
    top: -12px !important;
    left: -12px !important;
    background: #000000 !important;
    color: #ffffff !important;
    border-radius: 50% !important;
    width: 24px !important;
    height: 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 12px !important;
    font-weight: bold !important;
    font-family: Arial, sans-serif !important;
    z-index: 10001 !important;
    border: 3px solid #ffffff !important;
    box-shadow: 0 3px 8px rgba(0,0,0,0.4) !important;
    pointer-events: none !important;
    line-height: 1 !important;
    text-align: center !important;
  }
  
  /* Garantir que números DOM tenham prioridade */
  .numero-anotacao {
    position: absolute !important;
    top: -12px !important;
    left: -12px !important;
    background: #000000 !important;
    color: #ffffff !important;
    border-radius: 50% !important;
    width: 24px !important;
    height: 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 12px !important;
    font-weight: bold !important;
    font-family: Arial, sans-serif !important;
    z-index: 10002 !important;
    border: 3px solid #ffffff !important;
    box-shadow: 0 3px 8px rgba(0,0,0,0.4) !important;
    pointer-events: none !important;
    line-height: 1 !important;
    text-align: center !important;
  }
  
  /* Garantir que a imagem não se mova */
  .container-imagem-redacao img {
    transition: none !important;
    transform: none !important;
  }
  
  /* Estilo para contêiner em tela cheia */
  .fullscreen-container {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: white !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    padding-top: 80px !important;
  }
  
  /* Barra flutuante centralizada em tela cheia */
  .fullscreen-competency-bar {
    position: fixed !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    z-index: 10000 !important;
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    padding: 16px !important;
    border: 1px solid #e5e7eb !important;
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
  const [contadorSequencial, setContadorSequencial] = useState(1);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

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
        .order('criado_em', { ascending: true }); // Ordenar pela data real de criação

      if (error) {
        console.error('Erro ao carregar anotações:', error);
        return;
      }

      console.log('Anotações carregadas:', data);
      
      // Usar numeração original salva no banco (respeita ordem real de criação)
      setAnotacoes(data || []);
      
      // Definir próximo número sequencial baseado no maior número existente
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
          competencia: anotacao.competencia,
          numero: anotacao.numero_sequencial
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
          // Dados customizados para a competência e numeração
          competencia: anotacao.competencia,
          numero: anotacao.numero_sequencial || 1
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

        // Adicionar numeração com múltiplas tentativas
        setTimeout(() => adicionarNumeracaoAnotacoes(), 100);
        setTimeout(() => adicionarNumeracaoAnotacoes(), 300);
        setTimeout(() => adicionarNumeracaoAnotacoes(), 600);
        
        // Iniciar observador de mutações
        iniciarObservadorDeMutacoes();

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

        // Adicionar numeração com múltiplas tentativas
        setTimeout(() => adicionarNumeracaoAnotacoes(), 200);
        setTimeout(() => adicionarNumeracaoAnotacoes(), 500);
        setTimeout(() => adicionarNumeracaoAnotacoes(), 1000);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar anotações:', error);
    }
  };

  // Função para adicionar número numa anotação específica
  const adicionarNumeroNaAnotacao = (annotationId: string, numero: string | number) => {
    if (!containerRef.current || !annotationId || !numero) return;

    try {
      // Buscar o elemento específico da anotação pelo ID
      const annotationElement = containerRef.current.querySelector(`[data-id="${annotationId}"]`) ||
                                 containerRef.current.querySelector(`g[data-id="${annotationId}"]`) ||
                                 containerRef.current.querySelector(`.annotation-${annotationId}`);

      if (!annotationElement) {
        console.log(`⚠️ Elemento da anotação ${annotationId} não encontrado`);
        return;
      }

      // Verificar se já tem número
      const existingNumber = annotationElement.querySelector('.numero-anotacao');
      if (existingNumber) {
        console.log(`🔢 Número já existe para anotação ${annotationId}`);
        return;
      }

      console.log(`🔢 Adicionando número ${numero} para anotação ${annotationId}`);

      // Criar elemento do número
      const numberContainer = document.createElement('div');
      numberContainer.className = 'numero-anotacao';
      numberContainer.textContent = numero.toString();
      
      // Estilos inline muito específicos
      numberContainer.style.cssText = `
        position: absolute !important;
        top: -15px !important;
        left: -15px !important;
        background: #000000 !important;
        color: #ffffff !important;
        border-radius: 50% !important;
        width: 30px !important;
        height: 30px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        font-family: Arial, sans-serif !important;
        z-index: 10000 !important;
        border: 3px solid #ffffff !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6) !important;
        pointer-events: none !important;
        line-height: 1 !important;
        text-align: center !important;
      `;

      // Garantir posicionamento relativo no pai
      (annotationElement as HTMLElement).style.position = 'relative';
      (annotationElement as HTMLElement).style.zIndex = '1000';
      
      // Adicionar o número
      annotationElement.appendChild(numberContainer);
      
      console.log(`✅ Número ${numero} aplicado na anotação ${annotationId}`);

    } catch (error) {
      console.error(`❌ Erro ao adicionar número na anotação ${annotationId}:`, error);
    }
  };

  // Iniciar observador de mutações para detectar quando Annotorious adiciona elementos
  const iniciarObservadorDeMutacoes = () => {
    if (!containerRef.current) return;
    
    // Parar observador existente
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
    }

    // Criar novo observador
    mutationObserverRef.current = new MutationObserver((mutations) => {
      let hasNewAnnotations = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Verificar se é uma anotação ou contém anotações
              if (element.classList.contains('r6o-annotation') || 
                  element.querySelector('.r6o-annotation') ||
                  element.tagName === 'g') {
                hasNewAnnotations = true;
              }
            }
          });
        }
      });

      if (hasNewAnnotations) {
        console.log('🔍 Mutation Observer detectou novas anotações - adicionando numeração');
        setTimeout(() => adicionarNumeracaoAnotacoes(), 50);
      }
    });

    // Observar mudanças no container
    mutationObserverRef.current.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: false
    });
    
    console.log('👀 Observer de mutações iniciado');
  };

  // Adicionar numeração diretamente no SVG usando elementos SVG nativos
  const adicionarNumeracaoAnotacoes = () => {
    if (!containerRef.current) return;

    try {
      console.log('🔢 Iniciando numeração SVG das anotações...');
      
      // Buscar o SVG principal do Annotorious
      const svgElement = containerRef.current.querySelector('svg.a9s-annotationlayer') || 
                        containerRef.current.querySelector('svg') ||
                        containerRef.current.querySelector('.r6o-svg-canvas svg');
      
      if (!svgElement) {
        console.log('⚠️ SVG não encontrado, tentando novamente...');
        setTimeout(() => adicionarNumeracaoAnotacoes(), 500);
        return;
      }

      // Buscar retângulos únicos (evitar duplicação)
      const rectangles = svgElement.querySelectorAll('rect[data-id], rect:not(.numero-svg-bg)');
      const uniqueRects = Array.from(rectangles).filter((rect, index, array) => {
        const x = rect.getAttribute('x');
        const y = rect.getAttribute('y');
        const w = rect.getAttribute('width');
        const h = rect.getAttribute('height');
        
        // Verificar se já existe um retângulo com as mesmas coordenadas
        return array.findIndex(r => 
          r.getAttribute('x') === x && 
          r.getAttribute('y') === y &&
          r.getAttribute('width') === w &&
          r.getAttribute('height') === h
        ) === index;
      });
      
      if (uniqueRects.length === 0) {
        console.log('⚠️ Nenhum retângulo único encontrado no SVG');
        setTimeout(() => adicionarNumeracaoAnotacoes(), 1000);
        return;
      }

      console.log(`🔢 Processando ${uniqueRects.length} retângulos únicos no SVG`);

      // Ordenar anotações por número sequencial
      const anotacoesOrdenadas = [...anotacoes].sort((a, b) => (a.numero_sequencial || 0) - (b.numero_sequencial || 0));

      // Remover numerações existentes primeiro
      svgElement.querySelectorAll('.numero-svg, .numero-svg-bg').forEach(el => el.remove());

      uniqueRects.forEach((rect, index) => {
        try {
          const anotacao = anotacoesOrdenadas[index];
          const numero = anotacao?.numero_sequencial || (index + 1);

          const x = parseFloat(rect.getAttribute('x') || '0');
          const y = parseFloat(rect.getAttribute('y') || '0');

          // Criar círculo de fundo maior para o número
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', (x + 35).toString());
          circle.setAttribute('cy', (y + 35).toString());
          circle.setAttribute('r', '30'); // Dobrado de 22 para 30
          circle.setAttribute('fill', '#000000');
          circle.setAttribute('stroke', '#ffffff');
          circle.setAttribute('stroke-width', '4'); // Aumentado para 4
          circle.classList.add('numero-svg-bg');

          // Criar texto do número muito maior
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', (x + 35).toString());
          text.setAttribute('y', (y + 45).toString()); // Ajustado para centralizar no círculo maior
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('fill', '#ffffff');
          text.setAttribute('font-family', 'Arial Black, Arial, sans-serif');
          text.setAttribute('font-size', '28'); // Dobrado de 20 para 28
          text.setAttribute('font-weight', 'bold');
          text.textContent = numero.toString();
          text.classList.add('numero-svg');

          // Adicionar ao SVG
          svgElement.appendChild(circle);
          svgElement.appendChild(text);

          console.log(`✅ Número ${numero} adicionado no SVG na posição (${x + 20}, ${y + 20})`);

        } catch (err) {
          console.error(`❌ Erro ao adicionar número SVG ${index}:`, err);
        }
      });

      console.log(`✅ Numeração SVG concluída para ${uniqueRects.length} elementos únicos`);

    } catch (error) {
      console.error('❌ Erro geral na numeração SVG:', error);
    }
  };

  // Função de verificação e numeração adicional
  const verificarENumerarAnotacoes = () => {
    if (!containerRef.current) return;

    try {
      const annotationElements = containerRef.current.querySelectorAll('.r6o-annotation');
      console.log('🔍 Verificando numeração para', annotationElements.length, 'anotações');

      annotationElements.forEach((element, index) => {
        // Verificar se já tem número visível
        const hasVisibleNumber = element.querySelector('.numero-anotacao') || 
                                 element.getAttribute('data-numero');

        if (!hasVisibleNumber) {
          console.log(`⚠️ Anotação ${index + 1} sem numeração - corrigindo...`);
          
          const anotacoesOrdenadas = [...anotacoes].sort((a, b) => (a.numero_sequencial || 0) - (b.numero_sequencial || 0));
          const anotacao = anotacoesOrdenadas[index];
          const numero = anotacao?.numero_sequencial || (index + 1);

          // Adicionar data-numero para CSS
          element.setAttribute('data-numero', numero.toString());

          // Criar elemento DOM também
          const numberContainer = document.createElement('div');
          numberContainer.className = 'numero-anotacao';
          numberContainer.textContent = numero.toString();
          
          numberContainer.style.cssText = `
            position: absolute !important;
            top: -12px !important;
            left: -12px !important;
            background: #000000 !important;
            color: #ffffff !important;
            border-radius: 50% !important;
            width: 24px !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 12px !important;
            font-weight: bold !important;
            font-family: Arial, sans-serif !important;
            z-index: 10002 !important;
            border: 3px solid #ffffff !important;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4) !important;
            pointer-events: none !important;
            line-height: 1 !important;
            text-align: center !important;
          `;

          (element as HTMLElement).style.position = 'relative';
          element.appendChild(numberContainer);
          
          console.log(`✅ Numeração ${numero} corrigida para elemento ${index + 1}`);
        }
      });

    } catch (error) {
      console.error('❌ Erro na verificação de numeração:', error);
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
              const numero = annotation.numero || '';
              
              console.log('🎨 Formatando anotação:', { 
                competencia, 
                corCompetencia: corCompetencia?.cor,
                numero,
                annotation: annotation
              });
              
              if (corCompetencia) {
                const r = parseInt(corCompetencia.cor.slice(1, 3), 16);
                const g = parseInt(corCompetencia.cor.slice(3, 5), 16);
                const b = parseInt(corCompetencia.cor.slice(5, 7), 16);
                
                // Agendar adição do número após renderização
                setTimeout(() => {
                  adicionarNumeroNaAnotacao(annotation.id, numero);
                }, 50);
                
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

              // Criar dados da anotação
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
              setDialogAberto(true);
              
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
      
      // Parar observador de mutações
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
      
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
    if (annotoriousRef.current && imageDimensions.width > 0) {
      // Aguardar um frame para garantir que o Annotorious está pronto
      requestAnimationFrame(() => {
        carregarEAplicarAnotacoes();
      });
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

      // Incrementar contador para próxima marcação
      setContadorSequencial(prev => prev + 1);

      // Atualizar lista de anotações
      setAnotacoes(prev => [...prev, data as AnotacaoVisual]);

      toast({
        title: "Comentário salvo!",
        description: "Marcação adicionada com sucesso.",
      });

      setDialogAberto(false);
      setCurrentAnnotation(null);
      setComentarioTemp("");
      
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

      // Limpar números fantasma primeiro
      if (containerRef.current) {
        const numerosFantasma = containerRef.current.querySelectorAll('.numero-svg, .numero-svg-bg, .numero-anotacao');
        numerosFantasma.forEach(el => el.remove());
        console.log(`🧹 Removidos ${numerosFantasma.length} números fantasma`);
      }

      // Limpar do Annotorious
      if (annotoriousRef.current) {
        annotoriousRef.current.clearAnnotations();
      }

      // Parar observador de mutações para evitar duplicação
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Estilo dinâmico para a imagem
  const getImageStyle = () => {
    const baseStyle = {
      userSelect: 'none' as const,
      cursor: 'default' as const,
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      transition: 'none', // Remover transição para evitar movimento
    };

    if (isFullscreen) {
      return {
        ...baseStyle,
        width: '90vw',
        height: '90vh',
      };
    }

    return {
      ...baseStyle,
      width: '100%',
      height: 'auto',
      minHeight: '80vh',
    };
  };

  return (
    <div className="space-y-4">
      {/* Painel de competências */}
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

      {/* Barra flutuante centralizada para tela cheia */}
      {isFullscreen && (
        <div className="fullscreen-competency-bar">
          <div className="flex gap-3 items-center">
            <span className="text-sm font-medium">Competência:</span>
            {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => (
              <button
                key={num}
                onClick={() => setCompetenciaSelecionada(parseInt(num))}
                className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
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
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="ml-3"
              title="Sair da tela cheia"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Container da Imagem da Redação */}
      <div className={`container-imagem-redacao border rounded-lg relative painel-correcao ${
        isFullscreen ? 'fullscreen-container' : ''
      }`}>
        
        <div ref={containerRef} className="flex justify-center items-center w-full h-full p-2">
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
            {anotacoes.map((anotacao) => (
              <div key={anotacao.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: anotacao.cor_marcacao }}
                >
                  {anotacao.numero_sequencial || 1}
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