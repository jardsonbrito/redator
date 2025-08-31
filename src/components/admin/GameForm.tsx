import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SaveIcon, SparklesIcon, PlusIcon, TrashIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GameFormProps {
  gameId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface GameLevel {
  id?: string;
  title: string;
  payload: any;
  status: 'draft' | 'published';
  level_index: number;
}

const GameForm: React.FC<GameFormProps> = ({ gameId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    template: 'conectivos' as 'conectivos' | 'desvios' | 'intervencao',
    difficulty: 1,
    competencies: [] as number[],
    tags: [] as string[],
    turmas_autorizadas: [] as string[],
    allow_visitor: false,
    start_at: '',
    end_at: ''
  });
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (gameId) {
      loadGame();
    }
  }, [gameId]);

  const loadGame = async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          game_levels(*)
        `)
        .eq('id', gameId)
        .single();

      if (error) throw error;

      setFormData({
        title: data.title,
        template: data.template as 'conectivos' | 'desvios' | 'intervencao',
        difficulty: data.difficulty,
        competencies: data.competencies || [],
        tags: data.tags || [],
        turmas_autorizadas: data.turmas_autorizadas || [],
        allow_visitor: data.allow_visitor,
        start_at: data.start_at ? new Date(data.start_at).toISOString().slice(0, 16) : '',
        end_at: data.end_at ? new Date(data.end_at).toISOString().slice(0, 16) : ''
      });

      setLevels((data.game_levels || []).map((level: any) => ({
        id: level.id,
        title: level.title,
        payload: level.payload,
        status: level.status as 'draft' | 'published',
        level_index: level.level_index
      })));
    } catch (error) {
      console.error('Erro ao carregar jogo:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do jogo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const gameData = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        created_by: 'admin-id' // TODO: Get from auth context
      };

      let gameResult;
      if (gameId) {
        const { data, error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', gameId)
          .select()
          .single();
        
        if (error) throw error;
        gameResult = data;
      } else {
        const { data, error } = await supabase
          .from('games')
          .insert(gameData)
          .select()
          .single();
        
        if (error) throw error;
        gameResult = data;
      }

      // Save levels
      for (const level of levels) {
        if (level.id) {
          await supabase
            .from('game_levels')
            .update({
              title: level.title,
              payload: level.payload,
              status: level.status
            })
            .eq('id', level.id);
        } else {
          await supabase
            .from('game_levels')
            .insert({
              game_id: gameResult.id,
              title: level.title,
              payload: level.payload,
              status: level.status,
              level_index: level.level_index
            });
        }
      }

      toast({
        title: "Sucesso",
        description: `Jogo ${gameId ? 'atualizado' : 'criado'} com sucesso`,
        variant: "default"
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar jogo:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar jogo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Erro",
        description: "Digite um prompt para gerar com IA",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement AI generation
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A geração por IA será implementada em breve",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar com IA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsAIModalOpen(false);
    }
  };

  const addLevel = () => {
    setLevels([...levels, {
      title: `Fase ${levels.length + 1}`,
      payload: getDefaultPayload(formData.template),
      status: 'draft',
      level_index: levels.length + 1
    }]);
  };

  const removeLevel = (index: number) => {
    setLevels(levels.filter((_, i) => i !== index));
  };

  const updateLevel = (index: number, field: keyof GameLevel, value: any) => {
    const updatedLevels = [...levels];
    updatedLevels[index] = { ...updatedLevels[index], [field]: value };
    setLevels(updatedLevels);
  };

  const getDefaultPayload = (template: string) => {
    switch (template) {
      case 'conectivos':
        return {
          sentences: [
            {
              text: "Embora ___, ___.",
              slots: 1,
              answers: ["apesar de"],
              distractors: ["portanto", "logo", "pois"]
            }
          ]
        };
      case 'desvios':
        return {
          items: [
            {
              incorrect: "Os aluno estuda muito.",
              correct: "Os alunos estudam muito.",
              explanation: "Erro de concordância nominal e verbal."
            }
          ]
        };
      case 'intervencao':
        return {
          slots: ["Agente", "Ação", "Meio", "Finalidade", "Detalhamento"],
          pieces: ["Ministério da Saúde", "promover", "campanhas educativas", "a fim de", "por meio de palestras"],
          valid_sets: [
            {
              "Agente": "Ministério da Saúde",
              "Ação": "promover",
              "Meio": "campanhas educativas",
              "Finalidade": "reduzir a depressão entre jovens",
              "Detalhamento": "por meio de palestras nas escolas"
            }
          ]
        };
      default:
        return {};
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {gameId ? 'Editar Jogo' : 'Criar Novo Jogo'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                <TabsTrigger value="levels">Fases</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Título do Jogo</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Digite o título do jogo"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="template">Tipo de Jogo</Label>
                    <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value as any })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conectivos">Caça-Conectivos</SelectItem>
                        <SelectItem value="desvios">Desafio dos Desvios</SelectItem>
                        <SelectItem value="intervencao">Oficina da Intervenção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Dificuldade (1-5)</Label>
                    <Input
                      id="difficulty"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label>Competências (separadas por vírgula)</Label>
                    <Input
                      value={formData.competencies.join(', ')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        competencies: e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
                      })}
                      placeholder="1, 2, 3, 4, 5"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="levels" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Fases do Jogo</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAIModalOpen(true)}
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Gerar com IA
                    </Button>
                    <Button type="button" onClick={addLevel}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Adicionar Fase
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {levels.map((level, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={level.title}
                            onChange={(e) => updateLevel(index, 'title', e.target.value)}
                            placeholder="Título da fase"
                          />
                          <Select 
                            value={level.status} 
                            onValueChange={(value) => updateLevel(index, 'status', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Rascunho</SelectItem>
                              <SelectItem value="published">Publicado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeLevel(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label>Configuração da Fase (JSON)</Label>
                        <Textarea
                          value={JSON.stringify(level.payload, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              updateLevel(index, 'payload', parsed);
                            } catch (err) {
                              // Invalid JSON, don't update
                            }
                          }}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_at">Data/Hora de Início (opcional)</Label>
                    <Input
                      id="start_at"
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_at">Data/Hora de Fim (opcional)</Label>
                    <Input
                      id="end_at"
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Turmas Autorizadas (separadas por vírgula)</Label>
                    <Input
                      value={formData.turmas_autorizadas.join(', ')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        turmas_autorizadas: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      })}
                      placeholder="A, B, C, E"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allow_visitor"
                      checked={formData.allow_visitor}
                      onChange={(e) => setFormData({ ...formData, allow_visitor: e.target.checked })}
                    />
                    <Label htmlFor="allow_visitor">Permitir Visitantes</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                <SaveIcon className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Jogo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* AI Generation Modal */}
      <AlertDialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Fases com IA</AlertDialogTitle>
            <AlertDialogDescription>
              Descreva o que você gostaria que a IA criasse para este jogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ex: Crie 5 fases sobre conectivos adversativos, com dificuldade crescente..."
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={generateWithAI}>
              <SparklesIcon className="h-4 w-4 mr-2" />
              Gerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GameForm;