
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const ExercicioForm = () => {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'formulario' | 'frase_tematica'>('formulario');
  const [urlFormulario, setUrlFormulario] = useState('');
  const [embedFormulario, setEmbedFormulario] = useState(false);
  const [fraseTematica, setFraseTematica] = useState('');
  const [temaSearch, setTemaSearch] = useState('');
  const [selectedTema, setSelectedTema] = useState<any>(null);
  const [imagemThumbnail, setImagemThumbnail] = useState('');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [showPermiteVisitante, setShowPermiteVisitante] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const turmasDisponiveis = [
    { id: "LRA2025", nome: "Turma A" },
    { id: "LRB2025", nome: "Turma B" },
    { id: "LRC2025", nome: "Turma C" },
    { id: "LRD2025", nome: "Turma D" },
    { id: "LRE2025", nome: "Turma E" }
  ];

  // Buscar temas disponíveis para autocomplete
  const { data: temas } = useQuery({
    queryKey: ['temas-search', temaSearch],
    queryFn: async () => {
      if (!temaSearch || temaSearch.length < 2) return [];
      
      const { data, error } = await supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico')
        .eq('status', 'publicado')
        .ilike('frase_tematica', `%${temaSearch}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: tipo === 'frase_tematica' && temaSearch.length >= 2
  });

  const createExercicioMutation = useMutation({
    mutationFn: async (exercicioData: any) => {
      console.log('Creating exercicio with data:', exercicioData);
      const { data, error } = await supabase
        .from('exercicios')
        .insert([exercicioData])
        .select()
        .single();

      if (error) {
        console.error('Error creating exercicio:', error);
        throw error;
      }

      console.log('Exercicio created successfully:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Exercício cadastrado com sucesso!",
        description: "O novo exercício foi adicionado à plataforma.",
      });
      
      // Reset form
      setTitulo('');
      setTipo('formulario');
      setUrlFormulario('');
      setEmbedFormulario(false);
      setFraseTematica('');
      setTemaSearch('');
      setSelectedTema(null);
      setImagemThumbnail('');
      setSelectedTurmas([]);
      setShowPermiteVisitante(false);
      
      queryClient.invalidateQueries({ queryKey: ['exercicios'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] });
    },
    onError: (error) => {
      console.error('Error creating exercicio:', error);
      toast({
        title: "Erro ao cadastrar exercício",
        description: "Tente novamente mais tarde.",
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

  const handleTemaSelect = (tema: any) => {
    setSelectedTema(tema);
    setFraseTematica(tema.frase_tematica);
    setTemaSearch(tema.frase_tematica);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast({
        title: "Erro de validação",
        description: "O título é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!showPermiteVisitante && selectedTurmas.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos uma turma ou marque 'Permite visitante'.",
        variant: "destructive",
      });
      return;
    }

    if (tipo === 'formulario' && !urlFormulario.trim()) {
      toast({
        title: "Erro de validação",
        description: "A URL do formulário é obrigatória para exercícios do tipo formulário.",
        variant: "destructive",
      });
      return;
    }

    if (tipo === 'frase_tematica' && !fraseTematica.trim()) {
      toast({
        title: "Erro de validação",
        description: "A frase temática é obrigatória para exercícios do tipo redação.",
        variant: "destructive",
      });
      return;
    }

    const exercicioData = {
      titulo: titulo.trim(),
      tipo,
      url_formulario: tipo === 'formulario' ? urlFormulario.trim() : null,
      embed_formulario: tipo === 'formulario' ? embedFormulario : false,
      frase_tematica: tipo === 'frase_tematica' ? fraseTematica.trim() : null,
      imagem_thumbnail: imagemThumbnail.trim() || null,
      ativo: true,
      turmas: selectedTurmas,
      permite_visitante: showPermiteVisitante
    };

    createExercicioMutation.mutate(exercicioData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título do Exercício *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Digite o título do exercício"
          required
        />
      </div>

      <div className="space-y-4">
        <Label>Tipo de Exercício *</Label>
        <RadioGroup value={tipo} onValueChange={(value: 'formulario' | 'frase_tematica') => setTipo(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="formulario" id="formulario" />
            <Label htmlFor="formulario">Formulário Google</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="frase_tematica" id="frase_tematica" />
            <Label htmlFor="frase_tematica">Redação com Frase Temática</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Acesso ao Exercício *</Label>
        <div className="space-y-4 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="permite-visitante"
              checked={showPermiteVisitante}
              onCheckedChange={(checked) => setShowPermiteVisitante(checked as boolean)}
            />
            <Label htmlFor="permite-visitante" className="text-sm font-medium">
              Permite acesso de visitantes
            </Label>
          </div>
          
          <div className="p-4 border rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Turmas Autorizadas</Label>
            <div className="grid grid-cols-2 gap-3">
              {turmasDisponiveis.map((turma) => (
                <div key={turma.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`turma-${turma.id}`}
                    checked={selectedTurmas.includes(turma.id)}
                    onCheckedChange={(checked) => handleTurmaChange(turma.id, checked as boolean)}
                  />
                  <Label htmlFor={`turma-${turma.id}`} className="text-sm">
                    {turma.nome}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tipo === 'formulario' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="urlFormulario">URL do Formulário Google *</Label>
            <Input
              id="urlFormulario"
              value={urlFormulario}
              onChange={(e) => setUrlFormulario(e.target.value)}
              placeholder="https://forms.google.com/..."
              type="url"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="embedFormulario"
              checked={embedFormulario}
              onCheckedChange={(checked) => setEmbedFormulario(checked as boolean)}
            />
            <Label htmlFor="embedFormulario">
              Exibir formulário embutido (se desmarcado, abrirá em nova aba)
            </Label>
          </div>
        </div>
      )}

      {tipo === 'frase_tematica' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="temaSearch">Buscar Tema Cadastrado</Label>
            <Input
              id="temaSearch"
              value={temaSearch}
              onChange={(e) => setTemaSearch(e.target.value)}
              placeholder="Digite para buscar um tema já cadastrado..."
            />
            
            {temas && temas.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {temas.map((tema) => (
                  <div
                    key={tema.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleTemaSelect(tema)}
                  >
                    <p className="font-medium text-sm">{tema.frase_tematica}</p>
                    <p className="text-xs text-gray-500 mt-1">{tema.eixo_tematico}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fraseTematica">Frase Temática *</Label>
            <Textarea
              id="fraseTematica"
              value={fraseTematica}
              onChange={(e) => setFraseTematica(e.target.value)}
              placeholder="Digite a frase temática ou busque um tema acima"
              required
              className="min-h-[100px]"
            />
            <p className="text-sm text-gray-600">
              Esta frase será automaticamente inserida no cabeçalho padrão do ENEM
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="imagemThumbnail">URL da Imagem de Capa (opcional)</Label>
        <Input
          id="imagemThumbnail"
          value={imagemThumbnail}
          onChange={(e) => setImagemThumbnail(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          type="url"
        />
      </div>

      <Button
        type="submit"
        disabled={createExercicioMutation.isPending}
        className="w-full bg-orange-600 hover:bg-orange-700"
      >
        {createExercicioMutation.isPending ? 'Cadastrando...' : 'Cadastrar Exercício'}
      </Button>
    </form>
  );
};

export default ExercicioForm;
