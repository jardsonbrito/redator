import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, X } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";
import { ImageSelector } from "@/components/admin/ImageSelector";
import { VideoParser, processAulaVideoMetadata, resolveAulaCover } from "@/utils/aulaImageUtils";
import { VideoThumbnailReprocessor } from "@/components/admin/VideoThumbnailReprocessor";
import { useTurmasAtivas } from "@/hooks/useTurmasAtivas";

interface AulaEditando {
  id: string;
  titulo: string;
  descricao: string;
  modulo?: string;
  modulo_id?: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
  ativo?: boolean;
  cover_source?: string | null;
  cover_file_path?: string | null;
  cover_url?: string | null;
  // Video metadata fields
  video_thumbnail_url?: string | null;
  platform?: string | null;
  video_id?: string | null;
  embed_url?: string | null;
  video_url_original?: string | null;
}

interface AulaFormProps {
  aulaEditando?: AulaEditando | null;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
}

export const AulaFormModern = ({ aulaEditando, onSuccess, onCancelEdit }: AulaFormProps) => {
  const { turmasDinamicas } = useTurmasAtivas();
  const [activeSection, setActiveSection] = useState<string>('detalhes');
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modulo, setModulo] = useState("");
  const [linkConteudo, setLinkConteudo] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfNome, setPdfNome] = useState("");
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [permiteVisitante, setPermiteVisitante] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');
  const [cover, setCover] = useState<{source?: string; file_path?: string; url?: string; file?: File} | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [currentAulaData, setCurrentAulaData] = useState<AulaEditando | null>(null);
  const [modulos, setModulos] = useState<{id: string, nome: string}[]>([]);

  const [novoModuloNome, setNovoModuloNome] = useState("");
  const [mostrarNovoModulo, setMostrarNovoModulo] = useState(false);

  // Buscar dados do banco
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar módulos reais do banco de dados
        const response = await fetch('https://kgmxntpmvlnbftjqtyxx.supabase.co/rest/v1/modulos?select=id,nome&ativo=eq.true&order=sort_order.asc', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbXhudHBtdmxuYmZ0anF0eXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5Nzk3MzQsImV4cCI6MjA2NjU1NTczNH0.57rSKhhANhbPH4-KMS8D6EuxW1dhAimML-rPNSlnEX0',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Accept-Profile': 'public'
          }
        });

        if (response.ok) {
          const modulosData = await response.json();
          setModulos(modulosData);
        } else {
          throw new Error('Erro ao buscar módulos');
        }
      } catch (error) {
        console.error('Erro ao buscar módulos:', error);
        // Fallback para módulos padrão se houver erro
        setModulos([
          { id: 'e951e007-2e33-4491-9cde-883ffc691f24', nome: 'Competência 1' },
          { id: '62c8f686-b03a-4175-8bb2-1812e7d46128', nome: 'Competência 2' },
          { id: '17bc8189-a4ee-4c5a-a604-f188c2699188', nome: 'Competência 3' },
          { id: '65c74163-0e9a-4d16-b142-ef4eade26c13', nome: 'Competência 4' },
          { id: '40b054c6-0df4-4b63-99ba-0fe9f315ef3c', nome: 'Competência 5' },
          { id: '1ef05609-c5ed-418e-90ee-4968f29ebfd9', nome: 'Redatoria' },
          { id: 'b14dd9be-a203-45df-97b7-ae592f5c60ed', nome: 'Aula ao vivo' }
        ]);
      }

    };

    fetchData();
  }, []);

  // Preencher formulário ao editar
  useEffect(() => {
    if (aulaEditando && modulos.length > 0) {
      setTitulo(aulaEditando.titulo || "");
      setDescricao(aulaEditando.descricao || "");

      // Buscar o nome do módulo pelo modulo_id
      const moduloEncontrado = modulos.find(m => m.id === aulaEditando.modulo_id);
      setModulo(moduloEncontrado ? moduloEncontrado.nome : "");

      setLinkConteudo(aulaEditando.link_conteudo || "");
      setPdfUrl(aulaEditando.pdf_url || "");
      setPdfNome(aulaEditando.pdf_nome || "");
      setTurmasAutorizadas(aulaEditando.turmas_autorizadas || []);
      setPermiteVisitante(aulaEditando.permite_visitante || false);
      setAtivo(aulaEditando.ativo !== false);
      setCover(
        aulaEditando.cover_source === 'upload' && aulaEditando.cover_file_path
          ? { source: 'upload', file_path: aulaEditando.cover_file_path }
          : aulaEditando.cover_url
          ? { source: 'url', url: aulaEditando.cover_url }
          : null
      );
      setVideoPreview(resolveAulaCover(aulaEditando));
      setCurrentAulaData(aulaEditando);
    }
  }, [aulaEditando, modulos]);

  const criarNovoModulo = async () => {
    if (!novoModuloNome.trim()) {
      toast.error("Digite o nome do módulo");
      return;
    }

    try {
      // Simular criação do módulo (adicionar localmente)
      const newModulo = {
        id: Date.now().toString(),
        nome: novoModuloNome.trim()
      };

      setModulos([...modulos, newModulo]);
      setModulo(newModulo.nome);
      setNovoModuloNome("");
      setMostrarNovoModulo(false);
      toast.success("Módulo adicionado com sucesso!");
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      toast.error('Erro ao criar módulo');
    }
  };

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setTurmasAutorizadas([...turmasAutorizadas, turma]);
    } else {
      setTurmasAutorizadas(turmasAutorizadas.filter(t => t !== turma));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Arquivo PDF muito grande. Máximo 10MB.");
        return;
      }
      setPdfFile(file);
      setPdfNome(file.name);
    } else {
      toast.error("Por favor, selecione um arquivo PDF válido.");
    }
  };

  const uploadPdf = async (file: File): Promise<{ url: string; nome: string }> => {
    const fileExt = 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('aula-pdfs')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('aula-pdfs')
      .getPublicUrl(filePath);

    return { url: publicUrl, nome: file.name };
  };

  // Update video preview when link changes
  const handleLinkChange = async (newLink: string) => {
    setLinkConteudo(newLink);
    const metadata = VideoParser.extractVideoMetadata(newLink);
    if (metadata) {
      if (metadata.thumbnailUrl) {
        // YouTube has immediate thumbnail
        setVideoPreview(metadata.thumbnailUrl);
      } else {
        // For other platforms, show loading state
        setVideoPreview('/placeholders/aula-cover.png');
        console.log(`🎬 ${metadata.platform} video detected, thumbnail will be processed on save`);
      }
    } else {
      setVideoPreview(null);
    }
  };

  const handleAction = () => {
    // Validações básicas com redirecionamento para seções
    if (!titulo.trim()) {
      toast.error('Título é obrigatório');
      setActiveSection('detalhes');
      return;
    }

    if (!descricao.trim()) {
      toast.error('Descrição é obrigatória');
      setActiveSection('detalhes');
      return;
    }

    if (!modulo) {
      toast.error('Módulo é obrigatório');
      setActiveSection('detalhes');
      return;
    }

    if (!linkConteudo.trim()) {
      toast.error('Link do conteúdo é obrigatório');
      setActiveSection('conteudo');
      return;
    }

    // Encontrar o ID do módulo selecionado
    const moduloSelecionado = modulos.find(m => m.nome === modulo);
    if (!moduloSelecionado) {
      toast.error("Módulo selecionado inválido.");
      setActiveSection('detalhes');
      return;
    }

    const turmasAluno = turmasAutorizadas.filter(t => t !== "Professor");
    const permiteProfesor = turmasAutorizadas.includes("Professor");
    if (turmasAluno.length === 0 && !permiteVisitante && !permiteProfesor) {
      toast.error('Selecione pelo menos uma turma, habilite visitantes ou marque como visível para professores');
      setActiveSection('turmas');
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      let finalPdfUrl = pdfUrl;
      let finalPdfNome = pdfNome;

      // Se há arquivo para upload, fazer upload primeiro
      if (uploadMethod === 'upload' && pdfFile) {
        console.log('📤 Fazendo upload do PDF...');
        const uploadResult = await uploadPdf(pdfFile);
        finalPdfUrl = uploadResult.url;
        finalPdfNome = uploadResult.nome;
        console.log('✅ PDF enviado:', uploadResult);
      }

      // Process cover data
      const coverData: Record<string, string | null> = {};
      if (cover) {
        if (cover.source === 'upload' && cover.file_path) {
          coverData.cover_source = 'upload';
          coverData.cover_file_path = cover.file_path;
          coverData.cover_url = null;
        } else if (cover.source === 'url' && cover.url) {
          coverData.cover_source = 'url';
          coverData.cover_url = cover.url;
          coverData.cover_file_path = null;
        }
      }

      // Encontrar o ID do módulo selecionado
      const moduloSelecionado = modulos.find(m => m.nome === modulo);

      const aulaData = {
        titulo,
        descricao,
        modulo_id: moduloSelecionado?.id, // Usar o ID do módulo, não o nome
        link_conteudo: linkConteudo,
        pdf_url: finalPdfUrl || null,
        pdf_nome: finalPdfNome || null,
        turmas_autorizadas: turmasAutorizadas,
        permite_visitante: permiteVisitante,
        ativo,
        ...coverData
      };

      let aulaId: string;
      let error;

      if (aulaEditando) {
        // Atualizar aula existente
        const { error: updateError } = await supabase
          .from("aulas")
          .update(aulaData)
          .eq("id", aulaEditando.id);
        error = updateError;
        aulaId = aulaEditando.id;
        console.log('✅ Aula atualizada:', aulaEditando.id);
      } else {
        // Criar nova aula
        const { data: newAula, error: insertError } = await supabase
          .from("aulas")
          .insert([aulaData])
          .select('id')
          .single();
        error = insertError;
        aulaId = newAula?.id;
        console.log('✅ Nova aula criada:', newAula);
      }

      if (error) throw error;

      // Process video metadata after saving
      if (aulaId) {
        await processAulaVideoMetadata(aulaId, linkConteudo);

        // Update current aula data for the reprocessor
        const { data: updatedAula } = await supabase
          .from('aulas')
          .select('*')
          .eq('id', aulaId)
          .single();

        if (updatedAula) {
          setCurrentAulaData(updatedAula);
        }
      }

      toast.success(aulaEditando ? "Aula atualizada com sucesso!" : "Aula criada com sucesso!");

      if (onSuccess) {
        onSuccess();
      }

      // Reset form se não estiver editando
      if (!aulaEditando) {
        setTitulo("");
        setDescricao("");
        setModulo("");
        setLinkConteudo("");
        setPdfUrl("");
        setPdfNome("");
        setPdfFile(null);
        setTurmasAutorizadas([]);
        setPermiteVisitante(false);
        setAtivo(true);
        setUploadMethod('url');
        setCover(null);
        setVideoPreview(null);
        setCurrentAulaData(null);
        setActiveSection('detalhes');
      }

    } catch (error) {
      console.error("Erro ao criar aula:", error);
      toast.error("Erro ao criar aula. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const sections = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'conteudo', label: 'Conteúdo' },
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
              {aulaEditando && onCancelEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAction}
                disabled={isLoading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {isLoading
                  ? (aulaEditando ? "Salvando..." : "Criando...")
                  : (aulaEditando ? "Salvar Alterações" : "Criar Aula")
                }
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Detalhes Section */}
            {activeSection === 'detalhes' && (
              <div className="space-y-4">
                {/* Título */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="text-sm"
                    spellCheck={true}
                    required
                  />
                </div>

                {/* Descrição */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="text-sm min-h-[100px]"
                    rows={3}
                    spellCheck={true}
                    required
                  />
                </div>

                {/* Módulo */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="modulo">Módulo *</Label>
                    <div className="flex gap-2">
                      <Select value={modulo} onValueChange={setModulo}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {modulos.map((mod) => (
                            <SelectItem key={mod.id} value={mod.nome}>
                              {mod.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setMostrarNovoModulo(!mostrarNovoModulo)}
                        title="Criar novo módulo"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {mostrarNovoModulo && (
                      <div className="flex gap-2 p-3 border rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <Label htmlFor="novoModulo" className="text-sm">Nome do novo módulo</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="novoModulo"
                              value={novoModuloNome}
                              onChange={(e) => setNovoModuloNome(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && criarNovoModulo()}
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={criarNovoModulo}
                              disabled={!novoModuloNome.trim()}
                            >
                              Criar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setMostrarNovoModulo(false);
                                setNovoModuloNome("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Section */}
            {activeSection === 'conteudo' && (
              <div className="space-y-4">
                {/* Link do Conteúdo */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="linkConteudo">Link do Conteúdo *</Label>
                  <Input
                    id="linkConteudo"
                    value={linkConteudo}
                    onChange={(e) => handleLinkChange(e.target.value)}
                    className="text-sm"
                    type="url"
                    required
                  />
                  {videoPreview && (
                    <div className="mt-3">
                      <Label className="text-sm text-gray-600">Preview da Capa do Vídeo:</Label>
                      <div className="mt-1 border rounded-lg overflow-hidden bg-gray-50 relative">
                        <img
                          src={videoPreview}
                          alt="Preview da capa do vídeo"
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {videoPreview === '/placeholders/aula-cover.png' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm">
                            Thumbnail será gerada automaticamente
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Capa da Aula (opcional) */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Imagem de Capa da Aula (opcional)</Label>
                    <p className="text-sm text-gray-600">
                      Se o vídeo tiver thumbnail, ela será usada como capa automaticamente. Você pode enviar uma imagem para substituir.
                    </p>
                    <ImageSelector
                      title="Capinha (16:9)"
                      description="Recomendado 1280x720px. Você pode enviar arquivo ou usar uma URL pública."
                      value={cover}
                      onChange={setCover}
                      minDimensions={{ width: 640, height: 360 }}
                      bucket="aulas"
                    />
                  </div>
                </div>

                {/* Seção PDF */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Material PDF (opcional)</Label>

                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={uploadMethod === 'url'}
                          onChange={() => setUploadMethod('url')}
                        />
                        <span>URL do PDF</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={uploadMethod === 'upload'}
                          onChange={() => setUploadMethod('upload')}
                        />
                        <span>Upload de Arquivo</span>
                      </label>
                    </div>

                    {uploadMethod === 'url' ? (
                      <>
                        <div>
                          <Label htmlFor="pdfUrl">URL do PDF</Label>
                          <Input
                            id="pdfUrl"
                            value={pdfUrl}
                            onChange={(e) => setPdfUrl(e.target.value)}
                            type="url"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pdfNome">Nome do PDF</Label>
                          <Input
                            id="pdfNome"
                            value={pdfNome}
                            onChange={(e) => setPdfNome(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <Label htmlFor="pdfFile">Arquivo PDF (máx. 10MB)</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="pdfFile"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                          />
                          {pdfFile && (
                            <div className="flex items-center text-sm text-green-600">
                              <FileText className="w-4 h-4 mr-1" />
                              {pdfFile.name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {turmasDinamicas.map(({ valor, label }) => (
                        <div key={valor} className="flex items-center space-x-2">
                          <Checkbox
                            id={valor}
                            checked={turmasAutorizadas.includes(valor)}
                            onCheckedChange={(checked) => handleTurmaChange(valor, checked as boolean)}
                          />
                          <Label htmlFor={valor} className="text-sm font-medium">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visível para Professores */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Visível para Professores</div>
                      <div className="text-xs text-gray-500">Professores podem acessar esta aula na área deles</div>
                    </div>
                    <Switch
                      checked={turmasAutorizadas.includes("Professor")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTurmasAutorizadas(prev => [...prev, "Professor"]);
                        } else {
                          setTurmasAutorizadas(prev => prev.filter(t => t !== "Professor"));
                        }
                      }}
                    />
                  </div>

                  {/* Permitir Visitantes */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Permitir Visitantes</div>
                      <div className="text-xs text-gray-500">Visitantes podem acessar esta aula</div>
                    </div>
                    <Switch
                      checked={permiteVisitante}
                      onCheckedChange={setPermiteVisitante}
                    />
                  </div>

                  {/* Status Ativo */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Status Ativo</div>
                      <div className="text-xs text-gray-500">Aula ativa pode ser acessada pelos alunos</div>
                    </div>
                    <Switch
                      checked={ativo}
                      onCheckedChange={setAtivo}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Video Thumbnail Reprocessor - só aparece se estamos editando */}
            {aulaEditando && currentAulaData && linkConteudo && (
              <VideoThumbnailReprocessor
                aulaId={aulaEditando.id}
                linkConteudo={linkConteudo}
                platform={currentAulaData.platform}
                videoThumbnailUrl={currentAulaData.video_thumbnail_url}
                onThumbnailUpdated={(newUrl) => {
                  setVideoPreview(newUrl);
                  setCurrentAulaData(prev => prev ? { ...prev, video_thumbnail_url: newUrl } : null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};