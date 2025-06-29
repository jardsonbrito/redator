
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface ExercicioEditFormProps {
  exercicio: any;
  onCancel: () => void;
}

const ExercicioEditForm = ({ exercicio, onCancel }: ExercicioEditFormProps) => {
  const [titulo, setTitulo] = useState(exercicio.titulo || '');
  const [tipo, setTipo] = useState<'formulario' | 'frase_tematica'>(exercicio.tipo || 'formulario');
  const [urlFormulario, setUrlFormulario] = useState(exercicio.url_formulario || '');
  const [embedFormulario, setEmbedFormulario] = useState(exercicio.embed_formulario || false);
  const [fraseTematica, setFraseTematica] = useState(exercicio.frase_tematica || '');
  const [imagemThumbnail, setImagemThumbnail] = useState(exercicio.imagem_thumbnail || '');
  const [ativo, setAtivo] = useState(exercicio.ativo ?? true);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateExercicioMutation = useMutation({
    mutationFn: async (exercicioData: any) => {
      console.log('Updating exercicio with data:', exercicioData);
      const { data, error } = await supabase
        .from('exercicios')
        .update(exercicioData)
        .eq('id', exercicio.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating exercicio:', error);
        throw error;
      }

      console.log('Exercicio updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Exercício atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] });
      queryClient.invalidateQueries({ queryKey: ['exercicios'] });
      onCancel();
    },
    onError: (error) => {
      console.error('Error updating exercicio:', error);
      toast({
        title: "Erro ao atualizar exercício",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  });

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
      ativo,
      atualizado_em: new Date().toISOString()
    };

    updateExercicioMutation.mutate(exercicioData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-orange-600/20">
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
        <div className="space-y-2">
          <Label htmlFor="fraseTematica">Frase Temática *</Label>
          <Textarea
            id="fraseTematica"
            value={fraseTematica}
            onChange={(e) => setFraseTematica(e.target.value)}
            placeholder="Digite a frase temática que será inserida no cabeçalho do ENEM"
            required
            className="min-h-[100px]"
          />
          <p className="text-sm text-gray-600">
            Esta frase será automaticamente inserida no cabeçalho padrão do ENEM
          </p>
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

      <div className="flex items-center space-x-2">
        <Checkbox
          id="ativo"
          checked={ativo}
          onCheckedChange={(checked) => setAtivo(checked as boolean)}
        />
        <Label htmlFor="ativo">Exercício ativo (visível para os alunos)</Label>
      </div>

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={updateExercicioMutation.isPending}
          className="flex-1 bg-orange-600 hover:bg-orange-700"
        >
          {updateExercicioMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default ExercicioEditForm;
