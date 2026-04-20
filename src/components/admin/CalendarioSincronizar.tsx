import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { RefreshCw, CheckCircle2, SkipForward, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const TIPO_CORES: Record<string, string> = {
  aula_ao_vivo: '#3b82f6',
  simulado:     '#8b5cf6',
  exercicio:    '#22c55e',
};

const TIPO_LABELS: Record<string, string> = {
  aula_ao_vivo: 'Aula ao Vivo',
  simulado:     'Simulado',
  exercicio:    'Exercício',
};

interface ItemPreview {
  entidade_tipo: string;
  entidade_id: string;
  titulo: string;
  data_evento: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
  link_direto?: string | null;
  ja_existe: boolean;
}

interface Props {
  onSyncComplete: () => void;
}

export const CalendarioSincronizar = ({ onSyncComplete }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [itens, setItens] = useState<ItemPreview[]>([]);

  const handleAbrir = async () => {
    setOpen(true);
    setLoading(true);
    setItens([]);
    await carregarPreview();
    setLoading(false);
  };

  const carregarPreview = async () => {
    // 1. Busca entidade_ids já cadastrados no calendário
    const { data: jaExistem } = await (supabase as any)
      .from('calendario_atividades')
      .select('entidade_tipo, entidade_id')
      .not('entidade_id', 'is', null);

    const existeSet = new Set<string>(
      (jaExistem || []).map((r: any) => `${r.entidade_tipo}::${r.entidade_id}`)
    );

    const preview: ItemPreview[] = [];

    // 2. Aulas virtuais (aula_ao_vivo)
    const { data: aulas } = await supabase
      .from('aulas_virtuais')
      .select('id, titulo, data_aula, horario_inicio, horario_fim, turmas_autorizadas, permite_visitante, link_meet')
      .order('data_aula', { ascending: true });

    for (const a of aulas || []) {
      preview.push({
        entidade_tipo: 'aula_ao_vivo',
        entidade_id: a.id,
        titulo: a.titulo,
        data_evento: a.data_aula,
        link_direto: (a as any).link_meet || null,
        hora_inicio: a.horario_inicio,
        hora_fim: a.horario_fim,
        turmas_autorizadas: a.turmas_autorizadas || [],
        permite_visitante: a.permite_visitante ?? false,
        ja_existe: existeSet.has(`aula_ao_vivo::${a.id}`),
      });
    }

    // 3. Simulados
    const { data: simulados } = await supabase
      .from('simulados')
      .select('id, titulo, data_inicio, hora_inicio, hora_fim, turmas_autorizadas, permite_visitante')
      .order('data_inicio', { ascending: true });

    for (const s of simulados || []) {
      preview.push({
        entidade_tipo: 'simulado',
        entidade_id: s.id,
        titulo: s.titulo,
        data_evento: s.data_inicio,
        hora_inicio: s.hora_inicio,
        hora_fim: s.hora_fim,
        turmas_autorizadas: s.turmas_autorizadas || [],
        permite_visitante: s.permite_visitante ?? false,
        ja_existe: existeSet.has(`simulado::${s.id}`),
      });
    }

    // 4. Exercícios (apenas os que têm data_inicio)
    const { data: exercicios } = await (supabase as any)
      .from('exercicios')
      .select('id, titulo, data_inicio, hora_inicio, hora_fim, turmas_autorizadas, permite_visitante')
      .not('data_inicio', 'is', null)
      .order('data_inicio', { ascending: true });

    for (const e of exercicios || []) {
      preview.push({
        entidade_tipo: 'exercicio',
        entidade_id: e.id,
        titulo: e.titulo,
        data_evento: e.data_inicio,
        hora_inicio: e.hora_inicio,
        hora_fim: e.hora_fim,
        turmas_autorizadas: e.turmas_autorizadas || [],
        permite_visitante: e.permite_visitante ?? false,
        ja_existe: existeSet.has(`exercicio::${e.id}`),
      });
    }

    // Ordena: novos primeiro, depois existentes
    preview.sort((a, b) => {
      if (a.ja_existe !== b.ja_existe) return a.ja_existe ? 1 : -1;
      return a.data_evento.localeCompare(b.data_evento);
    });

    setItens(preview);
  };

  const novos = itens.filter(i => !i.ja_existe);
  const jaExistem = itens.filter(i => i.ja_existe);

  const handleSincronizar = async () => {
    if (novos.length === 0) {
      toast.info('Nenhum item novo para importar.');
      setOpen(false);
      return;
    }

    setSalvando(true);
    try {
      const payload = novos.map(item => ({
        titulo: item.titulo,
        tipo_evento: item.entidade_tipo,
        data_evento: item.data_evento,
        hora_inicio: item.hora_inicio || null,
        hora_fim: item.hora_fim || null,
        entidade_tipo: item.entidade_tipo,
        entidade_id: item.entidade_id,
        link_direto: item.link_direto || null,
        turmas_autorizadas: item.turmas_autorizadas,
        permite_visitante: item.permite_visitante,
        status: 'publicado',
        ativo: true,
      }));

      const { error } = await (supabase as any)
        .from('calendario_atividades')
        .insert(payload);

      if (error) throw error;

      toast.success(`${novos.length} evento(s) importado(s) com sucesso!`);
      setOpen(false);
      onSyncComplete();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar eventos.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAbrir}
        className="flex items-center gap-1.5"
      >
        <RefreshCw className="w-4 h-4" />
        Sincronizar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3F0077]">
              <RefreshCw className="w-5 h-5" />
              Sincronizar com Agendamentos Existentes
            </DialogTitle>
            <DialogDescription>
              O sistema verifica aulas ao vivo, simulados e exercícios com data definida
              e importa os que ainda não estão no calendário.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {loading ? (
              <div className="text-center py-10 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Verificando agendamentos...</p>
              </div>
            ) : itens.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                Nenhum item com data encontrado nas fontes.
              </p>
            ) : (
              <>
                {/* Resumo */}
                <div className="flex gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <strong>{novos.length}</strong> para importar
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <SkipForward className="w-4 h-4" />
                    <strong>{jaExistem.length}</strong> já existem
                  </div>
                </div>

                {/* Lista de novos */}
                {novos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Serão importados
                    </p>
                    <div className="space-y-1.5">
                      {novos.map(item => (
                        <ItemRow key={`${item.entidade_tipo}-${item.entidade_id}`} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista dos que já existem */}
                {jaExistem.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 mt-3">
                      Já estão no calendário (serão ignorados)
                    </p>
                    <div className="space-y-1 opacity-50">
                      {jaExistem.map(item => (
                        <ItemRow key={`${item.entidade_tipo}-${item.entidade_id}`} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              onClick={handleSincronizar}
              disabled={salvando || loading || novos.length === 0}
              className="bg-[#662F96] hover:bg-[#3F0077] text-white"
            >
              {salvando
                ? 'Importando...'
                : novos.length === 0
                ? 'Nenhum item novo'
                : `Importar ${novos.length} evento(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Linha de item no preview ──────────────────────────────────────────────────

const ItemRow = ({ item }: { item: ItemPreview }) => {
  const cor = TIPO_CORES[item.entidade_tipo] || '#6b7280';
  const label = TIPO_LABELS[item.entidade_tipo] || item.entidade_tipo;

  let dataFormatada = item.data_evento;
  try {
    dataFormatada = format(parseISO(item.data_evento), "dd/MM/yyyy", { locale: ptBR });
  } catch {}

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white text-sm">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
      <Badge className="text-white text-xs flex-shrink-0" style={{ backgroundColor: cor }}>
        {label}
      </Badge>
      <span className="font-medium text-gray-800 truncate flex-1">{item.titulo}</span>
      <span className="text-gray-400 flex-shrink-0 text-xs">{dataFormatada}</span>
      {item.hora_inicio && (
        <span className="text-gray-400 flex-shrink-0 text-xs">
          {item.hora_inicio.slice(0, 5)}
        </span>
      )}
      {item.turmas_autorizadas.length > 0 && (
        <span className="text-gray-400 flex-shrink-0 text-xs">
          {item.turmas_autorizadas.join(', ')}
        </span>
      )}
    </div>
  );
};
