import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface TurmaAluno {
  id: string;
  nome: string;
  codigo_acesso: string;
  descricao: string | null;
  ativo: boolean;
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
  const [turmaParaDeletar, setTurmaParaDeletar] = useState<TurmaAluno | null>(null);
  const [codigosVisiveis, setCodigosVisiveis] = useState<Set<string>>(new Set());

  // Área de convite
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>("");
  const [nomeDestinatario, setNomeDestinatario] = useState("");
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

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
      const resultado = data || [];
      setTurmas(resultado);
      if (resultado.length > 0 && !turmaSelecionadaId) {
        setTurmaSelecionadaId(resultado.find(t => t.ativo)?.id || resultado[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchTurmas(); }, []);

  const handleCriarTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o nome da turma.", variant: "destructive" });
      return;
    }
    setCriando(true);
    const { error } = await supabase
      .from("turmas_alunos")
      .insert({ nome: nome.trim(), codigo_acesso: gerarCodigo(), descricao: descricao.trim() || null });
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
    if (!turmaSelecionadaId) {
      toast({ title: "Selecione uma turma", variant: "destructive" });
      return;
    }
    if (!emailDestinatario.trim()) {
      toast({ title: "Informe o e-mail do aluno", variant: "destructive" });
      return;
    }
    setGerandoConvite(true);
    setLinkGerado(null);
    const codigo = gerarCodigo();
    const { error } = await supabase
      .from("convites_alunos")
      .insert({ codigo, turma_id: turmaSelecionadaId, email_destinatario: emailDestinatario.trim(), expira_em: null });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível gerar o convite.", variant: "destructive" });
    } else {
      const link = `${window.location.origin}/aluno/entrar?convite=${codigo}`;
      setLinkGerado(link);
      navigator.clipboard.writeText(link).catch(() => {});
      toast({ title: "Convite gerado!", description: "Link copiado para a área de transferência." });
      setNomeDestinatario("");
      setEmailDestinatario("");
    }
    setGerandoConvite(false);
  };

  const toggleCodigoVisivel = (id: string) => {
    setCodigosVisiveis(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => toast({ title: "Link copiado!" })).catch(() => {});
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">

      {/* ESQUERDA — Nova Turma */}
      <article className="rounded-xl border border-purple-200 bg-white shadow-sm">
        <div className="border-b border-purple-100 px-6 py-5">
          <h1 className="text-2xl font-bold">Nova Turma</h1>
        </div>
        <form onSubmit={handleCriarTurma} className="space-y-4 px-6 py-5">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Nome da turma</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border-purple-200 focus-visible:ring-purple-200"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">
              Descrição <span className="font-normal text-slate-500">opcional</span>
            </Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="border-purple-200 focus-visible:ring-purple-200"
            />
          </div>
          <Button
            type="submit"
            disabled={criando}
            className="w-full bg-purple-950 hover:bg-purple-800 font-bold py-6"
          >
            {criando ? "Criando..." : "Criar turma"}
          </Button>
        </form>
      </article>

      {/* DIREITA — Lista de turmas + área de convite */}
      <article className="rounded-xl border border-purple-200 bg-white shadow-sm">
        <div className="border-b border-purple-100 px-6 py-5">
          <h2 className="text-2xl font-bold">Turmas de alunos ({turmas.length})</h2>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : turmas.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-purple-200 text-left text-purple-900/80">
                      <th className="px-4 py-4 font-semibold">Nome</th>
                      <th className="px-4 py-4 font-semibold">Código da turma</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                      <th className="px-4 py-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((turma) => (
                      <tr key={turma.id} className="border-b border-purple-100 last:border-0">
                        <td className="px-4 py-5 font-semibold">
                          {turma.nome}
                          {turma.descricao && (
                            <div className="text-xs font-normal text-muted-foreground mt-0.5">{turma.descricao}</div>
                          )}
                        </td>
                        <td className="px-4 py-5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="tracking-widest text-sm">
                              {codigosVisiveis.has(turma.id) ? turma.codigo_acesso : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCodigoVisivel(turma.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={codigosVisiveis.has(turma.id) ? "Ocultar" : "Ver código"}
                            >
                              {codigosVisiveis.has(turma.id)
                                ? <EyeOff className="w-3.5 h-3.5" />
                                : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className={cn(
                            "rounded-full px-3 py-1 text-xs font-bold text-white",
                            turma.ativo ? "bg-purple-950" : "bg-slate-400"
                          )}>
                            {turma.ativo ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAtivo(turma)}
                              className="rounded-md border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-purple-950 hover:bg-purple-50 transition-colors"
                            >
                              {turma.ativo ? "Inativar turma" : "Ativar turma"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTurmaParaDeletar(turma)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Deletar turma
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Área de convite */}
              <section className="mt-6 rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-5">
                <h3 className="text-lg font-bold">Adicionar aluno à turma</h3>
                <div className="mt-4 space-y-3">
                  {turmas.filter(t => t.ativo).length > 1 && (
                    <div>
                      <Label className="mb-1.5 block text-sm font-semibold">Turma</Label>
                      <Select value={turmaSelecionadaId} onValueChange={setTurmaSelecionadaId}>
                        <SelectTrigger className="border-purple-200">
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent>
                          {turmas.filter(t => t.ativo).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <Input
                      placeholder="Nome do aluno"
                      value={nomeDestinatario}
                      onChange={(e) => setNomeDestinatario(e.target.value)}
                      className="border-purple-200 focus-visible:ring-purple-200"
                    />
                    <Input
                      type="email"
                      placeholder="E-mail do aluno"
                      value={emailDestinatario}
                      onChange={(e) => setEmailDestinatario(e.target.value)}
                      className="border-purple-200 focus-visible:ring-purple-200"
                    />
                    <Button
                      onClick={handleGerarConvite}
                      disabled={gerandoConvite}
                      className="bg-purple-950 hover:bg-purple-800 font-bold"
                    >
                      {gerandoConvite ? "Gerando..." : "Gerar convite"}
                    </Button>
                  </div>
                  {linkGerado && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                      <code className="flex-1 truncate text-xs text-green-900">{linkGerado}</code>
                      <button
                        type="button"
                        onClick={() => copiarLink(linkGerado)}
                        className="shrink-0 text-green-700 hover:text-green-900 transition-colors"
                        title="Copiar link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </article>

      {/* Confirmação de exclusão */}
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
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeletarTurma}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
