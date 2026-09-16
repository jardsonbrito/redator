import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { syncToBlog } from '@/utils/blogSync';

interface ModeloForm {
  titulo: string;
  conteudo: string;
  ordem: number;
}

interface RedacaoFormProps {
  mode?: 'create' | 'edit';
  redacaoId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const RedacaoForm = ({ mode = 'create', redacaoId, onCancel, onSuccess }: RedacaoFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
  const [activeSection, setActiveSection] = useState<string>('imagem');

  // Modelos state
  const [modelos, setModelos] = useState<ModeloForm[]>([]);

  // Blog sync state
  const [publicarNoBlog, setPublicarNoBlog] = useState(false);
  const [blogPostId, setBlogPostId] = useState<string | null>(null);
  const [syncingBlog, setSyncingBlog] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `autor-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, foto_autor: data.publicUrl }));
    } catch (err: any) {
      toast({ title: '❌ Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingFoto(false);
      e.target.value = '';
    }
  };

  // Validação ENEM
  const [atualizadoBanca, setAtualizadoBanca] = useState(false);

  const [formData, setFormData] = useState({
    frase_tematica: '',
    eixo_tematico: '',
    conteudo: '',
    pdf_url: '',
    autor: '',
    foto_autor: '',
    ano_banca: '',
  });

  useEffect(() => {
    if (mode === 'edit' && redacaoId) {
      const fetchRedacao = async () => {
        try {
          const [{ data, error }, { data: modelosData }] = await Promise.all([
            supabase.from('redacoes').select('*').eq('id', redacaoId).single(),
            supabase
              .from('redacao_exemplar_modelos' as any)
              .select('*')
              .eq('redacao_id', redacaoId)
              .order('ordem', { ascending: true }),
          ]);

          if (error) throw error;

          setFormData({
            frase_tematica: data.frase_tematica || '',
            eixo_tematico: data.eixo_tematico || '',
            conteudo: data.conteudo || '',
            pdf_url: data.pdf_url || '',
            autor: data.autor || '',
            foto_autor: data.foto_autor || '',
            ano_banca: data.ano_banca ? String(data.ano_banca) : '',
          });
          setAtualizadoBanca(data.atualizado_banca ?? false);
          setPublicarNoBlog(data.publicar_no_blog ?? false);
          setBlogPostId(data.blog_post_id ?? null);
          if (modelosData) {
            setModelos((modelosData as any[]).map((m) => ({
              titulo: m.titulo,
              conteudo: m.conteudo,
              ordem: m.ordem,
            })));
          }
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
      const conteudoFinal = modelos.length > 0 ? modelos[0].conteudo : formData.conteudo;

      const saveModelos = async (id: string) => {
        await supabase
          .from('redacao_exemplar_modelos' as any)
          .delete()
          .eq('redacao_id', id);
        if (modelos.length > 0) {
          await supabase.from('redacao_exemplar_modelos' as any).insert(
            modelos.map((m, i) => ({
              redacao_id: id,
              titulo: m.titulo.trim() || `Modelo ${i + 1}`,
              conteudo: m.conteudo,
              ordem: i,
            }))
          );
        }
      };

      if (mode === 'edit' && redacaoId) {
        const { error } = await supabase
          .from('redacoes')
          .update({
            frase_tematica: formData.frase_tematica.trim(),
            eixo_tematico: formData.eixo_tematico.trim(),
            conteudo: conteudoFinal.trim(),
            pdf_url: formData.pdf_url.trim() || null,
            autor: formData.autor.trim() || null,
            foto_autor: formData.foto_autor.trim() || null,
            atualizado_banca: atualizadoBanca,
            ano_banca: formData.ano_banca ? parseInt(formData.ano_banca, 10) : null,
          })
          .eq('id', redacaoId);

        if (error) throw error;

        await saveModelos(redacaoId);

        toast({
          title: "✅ Sucesso!",
          description: "Redação atualizada com sucesso.",
        });
      } else {
        // Create new redacao
        const { data: insertedData, error } = await supabase
          .from('redacoes')
          .insert([{
            frase_tematica: formData.frase_tematica.trim(),
            eixo_tematico: formData.eixo_tematico.trim(),
            conteudo: conteudoFinal.trim(),
            pdf_url: formData.pdf_url.trim() || null,
            autor: formData.autor.trim() || null,
            foto_autor: formData.foto_autor.trim() || null,
            atualizado_banca: atualizadoBanca,
            ano_banca: formData.ano_banca ? parseInt(formData.ano_banca, 10) : null,
            nota_total: 1000, // Redação exemplar
            data_envio: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (error) throw error;

        await saveModelos(insertedData.id);

        toast({
          title: "✅ Sucesso!",
          description: "Redação exemplar criada com sucesso.",
        });

        // Sync com blog se toggle ativado
        if (publicarNoBlog && user?.email && insertedData?.id) {
          const syncResult = await syncToBlog({ adminEmail: user.email, table: 'redacoes', recordId: insertedData.id, action: 'sync' });
          if (syncResult.success && syncResult.blogPostId) setBlogPostId(syncResult.blogPostId);
        }

        // Clear form
        setFormData({
          frase_tematica: '',
          eixo_tematico: '',
          conteudo: '',
          pdf_url: '',
          autor: '',
          foto_autor: '',
          ano_banca: '',
        });
        setAtualizadoBanca(false);
        setPublicarNoBlog(false);
        setBlogPostId(null);
        setModelos([]);
      }

      onSuccess?.();
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

  // ── Blog sync helpers ──────────────────────────────────────────────────────
  const handleToggleBlog = async () => {
    if (!user?.email || !redacaoId) return;
    setSyncingBlog(true);
    const action = publicarNoBlog ? 'unsync' : 'sync';
    const result = await syncToBlog({ adminEmail: user.email, table: 'redacoes', recordId: redacaoId, action });
    if (result.success) {
      if (action === 'sync') {
        setPublicarNoBlog(true);
        if (result.blogPostId) setBlogPostId(result.blogPostId);
        toast({ title: '✅ Sincronizado', description: 'Redação publicada no blog com sucesso.' });
      } else {
        setPublicarNoBlog(false);
        setBlogPostId(null);
        toast({ title: 'Blog', description: 'Redação arquivada no blog.' });
      }
    } else {
      toast({ title: '❌ Erro ao sincronizar', description: result.error, variant: 'destructive' });
    }
    setSyncingBlog(false);
  };

  const handleResync = async () => {
    if (!user?.email || !redacaoId) return;
    setSyncingBlog(true);
    const result = await syncToBlog({ adminEmail: user.email, table: 'redacoes', recordId: redacaoId, action: 'sync' });
    if (result.success) {
      if (result.blogPostId) setBlogPostId(result.blogPostId);
      toast({ title: '✅ Re-sincronizado', description: 'Blog atualizado com os dados mais recentes.' });
    } else {
      toast({ title: '❌ Erro', description: result.error, variant: 'destructive' });
    }
    setSyncingBlog(false);
  };
  // ───────────────────────────────────────────────────────────────────────────

  const sections = [
    { id: 'imagem', label: 'Capa' },
    { id: 'frase', label: 'Frase Temática' },
    { id: 'eixo', label: 'Eixo Temático' },
    { id: 'autor', label: 'Autor' },
    { id: 'foto_autor', label: 'Foto do Autor' },
    ...(modelos.length === 0 ? [{ id: 'texto', label: 'Texto da Redação' }] : []),
    { id: 'modelos', label: `Modelos${modelos.length > 0 ? ` (${modelos.length})` : ''}` },
    { id: 'validacao', label: 'Validação ENEM' },
    { id: 'blog', label: 'Blog' },
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
                  {/* Preview + upload */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {formData.foto_autor ? (
                        <img
                          src={formData.foto_autor}
                          alt="Foto do autor"
                          className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover"
                          onError={(e) => { e.currentTarget.src = ''; }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="block">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingFoto}
                          onClick={() => document.getElementById('foto-autor-input')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingFoto ? 'Enviando...' : 'Fazer upload'}
                        </Button>
                        <input
                          id="foto-autor-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFotoUpload}
                        />
                      </label>
                      <p className="text-xs text-gray-400">ou cole uma URL abaixo</p>
                    </div>
                  </div>

                  {/* URL manual como fallback */}
                  <Input
                    type="url"
                    value={formData.foto_autor}
                    onChange={(e) => setFormData({ ...formData, foto_autor: e.target.value })}
                    className="text-sm"
                    placeholder="https://..."
                  />

                  {formData.foto_autor && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, foto_autor: '' })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remover foto
                    </button>
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
                  className="min-h-[400px] text-sm resize-none"
                  placeholder="Digite o texto da redação aqui. Use quebras de linha normais para separar parágrafos."
                  spellCheck={true}
                />
              </div>
            )}

            {/* Modelos Section */}
            {activeSection === 'modelos' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                <p className="text-sm text-gray-500">
                  Adicione múltiplas versões (modelos) para esta redação exemplar. Os chips de navegação aparecerão automaticamente na página de visualização quando houver mais de um modelo cadastrado.
                </p>

                {modelos.map((modelo, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-600">Modelo {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setModelos((prev) => prev.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <Input
                        value={modelo.titulo}
                        onChange={(e) =>
                          setModelos((prev) =>
                            prev.map((m, i) => (i === index ? { ...m, titulo: e.target.value } : m))
                          )
                        }
                        className="text-sm"
                        placeholder={`Modelo ${index + 1}`}
                      />
                      <Textarea
                        value={modelo.conteudo}
                        onChange={(e) =>
                          setModelos((prev) =>
                            prev.map((m, i) => (i === index ? { ...m, conteudo: e.target.value } : m))
                          )
                        }
                        className="min-h-[300px] text-sm resize-none"
                        placeholder="Texto completo da redação para este modelo..."
                        spellCheck={true}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                    setModelos((prev) => [
                      ...prev,
                      { titulo: `Modelo ${prev.length + 1}`, conteudo: '', ordem: prev.length },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Modelo
                </Button>
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

            {/* Validação ENEM Section */}
            {activeSection === 'validacao' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-5">
                {/* Toggle principal */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Redação validada para o ENEM</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ativa o selo de validação visível para alunos nos cards e na página da redação
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAtualizadoBanca((v) => !v)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                      atualizadoBanca ? 'bg-green-600' : 'bg-gray-200'
                    )}
                    aria-pressed={atualizadoBanca}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                        atualizadoBanca ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Campo de ano (opcional) */}
                {atualizadoBanca && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Ano da banca <span className="font-normal text-gray-400">(opcional — se vazio, usa o ano corrente: {new Date().getFullYear()})</span>
                    </label>
                    <Input
                      type="number"
                      min={2000}
                      max={2099}
                      placeholder={String(new Date().getFullYear())}
                      value={formData.ano_banca}
                      onChange={(e) => setFormData({ ...formData, ano_banca: e.target.value })}
                      className="text-sm w-36"
                    />
                  </div>
                )}

                {/* Preview do selo */}
                {atualizadoBanca && (
                  <div className="pt-1">
                    <p className="text-xs text-gray-500 mb-2">Preview do selo:</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                      ✅ Redação validada para o ENEM {formData.ano_banca || new Date().getFullYear()}
                    </span>
                  </div>
                )}

                {!atualizadoBanca && (
                  <p className="text-xs text-gray-400">
                    Ative o toggle para exibir o selo de validação nesta redação exemplar.
                  </p>
                )}
              </div>
            )}

            {/* Blog Section */}
            {activeSection === 'blog' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                {mode === 'create' ? (
                  <p className="text-sm text-gray-500">
                    Salve a redação primeiro para ativar a sincronização com o blog.
                  </p>
                ) : (
                  <>
                    {/* Toggle publicar */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Publicar no Blog</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Sincroniza esta redação exemplar com o laboratoriodoredator.com
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBlog}
                        disabled={syncingBlog}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
                          publicarNoBlog ? 'bg-[#3F0077]' : 'bg-gray-200'
                        )}
                        aria-pressed={publicarNoBlog}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                            publicarNoBlog ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Status */}
                    {syncingBlog && (
                      <p className="text-xs text-gray-500">Sincronizando...</p>
                    )}

                    {publicarNoBlog && blogPostId && !syncingBlog && (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-green-800">Publicado no blog</p>
                          <p className="text-xs text-green-600">ID: {blogPostId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResync}
                          disabled={syncingBlog}
                          className="text-xs text-[#3F0077] hover:underline disabled:opacity-50"
                        >
                          Re-sincronizar
                        </button>
                      </div>
                    )}

                    {!publicarNoBlog && !syncingBlog && (
                      <p className="text-xs text-gray-400">
                        Ative o toggle para publicar esta redação exemplar no blog.
                      </p>
                    )}
                  </>
                )}
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