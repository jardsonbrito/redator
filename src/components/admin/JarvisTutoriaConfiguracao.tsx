import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings2, Plus, Edit, Trash2, Save, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Calibracao {
  id: string;
  subtab_id: string;
  subtab_nome: string;
  periodos_exatos: number;
  palavras_min: number;
  palavras_max: number;
  linhas_max_estimadas: number | null;
  regras_composicao: any;
  instrucoes_geracao: string;
  validacao_automatica: boolean;
  max_tentativas_geracao: number;
}

interface ModeloReferencia {
  id: string;
  subtab_id: string;
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Buscar calibrações com nome da subtab
      const { data: calibData, error: calibError } = await supabase
        .from('jarvis_tutoria_calibracao')
        .select(`
          *,
          jarvis_tutoria_subtabs!inner(nome)
        `);

      if (calibError) throw calibError;

      const calibracoesComNome = calibData?.map((c: any) => ({
        ...c,
        subtab_nome: c.jarvis_tutoria_subtabs.nome
      })) || [];

      setCalibracoes(calibracoesComNome);

      // Buscar modelos
      const { data: modelosData, error: modelosError } = await supabase
        .from('jarvis_tutoria_modelos_referencia')
        .select('*')
        .order('ordem_prioridade', { ascending: true });

      if (modelosError) throw modelosError;
      setModelos(modelosData || []);

      // Buscar subtabs
      const { data: subtabsData, error: subtabsError } = await supabase
        .from('jarvis_tutoria_subtabs')
        .select('id, nome')
        .order('nome');

      if (subtabsError) throw subtabsError;
      setSubtabs(subtabsData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
      console.error('Erro ao salvar calibração:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar calibração',
        variant: 'destructive',
      });
    }
  };

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
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
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

      toast({
        title: 'Modelo deletado',
        description: `"${titulo}" foi removido`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const abrirNovoModelo = () => {
    // Calcular próxima prioridade (maior número + 1)
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
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha título, tema, texto e tipo de parágrafo',
          variant: 'destructive',
        });
        return;
      }

      const novaPrioridade = formModelo.ordem_prioridade;

      // Reorganizar prioridades se necessário
      if (modeloEditando) {
        // Ao editar, se mudou de posição
        const prioridadeAnterior = modeloEditando.ordem_prioridade;

        if (novaPrioridade !== prioridadeAnterior) {
          // Buscar modelos que precisam ser reorganizados
          const { data: modelosParaMover } = await supabase
            .from('jarvis_tutoria_modelos_referencia')
            .select('id, ordem_prioridade')
            .gte('ordem_prioridade', novaPrioridade)
            .neq('id', modeloEditando.id);

          // Atualizar cada um incrementando +1
          if (modelosParaMover && modelosParaMover.length > 0) {
            for (const m of modelosParaMover) {
              await supabase
                .from('jarvis_tutoria_modelos_referencia')
                .update({ ordem_prioridade: m.ordem_prioridade + 1 })
                .eq('id', m.id);
            }
          }
        }

        // Atualizar modelo editado
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

        toast({
          title: '✅ Modelo atualizado',
          description: `"${formModelo.titulo}" foi atualizado com sucesso`,
          className: 'border-green-200 bg-green-50 text-green-900'
        });
      } else {
        // Ao criar novo: empurrar modelos com prioridade >= para baixo
        const { data: modelosParaMover } = await supabase
          .from('jarvis_tutoria_modelos_referencia')
          .select('id, ordem_prioridade')
          .gte('ordem_prioridade', novaPrioridade);

        // Atualizar cada um incrementando +1
        if (modelosParaMover && modelosParaMover.length > 0) {
          for (const m of modelosParaMover) {
            await supabase
              .from('jarvis_tutoria_modelos_referencia')
              .update({ ordem_prioridade: m.ordem_prioridade + 1 })
              .eq('id', m.id);
          }
        }

        // Inserir novo modelo
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

        toast({
          title: '✅ Modelo criado',
          description: `"${formModelo.titulo}" foi criado com sucesso`,
          className: 'border-green-200 bg-green-50 text-green-900'
        });
      }

      setModeloDialog(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
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
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="calibracao">
          <Settings2 className="h-4 w-4 mr-2" />
          Calibração Pedagógica
        </TabsTrigger>
        <TabsTrigger value="modelos">
          <BookOpen className="h-4 w-4 mr-2" />
          Modelos de Referência
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calibracao" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Parâmetros Estruturais</CardTitle>
            <CardDescription>
              Configure períodos, palavras e validação para cada tipo de parágrafo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {calibracoes.map((calib) => (
              <div key={calib.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{calib.subtab_nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {calib.periodos_exatos} períodos • {calib.palavras_min}-{calib.palavras_max} palavras
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditandoCalibracao(calib)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>

                {editandoCalibracao?.id === calib.id && (
                  <div className="space-y-4 mt-4 pt-4 border-t">
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

                    <div>
                      <Label>Instruções de geração</Label>
                      <Textarea
                        value={editandoCalibracao.instrucoes_geracao}
                        onChange={(e) => setEditandoCalibracao({
                          ...editandoCalibracao,
                          instrucoes_geracao: e.target.value
                        })}
                        rows={4}
                        placeholder="Instruções enviadas ao prompt..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => salvarCalibracao(editandoCalibracao)}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditandoCalibracao(null)}
                      >
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

      <TabsContent value="modelos" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Modelos Exemplares</CardTitle>
                <CardDescription>
                  Textos de referência usados para calibrar o estilo da IA (few-shot learning)
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
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{modelo.titulo}</h4>
                        {modelo.ativo && (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
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
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {modelo.texto_modelo}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirEditarModelo(modelo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={modelo.ativo ? 'default' : 'outline'}
                        onClick={() => toggleModelo(modelo)}
                      >
                        {modelo.ativo ? 'Ativo' : 'Inativo'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletarModelo(modelo.id, modelo.titulo)}
                      >
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
    </Tabs>

    {/* Dialog de criar/editar modelo */}
    <Dialog open={modeloDialog} onOpenChange={setModeloDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modeloEditando ? 'Editar Modelo' : 'Novo Modelo de Referência'}
          </DialogTitle>
          <DialogDescription>
            Texto exemplar usado para calibrar o estilo da IA (few-shot learning)
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
                      {subtab.nome.charAt(0).toUpperCase() + subtab.nome.slice(1)}
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
                Escolha a posição na hierarquia. Modelos abaixo serão reorganizados.
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
              Períodos e palavras serão calculados automaticamente
            </p>
          </div>

          <div>
            <Label>Observações (opcional)</Label>
            <Textarea
              value={formModelo.observacoes}
              onChange={(e) => setFormModelo({ ...formModelo, observacoes: e.target.value })}
              rows={2}
              placeholder="Notas sobre por que este modelo foi escolhido..."
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
              Modelo ativo (usado na geração)
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
