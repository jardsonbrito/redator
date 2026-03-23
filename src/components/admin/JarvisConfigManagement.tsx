import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings2, Plus, Edit, Check, X, Trash2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface JarvisConfig {
  id: string;
  versao: number;
  ativo: boolean;
  nome: string;
  descricao: string | null;
  provider: string;
  model: string;
  temperatura: number;
  max_tokens: number;
  system_prompt: string;
  limite_palavras_entrada: number;
  limite_consultas_hora: number;
  peso_distribuicao: number;
  disponivel_alunos: boolean;
  mensagem_indisponibilidade: string;
  criado_em: string;
  atualizado_em: string;
}

export const JarvisConfigManagement = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<JarvisConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<JarvisConfig | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<string | null>(null);

  // System messages state
  const [mensagemSistema, setMensagemSistema] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    model: 'gpt-4o-mini',
    temperatura: 0.7,
    max_tokens: 1024,
    system_prompt: '',
    limite_palavras_entrada: 500,
    limite_consultas_hora: 5,
    peso_distribuicao: 0,
    disponivel_alunos: false,
    mensagem_indisponibilidade: 'Esta funcionalidade estará disponível em breve. Estamos trabalhando em melhorias para oferecer a melhor experiência de aprendizado!',
  });

  useEffect(() => {
    loadConfigs();
    loadSystemMessages();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jarvis_config')
        .select('*')
        .order('versao', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações do Jarvis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('jarvis_system_config')
        .select('valor')
        .eq('chave', 'mensagem_sistema')
        .single();

      if (error) throw error;

      if (data) {
        setMensagemSistema(data.valor);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagem do sistema:', error);
    }
  };

  const saveSystemMessages = async () => {
    try {
      setLoadingMessages(true);

      const { error } = await supabase
        .from('jarvis_system_config')
        .update({ valor: mensagemSistema, atualizado_em: new Date().toISOString() })
        .eq('chave', 'mensagem_sistema');

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Mensagem atualizada com sucesso!',
        className: 'border-green-200 bg-green-50 text-green-900'
      });
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar mensagem do sistema',
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      model: 'gpt-4o-mini',
      temperatura: 0.7,
      max_tokens: 1024,
      system_prompt: `Você é Jarvis, assistente pedagógico de redação ENEM.

IMPORTANTE: Sua resposta DEVE seguir este formato JSON exato:

{
  "diagnostico": "Análise objetiva do texto apresentado",
  "explicacao": "Explicação pedagógica dos problemas identificados",
  "sugestao_reescrita": "Orientação de como o aluno pode melhorar",
  "versao_melhorada": "Texto reformulado mantendo a ideia original"
}

REGRAS OBRIGATÓRIAS:
1. NUNCA expanda a ideia do aluno
2. NUNCA crie novos argumentos
3. NUNCA adicione informações que o aluno não forneceu
4. Apenas reformule a ideia ORIGINAL, melhorando:
   - Clareza e objetividade
   - Estrutura frasal (ordem direta)
   - Coesão textual (conectivos adequados)
   - Formalidade acadêmica (sem rebuscamento)
   - Eliminação de vícios de linguagem
5. A "versao_melhorada" deve ter tamanho SIMILAR ao original
6. Preserve o vocabulário do aluno sempre que possível
7. Mantenha a autoria: o aluno deve reconhecer sua própria ideia`,
      limite_palavras_entrada: 500,
      limite_consultas_hora: 5,
      peso_distribuicao: 0,
      disponivel_alunos: false,
      mensagem_indisponibilidade: 'Esta funcionalidade estará disponível em breve. Estamos trabalhando em melhorias para oferecer a melhor experiência de aprendizado!',
    });
    setEditingConfig(null);
  };

  const handleCreate = async () => {
    try {
      // Buscar próximo número de versão
      const { data: maxVersion } = await supabase
        .from('jarvis_config')
        .select('versao')
        .order('versao', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (maxVersion?.versao || 0) + 1;

      const { error } = await supabase.from('jarvis_config').insert({
        versao: nextVersion,
        ativo: false,
        ...formData,
      });

      if (error) throw error;

      toast({
        title: '✅ Configuração criada',
        description: `Versão ${nextVersion} criada com sucesso!`,
      });

      setShowCreateDialog(false);
      resetForm();
      loadConfigs();
    } catch (error: any) {
      console.error('Erro ao criar configuração:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar configuração',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingConfig) return;

    try {
      const { error } = await supabase
        .from('jarvis_config')
        .update({
          ...formData,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', editingConfig.id);

      if (error) throw error;

      toast({
        title: '✅ Configuração atualizada',
        description: 'As alterações foram salvas com sucesso!',
      });

      setEditingConfig(null);
      resetForm();
      loadConfigs();
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar configuração',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (config: JarvisConfig) => {
    try {
      // Se estamos ativando uma config, desativar todas as outras primeiro
      if (!config.ativo) {
        await supabase
          .from('jarvis_config')
          .update({ ativo: false })
          .neq('id', config.id);
      }

      const { error } = await supabase
        .from('jarvis_config')
        .update({ ativo: !config.ativo })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: config.ativo ? 'Configuração desativada' : 'Configuração ativada',
        description: config.ativo
          ? 'A configuração foi desativada'
          : `Versão ${config.versao} agora está ativa`,
      });

      loadConfigs();
    } catch (error: any) {
      console.error('Erro ao alternar status:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao alternar status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (config: JarvisConfig) => {
    if (!confirm(`Tem certeza que deseja deletar a versão ${config.versao}?`)) return;

    try {
      const { error } = await supabase
        .from('jarvis_config')
        .delete()
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: 'Configuração deletada',
        description: `Versão ${config.versao} foi removida`,
      });

      loadConfigs();
    } catch (error: any) {
      console.error('Erro ao deletar configuração:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar configuração',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (config: JarvisConfig) => {
    setEditingConfig(config);
    setFormData({
      nome: config.nome,
      descricao: config.descricao || '',
      model: config.model,
      temperatura: config.temperatura,
      max_tokens: config.max_tokens,
      system_prompt: config.system_prompt,
      limite_palavras_entrada: config.limite_palavras_entrada,
      limite_consultas_hora: config.limite_consultas_hora,
      peso_distribuicao: config.peso_distribuicao,
      disponivel_alunos: config.disponivel_alunos,
      mensagem_indisponibilidade: config.mensagem_indisponibilidade,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Parâmetros do Jarvis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Parâmetros do Jarvis
              </CardTitle>
              <CardDescription className="mt-2">
                Modelo, temperatura, limites e disponibilidade para os alunos. Os prompts são gerenciados na aba Modos.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Configuração
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma configuração encontrada. Crie a primeira!
              </div>
            ) : (
              configs.map((config) => (
                <div
                  key={config.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{config.nome}</h3>
                        <Badge variant="outline">v{config.versao}</Badge>
                        {config.ativo && (
                          <Badge className="bg-green-100 text-green-800">
                            Ativa
                          </Badge>
                        )}
                      </div>
                      {config.descricao && (
                        <p className="text-sm text-muted-foreground">
                          {config.descricao}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Modelo: {config.model}</span>
                        <span>Temp: {config.temperatura}</span>
                        <span>Max tokens: {config.max_tokens}</span>
                        <span>Limite: {config.limite_palavras_entrada} palavras</span>
                        <span>Rate: {config.limite_consultas_hora}/hora</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingPrompt(config.system_prompt)}
                        className="hidden"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={config.ativo ? 'default' : 'outline'}
                        onClick={() => toggleActive(config)}
                      >
                        {config.ativo ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                      {!config.ativo && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(config)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card de Mensagens do Sistema */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Mensagens do Sistema
          </CardTitle>
          <CardDescription>
            Personalize as mensagens exibidas aos alunos em diferentes situações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mensagem_sistema">
              Mensagem do Sistema
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Esta mensagem será exibida aos alunos quando o Jarvis estiver indisponível
            </p>
            <Textarea
              id="mensagem_sistema"
              value={mensagemSistema}
              onChange={(e) => setMensagemSistema(e.target.value)}
              rows={4}
              placeholder="Digite a mensagem que aparecerá para os alunos..."
            />
          </div>

          <Button onClick={saveSystemMessages} disabled={loadingMessages}>
            {loadingMessages ? 'Salvando...' : 'Salvar Mensagem'}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog
        open={showCreateDialog || editingConfig !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingConfig(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
            </DialogTitle>
            <DialogDescription>
              Configure o comportamento e os parâmetros do Jarvis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome da Configuração</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Versão 2.0 - Mais rigoroso"
                />
              </div>
              <div>
                <Label htmlFor="model">Modelo OpenAI</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) =>
                    setFormData({ ...formData, model: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Descreva o objetivo desta configuração"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperatura">Temperatura (0-2)</Label>
                <Input
                  id="temperatura"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperatura}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperatura: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  value={formData.max_tokens}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_tokens: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="limite_palavras">Limite de Palavras</Label>
                <Input
                  id="limite_palavras"
                  type="number"
                  value={formData.limite_palavras_entrada}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      limite_palavras_entrada: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="limite_hora">Consultas por Hora</Label>
                <Input
                  id="limite_hora"
                  type="number"
                  value={formData.limite_consultas_hora}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      limite_consultas_hora: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>


            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-sm">Disponibilidade para Alunos</h4>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="disponivel_alunos"
                  checked={formData.disponivel_alunos}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      disponivel_alunos: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="disponivel_alunos" className="cursor-pointer">
                  Liberar Jarvis para os alunos
                </Label>
              </div>

              <div>
                <Label htmlFor="mensagem_indisponibilidade">
                  Mensagem quando indisponível (exibida aos alunos)
                </Label>
                <Textarea
                  id="mensagem_indisponibilidade"
                  value={formData.mensagem_indisponibilidade}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mensagem_indisponibilidade: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Digite a mensagem que os alunos verão quando o Jarvis estiver indisponível..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta mensagem aparece quando "Liberar Jarvis para os alunos" está desmarcado.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingConfig(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={editingConfig ? handleUpdate : handleCreate}>
              {editingConfig ? 'Salvar Alterações' : 'Criar Configuração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualizar Prompt */}
      <Dialog open={viewingPrompt !== null} onOpenChange={() => setViewingPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>System Prompt</DialogTitle>
            <DialogDescription>
              Instruções enviadas para a OpenAI
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
              {viewingPrompt}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingPrompt(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
