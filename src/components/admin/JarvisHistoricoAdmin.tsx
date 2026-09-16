import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, History, Search, Loader2, RefreshCw, UserX } from 'lucide-react';
import { TODAS_TURMAS, formatTurmaDisplay } from '@/utils/turmaUtils';

interface Interacao {
  id: string;
  user_id: string;
  texto_original: string;
  palavras_original: number;
  created_at: string;
  modo_label: string;
  aluno_nome: string;
  aluno_email: string;
  aluno_turma: string;
}

type DialogState =
  | { tipo: 'individual'; id: string; nome: string }
  | { tipo: 'lote'; ids: string[] }
  | { tipo: 'aluno'; user_id: string; nome: string }
  | null;

const truncar = (texto: string, max = 80) =>
  texto.length <= max ? texto : texto.substring(0, max) + '...';

const formatData = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

export const JarvisHistoricoAdmin = () => {
  const { toast } = useToast();

  const [interacoes, setInteracoes]     = useState<Interacao[]>([]);
  const [loading, setLoading]           = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [filtroTurma, setFiltroTurma]   = useState<string>('todas');
  const [filtroBusca, setFiltroBusca]   = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [dialog, setDialog]             = useState<DialogState>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setSelecionados(new Set());
    try {
      const { data, error } = await supabase
        .from('jarvis_interactions')
        .select(`
          id, user_id, texto_original, palavras_original, created_at,
          jarvis_modos!modo_id ( label ),
          profiles!user_id ( nome, sobrenome, email, turma )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const rows: Interacao[] = (data ?? []).map((r: any) => ({
        id:              r.id,
        user_id:         r.user_id,
        texto_original:  r.texto_original ?? '',
        palavras_original: r.palavras_original ?? 0,
        created_at:      r.created_at,
        modo_label:      r.jarvis_modos?.label ?? '—',
        aluno_nome:      `${r.profiles?.nome ?? ''} ${r.profiles?.sobrenome ?? ''}`.trim() || '—',
        aluno_email:     r.profiles?.email ?? '—',
        aluno_turma:     r.profiles?.turma ?? '',
      }));

      setInteracoes(rows);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar histórico', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Filtragem ─────────────────────────────────────────────────────────────
  const filtradas = interacoes.filter(i => {
    const turmaOk = filtroTurma === 'todas' || i.aluno_turma === filtroTurma;
    const busca = filtroBusca.toLowerCase();
    const buscaOk = !busca ||
      i.aluno_nome.toLowerCase().includes(busca) ||
      i.aluno_email.toLowerCase().includes(busca);
    return turmaOk && buscaOk;
  });

  // ── Seleção ───────────────────────────────────────────────────────────────
  const todosSelecionados = filtradas.length > 0 && filtradas.every(i => selecionados.has(i.id));

  const toggleTodos = () => {
    if (todosSelecionados) {
      setSelecionados(prev => {
        const next = new Set(prev);
        filtradas.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      setSelecionados(prev => {
        const next = new Set(prev);
        filtradas.forEach(i => next.add(i.id));
        return next;
      });
    }
  };

  const toggleItem = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Deleção ───────────────────────────────────────────────────────────────
  const executarDelecao = async () => {
    if (!dialog) return;
    setDeleting(true);
    try {
      let ids: string[] = [];
      let mensagem = '';

      if (dialog.tipo === 'individual') {
        ids = [dialog.id];
        mensagem = 'Interação deletada.';
      } else if (dialog.tipo === 'lote') {
        ids = dialog.ids;
        mensagem = `${ids.length} interações deletadas.`;
      } else if (dialog.tipo === 'aluno') {
        const { data } = await supabase
          .from('jarvis_interactions')
          .select('id')
          .eq('user_id', dialog.user_id);
        ids = (data ?? []).map((r: any) => r.id);
        mensagem = `Todo o histórico de ${dialog.nome} foi deletado (${ids.length} interações).`;
      }

      if (ids.length === 0) {
        toast({ title: 'Nada a deletar', description: 'Nenhuma interação encontrada.' });
        return;
      }

      const { error } = await supabase
        .from('jarvis_interactions')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Deletado com sucesso',
        description: mensagem,
        className: 'border-green-200 bg-green-50 text-green-900',
      });

      await carregar();
    } catch (err: any) {
      toast({ title: 'Erro ao deletar', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDialog(null);
    }
  };

  const abrirDialogIndividual = (id: string, nome: string) => {
    setOpenDialogId(null);
    setTimeout(() => setDialog({ tipo: 'individual', id, nome }), 100);
  };

  const abrirDialogAluno = (user_id: string, nome: string) => {
    setOpenDialogId(null);
    setTimeout(() => setDialog({ tipo: 'aluno', user_id, nome }), 100);
  };

  const selecionadosList = Array.from(selecionados);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Histórico de Interações
            </CardTitle>
            <div className="flex items-center gap-2">
              {selecionadosList.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDialog({ tipo: 'lote', ids: selecionadosList })}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Deletar {selecionadosList.length} selecionados
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <Select value={filtroTurma} onValueChange={setFiltroTurma}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {TODAS_TURMAS.map(t => (
                  <SelectItem key={t} value={t}>{formatTurmaDisplay(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar aluno por nome ou e-mail..."
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Contagem */}
          <p className="text-xs text-gray-500">
            {filtradas.length} interação(ões) encontrada(s)
            {selecionadosList.length > 0 && ` · ${selecionadosList.length} selecionada(s)`}
          </p>

          {/* Tabela */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nenhuma interação encontrada.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={todosSelecionados}
                        onCheckedChange={toggleTodos}
                      />
                    </TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="w-16">Turma</TableHead>
                    <TableHead className="w-24">Modo</TableHead>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead className="w-20">Palavras</TableHead>
                    <TableHead>Texto</TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map(item => (
                    <TableRow key={item.id} className={selecionados.has(item.id) ? 'bg-indigo-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selecionados.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-gray-800">{item.aluno_nome}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatTurmaDisplay(item.aluno_turma) || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                          {item.modo_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatData(item.created_at)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 text-center">
                        {item.palavras_original}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-xs">
                        {truncar(item.texto_original)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            title="Deletar esta interação"
                            onClick={() => abrirDialogIndividual(item.id, item.aluno_nome)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            title="Deletar todo o histórico deste aluno"
                            onClick={() => abrirDialogAluno(item.user_id, item.aluno_nome)}
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação */}
      <AlertDialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.tipo === 'individual' && 'Deletar interação'}
              {dialog?.tipo === 'lote' && `Deletar ${dialog.ids.length} interações`}
              {dialog?.tipo === 'aluno' && 'Deletar todo o histórico do aluno'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.tipo === 'individual' && (
                <>Esta ação é irreversível. A interação de <strong>{dialog.nome}</strong> será deletada permanentemente.</>
              )}
              {dialog?.tipo === 'lote' && (
                <>Esta ação é irreversível. As <strong>{dialog.ids.length} interações selecionadas</strong> serão deletadas permanentemente.</>
              )}
              {dialog?.tipo === 'aluno' && (
                <>Esta ação é irreversível. <strong>Todo o histórico Jarvis de {dialog.nome}</strong> será deletado permanentemente.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executarDelecao}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
