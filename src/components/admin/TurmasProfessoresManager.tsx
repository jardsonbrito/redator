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
import { Copy, Eye, EyeOff, Link as LinkIcon, Plus, Power, PowerOff, Ticket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface TurmaProfessor {
  id: string;
  nome: string;
  codigo_acesso: string;
  ativo: boolean;
  criado_em: string;
}

interface Convite {
  id: string;
  codigo: string;
  email_destinatario: string | null;
  usado: boolean;
  criado_em: string;
}

const gerarCodigo = () =>
  (Math.random().toString(36).substring(2, 8) +
   Math.random().toString(36).substring(2, 8))
    .toUpperCase();

export const TurmasProfessoresManager = () => {
  const [turmas, setTurmas] = useState<TurmaProfessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [codigosVisiveis, setCodigosVisiveis] = useState<Set<string>>(new Set());

  // Estado do dialog de convite
  const [turmaConvite, setTurmaConvite] = useState<TurmaProfessor | null>(null);
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [conviteGerado, setConviteGerado] = useState<string | null>(null);
  const [convitesPendentes, setConvitesPendentes] = useState<Convite[]>([]);
  const [carregandoConvites, setCarregandoConvites] = useState(false);

  const { toast } = useToast();

  const fetchTurmas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("turmas_professores")
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

  // Carrega convites pendentes quando abre o dialog
  const abrirDialogConvite = async (turma: TurmaProfessor) => {
    setTurmaConvite(turma);
    setEmailDestinatario("");
    setConviteGerado(null);
    setCarregandoConvites(true);

    const { data } = await supabase
      .from("convites_professores")
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
      .from("turmas_professores")
      .insert({ nome: nome.trim(), codigo_acesso: gerarCodigo() });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar a turma.", variant: "destructive" });
    } else {
      toast({ title: "Turma criada", description: `"${nome.trim()}" criada com sucesso.` });
      setNome("");
      fetchTurmas();
    }
    setCriando(false);
  };

  const handleToggleAtivo = async (turma: TurmaProfessor) => {
    const { error } = await supabase
      .from("turmas_professores")
      .update({ ativo: !turma.ativo })
      .eq("id", turma.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
    } else {
      toast({ title: "Status atualizado", description: `Turma ${!turma.ativo ? "ativada" : "inativada"}.` });
      fetchTurmas();
    }
  };

  const handleGerarConvite = async () => {
    if (!turmaConvite) return;
    setGerandoConvite(true);

    const codigo = gerarCodigo();
    const { error } = await supabase
      .from("convites_professores")
      .insert({
        codigo,
        turma_id: turmaConvite.id,
        email_destinatario: emailDestinatario.trim() || null,
      });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível gerar o convite.", variant: "destructive" });
    } else {
      setConviteGerado(codigo);
      setEmailDestinatario("");
      // Recarrega lista de pendentes
      const { data } = await supabase
        .from("convites_professores")
        .select("*")
        .eq("turma_id", turmaConvite.id)
        .eq("usado", false)
        .order("criado_em", { ascending: false });
      setConvitesPendentes(data || []);
    }
    setGerandoConvite(false);
  };

  const linkConvite = (codigo: string) =>
    `${window.location.origin}/professor/entrar?convite=${codigo}`;

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
            Nova Turma de Professores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCriarTurma} className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="nome-turma">Nome da turma</Label>
              <Input
                id="nome-turma"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Turma A — Manhã 2026"
              />
            </div>
            <Button type="submit" disabled={criando}>
              {criando ? "Criando..." : "Criar turma"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de turmas */}
      <Card>
        <CardHeader>
          <CardTitle>Turmas cadastradas ({turmas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-6">Carregando...</p>
          ) : turmas.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma turma cadastrada ainda.</p>
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
                      <TableCell className="font-medium">{turma.nome}</TableCell>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirDialogConvite(turma)}
                            title="Gerar convite individual"
                          >
                            <Ticket className="w-4 h-4 mr-1" />
                            Gerar convite
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAtivo(turma)}
                            title={turma.ativo ? "Inativar turma" : "Ativar turma"}
                          >
                            {turma.ativo
                              ? <PowerOff className="w-4 h-4 text-red-500" />
                              : <Power className="w-4 h-4 text-green-500" />}
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
              <Label>E-mail do destinatário <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailDestinatario}
                  onChange={(e) => setEmailDestinatario(e.target.value)}
                  placeholder="professor@email.com"
                />
                <Button onClick={handleGerarConvite} disabled={gerandoConvite}>
                  {gerandoConvite ? "Gerando..." : "Gerar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Se informado, somente esse e-mail poderá usar o convite.
              </p>
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
                      <div>
                        <span className="font-mono text-xs">{c.codigo}</span>
                        {c.email_destinatario && (
                          <span className="ml-2 text-xs text-muted-foreground">→ {c.email_destinatario}</span>
                        )}
                        <span className="ml-2 text-xs text-muted-foreground">{formatarData(c.criado_em)}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
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
