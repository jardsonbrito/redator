
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, Download } from "lucide-react";

interface PresencaRecord {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  tipo_registro: string; // Changed from 'entrada' | 'saida' to string
  data_registro: string;
}

interface FrequenciaAluno {
  nome: string;
  email: string;
  turma: string;
  entrada?: string;
  saida?: string;
  status: 'presente' | 'completo' | 'ausente';
}

interface FrequenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aulaId: string;
  aulaTitle: string;
}

export const FrequenciaModal = ({ isOpen, onClose, aulaId, aulaTitle }: FrequenciaModalProps) => {
  const [frequenciaData, setFrequenciaData] = useState<FrequenciaAluno[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFrequencia = async () => {
    if (!aulaId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('*')
        .eq('aula_id', aulaId)
        .order('nome_aluno', { ascending: true });

      if (error) throw error;

      // Agrupar registros por aluno
      const alunosMap = new Map<string, FrequenciaAluno>();

      data?.forEach((record: PresencaRecord) => {
        const key = `${record.email_aluno}_${record.turma}`;
        
        if (!alunosMap.has(key)) {
          alunosMap.set(key, {
            nome: record.nome_aluno,
            email: record.email_aluno,
            turma: record.turma,
            status: 'ausente'
          });
        }

        const aluno = alunosMap.get(key)!;
        
        if (record.tipo_registro === 'entrada') {
          aluno.entrada = record.data_registro;
          aluno.status = 'presente';
        } else if (record.tipo_registro === 'saida') {
          aluno.saida = record.data_registro;
          if (aluno.entrada) {
            aluno.status = 'completo';
          }
        }
      });

      setFrequenciaData(Array.from(alunosMap.values()));
    } catch (error) {
      console.error('Erro ao buscar frequência:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const csvContent = [
      'Nome,Email,Turma,Entrada,Saida,Status',
      ...frequenciaData.map(aluno => 
        `"${aluno.nome}","${aluno.email}","${aluno.turma}","${aluno.entrada ? new Date(aluno.entrada).toLocaleString('pt-BR') : ''}","${aluno.saida ? new Date(aluno.saida).toLocaleString('pt-BR') : ''}","${getStatusText(aluno.status)}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frequencia_${aulaTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completo': return 'Participou integralmente';
      case 'presente': return 'Presente';
      case 'ausente': return 'Ausente';
      default: return 'Ausente';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completo':
        return <Badge className="bg-green-100 text-green-800">✔ Participou integralmente</Badge>;
      case 'presente':
        return <Badge className="bg-blue-100 text-blue-800">✔ Presente</Badge>;
      case 'ausente':
        return <Badge variant="destructive">✖ Ausente</Badge>;
      default:
        return <Badge variant="destructive">✖ Ausente</Badge>;
    }
  };

  useEffect(() => {
    if (isOpen && aulaId) {
      fetchFrequencia();
    }
  }, [isOpen, aulaId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Relatório de Frequência - {aulaTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {frequenciaData.length} registros
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Atualizado em {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
            
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Carregando frequência...</p>
            </div>
          ) : frequenciaData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhum registro de frequência encontrado para esta aula</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequenciaData.map((aluno, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{aluno.nome}</div>
                          <div className="text-xs text-muted-foreground">{aluno.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{aluno.turma}</Badge>
                      </TableCell>
                      <TableCell>
                        {aluno.entrada ? (
                          <div className="text-sm">
                            {new Date(aluno.entrada).toLocaleString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {aluno.saida ? (
                          <div className="text-sm">
                            {new Date(aluno.saida).toLocaleString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(aluno.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
