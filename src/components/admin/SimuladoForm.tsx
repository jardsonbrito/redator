import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { TODAS_TURMAS, formatTurmaDisplay } from '@/utils/turmaUtils';

interface SimuladoEditando {
  id: string;
  titulo: string;
  tema_id?: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
  ativo?: boolean;
}

interface SimuladoFormProps {
  mode?: 'create' | 'edit';
  simuladoEditando?: SimuladoEditando | null;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
}

export const SimuladoForm = ({ mode = 'create', simuladoEditando, onSuccess, onCancelEdit }: SimuladoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
  const [activeSection, setActiveSection] = useState<string>('titulo');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    titulo: '',
    tema_id: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    turmas_autorizadas: [] as string[],
    permite_visitante: false,
    ativo: true
  });

  const [buscaTema, setBuscaTema] = useState('');

  // Buscar temas disponíveis (incluindo rascunhos para uso em simulados)
  const { data: temas, isLoading: loadingTemas } = useQuery({
    queryKey: ['admin-temas-simulado', buscaTema],
    queryFn: async () => {
      let query = supabase
        .from('temas')
        .select('*')
        .order('publicado_em', { ascending: false });

      if (buscaTema) {
        query = query.ilike('frase_tematica', `%${buscaTema}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (mode === 'edit' && simuladoEditando) {
      const loadSimuladoData = async () => {
        try {
          setFormData({
            titulo: simuladoEditando.titulo || '',
            tema_id: simuladoEditando.tema_id || '',
            data_inicio: simuladoEditando.data_inicio || '',
            hora_inicio: simuladoEditando.hora_inicio || '',
            data_fim: simuladoEditando.data_fim || '',
            hora_fim: simuladoEditando.hora_fim || '',
            turmas_autorizadas: simuladoEditando.turmas_autorizadas || [],
            permite_visitante: simuladoEditando.permite_visitante || false,
            ativo: simuladoEditando.ativo !== false
          });

          // Se tem tema_id, buscar o tema para mostrar na busca
          if (simuladoEditando.tema_id && temas && temas.length > 0) {
            const tema = temas.find(t => t.id === simuladoEditando.tema_id);
            if (tema) {
              setBuscaTema(tema.frase_tematica);
            }
          }
        } catch (error: any) {
          toast({
            title: "❌ Erro",
            description: "Erro ao carregar dados do simulado: " + error.message,
            variant: "destructive",
          });
        } finally {
          setLoadingData(false);
        }
      };

      loadSimuladoData();
    }
  }, [simuladoEditando, temas, mode, toast]);

  const temaEscolhido = temas?.find(tema => tema.id === formData.tema_id);

  // Turmas geradas dinamicamente a partir do utils
  const turmasDisponiveis = TODAS_TURMAS.map(turma => formatTurmaDisplay(turma));

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: [...prev.turmas_autorizadas, turma]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: prev.turmas_autorizadas.filter(t => t !== turma)
      }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.tema_id) {
      toast({
        title: "Erro",
        description: "Selecione um tema para o simulado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dataToInsert = {
        titulo: formData.titulo || 'Simulado', // Valor padrão se opcional não preenchido
        tema_id: formData.tema_id,
        frase_tematica: temaEscolhido?.frase_tematica || '',
        data_inicio: formData.data_inicio,
        hora_inicio: formData.hora_inicio,
        data_fim: formData.data_fim,
        hora_fim: formData.hora_fim,
        turmas_autorizadas: formData.turmas_autorizadas,
        permite_visitante: formData.permite_visitante,
        ativo: true // Todos os simulados são criados como ativos
      };

      let error;

      if (simuladoEditando) {
        // Atualizar simulado existente
        const result = await supabase
          .from('simulados')
          .update(dataToInsert)
          .eq('id', simuladoEditando.id);
        error = result.error;
      } else {
        // Criar novo simulado
        const result = await supabase
          .from('simulados')
          .insert([dataToInsert]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: simuladoEditando ? "✅ Simulado atualizado!" : "✅ Simulado criado!",
        description: simuladoEditando ? "O simulado foi atualizado com sucesso." : "O simulado foi cadastrado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });

      if (onSuccess) {
        onSuccess();
      }

      // Limpar formulário se não estiver editando
      if (!simuladoEditando) {
        setFormData({
          titulo: '',
          tema_id: '',
          data_inicio: '',
          hora_inicio: '',
          data_fim: '',
          hora_fim: '',
          turmas_autorizadas: [],
          permite_visitante: false,
          ativo: true
        });
        setBuscaTema('');
      }

    } catch (error: any) {
      console.error('Erro ao criar simulado:', error);
      toast({
        title: "❌ Erro ao criar simulado",
        description: error.message || "Não foi possível criar o simulado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'titulo', label: 'Título' },
    { id: 'tema', label: 'Seleção de Tema' },
    { id: 'periodo', label: 'Período' },
    { id: 'configuracao', label: 'Configuração' },
    { id: 'turmas', label: 'Turmas' },
  ];

  const toggleSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  if (loadingData) {
    return <div className="text-center py-4">Carregando dados...</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7f7fb' }}>
      <div className="max-w-6xl mx-auto p-5">
        {/* Back button for edit mode */}
        {mode === 'edit' && onCancelEdit && (
          <div className="mb-4">
            <Button variant="outline" onClick={onCancelEdit} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        )}

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
                      ? "text-white bg-[#662F96]"
                      : "text-white bg-[#B175FF] hover:bg-[#662F96]"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading ? 'Salvando...' : (mode === 'edit' ? 'Salvar Alterações' : 'Criar Simulado')}
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

            {/* Seleção de Tema Section */}
            {activeSection === 'tema' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                <div>
                  <Input
                    value={buscaTema}
                    onChange={(e) => setBuscaTema(e.target.value)}
                    className="text-sm"
                    spellCheck={true}
                  />
                </div>

                {loadingTemas ? (
                  <div className="text-sm text-gray-500">Carregando temas...</div>
                ) : (
                  <Select value={formData.tema_id} onValueChange={(value) => setFormData({...formData, tema_id: value})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {temas?.map((tema) => (
                        <SelectItem key={tema.id} value={tema.id}>
                          <div className="flex items-center gap-2">
                            <span className="truncate">{tema.frase_tematica}</span>
                            <Badge variant={tema.status === 'rascunho' ? 'secondary' : 'default'} className="text-xs">
                              {tema.status === 'rascunho' ? 'Rascunho' : 'Publicado'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {temaEscolhido && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Tema Selecionado:</h4>
                    <p className="text-sm text-gray-700 mb-2">{temaEscolhido.frase_tematica}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={temaEscolhido.status === 'rascunho' ? 'secondary' : 'default'}>
                        {temaEscolhido.status === 'rascunho' ? 'Rascunho' : 'Publicado'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Eixo: {temaEscolhido.eixo_tematico}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Período Section */}
            {activeSection === 'periodo' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="time"
                        value={formData.hora_inicio}
                        onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="date"
                        value={formData.data_fim}
                        onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="time"
                        value={formData.hora_fim}
                        onChange={(e) => setFormData({...formData, hora_fim: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configuração Section */}
            {activeSection === 'configuracao' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="permiteVisitante"
                    checked={formData.permite_visitante}
                    onCheckedChange={(checked) => setFormData(prev => ({...prev, permite_visitante: checked as boolean}))}
                  />
                  <Label htmlFor="permiteVisitante" className="text-sm">
                    Permite visitante
                  </Label>
                </div>
              </div>
            )}

            {/* Turmas Section */}
            {activeSection === 'turmas' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {turmasDisponiveis.map((turma) => (
                    <div key={turma} className="flex items-center space-x-2">
                      <Checkbox
                        id={turma}
                        checked={formData.turmas_autorizadas.includes(turma)}
                        onCheckedChange={(checked) => handleTurmaChange(turma, checked as boolean)}
                      />
                      <Label htmlFor={turma} className="text-sm">
                        {turma}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="text-center space-y-2 p-4">
                <p className="text-sm text-gray-600" aria-live="polite">
                  Salvando simulado...
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