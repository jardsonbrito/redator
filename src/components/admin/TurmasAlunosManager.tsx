import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Copy, Eye, EyeOff, Link as LinkIcon, MoreHorizontal, Plus,
  Power, PowerOff, Ticket, Trash2, CalendarClock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface TurmaAluno {
  id: string;
  nome: string;
  codigo_acesso: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
}

interface Convite {
  id: string;
  codigo: string;
  email_destinatario: string | null;
  expira_em: string | null;
  usado: boolean;
  criado_em: string;
}

const gerarCodigo = () =>
  (Math.random().toString(36).substring(2, 8) +
   Math.random().toString(36).substring(2, 8))
    .toUpperCase();

export const TurmasAlunosManager = () => {
  const [turmas, setTurmas] = useState<TurmaAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [turmaParaDeletar, setTurmaParaDeletar] = useState<TurmaAluno | null>(null);
  const [codigosVisiveis, setCodigosVisiveis] = useState<Set<string>>(new Set());

  // Estado do dialog de convite
  const [turmaConvite, setTurmaConvite] = useState<TurmaAluno | null>(null);
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [dataExpiracao, setDataExpiracao] = useState("");
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [conviteGerado, setConviteGerado] = useState<string | null>(null);
  const [convitesPendentes, setConvitesPendentes] = useState<Convite[]>([]);
  const [carregandoConvites, setCarregandoConvites] = useState(false);

  const { toast } = useToast();

  const fetchTurmas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("turmas_alunos")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar as turmas.", variant: "destructive" });
    } else {
      setTurmas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTurmas(); }, []);

  const abrirDialogConvite = async (turma: TurmaAluno) => {
    setTurmaConvite(turma);
    setEmailDestinatario("");
    setDataExpiracao("");
    setConviteGerado(null);
    setCarregandoConvites(true);

    const { data } = await supabase
      .from("convites_alunos")
      .select("*")
      .eq("turma_id", turma.id)
      .eq("usado", false)
      .order("criado_em", { ascending: false });

    setConvitesPendentes(data || []);
    setCarregandoConvites(false);
  };

  const handleCriarTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o nome da turma.", variant: "destructive" });
      return;
    }

    setCriando(true);
    const { error } = await supabase
      .from("turmas_alunos")
      .insert({
        nome: nome.trim(),
        codigo_acesso: gerarCodigo(),
        descricao: descricao.trim() || null,
      });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar a turma.", variant: "destructive" });
    } else {
      toast({ title: "Turma criada", description: `"${nome.trim()}" criada com sucesso.` });
      setNome("");
      setDescricao("");
      fetchTurmas();
    }
    setCriando(false);
  };

  const handleToggleAtivo = async (turma: TurmaAluno) => {
    const { error } = await supabase
      .from("turmas_alunos")
      .update({ ativo: !turma.ativo })
      .eq("id", turma.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
    } else {
      toast({ title: "Status atualizado", description: `Turma ${!turma.ativo ? "ativada" : "inativada"}.` });
      fetchTurmas();
    }
  };

  const handleDeletarTurma = async () => {
    if (!turmaParaDeletar) return;

    const { error } = await supabase
      .from("turmas_alunos")
      .delete()
      .eq("id", turmaParaDeletar.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível deletar a turma.", variant: "destructive" });
    } else {
      toast({ title: "Turma deletada", description: `"${turmaParaDeletar.nome}" foi removida.` });
      fetchTurmas();
    }
    setTurmaParaDeletar(null);
  };

  const handleGerarConvite = async () => {
    if (!turmaConvite) return;
    setGerandoConvite(true);

    const codigo = gerarCodigo();
    const { error } = await supabase
      .from("convites_alunos")
      .insert({
        codigo,
        turma_id: turmaConvite.id,
        email_destinatario: emailDestinatario.trim() || null,
        expira_em: dataExpiracao ? new Date(dataExpiracao).toISOString() : null,
      });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível gerar o convite.", variant: "destructive" });
    } else {
      setConviteGerado(codigo);
      setEmailDestinatario("");
      setDataExpiracao("");
      const { data } = await supabase
        .from("convites_alunos")
        .select("*")
        .eq("turma_id", turmaConvite.id)
        .eq("usado", false)
        .order("criado_em", { ascending: false });
      setConvitesPendentes(data || []);
    }
    setGerandoConvite(false);
  };

  const linkConvite = (codigo: string) =>
    `${window.location.origin}/aluno/entrar?convite=${codigo}`;

  const copiarLink = (codigo: string) => {
    navigator.clipboard.writeText(linkConvite(codigo));
    toast({ title: "Link copiado!", description: "Link de convite copiado para a área de transferência." });
  };

  const toggleCodigoVisivel = (id: string) => {
    setCodigosVisiveis(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatarData = (str: string) =>
    format(new Date(str), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Formulário de criação de turma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nova Turma de Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCriarTurma} className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="nome-turma">Nome da turma</Label>
                <Input
                  id="nome-turma"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Turma Piloto 2026"
                />
              </div>
              <Button type="submit" disabled={criando}>
                {criando ? "Criando..." : "Criar turma"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao-turma">
                Descrição <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                id="descricao-turma"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Turma de alunos do período da manhã"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de turmas */}
      <Card>
        <CardHeader>
          <CardTitle>Turmas de alunos ({turmas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-6">Carregando...</p>
          ) : turmas.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma turma de alunos cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código da turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmas.map((turma) => (
                    <TableRow key={turma.id}>
                      <TableCell className="font-medium">
                        <div>{turma.nome}</div>
                        {turma.descricao && (
                          <div className="text-xs text-muted-foreground">{turma.descricao}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <span>
                            {codigosVisiveis.has(turma.id) ? turma.codigo_acesso : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleCodigoVisivel(turma.id)}
                            title={codigosVisiveis.has(turma.id) ? "Ocultar" : "Ver código"}
                          >
                            {codigosVisiveis.has(turma.id)
                              ? <EyeOff className="w-3 h-3" />
                              : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={turma.ativo ? "default" : "secondary"}>
                          {turma.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu
                          open={openDropdownId === turma.id}
                          onOpenChange={(open) => setOpenDropdownId(open ? turma.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setOpenDropdownId(null);
                              setTimeout(() => abrirDialogConvite(turma), 100);
                            }}>
                              <Ticket className="mr-2 h-4 w-4" />
                              Gerar convite
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setOpenDropdownId(null);
                              handleToggleAtivo(turma);
                            }}>
                              {turma.ativo ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4 text-red-500" />
                                  Inativar turma
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4 text-green-500" />
                                  Ativar turma
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => {
                                setOpenDropdownId(null);
                                setTimeout(() => setTurmaParaDeletar(turma), 100);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar turma
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!turmaParaDeletar} onOpenChange={(open) => !open && setTurmaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar turma</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a turma <strong>"{turmaParaDeletar?.nome}"</strong>?
              Os convites pendentes serão removidos automaticamente. Alunos já cadastrados mantêm seu acesso.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeletarTurma}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de convite */}
      <Dialog open={!!turmaConvite} onOpenChange={(open) => !open && setTurmaConvite(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Convites — {turmaConvite?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Gerar novo convite */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>E-mail do destinatário <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  type="email"
                  value={emailDestinatario}
                  onChange={(e) => setEmailDestinatario(e.target.value)}
                  placeholder="aluno@email.com"
                />
                <p className="text-xs text-muted-foreground">
                  Se informado, somente esse e-mail poderá usar o convite.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Data de expiração <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={dataExpiracao}
                  onChange={(e) => setDataExpiracao(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se informada, o convite expira automaticamente nessa data.
                </p>
              </div>

              <Button onClick={handleGerarConvite} disabled={gerandoConvite} className="w-full">
                {gerandoConvite ? "Gerando..." : "Gerar convite"}
              </Button>
            </div>

            {/* Link gerado */}
            {conviteGerado && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">Convite gerado com sucesso!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border rounded px-2 py-1 truncate">
                    {linkConvite(conviteGerado)}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copiarLink(conviteGerado)}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                </div>
              </div>
            )}

            {/* Convites pendentes */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Convites pendentes (não utilizados)</p>
              {carregandoConvites ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : convitesPendentes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum convite pendente.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {convitesPendentes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-mono text-xs">{c.codigo}</span>
                        {c.email_destinatario && (
                          <span className="ml-2 text-xs text-muted-foreground">→ {c.email_destinatario}</span>
                        )}
                        {c.expira_em && (
                          <span className="ml-2 text-xs text-orange-500">
                            expira {formatarData(c.expira_em)}
                          </span>
                        )}
                        <span className="ml-2 text-xs text-muted-foreground">{formatarData(c.criado_em)}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copiarLink(c.codigo)}
                        title="Copiar link"
                      >
                        <LinkIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
