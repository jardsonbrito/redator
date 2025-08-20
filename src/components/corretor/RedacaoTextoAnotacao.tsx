import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, Eye, Edit3 } from "lucide-react";

// Importar Annotorious
import { Annotorious } from '@recogito/annotorious';

// Importar CSS do Annotorious
import '@recogito/annotorious/dist/annotorious.min.css';

// Estilos customizados para anotações em texto
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
  
  /* Container de texto para anotação */
  .texto-redacao-container {
    width: 100%;
    padding: 32px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: 'Times New Roman', serif;
    font-size: 14px;
    line-height: 1.15;
    color: #000;
    white-space: pre-wrap;
    word-wrap: break-word;
    position: relative;
    min-height: 600px;
  }
  
  .texto-redacao-container p {
    margin-bottom: 16px;
    text-align: justify;
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
`;

// Cores das competências
const competenciaColors = {
  1: { cor: '#E53935', nome: 'C1' },
  2: { cor: '#43A047', nome: 'C2' },
  3: { cor: '#2196F3', nome: 'C3' },
  4: { cor: '#FF9800', nome: 'C4' },
  5: { cor: '#9C27B0', nome: 'C5' }
};

interface RedacaoTextoAnotacaoProps {
  redacaoId: string;
  texto: string;
  corretorId: string;
  readonly?: boolean;
}

interface Anotacao {
  id: string;
  competencia: number;
  comentario: string;
  coordenadas: any;
}

export const RedacaoTextoAnotacao = ({
  redacaoId,
  texto,
  corretorId,
  readonly = false
}: RedacaoTextoAnotacaoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const annotoriousRef = useRef<Annotorious | null>(null);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [showComentarioModal, setShowComentarioModal] = useState(false);
  const [comentarioAtual, setComentarioAtual] = useState("");
  const [anotacaoEditando, setAnotacaoEditando] = useState<string | null>(null);
  const [showListaAnotacoes, setShowListaAnotacoes] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Adicionar estilos customizados
    const style = document.createElement('style');
    style.textContent = customStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && texto) {
      initializeAnnotorious();
      carregarAnotacoes();
    }

    return () => {
      if (annotoriousRef.current) {
        annotoriousRef.current.destroy();
      }
    };
  }, [containerRef.current, texto]);

  const initializeAnnotorious = () => {
    if (!containerRef.current) return;

    try {
      // Criar canvas temporário para o Annotorious
      const canvas = document.createElement('canvas');
      canvas.width = containerRef.current.offsetWidth;
      canvas.height = containerRef.current.offsetHeight;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'all';
      canvas.style.zIndex = '10';
      
      containerRef.current.appendChild(canvas);

      // Desenhar fundo transparente no canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const anno = new Annotorious({
        image: canvas,
        readOnly: readonly,
        allowEmpty: false,
        disableEditor: true
      });

      annotoriousRef.current = anno;

      if (!readonly) {
        anno.on('createAnnotation', handleCreateAnnotation);
        anno.on('selectAnnotation', handleSelectAnnotation);
      }

      console.log('Annotorious inicializado para texto');
    } catch (error) {
      console.error('Erro ao inicializar Annotorious:', error);
    }
  };

  const carregarAnotacoes = async () => {
    try {
      // Por enquanto usar localStorage até criar a tabela no banco
      const chave = `anotacoes_${redacaoId}_${corretorId}`;
      const anotacoesSalvas = localStorage.getItem(chave);
      const data = anotacoesSalvas ? JSON.parse(anotacoesSalvas) : [];

      console.log('Anotações carregadas:', data);
      setAnotacoes(data || []);

      // Aplicar anotações no Annotorious
      if (annotoriousRef.current && data) {
        data.forEach((anotacao: Anotacao) => {
          try {
            const annotation = {
              id: anotacao.id,
              body: [{
                type: "TextualBody",
                value: anotacao.comentario,
                purpose: "commenting"
              }],
              target: {
                source: containerRef.current,
                selector: anotacao.coordenadas
              }
            };

            annotoriousRef.current.addAnnotation(annotation);
            
            // Aplicar classe da competência
            setTimeout(() => {
              const element = document.querySelector(`[data-id="${anotacao.id}"]`);
              if (element) {
                element.classList.add(`competencia-${anotacao.competencia}`);
              }
            }, 100);
          } catch (error) {
            console.warn('Erro ao aplicar anotação:', error);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    }
  };

  const handleCreateAnnotation = (annotation: any) => {
    if (readonly) return;
    
    setAnotacaoEditando(annotation.id);
    setComentarioAtual("");
    setShowComentarioModal(true);
  };

  const handleSelectAnnotation = (annotation: any) => {
    const anotacao = anotacoes.find(a => a.id === annotation.id);
    if (anotacao) {
      setAnotacaoEditando(annotation.id);
      setComentarioAtual(anotacao.comentario);
      setCompetenciaSelecionada(anotacao.competencia);
      setShowComentarioModal(true);
    }
  };

  const salvarAnotacao = async () => {
    if (!anotacaoEditando || !comentarioAtual.trim()) return;

    try {
      const annotation = annotoriousRef.current?.getAnnotationById(anotacaoEditando);
      if (!annotation) return;

      const novaAnotacao = {
        id: anotacaoEditando,
        competencia: competenciaSelecionada,
        comentario: comentarioAtual.trim(),
        coordenadas: annotation.target.selector
      };

      // Salvar no localStorage por enquanto
      const chave = `anotacoes_${redacaoId}_${corretorId}`;
      const anotacoesExistentes = localStorage.getItem(chave);
      const anotacoes = anotacoesExistentes ? JSON.parse(anotacoesExistentes) : [];
      
      const index = anotacoes.findIndex((a: Anotacao) => a.id === anotacaoEditando);
      if (index >= 0) {
        anotacoes[index] = novaAnotacao;
      } else {
        anotacoes.push(novaAnotacao);
      }
      
      localStorage.setItem(chave, JSON.stringify(anotacoes));

      // Aplicar classe da competência
      const element = document.querySelector(`[data-id="${anotacaoEditando}"]`);
      if (element) {
        // Remover classes anteriores
        Object.keys(competenciaColors).forEach(comp => {
          element.classList.remove(`competencia-${comp}`);
        });
        // Adicionar nova classe
        element.classList.add(`competencia-${competenciaSelecionada}`);
      }

      toast({
        title: "Anotação salva!",
        description: `Comentário da ${competenciaColors[competenciaSelecionada].nome} adicionado.`
      });

      setShowComentarioModal(false);
      setAnotacaoEditando(null);
      setComentarioAtual("");
      
      carregarAnotacoes(); // Recarregar para atualizar a lista
    } catch (error: any) {
      console.error('Erro ao salvar anotação:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a anotação.",
        variant: "destructive"
      });
    }
  };

  const excluirAnotacao = async (anotacaoId: string) => {
    try {
      // Remover do localStorage
      const chave = `anotacoes_${redacaoId}_${corretorId}`;
      const anotacoesExistentes = localStorage.getItem(chave);
      const anotacoes = anotacoesExistentes ? JSON.parse(anotacoesExistentes) : [];
      
      const anotacoesFiltradas = anotacoes.filter((a: Anotacao) => a.id !== anotacaoId);
      localStorage.setItem(chave, JSON.stringify(anotacoesFiltradas));

      // Remover do Annotorious
      if (annotoriousRef.current) {
        annotoriousRef.current.removeAnnotation(anotacaoId);
      }

      toast({
        title: "Anotação excluída",
        description: "A anotação foi removida com sucesso."
      });

      carregarAnotacoes();
    } catch (error: any) {
      console.error('Erro ao excluir anotação:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a anotação.",
        variant: "destructive"
      });
    }
  };

  const formatarTextoComParagrafos = (texto: string) => {
    return texto.split('\n').map((paragrafo, index) => (
      <p key={index}>
        {paragrafo || '\u00A0'}
      </p>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Competências */}
      {!readonly && (
        <div className="flex items-center gap-3 p-4 bg-muted/10 rounded-lg">
          <span className="text-sm font-medium">Competência:</span>
          {Object.entries(competenciaColors).map(([num, info]) => (
            <button
              key={num}
              onClick={() => setCompetenciaSelecionada(parseInt(num))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                competenciaSelecionada === parseInt(num)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: info.cor }}
              />
              <span className="text-sm font-medium">{info.nome}</span>
            </button>
          ))}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setShowListaAnotacoes(true)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver Anotações ({anotacoes.length})
        </Button>
      </div>

      {/* Container do Texto com Anotações */}
      <div 
        ref={containerRef}
        className="texto-redacao-container relative"
        style={{
          fontSize: '14px',
          lineHeight: '1.15',
          fontFamily: 'Times New Roman, serif'
        }}
      >
        {formatarTextoComParagrafos(texto)}
      </div>

      {/* Modal de Comentário */}
      <Dialog open={showComentarioModal} onOpenChange={setShowComentarioModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: competenciaColors[competenciaSelecionada].cor }}
              />
              Comentário - {competenciaColors[competenciaSelecionada].nome}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Competência:</label>
              <div className="flex gap-2">
                {Object.entries(competenciaColors).map(([num, info]) => (
                  <button
                    key={num}
                    onClick={() => setCompetenciaSelecionada(parseInt(num))}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      competenciaSelecionada === parseInt(num)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: info.cor }}
                    />
                    {info.nome}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Comentário:</label>
              <Textarea
                placeholder="Digite seu comentário sobre esta parte da redação..."
                value={comentarioAtual}
                onChange={(e) => setComentarioAtual(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowComentarioModal(false);
                  if (anotacaoEditando && annotoriousRef.current) {
                    annotoriousRef.current.removeAnnotation(anotacaoEditando);
                  }
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={salvarAnotacao}
                disabled={!comentarioAtual.trim()}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Lista de Anotações */}
      <Dialog open={showListaAnotacoes} onOpenChange={setShowListaAnotacoes}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Lista de Anotações ({anotacoes.length})</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {anotacoes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma anotação criada ainda.
              </p>
            ) : (
              anotacoes.map((anotacao) => (
                <div
                  key={anotacao.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                      style={{ 
                        borderColor: competenciaColors[anotacao.competencia].cor,
                        color: competenciaColors[anotacao.competencia].cor
                      }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: competenciaColors[anotacao.competencia].cor }}
                      />
                      {competenciaColors[anotacao.competencia].nome}
                    </Badge>
                    
                    {!readonly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAnotacaoEditando(anotacao.id);
                            setComentarioAtual(anotacao.comentario);
                            setCompetenciaSelecionada(anotacao.competencia);
                            setShowListaAnotacoes(false);
                            setShowComentarioModal(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => excluirAnotacao(anotacao.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {anotacao.comentario}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};