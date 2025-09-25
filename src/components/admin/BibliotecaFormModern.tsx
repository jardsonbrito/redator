import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Upload, Plus } from 'lucide-react';
import { CategoriaModal } from './CategoriaModal';
import { TurmaSelector } from '@/components/TurmaSelector';

interface BibliotecaFormModernProps {
  mode: 'create' | 'edit';
  initialValues?: {
    id?: string;
    titulo?: string;
    descricao?: string;
    categoria_id?: string;
    thumbnail_url?: string;
    turmas_autorizadas?: string[];
    permite_visitante?: boolean;
    status?: 'publicado' | 'rascunho';
    published_at?: string;
    unpublished_at?: string;
  };
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const BibliotecaFormModern = ({ mode, initialValues, onCancel, onSuccess }: BibliotecaFormModernProps) => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('capa');
  const queryClient = useQueryClient();
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria_id: '',
    thumbnail_url: '',
    turmas_autorizadas: [] as string[],
    permite_visitante: false,
    status: 'publicado' as 'publicado' | 'rascunho',
    published_at: new Date().toISOString().slice(0, 16),
    unpublished_at: '',
  });

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  // Buscar categorias disponíveis
  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('ativa', true)
        .order('ordem');

      if (error) throw error;
      return data;
    }
  });

  // Pré-preencher dados no modo edit
  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setFormData({
        titulo: initialValues.titulo || '',
        descricao: initialValues.descricao || '',
        categoria_id: initialValues.categoria_id || '',
        thumbnail_url: initialValues.thumbnail_url || '',
        turmas_autorizadas: initialValues.turmas_autorizadas || [],
        permite_visitante: initialValues.permite_visitante || false,
        status: initialValues.status || 'publicado',
        published_at: initialValues.published_at ? new Date(initialValues.published_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        unpublished_at: initialValues.unpublished_at ? new Date(initialValues.unpublished_at).toISOString().slice(0, 16) : '',
      });

      // Gerar preview se houver URL
      if (initialValues.thumbnail_url) {
        setThumbnailPreview(initialValues.thumbnail_url);
      }
    }
  }, [mode, initialValues]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnail(file);

      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Limpar URL manual se arquivo for selecionado
      setFormData(prev => ({ ...prev, thumbnail_url: '' }));
    } else {
      toast.error("Por favor, selecione apenas arquivos de imagem.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setArquivo(file);
    } else {
      toast.error("Por favor, selecione apenas arquivos PDF.");
    }
  };

  const uploadArquivo = async (file: File): Promise<{ url: string; nome: string }> => {
    const fileExt = 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('biblioteca-pdfs')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    return {
      url: fileName,
      nome: file.name
    };
  };

  const uploadThumbnail = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error: uploadError } = await supabase.storage
      .from('biblioteca-pdfs')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
    }

    // Retornar URL público da imagem
    const { data: { publicUrl } } = supabase.storage
      .from('biblioteca-pdfs')
      .getPublicUrl(data!.path);

    return publicUrl;
  };

  const handleAction = () => {
    // Validações básicas
    if (!formData.titulo.trim()) {
      toast.error('Título do material é obrigatório');
      setActiveSection('informacoes');
      return;
    }

    if (!formData.categoria_id.trim()) {
      toast.error('Categoria é obrigatória');
      setActiveSection('informacoes');
      return;
    }

    if (!arquivo && mode === 'create') {
      toast.error('Arquivo PDF é obrigatório');
      setActiveSection('conteudo');
      return;
    }

    if (!formData.published_at) {
      toast.error('Data de publicação é obrigatória');
      setActiveSection('configuracao');
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let arquivo_url = initialValues?.arquivo_url;
      let arquivo_nome = initialValues?.arquivo_nome;

      // Upload do arquivo apenas se um novo foi selecionado
      if (arquivo) {
        const uploadResult = await uploadArquivo(arquivo);
        arquivo_url = uploadResult.url;
        arquivo_nome = uploadResult.nome;
      }

      // Upload de thumbnail se houver
      let thumbnailUrl = formData.thumbnail_url;
      if (thumbnail) {
        thumbnailUrl = await uploadThumbnail(thumbnail);
      }

      // Preparar dados para salvar
      const dataToSave = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao || null,
        categoria_id: formData.categoria_id,
        arquivo_url,
        arquivo_nome,
        thumbnail_url: thumbnailUrl,
        turmas_autorizadas: formData.turmas_autorizadas,
        permite_visitante: formData.permite_visitante,
        status: formData.status,
        published_at: formData.published_at ? new Date(formData.published_at).toISOString() : new Date().toISOString(),
        unpublished_at: formData.unpublished_at ? new Date(formData.unpublished_at).toISOString() : null,
        atualizado_em: new Date().toISOString()
      };

      let result;
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('biblioteca_materiais')
          .insert([dataToSave])
          .select('*')
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('biblioteca_materiais')
          .update(dataToSave)
          .eq('id', initialValues?.id)
          .select('*')
          .single();
        result = { data, error };
      }

      if (result.error) {
        throw result.error;
      }

      // Invalidar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-biblioteca'] }),
        queryClient.invalidateQueries({ queryKey: ['biblioteca'] }),
      ]);

      toast.success(mode === 'create' ? "Material criado com sucesso!" : "Material atualizado com sucesso!");

      // Reset form ou callback
      if (mode === 'create') {
        setFormData({
          titulo: '',
          descricao: '',
          categoria_id: '',
          thumbnail_url: '',
          turmas_autorizadas: [],
          permite_visitante: false,
          status: 'publicado',
          published_at: new Date().toISOString().slice(0, 16),
          unpublished_at: '',
        });
        setArquivo(null);
        setThumbnail(null);
        setThumbnailPreview('');
      } else if (onSuccess) {
        onSuccess();
      }

    } catch (error: unknown) {
      console.error('Erro ao salvar material:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar material");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'capa', label: 'Capa' },
    { id: 'informacoes', label: 'Informações' },
    { id: 'conteudo', label: 'Material PDF' },
    { id: 'configuracao', label: 'Configuração' },
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
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading ? (mode === 'create' ? 'Criando...' : 'Salvando...') : (mode === 'create' ? 'Criar Material' : 'Salvar Alterações')}
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Capa Section */}
            {activeSection === 'capa' && (
              <div className="space-y-4">
                {/* Upload de Thumbnail */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="thumbnail">Imagem de Capa</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="cursor-pointer"
                      />
                      <Upload className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* URL da Imagem */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="thumbnail_url">OU URL da Imagem</Label>
                  <Input
                    id="thumbnail_url"
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => {
                      setFormData({...formData, thumbnail_url: e.target.value});
                      // Limpar arquivo selecionado se URL for preenchida
                      if (e.target.value) {
                        setThumbnail(null);
                        setThumbnailPreview(e.target.value);
                        const thumbnailInput = document.getElementById('thumbnail') as HTMLInputElement;
                        if (thumbnailInput) thumbnailInput.value = '';
                      }
                    }}
                    className="text-sm mt-2"
                  />
                </div>

                {/* Preview da imagem */}
                {thumbnailPreview && (
                  <div className="border border-gray-200 rounded-xl p-5 mb-4">
                    <Label className="text-sm text-gray-600">Preview:</Label>
                    <div className="mt-3">
                      <img
                        src={thumbnailPreview}
                        alt="Preview da thumbnail"
                        className="w-32 h-20 object-cover rounded border shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Informações Section */}
            {activeSection === 'informacoes' && (
              <div className="space-y-4">
                {/* Título */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="titulo">Título do Material *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="text-sm mt-2"
                    spellCheck={true}
                  />
                </div>

                {/* Descrição */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="text-sm mt-2"
                    rows={3}
                    spellCheck={true}
                  />
                </div>

                {/* Categoria */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={formData.categoria_id} onValueChange={(value) => setFormData({...formData, categoria_id: value})}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCategorias ? (
                          <SelectItem value="" disabled>Carregando categorias...</SelectItem>
                        ) : (
                          categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCategoriaModal(true)}
                      title="Nova Categoria"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Section */}
            {activeSection === 'conteudo' && (
              <div className="space-y-4">
                {/* Arquivo PDF */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="arquivo">Arquivo *</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="arquivo"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <Upload className="w-4 h-4 text-gray-500" />
                  </div>
                  {arquivo && (
                    <p className="text-sm text-green-600 mt-1">
                      Novo arquivo selecionado: {arquivo.name}
                    </p>
                  )}
                  {initialValues && !arquivo && mode === 'edit' && (
                    <p className="text-sm text-gray-600 mt-1">
                      Arquivo atual: {initialValues.arquivo_nome || 'Arquivo existente'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Configuração Section */}
            {activeSection === 'configuracao' && (
              <div className="space-y-4">
                {/* Turmas */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <TurmaSelector
                    selectedTurmas={formData.turmas_autorizadas}
                    onTurmasChange={(turmas) => setFormData(prev => ({ ...prev, turmas_autorizadas: turmas }))}
                    permiteeVisitante={formData.permite_visitante}
                    onPermiteVisitanteChange={(permite) => setFormData(prev => ({ ...prev, permite_visitante: permite }))}
                  />
                </div>

                {/* Datas */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="published_at">Data de Publicação *</Label>
                      <Input
                        id="published_at"
                        type="datetime-local"
                        value={formData.published_at}
                        onChange={(e) => setFormData({...formData, published_at: e.target.value})}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="unpublished_at">Data de Despublicação</Label>
                      <Input
                        id="unpublished_at"
                        type="datetime-local"
                        value={formData.unpublished_at}
                        onChange={(e) => setFormData({...formData, unpublished_at: e.target.value})}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value: 'publicado' | 'rascunho') => setFormData({...formData, status: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publicado">Publicado</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para criar nova categoria */}
      <CategoriaModal
        open={showCategoriaModal}
        onOpenChange={setShowCategoriaModal}
      />
    </div>
  );
};