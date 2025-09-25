
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadExerciseCover, getEffectiveCover, validateExercisePeriod } from "@/utils/exerciseUtils";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tema {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  cover_url?: string;
  cover_file_path?: string;
}

interface ExercicioEditando {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  cover_url?: string;
  cover_upload_path?: string;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
  ativo?: boolean;
  abrir_aba_externa?: boolean;
  data_inicio?: string;
  hora_inicio?: string;
  data_fim?: string;
  hora_fim?: string;
}

interface ExercicioFormProps {
  mode?: 'create' | 'edit';
  exercicioEditando?: ExercicioEditando | null;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
}

export const ExercicioForm = ({ mode = 'create', exercicioEditando, onSuccess, onCancelEdit }: ExercicioFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
  const [activeSection, setActiveSection] = useState<string>('capa');

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [linkForms, setLinkForms] = useState("");
  const [temaId, setTemaId] = useState("");
  const [imagemCapaUrl, setImagemCapaUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverUploadPath, setCoverUploadPath] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [permiteVisitante, setPermiteVisitante] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [abrirAbaExterna, setAbrirAbaExterna] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [temaSearch, setTemaSearch] = useState("");

  const tiposDisponiveis = [
    'Google Forms',
    'Redação com Frase Temática'
  ];

  const turmasDisponiveis = [
    'TURMA A', 'TURMA B', 'TURMA C', 'TURMA D', 'TURMA E'
  ];

  useEffect(() => {
    fetchTemas();
  }, []);

  // Preencher formulário ao editar
  useEffect(() => {
    if (mode === 'edit' && exercicioEditando) {
      const loadExercicioData = async () => {
        try {
          setTitulo(exercicioEditando.titulo || "");
          setTipo(exercicioEditando.tipo || "");
          setLinkForms(exercicioEditando.link_forms || "");
          setTemaId(exercicioEditando.tema_id || "");
          setImagemCapaUrl(exercicioEditando.imagem_capa_url || "");
          setCoverUrl(exercicioEditando.cover_url || "");
          setCoverUploadPath(exercicioEditando.cover_upload_path || "");
          setTurmasAutorizadas(exercicioEditando.turmas_autorizadas || []);
          setPermiteVisitante(exercicioEditando.permite_visitante || false);
          setAtivo(exercicioEditando.ativo !== false);
          setAbrirAbaExterna(exercicioEditando.abrir_aba_externa || false);
          setDataInicio(exercicioEditando.data_inicio || "");
          setHoraInicio(exercicioEditando.hora_inicio || "");
          setDataFim(exercicioEditando.data_fim || "");
          setHoraFim(exercicioEditando.hora_fim || "");

          // Se tem tema_id, buscar o tema para mostrar na busca
          if (exercicioEditando.tema_id && temas.length > 0) {
            const tema = temas.find(t => t.id === exercicioEditando.tema_id);
            if (tema) {
              setTemaSearch(tema.frase_tematica);
            }
          }
        } catch (error: any) {
          toast.error("Erro ao carregar dados do exercício: " + error.message);
        } finally {
          setLoadingData(false);
        }
      };

      loadExercicioData();
    }
  }, [exercicioEditando, temas, mode]);

  // Atualizar capa automaticamente quando selecionar tema (somente se não tiver upload ou URL)
  useEffect(() => {
    if (temaId && tipo === 'Redação com Frase Temática' && !coverFile && !coverUrl && !exercicioEditando) {
      const tema = temas.find(t => t.id === temaId);
      if (tema && (tema.cover_url || tema.cover_file_path)) {
        // Não faz nada, a capa será herdada automaticamente pela função getEffectiveCover
        console.log('Capa do tema será herdada automaticamente:', tema.cover_url || tema.cover_file_path);
      }
    }
  }, [temaId, tipo, temas, coverFile, coverUrl, exercicioEditando]);

  const fetchTemas = async () => {
    try {
      const { data, error } = await supabase
        .from("temas")
        .select("id, frase_tematica, eixo_tematico, cover_url, cover_file_path")
        .eq("status", "publicado")
        .order("frase_tematica");

      if (error) throw error;
      setTemas(data || []);
    } catch (error) {
      console.error("Erro ao buscar temas:", error);
      toast.error("Erro ao carregar temas");
    }
  };

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setTurmasAutorizadas([...turmasAutorizadas, turma]);
    } else {
      setTurmasAutorizadas(turmasAutorizadas.filter(t => t !== turma));
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      // Limpar URL quando fizer upload
      setCoverUrl("");
    }
  };

  const getPreviewCover = () => {
    if (coverFile) {
      return URL.createObjectURL(coverFile);
    }
    
    const tema = temas.find(t => t.id === temaId);
    return getEffectiveCover({
      cover_upload_path: coverUploadPath,
      cover_url: coverUrl,
      imagem_capa_url: imagemCapaUrl,
      tipo,
      temas: tema
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!titulo || !tipo) {
      toast.error("Por favor, preencha os campos obrigatórios.");
      return;
    }

    // Agendamento obrigatório para todos os tipos
    if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
      toast.error("Período de atividade (data/hora de início e término) é obrigatório.");
      return;
    }

    if (!validateExercisePeriod(dataInicio, horaInicio, dataFim, horaFim)) {
      toast.error("A data/hora de término deve ser posterior ao início.");
      return;
    }

    if (tipo === 'Google Forms' && !linkForms) {
      toast.error("Link do Google Forms é obrigatório para este tipo.");
      return;
    }

    if (tipo === 'Redação com Frase Temática' && !temaId) {
      toast.error("Tema é obrigatório para exercícios de redação.");
      return;
    }

    setLoading(true);

    try {
      let finalCoverUploadPath = coverUploadPath;
      
      // Upload da nova capa se houver arquivo
      if (coverFile) {
        const uploadedPath = await uploadExerciseCover(coverFile);
        if (uploadedPath) {
          finalCoverUploadPath = uploadedPath;
        }
      }

      const exercicioData = {
        titulo,
        tipo,
        link_forms: tipo === 'Google Forms' ? linkForms : null,
        tema_id: tipo === 'Redação com Frase Temática' ? temaId : null,
        cover_url: coverUrl || null,
        cover_upload_path: finalCoverUploadPath || null,
        // Manter compatibilidade com campo legado
        imagem_capa_url: tipo === 'Google Forms' ? (imagemCapaUrl || null) : null,
        turmas_autorizadas: turmasAutorizadas,
        permite_visitante: permiteVisitante,
        ativo,
        abrir_aba_externa: abrirAbaExterna,
        // Agendamento agora é obrigatório para todos os tipos
        data_inicio: dataInicio,
        hora_inicio: horaInicio,
        data_fim: dataFim,
        hora_fim: horaFim
      };

      let error;

      if (exercicioEditando) {
        // Atualizar exercício existente
        const result = await supabase
          .from("exercicios")
          .update(exercicioData)
          .eq("id", exercicioEditando.id);
        error = result.error;
      } else {
        // Criar novo exercício
        const result = await supabase
          .from("exercicios")
          .insert(exercicioData);
        error = result.error;
      }

      if (error) throw error;

      toast.success(exercicioEditando ? "Exercício atualizado com sucesso!" : "Exercício criado com sucesso!");
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset form se não estiver editando
      if (!exercicioEditando) {
        setTitulo("");
        setTipo("");
        setLinkForms("");
        setTemaId("");
        setImagemCapaUrl("");
        setCoverUrl("");
        setCoverUploadPath("");
        setCoverFile(null);
        setTurmasAutorizadas([]);
        setPermiteVisitante(false);
        setAtivo(true);
        setAbrirAbaExterna(false);
        setDataInicio("");
        setHoraInicio("");
        setDataFim("");
        setHoraFim("");
        setTemaSearch("");
      }

    } catch (error) {
      console.error("Erro ao criar exercício:", error);
      toast.error("Erro ao criar exercício. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'capa', label: 'Capa' },
    { id: 'titulo', label: 'Título / Tipo' },
    { id: 'periodo', label: 'Período' },
    { id: 'configuracoes', label: 'Configuração' },
    { id: 'turmas', label: 'Turmas' },
  ];

  const toggleSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  if (loadingData) {
    return <div className="text-center py-4">Carregando dados...</div>;
  };

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
                {loading ? 'Salvando...' : (mode === 'edit' ? 'Salvar Alterações' : 'Criar Exercício')}
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

            {/* Título e Tipo Section */}
            {activeSection === 'titulo' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                <div>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="text-sm"
                    spellCheck={true}
                  />
                </div>
                <div>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDisponiveis.map((tipoItem) => (
                        <SelectItem key={tipoItem} value={tipoItem}>
                          {tipoItem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tipo === 'Google Forms' && (
                  <div className="space-y-4">
                    <Input
                      value={linkForms}
                      onChange={(e) => setLinkForms(e.target.value)}
                      placeholder="https://forms.google.com/..."
                      type="url"
                      className="text-sm"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="abrirAbaExterna"
                        checked={abrirAbaExterna}
                        onCheckedChange={(checked) => setAbrirAbaExterna(checked as boolean)}
                      />
                      <Label htmlFor="abrirAbaExterna" className="text-sm">
                        Permitir abrir em aba externa
                      </Label>
                    </div>
                  </div>
                )}

                {tipo === 'Redação com Frase Temática' && (
                  <div className="relative">
                    <Input
                      value={temaSearch}
                      onChange={(e) => setTemaSearch(e.target.value)}
                      placeholder="Buscar tema pela frase temática..."
                      className="text-sm mb-2"
                    />
                    {temaSearch && (
                      <div className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {temas
                          .filter(tema =>
                            tema.frase_tematica.toLowerCase().includes(temaSearch.toLowerCase())
                          )
                          .slice(0, 5)
                          .map((tema) => (
                            <div
                              key={tema.id}
                              className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setTemaId(tema.id);
                                setTemaSearch(tema.frase_tematica);
                              }}
                            >
                              <div className="font-medium text-sm">{tema.frase_tematica}</div>
                              <div className="text-xs text-muted-foreground">{tema.eixo_tematico}</div>
                            </div>
                          ))}
                      </div>
                    )}
                    {temaId && (
                      <div className="text-sm text-green-600">
                        Tema selecionado: {temas.find(t => t.id === temaId)?.frase_tematica}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Período de Atividade Section */}
            {activeSection === 'periodo' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="time"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {!validateExercisePeriod(dataInicio, horaInicio, dataFim, horaFim) && dataInicio && horaInicio && dataFim && horaFim && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      ⚠️ O período de término deve ser posterior ao início
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capa Section */}
            {activeSection === 'capa' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                <div>
                  <Input
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    type="url"
                    className="text-sm"
                  />
                </div>

                <div>
                  <Input
                    type="file"
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="text-sm"
                  />
                </div>

                <div className="cover-preview">
                  <img
                    src={getPreviewCover()}
                    alt="Preview da capa"
                    className="w-32 h-24 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholders/aula-cover.png';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Configurações Section */}
            {activeSection === 'configuracoes' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="permiteVisitante"
                    checked={permiteVisitante}
                    onCheckedChange={(checked) => setPermiteVisitante(checked as boolean)}
                  />
                  <Label htmlFor="permiteVisitante" className="text-sm">
                    Permite visitante
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ativo"
                    checked={ativo}
                    onCheckedChange={(checked) => setAtivo(checked as boolean)}
                  />
                  <Label htmlFor="ativo" className="text-sm">
                    Ativo
                  </Label>
                </div>

                {tipo === 'Google Forms' && (
                  <div>
                    <Input
                      value={imagemCapaUrl}
                      onChange={(e) => setImagemCapaUrl(e.target.value)}
                      type="url"
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Turmas Autorizadas Section */}
            {activeSection === 'turmas' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {turmasDisponiveis.map((turma) => (
                    <div key={turma} className="flex items-center space-x-2">
                      <Checkbox
                        id={turma}
                        checked={turmasAutorizadas.includes(turma)}
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
                  Salvando exercício...
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
