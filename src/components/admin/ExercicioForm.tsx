
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tema {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
}

interface ExercicioEditando {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
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
  exercicioEditando?: ExercicioEditando | null;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
}

export const ExercicioForm = ({ exercicioEditando, onSuccess, onCancelEdit }: ExercicioFormProps) => {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [linkForms, setLinkForms] = useState("");
  const [temaId, setTemaId] = useState("");
  const [imagemCapaUrl, setImagemCapaUrl] = useState("");
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
    if (exercicioEditando) {
      setTitulo(exercicioEditando.titulo || "");
      setTipo(exercicioEditando.tipo || "");
      setLinkForms(exercicioEditando.link_forms || "");
      setTemaId(exercicioEditando.tema_id || "");
      setImagemCapaUrl(exercicioEditando.imagem_capa_url || "");
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
    }
  }, [exercicioEditando, temas]);

  const fetchTemas = async () => {
    try {
      const { data, error } = await supabase
        .from("temas")
        .select("id, frase_tematica, eixo_tematico")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo || !tipo) {
      toast.error("Por favor, preencha os campos obrigatórios.");
      return;
    }

    if (tipo === 'Google Forms' && !linkForms) {
      toast.error("Link do Google Forms é obrigatório para este tipo.");
      return;
    }

    if (tipo === 'Redação com Frase Temática') {
      if (!temaId) {
        toast.error("Tema é obrigatório para exercícios de redação.");
        return;
      }
      if (!dataInicio || !horaInicio) {
        toast.error("Data e hora de início são obrigatórias.");
        return;
      }
      if (!dataFim || !horaFim) {
        toast.error("Data e hora de término são obrigatórias.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const exercicioData = {
        titulo,
        tipo,
        link_forms: tipo === 'Google Forms' ? linkForms : null,
        tema_id: tipo === 'Redação com Frase Temática' ? temaId : null,
        imagem_capa_url: tipo === 'Google Forms' ? (imagemCapaUrl || null) : null,
        turmas_autorizadas: turmasAutorizadas,
        permite_visitante: permiteVisitante,
        ativo,
        abrir_aba_externa: abrirAbaExterna,
        data_inicio: tipo === 'Redação com Frase Temática' ? dataInicio : null,
        hora_inicio: tipo === 'Redação com Frase Temática' ? horaInicio : null,
        data_fim: tipo === 'Redação com Frase Temática' ? dataFim : null,
        hora_fim: tipo === 'Redação com Frase Temática' ? horaFim : null
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
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {exercicioEditando ? "Editar Exercício" : "Criar Novo Exercício"}
          {exercicioEditando && onCancelEdit && (
            <Button variant="outline" onClick={onCancelEdit} size="sm">
              Cancelar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Digite o título do exercício"
              required
            />
          </div>

          <div>
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo} required>
              <SelectTrigger>
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
            <div>
              <Label htmlFor="linkForms">Link do Google Forms *</Label>
              <Input
                id="linkForms"
                value={linkForms}
                onChange={(e) => setLinkForms(e.target.value)}
                placeholder="https://forms.google.com/..."
                type="url"
                required
              />
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="abrirAbaExterna"
                  checked={abrirAbaExterna}
                  onCheckedChange={(checked) => setAbrirAbaExterna(checked as boolean)}
                />
                <Label htmlFor="abrirAbaExterna">
                  Permitir abrir em aba externa
                </Label>
              </div>
            </div>
          )}

          {tipo === 'Redação com Frase Temática' && (
            <>
              <div>
                <Label htmlFor="temaSearch">Buscar Tema *</Label>
                <div className="relative">
                  <Input
                    id="temaSearch"
                    value={temaSearch}
                    onChange={(e) => setTemaSearch(e.target.value)}
                    placeholder="Buscar tema pela frase temática..."
                    className="mb-2"
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
                </div>
                {temaId && (
                  <div className="text-sm text-green-600 mb-2">
                    Tema selecionado: {temas.find(t => t.id === temaId)?.frase_tematica}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio">Data de Início *</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="horaInicio">Hora de Início *</Label>
                  <Input
                    id="horaInicio"
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataFim">Data de Término *</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="horaFim">Hora de Término *</Label>
                  <Input
                    id="horaFim"
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {tipo === 'Google Forms' && (
            <div>
              <Label htmlFor="imagemCapaUrl">URL da Imagem de Capa (opcional)</Label>
              <Input
                id="imagemCapaUrl"
                value={imagemCapaUrl}
                onChange={(e) => setImagemCapaUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          )}

          <div>
            <Label>Turmas Autorizadas</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="permiteVisitante"
              checked={permiteVisitante}
              onCheckedChange={(checked) => setPermiteVisitante(checked as boolean)}
            />
            <Label htmlFor="permiteVisitante">
              Permite visitante
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativo"
              checked={ativo}
              onCheckedChange={(checked) => setAtivo(checked as boolean)}
            />
            <Label htmlFor="ativo">
              Ativo
            </Label>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading 
              ? (exercicioEditando ? "Salvando..." : "Criando...")
              : (exercicioEditando ? "Salvar Alterações" : "Criar Exercício")
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
