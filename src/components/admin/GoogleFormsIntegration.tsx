
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

export const GoogleFormsIntegration = () => {
  const [copied, setCopied] = useState(false);
  
  const webhookUrl = "https://kgmxntpmvlnbftjqtyxx.supabase.co/functions/v1/google-forms-webhook";
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("URL copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const testWebhook = async () => {
    try {
      const testData = {
        nome: "Teste Aluno",
        email: "teste@exemplo.com",
        turma: "Turma A",
        exercicio: "Exercício de Teste",
        data: new Date().toISOString().split('T')[0],
        nota: 85
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("Webhook testado com sucesso! Dados inseridos no sistema.");
      } else {
        toast.error("Erro no teste: " + result.error);
      }
    } catch (error) {
      toast.error("Erro ao testar webhook: " + error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Integração com Google Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure seu Google Forms para enviar dados automaticamente para o sistema.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="webhook-url">URL do Webhook</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={testWebhook} variant="secondary">
            Testar Webhook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Configurar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium">1. No Google Forms:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Crie campos com os nomes: <code>nome</code>, <code>email</code>, <code>turma</code>, <code>exercicio</code>, <code>data</code>, <code>nota</code></li>
              <li>Ou use nomes alternativos como "Nome do Aluno", "E-mail", "Turma", etc.</li>
            </ul>

            <h4 className="font-medium">2. Configurar Webhook:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Use uma extensão como "Form Publisher" ou "Zapier" para enviar dados via webhook</li>
              <li>Configure o webhook para enviar para a URL acima quando o formulário for enviado</li>
              <li>Certifique-se de que os dados sejam enviados como JSON</li>
            </ul>

            <h4 className="font-medium">3. Campos Obrigatórios:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>nome</strong>: Nome completo do aluno</li>
              <li><strong>email</strong>: Email do aluno</li>
            </ul>

            <h4 className="font-medium">4. Campos Opcionais:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>turma</strong>: Turma do aluno</li>
              <li><strong>exercicio</strong>: Nome/título do exercício</li>
              <li><strong>data</strong>: Data de realização (formato DD/MM/YYYY ou YYYY-MM-DD)</li>
              <li><strong>nota</strong>: Pontuação obtida (número)</li>
              <li><strong>exercicio_id</strong>: ID do exercício (se vinculado a um exercício específico)</li>
            </ul>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Uma vez configurado, os dados do Google Forms aparecerão automaticamente no painel Radar e em "Minhas Conquistas" dos alunos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
