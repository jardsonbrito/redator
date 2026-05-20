import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useTurmasAtivas } from '@/hooks/useTurmasAtivas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, CheckCircle, AlertCircle, Loader2, Users, FileText, School } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type RowStatus = 'sera_criado' | 'sera_atualizado' | 'ja_vinculado' | 'email_invalido' | 'duplicado_csv';

interface CsvRow {
  nome_completo?: string;
  email?: string;
  [key: string]: string | undefined;
}

interface ValidatedRow {
  nome_completo: string;
  email: string;
  status: RowStatus;
  perfilId?: string;
}

interface ImportResult {
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const STATUS_CONFIG: Record<RowStatus, {
  label: string;
  observacao: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  rowClass: string;
}> = {
  sera_criado: {
    label: 'Válido',
    observacao: 'Pronto para cadastrar',
    variant: 'default',
    rowClass: '',
  },
  sera_atualizado: {
    label: 'Já existe',
    observacao: 'Aluno já existe; será vinculado à turma',
    variant: 'secondary',
    rowClass: '',
  },
  ja_vinculado: {
    label: 'Já vinculado',
    observacao: 'Já está nesta turma; sem alteração',
    variant: 'outline',
    rowClass: 'text-muted-foreground',
  },
  email_invalido: {
    label: 'Erro',
    observacao: 'E-mail inválido',
    variant: 'destructive',
    rowClass: 'opacity-60',
  },
  duplicado_csv: {
    label: 'Duplicado',
    observacao: 'E-mail repetido na planilha',
    variant: 'destructive',
    rowClass: 'opacity-60',
  },
};

export function ImportacaoLoteAlunos() {
  const { toast } = useToast();
  const { turmasDinamicas } = useTurmasAtivas();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [turmaId, setTurmaId] = useState('');
  const [turmaNome, setTurmaNome] = useState('');
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'config' | 'validating' | 'preview' | 'importing' | 'done'>('config');
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleTurmaChange = (id: string) => {
    setTurmaId(id);
    setTurmaNome(turmasDinamicas.find(t => t.id === id)?.label || '');
  };

  const handleDownloadTemplate = () => {
    const csv = 'nome_completo,email\nJoão da Silva,joao@exemplo.com\nMaria Souza,maria@exemplo.com';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_alunos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !turmaId) return;

    setFileName(file.name);
    setStep('validating');

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: async (results) => {
        const rows = results.data;

        const emails = rows
          .map(r => (r.email || '').toLowerCase().trim())
          .filter(Boolean);

        const emailCountMap = new Map<string, number>();
        emails.forEach(e => emailCountMap.set(e, (emailCountMap.get(e) ?? 0) + 1));

        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id, email, turma_id')
          .in('email', emails.length > 0 ? emails : ['__none__']);

        const profileByEmail = new Map(
          (existingProfiles || []).map(p => [p.email, p])
        );

        const validated: ValidatedRow[] = rows.map(row => {
          const email = (row.email || '').toLowerCase().trim();
          const nome = (row.nome_completo || '').trim();

          if (!email || !isValidEmail(email)) {
            return { nome_completo: nome, email: row.email?.trim() || '', status: 'email_invalido' };
          }
          if ((emailCountMap.get(email) ?? 0) > 1) {
            return { nome_completo: nome, email, status: 'duplicado_csv' };
          }

          const existing = profileByEmail.get(email);
          if (existing) {
            if (existing.turma_id === turmaId) {
              return { nome_completo: nome, email, status: 'ja_vinculado', perfilId: existing.id };
            }
            return { nome_completo: nome, email, status: 'sera_atualizado', perfilId: existing.id };
          }
          return { nome_completo: nome, email, status: 'sera_criado' };
        });

        setValidatedRows(validated);
        setStep('preview');
      },
      error: () => {
        toast({ title: 'Erro ao ler o arquivo', description: 'Verifique se é um CSV válido.', variant: 'destructive' });
        setStep('config');
      },
    });

    e.target.value = '';
  };

  const handleImport = async () => {
    setStep('importing');

    const { data: turma, error: turmaErr } = await supabase
      .from('turmas_alunos')
      .select('id, nome, codigo_acesso')
      .eq('id', turmaId)
      .single();

    if (turmaErr || !turma) {
      toast({ title: 'Turma não encontrada', variant: 'destructive' });
      setStep('preview');
      return;
    }

    let criados = 0, atualizados = 0, ignorados = 0, erros = 0;

    for (const row of validatedRows) {
      if (row.status === 'ja_vinculado') { ignorados++; continue; }
      if (row.status === 'email_invalido' || row.status === 'duplicado_csv') { erros++; continue; }

      try {
        if (row.status === 'sera_atualizado' && row.perfilId) {
          const { error } = await supabase
            .from('profiles')
            .update({ turma: turma.nome, turma_id: turma.id, ativo: true })
            .eq('id', row.perfilId);
          if (error) throw error;
          atualizados++;
        } else if (row.status === 'sera_criado') {
          const partes = row.nome_completo.split(' ');
          const { error } = await supabase
            .from('profiles')
            .insert({
              nome: partes[0] || row.nome_completo,
              sobrenome: partes.slice(1).join(' ') || '-',
              email: row.email,
              turma: turma.nome,
              turma_id: turma.id,
              user_type: 'aluno',
              ativo: true,
              is_authenticated_student: false,
            });
          if (error) throw error;
          criados++;
        }
      } catch {
        erros++;
      }
    }

    setImportResult({ criados, atualizados, ignorados, erros });
    setStep('done');
  };

  const handleReset = () => {
    setStep('config');
    setValidatedRows([]);
    setImportResult(null);
    setTurmaId('');
    setTurmaNome('');
    setFileName('');
  };

  const counts = {
    criados: validatedRows.filter(r => r.status === 'sera_criado').length,
    atualizados: validatedRows.filter(r => r.status === 'sera_atualizado').length,
    ignorados: validatedRows.filter(r => r.status === 'ja_vinculado').length,
    erros: validatedRows.filter(r => r.status === 'email_invalido' || r.status === 'duplicado_csv').length,
  };

  // ── Tela de resultado ─────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    return (
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{importResult.criados}</div>
                <div className="text-xs text-green-600">Alunos criados</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{importResult.atualizados}</div>
                <div className="text-xs text-blue-600">Turma atualizada</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-600">{importResult.ignorados}</div>
                <div className="text-xs text-gray-500">Já vinculados</div>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.erros}</div>
                <div className="text-xs text-red-500">Ignorados (erros)</div>
              </div>
            </div>
            <Button onClick={handleReset} className="w-full" variant="outline">
              Nova importação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Importar Alunos em Lote
          </CardTitle>
          <CardDescription>
            Envie um arquivo CSV com nome e e-mail dos alunos. O sistema valida e cria ou vincula automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Etapa 1: configuração + upload ──────────────────────────── */}
          {(step === 'config' || step === 'validating') && (
            <>
              <div className="space-y-1">
                <Label>Turma de destino *</Label>
                <Select value={turmaId} onValueChange={handleTurmaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {turmasDinamicas.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar modelo CSV
                </Button>
                <span className="text-xs text-muted-foreground">Colunas obrigatórias: nome_completo, email</span>
              </div>

              <div className="space-y-1">
                <Label>Arquivo CSV *</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${turmaId ? 'cursor-pointer hover:bg-muted/30' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={() => turmaId && fileInputRef.current?.click()}
                >
                  {step === 'validating' ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validando linhas...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {turmaId
                          ? 'Clique para selecionar o arquivo CSV'
                          : 'Selecione a turma antes de enviar o arquivo'}
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </>
          )}

          {/* ── Etapa 2: prévia da importação ───────────────────────────── */}
          {step === 'preview' && (
            <>
              {/* Cabeçalho da prévia */}
              <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">Prévia da importação</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5" />
                    <span className="font-medium text-foreground">{turmaNome}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {fileName}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {counts.criados > 0 && (
                    <Badge variant="default">{counts.criados} {counts.criados === 1 ? 'válido' : 'válidos'}</Badge>
                  )}
                  {counts.atualizados > 0 && (
                    <Badge variant="secondary">{counts.atualizados} já {counts.atualizados === 1 ? 'existe' : 'existem'}</Badge>
                  )}
                  {counts.ignorados > 0 && (
                    <Badge variant="outline">{counts.ignorados} já {counts.ignorados === 1 ? 'vinculado' : 'vinculados'}</Badge>
                  )}
                  {counts.erros > 0 && (
                    <Badge variant="destructive">{counts.erros} com {counts.erros === 1 ? 'erro' : 'erros'}</Badge>
                  )}
                </div>
              </div>

              {/* Tabela de prévia */}
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatedRows.map((row, i) => {
                        const cfg = STATUS_CONFIG[row.status];
                        return (
                          <TableRow key={i} className={cfg.rowClass}>
                            <TableCell>
                              <Badge variant={cfg.variant} className="whitespace-nowrap">
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{row.nome_completo || '—'}</TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">{row.email || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{cfg.observacao}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {counts.erros > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Linhas com erro ou duplicadas serão ignoradas na importação.</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>Cancelar</Button>
                <Button
                  onClick={handleImport}
                  disabled={counts.criados + counts.atualizados === 0}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar e importar ({counts.criados + counts.atualizados} {counts.criados + counts.atualizados === 1 ? 'aluno' : 'alunos'})
                </Button>
              </div>
            </>
          )}

          {/* ── Etapa 3: importando ─────────────────────────────────────── */}
          {step === 'importing' && (
            <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Importando alunos...</span>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
