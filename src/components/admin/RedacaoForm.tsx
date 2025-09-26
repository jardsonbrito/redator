import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RedacaoFormProps {
  mode?: 'create' | 'edit';
  redacaoId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const RedacaoForm = ({ mode = 'create', redacaoId, onCancel, onSuccess }: RedacaoFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
  const [activeSection, setActiveSection] = useState<string>('imagem');

  const [formData, setFormData] = useState({
    frase_tematica: '',
    eixo_tematico: '',
    conteudo: '',
    pdf_url: '',
    dica_de_escrita: '',
    autor: '',
    foto_autor: ''
  });

  useEffect(() => {
    if (mode === 'edit' && redacaoId) {
      const fetchRedacao = async () => {
        try {
          const { data, error } = await supabase
            .from('redacoes')
            .select('*')
            .eq('id', redacaoId)
            .single();

          if (error) throw error;

          setFormData({
            frase_tematica: data.frase_tematica || '',
            eixo_tematico: data.eixo_tematico || '',
            conteudo: data.conteudo || '',
            pdf_url: data.pdf_url || '',
            dica_de_escrita: data.dica_de_escrita || '',
            autor: data.autor || '',
            foto_autor: data.foto_autor || ''
          });
        } catch (error: any) {
          toast({
            title: "❌ Erro",
            description: "Erro ao carregar dados da redação: " + error.message,
            variant: "destructive",
          });
        } finally {
          setLoadingData(false);
        }
      };

      fetchRedacao();
    }
  }, [redacaoId, toast, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'edit' && redacaoId) {
        const { error } = await supabase
          .from('redacoes')
          .update({
            frase_tematica: formData.frase_tematica.trim(),
            eixo_tematico: formData.eixo_tematico.trim(),
            conteudo: formData.conteudo.trim(),
            pdf_url: formData.pdf_url.trim() || null,
            dica_de_escrita: formData.dica_de_escrita.trim() || null,
            autor: formData.autor.trim() || null,
            foto_autor: formData.foto_autor.trim() || null,
          })
          .eq('id', redacaoId);

        if (error) throw error;

        toast({
          title: "✅ Sucesso!",
          description: "Redação atualizada com sucesso.",
        });
      } else {
        // Create new redacao
        const { error } = await supabase
          .from('redacoes')
          .insert([{
            frase_tematica: formData.frase_tematica.trim(),
            eixo_tematico: formData.eixo_tematico.trim(),
            conteudo: formData.conteudo.trim(),
            pdf_url: formData.pdf_url.trim() || null,
            dica_de_escrita: formData.dica_de_escrita.trim() || null,
            autor: formData.autor.trim() || null,
            foto_autor: formData.foto_autor.trim() || null,
            nota_total: 1000, // Redação exemplar
            data_envio: new Date().toISOString()
          }]);

        if (error) throw error;

        toast({
          title: "✅ Sucesso!",
          description: "Redação exemplar criada com sucesso.",
        });

        // Clear form
        setFormData({
          frase_tematica: '',
          eixo_tematico: '',
          conteudo: '',
          pdf_url: '',
          dica_de_escrita: '',
          autor: '',
          foto_autor: ''
        });
      }

      onSuccess && onSuccess();
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'imagem', label: 'Capa' },
    { id: 'frase', label: 'Frase Temática' },
    { id: 'eixo', label: 'Eixo Temático' },
    { id: 'autor', label: 'Autor' },
    { id: 'foto_autor', label: 'Foto do Autor' },
    { id: 'texto', label: 'Texto da Redação' },
    { id: 'dica', label: 'Dica de Escrita' },
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
        {mode === 'edit' && onCancel && (
          <div className="mb-4">
            <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
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
                {loading ? 'Salvando...' : (mode === 'edit' ? 'Salvar Alterações' : 'Publicar')}
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

            {/* Autor Section */}
            {activeSection === 'autor' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Input
                  value={formData.autor}
                  onChange={(e) => setFormData({...formData, autor: e.target.value})}
                  className="text-sm"
                  placeholder="Nome do autor da redação"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Foto do Autor Section */}
            {activeSection === 'foto_autor' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-4">
                  <Input
                    type="url"
                    value={formData.foto_autor}
                    onChange={(e) => setFormData({...formData, foto_autor: e.target.value})}
                    className="text-sm"
                  />

                  {/* Preview da foto */}
                  {formData.foto_autor && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={formData.foto_autor}
                        alt="Preview da foto do autor"
                        className="w-12 h-12 rounded-full border border-gray-200 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">Preview da foto</p>
                        <p className="text-xs">Esta foto aparecerá nos cards e na página de detalhes</p>
                      </div>
                    </div>
                  )}

                  {formData.foto_autor && (
                    <p className="text-xs text-gray-500">
                      💡 Dica: Use URLs de imagens hospedadas publicamente. A foto deve ter boa qualidade e ser quadrada para melhor resultado.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Texto da Redação Section */}
            {activeSection === 'texto' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Textarea
                  value={formData.conteudo}
                  onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
                  className="min-h-[400px] text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Dica de Escrita Section */}
            {activeSection === 'dica' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Textarea
                  value={formData.dica_de_escrita}
                  onChange={(e) => setFormData({...formData, dica_de_escrita: e.target.value})}
                  className="min-h-[100px] text-sm"
                  spellCheck={true}
                />
              </div>
            )}

            {/* Imagem de Capa Section */}
            {activeSection === 'imagem' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <Input
                  type="url"
                  value={formData.pdf_url}
                  onChange={(e) => setFormData({...formData, pdf_url: e.target.value})}
                  className="text-sm"
                />
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="text-center space-y-2 p-4">
                <p className="text-sm text-gray-600" aria-live="polite">
                  Salvando redação exemplar...
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