import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const RadarUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [exercicioId, setExercicioId] = useState<string>("");
  const [exercicios, setExercicios] = useState<any[]>([]);
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Encontrar índices das colunas
      const nomeIdx = headers.findIndex(h => h.toLowerCase().includes('nome'));
      const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail'));
      const turmaIdx = headers.findIndex(h => h.toLowerCase().includes('turma'));
      const exercicioIdx = headers.findIndex(h => h.toLowerCase().includes('exercicio') || h.toLowerCase().includes('título'));
      const dataIdx = headers.findIndex(h => h.toLowerCase().includes('data'));
      const notaIdx = headers.findIndex(h => h.toLowerCase().includes('nota') || h.toLowerCase().includes('pontu'));

      if (nomeIdx === -1 || emailIdx === -1) {
        toast.error("Arquivo deve conter pelo menos as colunas 'Nome' e 'Email'");
        return;
      }

      const dados = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
        
        const nome = cols[nomeIdx] || '';
        const email = cols[emailIdx] || '';
        const turma = cols[turmaIdx] || 'Não informado';
        const tituloExercicio = cols[exercicioIdx] || 'Exercício importado';
        
        // Melhor tratamento de data
        let dataRealizacao = new Date().toISOString().split('T')[0]; // data padrão
        if (cols[dataIdx]) {
          const dataString = cols[dataIdx].trim();
          // Tentar diferentes formatos de data
          let dataObj = null;
          
          // Formato DD/MM/YYYY ou DD-MM-YYYY
          if (dataString.includes('/') || dataString.includes('-')) {
            const separator = dataString.includes('/') ? '/' : '-';
            const parts = dataString.split(separator);
            if (parts.length === 3) {
              // Assumir DD/MM/YYYY ou DD-MM-YYYY
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JS months são 0-based
              const year = parseInt(parts[2]);
              dataObj = new Date(year, month, day);
            }
          } else {
            // Tentar formato ISO ou outros
            dataObj = new Date(dataString);
          }
          
          // Verificar se a data é válida
          if (dataObj && !isNaN(dataObj.getTime())) {
            dataRealizacao = dataObj.toISOString().split('T')[0];
          }
        }
        
        const nota = cols[notaIdx] ? parseFloat(cols[notaIdx]) : null;

        if (nome && email) {
          dados.push({
            nome_aluno: nome,
            email_aluno: email,
            turma,
            titulo_exercicio: tituloExercicio,
            data_realizacao: dataRealizacao,
            nota,
            exercicio_id: exercicioId || null,
            importado_por: user.id
          });
        }
      }

      if (dados.length === 0) {
        toast.error("Nenhum dado válido encontrado no arquivo");
        return;
      }

      const { error } = await supabase
        .from('radar_dados')
        .insert(dados);

      if (error) throw error;

      toast.success(`${dados.length} registros importados com sucesso!`);
      
      // Limpar formulário
      event.target.value = '';
      setExercicioId('');
      
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar arquivo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchExercicios = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios')
        .select('id, titulo')
        .eq('ativo', true)
        .order('titulo');

      if (error) throw error;
      setExercicios(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  useEffect(() => {
    fetchExercicios();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Dados de Exercícios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="exercicio">Exercício (Opcional)</Label>
          <Select value={exercicioId} onValueChange={setExercicioId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um exercício" />
            </SelectTrigger>
            <SelectContent>
              {exercicios.map((exercicio) => (
                <SelectItem key={exercicio.id} value={exercicio.id}>
                  {exercicio.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="arquivo">Arquivo CSV/Excel</Label>
          <Input
            id="arquivo"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Formato esperado: Nome, Email, Turma, Título Exercício, Data, Nota
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="font-medium">Formato do arquivo:</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Nome:</strong> Nome completo do aluno</li>
            <li>• <strong>Email:</strong> Email do aluno</li>
            <li>• <strong>Turma:</strong> Turma do aluno (opcional)</li>
            <li>• <strong>Título Exercício:</strong> Nome do exercício (opcional)</li>
            <li>• <strong>Data:</strong> Data de realização (formato: YYYY-MM-DD)</li>
            <li>• <strong>Nota:</strong> Pontuação obtida (opcional)</li>
          </ul>
        </div>

        {isUploading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Importando dados...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};