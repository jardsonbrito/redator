import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, Trash2 } from "lucide-react";
import html2canvas from 'html2canvas';

// Importar Fabric.js
import { Canvas as FabricCanvas, Rect, type TPointerEvent } from "fabric";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [dialogAberto, setDialogAberto] = useState<boolean>(false);
  const [comentarioTemp, setComentarioTemp] = useState<string>("");
  const [selecaoTemp, setSelecaoTemp] = useState<any>(null);
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisual[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [tempRect, setTempRect] = useState<Rect | null>(null);
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

  // Inicializar Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || readonly) return;

    const initFabricCanvas = () => {
      // Limpar canvas anterior se existir
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }

      try {
        console.log('Inicializando Fabric.js Canvas...');
        
        const canvas = new FabricCanvas(canvasRef.current!, {
          width: imageDimensions.width,
          height: imageDimensions.height,
          backgroundColor: 'transparent',
          selection: false
        });

        let isDrawing = false;
        let startPointer = { x: 0, y: 0 };

        // Evento de mouse down
        canvas.on('mouse:down', (options: any) => {
          if (readonly) return;
          
          isDrawing = true;
          const pointer = canvas.getScenePoint(options.e);
          startPointer = { x: pointer.x, y: pointer.y };

          // Remover retângulo temporário anterior
          if (tempRect) {
            canvas.remove(tempRect);
            setTempRect(null);
          }

          console.log('Mouse down at:', startPointer);
        });

        // Evento de mouse move
        canvas.on('mouse:move', (options: any) => {
          if (!isDrawing || readonly) return;

          const pointer = canvas.getScenePoint(options.e);
          
          // Calcular dimensões do retângulo
          const left = Math.min(startPointer.x, pointer.x);
          const top = Math.min(startPointer.y, pointer.y);
          const width = Math.abs(pointer.x - startPointer.x);
          const height = Math.abs(pointer.y - startPointer.y);

          // Remover retângulo temporário anterior
          if (tempRect) {
            canvas.remove(tempRect);
          }

          // Criar novo retângulo temporário
          const corCompetencia = CORES_COMPETENCIAS[competenciaSelecionada];
          const r = parseInt(corCompetencia.cor.slice(1, 3), 16);
          const g = parseInt(corCompetencia.cor.slice(3, 5), 16);
          const b = parseInt(corCompetencia.cor.slice(5, 7), 16);

          const rect = new Rect({
            left,
            top,
            width,
            height,
            fill: `rgba(${r}, ${g}, ${b}, 0.1)`,
            stroke: corCompetencia.cor,
            strokeWidth: 1,
            selectable: false,
            evented: false
          });

          canvas.add(rect);
          setTempRect(rect);
          canvas.renderAll();
        });

        // Evento de mouse up
        canvas.on('mouse:up', (options: any) => {
          if (!isDrawing || readonly) return;
          
          isDrawing = false;
          const pointer = canvas.getScenePoint(options.e);
          
          // Calcular dimensões finais
          const x = Math.min(startPointer.x, pointer.x);
          const y = Math.min(startPointer.y, pointer.y);
          const width = Math.abs(pointer.x - startPointer.x);
          const height = Math.abs(pointer.y - startPointer.y);

          console.log('Mouse up - final rect:', { x, y, width, height });

          // Verificar se o retângulo é grande o suficiente
          if (width < 10 || height < 10) {
            if (tempRect) {
              canvas.remove(tempRect);
              setTempRect(null);
              canvas.renderAll();
            }
            return;
          }

          // Salvar dados da seleção e abrir popup
          const selecaoData = {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            competencia: competenciaSelecionada
          };

          console.log('Seleção criada:', selecaoData);
          
          setSelecaoTemp(selecaoData);
          setComentarioTemp("");
          setDialogAberto(true);
        });

        fabricCanvasRef.current = canvas;
        console.log('Fabric.js Canvas configurado com sucesso');

      } catch (error) {
        console.error('Erro ao inicializar Fabric.js:', error);
      }
    };

    const timer = setTimeout(initFabricCanvas, 100);
    
    return () => {
      clearTimeout(timer);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [imageLoaded, readonly, competenciaSelecionada, imageDimensions]);

  // Aplicar anotações salvas no canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || anotacoes.length === 0) return;

    // Limpar anotações existentes (exceto temporária)
    const objects = fabricCanvasRef.current.getObjects();
    objects.forEach(obj => {
      if (obj !== tempRect && (obj as any).annotationId) {
        fabricCanvasRef.current!.remove(obj);
      }
    });

    // Adicionar anotações salvas
    anotacoes.forEach((anotacao) => {
      const r = parseInt(anotacao.cor_marcacao.slice(1, 3), 16);
      const g = parseInt(anotacao.cor_marcacao.slice(3, 5), 16);
      const b = parseInt(anotacao.cor_marcacao.slice(5, 7), 16);

      const rect = new Rect({
        left: anotacao.x_start,
        top: anotacao.y_start,
        width: anotacao.x_end - anotacao.x_start,
        height: anotacao.y_end - anotacao.y_start,
        fill: `rgba(${r}, ${g}, ${b}, 0.1)`,
        stroke: anotacao.cor_marcacao,
        strokeWidth: 1,
        selectable: false,
        evented: true
      });

      (rect as any).annotationId = anotacao.id;
      (rect as any).annotationData = anotacao;

      // Adicionar eventos para mostrar lixeira e comentário
      if (!readonly) {
        rect.on('mouseover', () => {
          rect.set({ stroke: anotacao.cor_marcacao, strokeWidth: 2 });
          fabricCanvasRef.current!.renderAll();
        });

        rect.on('mouseout', () => {
          rect.set({ stroke: anotacao.cor_marcacao, strokeWidth: 1 });
          fabricCanvasRef.current!.renderAll();
        });

        rect.on('mouseup', () => {
          const shouldDelete = confirm(`Remover esta anotação?\n\n${CORES_COMPETENCIAS[anotacao.competencia].label}: ${anotacao.comentario}`);
          if (shouldDelete) {
            removerAnotacao(anotacao.id!);
          }
        });
      } else {
        rect.on('mouseup', () => {
          toast({
            title: `${CORES_COMPETENCIAS[anotacao.competencia].label}`,
            description: anotacao.comentario,
            duration: 4000,
          });
        });
      }

      fabricCanvasRef.current!.add(rect);
    });

    fabricCanvasRef.current.renderAll();
  }, [anotacoes, readonly, tempRect]);

  // Salvar anotação
  const salvarAnotacao = async () => {
    if (!selecaoTemp || !comentarioTemp.trim() || !imageRef.current) {
      toast({
        title: "Erro",
        description: "Comentário não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { x, y, width, height } = selecaoTemp;

      const novaAnotacao = {
        redacao_id: redacaoId,
        corretor_id: corretorId,
        competencia: competenciaSelecionada,
        cor_marcacao: CORES_COMPETENCIAS[competenciaSelecionada].cor,
        comentario: comentarioTemp.trim(),
        tabela_origem: 'redacoes_enviadas',
        x_start: x,
        y_start: y,
        x_end: x + width,
        y_end: y + height,
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

      // Remover retângulo temporário do canvas
      if (tempRect && fabricCanvasRef.current) {
        fabricCanvasRef.current.remove(tempRect);
        setTempRect(null);
        fabricCanvasRef.current.renderAll();
      }

      toast({
        title: "Anotação salva!",
        description: "Comentário adicionado com sucesso.",
      });

      setDialogAberto(false);
      setSelecaoTemp(null);
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
    // Remover retângulo temporário do canvas
    if (tempRect && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(tempRect);
      setTempRect(null);
      fabricCanvasRef.current.renderAll();
    }
    
    setDialogAberto(false);
    setSelecaoTemp(null);
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
        <div ref={containerRef} className="border rounded-lg p-4 bg-white relative">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação corrigida" 
            className="max-w-full h-auto block"
            onLoad={handleImageLoad}
          />
          {imageLoaded && (
            <canvas 
              ref={canvasRef}
              className="absolute top-4 left-4 pointer-events-none"
              style={{ zIndex: 10 }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Seletor de Competências */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Selecione a Competência</h3>
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
      </div>

      {/* Imagem da Redação */}
      <div ref={containerRef} className="border rounded-lg p-4 bg-white relative">
        <img 
          ref={imageRef}
          src={imagemUrl} 
          alt="Redação para correção" 
          className="max-w-full h-auto block"
          onLoad={handleImageLoad}
          style={{ userSelect: 'none' }}
        />
        {imageLoaded && (
          <canvas 
            ref={canvasRef}
            className="absolute top-4 left-4 cursor-crosshair"
            style={{ zIndex: 10 }}
          />
        )}
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