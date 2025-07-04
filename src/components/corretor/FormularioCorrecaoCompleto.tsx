import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { ArrowLeft, Save, CheckCircle, Copy } from "lucide-react";

interface FormularioCorrecaoCompletoProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
  onRefreshList?: () => void;
}

export const FormularioCorrecaoCompleto = ({ 
  redacao, 
  corretorEmail, 
  onVoltar, 
  onSucesso,
  onRefreshList 
}: FormularioCorrecaoCompletoProps) => {
  const [notas, setNotas] = useState({
    c1: 0,
    c2: 0,
    c3: 0,
    c4: 0,
    c5: 0,
  });
  
  const [comentarios, setComentarios] = useState({
    c1: "",
    c2: "",
    c3: "",
    c4: "",
    c5: "",
  });
  
  const [elogiosEPontosAtencao, setElogiosEPontosAtencao] = useState("");
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
        .select('*')
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
        
        setComentarios({
          c1: data[`comentario_c1_${prefixo}`] || "",
          c2: data[`comentario_c2_${prefixo}`] || "",
          c3: data[`comentario_c3_${prefixo}`] || "",
          c4: data[`comentario_c4_${prefixo}`] || "",
          c5: data[`comentario_c5_${prefixo}`] || "",
        });
        
        setElogiosEPontosAtencao(data[`elogios_pontos_atencao_${prefixo}`] || "");
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
        [`comentario_c1_${prefixo}`]: comentarios.c1.trim(),
        [`comentario_c2_${prefixo}`]: comentarios.c2.trim(),
        [`comentario_c3_${prefixo}`]: comentarios.c3.trim(),
        [`comentario_c4_${prefixo}`]: comentarios.c4.trim(),
        [`comentario_c5_${prefixo}`]: comentarios.c5.trim(),
        [`elogios_pontos_atencao_${prefixo}`]: elogiosEPontosAtencao.trim(),
      };

      // Se a correção está sendo finalizada, marcar também como corrigida
      if (status === 'corrigida') {
        updateData.corrigida = true;
        updateData.data_correcao = new Date().toISOString();
      }

      console.log('Salvando correção:', { tabela, updateData, redacaoId: redacao.id });

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

      // Aguardar um momento para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));

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

  const copiarPromptCorrecao = () => {
    const promptCompleto = `🎯 PROMPT DE CORREÇÃO DE REDAÇÃO ENEM – LABORATÓRIO DO REDATOR

Aluno: ${redacao.nome_aluno}
Frase temática: ${redacao.frase_tematica}

Texto da redação:
${redacao.texto}

---

Você é um corretor especialista em redações do ENEM, treinado segundo a matriz oficial do INEP e os critérios do Laboratório do Redator. Corrija esta redação por competências (C1 a C5), com a seguinte estrutura:

✅ Competência [X] – [Nome da competência]

Erros identificados:
1. [Trecho com erro]
   - 🔧 Correção sugerida: [...]
   - 💬 Comentário pedagógico: [...]

Checklist técnico:
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

Nota atribuída: [0, 40, 80, 120, 160, 200]
Justificativa da nota: [...]

(Repita para C2, C3, C4, C5)

📌 Finalização:

Resumo final para o aluno:
- Pontuação total: ___
- Sugestão de melhoria mais urgente: ___
- Um ponto positivo para valorizar: ___`;

    navigator.clipboard.writeText(promptCompleto).then(() => {
      toast({
        title: "Prompt copiado com sucesso!",
        description: "O prompt de correção foi copiado para a área de transferência."
      });
    }).catch(() => {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o prompt. Tente novamente.",
        variant: "destructive"
      });
    });
  };

  const opcoesNota = [0, 40, 80, 120, 160, 200];
  const competenciasLabels = [
    "Domínio da escrita formal da língua portuguesa",
    "Compreensão da proposta de redação",
    "Seleção, organização e interpretação de informações",
    "Conhecimento dos mecanismos linguísticos",
    "Proposta de intervenção"
  ];

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
        <h1 className="text-2xl font-bold">Vista Pedagógica - Correção Completa</h1>
        <Button 
          variant="outline" 
          onClick={copiarPromptCorrecao}
          className="ml-auto flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        >
          <Copy className="w-4 h-4" />
          Copiar Prompt de Correção
        </Button>
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
          <CardTitle>Avaliação por Competências - Vista Pedagógica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {['c1', 'c2', 'c3', 'c4', 'c5'].map((competencia, index) => (
            <div key={competencia} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-4 mb-3">
                <Label className="w-32 font-semibold">Competência {index + 1}:</Label>
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
              
              <div className="text-xs text-gray-600 mb-2">
                {competenciasLabels[index]}
              </div>
              
              <div>
                <Label className="text-sm font-medium">Comentário pedagógico – C{index + 1}</Label>
                <Textarea
                  value={comentarios[competencia as keyof typeof comentarios]}
                  onChange={(e) => 
                    setComentarios(prev => ({
                      ...prev,
                      [competencia]: e.target.value
                    }))
                  }
                  placeholder={`Escreva aqui o comentário pedagógico para a competência ${index + 1}...`}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex items-center gap-4 text-lg font-semibold mb-4">
              <Label>Nota Total:</Label>
              <span className="text-2xl text-primary">{calcularNotaTotal()}/1000</span>
            </div>
            
            <div>
              <Label className="text-base font-medium">Elogios e pontos de atenção</Label>
              <Textarea
                value={elogiosEPontosAtencao}
                onChange={(e) => setElogiosEPontosAtencao(e.target.value)}
                placeholder="Escreva aqui elogios gerais e pontos que merecem atenção especial..."
                className="mt-2"
                rows={4}
              />
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
          {loading ? "Finalizando..." : "Salvar Correção Completa"}
        </Button>
      </div>
    </div>
  );
};
