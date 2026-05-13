import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { EventoCalendarioForm, type EventoCalendario, type EventoCalendarioPayload } from "@/components/admin/EventoCalendarioForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, CalendarDays, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
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

const TIPO_LABELS: Record<string, string> = {
  aula_ao_vivo: "Aula ao Vivo",
  aula_gravada: "Aula Gravada",
  simulado: "Simulado",
  tema_redacao: "Tema de Redação",
  exercicio: "Exercício",
  producao_guiada: "Produção Guiada",
  microaprendizagem: "Microaprendizagem",
  guia_tematico: "Guia Temático",
  repertorio_orientado: "Repertório Orientado",
  laboratorio: "Laboratório",
  nivelamento: "Nivelamento",
  prazo: "Prazo Importante",
  aviso_pedagogico: "Aviso Pedagógico",
  reuniao: "Reunião",
  atividade_especial: "Atividade Especial",
};

const TIPO_CORES: Record<string, string> = {
  aula_gravada: "#FF9800",
  aula_ao_vivo: "#3b82f6",
  simulado: "#8b5cf6",
  tema_redacao: "#f97316",
  exercicio: "#22c55e",
  producao_guiada: "#ec4899",
  microaprendizagem: "#eab308",
  guia_tematico: "#14b8a6",
  repertorio_orientado: "#06b6d4",
  laboratorio: "#7C3AED",
  nivelamento: "#6366f1",
  prazo: "#ef4444",
  aviso_pedagogico: "#6b7280",
  reuniao: "#0ea5e9",
  atividade_especial: "#10b981",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const CorretorCalendario = () => {
  const { corretor, loading } = useCorretorAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoCalendario | null>(null);
  const [eventoExcluindo, setEventoExcluindo] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState(new Date());

  if (loading) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;

  const turmasCorretor: string[] = (corretor.turmas_autorizadas as string[]) ?? [];

  const queryKey = ["corretor-calendario", corretor.email];

  const { data: eventos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("corretor_listar_eventos_calendario" as any, {
        p_corretor_email: corretor.email,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!corretor.email,
  });

  // Filtrar pelo mês atual
  const mesStr = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}`;
  const eventosMes = eventos
    .filter((e: any) => e.data_evento?.startsWith(mesStr))
    .sort((a: any, b: any) => a.data_evento.localeCompare(b.data_evento) || (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));

  const handleSave = async (payload: EventoCalendarioPayload) => {
    const isEdit = !!payload.id;

    if (isEdit) {
      const { error } = await supabase.rpc("corretor_atualizar_evento_calendario" as any, {
        p_corretor_email: corretor.email,
        p_evento_id: payload.id,
        p_titulo: payload.titulo,
        p_descricao: payload.descricao || null,
        p_tipo_evento: payload.tipo_evento,
        p_data_evento: payload.data_evento,
        p_hora_inicio: payload.hora_inicio || null,
        p_hora_fim: payload.hora_fim || null,
        p_cor: payload.cor || null,
        p_link_direto: payload.link_direto || null,
        p_competencia: payload.competencia || null,
        p_permite_visitante: payload.permite_visitante,
        p_status: payload.status,
      });
      if (error) throw error;
      toast.success("Evento atualizado com sucesso!");
    } else {
      const { error } = await supabase.rpc("corretor_criar_evento_calendario" as any, {
        p_corretor_email: corretor.email,
        p_titulo: payload.titulo,
        p_descricao: payload.descricao || null,
        p_tipo_evento: payload.tipo_evento,
        p_data_evento: payload.data_evento,
        p_hora_inicio: payload.hora_inicio || null,
        p_hora_fim: payload.hora_fim || null,
        p_cor: payload.cor || null,
        p_link_direto: payload.link_direto || null,
        p_competencia: payload.competencia || null,
        p_permite_visitante: payload.permite_visitante,
        p_status: payload.status,
      });
      if (error) throw error;
      toast.success("Evento criado com sucesso!");
    }

    await queryClient.invalidateQueries({ queryKey });
  };

  const handleExcluir = async (id: string) => {
    const { error } = await supabase.rpc("corretor_excluir_evento_calendario" as any, {
      p_corretor_email: corretor.email,
      p_evento_id: id,
    });
    if (error) {
      toast.error(error.message || "Erro ao excluir evento.");
    } else {
      toast.success("Evento excluído.");
      await queryClient.invalidateQueries({ queryKey });
    }
    setEventoExcluindo(null);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEventoEditando(null);
  };

  const handleEditar = (evento: any) => {
    setEventoEditando({
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao || "",
      tipo_evento: evento.tipo_evento,
      competencia: evento.competencia || "",
      data_evento: evento.data_evento,
      hora_inicio: evento.hora_inicio || "",
      hora_fim: evento.hora_fim || "",
      cor: evento.cor || "",
      entidade_tipo: evento.entidade_tipo || "",
      entidade_id: evento.entidade_id || "",
      link_direto: evento.link_direto || "",
      turmas_autorizadas: (evento.turmas_autorizadas as string[]) ?? [],
      permite_visitante: evento.permite_visitante ?? false,
      status: evento.status ?? "publicado",
      ativo: evento.ativo ?? true,
    });
    setShowForm(true);
  };

  const irMesAnterior = () =>
    setMesAtual(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

  const irMesSeguinte = () =>
    setMesAtual(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <CorretorLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Agenda</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Calendário</h1>
              {turmasCorretor.length > 0 && (
                <p className="text-xs text-violet-200 mt-1">
                  Eventos visíveis para: {turmasCorretor.join(", ")}
                </p>
              )}
            </div>
            {!showForm && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 gap-1.5 shrink-0"
                onClick={() => { setEventoEditando(null); setShowForm(true); }}
                disabled={turmasCorretor.length === 0}
              >
                <Plus className="w-4 h-4" />
                Novo Evento
              </Button>
            )}
          </div>
        </div>

        {turmasCorretor.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Você não possui turmas autorizadas. Contate o administrador para criar eventos no calendário.
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <EventoCalendarioForm
            mode={eventoEditando ? "edit" : "create"}
            initialValues={eventoEditando || undefined}
            lockedTurmas={turmasCorretor}
            onSave={handleSave}
            onSuccess={handleSuccess}
            onCancel={() => { setShowForm(false); setEventoEditando(null); }}
            onViewList={() => { setShowForm(false); setEventoEditando(null); }}
          />
        )}

        {/* Navegação por mês + lista */}
        {!showForm && (
          <>
            {/* Navegação */}
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={irMesAnterior} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-slate-700 text-sm">
                {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
              </span>
              <Button variant="outline" size="sm" onClick={irMesSeguinte} className="gap-1">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Eventos do mês */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : eventosMes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum evento em {MESES[mesAtual.getMonth()]}.</p>
                  {turmasCorretor.length > 0 && (
                    <Button
                      size="sm"
                      className="mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => { setEventoEditando(null); setShowForm(true); }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Criar primeiro evento
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {eventosMes.map((evento: any) => {
                  const cor = evento.cor || TIPO_CORES[evento.tipo_evento] || "#6b7280";
                  return (
                    <div
                      key={evento.id}
                      className="flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm"
                    >
                      <div
                        className="mt-0.5 w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{evento.titulo}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <CalendarDays className="w-3 h-3" />
                                {formatarData(evento.data_evento)}
                              </span>
                              {evento.hora_inicio && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  {evento.hora_inicio}
                                  {evento.hora_fim && ` – ${evento.hora_fim}`}
                                </span>
                              )}
                              <Badge
                                variant="secondary"
                                className="text-xs px-1.5 py-0"
                                style={{ backgroundColor: `${cor}20`, color: cor, border: `1px solid ${cor}40` }}
                              >
                                {TIPO_LABELS[evento.tipo_evento] ?? evento.tipo_evento}
                              </Badge>
                              {evento.status !== "publicado" && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-slate-400">
                                  {evento.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600"
                              onClick={() => handleEditar(evento)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                              onClick={() => setEventoExcluindo(evento.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {evento.descricao && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{evento.descricao}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!eventoExcluindo} onOpenChange={() => setEventoExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => eventoExcluindo && handleExcluir(eventoExcluindo)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CorretorLayout>
  );
};

export default CorretorCalendario;
