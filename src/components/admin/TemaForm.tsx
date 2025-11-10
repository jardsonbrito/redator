
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ImageSelector } from './ImageSelector';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImageValue = {
  source: 'upload' | 'url';
  url?: string;
  file_path?: string;
  file_size?: number;
  dimensions?: { width: number; height: number };
} | null;

type ImagePosition = 'before' | 'after' | 'left' | 'right';

interface FormData {
  frase_tematica: string;
  eixo_tematico: string;
  texto_1: string;
  texto_2: string;
  texto_3: string;
  texto_4: string;
  cover: ImageValue;
  motivator1: ImageValue;
  motivator1Position: ImagePosition;
  motivator2: ImageValue;
  motivator2Position: ImagePosition;
  motivator3: ImageValue;
  motivator3Position: ImagePosition;
  motivator4: ImageValue;
  motivator4Position: ImagePosition;
  motivator5: ImageValue;
  motivator5Position: ImagePosition;
  // Scheduling fields
  enableScheduling: boolean;
  scheduledPublishAt?: Date;
}

type ActionType = 'save' | 'publish' | 'schedule';

interface TemaFormProps {
  mode?: 'create' | 'edit';
  temaId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const TemaForm = ({ mode = 'create', temaId, onCancel, onSuccess }: TemaFormProps) => {
  // All hooks must be at the top level and in the same order every render
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
  const [activeSection, setActiveSection] = useState<string>('capinha');
  const [actionType, setActionType] = useState<ActionType>('save');

  const [formData, setFormData] = useState<FormData>({
    frase_tematica: '',
    eixo_tematico: '',
    texto_1: '',
    texto_2: '',
    texto_3: '',
    texto_4: '',
    cover: null,
    motivator1: null,
    motivator1Position: 'after',
    motivator2: null,
    motivator2Position: 'after',
    motivator3: null,
    motivator3Position: 'after',
    motivator4: null,
    motivator4Position: 'after',
    motivator5: null,
    motivator5Position: 'after',
    enableScheduling: false,
    scheduledPublishAt: undefined
  });

  // Estado para armazenar dados originais do tema (para preservar datas de publicação)
  const [originalThemeData, setOriginalThemeData] = useState<any>(null);

  // First useEffect: Load existing theme data when in edit mode
  useEffect(() => {
    if (mode === 'edit' && temaId) {
      const loadTheme = async () => {
        try {
          const { data, error } = await supabase
            .from('temas')
            .select('*')
            .eq('id', temaId)
            .single();

          if (error) throw error;

          // Salvar dados originais para preservar datas de publicação
          setOriginalThemeData(data);

          // Pre-populate cover image
          let coverValue: ImageValue = null;
          if (data.cover_file_path) {
            coverValue = {
              source: 'upload',
              file_path: data.cover_file_path,
              file_size: data.cover_file_size,
              dimensions: data.cover_dimensions as { width: number; height: number } | undefined
            };
          } else if (data.cover_url) {
            coverValue = { source: 'url', url: data.cover_url };
          } else if (data.imagem_texto_4_url) {
            // Legacy fallback
            coverValue = { source: 'url', url: data.imagem_texto_4_url };
          }

          // Pre-populate motivator I
          let motivator1Value: ImageValue = null;
          if (data.motivator1_source !== 'none' && data.motivator1_source) {
            if (data.motivator1_file_path) {
              motivator1Value = {
                source: 'upload',
                file_path: data.motivator1_file_path,
                file_size: data.motivator1_file_size,
                dimensions: data.motivator1_dimensions as { width: number; height: number } | undefined
              };
            } else if (data.motivator1_url) {
              motivator1Value = { source: 'url', url: data.motivator1_url };
            }
          }

          // Pre-populate motivator II
          let motivator2Value: ImageValue = null;
          if (data.motivator2_source !== 'none' && data.motivator2_source) {
            if (data.motivator2_file_path) {
              motivator2Value = {
                source: 'upload',
                file_path: data.motivator2_file_path,
                file_size: data.motivator2_file_size,
                dimensions: data.motivator2_dimensions as { width: number; height: number } | undefined
              };
            } else if (data.motivator2_url) {
              motivator2Value = { source: 'url', url: data.motivator2_url };
            }
          }

          // Pre-populate motivator III
          let motivator3Value: ImageValue = null;
          if (data.motivator3_source !== 'none' && data.motivator3_source) {
            if (data.motivator3_file_path) {
              motivator3Value = {
                source: 'upload',
                file_path: data.motivator3_file_path,
                file_size: data.motivator3_file_size,
                dimensions: data.motivator3_dimensions as { width: number; height: number } | undefined
              };
            } else if (data.motivator3_url) {
              motivator3Value = { source: 'url', url: data.motivator3_url };
            }
          }

          // Pre-populate motivator IV
          let motivator4Value: ImageValue = null;
          if (data.motivator4_source !== 'none' && data.motivator4_source) {
            if (data.motivator4_file_path) {
              motivator4Value = {
                source: 'upload',
                file_path: data.motivator4_file_path,
                file_size: data.motivator4_file_size,
                dimensions: data.motivator4_dimensions as { width: number; height: number } | undefined
              };
            } else if (data.motivator4_url) {
              motivator4Value = { source: 'url', url: data.motivator4_url };
            }
          }

          // Pre-populate motivator V
          let motivator5Value: ImageValue = null;
          if (data.motivator5_source !== 'none' && data.motivator5_source) {
            if (data.motivator5_file_path) {
              motivator5Value = {
                source: 'upload',
                file_path: data.motivator5_file_path,
                file_size: data.motivator5_file_size,
                dimensions: data.motivator5_dimensions as { width: number; height: number } | undefined
              };
            } else if (data.motivator5_url) {
              motivator5Value = { source: 'url', url: data.motivator5_url };
            }
          }

          setFormData({
            frase_tematica: data.frase_tematica || '',
            eixo_tematico: data.eixo_tematico || '',
            texto_1: data.texto_1 || '',
            texto_2: data.texto_2 || '',
            texto_3: data.texto_3 || '',
            texto_4: data.texto_4 || '',
            cover: coverValue,
            motivator1: motivator1Value,
            motivator1Position: (data.motivator1_image_position as ImagePosition) || 'after',
            motivator2: motivator2Value,
            motivator2Position: (data.motivator2_image_position as ImagePosition) || 'after',
            motivator3: motivator3Value,
            motivator3Position: (data.motivator3_image_position as ImagePosition) || 'after',
            motivator4: motivator4Value,
            motivator4Position: (data.motivator4_image_position as ImagePosition) || 'after',
            motivator5: motivator5Value,
            motivator5Position: (data.motivator5_image_position as ImagePosition) || 'after',
            enableScheduling: !!data.scheduled_publish_at,
            scheduledPublishAt: data.scheduled_publish_at ? new Date(data.scheduled_publish_at) : undefined
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          toast({
            title: "❌ Erro",
            description: "Erro ao carregar tema: " + errorMessage,
            variant: "destructive",
          });
        } finally {
          setLoadingData(false);
        }
      };

      loadTheme();
    }
  }, [mode, temaId, toast]);

  // Second useEffect: Open first section after data loads in edit mode
  useEffect(() => {
    if (mode === 'edit' && !loadingData) {
      setActiveSection('capinha');
    }
  }, [mode, loadingData]);

  const handleAction = async (action: ActionType) => {
    setActionType(action);

    // Validate cover image is required only for create mode
    if (mode === 'create' && !formData.cover) {
      toast({
        title: "❌ Campo obrigatório",
        description: "Selecione um arquivo de imagem ou informe uma URL para a capinha.",
        variant: "destructive",
      });
      setActiveSection('capinha');
      return;
    }

    // Validate required fields for publishing
    if (action === 'publish' || action === 'schedule') {
      if (!formData.frase_tematica.trim()) {
        toast({
          title: "❌ Campo obrigatório",
          description: "Frase temática é obrigatória para publicação.",
          variant: "destructive",
        });
        setActiveSection('frase');
        return;
      }

      if (!formData.eixo_tematico.trim()) {
        toast({
          title: "❌ Campo obrigatório",
          description: "Eixo temático é obrigatório para publicação.",
          variant: "destructive",
        });
        setActiveSection('eixo');
        return;
      }
    }

    // Validate scheduling date if scheduling
    if (action === 'schedule') {
      if (!formData.scheduledPublishAt) {
        toast({
          title: "❌ Data obrigatória",
          description: "Selecione data e horário para publicação agendada.",
          variant: "destructive",
        });
        setActiveSection('agendamento');
        return;
      }

      if (formData.scheduledPublishAt <= new Date()) {
        toast({
          title: "❌ Data inválida",
          description: "A data de publicação deve ser no futuro.",
          variant: "destructive",
        });
        setActiveSection('agendamento');
        return;
      }
    }

    setLoading(true);

    try {
      console.log('Tentando salvar tema no Supabase:', formData);

      // Verificar se o usuário está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Sessão atual:', session);
      
      if (sessionError) {
        console.error('Erro ao verificar sessão:', sessionError);
        throw new Error('Erro de autenticação: ' + sessionError.message);
      }

      if (!session) {
        throw new Error('Usuário não está autenticado. Faça login novamente.');
      }

      // Generate ENEM header with highlighted theme
      const cabecalho_enem = `Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "${formData.frase_tematica}", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.`;

      // Determine status based on action type
      let status = 'rascunho';
      if (action === 'publish') {
        status = 'publicado';
      }
      // Note: For scheduling, we keep status as 'rascunho' and use scheduled_publish_at field

      // Preparar dados com nova estrutura - apenas texto limpo, sem HTML
      const dataToSave: Record<string, unknown> = {
        frase_tematica: String(formData.frase_tematica || '').trim(),
        eixo_tematico: String(formData.eixo_tematico || '').trim(),
        status: status,
        cabecalho_enem: cabecalho_enem,
        texto_1: formData.texto_1 ? String(formData.texto_1).trim() : null,
        texto_2: formData.texto_2 ? String(formData.texto_2).trim() : null,
        texto_3: formData.texto_3 ? String(formData.texto_3).trim() : null,
        texto_4: formData.texto_4 ? String(formData.texto_4).trim() : null,
        // Cover image fields
        cover_source: formData.cover?.source || 'url',
        cover_url: formData.cover?.url || null,
        cover_file_path: formData.cover?.file_path || null,
        cover_file_size: formData.cover?.file_size || null,
        cover_dimensions: formData.cover?.dimensions || null,
        // Motivator 1 fields
        motivator1_source: formData.motivator1?.source || 'none',
        motivator1_url: formData.motivator1?.url || null,
        motivator1_file_path: formData.motivator1?.file_path || null,
        motivator1_file_size: formData.motivator1?.file_size || null,
        motivator1_dimensions: formData.motivator1?.dimensions || null,
        motivator1_image_position: formData.motivator1Position,
        // Motivator 2 fields
        motivator2_source: formData.motivator2?.source || 'none',
        motivator2_url: formData.motivator2?.url || null,
        motivator2_file_path: formData.motivator2?.file_path || null,
        motivator2_file_size: formData.motivator2?.file_size || null,
        motivator2_dimensions: formData.motivator2?.dimensions || null,
        motivator2_image_position: formData.motivator2Position,
        // Motivator 3 fields
        motivator3_source: formData.motivator3?.source || 'none',
        motivator3_url: formData.motivator3?.url || null,
        motivator3_file_path: formData.motivator3?.file_path || null,
        motivator3_file_size: formData.motivator3?.file_size || null,
        motivator3_dimensions: formData.motivator3?.dimensions || null,
        motivator3_image_position: formData.motivator3Position,
        // Motivator 4 fields
        motivator4_source: formData.motivator4?.source || 'none',
        motivator4_url: formData.motivator4?.url || null,
        motivator4_file_path: formData.motivator4?.file_path || null,
        motivator4_file_size: formData.motivator4?.file_size || null,
        motivator4_dimensions: formData.motivator4?.dimensions || null,
        motivator4_image_position: formData.motivator4Position,
        // Motivator 5 fields
        motivator5_source: formData.motivator5?.source || 'none',
        motivator5_url: formData.motivator5?.url || null,
        motivator5_file_path: formData.motivator5?.file_path || null,
        motivator5_file_size: formData.motivator5?.file_size || null,
        motivator5_dimensions: formData.motivator5?.dimensions || null,
        motivator5_image_position: formData.motivator5Position,
        // Scheduling fields
        scheduled_publish_at: action === 'schedule' && formData.scheduledPublishAt
          ? formData.scheduledPublishAt.toISOString()
          : null,
        scheduled_by: action === 'schedule' && formData.scheduledPublishAt
          ? session.user.id
          : null,
        // Set published_at when publishing immediately (apenas para novos temas)
        published_at: action === 'publish'
          ? (mode === 'edit' && originalThemeData?.published_at
              ? originalThemeData.published_at  // Preservar data original
              : new Date().toISOString()        // Nova data para temas novos
            )
          : (mode === 'edit' && originalThemeData?.published_at
              ? originalThemeData.published_at  // Preservar data original mesmo em rascunho
              : null
            ),
      };

      if (mode === 'create') {
        dataToSave.publicado_em = new Date().toISOString();
      } else if (mode === 'edit' && originalThemeData?.publicado_em) {
        // Preservar data original de publicação para temas editados
        dataToSave.publicado_em = originalThemeData.publicado_em;
      }

      console.log('Dados preparados para salvar:', dataToSave);

      // Salvar no Supabase (create ou update)
      const { data, error } = mode === 'create' 
        ? await supabase.from('temas').insert([dataToSave]).select('*').single()
        : await supabase.from('temas').update(dataToSave).eq('id', temaId).select('*').single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        console.error('Código do erro:', error.code);
        console.error('Detalhes do erro:', error.details);
        console.error('Dica do erro:', error.hint);
        throw error;
      }

      console.log('Tema salvo com sucesso no Supabase:', data);

      // Invalidar e recarregar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['temas'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-temas'] }),
        queryClient.refetchQueries({ queryKey: ['temas'] }),
        ...(temaId ? [queryClient.invalidateQueries({ queryKey: ['tema', temaId] })] : [])
      ]);

      let successMessage = '';
      if (mode === 'create') {
        if (action === 'save') {
          successMessage = 'Tema salvo como rascunho!';
        } else if (action === 'publish') {
          successMessage = 'Tema publicado com sucesso!';
        } else if (action === 'schedule') {
          successMessage = 'Tema agendado para publicação automática!';
        }
      } else {
        successMessage = 'Tema atualizado com sucesso!';
      }

      toast({
        title: "✅ Sucesso!",
        description: successMessage,
      });

      if (mode === 'create') {
        // Limpar formulário apenas no modo create
        setFormData({
          frase_tematica: '',
          eixo_tematico: '',
          texto_1: '',
          texto_2: '',
          texto_3: '',
          texto_4: '',
          cover: null,
          motivator1: null,
          motivator1Position: 'after',
          motivator2: null,
          motivator2Position: 'after',
          motivator3: null,
          motivator3Position: 'after',
          motivator4: null,
          motivator4Position: 'after',
          motivator5: null,
          motivator5Position: 'after',
          enableScheduling: false,
          scheduledPublishAt: undefined
        });
        setActiveSection('capinha');
      } else {
        // No modo edit, chamar onSuccess callback
        onSuccess?.();
      }

    } catch (error: unknown) {
      console.error('Erro completo ao salvar tema:', error);

      let errorMessage = 'Erro desconhecido ao salvar tema.';

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
        title: "❌ Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="text-center py-4">Carregando dados do tema...</div>;
  }

  const sections = [
    { id: 'capinha', label: 'Capinha' },
    { id: 'frase', label: 'Frase Temática' },
    { id: 'eixo', label: 'Eixo Temático' },
    { id: 'agendamento', label: 'Agendamento' },
    { id: 'motivador1', label: 'Texto Motivador I' },
    { id: 'motivador2', label: 'Texto Motivador II' },
    { id: 'motivador3', label: 'Texto Motivador III' },
    { id: 'motivador4', label: 'Texto Motivador IV' },
    { id: 'motivador5', label: 'Texto Motivador V' },
  ];

  const toggleSection = (sectionId: string) => {
    // Always switch to the clicked section (don't allow closing all sections)
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
                {loading && actionType === 'save' ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                type="button"
                onClick={() => handleAction('publish')}
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading && actionType === 'publish' ? 'Publicando...' : 'Publicar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAction('schedule')}
                disabled={loading}
                className="border-[#3F0077] text-[#3F0077] hover:bg-[#3F0077] hover:text-white"
              >
                {loading && actionType === 'schedule' ? 'Agendando...' : 'Agendar'}
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Show default section if no section is active */}
            {!activeSection && (
              <div className="text-center py-8">
                <p className="text-gray-600">Selecione uma seção acima para começar a editar.</p>
              </div>
            )}
            {/* Capinha Section */}
            {activeSection === 'capinha' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <ImageSelector
                  title=""
                  description=""
                  required={true}
                  value={formData.cover}
                  onChange={(value) => setFormData({...formData, cover: value})}
                  minDimensions={{ width: 300, height: 200 }}
                  bucket="themes"
                />
              </div>
            )}

            {/* Frase Temática Section */}
            {activeSection === 'frase' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Input
                  value={formData.frase_tematica}
                  onChange={(e) => setFormData({...formData, frase_tematica: e.target.value})}
                  className="text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Eixo Temático Section */}
            {activeSection === 'eixo' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Input
                  value={formData.eixo_tematico}
                  onChange={(e) => setFormData({...formData, eixo_tematico: e.target.value})}
                  className="text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Agendamento Section */}
            {activeSection === 'agendamento' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-scheduling"
                      checked={formData.enableScheduling}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          enableScheduling: checked as boolean,
                          scheduledPublishAt: checked ? formData.scheduledPublishAt : undefined
                        })
                      }
                    />
                    <label htmlFor="enable-scheduling" className="text-sm font-medium">Agendar publicação</label>
                  </div>

                  {formData.enableScheduling && (
                    <div>
                      <Input
                        type="datetime-local"
                        value={formData.scheduledPublishAt ?
                          new Date(formData.scheduledPublishAt.getTime() - formData.scheduledPublishAt.getTimezoneOffset() * 60000)
                            .toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          setFormData({...formData, scheduledPublishAt: date});
                        }}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Texto Motivador I */}
            {activeSection === 'motivador1' && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Texto Verbal</h3>
                  <Textarea
                    value={formData.texto_1}
                    onChange={(e) => setFormData({...formData, texto_1: e.target.value})}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="Digite o primeiro texto motivador. Use quebras de linha simples para separar parágrafos."
                    spellCheck={true}
                  />
                </div>

                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Imagem (Opcional)</h3>
                  <ImageSelector
                    title=""
                    description=""
                    required={false}
                    value={formData.motivator1}
                    onChange={(value) => setFormData({...formData, motivator1: value})}
                    minDimensions={{ width: 200, height: 150 }}
                    bucket="themes"
                  />

                  {formData.motivator1 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Posição da Imagem</label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator1Position"
                            value="before"
                            checked={formData.motivator1Position === 'before'}
                            onChange={(e) => setFormData({...formData, motivator1Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Antes do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator1Position"
                            value="after"
                            checked={formData.motivator1Position === 'after'}
                            onChange={(e) => setFormData({...formData, motivator1Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Depois do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator1Position"
                            value="left"
                            checked={formData.motivator1Position === 'left'}
                            onChange={(e) => setFormData({...formData, motivator1Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À esquerda do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator1Position"
                            value="right"
                            checked={formData.motivator1Position === 'right'}
                            onChange={(e) => setFormData({...formData, motivator1Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À direita do texto</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Texto Motivador II */}
            {activeSection === 'motivador2' && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Texto Verbal</h3>
                  <Textarea
                    value={formData.texto_2}
                    onChange={(e) => setFormData({...formData, texto_2: e.target.value})}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="Digite o segundo texto motivador. Use quebras de linha simples para separar parágrafos."
                    spellCheck={true}
                  />
                </div>

                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Imagem (Opcional)</h3>
                  <ImageSelector
                    title=""
                    description=""
                    required={false}
                    value={formData.motivator2}
                    onChange={(value) => setFormData({...formData, motivator2: value})}
                    minDimensions={{ width: 200, height: 150 }}
                    bucket="themes"
                  />

                  {formData.motivator2 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Posição da Imagem</label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator2Position"
                            value="before"
                            checked={formData.motivator2Position === 'before'}
                            onChange={(e) => setFormData({...formData, motivator2Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Antes do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator2Position"
                            value="after"
                            checked={formData.motivator2Position === 'after'}
                            onChange={(e) => setFormData({...formData, motivator2Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Depois do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator2Position"
                            value="left"
                            checked={formData.motivator2Position === 'left'}
                            onChange={(e) => setFormData({...formData, motivator2Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À esquerda do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator2Position"
                            value="right"
                            checked={formData.motivator2Position === 'right'}
                            onChange={(e) => setFormData({...formData, motivator2Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À direita do texto</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Texto Motivador III */}
            {activeSection === 'motivador3' && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Texto Verbal</h3>
                  <Textarea
                    value={formData.texto_3}
                    onChange={(e) => setFormData({...formData, texto_3: e.target.value})}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="Digite o terceiro texto motivador. Use quebras de linha simples para separar parágrafos."
                    spellCheck={true}
                  />
                </div>

                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Imagem (Opcional)</h3>
                  <ImageSelector
                    title=""
                    description=""
                    required={false}
                    value={formData.motivator3}
                    onChange={(value) => setFormData({...formData, motivator3: value})}
                    minDimensions={{ width: 200, height: 150 }}
                    bucket="themes"
                  />

                  {formData.motivator3 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Posição da Imagem</label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator3Position"
                            value="before"
                            checked={formData.motivator3Position === 'before'}
                            onChange={(e) => setFormData({...formData, motivator3Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Antes do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator3Position"
                            value="after"
                            checked={formData.motivator3Position === 'after'}
                            onChange={(e) => setFormData({...formData, motivator3Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Depois do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator3Position"
                            value="left"
                            checked={formData.motivator3Position === 'left'}
                            onChange={(e) => setFormData({...formData, motivator3Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À esquerda do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator3Position"
                            value="right"
                            checked={formData.motivator3Position === 'right'}
                            onChange={(e) => setFormData({...formData, motivator3Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À direita do texto</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Texto Motivador IV */}
            {activeSection === 'motivador4' && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Texto Verbal</h3>
                  <Textarea
                    value={formData.texto_4}
                    onChange={(e) => setFormData({...formData, texto_4: e.target.value})}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="Digite o quarto texto motivador. Use quebras de linha simples para separar parágrafos."
                    spellCheck={true}
                  />
                </div>

                <div className="border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Imagem (Opcional)</h3>
                  <ImageSelector
                    title=""
                    description=""
                    required={false}
                    value={formData.motivator4}
                    onChange={(value) => setFormData({...formData, motivator4: value})}
                    minDimensions={{ width: 200, height: 150 }}
                    bucket="themes"
                  />

                  {formData.motivator4 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Posição da Imagem</label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator4Position"
                            value="before"
                            checked={formData.motivator4Position === 'before'}
                            onChange={(e) => setFormData({...formData, motivator4Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Antes do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator4Position"
                            value="after"
                            checked={formData.motivator4Position === 'after'}
                            onChange={(e) => setFormData({...formData, motivator4Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">Depois do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator4Position"
                            value="left"
                            checked={formData.motivator4Position === 'left'}
                            onChange={(e) => setFormData({...formData, motivator4Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À esquerda do texto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="motivator4Position"
                            value="right"
                            checked={formData.motivator4Position === 'right'}
                            onChange={(e) => setFormData({...formData, motivator4Position: e.target.value as ImagePosition})}
                            className="mr-2"
                          />
                          <span className="text-sm">À direita do texto</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Texto Motivador V */}
            {activeSection === 'motivador5' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <h3 className="text-sm font-medium mb-3">Imagem (Opcional)</h3>
                <ImageSelector
                  title=""
                  description=""
                  required={false}
                  value={formData.motivator5}
                  onChange={(value) => setFormData({...formData, motivator5: value})}
                  minDimensions={{ width: 200, height: 150 }}
                  bucket="themes"
                />

                {formData.motivator5 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Posição da Imagem</label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="motivator5Position"
                          value="before"
                          checked={formData.motivator5Position === 'before'}
                          onChange={(e) => setFormData({...formData, motivator5Position: e.target.value as ImagePosition})}
                          className="mr-2"
                        />
                        <span className="text-sm">Antes do texto</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="motivator5Position"
                          value="after"
                          checked={formData.motivator5Position === 'after'}
                          onChange={(e) => setFormData({...formData, motivator5Position: e.target.value as ImagePosition})}
                          className="mr-2"
                        />
                        <span className="text-sm">Depois do texto</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="motivator5Position"
                          value="left"
                          checked={formData.motivator5Position === 'left'}
                          onChange={(e) => setFormData({...formData, motivator5Position: e.target.value as ImagePosition})}
                          className="mr-2"
                        />
                        <span className="text-sm">À esquerda do texto</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="motivator5Position"
                          value="right"
                          checked={formData.motivator5Position === 'right'}
                          onChange={(e) => setFormData({...formData, motivator5Position: e.target.value as ImagePosition})}
                          className="mr-2"
                        />
                        <span className="text-sm">À direita do texto</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Loading indicator */}
            {loading && (
              <div className="text-center space-y-2 p-4">
                <p className="text-sm text-gray-600" aria-live="polite">
                  Conectando com Supabase e salvando dados...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[#3F0077] h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

