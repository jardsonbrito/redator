import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Layers, Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CampoResposta {
  chave: string;
  rotulo: string;
  cor: string;
  copiavel?: boolean;
}

interface JarvisModo {
  id: string;
  nome: string;
  label: string;
  descricao: string | null;
  icone: string;
  system_prompt: string;
  campos_resposta: CampoResposta[];
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

const ICONES_DISPONIVEIS = [
  'Sparkles', 'FileEdit', 'PenLine', 'BookOpen', 'Lightbulb',
  'Target', 'GraduationCap', 'Brain', 'Wand2', 'Star',
];

const CORES_DISPONIVEIS = [
  { value: 'blue',   label: 'Azul'   },
  { value: 'purple', label: 'Roxo'   },
  { value: 'green',  label: 'Verde'  },
  { value: 'amber',  label: 'Âmbar'  },
  { value: 'gray',   label: 'Cinza'  },
];

const campoVazio = (): CampoResposta => ({
  chave: '', rotulo: '', cor: 'blue', copiavel: false,
});

const formVazio = {
  nome: '',
  label: '',
  descricao: '',
  icone: 'Sparkles',
  system_prompt: '',
  campos_resposta: [
    { chave: 'diagnostico',       rotulo: 'Diagnóstico',    cor: 'blue',   copiavel: false },
    { chave: 'sugestao_reescrita', rotulo: 'Como Melhorar',  cor: 'purple', copiavel: false },
    { chave: 'versao_melhorada',  rotulo: 'Versão Lapidada', cor: 'green',  copiavel: true  },
  ] as CampoResposta[],
};

export const JarvisModosManagement = () => {
  const { toast } = useToast();
  const [modos, setModos] = useState<JarvisModo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingModo, setEditingModo] = useState<JarvisModo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<string | null>(null);
  const [formData, setFormData] = useState(formVazio);

  useEffect(() => { loadModos(); }, []);

  const loadModos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jarvis_modos')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      setModos(data || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar modos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setFormData(formVazio);

  const openCreate = () => {
    resetForm();
    setEditingModo(null);
    setShowDialog(true);
  };

  const openEdit = (modo: JarvisModo) => {
    setFormData({
      nome:            modo.nome,
      label:           modo.label,
      descricao:       modo.descricao ?? '',
      icone:           modo.icone,
      system_prompt:   modo.system_prompt,
      campos_resposta: modo.campos_resposta,
    });
    setEditingModo(modo);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.label.trim() || !formData.system_prompt.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Nome, label e system prompt são obrigatórios', variant: 'destructive' });
      return;
    }
    if (formData.campos_resposta.some(c => !c.chave.trim() || !c.rotulo.trim())) {
      toast({ title: 'Campos incompletos', description: 'Todos os campos de resposta precisam de chave e rótulo', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        nome:            formData.nome.trim().toLowerCase().replace(/\s+/g, '_'),
        label:           formData.label.trim(),
        descricao:       formData.descricao.trim() || null,
        icone:           formData.icone,
        system_prompt:   formData.system_prompt.trim(),
        campos_resposta: formData.campos_resposta,
        atualizado_em:   new Date().toISOString(),
      };

      if (editingModo) {
        const { error } = await supabase
          .from('jarvis_modos')
          .update(payload)
          .eq('id', editingModo.id);
        if (error) throw error;
        toast({ title: '✅ Modo atualizado', description: `"${payload.label}" salvo com sucesso` });
      } else {
        const maxOrdem = modos.reduce((max, m) => Math.max(max, m.ordem), -1);
        const { error } = await supabase
          .from('jarvis_modos')
          .insert({ ...payload, ativo: true, ordem: maxOrdem + 1 });
        if (error) throw error;
        toast({ title: '✅ Modo criado', description: `"${payload.label}" criado com sucesso` });
      }

      setShowDialog(false);
      setEditingModo(null);
      resetForm();
      loadModos();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao salvar modo', variant: 'destructive' });
    }
  };

  const handleToggleAtivo = async (modo: JarvisModo) => {
    try {
      const { error } = await supabase
        .from('jarvis_modos')
        .update({ ativo: !modo.ativo, atualizado_em: new Date().toISOString() })
        .eq('id', modo.id);
      if (error) throw error;
      setModos(prev => prev.map(m => m.id === modo.id ? { ...m, ativo: !m.ativo } : m));
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Erro ao alterar status', variant: 'destructive' });
    }
  };

  const handleOrdem = async (modo: JarvisModo, direcao: 'up' | 'down') => {
    const sorted = [...modos].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(m => m.id === modo.id);
    const swapIdx = direcao === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swap = sorted[swapIdx];
    try {
      await Promise.all([
        supabase.from('jarvis_modos').update({ ordem: swap.ordem }).eq('id', modo.id),
        supabase.from('jarvis_modos').update({ ordem: modo.ordem }).eq('id', swap.id),
      ]);
      loadModos();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao reordenar', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from('jarvis_modos').delete().eq('id', deletingId);
      if (error) throw error;
      toast({ title: '✅ Modo excluído' });
      setDeletingId(null);
      loadModos();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao excluir', variant: 'destructive' });
    }
  };

