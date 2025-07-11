
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Save } from "lucide-react";

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

const CORES_COMPETENCIAS = {
  1: { cor: '#F94C4C', nome: 'Vermelho', label: 'C1 - Norma Culta' },
  2: { cor: '#3CD856', nome: 'Verde', label: 'C2 - Compreensão' },
  3: { cor: '#4285F4', nome: 'Azul', label: 'C3 - Argumentação' },
  4: { cor: '#B76AF8', nome: 'Roxo', label: 'C4 - Coesão' },
  5: { cor: '#FF8C32', nome: 'Laranja', label: 'C5 - Proposta' },
};

export const RedacaoAnotacaoVisual = ({ 
  imagemUrl, 
  redacaoId, 
  corretorId,
  readonly = false 
}: RedacaoAnotacaoVisualProps) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const annoRef = useRef<any>(null);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number>(1);
  const [dialogAberto, setDialogAberto] = useState<boolean>(false);
  const [comentarioTemp, setComentarioTemp] = useState<string>("");
  const [anotacaoTemp, setAnotacaoTemp] = useState<any>(null);
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisual[]>([]);
  const { toast } = useToast();

  // Carregar anotações existentes usando query direta
  const carregarAnotacoes = async () => {
    try {
      // Primeiro tentar buscar na tabela marcacoes_visuais
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

  // Inicializar Annotorious
  useEffect(() => {
    if (!imageRef.current) return;

    const initAnnotorious = () => {
      if (annoRef.current) {
        annoRef.current.destroy();
      }

      const anno = new Annotorious({
        image: imageRef.current!,
        readOnly: readonly,
        widgets: readonly ? [] : ['COMMENT'],
      });

      // Configurar eventos apenas se não for readonly
      if (!readonly) {
        anno.on('createAnnotation', (annotation: any) => {
          setAnotacaoTemp(annotation);
          setComentarioTemp("");
          setDialogAberto(true);
        });

        anno.on('selectAnnotation', (annotation: any) => {
          if (readonly) {
            const anotacao = anotacoes.find(a => a.id === annotation.id);
            if (anotacao) {
              toast({
                title: `${CORES_COMPETENCIAS[anotacao.competencia].label}`,
                description: anotacao.comentario,
                duration: 4000,
              });
            }
          }
        });
      }

      annoRef.current = anno;

      // Carregar anotações existentes
      carregarAnotacoes();
    };

    if (imageRef.current.complete) {
      initAnnotorious();
    } else {
      imageRef.current.onload = initAnnotorious;
    }

    return () => {
      if (annoRef.current) {
        annoRef.current.destroy();
      }
    };
  }, [imagemUrl, readonly, redacaoId]);

  // Aplicar estilo às anotações carregadas
  useEffect(() => {
    if (!annoRef.current || anotacoes.length === 0) return;

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

      annoRef.current.addAnnotation(annotation);
      
      // Aplicar estilo personalizado
      setTimeout(() => {
        const element = document.querySelector(`[data-id="${anotacao.id}"]`);
        if (element) {
          (element as HTMLElement).style.border = `2px solid ${anotacao.cor_marcacao}`;
          (element as HTMLElement).style.backgroundColor = anotacao.cor_marcacao + '33';
        }
      }, 100);
    });
  }, [anotacoes]);

  // Salvar anotação usando insert direto na tabela marcacoes_visuais
  const salvarAnotacao = async () => {
    if (!anotacaoTemp || !comentarioTemp.trim() || !imageRef.current) return;

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

      // Inserir diretamente na tabela marcacoes_visuais
      const { error } = await supabase
        .from('marcacoes_visuais')
        .insert(novaAnotacao);
      
      if (error) throw error;

      // Aplicar estilo à anotação
      setTimeout(() => {
        const element = document.querySelector(`[data-id="${anotacaoTemp.id}"]`);
        if (element) {
          (element as HTMLElement).style.border = `2px solid ${CORES_COMPETENCIAS[competenciaSelecionada].cor}`;
          (element as HTMLElement).style.backgroundColor = CORES_COMPETENCIAS[competenciaSelecionada].cor + '33';
        }
      }, 100);

      toast({
        title: "Anotação salva!",
        description: "Comentário adicionado com sucesso.",
      });

      setDialogAberto(false);
      setAnotacaoTemp(null);
      setComentarioTemp("");
      await carregarAnotacoes();

    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a anotação.",
        variant: "destructive",
      });
    }
  };

  if (readonly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <span className="font-medium">Correção com Anotações Visuais</span>
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
        
        <div className="border rounded-lg p-4 bg-white">
          <img 
            ref={imageRef}
            src={imagemUrl} 
            alt="Redação para correção" 
            className="max-w-full h-auto"
            style={{ display: 'block' }}
          />
        </div>
        
        {anotacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Feedback por Competência:</h4>
            {anotacoes.map((anotacao, index) => (
              <div key={index} className="p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: anotacao.cor_marcacao, color: 'white' }}>
                    {CORES_COMPETENCIAS[anotacao.competencia].label}
                  </Badge>
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

      {/* Instruções */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
        <p className="font-medium text-blue-700 mb-1">📝 Como usar:</p>
        <ul className="text-blue-600 space-y-1">
          <li>1. Selecione uma competência (C1 a C5)</li>
          <li>2. Clique e arraste sobre a imagem para marcar uma área</li>
          <li>3. Digite seu comentário no pop-up que aparecer</li>
          <li>4. A marcação será salva com a cor da competência escolhida</li>
        </ul>
      </div>

      {/* Imagem da Redação */}
      <div className="border rounded-lg p-4 bg-white">
        <img 
          ref={imageRef}
          src={imagemUrl} 
          alt="Redação para correção" 
          className="max-w-full h-auto cursor-crosshair"
          style={{ display: 'block' }}
        />
      </div>

      {/* Lista de anotações salvas */}
      {anotacoes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Anotações Salvas:</h4>
          {anotacoes.map((anotacao, index) => (
            <div key={index} className="p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge style={{ backgroundColor: anotacao.cor_marcacao, color: 'white' }}>
                  {CORES_COMPETENCIAS[anotacao.competencia].label}
                </Badge>
              </div>
              <p className="text-sm">{anotacao.comentario}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para comentário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar Comentário - {CORES_COMPETENCIAS[competenciaSelecionada].label}
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
              placeholder="Digite seu comentário sobre esta área da redação..."
              value={comentarioTemp}
              onChange={(e) => setComentarioTemp(e.target.value)}
              rows={4}
            />
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogAberto(false)}>
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
};
