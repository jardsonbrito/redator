import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TurmaSelector } from '@/components/TurmaSelector';
import { Search } from 'lucide-react';

export interface EventoCalendario {
  id?: string;
  titulo: string;
  descricao?: string;
  tipo_evento: string;
  competencia?: string;
  data_evento: string;
  hora_inicio?: string;
  hora_fim?: string;
  cor?: string;
  entidade_tipo?: string;
  entidade_id?: string;
  link_direto?: string;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
  status: string;
  ativo?: boolean;
}

interface EventoCalendarioFormProps {
  mode: 'create' | 'edit';
  initialValues?: EventoCalendario;
  onSuccess?: () => void;
  onCancel?: () => void;
  onViewList?: () => void;
}

const TIPOS_EVENTO = [
  { value: 'aula_ao_vivo',         label: 'Aula ao Vivo' },
  { value: 'aula_gravada',         label: 'Aula Gravada' },
  { value: 'simulado',             label: 'Simulado' },
  { value: 'tema_redacao',         label: 'Tema de Redação' },
  { value: 'exercicio',            label: 'Exercício' },
  { value: 'producao_guiada',      label: 'Produção Guiada' },
  { value: 'microaprendizagem',    label: 'Microaprendizagem' },
  { value: 'guia_tematico',        label: 'Guia Temático' },
  { value: 'repertorio_orientado', label: 'Repertório Orientado' },
  { value: 'laboratorio',          label: 'Laboratório' },
  // Nivelamento: alunos são apenas CONVIDADOS — não computa frequência, nota nem boletim.
  // A ausência nessa aula NÃO deve rebaixar o perfil do aluno. Ver useDiario.ts e useAlunoBoletim.ts.
  { value: 'nivelamento',          label: 'Aula de Nivelamento' },
  { value: 'prazo',                label: 'Prazo Importante' },
  { value: 'aviso_pedagogico',     label: 'Aviso Pedagógico' },
  { value: 'reuniao',              label: 'Reunião (Google Meet)' },
  { value: 'atividade_especial',   label: 'Atividade Especial' },
];

const COMPETENCIAS = [
  { value: 'C1', label: 'Competência 1 — Norma culta' },
  { value: 'C2', label: 'Competência 2 — Compreensão do tema' },
  { value: 'C3', label: 'Competência 3 — Argumentação' },
  { value: 'C4', label: 'Competência 4 — Coesão textual' },
  { value: 'C5', label: 'Competência 5 — Proposta de intervenção' },
];

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
  reuniao:              '#0ea5e9',
  atividade_especial:   '#10b981',
};

// Tabelas de entidades vinculáveis
const ENTIDADE_CONFIG: Record<string, { tabela: string; labelField: string; label: string }> = {
  aula_ao_vivo:         { tabela: 'aulas_virtuais',       labelField: 'titulo', label: 'Aulas ao Vivo' },
  aula_gravada:         { tabela: 'aulas',                labelField: 'titulo', label: 'Aulas Gravadas' },
  simulado:             { tabela: 'simulados',             labelField: 'titulo', label: 'Simulados' },
  tema_redacao:         { tabela: 'temas',                 labelField: 'titulo', label: 'Temas' },
  exercicio:            { tabela: 'exercicios',            labelField: 'titulo', label: 'Exercícios' },
  producao_guiada:      { tabela: 'exercicios',            labelField: 'titulo', label: 'Exercícios (Produção Guiada)' },
  guia_tematico:        { tabela: 'guias_tematicos',       labelField: 'titulo', label: 'Guias Temáticos' },
  laboratorio:          { tabela: 'repertorio_laboratorio', labelField: 'titulo', label: 'Laboratório' },
};

const STATUS_OPTIONS = [
  { value: 'publicado', label: 'Publicado' },
  { value: 'rascunho',  label: 'Rascunho' },
  { value: 'inativo',   label: 'Inativo' },
];

