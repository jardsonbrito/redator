import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, Edit3, Mic, MicOff, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { cn } from "@/lib/utils";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import html2canvas from 'html2canvas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  /* Estilos premium por competência */
  .r6o-annotation.competencia-1 .r6o-shape {
    fill: rgba(229, 57, 53, 0.12) !important;
    stroke: #E53935 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-1:hover .r6o-shape {
    fill: rgba(229, 57, 53, 0.22) !important;
    stroke: #E53935 !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 5px rgba(229, 57, 53, 0.5)) !important;
  }
  .r6o-annotation.competencia-2 .r6o-shape {
    fill: rgba(67, 160, 71, 0.12) !important;
    stroke: #43A047 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-2:hover .r6o-shape {
    fill: rgba(67, 160, 71, 0.22) !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 5px rgba(67, 160, 71, 0.5)) !important;
  }
  .r6o-annotation.competencia-3 .r6o-shape {
    fill: rgba(33, 150, 243, 0.12) !important;
    stroke: #2196F3 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-3:hover .r6o-shape {
    fill: rgba(33, 150, 243, 0.22) !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.5)) !important;
  }
  .r6o-annotation.competencia-4 .r6o-shape {
    fill: rgba(255, 152, 0, 0.12) !important;
    stroke: #FF9800 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-4:hover .r6o-shape {
    fill: rgba(255, 152, 0, 0.22) !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 5px rgba(255, 152, 0, 0.5)) !important;
  }
  .r6o-annotation.competencia-5 .r6o-shape {
    fill: rgba(156, 39, 176, 0.12) !important;
    stroke: #9C27B0 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-5:hover .r6o-shape {
    fill: rgba(156, 39, 176, 0.22) !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 5px rgba(156, 39, 176, 0.5)) !important;
  }
  .r6o-annotation.competencia-6 .r6o-shape {
    fill: rgba(0, 188, 212, 0.12) !important;
    stroke: #00BCD4 !important;
    stroke-width: 2px !important;
  }
  .r6o-annotation.competencia-6:hover .r6o-shape {
    fill: rgba(0, 188, 212, 0.22) !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 5px rgba(0, 188, 212, 0.5)) !important;
  }

  /* Cursor pointer em todas as anotações */
  .r6o-annotation {
    cursor: pointer !important;
    transition: all 0.15s ease !important;
  }

  /* Container da imagem */
  .container-imagem-redacao {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
    padding: 0 !important;
    margin: 0 !important;
    background: white;
  }

  .container-imagem-redacao > div {
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
  }

  .container-imagem-redacao img {
    width: 100% !important;
    height: auto !important;
    display: block !important;
    object-fit: contain !important;
    padding: 0 !important;
    margin: 0 !important;
    max-height: none !important;
  }

  /* Efeito de destaque para comentários na lista */
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
    0% { box-shadow: 0 0 5px hsl(var(--annotation-highlight) / 0.3); }
    50% { box-shadow: 0 0 25px hsl(var(--annotation-highlight) / 0.8); }
    100% { box-shadow: 0 0 5px hsl(var(--annotation-highlight) / 0.3); }
  }

  @keyframes pulseRetangulo {
    0% { stroke: currentColor !important; stroke-width: 2px !important; filter: none !important; }
    25% { stroke: hsl(var(--annotation-highlight)) !important; stroke-width: 5px !important; filter: drop-shadow(0 0 12px hsl(var(--annotation-highlight) / 1)) !important; }
    50% { stroke: hsl(var(--annotation-highlight)) !important; stroke-width: 6px !important; filter: drop-shadow(0 0 15px hsl(var(--annotation-highlight) / 1)) drop-shadow(0 0 25px hsl(var(--annotation-highlight) / 0.8)) !important; }
    75% { stroke: hsl(var(--annotation-highlight)) !important; stroke-width: 5px !important; filter: drop-shadow(0 0 12px hsl(var(--annotation-highlight) / 1)) !important; }
    100% { stroke: currentColor !important; stroke-width: 2px !important; filter: none !important; }
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
  corretorId: string | null;
  readonly?: boolean;
  ehCorretor1?: boolean;
  ehCorretor2?: boolean;
  statusMinhaCorrecao?: string;
  tipoTabela?: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';
  onAnotacoesChange?: (counts: Record<number, number>) => void;
}

interface RedacaoAnotacaoVisualRef {
  salvarTodasAnotacoes: () => Promise<void>;
  gerarImagemComAnotacoes: () => Promise<string>;
  destacarRetangulo: (annotationId: string) => void;
  triggerLimparTodasAnotacoes: () => void;
}

const CORES_COMPETENCIAS = {
  1: { cor: '#E53935', nome: 'Vermelho', label: 'Competência 1' },
  2: { cor: '#43A047', nome: 'Verde', label: 'Competência 2' },
  3: { cor: '#2196F3', nome: 'Azul', label: 'Competência 3' },
  4: { cor: '#FF9800', nome: 'Laranja', label: 'Competência 4' },
  5: { cor: '#9C27B0', nome: 'Roxo', label: 'Competência 5' },
  6: { cor: '#00BCD4', nome: 'Turquesa', label: 'Ponto de Atenção' }
} as const;

