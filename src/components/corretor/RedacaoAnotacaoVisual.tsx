
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
  const containerRef = useRef<HTMLDivElement>(null);
  const annoRef = useRef<any>(null);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [dialogAberto, setDialogAberto] = useState<boolean>(false);
  const [comentarioTemp, setComentarioTemp] = useState<string>("");
  const [anotacaoTemp, setAnotacaoTemp] = useState<any>(null);
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisual[]>([]);
  const [anotacoesPendentes, setAnotacoesPendentes] = useState<any[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const { toast } = useToast();

  // Expor métodos para o componente pai
  useImperativeHandle(ref, () => ({
    salvarTodasAnotacoes,
    gerarImagemComAnotacoes
  }));

  // Carregar anotações existentes usando query direta
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
      
      // Converter dados do formato da tabela marcacoes_visuais para o formato esperado
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

  // Inicializar Annotorious apenas quando a imagem estiver carregada
  useEffect(() => {
    if (!imageRef.current || !imageLoaded) return;

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
        const anno = new Annotorious({
          image: imageRef.current!,
          readOnly: readonly,
          widgets: [],
          disableEditor: true, // Desabilita completamente o editor nativo
        });

        // Desabilitar completamente o pop-up nativo do Annotorious
        if (!readonly) {
          // Interceptar criação de anotações e impedir o pop-up nativo
          anno.on('createAnnotation', (annotation: any) => {
            // Prevenir comportamento padrão imediatamente
            annotation.preventDefault?.();
            
            // Remover a anotação temporária criada pelo Annotorious
            setTimeout(() => {
              try {
                anno.removeAnnotation(annotation.id);
              } catch (e) {
                console.warn('Annotation already removed');
              }
            }, 0);
            
            // Criar retângulo temporário com estilo customizado
            const tempRect = document.createElement('div');
            const bounds = annotation.target.selector.value.match(/xywh=pixel:(\d+),(\d+),(\d+),(\d+)/);
            if (bounds && imageRef.current) {
              const [, x, y, width, height] = bounds.map(Number);
              const imageRect = imageRef.current.getBoundingClientRect();
              const containerRect = imageRef.current.parentElement!.getBoundingClientRect();
              
              const r = parseInt(CORES_COMPETENCIAS[competenciaSelecionada].cor.slice(1, 3), 16);
              const g = parseInt(CORES_COMPETENCIAS[competenciaSelecionada].cor.slice(3, 5), 16);
              const b = parseInt(CORES_COMPETENCIAS[competenciaSelecionada].cor.slice(5, 7), 16);
              
              tempRect.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                border: 1px solid ${CORES_COMPETENCIAS[competenciaSelecionada].cor};
                background-color: rgba(${r}, ${g}, ${b}, 0.10);
                pointer-events: none;
                z-index: 10;
              `;
              
              imageRef.current.parentElement!.appendChild(tempRect);
              
              // Armazenar referência para remoção posterior
              annotation.tempElement = tempRect;
            }
            
            // Abrir nosso pop-up personalizado
            setAnotacaoTemp(annotation);
            setComentarioTemp("");
            setDialogAberto(true);
          });

          anno.on('deleteAnnotation', (annotation: any) => {
            // Remover anotação da lista pendente se existir
            setAnotacoesPendentes(prev => prev.filter(a => a.id !== annotation.id));
            // Remover da base de dados se já foi salva
            removerAnotacao(annotation.id);
          });
        }

        // Para modo readonly, mostrar comentários ao clicar
        if (readonly) {
          anno.on('selectAnnotation', (annotation: any) => {
            const anotacao = anotacoes.find(a => a.id === annotation.id);
            if (anotacao) {
              // Criar pop-up customizado para visualização
              const popup = document.createElement('div');
              popup.className = 'fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs';
              popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                padding: 12px;
                max-width: 300px;
                font-family: system-ui, -apple-system, sans-serif;
              `;
              
              popup.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${anotacao.cor_marcacao};"></div>
                  <span style="font-weight: 600; color: #374151; font-size: 14px;">${CORES_COMPETENCIAS[anotacao.competencia].label}</span>
                </div>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.4;">${anotacao.comentario}</p>
                <button onclick="this.parentNode.remove()" style="position: absolute; top: 4px; right: 8px; background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px;">×</button>
              `;
              
              document.body.appendChild(popup);
              
              // Remover popup ao clicar fora
              setTimeout(() => {
                const handleClickOutside = (e: MouseEvent) => {
                  if (!popup.contains(e.target as Node)) {
                    popup.remove();
                    document.removeEventListener('click', handleClickOutside);
                  }
                };
                document.addEventListener('click', handleClickOutside);
              }, 100);
            }
          });
        }

        annoRef.current = anno;

        // Carregar anotações existentes
        carregarAnotacoes();
      } catch (error) {
        console.error('Error initializing Annotorious:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initAnnotorious, 100);
    
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
  }, [imageLoaded, readonly, redacaoId]);

  // Função para aplicar estilo personalizado às anotações
  const aplicarEstiloAnotacao = (annotationId: string, cor: string) => {
    const element = document.querySelector(`[data-id="${annotationId}"]`) as HTMLElement;
    if (element) {
      // Converter HEX para RGBA para transparência
      const r = parseInt(cor.slice(1, 3), 16);
      const g = parseInt(cor.slice(3, 5), 16);
      const b = parseInt(cor.slice(5, 7), 16);
      
      element.style.border = `1px solid ${cor}`;
      element.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.10)`;
      element.style.boxSizing = 'border-box';
    }
  };

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Aplicar estilo às anotações carregadas
  useEffect(() => {
    if (!annoRef.current || anotacoes.length === 0 || !imageLoaded) return;

    anotacoes.forEach((anotacao) => {
      const annotation = {
        id: anotacao.id,
        target: {
          selector: {
            type: 'FragmentSelector',
            conformsTo: 'http://www.w3.org/TR/media-frags/',
            value: `xywh=pixel:${anotacao.x_start},${anotacao.y_start},${anotacao.x_end - anotacao.x_start},${anotacao.y_end - anotacao.y_start}`
          }
        },
        body: [{
          type: 'TextualBody',
          purpose: 'commenting',
          value: anotacao.comentario
        }]
      };

      try {
        annoRef.current.addAnnotation(annotation);
        
        // Aplicar estilo personalizado
        setTimeout(() => {
          aplicarEstiloAnotacao(anotacao.id!, anotacao.cor_marcacao);
          
          // Adicionar botão de lixeira se não for readonly
          if (!readonly) {
            const element = document.querySelector(`[data-id="${anotacao.id}"]`) as HTMLElement;
            if (element) {
              // Configurar posição relativa para o elemento pai
              element.style.position = 'relative';
              
              // Criar botão de lixeira
              const deleteBtn = document.createElement('button');
              deleteBtn.innerHTML = '🗑️';
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
              element.addEventListener('mouseenter', () => {
                deleteBtn.style.display = 'block';
              });
              
              element.addEventListener('mouseleave', () => {
                deleteBtn.style.display = 'none';
              });
              
              element.appendChild(deleteBtn);
            }
          }
        }, 100);
      } catch (error) {
        console.warn('Error adding annotation:', error);
      }
    });
  }, [anotacoes, imageLoaded, readonly, hoveredAnnotation]);

  // Salvar anotação individual
  const salvarAnotacao = async () => {
    if (!anotacaoTemp || !comentarioTemp.trim() || !imageRef.current) {
      toast({
        title: "Erro",
        description: "Comentário não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const bounds = anotacaoTemp.target.selector.value.match(/xywh=pixel:(\d+),(\d+),(\d+),(\d+)/);
      if (!bounds) throw new Error('Coordenadas inválidas');

      const [, x, y, width, height] = bounds.map(Number);

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
        imagem_largura: imageRef.current.naturalWidth,
        imagem_altura: imageRef.current.naturalHeight
      };

      const { data, error } = await supabase
        .from('marcacoes_visuais')
        .insert(novaAnotacao)
        .select()
        .single();

      if (error) throw error;

      // Remover elemento temporário se existir
      if (anotacaoTemp.tempElement) {
        anotacaoTemp.tempElement.remove();
      }

      // Recriar a anotação no Annotorious com o ID correto
      const newAnnotation = {
        id: data.id,
        target: anotacaoTemp.target,
        body: [{
          type: 'TextualBody',
          purpose: 'commenting',
          value: comentarioTemp.trim()
        }]
      };

      annoRef.current.addAnnotation(newAnnotation);
      
      // Aplicar estilo à anotação
      setTimeout(() => {
        aplicarEstiloAnotacao(data.id, CORES_COMPETENCIAS[competenciaSelecionada].cor);
      }, 100);

      toast({
        title: "Anotação salva!",
        description: "Comentário adicionado com sucesso.",
      });

      setDialogAberto(false);
      setAnotacaoTemp(null);
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

  // Salvar todas as anotações pendentes
  const salvarTodasAnotacoes = async () => {
    // As anotações já são salvas individualmente, então não há nada a fazer aqui
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
      if (annoRef.current) {
        annoRef.current.removeAnnotation(annotationId);
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
        
        <div ref={containerRef} className="border rounded-lg p-4 bg-white">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação para correção" 
            className="max-w-full h-auto"
            style={{ display: 'block' }}
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
      </div>

      {/* Imagem da Redação */}
      <div ref={containerRef} className="border rounded-lg p-4 bg-white">
        <img 
          ref={imageRef}
          src={imagemUrl} 
          alt="Redação para correção" 
          className="max-w-full h-auto cursor-crosshair"
          style={{ display: 'block' }}
          onLoad={handleImageLoad}
        />
      </div>

      {/* Dialog para comentário personalizado */}
      <Dialog open={dialogAberto} onOpenChange={(open) => {
        if (!open && anotacaoTemp?.tempElement) {
          // Remover elemento temporário se cancelar
          anotacaoTemp.tempElement.remove();
        }
        setDialogAberto(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: CORES_COMPETENCIAS[competenciaSelecionada].cor }}
              />
              Competência {competenciaSelecionada}
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
              <Button variant="outline" onClick={() => {
                // Remover elemento temporário
                if (anotacaoTemp?.tempElement) {
                  anotacaoTemp.tempElement.remove();
                }
                setDialogAberto(false);
                setAnotacaoTemp(null);
                setComentarioTemp("");
              }}>
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