  // ── Helpers para campos_resposta ─────────────────────────────────
  const setCampo = (idx: number, key: keyof CampoResposta, value: any) => {
    setFormData(prev => {
      const campos = [...prev.campos_resposta];
      campos[idx] = { ...campos[idx], [key]: value };
      return { ...prev, campos_resposta: campos };
    });
  };

  const addCampo = () =>
    setFormData(prev => ({ ...prev, campos_resposta: [...prev.campos_resposta, campoVazio()] }));

  const removeCampo = (idx: number) =>
    setFormData(prev => ({
      ...prev,
      campos_resposta: prev.campos_resposta.filter((_, i) => i !== idx),
    }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Modos do Jarvis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
                <Layers className="h-5 w-5" />
                Modos do Jarvis
              </CardTitle>
              <CardDescription>
                Cada modo tem seu próprio system prompt e define os campos retornados ao aluno.
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo modo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {modos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum modo cadastrado. Crie o primeiro modo do Jarvis.
            </p>
          ) : (
            <div className="space-y-3">
              {[...modos].sort((a, b) => a.ordem - b.ordem).map((modo, idx, arr) => (
                <div
                  key={modo.id}
                  className="flex items-start gap-3 border rounded-lg p-4"
                >
                  {/* Reordenar */}
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleOrdem(modo, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrdem(modo, 'down')}
                      disabled={idx === arr.length - 1}
                      className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{modo.label}</span>
                      <Badge variant="outline" className="text-xs font-mono">{modo.nome}</Badge>
                      <Badge variant={modo.ativo ? 'default' : 'secondary'} className="text-xs">
                        {modo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    {modo.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">{modo.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {modo.campos_resposta.map(c => (
                        <span key={c.chave} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {c.rotulo}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={modo.ativo}
                      onCheckedChange={() => handleToggleAtivo(modo)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingPrompt(modo.system_prompt)}
                      title="Ver prompt"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(modo)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(modo.id)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: criar / editar modo */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditingModo(null); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModo ? 'Editar modo' : 'Novo modo'}</DialogTitle>
            <DialogDescription>
              Configure o comportamento deste modo e os campos que a IA deve retornar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nome + Label */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome interno <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="analisar"
                  value={formData.nome}
                  onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Identificador único, sem espaços</p>
              </div>
              <div className="space-y-1.5">
                <Label>Label (exibido ao aluno) <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Analisar texto"
                  value={formData.label}
                  onChange={e => setFormData(p => ({ ...p, label: e.target.value }))}
                />
              </div>
            </div>

            {/* Descrição + Ícone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  placeholder="Breve descrição do modo"
                  value={formData.descricao}
                  onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ícone</Label>
                <Select value={formData.icone} onValueChange={v => setFormData(p => ({ ...p, icone: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONES_DISPONIVEIS.map(ic => (
                      <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <Label>System Prompt <span className="text-destructive">*</span></Label>
              <Textarea
                rows={10}
                placeholder="Você é Jarvis, assistente pedagógico..."
                value={formData.system_prompt}
                onChange={e => setFormData(p => ({ ...p, system_prompt: e.target.value }))}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                O prompt deve instruir a IA a retornar um JSON com exatamente as chaves definidas abaixo.
              </p>
            </div>

            {/* Campos de resposta */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Campos de resposta</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCampo}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar campo
                </Button>
              </div>

              {formData.campos_resposta.map((campo, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start border rounded-lg p-3">
                  {/* Chave */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Chave JSON</Label>
                    <Input
                      placeholder="versao_melhorada"
                      value={campo.chave}
                      onChange={e => setCampo(idx, 'chave', e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  {/* Rótulo */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Rótulo</Label>
                    <Input
                      placeholder="Versão Lapidada"
                      value={campo.rotulo}
                      onChange={e => setCampo(idx, 'rotulo', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  {/* Cor */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <Select value={campo.cor} onValueChange={v => setCampo(idx, 'cor', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CORES_DISPONIVEIS.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Copiável + remover */}
                  <div className="col-span-3 flex items-end gap-2 pb-0.5">
                    <div className="flex items-center gap-1.5 mt-5">
                      <Switch
                        checked={!!campo.copiavel}
                        onCheckedChange={v => setCampo(idx, 'copiavel', v)}
                        id={`copiavel-${idx}`}
                      />
                      <Label htmlFor={`copiavel-${idx}`} className="text-xs cursor-pointer">Copiável</Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-4 h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeCampo(idx)}
                      disabled={formData.campos_resposta.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingModo(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingModo ? 'Salvar alterações' : 'Criar modo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: confirmar exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O histórico de interações que usou este modo não será apagado,
              mas ficará sem referência de modo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: visualizar prompt */}
      <Dialog open={viewingPrompt !== null} onOpenChange={() => setViewingPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>System Prompt</DialogTitle>
            <DialogDescription>Instruções enviadas para a OpenAI neste modo</DialogDescription>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-xs whitespace-pre-wrap font-mono">
            {viewingPrompt}
          </pre>
          <DialogFooter>
            <Button onClick={() => setViewingPrompt(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
