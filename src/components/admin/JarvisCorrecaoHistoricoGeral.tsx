import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTurmasAtivas } from '@/hooks/useTurmasAtivas';
import {
  BookOpen, Search, Loader2, RefreshCw, Eye, FileText,
  ExternalLink, CheckCircle2, XCircle, Clock, AlertCircle,
  ArrowRight, Image as ImageIcon,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface JarvisCorrecaoAdmin {
  id: string;
  professor_id: string;
  professor_nome: string | null;
  professor_email: string | null;
  turma_id: string | null;
  autor_nome: string;
  tema: string;
  imagem_url: string | null;
  status: string;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  criado_em: string;
  corrigida_em: string | null;
  correcao_ia: any;
  transcricao_confirmada: string | null;
  transcricao_ocr_original: string | null;
  redacao_comentada_id: string | null;
}

interface BlocoParaInserir {
  tipo: string;
  ordem: number;
  visivel: boolean;
  conteudo: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COMPETENCIAS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  corrigida:            { label: 'Corrigida',         className: 'bg-emerald-100 text-emerald-700' },
  aguardando_correcao:  { label: 'Aguardando',        className: 'bg-amber-100 text-amber-700' },
  aguardando_ocr:       { label: 'Aguard. OCR',       className: 'bg-blue-100 text-blue-700' },
  revisao_ocr:          { label: 'Revisão OCR',       className: 'bg-purple-100 text-purple-700' },
  em_revisao:           { label: 'Em revisão',        className: 'bg-orange-100 text-orange-700' },
  erro:                 { label: 'Erro',              className: 'bg-red-100 text-red-700' },
};

const formatData = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const formatNota = (n: number | null) => n === null ? '—' : String(n);

const notaBadgeClass = (n: number | null): string => {
  if (n === null) return 'bg-gray-100 text-gray-500';
  if (n >= 800) return 'bg-emerald-100 text-emerald-700';
  if (n >= 500) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

function mapTipoErroParaCompetencia(tipo: string): string | undefined {
  const mapa: Record<string, string> = {
    'gramática': 'c1', 'ortografia': 'c1', 'pontuação': 'c1',
    'concordância': 'c1', 'regência': 'c1', 'vocabulário': 'c1',
    'coesão': 'c4', 'coerência': 'c4',
    'estrutura': 'c3',
  };
  return mapa[tipo];
}

function mapearParaBlocos(correcao: JarvisCorrecaoAdmin): BlocoParaInserir[] {
  const cia = correcao.correcao_ia || {};
  const texto = correcao.transcricao_confirmada || correcao.transcricao_ocr_original || '';
  const blocos: BlocoParaInserir[] = [];
  let ordem = 1;

  if (texto) {
    blocos.push({ tipo: 'texto_original', ordem: ordem++, visivel: true, conteudo: { texto } });
  }

  if (correcao.nota_total !== null) {
    const competencias: Record<string, { nota: number; comentario: string }> = {};
    COMPETENCIAS.forEach(c => {
      const notaKey = `nota_${c}` as keyof JarvisCorrecaoAdmin;
      competencias[c] = {
        nota: (correcao[notaKey] as number | null) ?? 0,
        comentario: cia.competencias?.[c]?.justificativa ?? '',
      };
    });
    blocos.push({
      tipo: 'competencias_pontuacao',
      ordem: ordem++,
      visivel: true,
      conteudo: { competencias, total: correcao.nota_total },
    });
  }

  if (cia.resumo_geral) {
    blocos.push({ tipo: 'analise_global', ordem: ordem++, visivel: true, conteudo: { texto: cia.resumo_geral } });
  }

  if (cia.versao_lapidada) {
    blocos.push({ tipo: 'versao_lapidada', ordem: ordem++, visivel: true, conteudo: { texto: cia.versao_lapidada } });
  }

  if (cia.sugestoes_objetivas?.length > 0) {
    blocos.push({
      tipo: 'pontos_melhoria',
      ordem: ordem++,
      visivel: true,
      conteudo: {
        itens: (cia.sugestoes_objetivas as string[]).map((s, i) => ({ id: String(i + 1), texto: s })),
      },
    });
  }

  if (cia.estrutura?.argumentos?.length > 0) {
    blocos.push({
      tipo: 'pontos_fortes',
      ordem: ordem++,
      visivel: true,
      conteudo: {
        itens: (cia.estrutura.argumentos as string[]).map((a, i) => ({ id: String(i + 1), texto: a })),
      },
    });
  }

  const erros: any[] = cia.erros || [];
  const anotacoes = erros
    .filter(e => e.trecho_original?.trim())
    .map((e, i) => {
      const trecho = e.trecho_original as string;
      const pos = texto.indexOf(trecho);
      return {
        id: String(i + 1),
        start: Math.max(0, pos),
        end: pos >= 0 ? pos + trecho.length : 0,
        trecho,
        comentario: [e.descricao, e.sugestao ? `Sugestão: ${e.sugestao}` : ''].filter(Boolean).join(' — '),
        tipo: 'erro',
        ...(mapTipoErroParaCompetencia(e.tipo) ? { competencia: mapTipoErroParaCompetencia(e.tipo) } : {}),
      };
    });

  if (anotacoes.length > 0) {
    blocos.push({ tipo: 'comentarios_trecho', ordem: ordem++, visivel: true, conteudo: { anotacoes } });
  }

  return blocos;
}

function contarBlocosPrevios(correcao: JarvisCorrecaoAdmin): number {
  return mapearParaBlocos(correcao).length;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const JarvisCorrecaoHistoricoGeral = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { turmasDinamicas, turmasProfessores } = useTurmasAtivas();

  const [correcoes, setCorrecoes] = useState<JarvisCorrecaoAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);

  // Filtros
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroConvertida, setFiltroConvertida] = useState('todas');

  // Dialog de detalhes (readonly)
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesCorrecao, setDetalhesCorrecao] = useState<JarvisCorrecaoAdmin | null>(null);

  // Dialog de conversão
  const [conversaoOpen, setConversaoOpen] = useState(false);
  const [conversaoCorrecao, setConversaoCorrecao] = useState<JarvisCorrecaoAdmin | null>(null);

  // Estado do formulário de conversão
  const [titulo, setTitulo] = useState('');
  const [eixoTematico, setEixoTematico] = useState('');
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [anonimizar, setAnonimizar] = useState(true);

  // ── Carga ─────────────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_jarvis_correcoes_geral', {
        p_limit: 500,
        p_offset: 0,
      });
      if (error) throw error;
      setCorrecoes((data as JarvisCorrecaoAdmin[]) ?? []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar correções', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Professores únicos (para filtro) ──────────────────────────────────────

  const professoresUnicos = Array.from(
    new Map(
      correcoes
        .filter(c => c.professor_email)
        .map(c => [c.professor_email, { email: c.professor_email!, nome: c.professor_nome ?? c.professor_email! }])
    ).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  // ── Filtragem ─────────────────────────────────────────────────────────────

  const filtradas = correcoes.filter(c => {
    const busca = filtroBusca.toLowerCase();
    const buscaOk = !busca ||
      c.autor_nome.toLowerCase().includes(busca) ||
      c.tema.toLowerCase().includes(busca) ||
      (c.professor_nome ?? '').toLowerCase().includes(busca);

    const professorOk = filtroProfessor === 'todos' || c.professor_email === filtroProfessor;

    const statusOk = filtroStatus === 'todos' || c.status === filtroStatus;

    const convertidaOk =
      filtroConvertida === 'todas' ||
      (filtroConvertida === 'sim' && c.redacao_comentada_id !== null) ||
      (filtroConvertida === 'nao' && c.redacao_comentada_id === null);

    return buscaOk && professorOk && statusOk && convertidaOk;
  });

  const totalConvertidas = correcoes.filter(c => c.redacao_comentada_id !== null).length;
  const totalCorrigidas  = correcoes.filter(c => c.status === 'corrigida').length;

  // ── Abrir detalhes ────────────────────────────────────────────────────────

  const abrirDetalhes = (c: JarvisCorrecaoAdmin) => {
    setDetalhesCorrecao(c);
    setDetalhesOpen(true);
  };

  // ── Abrir conversão ───────────────────────────────────────────────────────

  const abrirConversao = (c: JarvisCorrecaoAdmin) => {
    setConversaoCorrecao(c);
    setTitulo(`${c.tema} — ${formatNota(c.nota_total)}/1000 pts`);
    setEixoTematico('');
    setTurmasAutorizadas([]);
    setAnonimizar(true);
    setConversaoOpen(true);
  };

  const toggleTurma = (val: string) =>
    setTurmasAutorizadas(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]);

  // ── Executar conversão ────────────────────────────────────────────────────

  const executarConversao = async () => {
    if (!conversaoCorrecao) return;

    if (!titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    if (turmasAutorizadas.length === 0) {
      toast({ title: 'Selecione ao menos uma turma autorizada', variant: 'destructive' });
      return;
    }

    setConverting(true);
    try {
      const blocos = mapearParaBlocos(conversaoCorrecao);

      // 1. Criar redação comentada (rascunho)
      const { data: rc, error: rcErr } = await supabase
        .from('redacoes_comentadas')
        .insert({
          titulo:              titulo.trim(),
          eixo_tematico:       eixoTematico.trim() || null,
          modo_correcao_id:    'enem',
          turmas_autorizadas:  turmasAutorizadas,
          ativo:               false,
          jarvis_correcao_id:  conversaoCorrecao.id,
          criado_em:           new Date().toISOString(),
          atualizado_em:       new Date().toISOString(),
        })
        .select('id')
        .single();

      if (rcErr) throw rcErr;

      // 2. Inserir blocos
      if (blocos.length > 0) {
        const { error: blocoErr } = await supabase
          .from('redacao_comentada_blocos')
          .insert(blocos.map(b => ({
            redacao_comentada_id: rc.id,
            tipo:                 b.tipo,
            ordem:                b.ordem,
            visivel:              b.visivel,
            conteudo:             b.conteudo,
            criado_em:            new Date().toISOString(),
          })));
        if (blocoErr) throw blocoErr;
      }

      // 3. Vincular correção → redação comentada
      await supabase
        .from('jarvis_correcoes')
        .update({ redacao_comentada_id: rc.id })
        .eq('id', conversaoCorrecao.id);

      // 4. Atualiza estado local (evita reload)
      setCorrecoes(prev =>
        prev.map(c => c.id === conversaoCorrecao.id ? { ...c, redacao_comentada_id: rc.id } : c)
      );

      toast({
        title: 'Redação Comentada criada!',
        description: `${blocos.length} blocos gerados. Status: Rascunho. Redirecionando para edição…`,
        className: 'border-green-200 bg-green-50 text-green-900',
      });

      setConversaoOpen(false);
      setConversaoCorrecao(null);

      // Navega para a tela de edição da RC recém-criada
      navigate(`/admin/redacoes-comentadas?editId=${rc.id}`);

    } catch (err: any) {
      toast({ title: 'Erro na conversão', description: err.message, variant: 'destructive' });
    } finally {
      setConverting(false);
    }
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-600" />
                Correções do Jarvis — Histórico Geral
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as redações corrigidas pela IA, de todos os professores.
                Converta correções em Redações Comentadas para uso pedagógico.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Stats */}
          {!loading && correcoes.length > 0 && (
            <div className="flex gap-4 pt-2 flex-wrap">
              <Stat label="Total" value={correcoes.length} color="text-gray-700" />
              <Stat label="Corrigidas" value={totalCorrigidas} color="text-emerald-700" />
              <Stat label="Convertidas em RC" value={totalConvertidas} color="text-violet-700" />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por aluno, tema ou professor…"
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filtroProfessor} onValueChange={setFiltroProfessor}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Professor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os professores</SelectItem>
                {professoresUnicos.map(p => (
                  <SelectItem key={p.email} value={p.email}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroConvertida} onValueChange={setFiltroConvertida}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Convertida?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nao">Não convertidas</SelectItem>
                <SelectItem value="sim">Já convertidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            {filtradas.length} correção(ões) encontrada(s)
          </p>

          {/* Tabela */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nenhuma correção encontrada.
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Professor</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead className="w-24">Data</TableHead>
                    <TableHead className="w-20 text-center">Nota</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-24">Envio</TableHead>
                    <TableHead className="w-28 text-center">Convertida?</TableHead>
                    <TableHead className="w-40 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[130px]">
                          {item.professor_nome ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-gray-800">{item.autor_nome || '—'}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px]">
                        <span className="line-clamp-2">{item.tema}</span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {formatData(item.criado_em)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs font-bold ${notaBadgeClass(item.nota_total)}`}>
                          {formatNota(item.nota_total)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {STATUS_CONFIG[item.status] ? (
                          <Badge className={`text-xs ${STATUS_CONFIG[item.status].className}`}>
                            {STATUS_CONFIG[item.status].label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">{item.status}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.imagem_url ? (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <ImageIcon className="w-3 h-3" /> Manuscrita
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="w-3 h-3" /> Digitada
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.redacao_comentada_id ? (
                          <Badge className="text-xs bg-violet-100 text-violet-700 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sim
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-500 gap-1">
                            <XCircle className="w-3 h-3" /> Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-gray-700"
                            title="Ver correção"
                            onClick={() => abrirDetalhes(item)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {item.status === 'corrigida' && !item.redacao_comentada_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 gap-1 px-2"
                              title="Transformar em Redação Comentada"
                              onClick={() => abrirConversao(item)}
                            >
                              <BookOpen className="w-3 h-3" />
                              Converter
                            </Button>
                          )}

                          {item.redacao_comentada_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 gap-1 px-2"
                              title="Abrir Redação Comentada gerada"
                              onClick={() => navigate(`/admin/redacoes-comentadas?editId=${item.redacao_comentada_id}`)}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Abrir RC
                            </Button>
                          )}
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

      {/* ── Dialog: Detalhes da correção (readonly) ─────────────────────────── */}
      <Dialog open={detalhesOpen} onOpenChange={open => { if (!open) setDetalhesOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg">Detalhes da Correção</DialogTitle>
            {detalhesCorrecao && (
              <DialogDescription className="text-sm">
                <strong>{detalhesCorrecao.tema}</strong> · {detalhesCorrecao.autor_nome}
                {detalhesCorrecao.professor_nome ? ` · Prof. ${detalhesCorrecao.professor_nome}` : ''}
              </DialogDescription>
            )}
          </DialogHeader>
          {detalhesCorrecao && (
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <div className="px-6 pb-6 space-y-4">
                <CorrecaoDetalhesReadonly correcao={detalhesCorrecao} />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Converter para Redação Comentada ────────────────────────── */}
      <Dialog open={conversaoOpen} onOpenChange={open => { if (!open && !converting) setConversaoOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-600" />
              Transformar em Redação Comentada
            </DialogTitle>
            <DialogDescription>
              {conversaoCorrecao && (
                <>
                  <strong>{conversaoCorrecao.tema}</strong>
                  {' · '}{conversaoCorrecao.autor_nome}
                  {conversaoCorrecao.nota_total !== null && ` · Nota: ${conversaoCorrecao.nota_total}/1000`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {conversaoCorrecao && (
            <div className="space-y-4">
              {/* Preview de blocos */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
                <p className="font-medium mb-1">O que será gerado automaticamente:</p>
                <BlocosPreview correcao={conversaoCorrecao} />
              </div>

              {/* Anonimizar */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch checked={anonimizar} onCheckedChange={setAnonimizar} id="anonimizar" />
                <div>
                  <Label htmlFor="anonimizar" className="text-sm font-medium cursor-pointer">
                    Não incluir nome do aluno no título
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Recomendado para uso como material pedagógico público
                  </p>
                </div>
              </div>

              {/* Título */}
              <div>
                <Label className="text-sm font-medium">Título da Redação Comentada *</Label>
                <Input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex.: Redação sobre Tecnologia — 880/1000 pts"
                  className="mt-1"
                />
              </div>

              {/* Eixo Temático */}
              <div>
                <Label className="text-sm font-medium">Eixo Temático <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={eixoTematico}
                  onChange={e => setEixoTematico(e.target.value)}
                  placeholder="Ex.: Tecnologia e Sociedade, Meio Ambiente…"
                  className="mt-1"
                />
              </div>

              {/* Turmas */}
              <div>
                <Label className="text-sm font-medium">Destinatários *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Quais turmas poderão ver esta Redação Comentada.
                </p>
                <div className="space-y-3 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {turmasDinamicas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Alunos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {turmasDinamicas.map(({ valor, label }) => (
                          <label key={`aluno-${valor}`} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={turmasAutorizadas.includes(valor)}
                              onCheckedChange={() => toggleTurma(valor)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {turmasProfessores.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Professores</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {turmasProfessores.map(({ valor, label }) => (
                          <label key={`prof-${valor}`} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={turmasAutorizadas.includes(valor)}
                              onCheckedChange={() => toggleTurma(valor)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Aviso de rascunho */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  A Redação Comentada será criada como <strong>rascunho</strong> (não publicada).
                  Você será redirecionado para revisá-la antes de publicar.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConversaoOpen(false)}
              disabled={converting}
            >
              Cancelar
            </Button>
            <Button
              onClick={executarConversao}
              disabled={converting || !titulo.trim() || turmasAutorizadas.length === 0}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {converting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {converting ? 'Criando…' : 'Criar Redação Comentada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Sub-componente: Stat ─────────────────────────────────────────────────────

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className={`text-sm font-bold ${color}`}>{value}</span>
  </div>
);

// ─── Sub-componente: Preview dos blocos que serão criados ─────────────────────

const TIPO_LABELS: Record<string, string> = {
  texto_original:        'Texto Original',
  versao_lapidada:       'Versão Lapidada',
  competencias_pontuacao:'Competências e Pontuação',
  analise_global:        'Análise Global',
  pontos_melhoria:       'Pontos a Melhorar',
  pontos_fortes:         'Pontos Fortes',
  comentarios_trecho:    'Comentários por Trecho',
};

const BlocosPreview = ({ correcao }: { correcao: JarvisCorrecaoAdmin }) => {
  const blocos = mapearParaBlocos(correcao);
  if (blocos.length === 0) {
    return <p className="text-xs">Nenhum dado disponível para mapeamento automático.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {blocos.map(b => (
        <li key={b.tipo} className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3 h-3 text-violet-500 shrink-0" />
          {TIPO_LABELS[b.tipo] ?? b.tipo}
        </li>
      ))}
    </ul>
  );
};

// ─── Sub-componente: Detalhes readonly da correção ────────────────────────────

const COMPETENCIA_LABELS: Record<string, string> = {
  c1: 'C1 — Norma padrão',
  c2: 'C2 — Compreensão do tema',
  c3: 'C3 — Seleção de argumentos',
  c4: 'C4 — Coesão e coerência',
  c5: 'C5 — Proposta de intervenção',
};

const CorrecaoDetalhesReadonly = ({ correcao }: { correcao: JarvisCorrecaoAdmin }) => {
  const cia = correcao.correcao_ia || {};

  return (
    <div className="space-y-5 text-sm">
      {/* Notas */}
      <div>
        <p className="font-semibold text-gray-700 mb-2">Notas por competência</p>
        <div className="grid grid-cols-5 gap-2">
          {COMPETENCIAS.map(c => {
            const notaKey = `nota_${c}` as keyof JarvisCorrecaoAdmin;
            const nota = correcao[notaKey] as number | null;
            return (
              <div key={c} className="text-center border rounded-lg p-2">
                <p className="text-xs text-muted-foreground">{c.toUpperCase()}</p>
                <p className={`text-lg font-bold ${nota === null ? 'text-gray-400' : nota >= 160 ? 'text-emerald-600' : nota >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                  {nota ?? '—'}
                </p>
              </div>
            );
          })}
        </div>
        {correcao.nota_total !== null && (
          <p className="text-right font-bold text-primary mt-2">Total: {correcao.nota_total}/1000</p>
        )}
      </div>

      {/* Competências – justificativas */}
      {cia.competencias && (
        <div>
          <p className="font-semibold text-gray-700 mb-2">Análise por competência</p>
          <div className="space-y-2">
            {COMPETENCIAS.map(c => {
              const just = cia.competencias[c]?.justificativa;
              if (!just) return null;
              return (
                <div key={c} className="border rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {COMPETENCIA_LABELS[c]}
                  </p>
                  <p className="text-sm text-gray-700">{just}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo geral */}
      {cia.resumo_geral && (
        <div>
          <p className="font-semibold text-gray-700 mb-1">Resumo geral</p>
          <p className="text-gray-600 whitespace-pre-wrap">{cia.resumo_geral}</p>
        </div>
      )}

      {/* Erros */}
      {cia.erros?.length > 0 && (
        <div>
          <p className="font-semibold text-gray-700 mb-2">Erros identificados ({cia.erros.length})</p>
          <div className="space-y-1.5">
            {cia.erros.slice(0, 10).map((e: any) => (
              <div key={e.numero} className="border rounded p-2 text-xs bg-red-50 border-red-100">
                <span className="font-medium text-red-700">#{e.numero} {e.tipo}</span>
                {' — '}{e.descricao}
                {e.trecho_original && (
                  <span className="block italic text-red-600 mt-0.5">"{e.trecho_original}"</span>
                )}
                {e.sugestao && (
                  <span className="block text-emerald-700 mt-0.5">✓ {e.sugestao}</span>
                )}
              </div>
            ))}
            {cia.erros.length > 10 && (
              <p className="text-xs text-muted-foreground">… e mais {cia.erros.length - 10} erros</p>
            )}
          </div>
        </div>
      )}

      {/* Versão lapidada */}
      {cia.versao_lapidada && (
        <div>
          <p className="font-semibold text-gray-700 mb-1">Versão lapidada</p>
          <div className="border rounded-lg p-3 bg-emerald-50 text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto text-xs">
            {cia.versao_lapidada}
          </div>
        </div>
      )}

      {/* Texto original */}
      {(correcao.transcricao_confirmada || correcao.transcricao_ocr_original) && (
        <div>
          <p className="font-semibold text-gray-700 mb-1">Texto original</p>
          <div className="border rounded-lg p-3 bg-amber-50 text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto text-xs">
            {correcao.transcricao_confirmada || correcao.transcricao_ocr_original}
          </div>
        </div>
      )}

      {/* Info adicional */}
      <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
        <span>Enviada: {formatData(correcao.criado_em)}</span>
        {correcao.corrigida_em && <span>Corrigida: {formatData(correcao.corrigida_em)}</span>}
        <span>{correcao.imagem_url ? '📄 Manuscrita' : '⌨️ Digitada'}</span>
      </div>
    </div>
  );
};
