import { useState, useMemo, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const CorretorEditarSimulado = () => {
  const { id } = useParams<{ id: string }>();
  const { corretor, loading } = useCorretorAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const turmasCorretor: string[] = corretor?.turmas_autorizadas ?? [];
  const [saving, setSaving] = useState(false);
  const [buscaTema, setBuscaTema] = useState("");
  const [formReady, setFormReady] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    tema_id: "",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    turmas_autorizadas: [] as string[],
    permite_visitante: false,
  });

  // Carrega o simulado existente
  const { data: simulado, isLoading: loadingSimulado } = useQuery({
    queryKey: ["simulado-editar-corretor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulados")
        .select("*, tema:temas(id, frase_tematica, eixo_tematico)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!corretor,
  });

  // Preenche o formulário quando o simulado for carregado
  useEffect(() => {
    if (simulado && !formReady) {
      setForm({
        titulo: simulado.titulo ?? "",
        tema_id: simulado.tema_id ?? "",
        data_inicio: simulado.data_inicio ?? "",
        hora_inicio: simulado.hora_inicio ?? "",
        data_fim: simulado.data_fim ?? "",
        hora_fim: simulado.hora_fim ?? "",
        turmas_autorizadas: (simulado.turmas_autorizadas as string[]) ?? [],
        permite_visitante: simulado.permite_visitante ?? false,
      });
      setFormReady(true);
    }
  }, [simulado, formReady]);

  // Buscar temas publicados
  const { data: temas = [] } = useQuery({
    queryKey: ["temas-para-simulado-corretor", buscaTema],
    queryFn: async () => {
      let query = supabase
        .from("temas")
        .select("id, frase_tematica, eixo_tematico")
        .in("status", ["publicado", "rascunho"])
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(30);
      if (buscaTema.trim()) {
        query = query.ilike("frase_tematica", `%${buscaTema.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const temaEscolhido = useMemo(
    () => temas.find((t) => t.id === form.tema_id) ?? (simulado?.tema as any) ?? null,
    [temas, form.tema_id, simulado]
  );

  if (loading || loadingSimulado) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!simulado) return <Navigate to="/corretor/simulados" replace />;

  const set = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleTurma = (turma: string, checked: boolean) =>
    setForm((prev) => ({
      ...prev,
      turmas_autorizadas: checked
        ? [...prev.turmas_autorizadas, turma]
        : prev.turmas_autorizadas.filter((t) => t !== turma),
    }));

  const handleSave = async () => {
    if (!form.tema_id) {
      toast({ title: "Campo obrigatório", description: "Selecione um tema.", variant: "destructive" });
      return;
    }
    if (!form.data_inicio || !form.hora_inicio || !form.data_fim || !form.hora_fim) {
      toast({ title: "Campos obrigatórios", description: "Preencha as datas e horários.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: result, error } = await supabase.rpc("editar_simulado_corretor" as any, {
        p_corretor_email: corretor.email,
        p_simulado_id: id,
        p_titulo: form.titulo.trim() || "Simulado",
        p_tema_id: form.tema_id,
        p_frase_tematica: temaEscolhido?.frase_tematica ?? "",
        p_data_inicio: form.data_inicio,
        p_hora_inicio: form.hora_inicio,
        p_data_fim: form.data_fim,
        p_hora_fim: form.hora_fim,
        p_turmas_autorizadas: form.turmas_autorizadas.length > 0 ? form.turmas_autorizadas : null,
        p_permite_visitante: form.permite_visitante,
      });

      if (error) throw error;
      const res = result as { success: boolean; message?: string };
      if (!res?.success) throw new Error(res?.message ?? "Erro ao atualizar simulado.");

      toast({ title: "Simulado atualizado!", description: "As alterações foram salvas." });
      navigate("/corretor/simulados");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar simulado.";
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
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Avaliações</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Editar Simulado</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 gap-1.5"
              onClick={() => navigate("/corretor/simulados")}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Título */}
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-700">Identificação</p>
          <div>
            <Label>Título do simulado</Label>
            <Input
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder='Ex.: "Simulado ENEM — Outubro 2026"'
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">Opcional — se vazio, usa "Simulado".</p>
          </div>
        </div>

        {/* Tema */}
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            Tema <span className="text-red-500">*</span>
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={buscaTema}
              onChange={(e) => setBuscaTema(e.target.value)}
              placeholder="Buscar tema..."
              className="pl-10"
            />
          </div>
          {temaEscolhido && (
            <div className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 px-3 py-2">
              <Badge variant="outline" className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                {temaEscolhido.eixo_tematico}
              </Badge>
              <span className="text-sm font-medium text-violet-800 line-clamp-1">{temaEscolhido.frase_tematica}</span>
              <button
                onClick={() => set("tema_id", "")}
                className="ml-auto text-slate-400 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {temas
              .filter((t) => t.id !== form.tema_id)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { set("tema_id", t.id); setBuscaTema(""); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-violet-50 border border-transparent hover:border-violet-100 transition-colors"
                >
                  <span className="text-xs text-slate-400 block">{t.eixo_tematico}</span>
                  <span className="text-sm text-slate-700 line-clamp-1">{t.frase_tematica}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Datas */}
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-700">Período <span className="text-red-500">*</span></p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Data de início</Label>
              <Input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Horário de início</Label>
              <Input type="time" value={form.hora_inicio} onChange={(e) => set("hora_inicio", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Data de encerramento</Label>
              <Input type="date" value={form.data_fim} onChange={(e) => set("data_fim", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Horário de encerramento</Label>
              <Input type="time" value={form.hora_fim} onChange={(e) => set("hora_fim", e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Turmas */}
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-700">Turmas autorizadas</p>
          {turmasCorretor.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {turmasCorretor.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.turmas_autorizadas.includes(t)}
                    onCheckedChange={(checked) => toggleTurma(t, !!checked)}
                  />
                  <span className="text-sm text-slate-700">{t}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Você não possui turmas vinculadas.</p>
          )}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <Checkbox
              checked={form.permite_visitante}
              onCheckedChange={(checked) => set("permite_visitante", !!checked)}
            />
            <span className="text-sm text-slate-700">Permitir visitantes</span>
          </label>
          {form.turmas_autorizadas.length === 0 && turmasCorretor.length > 0 && (
            <p className="text-xs text-slate-400">Nenhuma turma selecionada = visível para todas as suas turmas.</p>
          )}
        </div>

        {/* Botão salvar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 px-6"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorEditarSimulado;
