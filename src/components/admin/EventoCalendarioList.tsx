import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { EventoCalendario } from './EventoCalendarioForm';

const TIPO_CORES: Record<string, string> = {
  aula_gravada:         '#FF9800',
  aula_ao_vivo:         '#3b82f6',
  simulado:             '#8b5cf6',
  tema_redacao:         '#f97316',
  exercicio:            '#22c55e',
  producao_guiada:      '#ec4899',
  microaprendizagem:    '#eab308',
  guia_tematico:        '#14b8a6',
  repertorio_orientado: '#06b6d4',
  laboratorio:          '#7C3AED',
  nivelamento:          '#6366f1',
  prazo:                '#ef4444',
  aviso_pedagogico:     '#6b7280',
  atividade_especial:   '#10b981',
};

const TIPO_LABELS: Record<string, string> = {
  aula_gravada:         'Aula Gravada',
  aula_ao_vivo:         'Aula ao Vivo',
  simulado:             'Simulado',
  tema_redacao:         'Tema',
  exercicio:            'Exercício',
  producao_guiada:      'Produção Guiada',
  microaprendizagem:    'Microaprendizagem',
  guia_tematico:        'Guia Temático',
  repertorio_orientado: 'Repertório',
  laboratorio:          'Laboratório',
  nivelamento:          'Nivelamento',
  prazo:                'Prazo',
  aviso_pedagogico:     'Aviso',
  atividade_especial:   'Especial',
};

interface Props {
  refresh: boolean;
  onEdit: (evento: EventoCalendario) => void;
}

type Evento = EventoCalendario & { criado_em: string };

export const EventoCalendarioList = ({ refresh, onEdit }: Props) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('__todos__');
  const [filtroStatus, setFiltroStatus] = useState('__todos__');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchEventos();
  }, [refresh]);

  const fetchEventos = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('calendario_atividades')
      .select('*')
      .order('data_evento', { ascending: false });
    if (error) toast.error('Erro ao carregar eventos.');
    setEventos(data || []);
    setLoading(false);
  };

  const handleToggleStatus = async (evento: Evento) => {
    const novoStatus = evento.status === 'publicado' ? 'inativo' : 'publicado';
    const { error } = await (supabase as any)
      .from('calendario_atividades')
      .update({ status: novoStatus })
      .eq('id', evento.id);
    if (error) { toast.error('Erro ao atualizar status.'); return; }
    toast.success(`Evento ${novoStatus === 'publicado' ? 'publicado' : 'desativado'}.`);
    fetchEventos();
  };

  const handleDuplicate = async (evento: Evento) => {
    const { id, criado_em, ...rest } = evento as any;
    const { error } = await (supabase as any)
      .from('calendario_atividades')
      .insert([{ ...rest, titulo: `${evento.titulo} (cópia)`, status: 'rascunho' }]);
    if (error) { toast.error('Erro ao duplicar evento.'); return; }
    toast.success('Evento duplicado como rascunho.');
    fetchEventos();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any)
      .from('calendario_atividades')
      .delete()
      .eq('id', deleteId);
    if (error) { toast.error('Erro ao excluir evento.'); return; }
    toast.success('Evento excluído.');
    setDeleteId(null);
    fetchEventos();
  };

  // Filtros
  const eventosFiltrados = eventos.filter(e => {
    if (filtroMes && !e.data_evento.startsWith(filtroMes)) return false;
    if (filtroTipo !== '__todos__' && e.tipo_evento !== filtroTipo) return false;
    if (filtroStatus !== '__todos__' && e.status !== filtroStatus) return false;
    return true;
  });

  const mesesDisponiveis = [...new Set(eventos.map(e => e.data_evento.slice(0, 7)))].sort().reverse();

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filtroMes || '__todos__'} onValueChange={v => setFiltroMes(v === '__todos__' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos os meses</SelectItem>
            {mesesDisponiveis.map(m => (
              <SelectItem key={m} value={m}>
                {format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos os status</SelectItem>
            <SelectItem value="publicado">Publicado</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-gray-500 ml-auto">{eventosFiltrados.length} evento(s)</span>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Turmas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : eventosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              eventosFiltrados.map(evento => {
                const cor = evento.cor || TIPO_CORES[evento.tipo_evento] || '#6b7280';
                return (
                  <TableRow key={evento.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                        <span className="font-medium text-sm">{evento.titulo}</span>
                      </div>
                      {evento.entidade_tipo && (
                        <span className="text-xs text-gray-400 ml-4.5 pl-4.5">
                          Vinculado: {TIPO_LABELS[evento.entidade_tipo] || evento.entidade_tipo}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="text-white text-xs"
                        style={{ backgroundColor: cor }}
                      >
                        {TIPO_LABELS[evento.tipo_evento] || evento.tipo_evento}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(parseISO(evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {evento.hora_inicio
                        ? `${evento.hora_inicio.slice(0, 5)}${evento.hora_fim ? `–${evento.hora_fim.slice(0, 5)}` : ''}`
                        : 'Dia inteiro'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(evento.turmas_autorizadas || []).length === 0
                        ? <span className="text-gray-400">Todas</span>
                        : (evento.turmas_autorizadas || []).join(', ')}
                      {evento.permite_visitante && (
                        <span className="ml-1 text-xs text-blue-500">+Visitante</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={evento.status === 'publicado' ? 'default' : 'secondary'}
                        className={evento.status === 'publicado' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {evento.status === 'publicado' ? 'Publicado' : evento.status === 'rascunho' ? 'Rascunho' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu
                        open={openDropdownId === evento.id}
                        onOpenChange={open => setOpenDropdownId(open ? evento.id! : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onCloseAutoFocus={e => e.preventDefault()}
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownId(null);
                              setTimeout(() => onEdit(evento), 100);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleDuplicate(evento);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleToggleStatus(evento);
                            }}
                          >
                            {evento.status === 'publicado'
                              ? <><EyeOff className="w-4 h-4 mr-2" />Desativar</>
                              : <><Eye className="w-4 h-4 mr-2" />Publicar</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              setOpenDropdownId(null);
                              setTimeout(() => setDeleteId(evento.id!), 100);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será removido permanentemente do calendário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
