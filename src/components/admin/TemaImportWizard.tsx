import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Settings, Eye, Play, CheckCircle, Download, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CSVRow {
  [key: string]: string;
}

interface MappedColumn {
  csvColumn: string;
  targetField: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ImportStats {
  total: number;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  warnings: number;
}

const COLUMN_MAPPINGS = {
  frase_tematica: {
    label: 'Frase Temática',
    required: true,
    synonyms: ['frase_tematica', 'frase', 'tema', 'titulo'],
  },
  eixo_tematico: {
    label: 'Eixo Temático',
    required: true,
    synonyms: ['eixo_tematico', 'eixo_tematica', 'eixo', 'categoria'],
  },
  status: {
    label: 'Status de Publicação',
    required: false,
    synonyms: ['status_publicacao', 'status', 'publicacao'],
  },
  texto_1: {
    label: 'Texto Motivador I',
    required: false,
    synonyms: ['texto_motivador_1', 'texto_1', 'motivador1', 'tm1'],
  },
  texto_2: {
    label: 'Texto Motivador II',
    required: false,
    synonyms: ['texto_motivador_2', 'texto_2', 'motivador2', 'tm2'],
  },
  texto_3: {
    label: 'Texto Motivador III',
    required: false,
    synonyms: ['texto_motivador_3', 'texto_3', 'motivador3', 'tm3'],
  },
  capinha_url: {
    label: 'URL da Capinha',
    required: false,
    synonyms: ['capinha_url', 'capa', 'capinha', 'cover', 'cover_url'],
  },
  motivador4_url: {
    label: 'URL do Motivador IV',
    required: false,
    synonyms: ['motivador4_url', 'motivador4', 'tm4', 'texto_motivador_4', 'texto_motivador_iv'],
  },
};

export const TemaImportWizard = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [fileName, setFileName] = useState('');
  
  // Parâmetros de importação
  const [defaultStatus, setDefaultStatus] = useState<'publicado' | 'rascunho'>('rascunho');
  const [forceDraft, setForceDraft] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'pular' | 'atualizar'>('pular');

  const steps = [
    { id: 0, title: 'Upload', icon: Upload },
    { id: 1, title: 'Mapeamento', icon: Settings },
    { id: 2, title: 'Pré-visualização', icon: Eye },
    { id: 3, title: 'Importar', icon: Play },
    { id: 4, title: 'Relatório', icon: CheckCircle },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: '❌ Formato inválido',
        description: 'Por favor, selecione um arquivo CSV.',
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: '❌ Erro ao processar CSV',
            description: `Erros encontrados: ${results.errors.map(e => e.message).join(', ')}`,
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        const headers = results.meta.fields || [];
        const data = results.data as CSVRow[];

        if (headers.length === 0 || data.length === 0) {
          toast({
            title: '❌ CSV vazio',
            description: 'O arquivo CSV não contém dados válidos.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        setCsvHeaders(headers);
        setCsvData(data);
        
        // Auto-match colunas
        const autoMappings: Record<string, string> = {};
        Object.entries(COLUMN_MAPPINGS).forEach(([target, config]) => {
          const matchedHeader = headers.find(header => 
            config.synonyms.some(synonym => 
              header.toLowerCase().trim() === synonym.toLowerCase()
            )
          );
          if (matchedHeader) {
            autoMappings[target] = matchedHeader;
          }
        });
        
        setColumnMappings(autoMappings);
        setIsProcessing(false);
        setCurrentStep(1);

        toast({
          title: '✅ CSV carregado',
          description: `${data.length} linhas processadas com sucesso.`,
        });
      },
      error: (error) => {
        toast({
          title: '❌ Erro ao ler arquivo',
          description: error.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
      },
    });
  };

  const validateData = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    csvData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque linha 1 é header

      // Validar campos obrigatórios
      Object.entries(COLUMN_MAPPINGS).forEach(([target, config]) => {
        if (config.required) {
          const csvColumn = columnMappings[target];
          if (!csvColumn) {
            errors.push({
              row: 0,
              field: target,
              message: `Campo obrigatório "${config.label}" não foi mapeado`,
              severity: 'error',
            });
            return;
          }

          const value = row[csvColumn]?.trim();
          if (!value) {
            errors.push({
              row: rowNumber,
              field: target,
              message: `Campo "${config.label}" está vazio`,
              severity: 'error',
            });
          }
        }
      });

      // Validar status
      const statusColumn = columnMappings['status'];
      if (statusColumn && row[statusColumn]?.trim()) {
        const status = row[statusColumn].trim().toLowerCase();
        if (!['publicado', 'rascunho'].includes(status)) {
          errors.push({
            row: rowNumber,
            field: 'status',
            message: `Status inválido: "${row[statusColumn]}". Use: publicado, rascunho`,
            severity: 'error',
          });
        }
      }

      // Validar URLs
      ['capinha_url', 'motivador4_url'].forEach(urlField => {
        const csvColumn = columnMappings[urlField];
        if (csvColumn && row[csvColumn]?.trim()) {
          const url = row[csvColumn].trim();
          try {
            new URL(url);
            if (!url.match(/\.(jpg|jpeg|png|webp)$/i)) {
              errors.push({
                row: rowNumber,
                field: urlField,
                message: `URL não parece ser uma imagem válida: ${url}`,
                severity: 'warning',
              });
            }
          } catch {
            errors.push({
              row: rowNumber,
              field: urlField,
              message: `URL inválida: ${url}`,
              severity: 'warning',
            });
          }
        } else if (csvColumn) {
          // URL vazia - será usado placeholder
          errors.push({
            row: rowNumber,
            field: urlField,
            message: `${urlField === 'capinha_url' ? 'Capinha' : 'Motivador IV'} não informado - será usado placeholder`,
            severity: 'warning',
          });
        }
      });
    });

