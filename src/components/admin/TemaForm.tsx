
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

interface FormData {
  frase_tematica: string;
  eixo_tematico: string;
  texto_1: string;
  texto_2: string;
  texto_3: string;
  cover: ImageValue;
  motivator4: ImageValue;
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
    cover: null,
    motivator4: null,
    enableScheduling: false,
    scheduledPublishAt: undefined
  });

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

          setFormData({
            frase_tematica: data.frase_tematica || '',
            eixo_tematico: data.eixo_tematico || '',
            texto_1: data.texto_1 || '',
            texto_2: data.texto_2 || '',
            texto_3: data.texto_3 || '',
            cover: coverValue,
            motivator4: motivator4Value,
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

      // Preparar dados com nova estrutura
      const dataToSave: Record<string, unknown> = {
        frase_tematica: String(formData.frase_tematica || '').trim(),
        eixo_tematico: String(formData.eixo_tematico || '').trim(),
        status: status,
        cabecalho_enem: cabecalho_enem,
        texto_1: formData.texto_1 ? String(formData.texto_1).trim() : null,
        texto_2: formData.texto_2 ? String(formData.texto_2).trim() : null,
        texto_3: formData.texto_3 ? String(formData.texto_3).trim() : null,
        // Cover image fields
        cover_source: formData.cover?.source || 'url',
        cover_url: formData.cover?.url || null,
        cover_file_path: formData.cover?.file_path || null,
        cover_file_size: formData.cover?.file_size || null,
        cover_dimensions: formData.cover?.dimensions || null,
        // Motivator 4 fields
        motivator4_source: formData.motivator4?.source || 'none',
        motivator4_url: formData.motivator4?.url || null,
        motivator4_file_path: formData.motivator4?.file_path || null,
        motivator4_file_size: formData.motivator4?.file_size || null,
        motivator4_dimensions: formData.motivator4?.dimensions || null,
        // Scheduling fields
        scheduled_publish_at: action === 'schedule' && formData.scheduledPublishAt
          ? formData.scheduledPublishAt.toISOString()
          : null,
        scheduled_by: action === 'schedule' && formData.scheduledPublishAt
          ? session.user.id
          : null,
        // Set published_at when publishing immediately
        published_at: action === 'publish'
          ? new Date().toISOString()
          : null,
      };

      if (mode === 'create') {
        dataToSave.publicado_em = new Date().toISOString();
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
          cover: null,
          motivator4: null,
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
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Textarea
                  value={formData.texto_1}
                  onChange={(e) => setFormData({...formData, texto_1: e.target.value})}
                  className="min-h-[120px] text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Texto Motivador II */}
            {activeSection === 'motivador2' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Textarea
                  value={formData.texto_2}
                  onChange={(e) => setFormData({...formData, texto_2: e.target.value})}
                  className="min-h-[120px] text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Texto Motivador III */}
            {activeSection === 'motivador3' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Textarea
                  value={formData.texto_3}
                  onChange={(e) => setFormData({...formData, texto_3: e.target.value})}
                  className="min-h-[120px] text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Texto Motivador IV */}
            {activeSection === 'motivador4' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <ImageSelector
                  title=""
                  description=""
                  required={false}
                  value={formData.motivator4}
                  onChange={(value) => setFormData({...formData, motivator4: value})}
                  minDimensions={{ width: 200, height: 150 }}
                  bucket="themes"
                />
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

// Export a component for theme rendering with justified text and paragraph indentation
interface TemaRenderProps {
  tema: {
    frase_tematica: string;
    texto_1?: string;
    texto_2?: string;
    texto_3?: string;
    motivator4_url?: string;
  };
}

export const TemaRender = ({ tema }: TemaRenderProps) => {
  return (
    <div className="tema-render">
      <style>{`
        .tema-render p {
          text-align: justify;
          text-indent: 2em;
          margin-bottom: 1em;
        }
        .tema-render .tema-destaque {
          color: #3F0077;
          font-weight: 700;
        }
      `}</style>

      <div className="cabecalho-enem mb-6 p-4 border rounded">
        <p>
          Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema{' '}
          <span className="tema-destaque">"{tema.frase_tematica}"</span>, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
        </p>
      </div>

      {/* Render theme content with justified paragraphs */}
      {tema.texto_1 && (
        <div className="texto-motivador mb-4">
          <h4 className="font-semibold mb-2">Texto Motivador I</h4>
          <div dangerouslySetInnerHTML={{ __html: tema.texto_1 }} />
        </div>
      )}

      {tema.texto_2 && (
        <div className="texto-motivador mb-4">
          <h4 className="font-semibold mb-2">Texto Motivador II</h4>
          <div dangerouslySetInnerHTML={{ __html: tema.texto_2 }} />
        </div>
      )}

      {tema.texto_3 && (
        <div className="texto-motivador mb-4">
          <h4 className="font-semibold mb-2">Texto Motivador III</h4>
          <div dangerouslySetInnerHTML={{ __html: tema.texto_3 }} />
        </div>
      )}

      {tema.motivator4_url && (
        <div className="texto-motivador mb-4">
          <h4 className="font-semibold mb-2">Texto Motivador IV</h4>
          <img src={tema.motivator4_url} alt="Texto Motivador IV" className="max-w-full h-auto" />
        </div>
      )}
    </div>
  );
};
