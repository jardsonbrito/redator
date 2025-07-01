
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

export const ExercicioForm = () => {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [linkForms, setLinkForms] = useState("");
  const [temaId, setTemaId] = useState("");
  const [imagemCapaUrl, setImagemCapaUrl] = useState("");
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [permiteVisitante, setPermiteVisitante] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [temas, setTemas] = useState<Tema[]>([]);

  const tiposDisponiveis = [
    'Google Forms',
    'Redação com Frase Temática'
  ];

  const turmasDisponiveis = [
    'TURMA A', 'TURMA B', 'TURMA C', 'TURMA D', 'TURMA E',
    'TURMA F', 'TURMA G', 'TURMA H', 'TURMA I', 'TURMA J'
  ];

  useEffect(() => {
    fetchTemas();
  }, []);

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

    if (tipo === 'Redação com Frase Temática' && !temaId) {
      toast.error("Tema é obrigatório para exercícios de redação.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await (supabase as any)
        .from("exercicios")
        .insert({
          titulo,
          tipo,
          link_forms: tipo === 'Google Forms' ? linkForms : null,
          tema_id: tipo === 'Redação com Frase Temática' ? temaId : null,
          imagem_capa_url: imagemCapaUrl || null,
          turmas_autorizadas: turmasAutorizadas,
          permite_visitante: permiteVisitante,
          ativo
        });

      if (error) throw error;

      toast.success("Exercício criado com sucesso!");
      
      // Reset form
      setTitulo("");
      setTipo("");
      setLinkForms("");
      setTemaId("");
      setImagemCapaUrl("");
      setTurmasAutorizadas([]);
      setPermiteVisitante(false);
      setAtivo(true);

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
        <CardTitle>Criar Novo Exercício</CardTitle>
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
            </div>
          )}

          {tipo === 'Redação com Frase Temática' && (
            <div>
              <Label htmlFor="tema">Tema *</Label>
              <Select value={temaId} onValueChange={setTemaId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tema" />
                </SelectTrigger>
                <SelectContent>
                  {temas.map((tema) => (
                    <SelectItem key={tema.id} value={tema.id}>
                      {tema.frase_tematica} ({tema.eixo_tematico})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            {isLoading ? "Criando..." : "Criar Exercício"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
