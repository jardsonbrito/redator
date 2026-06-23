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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Eye, EyeOff, Palette, Shield } from "lucide-react";
import { TurmaGestorDialog } from "@/components/admin/TurmaGestorDialog";
import { cn } from "@/lib/utils";

interface TurmaAluno {
  id: string;
  nome: string;
  codigo_acesso: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  logo_url?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_destaque?: string | null;
  gerenciada_por?: "admin" | "externo";
  gestor_corretor_id?: string | null;
  gestor_nome?: string | null;
}

interface BrandingForm {
  logo_url: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
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
  const [gerenciadaPor, setGerenciadaPor] = useState<"admin" | "externo">("admin");
  const [turmaParaDeletar, setTurmaParaDeletar] = useState<TurmaAluno | null>(null);
  const [confirmacaoNome, setConfirmacaoNome] = useState("");
  const [codigosVisiveis, setCodigosVisiveis] = useState<Set<string>>(new Set());

  // Área de convite
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>("");
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [alunosNaTurma, setAlunosNaTurma] = useState<number | null>(null);
  const [verificandoAlunos, setVerificandoAlunos] = useState(false);
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  // Gestor
  const [turmaParaGestor, setTurmaParaGestor] = useState<TurmaAluno | null>(null);

  // Branding por turma
  const [turmaParaBranding, setTurmaParaBranding] = useState<TurmaAluno | null>(null);
  const [salvandoBranding, setSalvandoBranding] = useState(false);
  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
    logo_url: '', cor_primaria: '', cor_secundaria: '', cor_destaque: '',
  });

  const { toast } = useToast();

  const fetchTurmas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("turmas_alunos")
      .select("id, nome, codigo_acesso, descricao, ativo, criado_em, logo_url, cor_primaria, cor_secundaria, cor_destaque, gerenciada_por, gestor_corretor_id, gestor:corretores!gestor_corretor_id(nome_completo)")
      .order("criado_em", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar as turmas.", variant: "destructive" });
    } else {
      const resultado = (data || []).map((t: any) => ({
        ...t,
        gestor_nome: t.gestor?.nome_completo ?? null,
        gestor: undefined,
      }));
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
      .insert({ nome: nome.trim(), codigo_acesso: gerarCodigo(), descricao: descricao.trim() || null, gerenciada_por: gerenciadaPor });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar a turma.", variant: "destructive" });
    } else {
      toast({ title: "Turma criada", description: `"${nome.trim()}" criada com sucesso.` });
      setNome("");
      setDescricao("");
      setGerenciadaPor("admin");
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
    if (confirmacaoNome.trim() !== turmaParaDeletar.nome) return;
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
    setConfirmacaoNome("");
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
      setEmailDestinatario("");
    }
    setGerandoConvite(false);
  };

  const handleAbrirBranding = (turma: TurmaAluno) => {
    setBrandingForm({
      logo_url: turma.logo_url ?? '',
      cor_primaria: turma.cor_primaria ?? '',
      cor_secundaria: turma.cor_secundaria ?? '',
      cor_destaque: turma.cor_destaque ?? '',
    });
    setTurmaParaBranding(turma);
  };

  const handleSalvarBranding = async () => {
    if (!turmaParaBranding) return;
    setSalvandoBranding(true);
    const { error } = await supabase
      .from('turmas_alunos')
      .update({
        logo_url: brandingForm.logo_url || null,
        cor_primaria: brandingForm.cor_primaria || null,
        cor_secundaria: brandingForm.cor_secundaria || null,
        cor_destaque: brandingForm.cor_destaque || null,
      })
      .eq('id', turmaParaBranding.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Identidade visual salva!' });
      setTurmaParaBranding(null);
      fetchTurmas();
    }
    setSalvandoBranding(false);
  };

  const handleAbrirDeleteTurma = async (turma: TurmaAluno) => {
    setVerificandoAlunos(true);
    setAlunosNaTurma(null);
    setConfirmacaoNome("");
    setTurmaParaDeletar(turma);
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", turma.id);
    setAlunosNaTurma(count ?? 0);
    setVerificandoAlunos(false);
  };

  const handleToggleGestao = async (turma: TurmaAluno) => {
    const novoValor = turma.gerenciada_por === "externo" ? "admin" : "externo";
    const { error } = await supabase
      .from("turmas_alunos")
      .update({ gerenciada_por: novoValor })
      .eq("id", turma.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível alterar a gestão.", variant: "destructive" });
    } else {
      fetchTurmas();
    }
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

          {/* Tipo de gestão */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Gestão da turma</Label>
            <div className="flex gap-3">
              <label className={cn(
                "flex-1 flex items-center gap-3 rounded-xl border-2 cursor-pointer px-3 py-2.5 transition-colors",
                gerenciadaPor === "admin"
                  ? "border-purple-600 bg-purple-50"
                  : "border-purple-100 bg-white hover:border-purple-300"
              )}>
                <input
                  type="radio"
                  name="gerenciada_por"
                  value="admin"
                  checked={gerenciadaPor === "admin"}
                  onChange={() => setGerenciadaPor("admin")}
                  className="accent-purple-700"
                />
                <span className="text-sm font-semibold text-slate-800">Admin</span>
              </label>
              <label className={cn(
                "flex-1 flex items-center gap-3 rounded-xl border-2 cursor-pointer px-3 py-2.5 transition-colors",
                gerenciadaPor === "externo"
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-purple-100 bg-white hover:border-purple-300"
              )}>
                <input
                  type="radio"
                  name="gerenciada_por"
                  value="externo"
                  checked={gerenciadaPor === "externo"}
                  onChange={() => setGerenciadaPor("externo")}
                  className="accent-emerald-600"
                />
                <span className="text-sm font-semibold text-slate-800">Corretor (externo)</span>
              </label>
            </div>
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
                      <th className="px-4 py-4 font-semibold">Gestão</th>
                      <th className="px-4 py-4 font-semibold">Gestor</th>
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
                          <button
                            type="button"
                            onClick={() => handleToggleGestao(turma)}
                            title="Clique para alternar"
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                              turma.gerenciada_por === "externo"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            )}
                          >
                            {turma.gerenciada_por === "externo" ? "Corretor" : "Admin"}
                          </button>
                        </td>
                        <td className="px-4 py-5">
                          {turma.gerenciada_por === "externo" ? (
                            turma.gestor_nome ? (
                              <span className="text-xs font-medium text-emerald-700">
                                {turma.gestor_nome}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 font-semibold">
                                ⚠ Sem gestor
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
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
                            {turma.gerenciada_por === "externo" && (
                              <button
                                type="button"
                                onClick={() => setTurmaParaGestor(turma)}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              >
                                <Shield className="w-3 h-3" />
                                Gestor
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAbrirBranding(turma)}
                              className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                            >
                              <Palette className="w-3 h-3" />
                              Visual
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirDeleteTurma(turma)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Deletar
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
                  <p className="text-xs text-muted-foreground">
                    O aluno preencherá o próprio nome ao acessar o link de convite.
                  </p>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
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

      {/* Dialog de gestor da turma */}
      {turmaParaGestor && (
        <TurmaGestorDialog
          open={!!turmaParaGestor}
          onOpenChange={(open) => { if (!open) setTurmaParaGestor(null); }}
          turmaId={turmaParaGestor.id}
          turmaNome={turmaParaGestor.nome}
          gestorAtualId={turmaParaGestor.gestor_corretor_id ?? null}
          onSuccess={fetchTurmas}
        />
      )}

      {/* Dialog de identidade visual */}
      <Dialog open={!!turmaParaBranding} onOpenChange={(o) => { if (!o) setTurmaParaBranding(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              Identidade visual — {turmaParaBranding?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar o visual padrão do App do Redator.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Logo (URL da imagem)</Label>
              <Input
                placeholder="https://..."
                value={brandingForm.logo_url}
                onChange={e => setBrandingForm(f => ({ ...f, logo_url: e.target.value }))}
              />
              {brandingForm.logo_url && (
                <img src={brandingForm.logo_url} alt="preview" className="h-10 w-auto rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cor principal</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.cor_primaria || '#3F0077'}
                    onChange={e => setBrandingForm(f => ({ ...f, cor_primaria: e.target.value }))}
                    className="h-9 w-9 rounded cursor-pointer border"
                  />
                  <Input
                    className="text-xs h-9"
                    value={brandingForm.cor_primaria}
                    onChange={e => setBrandingForm(f => ({ ...f, cor_primaria: e.target.value }))}
                    placeholder="#3F0077"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cor secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.cor_secundaria || '#662F96'}
                    onChange={e => setBrandingForm(f => ({ ...f, cor_secundaria: e.target.value }))}
                    className="h-9 w-9 rounded cursor-pointer border"
                  />
                  <Input
                    className="text-xs h-9"
                    value={brandingForm.cor_secundaria}
                    onChange={e => setBrandingForm(f => ({ ...f, cor_secundaria: e.target.value }))}
                    placeholder="#662F96"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Destaque / botões</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.cor_destaque || '#9B59B6'}
                    onChange={e => setBrandingForm(f => ({ ...f, cor_destaque: e.target.value }))}
                    className="h-9 w-9 rounded cursor-pointer border"
                  />
                  <Input
                    className="text-xs h-9"
                    value={brandingForm.cor_destaque}
                    onChange={e => setBrandingForm(f => ({ ...f, cor_destaque: e.target.value }))}
                    placeholder="#9B59B6"
                  />
                </div>
              </div>
            </div>
            {(brandingForm.cor_primaria || brandingForm.cor_secundaria || brandingForm.cor_destaque) && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setBrandingForm({ logo_url: '', cor_primaria: '', cor_secundaria: '', cor_destaque: '' })}
              >
                Limpar branding (voltar ao padrão)
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTurmaParaBranding(null)} disabled={salvandoBranding}>Cancelar</Button>
            <Button onClick={handleSalvarBranding} disabled={salvandoBranding}>
              {salvandoBranding ? 'Salvando...' : 'Salvar visual'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão com verificação de alunos */}
      <AlertDialog
        open={!!turmaParaDeletar}
        onOpenChange={(open) => { if (!open) { setTurmaParaDeletar(null); setConfirmacaoNome(""); setAlunosNaTurma(null); } }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Deletar turma — ação irreversível</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar{" "}
              <strong className="text-slate-900">"{turmaParaDeletar?.nome}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {verificandoAlunos ? (
            <p className="text-sm text-muted-foreground py-2">Verificando alunos vinculados...</p>
          ) : alunosNaTurma !== null && alunosNaTurma > 0 ? (
            <div className="space-y-3 px-1">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">
                  Esta turma possui <strong>{alunosNaTurma}</strong> {alunosNaTurma === 1 ? "aluno vinculado" : "alunos vinculados"}.
                </p>
                <p>Migre ou remova os alunos desta turma antes de deletá-la. A exclusão direta de turmas com alunos não é permitida para evitar perda de dados.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-1 text-sm text-slate-700">
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Todos os convites pendentes desta turma serão removidos</li>
                <li>O código de acesso deixará de funcionar</li>
                <li>Filtros e relatórios baseados nessa turma serão afetados</li>
              </ul>
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="font-semibold text-red-800 mb-1.5">
                  Para confirmar, digite o nome exato da turma:
                </p>
                <code className="block text-xs text-red-700 mb-2">{turmaParaDeletar?.nome}</code>
                <Input
                  value={confirmacaoNome}
                  onChange={(e) => setConfirmacaoNome(e.target.value)}
                  placeholder="Digite o nome da turma..."
                  className="border-red-300 focus-visible:ring-red-300 bg-white"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmacaoNome(""); setAlunosNaTurma(null); }}>
              {alunosNaTurma && alunosNaTurma > 0 ? "Entendido" : "Cancelar"}
            </AlertDialogCancel>
            {(!alunosNaTurma || alunosNaTurma === 0) && !verificandoAlunos && (
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={confirmacaoNome.trim() !== turmaParaDeletar?.nome}
                onClick={handleDeletarTurma}
              >
                Deletar permanentemente
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
