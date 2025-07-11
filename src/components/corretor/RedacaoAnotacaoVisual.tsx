
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, Trash2 } from "lucide-react";
import html2canvas from 'html2canvas';

// Importar Annotorious
import { Annotorious } from '@recogito/annotorious';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annoRef = useRef<any>(null);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [dialogAberto, setDialogAberto] = useState<boolean>(false);
  const [comentarioTemp, setComentarioTemp] = useState<string>("");
  const [selecaoTemp, setSelecaoTemp] = useState<any>(null);
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

  // Inicializar Annotorious
  useEffect(() => {
    if (!imageRef.current || !imageLoaded || readonly) return;

    const initAnnotorious = () => {
      // Cleanup previous instance
      if (annoRef.current) {
        try {
          annoRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying previous Annotorious instance:', error);
        }
        annoRef.current = null;
      }

      try {
        console.log('Inicializando Annotorious...');
        
        const anno = new Annotorious({
          image: imageRef.current!,
          readOnly: false,
          disableEditor: true, // Desabilita completamente o editor nativo
          widgets: [] // Remove todos os widgets nativos
        });

        console.log('Annotorious inicializado:', anno);

        // Interceptar seleção ANTES da criação da anotação
        anno.on('createSelection', (selection: any) => {
          console.log('Selection created:', selection);
          
          // Cancelar a criação automática da anotação
          setTimeout(() => {
            try {
              anno.cancelSelected();
            } catch (e) {
              console.warn('Selection already cancelled');
            }
          }, 10);

          // Extrair as coordenadas da seleção
          const bounds = selection.selector?.value?.match(/xywh=pixel:(\d+),(\d+),(\d+),(\d+)/);
          if (bounds && imageRef.current) {
            const [, x, y, width, height] = bounds.map(Number);
            
            console.log('Coordenadas extraídas:', { x, y, width, height });
            
            // Criar retângulo visual com a cor da competência
            createVisualRectangle(x, y, width, height);
            
            // Salvar dados da seleção
            const selecaoData = {
              x, y, width, height,
              selector: selection.selector,
              competencia: competenciaSelecionada
            };
            
            setSelecaoTemp(selecaoData);
            setComentarioTemp("");
            setDialogAberto(true);
          }
        });

        annoRef.current = anno;
        console.log('Annotorious configurado com sucesso');

      } catch (error) {
        console.error('Error initializing Annotorious:', error);
      }
    };

    // Delay para garantir que o DOM está pronto
    const timer = setTimeout(initAnnotorious, 200);
    
    return () => {
      clearTimeout(timer);
      if (annoRef.current) {
        try {
          annoRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Annotorious on cleanup:', error);
        }
      }
    };
  }, [imageLoaded, readonly, redacaoId, competenciaSelecionada]);

  // Criar retângulo visual
  const createVisualRectangle = (x: number, y: number, width: number, height: number) => {
    if (!containerRef.current || !imageRef.current) return;

    // Remover retângulo temporário anterior se existir
    const existingTemp = containerRef.current.querySelector('.temp-rectangle');
    if (existingTemp) {
      existingTemp.remove();
    }

    const rect = document.createElement('div');
    rect.className = 'temp-rectangle';
    
    const corCompetencia = CORES_COMPETENCIAS[competenciaSelecionada];
    const r = parseInt(corCompetencia.cor.slice(1, 3), 16);
    const g = parseInt(corCompetencia.cor.slice(3, 5), 16);
    const b = parseInt(corCompetencia.cor.slice(5, 7), 16);
    
    rect.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      border: 1px solid ${corCompetencia.cor};
      background-color: rgba(${r}, ${g}, ${b}, 0.10);
      pointer-events: none;
      z-index: 10;
      box-sizing: border-box;
    `;
    
    containerRef.current.appendChild(rect);
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

  // Aplicar anotações salvas
  useEffect(() => {
    if (!imageLoaded || anotacoes.length === 0 || !containerRef.current) return;

    // Limpar anotações visuais existentes
    const existingAnnotations = containerRef.current.querySelectorAll('.saved-annotation');
    existingAnnotations.forEach(el => el.remove());

    anotacoes.forEach((anotacao) => {
      createSavedAnnotation(anotacao);
    });
  }, [anotacoes, imageLoaded]);

  // Criar anotação salva visual
  const createSavedAnnotation = (anotacao: AnotacaoVisual) => {
    if (!containerRef.current) return;

    const rect = document.createElement('div');
    rect.className = 'saved-annotation';
    rect.dataset.annotationId = anotacao.id;
    
    const r = parseInt(anotacao.cor_marcacao.slice(1, 3), 16);
    const g = parseInt(anotacao.cor_marcacao.slice(3, 5), 16);
    const b = parseInt(anotacao.cor_marcacao.slice(5, 7), 16);
    
    rect.style.cssText = `
      position: absolute;
      left: ${anotacao.x_start}px;
      top: ${anotacao.y_start}px;
      width: ${anotacao.x_end - anotacao.x_start}px;
      height: ${anotacao.y_end - anotacao.y_start}px;
      border: 1px solid ${anotacao.cor_marcacao};
      background-color: rgba(${r}, ${g}, ${b}, 0.10);
      cursor: pointer;
      z-index: 10;
      box-sizing: border-box;
    `;

    // Adicionar botão de lixeira se não for readonly
    if (!readonly) {
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.className = 'delete-annotation-btn';
      deleteBtn.style.cssText = `
        position: absolute;
        top: -12px;
        right: -12px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 12px;
        cursor: pointer;
        display: none;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        removerAnotacao(anotacao.id!);
      };
      
      // Eventos de hover
      rect.addEventListener('mouseenter', () => {
        deleteBtn.style.display = 'block';
      });
      
      rect.addEventListener('mouseleave', () => {
        deleteBtn.style.display = 'none';
      });
      
      rect.appendChild(deleteBtn);
    } else {
      // Para modo readonly, mostrar comentário ao clicar
      rect.addEventListener('click', () => {
        toast({
          title: `${CORES_COMPETENCIAS[anotacao.competencia].label}`,
          description: anotacao.comentario,
          duration: 4000,
        });
      });
    }
    
    containerRef.current.appendChild(rect);
  };

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

      // Remover retângulo temporário
      const tempRect = containerRef.current?.querySelector('.temp-rectangle');
      if (tempRect) {
        tempRect.remove();
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
    // Remover retângulo temporário
    const tempRect = containerRef.current?.querySelector('.temp-rectangle');
    if (tempRect) {
      tempRect.remove();
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Redação Corrigida</span>
          </div>
          <Button variant="outline" size="sm" onClick={baixarImagemCorrigida}>
            <Download className="w-4 h-4 mr-2" />
            Baixar redação corrigida
          </Button>
        </div>
        
        {/* Legenda de Cores */}
        {anotacoes.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Legenda das Competências:</h4>
            <div className="flex flex-wrap gap-2">
              {[...new Set(anotacoes.map(a => a.competencia))].sort().map(competencia => (
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
        
        <div ref={containerRef} className="border rounded-lg p-4 bg-white relative">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação para correção" 
            className="max-w-full h-auto block"
            onLoad={handleImageLoad}
          />
        </div>
        
        {anotacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Feedback por Competência:</h4>
            {anotacoes.map((anotacao, index) => (
              <div key={index} className="p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: anotacao.cor_marcacao }}
                  />
                  <span className="font-medium text-sm">{CORES_COMPETENCIAS[anotacao.competencia].label}</span>
                </div>
                <p className="text-sm leading-relaxed">{anotacao.comentario}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Painel de Competências */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Selecionar Competência:</span>
          {Object.entries(CORES_COMPETENCIAS).map(([num, { cor, nome, label }]) => (
            <Button
              key={num}
              size="sm"
              variant={competenciaSelecionada === parseInt(num) ? "default" : "outline"}
              onClick={() => {
                console.log('Competência selecionada:', parseInt(num));
                setCompetenciaSelecionada(parseInt(num));
              }}
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
      </div>

      {/* Imagem da Redação */}
      <div ref={containerRef} className="border rounded-lg p-4 bg-white relative">
        <img 
          ref={imageRef}
          src={imagemUrl} 
          alt="Redação para correção" 
          className="max-w-full h-auto cursor-crosshair block"
          onLoad={handleImageLoad}
        />
      </div>

      {/* Dialog para comentário personalizado */}
      <Dialog open={dialogAberto} onOpenChange={(open) => {
        if (!open) {
          cancelarAnotacao();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: CORES_COMPETENCIAS[competenciaSelecionada].cor }}
              />
              {CORES_COMPETENCIAS[competenciaSelecionada].label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Área para digitação do comentário"
              value={comentarioTemp}
              onChange={(e) => setComentarioTemp(e.target.value)}
              rows={4}
              className="resize-none"
              autoFocus
            />
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelarAnotacao}>
                Cancelar
              </Button>
              <Button 
                onClick={salvarAnotacao}
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
});

RedacaoAnotacaoVisual.displayName = "RedacaoAnotacaoVisual";
