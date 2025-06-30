
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

const AulaForm = () => {
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [googleMeetUrl, setGoogleMeetUrl] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const turmasDisponiveis = [
    { id: "LRA2025", nome: "Turma A (LRA2025)" },
    { id: "LRB2025", nome: "Turma B (LRB2025)" },
    { id: "LRC2025", nome: "Turma C (LRC2025)" },
    { id: "LRD2025", nome: "Turma D (LRD2025)" },
    { id: "LRE2025", nome: "Turma E (LRE2025)" }
  ];

  const { data: modules, isLoading } = useQuery({
    queryKey: ['aula-modules-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_modules')
        .select('*')
        .order('ordem');
      
      if (error) {
        console.error("Error fetching modules:", error);
        throw error;
      }
      return data;
    }
  });

  const selectedModule = modules?.find(m => m.id === selectedModuleId);

  const createAulaMutation = useMutation({
    mutationFn: async (aulaData: any) => {
      console.log("Creating aula with data:", aulaData);
      
      const { data, error } = await supabase
        .from('aulas')
        .insert([aulaData])
        .select()
        .single();
      
      if (error) {
        console.error("Error creating aula:", error);
        throw error;
      }
      
      console.log("Aula created successfully:", data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Aula cadastrada com sucesso!",
      });
      
      // Reset form
      setSelectedModuleId("");
      setTitulo("");
      setDescricao("");
      setYoutubeUrl("");
      setGoogleMeetUrl("");
      setAtivo(true);
      setSelectedTurmas([]);
      
      queryClient.invalidateQueries({ queryKey: ['aulas-with-modules'] });
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
    },
    onError: (error: any) => {
      console.error("Error in mutation:", error);
      toast({
        title: "Erro",
        description: `Erro ao cadastrar aula: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleTurmaChange = (turmaId: string, checked: boolean) => {
    if (checked) {
      setSelectedTurmas([...selectedTurmas, turmaId]);
    } else {
      setSelectedTurmas(selectedTurmas.filter(id => id !== turmaId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedModuleId || !titulo) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (selectedTurmas.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma turma para ter acesso a esta aula.",
        variant: "destructive",
      });
      return;
    }

    // Para aulas ao vivo, validar se tem Google Meet URL
    if (selectedModule?.tipo === 'ao_vivo' && !googleMeetUrl) {
      toast({
        title: "Erro",
        description: "Para aulas ao vivo, o link do Google Meet é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Para aulas de competência, validar se tem YouTube URL
    if (selectedModule?.tipo === 'competencia' && !youtubeUrl) {
      toast({
        title: "Erro",
        description: "Para aulas de competência, o link do YouTube é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const aulaData = {
      module_id: selectedModuleId,
      titulo,
      descricao: descricao || null,
      youtube_url: youtubeUrl || null,
      google_meet_url: googleMeetUrl || null,
      ativo,
      ordem: 0,
      turmas: selectedTurmas,
    };

    console.log("Submitting aula data:", aulaData);
    createAulaMutation.mutate(aulaData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando módulos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Cadastrar Nova Aula
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="module">Módulo *</Label>
            <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um módulo" />
              </SelectTrigger>
              <SelectContent>
                {modules?.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="titulo">Título da Aula *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Introdução à Competência 1"
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o conteúdo da aula..."
              rows={3}
            />
          </div>

          <div>
            <Label>Turmas com Acesso *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2 p-4 border rounded-lg">
              {turmasDisponiveis.map((turma) => (
                <div key={turma.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={turma.id}
                    checked={selectedTurmas.includes(turma.id)}
                    onCheckedChange={(checked) => handleTurmaChange(turma.id, checked as boolean)}
                  />
                  <Label htmlFor={turma.id} className="text-sm">
                    {turma.nome}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Selecione as turmas que terão acesso a esta aula
            </p>
          </div>

          {selectedModule?.tipo === 'competencia' && (
            <div>
              <Label htmlFor="youtube">Link do YouTube *</Label>
              <Input
                id="youtube"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          {selectedModule?.tipo === 'ao_vivo' && (
            <div>
              <Label htmlFor="meet">Link do Google Meet *</Label>
              <Input
                id="meet"
                value={googleMeetUrl}
                onChange={(e) => setGoogleMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
            />
            <Label htmlFor="ativo">Aula ativa</Label>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={createAulaMutation.isPending}
          >
            {createAulaMutation.isPending ? "Cadastrando..." : "Cadastrar Aula"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AulaForm;