    return errors;
  };

  const performDryRun = () => {
    setIsProcessing(true);
    const errors = validateData();
    setValidationErrors(errors);
    setIsProcessing(false);
    setCurrentStep(2);
  };

  const executeImport = async () => {
    setIsProcessing(true);
    
    try {
      const processedData = csvData.map(row => {
        const processed: any = {};
        
        Object.entries(columnMappings).forEach(([target, csvColumn]) => {
          const value = row[csvColumn]?.trim();
          
          switch (target) {
            case 'frase_tematica':
            case 'eixo_tematico':
              processed[target] = value;
              break;
            case 'status':
              processed['status'] = forceDraft ? 'rascunho' : (value?.toLowerCase() === 'publicado' ? 'publicado' : defaultStatus);
              break;
            case 'texto_1':
              processed['texto_1'] = value || null;
              break;
            case 'texto_2':
              processed['texto_2'] = value || null;
              break;
            case 'texto_3':
              processed['texto_3'] = value || null;
              break;
            case 'capinha_url':
              if (value) {
                processed['cover_source'] = 'url';
                processed['cover_url'] = value;
              } else {
                processed['cover_source'] = 'url';
                processed['cover_url'] = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
                processed['needs_media_update'] = true;
              }
              break;
            case 'motivador4_url':
              if (value) {
                processed['motivator4_source'] = 'url';
                processed['motivator4_url'] = value;
              } else {
                processed['motivator4_source'] = 'url';
                processed['motivator4_url'] = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
                processed['needs_media_update'] = true;
              }
              break;
          }
        });

        // Campos automáticos
        processed['cabecalho_enem'] = 'Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema apresentado, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.';
        
        return processed;
      });

      // Processar em chunks
      const CHUNK_SIZE = 100;
      const stats: ImportStats = {
        total: processedData.length,
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        warnings: 0,
      };

      for (let i = 0; i < processedData.length; i += CHUNK_SIZE) {
        const chunk = processedData.slice(i, i + CHUNK_SIZE);
        
        for (const record of chunk) {
          try {
            // Verificar se já existe
            const { data: existing } = await supabase
              .from('temas')
              .select('id')
              .ilike('frase_tematica', record.frase_tematica)
              .maybeSingle();

            if (existing && duplicateAction === 'pular') {
              stats.skipped++;
            } else if (existing && duplicateAction === 'atualizar') {
              const { error } = await supabase
                .from('temas')
                .update(record)
                .eq('id', existing.id);
              
              if (error) throw error;
              stats.updated++;
            } else {
              const { error } = await supabase
                .from('temas')
                .insert(record);
              
              if (error) throw error;
              stats.inserted++;
            }
            
            stats.processed++;
          } catch (error) {
            console.error('Erro ao importar registro:', error);
            stats.errors++;
          }
        }
      }

      setImportStats(stats);
      setCurrentStep(4);

      toast({
        title: '✅ Importação concluída',
        description: `${stats.inserted} temas inseridos, ${stats.updated} atualizados`,
      });

    } catch (error: any) {
      toast({
        title: '❌ Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        frase_tematica: 'Exemplo: Impactos da nomofobia na saúde mental dos idosos no Brasil',
        eixo_tematico: 'social e tecnologia',
        status_publicacao: 'publicado',
        texto_motivador_1: 'Primeiro texto motivador para a redação...',
        texto_motivador_2: 'Segundo texto motivador para a redação...',
        texto_motivador_3: 'Terceiro texto motivador para a redação...',
        capinha_url: 'https://exemplo.com/capas/nomofobia.jpg',
        motivador4_url: 'https://exemplo.com/charges/nomofobia.png',
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template-importacao-temas.csv';
    link.click();
  };

  const downloadErrors = () => {
    if (validationErrors.length === 0) return;

    const errorData = validationErrors.map(error => ({
      linha: error.row,
      campo: error.field,
      severidade: error.severity,
      mensagem: error.message,
    }));

    const csv = Papa.unparse(errorData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'erros-validacao.csv';
    link.click();
  };

  const reset = () => {
    setCurrentStep(0);
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMappings({});
    setValidationErrors([]);
    setImportStats(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione o arquivo CSV</h3>
              <p className="text-muted-foreground mb-6">
                Faça upload do arquivo CSV com os temas para importação
              </p>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isProcessing ? 'Processando...' : 'Selecionar Arquivo CSV'}
              </Button>
            </div>

            <div className="space-y-4">
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Baixar Template CSV
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Como configurar o CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Como configurar o arquivo CSV</DialogTitle>
                    <DialogDescription>
                      Guia completo para preparar seu arquivo de importação
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="formato" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="formato">Formato</TabsTrigger>
                      <TabsTrigger value="colunas">Colunas</TabsTrigger>
                      <TabsTrigger value="exemplos">Exemplos</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="formato" className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Formato do arquivo</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>CSV separado por vírgula</li>
                          <li>Linha de cabeçalho obrigatória</li>
                          <li>Codificação UTF-8</li>
                          <li>Use aspas duplas para textos com vírgulas</li>
                          <li>Até 500 linhas recomendado (máx. 10.000)</li>
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="colunas" className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Colunas aceitas</h4>
                        <div className="space-y-3">
                          {Object.entries(COLUMN_MAPPINGS).map(([key, config]) => (
                            <div key={key} className="border-l-2 border-primary/20 pl-3">
                              <div className="flex items-center gap-2">
                                <strong className="text-sm">{config.label}</strong>
                                {config.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Sinônimos: {config.synonyms.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="exemplos" className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Regras automáticas</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Capinha vazia → placeholder automático</li>
                          <li>Motivador IV vazio → placeholder automático</li>
                          <li>Cabeçalho ENEM preenchido automaticamente</li>
                          <li>Status inválido → usa padrão definido</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Exemplo de CSV válido</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`frase_tematica,eixo_tematico,status_publicacao,texto_motivador_1,capinha_url
"Impactos da nomofobia na saúde mental","social e tecnologia",publicado,"TM1...","https://exemplo.com/capa.jpg"
"Tecnologia assistiva na cidadania","social e tecnologia",rascunho,"TM1...",`}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        );

      case 1: // Mapeamento
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Mapeamento de Colunas</h3>
              <p className="text-muted-foreground">
                Arquivo: <strong>{fileName}</strong> ({csvData.length} linhas)
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(COLUMN_MAPPINGS).map(([target, config]) => (
                <div key={target} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="font-medium">{config.label}</label>
                      {config.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                    </div>
                  </div>
                  <div className="w-64">
                    <Select
                      value={columnMappings[target] || ''}
                      onValueChange={(value) => {
                        setColumnMappings(prev => ({ ...prev, [target]: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar coluna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(0)} variant="outline">
                Voltar
              </Button>
              <Button onClick={performDryRun} disabled={
                !columnMappings.frase_tematica || !columnMappings.eixo_tematico
              }>
                Continuar
              </Button>
            </div>
          </div>
        );

      case 2: // Pré-visualização
        const errorCount = validationErrors.filter(e => e.severity === 'error').length;
        const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Pré-visualização (Dry Run)</h3>
              <div className="flex gap-4 text-sm">
                <span>Total: <strong>{csvData.length}</strong></span>
                {errorCount > 0 && (
                  <span className="text-red-600">
                    Erros: <strong>{errorCount}</strong>
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-yellow-600">
                    Avisos: <strong>{warningCount}</strong>
                  </span>
                )}
              </div>
            </div>

            {validationErrors.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Issues Encontrados ({validationErrors.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={downloadErrors}>
                      <Download className="mr-2 h-3 w-3" />
                      Baixar CSV de Erros
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                          {error.severity === 'error' ? 'Erro' : 'Aviso'}
                        </Badge>
                        <span className="text-muted-foreground">Linha {error.row}:</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                    {validationErrors.length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ...e mais {validationErrors.length - 10} issues
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parâmetros de importação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parâmetros de Importação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Status padrão quando ausente
                  </label>
                  <Select value={defaultStatus} onValueChange={(value: any) => setDefaultStatus(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="forceDraft"
                    checked={forceDraft}
                    onCheckedChange={(checked) => setForceDraft(!!checked)}
                  />
                  <label htmlFor="forceDraft" className="text-sm">
                    Forçar rascunho para todos os temas
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ao encontrar frase temática duplicada
                  </label>
                  <Select value={duplicateAction} onValueChange={(value: any) => setDuplicateAction(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pular">Pular (manter existente)</SelectItem>
                      <SelectItem value="atualizar">Atualizar existente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(1)} variant="outline">
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={errorCount > 0}
              >
                Configurar Importação
              </Button>
            </div>
          </div>
        );

      case 3: // Importar
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Play className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pronto para Importar</h3>
              <p className="text-muted-foreground">
                {csvData.length} temas serão processados com os parâmetros configurados
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total de registros:</span>
                    <strong>{csvData.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Status padrão:</span>
                    <strong>{defaultStatus}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicatas:</span>
                    <strong>{duplicateAction === 'pular' ? 'Pular' : 'Atualizar'}</strong>
                  </div>
                  {forceDraft && (
                    <div className="flex justify-between text-orange-600">
                      <span>Forçar rascunho:</span>
                      <strong>Sim</strong>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. 
                Certifique-se de que os dados estão corretos antes de prosseguir.
              </p>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(2)} variant="outline">
                Voltar
              </Button>
              <Button onClick={executeImport} disabled={isProcessing}>
                {isProcessing ? 'Importando...' : 'Confirmar Importação'}
              </Button>
            </div>
          </div>
        );

      case 4: // Relatório
        if (!importStats) return null;

        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Importação Concluída</h3>
              <p className="text-muted-foreground">
                Processamento finalizado com sucesso
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span>Total processado:</span>
                    <strong>{importStats.processed}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Registros inseridos:</span>
                    <strong className="text-green-600">{importStats.inserted}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Registros atualizados:</span>
                    <strong className="text-blue-600">{importStats.updated}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Registros pulados:</span>
                    <strong className="text-yellow-600">{importStats.skipped}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Erros:</span>
                    <strong className="text-red-600">{importStats.errors}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avisos:</span>
                    <strong className="text-orange-600">{importStats.warnings}</strong>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={reset} variant="outline" className="flex-1">
                Nova Importação
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Voltar para Temas
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Importação de Temas via CSV</h2>
        <p className="text-muted-foreground">
          Importe múltiplos temas de uma vez usando um arquivo CSV
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={step.id} className={`flex items-center ${
              index <= currentStep ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
                index <= currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
};