export const EventoCalendarioForm = ({
  mode, initialValues, onSuccess, onCancel, onViewList,
}: EventoCalendarioFormProps) => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('basico');
  const [entidades, setEntidades] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(false);
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState<EventoCalendario>({
    titulo: '',
    descricao: '',
    tipo_evento: 'aviso_pedagogico',
    competencia: '',
    data_evento: new Date().toISOString().slice(0, 10),
    hora_inicio: '',
    hora_fim: '',
    cor: '',
    entidade_tipo: '',
    entidade_id: '',
    link_direto: '',
    turmas_autorizadas: [],
    permite_visitante: false,
    status: 'publicado',
  });

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setForm({
        ...initialValues,
        hora_inicio: initialValues.hora_inicio || '',
        hora_fim: initialValues.hora_fim || '',
        cor: initialValues.cor || '',
        entidade_tipo: initialValues.entidade_tipo || '',
        entidade_id: initialValues.entidade_id || '',
        link_direto: initialValues.link_direto || '',
        competencia: initialValues.competencia || '',
        descricao: initialValues.descricao || '',
      });
    }
  }, [mode, initialValues]);

  // Busca entidades quando o tipo de entidade é selecionado
  useEffect(() => {
    const config = form.entidade_tipo ? ENTIDADE_CONFIG[form.entidade_tipo] : null;
    if (!config) {
      setEntidades([]);
      return;
    }
    setLoadingEntidades(true);
    (supabase as any)
      .from(config.tabela)
      .select(`id, ${config.labelField}`)
      .order(config.labelField, { ascending: true })
      .limit(100)
      .then(({ data }: any) => {
        setEntidades(
          (data || []).map((item: any) => ({
            id: item.id,
            label: item[config.labelField] || item.id,
          }))
        );
        setLoadingEntidades(false);
      });
  }, [form.entidade_tipo]);

  const corEfetiva = form.cor || TIPO_CORES[form.tipo_evento] || '#6b7280';

  const entidadesFiltradas = entidades.filter(e =>
    e.label.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast.error('O título é obrigatório.');
      setActiveSection('basico');
      return;
    }
    if (!form.data_evento) {
      toast.error('A data do evento é obrigatória.');
      setActiveSection('quando');
      return;
    }
    if (form.turmas_autorizadas.length === 0 && !form.permite_visitante) {
      toast.error('Selecione pelo menos uma turma ou ative "Permite Visitante".');
      setActiveSection('destinatarios');
      return;
    }

    setLoading(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao?.trim() || null,
      tipo_evento: form.tipo_evento,
      competencia: form.competencia || null,
      data_evento: form.data_evento,
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      cor: form.cor || null,
      entidade_tipo: form.entidade_tipo || null,
      entidade_id: form.entidade_id || null,
      link_direto: form.link_direto?.trim() || null,
      turmas_autorizadas: form.turmas_autorizadas,
      permite_visitante: form.permite_visitante,
      status: form.status,
    };

    try {
      if (mode === 'edit' && form.id) {
        const { error } = await supabase
          .from('calendario_atividades' as any)
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
        toast.success('Evento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('calendario_atividades' as any)
          .insert([payload]);
        if (error) throw error;
        toast.success('Evento criado com sucesso!');
        setForm({
          titulo: '', descricao: '', tipo_evento: 'aviso_pedagogico', competencia: '',
          data_evento: new Date().toISOString().slice(0, 10),
          hora_inicio: '', hora_fim: '', cor: '', entidade_tipo: '', entidade_id: '',
          link_direto: '',
          turmas_autorizadas: [], permite_visitante: false, status: 'publicado',
        });
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar evento.');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basico', label: 'Básico' },
    { id: 'quando', label: 'Quando' },
    { id: 'destinatarios', label: 'Destinatários' },
    { id: 'vinculacao', label: 'Vinculação' },
    { id: 'apresentacao', label: 'Apresentação' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3F0077] to-[#662F96] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corEfetiva }} />
          <h2 className="text-white font-semibold text-lg">
            {mode === 'edit' ? 'Editar Evento' : 'Novo Evento no Calendário'}
          </h2>
        </div>
        {onViewList && (
          <button
            onClick={onViewList}
            className="text-white/80 hover:text-white text-sm underline"
          >
            Ver lista
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-gray-50 overflow-x-auto">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              'px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors',
              activeSection === s.id
                ? 'border-b-2 border-[#662F96] text-[#662F96] bg-white'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">

        {activeSection === 'basico' && (
          <>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Simulado de Redação — Turma A"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes do evento (opcional)"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Evento *</Label>
              <Select
                value={form.tipo_evento}
                onValueChange={v => setForm(f => ({ ...f, tipo_evento: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EVENTO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(form.tipo_evento === 'aviso_pedagogico' || form.tipo_evento === 'reuniao') && (
              <div className="space-y-1.5">
                <Label>
                  Link do Google Meet{' '}
                  {form.tipo_evento === 'reuniao'
                    ? <span className="text-red-400">*</span>
                    : <span className="text-gray-400 font-normal">(opcional)</span>}
                </Label>
                <Input
                  value={form.link_direto}
                  onChange={e => setForm(f => ({ ...f, link_direto: e.target.value }))}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  spellCheck={false}
                />
                {form.tipo_evento === 'reuniao' && (
                  <p className="text-xs text-gray-400">
                    O link ficará disponível como botão "Entrar na reunião" no calendário.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Competência Associada <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Select
                value={form.competencia || '__none__'}
                onValueChange={v => setForm(f => ({ ...f, competencia: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma competência específica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {COMPETENCIAS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {activeSection === 'quando' && (
          <>
            <div className="space-y-1.5">
              <Label>Data do Evento *</Label>
              <Input
                type="date"
                value={form.data_evento}
                onChange={e => setForm(f => ({ ...f, data_evento: e.target.value }))}
              />
            </div>
            <p className="text-sm text-gray-500">
              Horário é opcional. Deixe em branco para eventos de dia inteiro.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Horário de Início</Label>
                <Input
                  type="time"
                  value={form.hora_inicio}
                  onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Horário de Término</Label>
                <Input
                  type="time"
                  value={form.hora_fim}
                  onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                />
              </div>
            </div>
          </>
        )}

        {activeSection === 'destinatarios' && (
          <TurmaSelector
            selectedTurmas={form.turmas_autorizadas}
            permiteVisitante={form.permite_visitante}
            onTurmasChange={turmas => setForm(f => ({ ...f, turmas_autorizadas: turmas }))}
            onPermiteVisitanteChange={v => setForm(f => ({ ...f, permite_visitante: v }))}
          />
        )}

        {activeSection === 'vinculacao' && (
          <>
            <p className="text-sm text-gray-600">
              Vincule este evento a uma funcionalidade da plataforma para exibir um botão de ação para o aluno.
              Deixe em branco para eventos apenas informativos.
            </p>
            <div className="space-y-1.5">
              <Label>Funcionalidade Vinculada</Label>
              <Select
                value={form.entidade_tipo || '__none__'}
                onValueChange={v => setForm(f => ({
                  ...f,
                  entidade_tipo: v === '__none__' ? '' : v,
                  entidade_id: '',
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (evento informativo)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma — evento informativo</SelectItem>
                  {TIPOS_EVENTO.filter(t => ENTIDADE_CONFIG[t.value]).map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.entidade_tipo && ENTIDADE_CONFIG[form.entidade_tipo] && (
              <div className="space-y-1.5">
                <Label>
                  {ENTIDADE_CONFIG[form.entidade_tipo].label} específico
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-9"
                  />
                </div>
                {loadingEntidades ? (
                  <p className="text-sm text-gray-400">Carregando...</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                    {entidadesFiltradas.length === 0 ? (
                      <p className="text-sm text-gray-400 p-3">Nenhum resultado.</p>
                    ) : (
                      entidadesFiltradas.map(e => (
                        <button
                          key={e.id}
                          onClick={() => setForm(f => ({ ...f, entidade_id: e.id }))}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors',
                            form.entidade_id === e.id && 'bg-purple-100 text-purple-800 font-medium'
                          )}
                        >
                          {e.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {form.entidade_id && (
                  <p className="text-xs text-gray-500">
                    Selecionado: <span className="font-mono">{form.entidade_id}</span>
                    <button
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => setForm(f => ({ ...f, entidade_id: '' }))}
                    >
                      remover
                    </button>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {activeSection === 'apresentacao' && (
          <>
            <div className="space-y-1.5">
              <Label>Cor do Evento</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                  style={{ backgroundColor: corEfetiva }}
                />
                <div className="flex-1">
                  <Input
                    value={form.cor}
                    onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                    placeholder={`Automática (${corEfetiva})`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Deixe em branco para usar a cor padrão do tipo de evento.
                  </p>
                </div>
                {form.cor && (
                  <button
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => setForm(f => ({ ...f, cor: '' }))}
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(TIPO_CORES).slice(0, 8).map(([, cor]) => (
                  <button
                    key={cor}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                      form.cor === cor ? 'border-gray-800 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: cor }}
                    onClick={() => setForm(f => ({ ...f, cor }))}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex gap-2">
          {sections.findIndex(s => s.id === activeSection) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const idx = sections.findIndex(s => s.id === activeSection);
                setActiveSection(sections[idx - 1].id);
              }}
            >
              ← Anterior
            </Button>
          )}
          {sections.findIndex(s => s.id === activeSection) < sections.length - 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const idx = sections.findIndex(s => s.id === activeSection);
                setActiveSection(sections[idx + 1].id);
              }}
            >
              Próximo →
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#662F96] hover:bg-[#3F0077] text-white"
          >
            {loading ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Criar Evento'}
          </Button>
        </div>
      </div>
    </div>
  );
};
