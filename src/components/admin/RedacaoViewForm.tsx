
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";

interface RedacaoViewFormProps {
  redacao: RedacaoEnviada;
  onCancel: () => void;
  onCopyRedacao: (redacao: RedacaoEnviada) => void;
}

export const RedacaoViewForm = ({ redacao, onCancel, onCopyRedacao }: RedacaoViewFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Visualizar Redação - {redacao.nome_aluno}
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
          <label className="text-base font-semibold">Tema:</label>
          <p className="mt-1 p-3 bg-gray-50 rounded-md">{redacao.frase_tematica}</p>
        </div>

        <div>
          <label className="text-base font-semibold">Texto da Redação:</label>
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

        <div className="flex justify-end">
          <Button 
            variant="outline"
            onClick={onCancel}
          >
            Fechar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
