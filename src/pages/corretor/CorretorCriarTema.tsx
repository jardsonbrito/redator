import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Send, Plus, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const EIXOS = [
  "Educação", "Saúde", "Meio Ambiente", "Cidadania e Democracia",
  "Violência", "Tecnologia", "Cultura e Arte", "Economia", "Ciência",
  "Direitos Humanos",
];

// ── TextBlock definido FORA do componente para evitar desmontagem a cada render ──
interface TextBlockProps {
  n: 1 | 2 | 3 | 4 | 5;
  label: string;
  required?: boolean;
  content: string;
  fonte: string;
  imgUrl: string;
  onChangeContent: (value: string) => void;
  onChangeFonte: (value: string) => void;
  onChangeImg: (value: string) => void;
}

const TextBlock = ({
  n, label, required, content, fonte, imgUrl,
  onChangeContent, onChangeFonte, onChangeImg,
}: TextBlockProps) => (
  <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-3">
    <p className="text-sm font-semibold text-slate-700">
      {label} {required && <span className="text-red-500">*</span>}
    </p>

    {/* Conteúdo */}
    <div>
      <Label className="text-xs text-slate-500 mb-1 block">
        Conteúdo {required && <span className="text-red-500">*</span>}
      </Label>
      <Textarea
        value={content}
        onChange={e => onChangeContent(e.target.value)}
        placeholder={`Digite o conteúdo do ${label.toLowerCase()}...`}
        className="min-h-[120px] resize-y text-sm"
      />
    </div>

    {/* Fonte */}
    <div>
      <Label className="text-xs text-slate-500 mb-1 block">Fonte / Referência</Label>
      <Input
        value={fonte}
        onChange={e => onChangeFonte(e.target.value)}
        placeholder="Ex.: IBGE, 2023."
        className="text-sm"
      />
    </div>

    {/* URL da imagem */}
    <div>
      <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
        <ImageIcon className="w-3 h-3" /> URL da imagem (opcional)
      </Label>
      <Input
        value={imgUrl}
        onChange={e => onChangeImg(e.target.value)}
        placeholder="https://..."
        className="text-sm mt-1"
      />
      {imgUrl && (
        <div className="mt-2">
          <img
            src={imgUrl}
            alt={`Preview Texto ${n}`}
            className="max-h-52 w-auto rounded-xl border border-slate-200 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            onLoad={e => { (e.target as HTMLImageElement).style.display = ""; }}
          />
        </div>
      )}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────

const FORM_DEFAULTS = {
  frase_tematica: "",
  eixo_tematico: "",
  texto_1: "", texto_1_fonte: "", motivator1_url: "",
  texto_2: "", texto_2_fonte: "", motivator2_url: "",
  texto_3: "", texto_3_fonte: "", motivator3_url: "",
  texto_4: "", texto_4_fonte: "", motivator4_url: "",
  texto_5: "", texto_5_fonte: "", motivator5_url: "",
};
type FormKey = keyof typeof FORM_DEFAULTS;

const CorretorCriarTema = () => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, loading: loadingPerm } = useCorretorPermissoes();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [turmasCorretor, setTurmasCorretor] = useState<string[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [novoEixo, setNovoEixo] = useState("");
  const [form, setForm] = useState({ ...FORM_DEFAULTS });

  useEffect(() => {
    if (!corretor?.email) return;
    supabase
      .from("corretores")
      .select("turmas_autorizadas")
      .eq("email", corretor.email.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        setTurmasCorretor((data?.turmas_autorizadas as string[]) ?? []);
        setLoadingTurmas(false);
      });
  }, [corretor?.email]);

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor/temas" replace />;

  const set = (field: FormKey, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const isCustomEixo = form.eixo_tematico && !EIXOS.includes(form.eixo_tematico);

  const handleAdicionarEixo = () => {
    if (!novoEixo.trim()) return;
    set("eixo_tematico", novoEixo.trim());
    setNovoEixo("");
  };

  const handleSave = async () => {
    if (!form.frase_tematica.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha a frase temática.", variant: "destructive" });
      return;
    }
    if (!form.eixo_tematico.trim()) {
      toast({ title: "Campo obrigatório", description: "Selecione ou adicione o eixo temático.", variant: "destructive" });
      return;
    }
    if (!form.texto_1.trim()) {
      toast({ title: "Campo obrigatório", description: "O Texto I é obrigatório.", variant: "destructive" });
      return;
    }
    if (turmasCorretor.length === 0) {
      toast({ title: "Sem turmas autorizadas", description: "Contate o administrador antes de criar temas.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("criar_tema_corretor", {
        p_corretor_email:  corretor.email,
        p_frase_tematica:  form.frase_tematica.trim(),
        p_eixo_tematico:   form.eixo_tematico.trim(),
        p_texto_1:         form.texto_1.trim()        || null,
        p_texto_1_fonte:   form.texto_1_fonte.trim()  || null,
        p_motivator1_url:  form.motivator1_url.trim() || null,
        p_texto_2:         form.texto_2.trim()        || null,
        p_texto_2_fonte:   form.texto_2_fonte.trim()  || null,
        p_motivator2_url:  form.motivator2_url.trim() || null,
        p_texto_3:         form.texto_3.trim()        || null,
        p_texto_3_fonte:   form.texto_3_fonte.trim()  || null,
        p_motivator3_url:  form.motivator3_url.trim() || null,
        p_texto_4:         form.texto_4.trim()        || null,
        p_texto_4_fonte:   form.texto_4_fonte.trim()  || null,
        p_motivator4_url:  form.motivator4_url.trim() || null,
        p_texto_5:         form.texto_5.trim()        || null,
        p_texto_5_fonte:   form.texto_5_fonte.trim()  || null,
        p_motivator5_url:  form.motivator5_url.trim() || null,
      });

      if (error) throw error;

      toast({ title: "Tema publicado!", description: "Disponibilizado para suas turmas com sucesso." });
      await queryClient.invalidateQueries({ queryKey: ['temas-corretor'] });
      navigate("/corretor/temas");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar tema.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CorretorLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Biblioteca</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Novo Tema</h1>
            </div>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1.5"
              onClick={() => navigate("/corretor/temas")}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </div>
        </div>

        {/* Aviso */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          Este tema será disponibilizado <strong>apenas para as turmas vinculadas ao seu perfil</strong>.
        </div>

        {/* Turmas informativas */}
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-2">Turmas autorizadas</p>
          {loadingTurmas ? (
            <p className="text-xs text-slate-400">Carregando...</p>
          ) : turmasCorretor.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {turmasCorretor.map(t => (
                <Badge key={t} variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{t}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-600 font-medium">
              Nenhuma turma autorizada. Contate o administrador.
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">O tema será publicado automaticamente para estas turmas.</p>
        </div>

        {/* Identificação */}
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-700">Identificação do tema</p>

          <div>
            <Label>Frase temática <span className="text-red-500">*</span></Label>
            <Input
              value={form.frase_tematica}
              onChange={e => set("frase_tematica", e.target.value)}
              placeholder="Ex.: Os desafios da educação inclusiva no Brasil"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Eixo temático <span className="text-red-500">*</span></Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EIXOS.map(e => (
                <button key={e} type="button"
                  onClick={() => { set("eixo_tematico", e); setNovoEixo(""); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.eixo_tematico === e
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300"
                  }`}
                >{e}</button>
              ))}
              {isCustomEixo && (
                <span className="rounded-full border border-violet-500 bg-violet-600 text-white px-3 py-1 text-xs font-medium flex items-center gap-1">
                  {form.eixo_tematico}
                  <button type="button" onClick={() => set("eixo_tematico", "")} className="hover:text-red-300 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Input
                value={novoEixo}
                onChange={e => setNovoEixo(e.target.value)}
                placeholder="Adicionar novo eixo temático..."
                className="text-sm flex-1"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdicionarEixo(); } }}
              />
              <Button type="button" size="sm" variant="outline" disabled={!novoEixo.trim()}
                onClick={handleAdicionarEixo} className="shrink-0 gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
          </div>
        </div>

        {/* Textos motivadores */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700 px-1">Textos motivadores</p>

          <TextBlock n={1} label="Texto I" required
            content={form.texto_1} fonte={form.texto_1_fonte} imgUrl={form.motivator1_url}
            onChangeContent={v => set("texto_1", v)}
            onChangeFonte={v => set("texto_1_fonte", v)}
            onChangeImg={v => set("motivator1_url", v)}
          />
          <TextBlock n={2} label="Texto II"
            content={form.texto_2} fonte={form.texto_2_fonte} imgUrl={form.motivator2_url}
            onChangeContent={v => set("texto_2", v)}
            onChangeFonte={v => set("texto_2_fonte", v)}
            onChangeImg={v => set("motivator2_url", v)}
          />
          <TextBlock n={3} label="Texto III"
            content={form.texto_3} fonte={form.texto_3_fonte} imgUrl={form.motivator3_url}
            onChangeContent={v => set("texto_3", v)}
            onChangeFonte={v => set("texto_3_fonte", v)}
            onChangeImg={v => set("motivator3_url", v)}
          />
          <TextBlock n={4} label="Texto IV (opcional)"
            content={form.texto_4} fonte={form.texto_4_fonte} imgUrl={form.motivator4_url}
            onChangeContent={v => set("texto_4", v)}
            onChangeFonte={v => set("texto_4_fonte", v)}
            onChangeImg={v => set("motivator4_url", v)}
          />
          <TextBlock n={5} label="Texto V (opcional)"
            content={form.texto_5} fonte={form.texto_5_fonte} imgUrl={form.motivator5_url}
            onChangeContent={v => set("texto_5", v)}
            onChangeFonte={v => set("texto_5_fonte", v)}
            onChangeImg={v => set("motivator5_url", v)}
          />
        </div>

        {/* Botão publicar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || turmasCorretor.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 px-6"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? "Publicando..." : "Publicar para minhas turmas"}
          </Button>
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorCriarTema;
