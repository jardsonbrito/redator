import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTurmasAtivas } from "@/hooks/useTurmasAtivas";

const EIXOS = [
  "Educação", "Saúde", "Meio Ambiente", "Cidadania e Democracia",
  "Violência", "Tecnologia", "Cultura e Arte", "Economia", "Ciência",
  "Direitos Humanos", "Outro",
];

const CorretorCriarTema = () => {
  const { corretor, loading } = useCorretorAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { turmasDinamicas } = useTurmasAtivas();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    frase_tematica: "",
    eixo_tematico: "",
    texto_1: "",
    texto_1_fonte: "",
    texto_2: "",
    texto_2_fonte: "",
    texto_3: "",
    texto_3_fonte: "",
    texto_4: "",
    texto_4_fonte: "",
    texto_5: "",
    texto_5_fonte: "",
    turmas_permitidas: [] as string[],
  });

  if (loading) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleTurma = (turma: string, checked: boolean) =>
    setForm(prev => ({
      ...prev,
      turmas_permitidas: checked
        ? [...prev.turmas_permitidas, turma]
        : prev.turmas_permitidas.filter(t => t !== turma),
    }));

  const handleSave = async () => {
    if (!form.frase_tematica.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha a frase temática.", variant: "destructive" });
      return;
    }
    if (!form.eixo_tematico.trim()) {
      toast({ title: "Campo obrigatório", description: "Selecione ou preencha o eixo temático.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("criar_tema_corretor", {
        p_corretor_email: corretor.email,
        p_frase_tematica: form.frase_tematica.trim(),
        p_eixo_tematico: form.eixo_tematico.trim(),
        p_texto_1: form.texto_1.trim() || null,
        p_texto_1_fonte: form.texto_1_fonte.trim() || null,
        p_texto_2: form.texto_2.trim() || null,
        p_texto_2_fonte: form.texto_2_fonte.trim() || null,
        p_texto_3: form.texto_3.trim() || null,
        p_texto_3_fonte: form.texto_3_fonte.trim() || null,
        p_texto_4: form.texto_4.trim() || null,
        p_texto_4_fonte: form.texto_4_fonte.trim() || null,
        p_texto_5: form.texto_5.trim() || null,
        p_texto_5_fonte: form.texto_5_fonte.trim() || null,
        p_turmas_permitidas: form.turmas_permitidas.length > 0 ? form.turmas_permitidas : null,
      });

      if (error) throw error;

      toast({ title: "Tema salvo!", description: "Tema criado como rascunho. Aguarda aprovação do administrador." });
      navigate("/corretor/temas");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar tema.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const TextBlock = ({ n, label }: { n: 1 | 2 | 3 | 4 | 5; label: string }) => (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Conteúdo</Label>
        <Textarea
          value={(form as Record<string, string>)[`texto_${n}`]}
          onChange={e => set(`texto_${n}`, e.target.value)}
          placeholder={`Digite o conteúdo do ${label.toLowerCase()}...`}
          className="min-h-[120px] resize-y text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Fonte / Referência</Label>
        <Input
          value={(form as Record<string, string>)[`texto_${n}_fonte`]}
          onChange={e => set(`texto_${n}_fonte`, e.target.value)}
          placeholder="Ex.: IBGE, 2023."
          className="text-sm"
        />
      </div>
    </div>
  );

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
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 gap-1.5"
              onClick={() => navigate("/corretor/temas")}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Aviso rascunho */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Temas criados por correto ficam como <strong>rascunho</strong> até serem publicados pelo administrador.
        </div>

        {/* Campos principais */}
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
            <div className="flex flex-wrap gap-2 mt-1">
              {EIXOS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("eixo_tematico", e)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.eixo_tematico === e
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            {form.eixo_tematico === "Outro" && (
              <Input
                className="mt-2"
                placeholder="Especifique o eixo temático..."
                onChange={e => set("eixo_tematico", e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Textos motivadores */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700 px-1">Textos motivadores</p>
          <TextBlock n={1} label="Texto I" />
          <TextBlock n={2} label="Texto II" />
          <TextBlock n={3} label="Texto III" />
          <TextBlock n={4} label="Texto IV (opcional)" />
          <TextBlock n={5} label="Texto V (opcional)" />
        </div>

        {/* Turmas */}
        {turmasDinamicas.length > 0 && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">Turmas permitidas</p>
            <div className="flex flex-wrap gap-3">
              {turmasDinamicas.map(t => (
                <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.turmas_permitidas.includes(t.valor)}
                    onCheckedChange={(checked) => toggleTurma(t.valor, !!checked)}
                  />
                  <span className="text-sm text-slate-700">{t.label}</span>
                </label>
              ))}
            </div>
            {form.turmas_permitidas.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">Nenhuma turma selecionada = visível para todas.</p>
            )}
          </div>
        )}

        {/* Botão salvar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 px-6"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorCriarTema;
