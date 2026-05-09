import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Save, CheckSquare, Square } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface CriteriosCelulaArgumentativa {
  elementos_obrigatorios: string[];
  validar_topico_frasal: boolean;
  validar_explicacao: boolean;
  validar_embasamento: boolean;
  validar_aplicacao_tema: boolean;
  validar_causalidade: boolean;
  validar_aprofundamento: boolean;
  descricoes: Record<string, string>;
}

interface CriteriosPropostaIntervencao {
  elementos_c5: string[];
  elementos_obrigatorios: string[];
  verificar_c5: boolean;
  verificar_retomada_tese: boolean;
  descricoes: Record<string, string>;
}

interface Calibracao {
  id: string;
  subtab_id: string;
  subtab_nome: string;
  subtab_habilitada: boolean;
  periodos_exatos: number;
  palavras_min: number;
  palavras_max: number;
  linhas_max_estimadas: number | null;
  regras_composicao: any;
  instrucoes_geracao: string;
  validacao_automatica: boolean;
  max_tentativas_geracao: number;
  criterios_celula_argumentativa: CriteriosCelulaArgumentativa | null;
  criterios_proposta_intervencao: CriteriosPropostaIntervencao | null;
}

interface ModeloReferencia {
  id: string;
  subtab_id: string;
  subtab_nome?: string;
  titulo: string;
  tema: string;
  texto_modelo: string;
  palavras: number;
  periodos: number;
  ativo: boolean;
  ordem_prioridade: number;
  observacoes: string | null;
  tags: string[] | null;
}

interface Subtab {
  id: string;
  nome: string;
}

const ELEMENTOS_CELULA = [
  { chave: 'validar_topico_frasal', label: 'Tópico frasal', desc: 'Sentença que apresenta o argumento central' },
  { chave: 'validar_explicacao', label: 'Explicação', desc: 'Desenvolvimento e elucidação do argumento' },
  { chave: 'validar_embasamento', label: 'Embasamento', desc: 'Dado, citação ou exemplo de sustentação' },
  { chave: 'validar_aplicacao_tema', label: 'Aplicação ao tema', desc: 'Conexão explícita com o tema da redação' },
  { chave: 'validar_causalidade', label: 'Causalidade', desc: 'Relação causa-efeito entre os elementos' },
  { chave: 'validar_aprofundamento', label: 'Aprofundamento', desc: 'Análise crítica ou reflexão aprofundada' },
] as const;

const ELEMENTOS_C5 = [
  { chave: 'agente', label: 'Agente', desc: 'Entidade responsável por executar a proposta' },
  { chave: 'acao', label: 'Ação', desc: 'O que deve ser feito — verbo de ação claro' },
  { chave: 'meio_modo', label: 'Meio/Modo', desc: 'Como a ação será executada' },
  { chave: 'finalidade', label: 'Finalidade', desc: 'Para que a ação será executada' },
  { chave: 'detalhamento', label: 'Detalhamento', desc: 'Especificação adicional da proposta' },
] as const;

const SUBTAB_LABELS: Record<string, string> = {
  introducao: 'Introdução',
  desenvolvimento: 'Desenvolvimento',
  conclusao: 'Conclusão',
};

interface TemaConfig {
  id: string;
  instrucoes: string;
  exemplos_temas: string[];
}

