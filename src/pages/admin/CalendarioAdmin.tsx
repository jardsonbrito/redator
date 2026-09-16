import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventoCalendarioForm, type EventoCalendario } from '@/components/admin/EventoCalendarioForm';
import { EventoCalendarioList } from '@/components/admin/EventoCalendarioList';
import { CalendarioAdminView } from '@/components/admin/CalendarioAdminView';
import { CalendarioSincronizar } from '@/components/admin/CalendarioSincronizar';
import { Button } from '@/components/ui/button';
import { LayoutList, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

type Visao = 'lista' | 'calendario';

export const CalendarioAdmin = () => {
  const [visao, setVisao] = useState<Visao>('lista');
  const [showForm, setShowForm] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoCalendario | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [eventosCalendario, setEventosCalendario] = useState<any[]>([]);

  useEffect(() => {
    if (visao === 'calendario') fetchEventosCalendario();
  }, [visao, mesAtual, refresh]);

  const fetchEventosCalendario = async () => {
    const inicio = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-01`;
    const ultimo = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
    const fim = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`;

    const { data, error } = await (supabase as any)
      .from('calendario_atividades')
      .select('*')
      .gte('data_evento', inicio)
      .lte('data_evento', fim)
      .order('hora_inicio', { ascending: true, nullsFirst: false });

    if (error) toast.error('Erro ao carregar eventos.');
    setEventosCalendario(data || []);
  };

  const handleSuccess = () => {
    setRefresh(r => !r);
    setShowForm(false);
    setEventoEditando(null);
  };

  const handleEdit = (evento: EventoCalendario) => {
    setEventoEditando(evento);
    setShowForm(true);
    setVisao('lista');
  };

  const handleNovoEvento = () => {
    setEventoEditando(null);
    setShowForm(true);
  };

  const handleCancelar = () => {
    setShowForm(false);
    setEventoEditando(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendário de Atividades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os eventos pedagógicos exibidos para os alunos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle de visão */}
          {!showForm && (
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setVisao('lista')}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${
                  visao === 'lista' ? 'bg-[#662F96] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setVisao('calendario')}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${
                  visao === 'calendario' ? 'bg-[#662F96] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Calendário
              </button>
            </div>
          )}
          {!showForm && (
            <CalendarioSincronizar onSyncComplete={() => setRefresh(r => !r)} />
          )}
          {!showForm && (
            <Button
              onClick={handleNovoEvento}
              className="bg-[#662F96] hover:bg-[#3F0077] text-white"
              size="sm"
            >
              + Novo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <EventoCalendarioForm
          mode={eventoEditando ? 'edit' : 'create'}
          initialValues={eventoEditando || undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancelar}
          onViewList={() => { setShowForm(false); setVisao('lista'); }}
        />
      )}

      {/* Visão Lista */}
      {!showForm && visao === 'lista' && (
        <EventoCalendarioList
          refresh={refresh}
          onEdit={handleEdit}
        />
      )}

      {/* Visão Calendário */}
      {!showForm && visao === 'calendario' && (
        <CalendarioAdminView
          eventos={eventosCalendario}
          mesAtual={mesAtual}
          onMesChange={setMesAtual}
          onEventoClick={handleEdit}
        />
      )}
    </div>
  );
};

export default CalendarioAdmin;
