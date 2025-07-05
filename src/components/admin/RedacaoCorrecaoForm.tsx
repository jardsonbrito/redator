import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy } from "lucide-react";
import { RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";
import { useRedacaoStatus } from "@/hooks/useRedacaoStatus";

interface RedacaoCorrecaoFormProps {
  redacao: RedacaoEnviada;
  onCancel: () => void;
  onSuccess: () => void;
  onCopyRedacao: (redacao: RedacaoEnviada) => void;
}

export const RedacaoCorrecaoForm = ({ redacao, onCancel, onSuccess, onCopyRedacao }: RedacaoCorrecaoFormProps) => {
  const [nota_c1, setNotaC1] = useState(redacao.nota_c1?.toString() || "");
  const [nota_c2, setNotaC2] = useState(redacao.nota_c2?.toString() || "");
  const [nota_c3, setNotaC3] = useState(redacao.nota_c3?.toString() || "");
  const [nota_c4, setNotaC4] = useState(redacao.nota_c4?.toString() || "");
  const [nota_c5, setNotaC5] = useState(redacao.nota_c5?.toString() || "");
  const [comentario, setComentario] = useState(redacao.comentario_admin || "");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { updateRedacaoStatus } = useRedacaoStatus();

  const copiarPromptCorrecao = () => {
    const promptCompleto = `🎯 PROMPT DE CORREÇÃO DE REDAÇÃO ENEM – LABORATÓRIO DO REDATOR

Aluno: ${redacao.nome_aluno}
Frase temática: ${redacao.frase_tematica}

Texto da redação:
${redacao.redacao_texto}

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

  const handleSubmitCorrection = async () => {
    const c1 = parseInt(nota_c1) || 0;
    const c2 = parseInt(nota_c2) || 0;
    const c3 = parseInt(nota_c3) || 0;
    const c4 = parseInt(nota_c4) || 0;
    const c5 = parseInt(nota_c5) || 0;
    const total = c1 + c2 + c3 + c4 + c5;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("redacoes_enviadas")
        .update({
          nota_c1: c1,
          nota_c2: c2,
          nota_c3: c3,
          nota_c4: c4,
          nota_c5: c5,
          nota_total: total,
          comentario_admin: comentario,
          corrigida: true,
          data_correcao: new Date().toISOString(),
          status: "corrigida"
        })
        .eq("id", redacao.id);

      if (error) throw error;

      // Atualizar status usando o hook
      await updateRedacaoStatus(redacao.id, 'regular', true);

      toast({
        title: "Correção salva com sucesso!",
        description: `Redação de ${redacao.nome_aluno} foi corrigida.`
      });

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar correção:", error);
      toast({
        title: "Erro ao salvar correção",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Corrigir Redação - {redacao.nome_aluno}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copiarPromptCorrecao}
              className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              title="Copiar prompt de correção com dados do aluno"
            >
              <Copy className="w-4 h-4" />
              Copiar Prompt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyRedacao(redacao)}
              className="flex items-center gap-2"
              title="Copiar redação com dados do aluno"
            >
              <Copy className="w-4 h-4" />
              Copiar Redação
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
          <div><strong>E-mail:</strong> {redacao.email_aluno}</div>
          <div><strong>Turma:</strong> {redacao.turma}</div>
          <div><strong>Data de Envio:</strong> {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}</div>
        </div>

        <div>
          <Label className="text-base font-semibold">Tema:</Label>
          <p className="mt-1 p-3 bg-gray-50 rounded-md">{redacao.frase_tematica}</p>
        </div>

        <div>
          <Label className="text-base font-semibold">Texto da Redação:</Label>
          <div className="mt-1 p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto whitespace-pre-wrap">
            {redacao.redacao_texto}
          </div>
        </div>

        {/* Mostrar correções individuais se existirem */}
        {(redacao.c1_corretor_1 !== null || redacao.c1_corretor_2 !== null) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {redacao.c1_corretor_1 !== null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Correção - Corretor 1</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div>C1: {redacao.c1_corretor_1}</div>
                    <div>C2: {redacao.c2_corretor_1}</div>
                    <div>C3: {redacao.c3_corretor_1}</div>
                    <div>C4: {redacao.c4_corretor_1}</div>
                    <div>C5: {redacao.c5_corretor_1}</div>
                  </div>
                  <div className="font-semibold">
                    Total: {redacao.nota_final_corretor_1}/1000
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {redacao.status_corretor_1}
                  </div>
                </CardContent>
              </Card>
            )}

            {redacao.c1_corretor_2 !== null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Correção - Corretor 2</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div>C1: {redacao.c1_corretor_2}</div>
                    <div>C2: {redacao.c2_corretor_2}</div>
                    <div>C3: {redacao.c3_corretor_2}</div>
                    <div>C4: {redacao.c4_corretor_2}</div>
                    <div>C5: {redacao.c5_corretor_2}</div>
                  </div>
                  <div className="font-semibold">
                    Total: {redacao.nota_final_corretor_2}/1000
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {redacao.status_corretor_2}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {redacao.nota_total && (
          <Card className="bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-800">
                  Nota Final: {redacao.nota_total}/1000
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {redacao.c1_corretor_1 !== null && redacao.c1_corretor_2 !== null 
                    ? 'Média entre as duas correções'
                    : 'Correção única'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-5 gap-4">
          <div>
            <Label htmlFor="nota_c1">Competência 1 (0-200)</Label>
            <Input
              id="nota_c1"
              type="number"
              min="0"
              max="200"
              value={nota_c1}
              onChange={(e) => setNotaC1(e.target.value)}
              placeholder="0-200"
            />
          </div>
          <div>
            <Label htmlFor="nota_c2">Competência 2 (0-200)</Label>
            <Input
              id="nota_c2"
              type="number"
              min="0"
              max="200"
              value={nota_c2}
              onChange={(e) => setNotaC2(e.target.value)}
              placeholder="0-200"
            />
          </div>
          <div>
            <Label htmlFor="nota_c3">Competência 3 (0-200)</Label>
            <Input
              id="nota_c3"
              type="number"
              min="0"
              max="200"
              value={nota_c3}
              onChange={(e) => setNotaC3(e.target.value)}
              placeholder="0-200"
            />
          </div>
          <div>
            <Label htmlFor="nota_c4">Competência 4 (0-200)</Label>
            <Input
              id="nota_c4"
              type="number"
              min="0"
              max="200"
              value={nota_c4}
              onChange={(e) => setNotaC4(e.target.value)}
              placeholder="0-200"
            />
          </div>
          <div>
            <Label htmlFor="nota_c5">Competência 5 (0-200)</Label>
            <Input
              id="nota_c5"
              type="number"
              min="0"
              max="200"
              value={nota_c5}
              onChange={(e) => setNotaC5(e.target.value)}
              placeholder="0-200"
            />
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-md">
          <strong>Nota Total: {(parseInt(nota_c1) || 0) + (parseInt(nota_c2) || 0) + (parseInt(nota_c3) || 0) + (parseInt(nota_c4) || 0) + (parseInt(nota_c5) || 0)}/1000</strong>
        </div>

        <div>
          <Label htmlFor="comentario">Comentário Pedagógico (opcional)</Label>
          <Textarea
            id="comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Digite aqui seus comentários sobre a redação..."
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleSubmitCorrection}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? "Salvando..." : "Salvar Correção"}
          </Button>
          <Button 
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