export const JarvisTutoriaConfiguracao = () => {
  const { toast } = useToast();
  const [calibracoes, setCalibracoes] = useState<Calibracao[]>([]);
  const [modelos, setModelos] = useState<ModeloReferencia[]>([]);
  const [subtabs, setSubtabs] = useState<Subtab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoCalibracao, setEditandoCalibracao] = useState<Calibracao | null>(null);
  const [modeloDialog, setModeloDialog] = useState(false);
  const [modeloEditando, setModeloEditando] = useState<ModeloReferencia | null>(null);
  const [formModelo, setFormModelo] = useState({
    subtab_id: '',
    titulo: '',
    tema: '',
    texto_modelo: '',
    observacoes: '',
    ordem_prioridade: 100,
    ativo: true
  });
  const [temaConfig, setTemaConfig] = useState<TemaConfig | null>(null);
  const [salvandoTemaConfig, setSalvandoTemaConfig] = useState(false);
  const [novoExemplo, setNovoExemplo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: calibData, error: calibError } = await supabase
        .from('jarvis_tutoria_calibracao')
        .select(`*, jarvis_tutoria_subtabs!inner(nome, habilitada)`);

      if (calibError) throw calibError;

      const calibracoesComNome = calibData?.map((c: any) => ({
        ...c,
        subtab_nome: c.jarvis_tutoria_subtabs.nome,
        subtab_habilitada: c.jarvis_tutoria_subtabs.habilitada,
      })) || [];

      // Ordenar: introdução, desenvolvimento, conclusão
      const ordem = ['introducao', 'desenvolvimento', 'conclusao'];
      calibracoesComNome.sort((a: Calibracao, b: Calibracao) => {
        return (ordem.indexOf(a.subtab_nome) ?? 99) - (ordem.indexOf(b.subtab_nome) ?? 99);
      });

      setCalibracoes(calibracoesComNome);

      const { data: modelosData, error: modelosError } = await supabase
        .from('jarvis_tutoria_modelos_referencia')
        .select(`*, jarvis_tutoria_subtabs(nome)`)
        .order('ordem_prioridade', { ascending: true });

      if (modelosError) throw modelosError;
      setModelos(
        (modelosData || []).map((m: any) => ({
          ...m,
          subtab_nome: m.jarvis_tutoria_subtabs?.nome || ''
        }))
      );

      const { data: subtabsData, error: subtabsError } = await supabase
        .from('jarvis_tutoria_subtabs')
        .select('id, nome')
        .order('nome');

      if (subtabsError) throw subtabsError;
      setSubtabs(subtabsData || []);

      const { data: temaConfigData } = await supabase
        .from('jarvis_tema_config')
        .select('*')
        .limit(1)
        .single();

      if (temaConfigData) setTemaConfig(temaConfigData as TemaConfig);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar configurações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const salvarTemaConfig = async () => {
    if (!temaConfig) return;
    setSalvandoTemaConfig(true);
    try {
      const { error } = await supabase
        .from('jarvis_tema_config')
        .update({
          instrucoes: temaConfig.instrucoes,
          exemplos_temas: temaConfig.exemplos_temas,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', temaConfig.id);

      if (error) throw error;
      toast({ title: '✅ Configuração salva', description: 'Instruções e exemplos atualizados.', className: 'border-green-200 bg-green-50 text-green-900' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSalvandoTemaConfig(false);
    }
  };

  const adicionarExemplo = () => {
    if (!novoExemplo.trim() || !temaConfig) return;
    setTemaConfig({ ...temaConfig, exemplos_temas: [...temaConfig.exemplos_temas, novoExemplo.trim()] });
    setNovoExemplo('');
  };

  const removerExemplo = (idx: number) => {
    if (!temaConfig) return;
    setTemaConfig({ ...temaConfig, exemplos_temas: temaConfig.exemplos_temas.filter((_, i) => i !== idx) });
  };

  const moverExemplo = (idx: number, dir: -1 | 1) => {
    if (!temaConfig) return;
    const arr = [...temaConfig.exemplos_temas];
    const novo = idx + dir;
    if (novo < 0 || novo >= arr.length) return;
    [arr[idx], arr[novo]] = [arr[novo], arr[idx]];
    setTemaConfig({ ...temaConfig, exemplos_temas: arr });
  };

  const toggleHabilitada = async (calib: Calibracao) => {
    const novoValor = !calib.subtab_habilitada;
    try {
      const { error } = await supabase
        .from('jarvis_tutoria_subtabs')
        .update({ habilitada: novoValor })
        .eq('id', calib.subtab_id);

      if (error) throw error;
      toast({
        title: novoValor ? '🔓 Subtab habilitada' : '🔒 Subtab desabilitada',
        description: `${SUBTAB_LABELS[calib.subtab_nome] ?? calib.subtab_nome} agora está ${novoValor ? 'disponível' : 'bloqueada'} para os alunos`,
        className: novoValor ? 'border-green-200 bg-green-50 text-green-900' : undefined
      });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const salvarCalibracao = async (calibracao: Calibracao) => {
    try {
      const { error } = await supabase
        .from('jarvis_tutoria_calibracao')
        .update({
          periodos_exatos: calibracao.periodos_exatos,
          palavras_min: calibracao.palavras_min,
          palavras_max: calibracao.palavras_max,
          linhas_max_estimadas: calibracao.linhas_max_estimadas,
          instrucoes_geracao: calibracao.instrucoes_geracao,
          validacao_automatica: calibracao.validacao_automatica,
          max_tentativas_geracao: calibracao.max_tentativas_geracao,
          criterios_celula_argumentativa: calibracao.criterios_celula_argumentativa,
          criterios_proposta_intervencao: calibracao.criterios_proposta_intervencao,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', calibracao.id);

      if (error) throw error;

      toast({
        title: '✅ Calibração salva',
        description: 'Configuração atualizada com sucesso!',
        className: 'border-green-200 bg-green-50 text-green-900'
      });

      setEditandoCalibracao(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar calibração', variant: 'destructive' });
    }
  };

  const toggleCriterioElemento = (chave: string, valor: boolean) => {
    if (!editandoCalibracao?.criterios_celula_argumentativa) return;
    setEditandoCalibracao({
      ...editandoCalibracao,
      criterios_celula_argumentativa: {
        ...editandoCalibracao.criterios_celula_argumentativa,
        [chave]: valor
      }
    });
  };

  const toggleCriterioC5 = (elemento: string, obrigatorio: boolean) => {
    if (!editandoCalibracao?.criterios_proposta_intervencao) return;
    const atual = editandoCalibracao.criterios_proposta_intervencao.elementos_obrigatorios || [];
    const novos = obrigatorio
      ? [...new Set([...atual, elemento])]
      : atual.filter((e: string) => e !== elemento);
    setEditandoCalibracao({
      ...editandoCalibracao,
      criterios_proposta_intervencao: {
        ...editandoCalibracao.criterios_proposta_intervencao,
        elementos_obrigatorios: novos
      }
    });
  };

  // ─── Modelos de referência ─────────────────────────────────────

  const toggleModelo = async (modelo: ModeloReferencia) => {
    try {
      const { error } = await supabase
        .from('jarvis_tutoria_modelos_referencia')
        .update({ ativo: !modelo.ativo })
        .eq('id', modelo.id);

      if (error) throw error;

      toast({
        title: modelo.ativo ? 'Modelo desativado' : 'Modelo ativado',
        description: `"${modelo.titulo}" ${modelo.ativo ? 'foi desativado' : 'está ativo agora'}`,
      });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const deletarModelo = async (id: string, titulo: string) => {
    if (!confirm(`Deletar modelo "${titulo}"?`)) return;
    try {
      const { error } = await supabase
        .from('jarvis_tutoria_modelos_referencia')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Modelo deletado', description: `"${titulo}" foi removido` });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const abrirNovoModelo = () => {
    const maxPrioridade = modelos.length > 0
      ? Math.max(...modelos.map(m => m.ordem_prioridade))
      : 0;
    setFormModelo({
      subtab_id: subtabs[0]?.id || '',
      titulo: '',
      tema: '',
      texto_modelo: '',
      observacoes: '',
      ordem_prioridade: maxPrioridade + 1,
      ativo: true
    });
    setModeloEditando(null);
    setModeloDialog(true);
  };

  const abrirEditarModelo = (modelo: ModeloReferencia) => {
    setFormModelo({
      subtab_id: modelo.subtab_id,
      titulo: modelo.titulo,
      tema: modelo.tema,
      texto_modelo: modelo.texto_modelo,
      observacoes: modelo.observacoes || '',
      ordem_prioridade: modelo.ordem_prioridade,
      ativo: modelo.ativo
    });
    setModeloEditando(modelo);
    setModeloDialog(true);
  };

  const salvarModelo = async () => {
    try {
      if (!formModelo.titulo || !formModelo.tema || !formModelo.texto_modelo || !formModelo.subtab_id) {
        toast({ title: 'Campos obrigatórios', description: 'Preencha título, tema, texto e tipo de parágrafo', variant: 'destructive' });
        return;
      }

      const novaPrioridade = formModelo.ordem_prioridade;

      if (modeloEditando) {
        if (novaPrioridade !== modeloEditando.ordem_prioridade) {
          const { data: modelosParaMover } = await supabase
            .from('jarvis_tutoria_modelos_referencia')
            .select('id, ordem_prioridade')
            .gte('ordem_prioridade', novaPrioridade)
            .neq('id', modeloEditando.id);

          if (modelosParaMover && modelosParaMover.length > 0) {
            for (const m of modelosParaMover) {
              await supabase
                .from('jarvis_tutoria_modelos_referencia')
                .update({ ordem_prioridade: m.ordem_prioridade + 1 })
                .eq('id', m.id);
            }
          }
        }

        const { error } = await supabase
          .from('jarvis_tutoria_modelos_referencia')
          .update({
            subtab_id: formModelo.subtab_id,
            titulo: formModelo.titulo,
            tema: formModelo.tema,
            texto_modelo: formModelo.texto_modelo,
            observacoes: formModelo.observacoes || null,
            ordem_prioridade: novaPrioridade,
            ativo: formModelo.ativo,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', modeloEditando.id);

        if (error) throw error;
        toast({ title: '✅ Modelo atualizado', description: `"${formModelo.titulo}" foi atualizado`, className: 'border-green-200 bg-green-50 text-green-900' });
      } else {
        const { data: modelosParaMover } = await supabase
          .from('jarvis_tutoria_modelos_referencia')
          .select('id, ordem_prioridade')
          .gte('ordem_prioridade', novaPrioridade);

        if (modelosParaMover && modelosParaMover.length > 0) {
          for (const m of modelosParaMover) {
            await supabase
              .from('jarvis_tutoria_modelos_referencia')
              .update({ ordem_prioridade: m.ordem_prioridade + 1 })
              .eq('id', m.id);
          }
        }

        const { error } = await supabase
          .from('jarvis_tutoria_modelos_referencia')
          .insert({
            subtab_id: formModelo.subtab_id,
            titulo: formModelo.titulo,
            tema: formModelo.tema,
            texto_modelo: formModelo.texto_modelo,
            observacoes: formModelo.observacoes || null,
            ordem_prioridade: novaPrioridade,
            ativo: formModelo.ativo
          });

        if (error) throw error;
        toast({ title: '✅ Modelo criado', description: `"${formModelo.titulo}" foi criado`, className: 'border-green-200 bg-green-50 text-green-900' });
      }

      setModeloDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Tabs defaultValue="calibracao" className="w-full">
      <TabsList>
        <TabsTrigger value="calibracao">Calibração Pedagógica</TabsTrigger>
        <TabsTrigger value="modelos">Modelos de Referência</TabsTrigger>
        <TabsTrigger value="tema">Frase Temática</TabsTrigger>
      </TabsList>

      {/* ─── ABA: CALIBRAÇÃO ───────────────────────────────────── */}
      <TabsContent value="calibracao" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Parâmetros Estruturais</CardTitle>
            <CardDescription>
              Configure períodos, palavras e critérios de validação para cada tipo de parágrafo.
              O Jarvis consulta esses parâmetros antes de gerar qualquer resposta ao aluno.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {calibracoes.map((calib) => (
              <div key={calib.id} className="border rounded-lg p-5 space-y-4">
                {/* Cabeçalho do bloco */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {SUBTAB_LABELS[calib.subtab_nome] ?? calib.subtab_nome}
                        </h3>
                        <Badge
                          variant={calib.subtab_habilitada ? 'default' : 'outline'}
                          className={calib.subtab_habilitada
                            ? 'bg-green-100 text-green-800 border-green-200 text-xs'
                            : 'text-xs text-muted-foreground'}
                        >
                          {calib.subtab_habilitada ? '🔓 Disponível' : '🔒 Bloqueada'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {calib.periodos_exatos} períodos • {calib.palavras_min}–{calib.palavras_max} palavras
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={calib.subtab_habilitada ? 'outline' : 'default'}
                      onClick={() => toggleHabilitada(calib)}
                      title={calib.subtab_habilitada ? 'Bloquear para alunos' : 'Liberar para alunos'}
                    >
                      {calib.subtab_habilitada ? '🔒 Bloquear' : '🔓 Liberar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditandoCalibracao(calib)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>

                {/* Resumo dos critérios específicos (somente leitura) */}
                {calib.subtab_nome === 'desenvolvimento' && calib.criterios_celula_argumentativa && (
                  <div className="bg-blue-50 rounded p-3 text-sm">
                    <p className="font-medium text-blue-800 mb-1">Célula Argumentativa</p>
                    <div className="flex flex-wrap gap-1">
                      {ELEMENTOS_CELULA.map(({ chave, label }) => {
                        const ativo = calib.criterios_celula_argumentativa![chave as keyof CriteriosCelulaArgumentativa];
                        return (
                          <Badge
                            key={chave}
                            variant={ativo ? 'default' : 'outline'}
                            className={ativo ? 'bg-blue-600 text-white text-xs' : 'text-xs text-muted-foreground'}
                          >
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {calib.subtab_nome === 'conclusao' && calib.criterios_proposta_intervencao && (
                  <div className="bg-purple-50 rounded p-3 text-sm">
                    <p className="font-medium text-purple-800 mb-1">Elementos C5 obrigatórios</p>
                    <div className="flex flex-wrap gap-1">
                      {ELEMENTOS_C5.map(({ chave, label }) => {
                        const obrigatorio = calib.criterios_proposta_intervencao!.elementos_obrigatorios?.includes(chave);
                        return (
                          <Badge
                            key={chave}
                            variant={obrigatorio ? 'default' : 'outline'}
                            className={obrigatorio ? 'bg-purple-600 text-white text-xs' : 'text-xs text-muted-foreground'}
                          >
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Formulário inline de edição ─────────────────── */}
                {editandoCalibracao?.id === calib.id && (
                  <div className="space-y-5 mt-4 pt-4 border-t">

                    {/* Parâmetros comuns */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        Parâmetros estruturais
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Períodos exatos</Label>
                          <Input
                            type="number"
                            value={editandoCalibracao.periodos_exatos}
                            onChange={(e) => setEditandoCalibracao({
                              ...editandoCalibracao,
                              periodos_exatos: parseInt(e.target.value)
                            })}
                          />
                        </div>
                        <div>
                          <Label>Palavras mínimo</Label>
                          <Input
                            type="number"
                            value={editandoCalibracao.palavras_min}
                            onChange={(e) => setEditandoCalibracao({
                              ...editandoCalibracao,
                              palavras_min: parseInt(e.target.value)
                            })}
                          />
                        </div>
                        <div>
                          <Label>Palavras máximo</Label>
                          <Input
                            type="number"
                            value={editandoCalibracao.palavras_max}
                            onChange={(e) => setEditandoCalibracao({
                              ...editandoCalibracao,
                              palavras_max: parseInt(e.target.value)
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Máx tentativas de regeneração</Label>
                        <Input
                          type="number"
                          value={editandoCalibracao.max_tentativas_geracao}
                          onChange={(e) => setEditandoCalibracao({
                            ...editandoCalibracao,
                            max_tentativas_geracao: parseInt(e.target.value)
                          })}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id={`validacao-${calib.id}`}
                          checked={editandoCalibracao.validacao_automatica}
                          onChange={(e) => setEditandoCalibracao({
                            ...editandoCalibracao,
                            validacao_automatica: e.target.checked
                          })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`validacao-${calib.id}`}>
                          Validação automática
                        </Label>
                      </div>
                    </div>

                    {/* ── INTRODUÇÃO: descrição dos períodos ─────── */}
                    {editandoCalibracao.subtab_nome === 'introducao' && (
                      <div>
                        <Separator className="my-2" />
                        <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                          Descrição dos períodos (enviada ao prompt)
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Cada linha descreve o papel de um período da introdução. Edite para ajustar a orientação que a IA recebe.
                        </p>
                        <div className="space-y-2">
                          {(
                            editandoCalibracao.regras_composicao?.estrutura_periodos ?? [
                              '1º período: Repertório sociocultural + interpretação integrada ao tema',
                              '2º período: Contextualização problematizada no Brasil',
                              '3º período: Tese por causalidade mencionando EXPLICITAMENTE os 2 aspectos',
                            ]
                          ).map((desc: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                              <Input
                                value={desc}
                                onChange={(e) => {
                                  const periodos: string[] = [
                                    ...(editandoCalibracao.regras_composicao?.estrutura_periodos ?? [
                                      '1º período: Repertório sociocultural + interpretação integrada ao tema',
                                      '2º período: Contextualização problematizada no Brasil',
                                      '3º período: Tese por causalidade mencionando EXPLICITAMENTE os 2 aspectos',
                                    ])
                                  ];
                                  periodos[idx] = e.target.value;
                                  setEditandoCalibracao({
                                    ...editandoCalibracao,
                                    regras_composicao: {
                                      ...editandoCalibracao.regras_composicao,
                                      estrutura_periodos: periodos
                                    }
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── DESENVOLVIMENTO: célula argumentativa ───── */}
                    {editandoCalibracao.subtab_nome === 'desenvolvimento' &&
                      editandoCalibracao.criterios_celula_argumentativa && (
                      <div>
                        <Separator className="my-2" />
                        <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                          Critérios da célula argumentativa
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Ative os critérios que o Jarvis deve validar e exigir em cada parágrafo de desenvolvimento.
                        </p>
                        <div className="space-y-3">
                          {ELEMENTOS_CELULA.map(({ chave, label, desc }) => {
                            const ativo = editandoCalibracao.criterios_celula_argumentativa![chave as keyof CriteriosCelulaArgumentativa] as boolean;
                            return (
                              <div
                                key={chave}
                                className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer border transition-colors ${
                                  ativo ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                }`}
                                onClick={() => toggleCriterioElemento(chave, !ativo)}
                              >
                                <div className="mt-0.5">
                                  {ativo
                                    ? <CheckSquare className="h-4 w-4 text-blue-600" />
                                    : <Square className="h-4 w-4 text-muted-foreground" />
                                  }
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${ativo ? 'text-blue-900' : 'text-muted-foreground'}`}>
                                    {label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Separator className="my-3" />
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          Descrições enviadas ao prompt
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Edite o texto que a IA recebe para descrever cada elemento ativo.
                        </p>
                        <div className="space-y-2">
                          {ELEMENTOS_CELULA.map(({ chave, label }) => {
                            const ativo = editandoCalibracao.criterios_celula_argumentativa![chave as keyof CriteriosCelulaArgumentativa] as boolean;
                            if (!ativo) return null;
                            const chaveDesc = chave.replace('validar_', '');
                            const valor = editandoCalibracao.criterios_celula_argumentativa!.descricoes?.[chaveDesc] ?? '';
                            return (
                              <div key={chave} className="flex items-center gap-2">
                                <span className="text-xs text-blue-700 w-28 shrink-0">{label}</span>
                                <Input
                                  value={valor}
                                  onChange={(e) => setEditandoCalibracao({
                                    ...editandoCalibracao,
                                    criterios_celula_argumentativa: {
                                      ...editandoCalibracao.criterios_celula_argumentativa!,
                                      descricoes: {
                                        ...editandoCalibracao.criterios_celula_argumentativa!.descricoes,
                                        [chaveDesc]: e.target.value
                                      }
                                    }
                                  })}
                                  className="text-sm"
                                  placeholder={`Descrição de ${label.toLowerCase()}...`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── CONCLUSÃO: proposta de intervenção / C5 ── */}
                    {editandoCalibracao.subtab_nome === 'conclusao' &&
                      editandoCalibracao.criterios_proposta_intervencao && (
                      <div>
                        <Separator className="my-2" />
                        <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                          Critérios da proposta de intervenção (C5)
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Marque os elementos que devem ser considerados <strong>obrigatórios</strong> na proposta de intervenção.
                          Elementos não marcados serão incentivados mas não exigidos.
                        </p>

                        <div className="space-y-3 mb-4">
                          {ELEMENTOS_C5.map(({ chave, label, desc }) => {
                            const obrigatorio = editandoCalibracao.criterios_proposta_intervencao!.elementos_obrigatorios?.includes(chave);
                            return (
                              <div
                                key={chave}
                                className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer border transition-colors ${
                                  obrigatorio ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
                                }`}
                                onClick={() => toggleCriterioC5(chave, !obrigatorio)}
                              >
                                <div className="mt-0.5">
                                  {obrigatorio
                                    ? <CheckSquare className="h-4 w-4 text-purple-600" />
                                    : <Square className="h-4 w-4 text-muted-foreground" />
                                  }
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${obrigatorio ? 'text-purple-900' : 'text-muted-foreground'}`}>
                                    {label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <Separator className="my-3" />
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          Descrições dos elementos C5 enviadas ao prompt
                        </p>
                        <div className="space-y-2 mb-4">
                          {ELEMENTOS_C5.map(({ chave, label }) => {
                            const valor = editandoCalibracao.criterios_proposta_intervencao!.descricoes?.[chave] ?? '';
                            return (
                              <div key={chave} className="flex items-center gap-2">
                                <span className="text-xs text-purple-700 w-24 shrink-0">{label}</span>
                                <Input
                                  value={valor}
                                  onChange={(e) => setEditandoCalibracao({
                                    ...editandoCalibracao,
                                    criterios_proposta_intervencao: {
                                      ...editandoCalibracao.criterios_proposta_intervencao!,
                                      descricoes: {
                                        ...editandoCalibracao.criterios_proposta_intervencao!.descricoes,
                                        [chave]: e.target.value
                                      }
                                    }
                                  })}
                                  className="text-sm"
                                  placeholder={`Descrição de ${label.toLowerCase()}...`}
                                />
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="verificar-c5"
                              checked={editandoCalibracao.criterios_proposta_intervencao.verificar_c5}
                              onChange={(e) => setEditandoCalibracao({
                                ...editandoCalibracao,
                                criterios_proposta_intervencao: {
                                  ...editandoCalibracao.criterios_proposta_intervencao!,
                                  verificar_c5: e.target.checked
                                }
                              })}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="verificar-c5" className="text-sm">
                              Validar presença dos elementos C5 na resposta
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="verificar-retomada"
                              checked={editandoCalibracao.criterios_proposta_intervencao.verificar_retomada_tese}
                              onChange={(e) => setEditandoCalibracao({
                                ...editandoCalibracao,
                                criterios_proposta_intervencao: {
                                  ...editandoCalibracao.criterios_proposta_intervencao!,
                                  verificar_retomada_tese: e.target.checked
                                }
                              })}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="verificar-retomada" className="text-sm">
                              Exigir retomada sintética da tese antes da proposta
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instruções de geração */}
                    <div>
                      <Separator className="my-2" />
                      <Label>Instruções de geração (enviadas ao prompt da IA)</Label>
                      <Textarea
                        value={editandoCalibracao.instrucoes_geracao}
                        onChange={(e) => setEditandoCalibracao({
                          ...editandoCalibracao,
                          instrucoes_geracao: e.target.value
                        })}
                        rows={4}
                        placeholder="Instruções adicionais para calibrar o estilo e a estrutura da resposta..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => salvarCalibracao(editandoCalibracao)}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setEditandoCalibracao(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── ABA: MODELOS DE REFERÊNCIA ────────────────────────── */}
      <TabsContent value="modelos" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Modelos Exemplares</CardTitle>
                <CardDescription>
                  Textos de referência usados pelo Jarvis como few-shot learning.
                  Modelos ativos são incluídos no prompt antes da geração da resposta.
                </CardDescription>
              </div>
              <Button onClick={abrirNovoModelo}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Modelo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {modelos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum modelo cadastrado
              </div>
            ) : (
              modelos.map((modelo) => (
                <div key={modelo.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{modelo.titulo}</h4>
                        {modelo.ativo && (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        )}
                        {modelo.subtab_nome && (
                          <Badge variant="outline" className="text-xs">
                            {SUBTAB_LABELS[modelo.subtab_nome] ?? modelo.subtab_nome}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          Prioridade: {modelo.ordem_prioridade}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Tema: {modelo.tema}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                        <span>{modelo.palavras} palavras</span>
                        <span>{modelo.periodos} períodos</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                        {modelo.texto_modelo}
                      </div>
                      {modelo.observacoes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Obs: {modelo.observacoes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => abrirEditarModelo(modelo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={modelo.ativo ? 'default' : 'outline'}
                        onClick={() => toggleModelo(modelo)}
                      >
                        {modelo.ativo ? 'Ativo' : 'Inativo'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deletarModelo(modelo.id, modelo.titulo)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
      {/* ─── ABA: FRASE TEMÁTICA ───────────────────────────────────── */}
      <TabsContent value="tema" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Como escrever uma frase temática ENEM</CardTitle>
            <CardDescription>
              Instruções exibidas aos alunos e exemplos usados pela IA para sugerir temas válidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!temaConfig ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {/* Instruções */}
                <div className="space-y-2">
                  <Label>Instruções para os alunos</Label>
                  <p className="text-xs text-muted-foreground">
                    Texto exibido como orientação ao aluno no campo de tema. Explique o que é uma frase temática válida no estilo ENEM.
                  </p>
                  <Textarea
                    value={temaConfig.instrucoes}
                    onChange={(e) => setTemaConfig({ ...temaConfig, instrucoes: e.target.value })}
                    rows={5}
                    placeholder="Descreva o que é uma boa frase temática ENEM..."
                    className="text-sm"
                  />
                </div>

                <Separator />

                {/* Exemplos */}
                <div className="space-y-3">
                  <div>
                    <Label>Exemplos de frases temáticas válidas</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estes exemplos são usados pela IA para sugerir temas ao aluno enquanto ele digita. Você pode reordenar, editar ou remover.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {temaConfig.exemplos_temas.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moverExemplo(idx, -1)}
                            disabled={idx === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none"
                          >▲</button>
                          <button
                            type="button"
                            onClick={() => moverExemplo(idx, 1)}
                            disabled={idx === temaConfig.exemplos_temas.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none"
                          >▼</button>
                        </div>
                        <Input
                          value={ex}
                          onChange={(e) => {
                            const arr = [...temaConfig.exemplos_temas];
                            arr[idx] = e.target.value;
                            setTemaConfig({ ...temaConfig, exemplos_temas: arr });
                          }}
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removerExemplo(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar novo exemplo */}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={novoExemplo}
                      onChange={(e) => setNovoExemplo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarExemplo(); } }}
                      placeholder="Digite um novo exemplo de frase temática..."
                      className="flex-1 text-sm"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={adicionarExemplo}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={salvarTemaConfig} disabled={salvandoTemaConfig}>
                    {salvandoTemaConfig ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Salvando...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" />Salvar configuração</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* ─── Dialog criar/editar modelo ──────────────────────────── */}
    <Dialog open={modeloDialog} onOpenChange={setModeloDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modeloEditando ? 'Editar Modelo' : 'Novo Modelo de Referência'}
          </DialogTitle>
          <DialogDescription>
            Texto exemplar incluído no prompt da IA para orientar o estilo e a estrutura da resposta (few-shot learning)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de parágrafo *</Label>
              <Select
                value={formModelo.subtab_id}
                onValueChange={(value) => setFormModelo({ ...formModelo, subtab_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subtabs.map((subtab) => (
                    <SelectItem key={subtab.id} value={subtab.id}>
                      {SUBTAB_LABELS[subtab.nome] ?? subtab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Posição de prioridade</Label>
              <Select
                value={formModelo.ordem_prioridade.toString()}
                onValueChange={(value) => setFormModelo({ ...formModelo, ordem_prioridade: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: modelos.length + 1 }, (_, i) => i + 1).map((pos) => (
                    <SelectItem key={pos} value={pos.toString()}>
                      {pos === 1 ? `${pos}ª (mais prioritário)` : `${pos}ª posição`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Modelos abaixo serão reorganizados automaticamente.
              </p>
            </div>
          </div>

          <div>
            <Label>Título do modelo *</Label>
            <Input
              value={formModelo.titulo}
              onChange={(e) => setFormModelo({ ...formModelo, titulo: e.target.value })}
              placeholder="Ex: Modelo 1 - Leitura entre jovens"
            />
          </div>

          <div>
            <Label>Tema abordado *</Label>
            <Input
              value={formModelo.tema}
              onChange={(e) => setFormModelo({ ...formModelo, tema: e.target.value })}
              placeholder="Ex: A importância da leitura para os jovens brasileiros"
            />
          </div>

          <div>
            <Label>Texto do modelo *</Label>
            <Textarea
              value={formModelo.texto_modelo}
              onChange={(e) => setFormModelo({ ...formModelo, texto_modelo: e.target.value })}
              rows={6}
              placeholder="Cole aqui o texto exemplar..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Períodos e palavras serão calculados automaticamente ao salvar.
            </p>
          </div>

          <div>
            <Label>Observações (opcional)</Label>
            <Textarea
              value={formModelo.observacoes}
              onChange={(e) => setFormModelo({ ...formModelo, observacoes: e.target.value })}
              rows={2}
              placeholder="Por que este modelo foi escolhido? Que padrão ele demonstra?"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativo-modelo"
              checked={formModelo.ativo}
              onChange={(e) => setFormModelo({ ...formModelo, ativo: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="ativo-modelo">
              Modelo ativo (incluído no prompt de geração)
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={salvarModelo} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {modeloEditando ? 'Salvar alterações' : 'Criar modelo'}
            </Button>
            <Button variant="outline" onClick={() => setModeloDialog(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
