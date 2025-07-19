
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, FabricText } from "fabric";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Save, Edit3, Trash2 } from "lucide-react";

interface MarcacaoVisual {
  id?: string;
  x_start: number;
  y_start: number;
  x_end: number;
  y_end: number;
  competencia: number;
  cor_marcacao: string;
  comentario: string;
  imagem_largura: number;
  imagem_altura: number;
  ordem_criacao: number; // Adicionar campo para ordem de criação
}

interface RedacaoAnotacaoProps {
  imagemUrl: string;
  redacaoId: string;
  tabelaOrigem: string;
  corretorId: string;
  readonly?: boolean;
}

const CORES_COMPETENCIAS = {
  1: { cor: '#ef4444', nome: 'Vermelho', label: 'C1 - Norma Culta' },
  2: { cor: '#22c55e', nome: 'Verde', label: 'C2 - Compreensão' },
  3: { cor: '#3b82f6', nome: 'Azul', label: 'C3 - Argumentação' },
  4: { cor: '#a855f7', nome: 'Roxo', label: 'C4 - Coesão' },
  5: { cor: '#f97316', nome: 'Laranja', label: 'C5 - Proposta' },
};

export const RedacaoAnotacao = ({ 
  imagemUrl, 
  redacaoId, 
  tabelaOrigem, 
  corretorId,
  readonly = false 
}: RedacaoAnotacaoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [modoSelecao, setModoSelecao] = useState<boolean>(false);
  const [dialogAberto, setDialogAberto] = useState<boolean>(false);
  const [comentarioTemp, setComentarioTemp] = useState<string>("");
  const [marcacaoTemp, setMarcacaoTemp] = useState<MarcacaoVisual | null>(null);
  const [marcacoes, setMarcacoes] = useState<MarcacaoVisual[]>([]);
  const [imagemCarregada, setImagemCarregada] = useState<boolean>(false);
  const [dimensoesImagem, setDimensoesImagem] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [marcacoesObjects, setMarcacoesObjects] = useState<Set<any>>(new Set());
  const [proximaOrdem, setProximaOrdem] = useState<number>(1); // Controle de ordem sequencial
  const { toast } = useToast();

  // Carregar marcações existentes
  const carregarMarcacoes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .select('*')
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', tabelaOrigem)
        .order('ordem_criacao', { ascending: true }); // Ordenar por ordem de criação

      if (error) throw error;
      
      const marcacoesComOrdem = data || [];
      setMarcacoes(marcacoesComOrdem);
      
      // Definir próxima ordem baseada na maior ordem existente
      const maiorOrdem = marcacoesComOrdem.length > 0 
        ? Math.max(...marcacoesComOrdem.map(m => m.ordem_criacao || 0))
        : 0;
      setProximaOrdem(maiorOrdem + 1);
      
    } catch (error) {
      console.error('Erro ao carregar marcações:', error);
    }
  }, [redacaoId, tabelaOrigem]);

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      selection: !readonly,
      isDrawingMode: false,
      width: 800,
      height: 600,
    });

    // Carregar imagem de fundo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const canvasWidth = Math.min(800, window.innerWidth - 100);
      const canvasHeight = canvasWidth / aspectRatio;

      canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      
      // Usar CSS para definir imagem de fundo
      if (containerRef.current) {
        containerRef.current.style.backgroundImage = `url(${imagemUrl})`;
        containerRef.current.style.backgroundSize = `${canvasWidth}px ${canvasHeight}px`;
        containerRef.current.style.backgroundRepeat = 'no-repeat';
        containerRef.current.style.backgroundPosition = 'center';
      }

      setDimensoesImagem({ width: img.width, height: img.height });
      setImagemCarregada(true);
    };
    img.src = imagemUrl;

    if (!readonly) {
      // Event listeners para seleção de área
      let isSelecting = false;
      let selectionRect: Rect | null = null;
      let startX = 0;
      let startY = 0;

      canvas.on('mouse:down', (e) => {
        if (!modoSelecao || !e.pointer) return;
        
        isSelecting = true;
        const pointer = canvas.getPointer(e.e);
        startX = pointer.x;
        startY = pointer.y;

        selectionRect = new Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: CORES_COMPETENCIAS[competenciaSelecionada].cor,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });

        canvas.add(selectionRect);
      });

      canvas.on('mouse:move', (e) => {
        if (!isSelecting || !selectionRect || !e.pointer) return;

        const pointer = canvas.getPointer(e.e);
        const width = pointer.x - startX;
        const height = pointer.y - startY;

        selectionRect.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width > 0 ? startX : pointer.x,
          top: height > 0 ? startY : pointer.y,
        });

        canvas.renderAll();
      });

      canvas.on('mouse:up', (e) => {
        if (!isSelecting || !selectionRect) return;
        
        isSelecting = false;
        
        const rect = selectionRect;
        const left = rect.left || 0;
        const top = rect.top || 0;
        const width = rect.width || 0;
        const height = rect.height || 0;

        // Verificar se a seleção tem tamanho mínimo
        if (width < 10 || height < 10) {
          canvas.remove(rect);
          return;
        }

        // Calcular coordenadas relativas à imagem original
        const scaleX = dimensoesImagem.width / canvas.width!;
        const scaleY = dimensoesImagem.height / canvas.height!;

        const marcacao: MarcacaoVisual = {
          x_start: left * scaleX,
          y_start: top * scaleY,
          x_end: (left + width) * scaleX,
          y_end: (top + height) * scaleY,
          competencia: competenciaSelecionada,
          cor_marcacao: CORES_COMPETENCIAS[competenciaSelecionada].cor,
          comentario: "",
          imagem_largura: dimensoesImagem.width,
          imagem_altura: dimensoesImagem.height,
          ordem_criacao: proximaOrdem, // Usar ordem sequencial
        };

        setMarcacaoTemp(marcacao);
        setComentarioTemp("");
        setDialogAberto(true);
        setModoSelecao(false);

        // Remove o retângulo temporário
        canvas.remove(rect);
      });
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imagemUrl, readonly, modoSelecao, competenciaSelecionada, dimensoesImagem, proximaOrdem]);

  // Renderizar marcações no canvas
  useEffect(() => {
    if (!fabricCanvas || !imagemCarregada || marcacoes.length === 0) return;

    // Limpar marcações anteriores
    marcacoesObjects.forEach(obj => fabricCanvas.remove(obj));
    setMarcacoesObjects(new Set());

    const newObjects = new Set();

    // Adicionar marcações ordenadas por ordem_criacao
    const marcacoesOrdenadas = [...marcacoes].sort((a, b) => (a.ordem_criacao || 0) - (b.ordem_criacao || 0));
    
    marcacoesOrdenadas.forEach((marcacao) => {
      const scaleX = fabricCanvas.width! / marcacao.imagem_largura;
      const scaleY = fabricCanvas.height! / marcacao.imagem_altura;

      const rect = new Rect({
        left: marcacao.x_start * scaleX,
        top: marcacao.y_start * scaleY,
        width: (marcacao.x_end - marcacao.x_start) * scaleX,
        height: (marcacao.y_end - marcacao.y_start) * scaleY,
        fill: marcacao.cor_marcacao + '20', // 20% opacity
        stroke: marcacao.cor_marcacao,
        strokeWidth: 2,
        selectable: false,
        evented: true,
      });

      // Adicionar propriedade customizada para identificar
      (rect as any).marcacaoData = { marcacao };

      // Criar círculo com número da ordem - tamanho proporcional melhorado
      const centerX = marcacao.x_start * scaleX + ((marcacao.x_end - marcacao.x_start) * scaleX) / 2;
      const centerY = marcacao.y_start * scaleY + ((marcacao.y_end - marcacao.y_start) * scaleY) / 2;
      
      // Círculo com tamanho proporcional ao número
      const circleRadius = 16; // Reduzido para ser mais discreto
      const circle = new FabricText((marcacao.ordem_criacao || 0).toString(), {
        left: centerX,
        top: centerY,
        fontSize: 18, // Maior para ocupar 70% da área do círculo
        fill: 'white',
        backgroundColor: 'black',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: true,
        padding: 6, // Padding para criar o efeito de círculo
        strokeWidth: 2,
        stroke: 'white',
        paintFirst: 'stroke',
      });

      // Adicionar círculo de fundo
      const backgroundCircle = new Rect({
        left: centerX,
        top: centerY,
        width: circleRadius * 2,
        height: circleRadius * 2,
        fill: 'black',
        stroke: 'white',
        strokeWidth: 2,
        rx: circleRadius,
        ry: circleRadius,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      fabricCanvas.add(rect, backgroundCircle, circle);
      newObjects.add(rect);
      newObjects.add(backgroundCircle);
      newObjects.add(circle);

      // Adicionar click handler para mostrar comentário
      rect.on('mousedown', () => {
        if (readonly) {
          toast({
            title: `${CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação ${marcacao.ordem_criacao}`,
            description: marcacao.comentario,
            duration: 4000,
          });
        }
      });

      circle.on('mousedown', () => {
        if (readonly) {
          toast({
            title: `${CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação ${marcacao.ordem_criacao}`,
            description: marcacao.comentario,
            duration: 4000,
          });
        }
      });
    });

    setMarcacoesObjects(newObjects);
    fabricCanvas.renderAll();
  }, [fabricCanvas, marcacoes, imagemCarregada, readonly, toast]);

  // Salvar marcação
  const salvarMarcacao = async () => {
    if (!marcacaoTemp || !comentarioTemp.trim()) return;

    try {
      const { error } = await supabase
        .from('marcacoes_visuais')
        .insert({
          redacao_id: redacaoId,
          tabela_origem: tabelaOrigem,
          corretor_id: corretorId,
          x_start: marcacaoTemp.x_start,
          y_start: marcacaoTemp.y_start,
          x_end: marcacaoTemp.x_end,
          y_end: marcacaoTemp.y_end,
          competencia: marcacaoTemp.competencia,
          cor_marcacao: marcacaoTemp.cor_marcacao,
          comentario: comentarioTemp.trim(),
          imagem_largura: marcacaoTemp.imagem_largura,
          imagem_altura: marcacaoTemp.imagem_altura,
          ordem_criacao: marcacaoTemp.ordem_criacao, // Salvar ordem de criação
        });

      if (error) throw error;

      toast({
        title: "Marcação salva!",
        description: "Comentário adicionado com sucesso.",
      });

      setDialogAberto(false);
      setMarcacaoTemp(null);
      setComentarioTemp("");
      setProximaOrdem(prev => prev + 1); // Incrementar ordem para próxima marcação
      await carregarMarcacoes();

    } catch (error) {
      console.error('Erro ao salvar marcação:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a marcação.",
        variant: "destructive",
      });
    }
  };

  // Carregar marcações no início
  useEffect(() => {
    carregarMarcacoes();
  }, [carregarMarcacoes]);

  if (readonly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <span className="font-medium">Correção com Marcações Pedagógicas</span>
        </div>
        
        {/* Legenda de Cores */}
        {marcacoes.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Legenda das Competências:</h4>
            <div className="flex flex-wrap gap-2">
              {[...new Set(marcacoes.map(m => m.competencia))].sort().map(competencia => (
                <div key={competencia} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: CORES_COMPETENCIAS[competencia].cor }}
                  />
                  <span className="text-xs font-medium">
                    {CORES_COMPETENCIAS[competencia].label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Clique nas marcações coloridas para ver os comentários
            </p>
          </div>
        )}
        
        <div className="border rounded-lg p-4 bg-white" ref={containerRef}>
          <canvas ref={canvasRef} className="max-w-full" />
        </div>
        
        {marcacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Feedback por Competência:</h4>
            {marcacoes
              .sort((a, b) => (a.ordem_criacao || 0) - (b.ordem_criacao || 0))
              .map((marcacao, index) => (
              <div key={index} className="p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: marcacao.cor_marcacao, color: 'white' }}>
                    {CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação {marcacao.ordem_criacao}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed">{marcacao.comentario}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ferramentas */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Competências:</span>
          {Object.entries(CORES_COMPETENCIAS).map(([num, { cor, nome, label }]) => (
            <Button
              key={num}
              size="sm"
              variant={competenciaSelecionada === parseInt(num) ? "default" : "outline"}
              onClick={() => setCompetenciaSelecionada(parseInt(num))}
              className="flex items-center gap-1"
              style={competenciaSelecionada === parseInt(num) ? { backgroundColor: cor, borderColor: cor } : {}}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: cor }}
              />
              C{num}
            </Button>
          ))}
        </div>
        
        <Button
          variant={modoSelecao ? "destructive" : "outline"}
          size="sm"
          onClick={() => setModoSelecao(!modoSelecao)}
          className="flex items-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          {modoSelecao ? "Cancelar Marcação" : "Marcar Área"}
        </Button>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg p-4 bg-white" ref={containerRef}>
        <canvas ref={canvasRef} className="max-w-full border" />
        {modoSelecao && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <p className="text-blue-700 font-medium">
              ✏️ Modo de marcação ativo - Competência {CORES_COMPETENCIAS[competenciaSelecionada].label.split(' - ')[0]}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Clique e arraste sobre a imagem para marcar uma área da redação
            </p>
          </div>
        )}
      </div>

      {/* Lista de marcações */}
      {marcacoes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Marcações Salvas:</h4>
          {marcacoes
            .sort((a, b) => (a.ordem_criacao || 0) - (b.ordem_criacao || 0))
            .map((marcacao, index) => (
            <div key={index} className="p-3 bg-white border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge style={{ backgroundColor: marcacao.cor_marcacao, color: 'white' }}>
                  {CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação {marcacao.ordem_criacao}
                </Badge>
                {marcacao.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await supabase
                          .from('marcacoes_visuais')
                          .delete()
                          .eq('id', marcacao.id);
                        
                        await carregarMarcacoes();
                        toast({
                          title: "Marcação removida",
                          description: "A marcação foi excluída com sucesso.",
                        });
                      } catch (error) {
                        console.error('Erro ao remover marcação:', error);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm">{marcacao.comentario}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para comentário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar Comentário - {CORES_COMPETENCIAS[competenciaSelecionada].label} - Marcação {marcacaoTemp?.ordem_criacao}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: CORES_COMPETENCIAS[competenciaSelecionada].cor }}
              />
              <span className="font-medium">
                {CORES_COMPETENCIAS[competenciaSelecionada].label}
              </span>
            </div>
            
            <Textarea
              placeholder="Digite seu comentário pedagógico sobre esta área..."
              value={comentarioTemp}
              onChange={(e) => setComentarioTemp(e.target.value)}
              rows={4}
            />
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogAberto(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={salvarMarcacao}
                disabled={!comentarioTemp.trim()}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Comentário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
