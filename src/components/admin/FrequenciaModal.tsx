
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
  entrada_at: string | null;
  saida_at: string | null;
  aluno_id: string | null;
}

interface FrequenciaAluno {
  nome: string;
  email: string;
  turma: string;
  entrada?: string;
  saida?: string;
  status: 'em_aula' | 'presente' | 'ausente';
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
    if (!aulaId) {
      console.log('Sem aulaId fornecido');
      return;
    }
    
    console.log('🔍 INICIANDO fetchFrequencia para aulaId:', aulaId);
    setIsLoading(true);
    
    try {
      // Primeira consulta: verificar se há registros
      console.log('📊 Fazendo consulta no supabase...');
      const { data: allRecords, error: countError } = await supabase
        .from('presenca_aulas')
        .select('*')
        .eq('aula_id', aulaId);

      console.log('📋 Resultado bruto da consulta:', allRecords);
      console.log('❌ Erro da consulta:', countError);

      if (countError) {
        console.error('❌ ERRO na consulta:', countError);
        throw countError;
      }

      if (!allRecords || allRecords.length === 0) {
        console.log('⚠️ NENHUM registro encontrado para aula ID:', aulaId);
        setFrequenciaData([]);
        return;
      }

      console.log('✅ Encontrados', allRecords.length, 'registros');

      // Processar registros agrupando por aluno
      const alunosMap = new Map<string, FrequenciaAluno>();

      allRecords.forEach((record: any) => {
        console.log('🔄 Processando registro:', record);
        
        const alunoKey = record.email_aluno;
        let alunoExistente = alunosMap.get(alunoKey);
        
        if (!alunoExistente) {
          alunoExistente = {
            nome: record.nome_aluno,
            email: record.email_aluno,
            turma: record.turma,
            status: 'ausente'
          };
          alunosMap.set(alunoKey, alunoExistente);
        }

        // Atualizar entrada e saída baseado nos registros
        if (record.entrada_at) {
          alunoExistente.entrada = record.entrada_at;
        }
        
        if (record.saida_at) {
          alunoExistente.saida = record.saida_at;
        }

        // Determinar status
        if (alunoExistente.entrada && alunoExistente.saida) {
          alunoExistente.status = 'presente';
        } else if (alunoExistente.entrada && !alunoExistente.saida) {
          alunoExistente.status = 'em_aula';
        }
      });

      const frequenciaList = Array.from(alunosMap.values());
      console.log('🎯 Lista final processada:', frequenciaList);
      
      setFrequenciaData(frequenciaList);

    } catch (error) {
      console.error('💥 ERRO FATAL ao buscar frequência:', error);
      setFrequenciaData([]);
    } finally {
      setIsLoading(false);
      console.log('🏁 fetchFrequencia finalizado');
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
      case 'presente': return 'Presente';
      case 'em_aula': return 'Em aula';
      case 'ausente': return 'Ausente';
      default: return 'Ausente';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'presente':
        return <Badge className="bg-green-100 text-green-800">✔ Presente</Badge>;
      case 'em_aula':
        return <Badge className="bg-blue-100 text-blue-800">⏰ Em aula</Badge>;
      case 'ausente':
        return <Badge variant="destructive">✖ Ausente</Badge>;
      default:
        return <Badge variant="destructive">✖ Ausente</Badge>;
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered - isOpen:', isOpen, 'aulaId:', aulaId);
    if (isOpen && aulaId) {
      console.log('✅ Condições atendidas, chamando fetchFrequencia');
      fetchFrequencia();
    } else {
      console.log('❌ Condições não atendidas - isOpen:', isOpen, 'aulaId:', aulaId);
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
