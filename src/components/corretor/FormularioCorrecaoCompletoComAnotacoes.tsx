
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { RedacaoAnotacaoVisual } from "./RedacaoAnotacaoVisual";

import { ArrowLeft, Save, CheckCircle } from "lucide-react";

interface FormularioCorrecaoCompletoComAnotacoesProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
  onRefreshList?: () => void;
}

interface RedacaoAnotacaoVisualRef {
  salvarTodasAnotacoes: () => Promise<void>;
  gerarImagemComAnotacoes: () => Promise<string>;
}

export const FormularioCorrecaoCompletoComAnotacoes = ({ 
  redacao, 
  corretorEmail, 
  onVoltar, 
  onSucesso,
  onRefreshList 
}: FormularioCorrecaoCompletoComAnotacoesProps) => {
  const [notas, setNotas] = useState({
    c1: 200,
    c2: 200,
    c3: 200,
    c4: 200,
    c5: 200,
  });
  
  const [relatorioPedagogico, setRelatorioPedagogico] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCorrecao, setLoadingCorrecao] = useState(true);
  const [manuscritaUrl, setManuscritaUrl] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Use useRef instead of state to avoid re-renders
  const anotacaoVisualRef = useRef<RedacaoAnotacaoVisualRef | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setManuscritaUrl(redacao.redacao_manuscrita_url || null);
    carregarCorrecaoExistente();
  }, [redacao.id, corretorEmail, redacao.redacao_manuscrita_url]);

  const carregarCorrecaoExistente = async () => {
    try {
      const tabela = `redacoes_${redacao.tipo_redacao === 'regular' ? 'enviadas' : redacao.tipo_redacao}`;
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';

      let query;
      
      if (tabela === 'redacoes_enviadas') {
        query = supabase.from('redacoes_enviadas').select('*').eq('id', redacao.id).maybeSingle();
      } else if (tabela === 'redacoes_simulado') {
        query = supabase.from('redacoes_simulado').select('*').eq('id', redacao.id).maybeSingle();
      } else {
        query = supabase.from('redacoes_exercicio').select('*').eq('id', redacao.id).maybeSingle();
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setNotas({
          c1: data[`c1_${prefixo}`] || 200,
          c2: data[`c2_${prefixo}`] || 200,
          c3: data[`c3_${prefixo}`] || 200,
          c4: data[`c4_${prefixo}`] || 200,
          c5: data[`c5_${prefixo}`] || 200,
        });
        
        setRelatorioPedagogico(data[`elogios_pontos_atencao_${prefixo}`] || "");
        setManuscritaUrl(data.redacao_manuscrita_url || null);
        
        if (data[`status_${prefixo}`] === 'incompleta' || data[`status_${prefixo}`] === 'corrigida') {
          setModoEdicao(true);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar correção:", error);
    } finally {
      setLoadingCorrecao(false);
    }
  };

  const calcularNotaTotal = () => {
    return notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;
  };

  const salvarAnotacoesVisuais = async () => {
    if (!anotacaoVisualRef.current?.salvarTodasAnotacoes) {
      console.log('Referência de anotação visual não disponível');
      return true; // Não bloquear se não há anotações visuais
    }

    try {
      await anotacaoVisualRef.current.salvarTodasAnotacoes();
      return true;
    } catch (error) {
      console.error('Erro ao salvar anotações visuais:', error);
      toast({
        title: "Erro ao salvar anotações visuais",
        description: "As anotações visuais não puderam ser salvas.",
        variant: "destructive"
      });
      return false;
    }
  };

  const salvarCorrecao = async (status: 'incompleta' | 'corrigida') => {
    setLoading(true);
    
    try {
      // Primeiro salvar as anotações visuais se existirem
      if (status === 'corrigida') {
        const anotacoesSalvas = await salvarAnotacoesVisuais();
        if (!anotacoesSalvas) {
          setLoading(false);
          return;
        }
      }

      const tabela = redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : 
                    redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio';
      const notaTotal = calcularNotaTotal();

      const { data, error } = await supabase.rpc('salvar_correcao_corretor', {
        redacao_id: redacao.id,
        tabela_nome: tabela,
        eh_corretor_1: redacao.eh_corretor_1,
        c1_nota: notas.c1,
        c2_nota: notas.c2,
        c3_nota: notas.c3,
        c4_nota: notas.c4,
        c5_nota: notas.c5,
        nota_final: notaTotal,
        status_correcao: status,
        comentario_c1: "",
        comentario_c2: "",
        comentario_c3: "",
        comentario_c4: "",
        comentario_c5: "",
        elogios_pontos: relatorioPedagogico.trim()
      });

      if (error) throw error;

      toast({
        title: status === 'corrigida' ? "Correção finalizada!" : "Correção salva!",
        description: status === 'corrigida' 
          ? `Redação de ${redacao.nome_aluno} foi corrigida com nota ${notaTotal}/1000.`
          : "Você pode continuar a correção mais tarde.",
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onRefreshList) {
        await onRefreshList();
      }

      onSucesso();
    } catch (error: any) {
      console.error("Erro ao salvar correção:", error);
      toast({
        title: "Erro ao salvar correção",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const opcoesNota = [0, 40, 80, 120, 160, 200];

  if (loadingCorrecao) {
    return <div>Carregando correção...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold">Correção Visual Avançada</h1>
        </div>
      </div>

      {/* Informações da redação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
          <div><strong>Tipo:</strong> {redacao.tipo_redacao}</div>
          <div><strong>Data:</strong> {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}</div>
          <div><strong>Status:</strong> {redacao.status_minha_correcao}</div>
        </div>
      </div>

      {/* Tema */}
      <div className="p-3 bg-primary/5 rounded-lg">
        <strong>Tema:</strong> {redacao.frase_tematica}
      </div>

      {/* Vista Pedagógica - Movida para o topo */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vista Pedagógica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4 items-center">
            {/* Competências C1 a C5 */}
            {['c1', 'c2', 'c3', 'c4', 'c5'].map((competencia, index) => {
              const cores = ['#F94C4C', '#3CD856', '#4285F4', '#B76AF8', '#FF8C32'];
              const corCompetencia = cores[index];
              
              return (
                <div key={competencia} className="flex flex-col items-center space-y-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: corCompetencia }}
                    />
                    <Label className="text-sm font-medium">C{index + 1}</Label>
                  </div>
                  <Select
                    value={notas[competencia as keyof typeof notas].toString()}
                    onValueChange={(value) => 
                      setNotas(prev => ({
                        ...prev,
                        [competencia]: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoesNota.map(nota => (
                        <SelectItem key={nota} value={nota.toString()}>
                          {nota}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-500">/200</span>
                </div>
              );
            })}
            
            {/* Nota Total */}
            <div className="flex flex-col items-center">
              <Label className="text-sm font-medium mb-2">Nota Total</Label>
              <div className="text-xl font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
                {calcularNotaTotal()}/1000
              </div>
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => salvarCorrecao('incompleta')} disabled={loading}>
              <Save className="w-4 h-4 mr-1" />
              Salvar Incompleta
            </Button>
            <Button onClick={() => salvarCorrecao('corrigida')} disabled={loading}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Finalizar Correção
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redação com Sistema de Anotações Visuais - Agora ocupa toda a largura */}
      <div className="w-full">
        {manuscritaUrl ? (
          <RedacaoAnotacaoVisual
            imagemUrl={manuscritaUrl}
            redacaoId={redacao.id}
            corretorId={redacao.eh_corretor_1 ? redacao.id : redacao.id} // Simplificado para demo
            readonly={false}
            ref={(ref) => {
              anotacaoVisualRef.current = ref;
            }}
          />
        ) : (
          <div className="bg-white rounded-lg p-6 border">
            <div className="prose prose-base max-w-none">
              <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-800">
                {redacao.texto}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Relatório pedagógico de correção */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Relatório pedagógico de correção</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={relatorioPedagogico}
            onChange={(e) => setRelatorioPedagogico(e.target.value)}
            placeholder="Digite aqui seu relatório pedagógico completo para o aluno..."
            rows={6}
            className="w-full resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
};
