import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { TurmaSelector } from '@/components/TurmaSelector';
import { FileInput } from '@/components/FileInput';

interface MuralFormModernProps {
  mode: 'create' | 'edit';
  initialValues?: {
    id?: string;
    titulo?: string;
    descricao?: string;
    prioridade?: string;
    status?: string;
    turmas_autorizadas?: string[];
    permite_visitante?: boolean;
    link_externo?: string;
    data_agendamento?: string;
    imagem_url?: string;
  };
  onCancel?: () => void;
  onSuccess?: () => void;
  onViewList?: () => void;
  showViewList?: boolean;
}

export const MuralFormModern = ({ mode, initialValues, onCancel, onSuccess, onViewList, showViewList }: MuralFormModernProps) => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('basico');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    status: 'rascunho',
    turmasAutorizadas: [] as string[],
    permiteVisitante: false,
    linkExterno: '',
    dataAgendamento: '',
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Mapeamento correto entre labels do frontend e valores do banco
  const prioridades = [
    { value: "alta", label: "Alta" },
    { value: "media", label: "Média" },
    { value: "baixa", label: "Baixa" },
  ];

  const statusOptions = [
    { value: "rascunho", label: "Rascunho" },
    { value: "publicado", label: "Publicado" },
    { value: "inativo", label: "Inativo" },
    { value: "agendado", label: "Agendado" },
  ];

  // Pré-preencher dados no modo edit
  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setFormData({
        titulo: initialValues.titulo || '',
        descricao: initialValues.descricao || '',
        prioridade: initialValues.prioridade || 'media',
        status: initialValues.status || 'rascunho',
        turmasAutorizadas: initialValues.turmas_autorizadas || [],
        permiteVisitante: initialValues.permite_visitante || false,
        linkExterno: initialValues.link_externo || '',
        dataAgendamento: initialValues.data_agendamento ? new Date(initialValues.data_agendamento).toISOString().slice(0, 16) : '',
      });
      setImageUrl(initialValues.imagem_url || null);
    }
  }, [mode, initialValues]);

  const handleImageUpload = (url: string | null) => {
    setImageUrl(url);
  };

  const isFormValid = () => {
    // Validação: pelo menos um destinatário deve estar selecionado
    const hasDestinatarios =
      formData.turmasAutorizadas.length > 0 ||
      formData.permiteVisitante;

    return formData.titulo.trim() && formData.descricao.trim() && hasDestinatarios;
  };

  const handleAction = () => {
    // Validações básicas com redirecionamento para seção
    if (!formData.titulo.trim()) {
      toast.error('Título é obrigatório');
      setActiveSection('basico');
      return;
    }

    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      setActiveSection('basico');
      return;
    }

    // Validação de destinatários
    const hasDestinatarios =
      formData.turmasAutorizadas.length > 0 ||
      formData.permiteVisitante;

    if (!hasDestinatarios) {
      toast.error('Selecione pelo menos um destinatário (turma ou visitante)');
      setActiveSection('destinatarios');
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const avisoData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        prioridade: formData.prioridade,
        status: formData.status,
        turmas_autorizadas: formData.turmasAutorizadas,
        corretores_destinatarios: [], // Sempre array vazio
        link_externo: formData.linkExterno.trim() || null,
        data_agendamento: formData.dataAgendamento ? new Date(formData.dataAgendamento).toISOString() : null,
        imagem_url: imageUrl,
        permite_visitante: formData.permiteVisitante,
      };

      let result;
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('avisos')
          .insert([avisoData])
          .select('*')
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('avisos')
          .update(avisoData)
          .eq('id', initialValues?.id)
          .select('*')
          .single();
        result = { data, error };
      }

      if (result.error) {
        throw result.error;
      }

      toast.success(mode === 'create' ? "Aviso criado com sucesso!" : "Aviso atualizado com sucesso!");

      // Reset form ou callback
      if (mode === 'create') {
        setFormData({
          titulo: '',
          descricao: '',
          prioridade: 'media',
          status: 'rascunho',
          turmasAutorizadas: [],
          permiteVisitante: false,
          linkExterno: '',
          dataAgendamento: '',
        });
        setImageUrl(null);
      } else if (onSuccess) {
        onSuccess();
      }

    } catch (error: unknown) {
      console.error('Erro ao salvar aviso:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar aviso");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basico', label: 'Básico' },
    { id: 'configuracao', label: 'Configuração' },
    { id: 'destinatarios', label: 'Destinatários' },
    { id: 'extras', label: 'Extras' },
    ...(showViewList ? [{ id: 'avisos', label: 'Avisos' }] : [])
  ];

  const toggleSection = (sectionId: string) => {
    if (sectionId === 'avisos' && onViewList) {
      onViewList();
    } else {
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f7f7fb' }}>
      <div className="max-w-6xl mx-auto p-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header with chips and action buttons */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeSection === section.id
                      ? "text-white"
                      : "text-white",
                    activeSection === section.id
                      ? "bg-[#662F96]"
                      : "bg-[#B175FF] hover:bg-[#662F96]"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAction}
                disabled={loading || !isFormValid()}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading ? (mode === 'create' ? 'Criando...' : 'Salvando...') : (mode === 'create' ? 'Criar Aviso' : 'Salvar Alterações')}
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Básico Section */}
            {activeSection === 'basico' && (
              <div className="space-y-4">
                {/* Título */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    className="text-sm mt-2"
                    spellCheck={true}
                  />
                </div>

                {/* Descrição */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    className="text-sm mt-2"
                    rows={3}
                    spellCheck={true}
                  />
                </div>
              </div>
            )}

            {/* Configuração Section */}
            {activeSection === 'configuracao' && (
              <div className="space-y-4">
                {/* Prioridade */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {prioridades.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Destinatários Section */}
            {activeSection === 'destinatarios' && (
              <div className="space-y-4">
                {/* Turmas */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <TurmaSelector
                    selectedTurmas={formData.turmasAutorizadas}
                    onTurmasChange={(turmas) =>
                      setFormData(prev => ({ ...prev, turmasAutorizadas: turmas }))
                    }
                    permiteeVisitante={formData.permiteVisitante}
                    onPermiteVisitanteChange={(permite) =>
                      setFormData(prev => ({ ...prev, permiteVisitante: permite }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Extras Section */}
            {activeSection === 'extras' && (
              <div className="space-y-4">
                {/* Link Externo */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="linkExterno">Link Externo</Label>
                  <Input
                    id="linkExterno"
                    type="url"
                    value={formData.linkExterno}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkExterno: e.target.value }))}
                    className="text-sm mt-2"
                  />
                </div>

                {/* Data de Agendamento */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="dataAgendamento">Data de Agendamento</Label>
                  <Input
                    id="dataAgendamento"
                    type="datetime-local"
                    value={formData.dataAgendamento}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataAgendamento: e.target.value }))}
                    className="mt-2"
                  />
                </div>

                {/* Imagem */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label>Imagem</Label>
                  <div className="mt-2">
                    <FileInput
                      onImageUpload={handleImageUpload}
                      initialImageUrl={imageUrl}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};