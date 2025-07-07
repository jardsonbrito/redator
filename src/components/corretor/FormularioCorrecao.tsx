
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";

interface FormularioCorrecaoProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

export const FormularioCorrecao = ({ redacao, corretorEmail, onVoltar, onSucesso }: FormularioCorrecaoProps) => {
  const [notas, setNotas] = useState({
    c1: 0,
    c2: 0,
    c3: 0,
    c4: 0,
    c5: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingCorrecao, setLoadingCorrecao] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    carregarCorrecaoExistente();
  }, [redacao.id, corretorEmail]);

  const carregarCorrecaoExistente = async () => {
    try {
      const tabela = `redacoes_${redacao.tipo_redacao === 'regular' ? 'enviadas' : redacao.tipo_redacao}`;
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';

      const { data, error } = await supabase
        .from(tabela as any)
        .select(`
          c1_${prefixo},
          c2_${prefixo},
          c3_${prefixo},
          c4_${prefixo},
          c5_${prefixo}
        `)
        .eq('id', redacao.id)
        .single();

      if (error) throw error;

      if (data) {
        setNotas({
          c1: data[`c1_${prefixo}`] || 0,
          c2: data[`c2_${prefixo}`] || 0,
          c3: data[`c3_${prefixo}`] || 0,
          c4: data[`c4_${prefixo}`] || 0,
          c5: data[`c5_${prefixo}`] || 0,
        });
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

  const salvarCorrecao = async (status: 'incompleta' | 'corrigida') => {
    setLoading(true);
    
    try {
      const tabela = `redacoes_${redacao.tipo_redacao === 'regular' ? 'enviadas' : redacao.tipo_redacao}`;
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';
      const notaTotal = calcularNotaTotal();

      const updateData: any = {
        [`c1_${prefixo}`]: notas.c1,
        [`c2_${prefixo}`]: notas.c2,
        [`c3_${prefixo}`]: notas.c3,
        [`c4_${prefixo}`]: notas.c4,
        [`c5_${prefixo}`]: notas.c5,
        [`nota_final_${prefixo}`]: notaTotal,
        [`status_${prefixo}`]: status,
      };

      // Se a correção está sendo finalizada, verificar se deve marcar como corrigida geral
      if (status === 'corrigida') {
        const { data: redacaoAtual } = await supabase
          .from(tabela as any)
          .select('*')
          .eq('id', redacao.id)
          .single();

        if (redacaoAtual) {
          const outroCorretor = redacao.eh_corretor_1 ? 'corretor_2' : 'corretor_1';
          const outroCorretorFinalizou = redacaoAtual[`status_${outroCorretor}`] === 'corrigida';
          
          // Se só há um corretor ou se o outro também finalizou
          if (!redacaoAtual[`corretor_id_${outroCorretor === 'corretor_1' ? '1' : '2'}`] || outroCorretorFinalizou) {
            updateData.corrigida = true;
            updateData.data_correcao = new Date().toISOString();
          }
        }
      }

      const { error } = await supabase
        .from(tabela as any)
        .update(updateData)
        .eq('id', redacao.id);

      if (error) throw error;

      toast({
        title: status === 'corrigida' ? "Correção finalizada!" : "Correção salva!",
        description: status === 'corrigida' 
          ? `Redação de ${redacao.nome_aluno} foi corrigida com nota ${notaTotal}/1000.`
          : "Você pode continuar a correção mais tarde.",
      });

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Vista Pedagógica - Correção</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Redação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
          <div><strong>Tipo:</strong> {redacao.tipo_redacao}</div>
          <div className="col-span-2"><strong>Tema:</strong> {redacao.frase_tematica}</div>
          <div><strong>Data:</strong> {new Date(redacao.data_envio).toLocaleString('pt-BR')}</div>
          <div><strong>Status:</strong> {redacao.status_minha_correcao}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Texto da Redação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto whitespace-pre-wrap">
            {redacao.texto}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avaliação por Competências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['c1', 'c2', 'c3', 'c4', 'c5'].map((competencia, index) => (
            <div key={competencia} className="flex items-center gap-4">
              <Label className="w-32">Competência {index + 1}:</Label>
              <Select
                value={notas[competencia as keyof typeof notas].toString()}
                onValueChange={(value) => 
                  setNotas(prev => ({
                    ...prev,
                    [competencia]: parseInt(value)
                  }))
                }
              >
                <SelectTrigger className="w-32">
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
              <span className="text-sm text-muted-foreground">/ 200</span>
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex items-center gap-4 text-lg font-semibold">
              <Label>Nota Total:</Label>
              <span className="text-2xl text-primary">{calcularNotaTotal()}/1000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={() => salvarCorrecao('incompleta')}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Salvando..." : "Salvar como Incompleta"}
        </Button>
        
        <Button
          onClick={() => salvarCorrecao('corrigida')}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {loading ? "Finalizando..." : "Finalizar Correção"}
        </Button>
      </div>
    </div>
  );
};
