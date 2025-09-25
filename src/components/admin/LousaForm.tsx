import React, { useState, useEffect } from 'react';
import { DateTimePicker } from '@/components/ui/datetime-picker-custom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface FormData {
  titulo: string;
  enunciado: string;
  turmas: string[];
  permite_visitante: boolean;
  corretor_id: string;
  inicio_em?: Date;
  fim_em?: Date;
  capa_url: string;
  ativo: boolean;
}

type ActionType = 'save' | 'publish';

interface LousaFormProps {
  onSuccess?: () => void;
  editData?: any;
}

const TURMAS = ['A', 'B', 'C', 'D', 'E'];

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
}

export default function LousaForm({ onSuccess, editData }: LousaFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!editData);
  const [activeSection, setActiveSection] = useState<string>('capa');
  const [actionType, setActionType] = useState<ActionType>('save');
  const [corretores, setCorretores] = useState<Corretor[]>([]);

  const [formData, setFormData] = useState<FormData>({
    titulo: editData?.titulo || '',
    enunciado: editData?.enunciado || '',
    turmas: editData?.turmas || [],
    permite_visitante: editData?.permite_visitante || false,
    corretor_id: editData?.corretor_id ? editData.corretor_id : 'all',
    inicio_em: editData?.inicio_em ? new Date(editData.inicio_em) : undefined,
    fim_em: editData?.fim_em ? new Date(editData.fim_em) : undefined,
    capa_url: editData?.capa_url || '',
    ativo: editData?.ativo ?? true
  });

  // Carregar lista de corretores ativos
  useEffect(() => {
    const fetchCorretores = async () => {
      try {
        const { data, error } = await supabase
          .from('corretores')
          .select('id, nome_completo, email')
          .eq('ativo', true)
          .order('nome_completo');

        if (error) throw error;
        setCorretores(data || []);
      } catch (error) {
        console.error('Erro ao carregar corretores:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar lista de corretores.',
          variant: 'destructive'
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchCorretores();
  }, [toast]);

  const handleAction = (action: ActionType) => {
    setActionType(action);

    // Validações básicas
    if (!formData.titulo.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Título é obrigatório.',
        variant: 'destructive'
      });
      setActiveSection('titulo');
      return;
    }

    if (!formData.enunciado.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Enunciado é obrigatório.',
        variant: 'destructive'
      });
      setActiveSection('enunciado');
      return;
    }

    if (formData.turmas.length === 0 && !formData.permite_visitante) {
      toast({
        title: 'Acesso necessário',
        description: 'Pelo menos uma turma deve ser selecionada OU visitantes permitidos.',
        variant: 'destructive'
      });
      setActiveSection('turmas');
      return;
    }

    if (formData.inicio_em && formData.fim_em && formData.inicio_em >= formData.fim_em) {
      toast({
        title: 'Datas inválidas',
        description: 'Data de início deve ser anterior à data fim.',
        variant: 'destructive'
      });
      setActiveSection('configuracao');
      return;
    }

    handleSubmit(action);
  };

  const handleSubmit = async (action: ActionType) => {
    setLoading(true);
    try {
      const status = action === 'publish' ? 'active' : 'draft';

      const lousaData = {
        titulo: formData.titulo.trim(),
        enunciado: formData.enunciado.trim(),
        turmas: formData.turmas,
        permite_visitante: formData.permite_visitante,
        corretor_id: formData.corretor_id === 'all' ? null : formData.corretor_id,
        ativo: formData.ativo,
        status,
        capa_url: formData.capa_url.trim() || null,
        inicio_em: formData.inicio_em?.toISOString() || null,
        fim_em: formData.fim_em?.toISOString() || null,
        created_by: (await supabase.auth.getUser()).data.user?.id || ''
      };

      const { error } = editData
        ? await supabase.from('lousa').update(lousaData).eq('id', editData.id)
        : await supabase.from('lousa').insert([lousaData]);

      if (error) throw error;

      // Invalidar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lousas'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-lousas'] }),
        queryClient.refetchQueries({ queryKey: ['lousas'] })
      ]);

      const successMessage = editData
        ? 'Lousa atualizada com sucesso!'
        : action === 'save'
          ? 'Lousa salva como rascunho!'
          : 'Lousa publicada com sucesso!';

      toast({
        title: '✅ Sucesso!',
        description: successMessage
      });

      if (!editData) {
        // Limpar formulário apenas no modo create
        setFormData({
          titulo: '',
          enunciado: '',
          turmas: [],
          permite_visitante: false,
          corretor_id: 'all',
          inicio_em: undefined,
          fim_em: undefined,
          capa_url: '',
          ativo: true
        });
        setActiveSection('capa');
      } else {
        // No modo edit, chamar onSuccess callback
        onSuccess?.();
      }
    } catch (error: unknown) {
      console.error('Erro ao salvar lousa:', error);

      let errorMessage = 'Erro desconhecido ao salvar lousa.';
      if (error instanceof Error) {
        if (error.message?.includes('row-level security')) {
          errorMessage = 'Erro de permissão: Verifique se você está logado como administrador.';
        } else if (error.message?.includes('not-null violation')) {
          errorMessage = 'Erro: Todos os campos obrigatórios devem ser preenchidos.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: '❌ Erro ao salvar',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="text-center py-4">Carregando dados da lousa...</div>;
  }

  const sections = [
    { id: 'capa', label: 'Capa' },
    { id: 'titulo', label: 'Título' },
    { id: 'enunciado', label: 'Enunciado' },
    { id: 'configuracao', label: 'Configuração' },
    { id: 'turmas', label: 'Turmas' },
  ];

  const toggleSection = (sectionId: string) => {
    setActiveSection(sectionId);
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
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAction('save')}
                disabled={loading}
                className="border-[#662F96] text-[#662F96] hover:bg-[#662F96] hover:text-white"
              >
                {loading && actionType === 'save' ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              <Button
                type="button"
                onClick={() => handleAction('publish')}
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading && actionType === 'publish' ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Capa Section */}
            {activeSection === 'capa' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Input
                  value={formData.capa_url}
                  onChange={(e) => setFormData({...formData, capa_url: e.target.value})}
                  className="text-sm"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Título Section */}
            {activeSection === 'titulo' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Enunciado Section */}
            {activeSection === 'enunciado' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Textarea
                  value={formData.enunciado}
                  onChange={(e) => setFormData({...formData, enunciado: e.target.value})}
                  className="text-sm min-h-[120px]"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Configuração Section */}
            {activeSection === 'configuracao' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-6">
                  {/* Corretor Responsável */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Corretor Responsável</label>
                    <Select
                      value={formData.corretor_id}
                      onValueChange={(value) => setFormData({...formData, corretor_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os corretores</SelectItem>
                        {corretores.map((corretor) => (
                          <SelectItem key={corretor.id} value={corretor.id}>
                            {corretor.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Período de Disponibilidade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Início</label>
                      <DateTimePicker
                        selected={formData.inicio_em}
                        onChange={(date) => setFormData({...formData, inicio_em: date})}
                        placeholder="Opcional"
                        minDate={new Date()}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Fim</label>
                      <DateTimePicker
                        selected={formData.fim_em}
                        onChange={(date) => setFormData({...formData, fim_em: date})}
                        placeholder="Opcional"
                        minDate={new Date()}
                      />
                    </div>
                  </div>

                  {/* Status Ativo */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Status Ativo</div>
                      <div className="text-xs text-gray-500">Lousa ativa pode ser acessada pelos alunos</div>
                    </div>
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Turmas Section */}
            {activeSection === 'turmas' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-6">
                  {/* Turmas Autorizadas */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Turmas Autorizadas</div>
                    <div className="grid grid-cols-3 gap-2">
                      {TURMAS.map((turma) => (
                        <div key={turma} className="flex items-center space-x-2">
                          <Checkbox
                            id={`turma-${turma}`}
                            checked={formData.turmas.includes(turma)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({...formData, turmas: [...formData.turmas, turma]});
                              } else {
                                setFormData({...formData, turmas: formData.turmas.filter(t => t !== turma)});
                              }
                            }}
                          />
                          <label htmlFor={`turma-${turma}`} className="text-sm font-medium">
                            Turma {turma}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permitir Visitantes */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Permitir Visitantes</div>
                      <div className="text-xs text-gray-500">Visitantes podem acessar esta lousa</div>
                    </div>
                    <Switch
                      checked={formData.permite_visitante}
                      onCheckedChange={(checked) => setFormData({...formData, permite_visitante: checked})}
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
}