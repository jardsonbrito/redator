
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
  ordem_criacao?: number; // Made optional to handle nullable values from DB
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
  const [proximaOrdem, setProximaOrdem] = useState<number>(1);
  const [competenciaDialog, setCompetenciaDialog] = useState<number | null>(null);
  const [competenciasExpanded, setCompetenciasExpanded] = useState<boolean>(true);
  const [editandoMarcacao, setEditandoMarcacao] = useState<MarcacaoVisual | null>(null);
  const { toast } = useToast();

  // Carregar marcações existentes
  const carregarMarcacoes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .select('*')
        .eq('redacao_id', redacaoId)
        .eq('tabela_origem', tabelaOrigem)
        .order('ordem_criacao', { ascending: true });

      if (error) throw error;
      
      // Transform data to ensure ordem_criacao has a default value
      const marcacoesComOrdem = (data || []).map((marcacao, index) => ({
        ...marcacao,
        ordem_criacao: marcacao.ordem_criacao || (index + 1) // Provide fallback if null
      }));
      
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
          ordem_criacao: proximaOrdem,
        };

        setMarcacaoTemp(marcacao);
        setComentarioTemp("");
        setCompetenciasExpanded(true);
        setCompetenciaDialog(null);
        setEditandoMarcacao(null);
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

      // Criar círculo com número da ordem - tamanho proporcional otimizado
      const centerX = marcacao.x_start * scaleX + ((marcacao.x_end - marcacao.x_start) * scaleX) / 2;
      const centerY = marcacao.y_start * scaleY + ((marcacao.y_end - marcacao.y_start) * scaleY) / 2;
      
      // ETAPA 2.2: Tamanho otimizado conforme especificado (16px número, 28x28px círculo)
      const numeroTexto = (marcacao.ordem_criacao || 0).toString();
      const fontSize = 16; // Tamanho fixo conforme solicitado
      const circleRadius = 14; // Para círculo de 28x28px (raio = 14)
      
      // Círculo de fundo preto com borda branca
      const backgroundCircle = new Rect({
        left: centerX,
        top: centerY,
        width: circleRadius * 2,
        height: circleRadius * 2,
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 2,
        rx: circleRadius,
        ry: circleRadius,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      // Texto do número centralizado
      const numeroElement = new FabricText(numeroTexto, {
        left: centerX,
        top: centerY,
        fontSize: fontSize,
        fill: '#ffffff',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: true,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
      });

      fabricCanvas.add(rect, backgroundCircle, numeroElement);
      newObjects.add(rect);
      newObjects.add(backgroundCircle);
      newObjects.add(numeroElement);

      // Adicionar click handler para mostrar comentário
      const showComment = () => {
        if (readonly) {
          toast({
            title: `${CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação ${marcacao.ordem_criacao || 0}`,
            description: marcacao.comentario,
            duration: 4000,
          });
        }
      };

      rect.on('mousedown', showComment);
      numeroElement.on('mousedown', showComment);
    });

    setMarcacoesObjects(newObjects);
    fabricCanvas.renderAll();
  }, [fabricCanvas, marcacoes, imagemCarregada, readonly, toast]);

  // Salvar marcação
  const salvarMarcacao = async () => {
    if (!marcacaoTemp || !comentarioTemp.trim()) return;
    
    const competenciaFinal = competenciaDialog || marcacaoTemp.competencia;
    
    if (!competenciaFinal) {
      toast({
        title: "Atenção",
        description: "Selecione a competência",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editandoMarcacao?.id) {
        // Editando marcação existente
        const { error } = await supabase
          .from('marcacoes_visuais')
          .update({
            competencia: competenciaFinal,
            cor_marcacao: CORES_COMPETENCIAS[competenciaFinal].cor,
            comentario: comentarioTemp.trim(),
          })
          .eq('id', editandoMarcacao.id);

        if (error) throw error;

        toast({
          title: "Marcação atualizada!",
          description: "Comentário editado com sucesso.",
        });
      } else {
        // Criando nova marcação
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
            competencia: competenciaFinal,
            cor_marcacao: CORES_COMPETENCIAS[competenciaFinal].cor,
            comentario: comentarioTemp.trim(),
            imagem_largura: marcacaoTemp.imagem_largura,
            imagem_altura: marcacaoTemp.imagem_altura,
            ordem_criacao: marcacaoTemp.ordem_criacao || proximaOrdem,
          });

        if (error) throw error;

        toast({
          title: "Marcação salva!",
          description: "Comentário adicionado com sucesso.",
        });
        
        setProximaOrdem(prev => prev + 1);
      }

      setDialogAberto(false);
      setMarcacaoTemp(null);
      setComentarioTemp("");
      setCompetenciaDialog(null);
      setEditandoMarcacao(null);
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

  // Excluir marcação
  const excluirMarcacao = async (marcacao: MarcacaoVisual) => {
    if (!marcacao.id) return;

    try {
      const { error } = await supabase
        .from('marcacoes_visuais')
        .delete()
        .eq('id', marcacao.id);

      if (error) throw error;

      toast({
        title: "Marcação excluída!",
        description: "Comentário removido com sucesso.",
      });

      await carregarMarcacoes();
    } catch (error) {
      console.error('Erro ao excluir marcação:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a marcação.",
        variant: "destructive",
      });
    }
  };

  // Editar marcação
  const editarMarcacao = (marcacao: MarcacaoVisual) => {
    setEditandoMarcacao(marcacao);
    setMarcacaoTemp(marcacao);
    setComentarioTemp(marcacao.comentario);
    setCompetenciaDialog(marcacao.competencia);
    setCompetenciasExpanded(false); // Começa colapsado mostrando a competência atual
    setDialogAberto(true);
  };

  // Seleção de competência no dialog
  const selecionarCompetencia = (competencia: number) => {
    setCompetenciaDialog(competencia);
    setCompetenciasExpanded(false);
    
    // Atualizar cor da marcação temporária se necessário
    if (marcacaoTemp) {
      setMarcacaoTemp({
        ...marcacaoTemp,
        competencia,
        cor_marcacao: CORES_COMPETENCIAS[competencia].cor
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
                    {CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação {marcacao.ordem_criacao || 0}
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
                  {CORES_COMPETENCIAS[marcacao.competencia].label} - Marcação {marcacao.ordem_criacao || 0}
                </Badge>
                {marcacao.id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editarMarcacao(marcacao)}
                      className="p-1 h-7 w-7"
                      aria-label="Editar comentário"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm("Deseja excluir este comentário?")) {
                          excluirMarcacao(marcacao);
                        }
                      }}
                      className="p-1 h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Excluir comentário"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm leading-relaxed">{marcacao.comentario}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para adicionar comentário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editandoMarcacao ? "Editar Comentário" : "Redação Manuscrita"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Seleção de competência inline */}
            <div className="space-y-3">
              {competenciasExpanded ? (
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const cores = [
                      '#ef4444', // Vermelho - C1
                      '#22c55e', // Verde - C2  
                      '#3b82f6', // Azul - C3
                      '#f97316', // Laranja - C4
                      '#a855f7', // Roxo - C5
                    ];
                    return (
                      <button
                        key={num}
                        onClick={() => selecionarCompetencia(num)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all"
                        style={{ backgroundColor: cores[num - 1] }}
                        aria-label={`Competência ${num}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompetenciasExpanded(true)}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all"
                    style={{ backgroundColor: CORES_COMPETENCIAS[competenciaDialog || marcacaoTemp?.competencia || 1].cor }}
                  />
                  <span className="text-sm font-medium">
                    Competência {competenciaDialog || marcacaoTemp?.competencia || 1}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Digite seu comentário sobre esta marcação...
              </label>
              <Textarea
                value={comentarioTemp}
                onChange={(e) => setComentarioTemp(e.target.value)}
                placeholder="Digite seu comentário sobre esta marcação..."
                className="min-h-[120px]"
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {comentarioTemp.length}/500 caracteres
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={salvarMarcacao}
              disabled={!comentarioTemp.trim()}
            >
              <Save className="w-4 h-4 mr-1" />
              Salvar Comentário
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