type MiniCardState = {
  id: string;
  pinned: boolean;
  editing: boolean;
  position: { x: number; y: number; showAbove: boolean };
};

const RedacaoAnotacaoVisual = forwardRef<RedacaoAnotacaoVisualRef, RedacaoAnotacaoVisualProps>(({
  imagemUrl,
  redacaoId,
  corretorId,
  readonly = false,
  ehCorretor1 = false,
  ehCorretor2 = false,
  statusMinhaCorrecao = 'pendente',
  tipoTabela = 'redacoes_enviadas',
  onAnotacoesChange,
}, ref) => {
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annotoriousRef = useRef<any>(null);

  // Estados principais
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisual[]>([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
  const [comentarioTemp, setComentarioTemp] = useState("");
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [competenciaDialog, setCompetenciaDialog] = useState<number | null>(null);
  const [competenciasExpanded, setCompetenciasExpanded] = useState<boolean>(false);
  const [editandoAnotacao, setEditandoAnotacao] = useState<AnotacaoVisual | null>(null);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineSugestoes, setRefineSugestoes] = useState<string[]>([]);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const [contadorSequencial, setContadorSequencial] = useState(1);

  // Estados do mini-card contextual
  const [miniCard, setMiniCard] = useState<MiniCardState | null>(null);
  const [inlineComentario, setInlineComentario] = useState("");
  const [inlineCompetencia, setInlineCompetencia] = useState<number>(1);
  const [inlineRefineLoading, setInlineRefineLoading] = useState(false);
  const [inlineRefineSugestoes, setInlineRefineSugestoes] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estados de UI
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);

  // Refs auxiliares para closures
  const anotacoesRef = useRef<AnotacaoVisual[]>([]);
  const imageDimensionsRef = useRef({ width: 0, height: 0 });
  const miniCardHoverRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manter refs sincronizados
  useEffect(() => { anotacoesRef.current = anotacoes; }, [anotacoes]);
  useEffect(() => { imageDimensionsRef.current = imageDimensions; }, [imageDimensions]);

  // Notificar pai sobre contagens
  useEffect(() => {
    if (!onAnotacoesChange) return;
    const counts: Record<number, number> = {};
    anotacoes.forEach(a => { counts[a.competencia] = (counts[a.competencia] || 0) + 1; });
    onAnotacoesChange(counts);
  }, [anotacoes, onAnotacoesChange]);

  // Ref e hook de voz para o textarea de comentário no dialog
  const comentarioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording: isMicRecording, isSupported: isMicSupported, toggleRecording: toggleMicRecording, stopRecording: stopMicRecording } =
    useVoiceTranscription(setComentarioTemp, comentarioTemp, comentarioTextareaRef);

  useEffect(() => {
    if (!dialogAberto) stopMicRecording();
  }, [dialogAberto, stopMicRecording]);

  useEffect(() => {
    if (dialogAberto) setDragPos({ x: 0, y: 0 });
  }, [dialogAberto]);

  // Fechar mini-card ao clicar fora
  useEffect(() => {
    if (!miniCard?.pinned) return;
    const handleClick = () => setMiniCard(null);
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [miniCard?.pinned]);

  // Drag do painel arrastável
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current.isDragging) return;
      setDragPos({
        x: dragState.current.startPosX + (e.clientX - dragState.current.startX),
        y: dragState.current.startPosY + (e.clientY - dragState.current.startY),
      });
    };
    const onMouseUp = () => { dragState.current.isDragging = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: dragPos.x,
      startPosY: dragPos.y,
    };
  };

  // Calcular posição do mini-card em coordenadas viewport (fixed)
  const calcMiniCardPosition = useCallback((annotationId: string): MiniCardState['position'] | null => {
    const anotacao = anotacoesRef.current.find(a => a.id === annotationId);
    if (!anotacao || !containerRef.current || !imageDimensionsRef.current.width) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = rect.width / imageDimensionsRef.current.width;
    const midX = rect.left + ((anotacao.x_start + anotacao.x_end) / 2) * scale;
    const topAnnot = rect.top + anotacao.y_start * scale;
    const botAnnot = rect.top + anotacao.y_end * scale;
    const showAbove = botAnnot + 320 > window.innerHeight;
    const clampedX = Math.max(195, Math.min(midX, window.innerWidth - 195));
    return { x: clampedX, y: showAbove ? topAnnot : botAnnot, showAbove };
  }, []);

  useImperativeHandle(ref, () => ({
    salvarTodasAnotacoes,
    gerarImagemComAnotacoes,
    destacarRetangulo,
    triggerLimparTodasAnotacoes: () => setShowClearDialog(true),
  }));

  // Destaque de retângulo no SVG
  const destacarRetangulo = (annotationId: string) => {
    try {
      if (!annotoriousRef.current) return;
      const annotations = annotoriousRef.current.getAnnotations();
      const annotationIndex = annotations.findIndex((ann: any) => ann.id === annotationId);
      if (annotationIndex === -1) return;

      const containerElement = containerRef.current;
      if (!containerElement) return;
      const svgElement = containerElement.querySelector('svg');
      if (!svgElement) return;

      const allGroups = svgElement.querySelectorAll('g');
      const allShapes = svgElement.querySelectorAll('rect, path, polygon, circle, ellipse');
      let targetShape: HTMLElement | null = null;

      for (let i = 0; i < allGroups.length; i++) {
        const group = allGroups[i];
        if (group.getAttribute('data-id') === annotationId) {
          const shape = group.querySelector('rect, path, polygon, circle, ellipse') as HTMLElement;
          if (shape) { targetShape = shape; break; }
        }
      }
      if (!targetShape && annotationIndex < allShapes.length) {
        targetShape = allShapes[annotationIndex] as HTMLElement;
      }
      if (!targetShape && annotationIndex < allGroups.length) {
        const shape = allGroups[annotationIndex].querySelector('rect, path, polygon, circle, ellipse') as HTMLElement;
        if (shape) targetShape = shape;
      }

      if (targetShape) {
        document.querySelectorAll('[data-highlighted="true"]').forEach(el => {
          const element = el as HTMLElement;
          element.style.stroke = '';
          element.style.strokeWidth = '';
          element.style.fill = '';
          element.style.filter = '';
          element.removeAttribute('data-highlighted');
        });
        targetShape.setAttribute('data-highlighted', 'true');
        targetShape.style.stroke = '#FFD700 !important';
        targetShape.style.strokeWidth = '6px !important';
        targetShape.style.fill = 'rgba(255, 215, 0, 0.4) !important';
        targetShape.style.filter = 'drop-shadow(0 0 15px #FFD700) !important';
        targetShape.classList.add('pulse-highlight');
        targetShape.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => {
          if (targetShape) {
            targetShape.style.stroke = '';
            targetShape.style.strokeWidth = '';
            targetShape.style.fill = '';
            targetShape.style.filter = '';
            targetShape.classList.remove('pulse-highlight');
            targetShape.removeAttribute('data-highlighted');
          }
        }, 4000);
      }
    } catch (error) {
      console.error('Erro ao destacar retângulo:', error);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
    }
  };

  const destacarComentario = (annotationId: string) => {
    const el = document.querySelector(`[data-comentario-id="${annotationId}"]`);
    if (el) {
      el.classList.add('comentario-destacado');
      setTimeout(() => el.classList.remove('comentario-destacado'), 2000);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const carregarAnotacoes = async () => {
    try {
      if (!corretorId || corretorId.trim() === '') {
        setAnotacoes([]);
        return;
      }

      const { data: existingAnnotations } = await supabase
        .from('marcacoes_visuais')
        .select('id')
        .eq('redacao_id', redacaoId)
        .eq('corretor_id', corretorId)
        .limit(1);

      const temAnotacoesSalvas = (existingAnnotations && existingAnnotations.length > 0);
      const deveBloquear = statusMinhaCorrecao === 'pendente' && !temAnotacoesSalvas;
      if (deveBloquear) {
        setAnotacoes([]);
        return;
      }

      let { data, error } = await supabase
        .from('marcacoes_visuais')
        .select('*')
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', tipoTabela)
        .eq('corretor_id', corretorId)
        .order('criado_em', { ascending: true });

      if (error) { console.error('Erro ao carregar anotações:', error); return; }

      if (data?.length === 0 && tipoTabela === 'redacoes_simulado') {
        const fallback = await supabase
          .from('marcacoes_visuais')
          .select('*')
          .eq('redacao_id', redacaoId)
          .eq('tabela_origem', 'redacoes_enviadas')
          .eq('corretor_id', corretorId)
          .order('criado_em', { ascending: true });
        if (!fallback.error && fallback.data) data = fallback.data;
      }

      setAnotacoes(data || []);
      if ((data?.length || 0) === 0 && annotoriousRef.current) {
        annotoriousRef.current.clearAnnotations();
      }
      const maiorNum = Math.max(0, ...(data?.map(a => a.numero_sequencial || 0) || []));
      setContadorSequencial(maiorNum + 1);
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  const carregarEAplicarAnotacoes = () => {
    if (!annotoriousRef.current || !imageDimensions.width || !imageDimensions.height) return;
    annotoriousRef.current.clearAnnotations();
    if (anotacoes.length === 0) return;

    try {
      const annotoriousAnnotations = anotacoes
        .filter(a => a.x_start >= 0 && a.y_start >= 0 && a.x_end > a.x_start && a.y_end > a.y_start)
        .map(anotacao => {
          const x = (anotacao.x_start / imageDimensions.width) * 100;
          const y = (anotacao.y_start / imageDimensions.height) * 100;
          const w = ((anotacao.x_end - anotacao.x_start) / imageDimensions.width) * 100;
          const h = ((anotacao.y_end - anotacao.y_start) / imageDimensions.height) * 100;
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
            body: [{ type: "TextualBody", purpose: anotacao.competencia, value: anotacao.comentario }],
            competencia: anotacao.competencia
          };
        });

      try {
        annotoriousRef.current.setAnnotations(annotoriousAnnotations);
      } catch {
        annotoriousAnnotations.forEach(a => {
          try { annotoriousRef.current.addAnnotation(a); } catch {}
        });
      }
    } catch (error) {
      console.error('Erro ao aplicar anotações:', error);
    }
  };

  // Inicializar Annotorious
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    const initAnnotorious = () => {
      if (!imageRef.current || !imageDimensions.width) return;

      try {
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
          widgets: [],
          formatters: [
            function(annotation: any) {
              const competencia = annotation.body?.[0]?.purpose || annotation.competencia || competenciaSelecionada;
              const corCompetencia = CORES_COMPETENCIAS[competencia as keyof typeof CORES_COMPETENCIAS];
              if (corCompetencia) {
                const r = parseInt(corCompetencia.cor.slice(1, 3), 16);
                const g = parseInt(corCompetencia.cor.slice(3, 5), 16);
                const b = parseInt(corCompetencia.cor.slice(5, 7), 16);
                return {
                  className: `competencia-${competencia}`,
                  style: `fill: rgba(${r}, ${g}, ${b}, 0.12); stroke: ${corCompetencia.cor}; stroke-width: 2px; cursor: pointer;`
                };
              }
              return { style: 'fill: rgba(255, 0, 0, 0.12); stroke: #ff0000; stroke-width: 2px; cursor: pointer;' };
            }
          ]
        });

        // Hover para mini-card (funciona em ambos os modos)
        const onMouseEnter = (annotation: any) => {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          const pos = calcMiniCardPosition(annotation.id);
          if (pos) {
            setMiniCard(prev => prev?.pinned ? prev : { id: annotation.id, pinned: false, editing: false, position: pos });
          }
        };

        const onMouseLeave = (annotation: any) => {
          hideTimerRef.current = setTimeout(() => {
            if (!miniCardHoverRef.current) {
              setMiniCard(prev => (!prev?.pinned && prev?.id === annotation.id) ? null : prev);
            }
          }, 250);
        };

        const onClickAnnotation = (annotation: any) => {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          const pos = calcMiniCardPosition(annotation.id);
          if (pos) {
            setMiniCard({ id: annotation.id, pinned: true, editing: false, position: pos });
          }
          // Destaque na lista inferior também
          if (annotation.id) destacarComentario(annotation.id);
        };

        anno.on('mouseEnterAnnotation', onMouseEnter);
        anno.on('mouseLeaveAnnotation', onMouseLeave);
        anno.on('clickAnnotation', onClickAnnotation);

        cleanupFunctions.push(() => {
          if (anno) {
            anno.off('mouseEnterAnnotation', onMouseEnter);
            anno.off('mouseLeaveAnnotation', onMouseLeave);
            anno.off('clickAnnotation', onClickAnnotation);
          }
        });

        if (!readonly) {
          const onCreateSelection = (selection: any) => {
            try {
              selection.preventDefault?.();
              const selectorValue = selection.target?.selector?.value || '';
              let x: number, y: number, width: number, height: number;

              if (selectorValue.includes('xywh=percent:')) {
                const match = selectorValue.match(/xywh=percent:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
                if (!match || match.length !== 5) return;
                const [, xP, yP, wP, hP] = match.map(parseFloat);
                x = Math.round(xP / 100 * imageDimensions.width);
                y = Math.round(yP / 100 * imageDimensions.height);
                width = Math.round(wP / 100 * imageDimensions.width);
                height = Math.round(hP / 100 * imageDimensions.height);
              } else if (selectorValue.includes('xywh=pixel:')) {
                const match = selectorValue.match(/xywh=pixel:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
                if (!match || match.length !== 5) return;
                [, x, y, width, height] = match.map(parseFloat);
              } else {
                return;
              }

              if (x < 0 || y < 0 || width <= 0 || height <= 0) return;

              // Fechar mini-card ao criar nova marcação
              setMiniCard(null);

              setEditandoAnotacao(null);
              setCurrentAnnotation({
                id: `temp_${Date.now()}`,
                target: { selector: { type: "FragmentSelector", value: `xywh=pixel:${x},${y},${width},${height}` } },
                body: [{ type: "TextualBody", purpose: null, value: "" }],
                bounds: { x, y, width, height },
                numero: contadorSequencial
              });
              setComentarioTemp("");
              setCompetenciaDialog(1);
              setCompetenciasExpanded(false);
              setRefineSugestoes([]);
              setDialogAberto(true);
            } catch (error) {
              console.error('Erro ao processar seleção:', error);
            }
          };

          anno.on('createSelection', onCreateSelection);
          cleanupFunctions.push(() => { if (anno) anno.off('createSelection', onCreateSelection); });

          setTimeout(() => {
            const editors = document.querySelectorAll('.r6o-editor, .r6o-widget, .r6o-popup');
            editors.forEach(el => {
              (el as HTMLElement).style.display = 'none';
              (el as HTMLElement).style.visibility = 'hidden';
              (el as HTMLElement).style.pointerEvents = 'none';
            });
          }, 100);
        }

        annotoriousRef.current = anno;
        setTimeout(() => carregarEAplicarAnotacoes(), 100);
      } catch (error) {
        console.error('Erro ao inicializar Annotorious:', error);
        toast({ title: "Erro", description: "Não foi possível inicializar o sistema de anotações.", variant: "destructive" });
      }
    };

    if (imageDimensions.width > 0) {
      setTimeout(initAnnotorious, 100);
    }

    return () => {
      cleanupFunctions.forEach(fn => fn());
      if (annotoriousRef.current) {
        try { annotoriousRef.current.destroy(); } catch {}
        annotoriousRef.current = null;
      }
    };
  }, [imageDimensions, readonly]);

  useEffect(() => {
    if (corretorId && corretorId.trim() !== '') {
      carregarAnotacoes();
    } else {
      setAnotacoes([]);
      if (annotoriousRef.current) annotoriousRef.current.clearAnnotations();
    }
  }, [redacaoId, corretorId]);

  useEffect(() => {
    if (annotoriousRef.current && imageDimensions.width > 0) {
      requestAnimationFrame(() => carregarEAplicarAnotacoes());
    }
  }, [anotacoes, imageDimensions]);

  useEffect(() => {
    if (dialogAberto && !editandoAnotacao) {
      setCompetenciasExpanded(false);
      setCompetenciaDialog(1);
    }
  }, [dialogAberto, editandoAnotacao]);

  const selecionarCompetencia = (competencia: number) => {
    setCompetenciaDialog(competencia);
    setCompetenciasExpanded(false);
  };

  const editarAnotacao = (anotacao: AnotacaoVisual) => {
    setEditandoAnotacao(anotacao);
    setCurrentAnnotation({ bounds: { x: anotacao.x_start, y: anotacao.y_start, width: anotacao.x_end - anotacao.x_start, height: anotacao.y_end - anotacao.y_start } });
    setComentarioTemp(anotacao.comentario);
    setCompetenciaDialog(anotacao.competencia);
    setCompetenciasExpanded(false);
    setRefineSugestoes([]);
    setDialogAberto(true);
  };

  const salvarAnotacao = async () => {
    const competenciaFinal = competenciaDialog;
    if (!competenciaFinal) {
      toast({ title: "Atenção", description: "Selecione a competência", variant: "destructive" });
      return;
    }
    if (!comentarioTemp.trim()) {
      toast({ title: "Erro", description: "Comentário não pode estar vazio.", variant: "destructive" });
      return;
    }

    try {
      const bounds = currentAnnotation.bounds;
      if (!bounds || bounds.x === undefined || bounds.y === undefined) throw new Error('Coordenadas não encontradas');
      if (!corretorId || corretorId.trim() === '') throw new Error('ID do corretor é obrigatório');

      if (editandoAnotacao?.id) {
        const { error } = await supabase
          .from('marcacoes_visuais')
          .update({
            competencia: competenciaFinal,
            cor_marcacao: CORES_COMPETENCIAS[competenciaFinal as keyof typeof CORES_COMPETENCIAS].cor,
            comentario: comentarioTemp.trim(),
          })
          .eq('id', editandoAnotacao.id);
        if (error) throw error;
        toast({ title: "Marcação atualizada!" });
      } else {
        const { error } = await supabase
          .from('marcacoes_visuais')
          .insert({
            redacao_id: redacaoId,
            corretor_id: corretorId,
            competencia: competenciaFinal,
            cor_marcacao: CORES_COMPETENCIAS[competenciaFinal as keyof typeof CORES_COMPETENCIAS].cor,
            comentario: comentarioTemp.trim(),
            tabela_origem: tipoTabela,
            x_start: bounds.x,
            y_start: bounds.y,
            x_end: bounds.x + bounds.width,
            y_end: bounds.y + bounds.height,
            imagem_largura: imageDimensions.width,
            imagem_altura: imageDimensions.height,
            numero_sequencial: contadorSequencial
          })
          .select()
          .single();
        if (error) throw error;
        setContadorSequencial(prev => prev + 1);
        toast({ title: "Comentário salvo!" });
      }

      setDialogAberto(false);
      setCurrentAnnotation(null);
      setComentarioTemp("");
      setCompetenciaDialog(null);
      setEditandoAnotacao(null);
      setRefineSugestoes([]);
      await carregarAnotacoes();
    } catch (error: any) {
      toast({ title: "Erro ao salvar comentário", description: error.message || 'Erro desconhecido', variant: "destructive" });
    }
  };

  const cancelarAnotacao = () => {
    setDialogAberto(false);
    setCurrentAnnotation(null);
    setComentarioTemp("");
    setRefineSugestoes([]);
  };

  const salvarTodasAnotacoes = async () => {};

  const removerAnotacao = async (annotationId: string) => {
    try {
      const { error } = await supabase.from('marcacoes_visuais').delete().eq('id', annotationId);
      if (error) throw error;
      if (annotoriousRef.current) annotoriousRef.current.removeAnnotation(annotationId);
      toast({ title: "Anotação removida" });
      await carregarAnotacoes();
    } catch (error) {
      console.error('Erro ao remover anotação:', error);
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const limparTodasAnotacoes = async () => {
    try {
      const { error } = await supabase
        .from('marcacoes_visuais')
        .delete()
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', tipoTabela)
        .eq('corretor_id', corretorId);
      if (error) throw error;
      if (annotoriousRef.current) annotoriousRef.current.clearAnnotations();
      setAnotacoes([]);
      setContadorSequencial(1);
      setShowClearDialog(false);
      toast({ title: "Marcações removidas", description: "Todas as marcações foram excluídas." });
    } catch (error) {
      console.error('Erro ao limpar anotações:', error);
      toast({ title: "Erro ao limpar", variant: "destructive" });
    }
  };

  const refinarComentario = async () => {
    if (!comentarioTemp.trim()) {
      toast({ title: "Atenção", description: "Digite um comentário antes de refinar.", variant: "destructive" });
      return;
    }
    setRefineLoading(true);
    setRefineSugestoes([]);
    try {
      const { data, error } = await supabase.functions.invoke('refinar-comentario-corretor', { body: { comentario: comentarioTemp.trim() } });
      if (error) throw error;
      if (data?.sugestoes && Array.isArray(data.sugestoes)) setRefineSugestoes(data.sugestoes);
    } catch (err: any) {
      toast({ title: "Erro ao refinar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setRefineLoading(false);
    }
  };

  // Salvar edição pelo mini-card inline
  const salvarEdicaoInline = async () => {
    if (!miniCard || !inlineComentario.trim()) return;
    try {
      const { error } = await supabase
        .from('marcacoes_visuais')
        .update({
          competencia: inlineCompetencia,
          cor_marcacao: CORES_COMPETENCIAS[inlineCompetencia as keyof typeof CORES_COMPETENCIAS].cor,
          comentario: inlineComentario.trim(),
        })
        .eq('id', miniCard.id);
      if (error) throw error;
      setMiniCard(null);
      setInlineRefineSugestoes([]);
      await carregarAnotacoes();
      toast({ title: "Comentário atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  // Refinar pelo mini-card
  const refinarComentarioInline = async () => {
    if (!inlineComentario.trim()) return;
    setInlineRefineLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refinar-comentario-corretor', { body: { comentario: inlineComentario.trim() } });
      if (error) throw error;
      if (data?.sugestoes) setInlineRefineSugestoes(data.sugestoes);
    } catch { /* silent */ }
    finally { setInlineRefineLoading(false); }
  };

  const gerarImagemComAnotacoes = async (): Promise<string> => {
    if (!containerRef.current) throw new Error('Container não encontrado');
    const canvas = await html2canvas(containerRef.current, { allowTaint: true, useCORS: true, backgroundColor: null, scale: 2 });
    return canvas.toDataURL('image/png');
  };

  const getImageStyle = () => ({
    userSelect: 'none' as const,
    cursor: 'default' as const,
    width: '100%',
    height: 'auto',
    objectFit: 'contain' as const,
    transition: 'none',
    display: 'block',
    margin: '0',
    padding: '0',
  });

  // Anotação ativa para o mini-card
  const miniCardAnotacao = miniCard ? anotacoes.find(a => a.id === miniCard.id) : null;

  return (
    <div>
      {/* Painel de competências + legenda */}
      {!readonly && (
        <div className="mb-3 painel-correcao px-4 pt-3">
          <div className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Legenda das competências
            </p>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => (
              <div key={num} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: info.cor }} />
                <span className="text-xs font-semibold text-slate-600">{num === '6' ? 'PA' : `C${num}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competências por marcação (visão do aluno no readonly) */}
      {readonly && anotacoes.length > 0 && (
        <div className="mb-3 px-4 pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Comentários por competência
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CORES_COMPETENCIAS).map(([num, info]) => {
              const count = anotacoes.filter(a => String(a.competencia) === num).length;
              if (count === 0) return null;
              return (
                <span
                  key={num}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: info.cor + '18', color: info.cor, border: `1px solid ${info.cor}44` }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.cor }} />
                  {num === '6' ? 'PA' : `C${num}`} ({count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Container da imagem */}
      <div className="container-imagem-redacao border-0 rounded-lg relative painel-correcao bg-white">
        <div ref={containerRef} className="w-full h-full">
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

      {/* Lista de comentários colapsável */}
      {anotacoes.length > 0 && (
        <div className="mt-4 px-4 pb-4">
          <button
            onClick={() => setListaAberta(!listaAberta)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2 w-full"
          >
            {listaAberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{listaAberta ? 'Ocultar' : 'Ver'} comentários ({anotacoes.length})</span>
          </button>

          {listaAberta && (
            <div className="space-y-2 mt-1">
              {anotacoes.map((anotacao) => {
                const cor = CORES_COMPETENCIAS[anotacao.competencia as keyof typeof CORES_COMPETENCIAS]?.cor ?? anotacao.cor_marcacao;
                const label = anotacao.competencia === 6 ? 'PA' : `C${anotacao.competencia}`;
                return (
                  <div
                    key={anotacao.id}
                    className="flex items-start gap-3 p-3 bg-white rounded-xl border transition-all duration-200 hover:shadow-sm"
                    data-comentario-id={anotacao.id}
                    style={{ borderLeft: `3px solid ${cor}` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: cor }}
                    >
                      {label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-1.5" style={{ color: cor, borderColor: cor }}>
                        {CORES_COMPETENCIAS[anotacao.competencia as keyof typeof CORES_COMPETENCIAS]?.label}
                      </Badge>
                      <p className="text-sm text-slate-700 leading-relaxed">{anotacao.comentario}</p>
                    </div>
                    {!readonly && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => editarAnotacao(anotacao)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-slate-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => {
                            setConfirmDeleteId(anotacao.id!);
                          }}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Painel arrastável para nova anotação */}
      {dialogAberto && (
        <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
          <div
            className="absolute inset-0 bg-black/30"
            style={{ pointerEvents: 'auto' }}
            onClick={cancelarAnotacao}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(50% + ${dragPos.x}px)`,
              top: `calc(50% + ${dragPos.y}px)`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              width: '28rem',
              maxWidth: '92vw',
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div
              onMouseDown={handleDragStart}
              className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 cursor-grab active:cursor-grabbing select-none"
            >
              <h2 className="text-sm font-bold text-slate-800">
                {editandoAnotacao ? "Editar Comentário" : "Nova Marcação"}
              </h2>
              <button onClick={cancelarAnotacao} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Seleção de competência */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Competência
                </p>
                {(() => {
                  const compAtual = competenciaDialog ?? null;
                  return (competenciasExpanded || !compAtual) ? (
                    <div className="flex items-end gap-3">
                      {[1,2,3,4,5,6].map((num) => (
                        <div key={num} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => selecionarCompetencia(num)}
                            className={cn(
                              "w-9 h-9 rounded-full border-2 cursor-pointer transition-all focus:outline-none",
                              competenciaDialog === num
                                ? "border-gray-800 ring-2 ring-offset-1 ring-gray-700 scale-110 shadow-md"
                                : "border-gray-300 hover:border-gray-500 hover:scale-105"
                            )}
                            style={{ backgroundColor: CORES_COMPETENCIAS[num as keyof typeof CORES_COMPETENCIAS].cor }}
                            aria-label={num === 6 ? 'Ponto de Atenção' : `Competência ${num}`}
                          />
                          <span className="text-[10px] font-bold text-gray-600">{num === 6 ? 'PA' : `C${num}`}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-9 h-9 rounded-full border-2 border-gray-700 ring-2 ring-offset-1 ring-gray-600 shadow-md flex-shrink-0"
                        style={{ backgroundColor: CORES_COMPETENCIAS[compAtual as keyof typeof CORES_COMPETENCIAS].cor }}
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          {compAtual === 6 ? 'PA — Ponto de Atenção' : `C${compAtual} — ${CORES_COMPETENCIAS[compAtual as keyof typeof CORES_COMPETENCIAS].label}`}
                        </p>
                        <button onClick={() => setCompetenciasExpanded(true)} className="text-xs text-blue-600 hover:underline">
                          Trocar competência
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={comentarioTextareaRef}
                  placeholder="Digite seu comentário sobre esta marcação..."
                  value={comentarioTemp}
                  onChange={(e) => { setComentarioTemp(e.target.value); setRefineSugestoes([]); }}
                  rows={4}
                  autoFocus
                  autoCapitalize="sentences"
                  spellCheck={true}
                  lang="pt-BR"
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none pr-10"
                />
                <button
                  type="button"
                  onClick={toggleMicRecording}
                  disabled={!isMicSupported}
                  className={cn(
                    "absolute bottom-2 right-2 p-1.5 rounded-full transition-colors",
                    isMicRecording ? "bg-red-100 text-red-600 animate-pulse hover:bg-red-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600",
                    !isMicSupported && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {isMicRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              {isMicRecording && <p className="text-xs text-red-500 font-medium animate-pulse">Ouvindo...</p>}

              {/* Refinar */}
              <div className="flex items-center gap-2">
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={refinarComentario}
                  disabled={refineLoading || !comentarioTemp.trim()}
                  className="flex items-center gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-200 hover:border-purple-500 hover:text-purple-900"
                >
                  {refineLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <JarvisIcon size={14} />}
                  {refineLoading ? 'Refinando…' : 'Refinar clareza'}
                </Button>
                {refineSugestoes.length > 0 && (
                  <button type="button" onClick={() => setRefineSugestoes([])} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Ignorar
                  </button>
                )}
              </div>

              {refineSugestoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-700">Sugestões — clique para usar:</p>
                  {refineSugestoes.map((s, i) => (
                    <button
                      key={i} type="button"
                      onClick={() => { setComentarioTemp(s); setRefineSugestoes([]); }}
                      className="w-full text-left text-sm p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={cancelarAnotacao}>Cancelar</Button>
                <Button onClick={salvarAnotacao}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini-card contextual (portal) */}
      {miniCard && miniCardAnotacao && createPortal(
        (() => {
          const anotacao = miniCardAnotacao;
          const comp = anotacao.competencia;
          const corInfo = CORES_COMPETENCIAS[comp as keyof typeof CORES_COMPETENCIAS];
          const compLabel = comp === 6 ? 'PA' : `C${comp}`;
          const { x, y, showAbove } = miniCard.position;

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                miniCardHoverRef.current = true;
                if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
              }}
              onMouseLeave={() => {
                miniCardHoverRef.current = false;
                if (!miniCard.pinned) {
                  hideTimerRef.current = setTimeout(() => setMiniCard(null), 250);
                }
              }}
              style={{
                position: 'fixed',
                left: `${x}px`,
                top: showAbove ? undefined : `${y + 6}px`,
                bottom: showAbove ? `${window.innerHeight - y + 6}px` : undefined,
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: '380px',
                maxWidth: 'min(380px, 92vw)',
                borderTop: `4px solid ${corInfo.cor}`,
              }}
              className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden"
            >
              {/* Header do mini-card */}
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black"
                    style={{ backgroundColor: corInfo.cor + '20', color: corInfo.cor, border: `1px solid ${corInfo.cor}55` }}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: corInfo.cor }} />
                    {compLabel}
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[150px]">{corInfo.label}</span>
                </div>
                <button
                  onClick={() => setMiniCard(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-200 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body do mini-card */}
              <div className="p-4">
                {!miniCard.editing ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-slate-700">{anotacao.comentario}</p>

                    {/* Ações — só para corretor e quando pinned */}
                    {!readonly && (
                      <div className="flex items-center gap-1 pt-2 border-t">
                        {miniCard.pinned ? (
                          <>
                            <button
                              onClick={() => {
                                setMiniCard(prev => prev ? { ...prev, editing: true, pinned: true } : null);
                                setInlineComentario(anotacao.comentario);
                                setInlineCompetencia(anotacao.competencia);
                                setInlineRefineSugestoes([]);
                              }}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              Editar
                            </button>
                            {confirmDeleteId === anotacao.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <span className="text-xs text-red-600 font-medium">Excluir?</span>
                                <button
                                  onClick={() => { removerAnotacao(anotacao.id!); setMiniCard(null); setConfirmDeleteId(null); }}
                                  className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(anotacao.id!)}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Excluir
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">Clique para editar ou excluir</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Modo edição inline */
                  <div className="space-y-3">
                    {/* Selector de competência */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Competência</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {([1, 2, 3, 4, 5, 6] as const).map(num => {
                          const c = CORES_COMPETENCIAS[num];
                          const lbl = num === 6 ? 'PA' : `C${num}`;
                          const selected = inlineCompetencia === num;
                          return (
                            <button
                              key={num}
                              onClick={() => setInlineCompetencia(num)}
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all",
                                selected ? "ring-2 ring-offset-1" : "opacity-60 hover:opacity-100"
                              )}
                              style={{
                                backgroundColor: selected ? c.cor + '20' : 'white',
                                borderColor: c.cor,
                                color: c.cor,
                              }}
                            >
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={inlineComentario}
                      onChange={(e) => { setInlineComentario(e.target.value); setInlineRefineSugestoes([]); }}
                      rows={4}
                      autoFocus
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all"
                    />

                    {/* Refinar */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={refinarComentarioInline}
                        disabled={inlineRefineLoading || !inlineComentario.trim()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 border border-purple-300 hover:bg-purple-100 px-2.5 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {inlineRefineLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <JarvisIcon size={12} />}
                        {inlineRefineLoading ? 'Refinando…' : 'Refinar clareza'}
                      </button>
                    </div>

                    {inlineRefineSugestoes.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Sugestões:</p>
                        {inlineRefineSugestoes.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { setInlineComentario(s); setInlineRefineSugestoes([]); }}
                            className="w-full text-left text-xs p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Ações salvar/cancelar */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button
                        onClick={() => setMiniCard(prev => prev ? { ...prev, editing: false } : null)}
                        className="text-xs px-3 py-1.5 rounded-xl border font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={salvarEdicaoInline}
                        disabled={!inlineComentario.trim()}
                        className="text-xs px-3 py-1.5 rounded-xl bg-violet-700 text-white font-semibold hover:bg-violet-800 disabled:opacity-50 transition-colors"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Dialog de confirmação para limpar marcações */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todas as marcações?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja limpar todas as marcações desta redação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={limparTodasAnotacoes}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para excluir individual (da lista) */}
      <AlertDialog open={!!confirmDeleteId && !miniCard} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDeleteId) { removerAnotacao(confirmDeleteId); setConfirmDeleteId(null); } }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

RedacaoAnotacaoVisual.displayName = "RedacaoAnotacaoVisual";

export { RedacaoAnotacaoVisual };
export type { RedacaoAnotacaoVisualRef, RedacaoAnotacaoVisualProps, AnotacaoVisual };
