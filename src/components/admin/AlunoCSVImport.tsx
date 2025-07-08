
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportResult {
  total: number;
  imported: number;
  rejected: number;
  errors: string[];
}

export const AlunoCSVImport = ({ onSuccess }: { onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = `nome,email,turma
João da Silva,joao@email.com,Turma A
Maria Souza,maria@email.com,Turma B
Pedro Santos,pedro@email.com,Turma C`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_alunos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados.",
          variant: "destructive"
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const expectedHeaders = ['nome', 'email', 'turma'];
      
      if (!expectedHeaders.every(h => headers.includes(h))) {
        toast({
          title: "Formato incorreto",
          description: "O arquivo deve conter as colunas: nome, email, turma",
          variant: "destructive"
        });
        return;
      }

      const nomeIndex = headers.indexOf('nome');
      const emailIndex = headers.indexOf('email');
      const turmaIndex = headers.indexOf('turma');

      const validTurmas = ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const alunosParaImportar = [];
      const erros = [];
      
      // Primeiro, coletamos todos os e-mails do arquivo para verificar duplicatas internas
      const emailsDoArquivo = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const nome = cols[nomeIndex]?.trim() || '';
        const email = cols[emailIndex]?.trim().toLowerCase() || '';
        const turma = cols[turmaIndex]?.trim() || '';

        // Validações básicas
        if (!nome) {
          erros.push(`Linha ${i + 1}: Nome não pode estar vazio`);
          continue;
        }
        
        if (!email || !emailRegex.test(email)) {
          erros.push(`Linha ${i + 1}: E-mail inválido: ${email}`);
          continue;
        }
        
        if (!validTurmas.includes(turma)) {
          erros.push(`Linha ${i + 1}: Turma inválida: ${turma}. Use: ${validTurmas.join(', ')}`);
          continue;
        }

        // Verificar duplicatas dentro do próprio arquivo
        if (emailsDoArquivo.includes(email)) {
          erros.push(`Linha ${i + 1}: E-mail duplicado no arquivo: ${email}`);
          continue;
        }

        emailsDoArquivo.push(email);
        alunosParaImportar.push({
          nome,
          email,
          turma,
          linha: i + 1
        });
      }

      // Verificar e-mails já existentes no banco de dados
      if (alunosParaImportar.length > 0) {
        const { data: existingProfiles, error: queryError } = await supabase
          .from('profiles')
          .select('email')
          .in('email', alunosParaImportar.map(a => a.email));

        if (queryError) {
          console.error('Erro ao verificar emails existentes:', queryError);
          throw new Error('Erro ao verificar e-mails existentes no banco de dados');
        }

        if (existingProfiles && existingProfiles.length > 0) {
          const emailsExistentes = existingProfiles.map(p => p.email);
          
          // Remover alunos com e-mails já existentes e adicionar aos erros
          const alunosValidos = [];
          for (const aluno of alunosParaImportar) {
            if (emailsExistentes.includes(aluno.email)) {
              erros.push(`Linha ${aluno.linha}: E-mail já cadastrado: ${aluno.email}`);
            } else {
              alunosValidos.push(aluno);
            }
          }
          
          alunosParaImportar.splice(0, alunosParaImportar.length, ...alunosValidos);
        }
      }

      // Se não há alunos válidos para importar
      if (alunosParaImportar.length === 0) {
        setImportResult({
          total: lines.length - 1,
          imported: 0,
          rejected: lines.length - 1,
          errors: erros
        });
        
        toast({
          title: "Nenhum aluno importado",
          description: "Todos os registros foram rejeitados. Verifique os erros abaixo.",
          variant: "destructive"
        });
        return;
      }

      // Inserir alunos válidos
      const alunosFormatados = alunosParaImportar.map(aluno => ({
        id: crypto.randomUUID(),
        nome: aluno.nome,
        sobrenome: '',
        email: aluno.email,
        turma: aluno.turma,
        user_type: 'aluno',
        is_authenticated_student: true,
        ativo: true // Cadastros via CSV são sempre ativos
      }));

      const { error: insertError } = await supabase
        .from('profiles')
        .insert(alunosFormatados);

      if (insertError) {
        console.error('Erro na inserção:', insertError);
        throw new Error(`Erro ao inserir alunos: ${insertError.message}`);
      }

      // Registrar histórico da importação
      const { error: historyError } = await supabase
        .from('importacao_csv')
        .insert({
          nome_arquivo: file.name,
          total_registros: lines.length - 1,
          registros_importados: alunosParaImportar.length,
          registros_rejeitados: (lines.length - 1) - alunosParaImportar.length,
          detalhes_erros: erros
        });

      if (historyError) {
        console.error('Erro ao salvar histórico:', historyError);
        // Não bloquear a importação por erro no histórico
      }

      setImportResult({
        total: lines.length - 1,
        imported: alunosParaImportar.length,
        rejected: (lines.length - 1) - alunosParaImportar.length,
        errors: erros
      });

      toast({
        title: "Importação concluída!",
        description: `${alunosParaImportar.length} aluno(s) importado(s) com sucesso.`
      });

      onSuccess();
      
      // Limpar o input
      event.target.value = '';

    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      
      setImportResult({
        total: 0,
        imported: 0,
        rejected: 0,
        errors: [error.message || "Erro inesperado durante a importação"]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Alunos via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo CSV
          </Button>
          
          <div className="flex-1">
            <Label htmlFor="csv-upload">Selecionar arquivo CSV</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" />
            <span className="font-medium">Formato do arquivo CSV:</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>nome:</strong> Nome completo do aluno</p>
            <p>• <strong>email:</strong> E-mail único (usado para login)</p>
            <p>• <strong>turma:</strong> Turma A, Turma B, Turma C, Turma D ou Turma E</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Processando arquivo...</p>
          </div>
        )}

        {importResult && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Resultado da Importação:</strong>
                <br />
                • Total de registros: {importResult.total}
                <br />
                • Importados com sucesso: {importResult.imported}
                <br />
                • Rejeitados: {importResult.rejected}
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erros encontrados:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
