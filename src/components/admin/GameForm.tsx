import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SparklesIcon, EditIcon, SaveIcon, PlusIcon, TrashIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GameFormProps {
  gameId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const GameForm: React.FC<GameFormProps> = ({ gameId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    template: 'conectivos' as 'conectivos' | 'desvios' | 'intervencao',
    difficulty: 1,
    turmas_autorizadas: [] as string[],
    allow_visitor: false,
    status: 'draft' as 'draft' | 'published',
  });
  
  const [gameLevels, setGameLevels] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (gameId) {
      loadGame(gameId);
    }
  }, [gameId]);

  const loadGame = async (id: string) => {
    try {
      setLoading(true);
      
      // Carregar dados do jogo
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (gameError) throw gameError;

      // Carregar níveis do jogo
      const { data: levels, error: levelsError } = await supabase
        .from('game_levels')
        .select('*')
        .eq('game_id', id)
        .order('level_index');

      if (levelsError) throw levelsError;

      // Preencher formulário
      setFormData({
        title: game.title,
        template: game.template as 'conectivos' | 'desvios' | 'intervencao',
        difficulty: game.difficulty,
        turmas_autorizadas: game.turmas_autorizadas || [],
        allow_visitor: game.allow_visitor,
        status: game.status as 'draft' | 'published',
      });

      setGameLevels(levels || []);
      setIsEditing(true);
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

  const generateGameWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Erro",
        description: "Digite um prompt para gerar o jogo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Gerar dados do jogo com IA
      const gameData = {
        title: `${getTemplateName(formData.template)} - ${aiPrompt.substring(0, 50)}`,
        template: formData.template,
        difficulty: formData.difficulty,
        competencies: getTemplateCompetencies(formData.template),
        tags: ['ia-gerado'],
        status: 'draft' as const,
        allow_visitor: formData.allow_visitor,
        turmas_autorizadas: formData.turmas_autorizadas,
        created_by: '00000000-0000-0000-0000-000000000000'
      };

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert(gameData)
        .select()
        .single();

      if (gameError) throw gameError;

      // Gerar níveis baseado no template e prompt
      const generatedLevels = generateLevelsForTemplate(formData.template, aiPrompt, 3);
      
      for (let i = 0; i < generatedLevels.length; i++) {
        await supabase
          .from('game_levels')
          .insert({
            game_id: game.id,
            title: `Fase ${i + 1}`,
            payload: generatedLevels[i],
            status: 'published',
            level_index: i
          });
      }

      toast({
        title: "Sucesso",
        description: "Jogo gerado com IA com sucesso! Revise e publique quando estiver pronto.",
        variant: "default"
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao gerar jogo com IA:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar jogo com IA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTemplateName = (template: string) => {
    switch (template) {
      case 'conectivos': return 'Caça-Conectivos';
      case 'desvios': return 'Desafio dos Desvios';
      case 'intervencao': return 'Oficina da Intervenção';
      default: return 'Jogo';
    }
  };

  const getTemplateCompetencies = (template: string) => {
    switch (template) {
      case 'conectivos': return [4];
      case 'desvios': return [1];
      case 'intervencao': return [5];
      default: return [];
    }
  };

  const generateLevelsForTemplate = (template: string, prompt: string, count: number) => {
    const levels = [];
    
    for (let i = 0; i < count; i++) {
      const difficulty = i + 1;
      
      if (template === 'conectivos') {
        levels.push({
          sentences: [
            {
              text: `Sobre o tema "${prompt}", ___ é fundamental considerar os aspectos relevantes.`,
              slots: 1,
              answers: ["portanto", "logo", "assim"],
              distractors: ["porém", "mas", "todavia"]
            },
            {
              text: `Embora o assunto "${prompt}" seja complexo, ___ devemos analisá-lo cuidadosamente.`,
              slots: 1,
              answers: ["ainda assim", "mesmo assim", "contudo"],
              distractors: ["então", "por isso", "logo"]
            }
          ]
        });
      } else if (template === 'desvios') {
        const topics = prompt.toLowerCase().split(' ');
        const mainTopic = topics[0] || 'educação';
        
        levels.push({
          items: [
            {
              incorrect: `A ${mainTopic} dos aluno são importante.`,
              correct: `A ${mainTopic} dos alunos é importante.`,
              explanation: "Erro de concordância nominal - 'aluno' deveria estar no plural."
            },
            {
              incorrect: `Os professor ensina sobre ${mainTopic}.`,
              correct: `Os professores ensinam sobre ${mainTopic}.`,
              explanation: "Erro de concordância nominal e verbal."
            },
            {
              incorrect: `Existe muitos benefício na ${mainTopic}.`,
              correct: `Existem muitos benefícios na ${mainTopic}.`,
              explanation: "Erro de concordância verbal e nominal."
            }
          ]
        });
      } else if (template === 'intervencao') {
        levels.push({
          slots: ["Agente", "Ação", "Meio", "Finalidade", "Detalhamento"],
          pieces: [
            "Ministério da Educação",
            "Secretaria de Saúde",
            "Governo Federal",
            "implementar",
            "promover", 
            "desenvolver",
            "programas educacionais",
            "campanhas de conscientização",
            "políticas públicas",
            `melhorar a situação do(a) ${prompt.toLowerCase()}`,
            "reduzir os problemas relacionados",
            "conscientizar a população",
            "através de parcerias",
            "por meio de capacitação",
            "com o apoio da mídia"
          ],
          valid_sets: [
            {
              "Agente": "Ministério da Educação",
              "Ação": "implementar",
              "Meio": "programas educacionais",
              "Finalidade": `melhorar a situação do(a) ${prompt.toLowerCase()}`,
              "Detalhamento": "através de parcerias"
            }
          ]
        });
      }
    }
    
    return levels;
  };

  const saveGame = async () => {
    try {
      setLoading(true);

      if (isEditing && gameId) {
        // Atualizar jogo existente
        const { error: gameError } = await supabase
          .from('games')
          .update({
            title: formData.title,
            template: formData.template,
            difficulty: formData.difficulty,
            turmas_autorizadas: formData.turmas_autorizadas,
            allow_visitor: formData.allow_visitor,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId);

        if (gameError) throw gameError;

        // Atualizar níveis
        for (const level of gameLevels) {
          const { error: levelError } = await supabase
            .from('game_levels')
            .update({
              title: level.title,
              payload: level.payload,
              status: level.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', level.id);

          if (levelError) throw levelError;
        }

        toast({
          title: "Sucesso",
          description: "Jogo atualizado com sucesso!",
          variant: "default"
        });
      }

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

  const updateLevelSentence = (levelIndex: number, sentenceIndex: number, field: string, value: any) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const sentences = [...level.payload.sentences];
    sentences[sentenceIndex] = { ...sentences[sentenceIndex], [field]: value };
    level.payload = { ...level.payload, sentences };
    setGameLevels(newLevels);
  };

  const addDistractor = (levelIndex: number, sentenceIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const sentences = [...level.payload.sentences];
    const sentence = sentences[sentenceIndex];
    const distractors = [...(sentence.distractors || []), ''];
    sentences[sentenceIndex] = { ...sentence, distractors };
    level.payload = { ...level.payload, sentences };
    setGameLevels(newLevels);
  };

  const removeDistractor = (levelIndex: number, sentenceIndex: number, distractorIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const sentences = [...level.payload.sentences];
    const sentence = sentences[sentenceIndex];
    const distractors = sentence.distractors.filter((_: any, i: number) => i !== distractorIndex);
    sentences[sentenceIndex] = { ...sentence, distractors };
    level.payload = { ...level.payload, sentences };
    setGameLevels(newLevels);
  };

  const updateDistractor = (levelIndex: number, sentenceIndex: number, distractorIndex: number, value: string) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const sentences = [...level.payload.sentences];
    const sentence = sentences[sentenceIndex];
    const distractors = [...sentence.distractors];
    distractors[distractorIndex] = value;
    sentences[sentenceIndex] = { ...sentence, distractors };
    level.payload = { ...level.payload, sentences };
    setGameLevels(newLevels);
  };

  // Funções para jogos de desvios
  const updateLevelItem = (levelIndex: number, itemIndex: number, field: string, value: any) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const items = [...level.payload.items];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    level.payload = { ...level.payload, items };
    setGameLevels(newLevels);
  };

  const addLevelItem = (levelIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const items = [...(level.payload.items || []), { incorrect: '', correct: '', explanation: '' }];
    level.payload = { ...level.payload, items };
    setGameLevels(newLevels);
  };

  const removeLevelItem = (levelIndex: number, itemIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const items = level.payload.items.filter((_: any, i: number) => i !== itemIndex);
    level.payload = { ...level.payload, items };
    setGameLevels(newLevels);
  };

  // Funções para jogos de intervenção - slots
  const updateLevelSlot = (levelIndex: number, slotIndex: number, value: string) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const slots = [...level.payload.slots];
    slots[slotIndex] = value;
    level.payload = { ...level.payload, slots };
    setGameLevels(newLevels);
  };

  const addLevelSlot = (levelIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const slots = [...(level.payload.slots || []), ''];
    level.payload = { ...level.payload, slots };
    setGameLevels(newLevels);
  };

  const removeLevelSlot = (levelIndex: number, slotIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const slots = level.payload.slots.filter((_: any, i: number) => i !== slotIndex);
    level.payload = { ...level.payload, slots };
    setGameLevels(newLevels);
  };

  // Funções para jogos de intervenção - peças
  const updateLevelPiece = (levelIndex: number, pieceIndex: number, value: string) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const pieces = [...level.payload.pieces];
    pieces[pieceIndex] = value;
    level.payload = { ...level.payload, pieces };
    setGameLevels(newLevels);
  };

  const addLevelPiece = (levelIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const pieces = [...(level.payload.pieces || []), ''];
    level.payload = { ...level.payload, pieces };
    setGameLevels(newLevels);
  };

  const removeLevelPiece = (levelIndex: number, pieceIndex: number) => {
    const newLevels = [...gameLevels];
    const level = newLevels[levelIndex];
    const pieces = level.payload.pieces.filter((_: any, i: number) => i !== pieceIndex);
    level.payload = { ...level.payload, pieces };
    setGameLevels(newLevels);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditing ? <EditIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
            {isEditing ? `Editando: ${formData.title}` : 'Criar Novo Jogo'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título do Jogo</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite o título do jogo"
              />
            </div>

            <div>
              <Label htmlFor="template">Tipo de Jogo</Label>
              <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conectivos">Caça-Conectivos (Competência 4)</SelectItem>
                  <SelectItem value="desvios">Desafio dos Desvios (Competência 1)</SelectItem>
                  <SelectItem value="intervencao">Oficina da Intervenção (Competência 5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Dificuldade (1-5)</Label>
              <Select value={formData.difficulty.toString()} onValueChange={(value) => setFormData({ ...formData, difficulty: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Muito Fácil</SelectItem>
                  <SelectItem value="2">2 - Fácil</SelectItem>
                  <SelectItem value="3">3 - Médio</SelectItem>
                  <SelectItem value="4">4 - Difícil</SelectItem>
                  <SelectItem value="5">5 - Muito Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Turmas Autorizadas</Label>
              <Input
                value={formData.turmas_autorizadas.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  turmas_autorizadas: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                })}
                placeholder="A, B, C, E (deixe vazio para todas)"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="allow_visitor"
                checked={formData.allow_visitor}
                onChange={(e) => setFormData({ ...formData, allow_visitor: e.target.checked })}
              />
              <Label htmlFor="allow_visitor">Permitir Visitantes</Label>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button onClick={saveGame} disabled={loading}>
                <SaveIcon className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor de Níveis */}
      {isEditing && gameLevels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Frases e Opções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {gameLevels.map((level, levelIndex) => (
              <Card key={level.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{level.title}</CardTitle>
                    <Select 
                      value={level.status} 
                      onValueChange={(value) => {
                        const newLevels = [...gameLevels];
                        newLevels[levelIndex].status = value;
                        setGameLevels(newLevels);
                      }}
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
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Conectivos - Editor de Frases */}
                  {formData.template === 'conectivos' && level.payload.sentences?.map((sentence: any, sentenceIndex: number) => (
                    <div key={sentenceIndex} className="space-y-4 p-4 border rounded-lg">
                      <div>
                        <Label>Frase (use ___ para indicar onde vai o conectivo)</Label>
                        <Textarea
                          value={sentence.text || ''}
                          onChange={(e) => updateLevelSentence(levelIndex, sentenceIndex, 'text', e.target.value)}
                          rows={3}
                          placeholder="Digite a frase com ___ no lugar do conectivo"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Resposta Correta</Label>
                          <Input
                            value={sentence.correct_answer || ''}
                            onChange={(e) => {
                              updateLevelSentence(levelIndex, sentenceIndex, 'correct_answer', e.target.value);
                              updateLevelSentence(levelIndex, sentenceIndex, 'answers', [e.target.value]);
                            }}
                            placeholder="Digite a resposta correta"
                          />
                        </div>

                        <div>
                          <Label>Opção Incorreta Principal</Label>
                          <Input
                            value={sentence.wrong_answer || ''}
                            onChange={(e) => updateLevelSentence(levelIndex, sentenceIndex, 'wrong_answer', e.target.value)}
                            placeholder="Digite a opção incorreta principal"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Opções Distratoras Adicionais</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => addDistractor(levelIndex, sentenceIndex)}
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {sentence.distractors?.map((distractor: string, distractorIndex: number) => (
                            <div key={distractorIndex} className="flex gap-2">
                              <Input
                                value={distractor}
                                onChange={(e) => updateDistractor(levelIndex, sentenceIndex, distractorIndex, e.target.value)}
                                placeholder="Digite uma opção incorreta"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeDistractor(levelIndex, sentenceIndex, distractorIndex)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Desvios - Editor de Frases Incorretas/Corretas */}
                  {formData.template === 'desvios' && level.payload.items?.map((item: any, itemIndex: number) => (
                    <div key={itemIndex} className="space-y-4 p-4 border rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Frase Incorreta (com erro)</Label>
                          <Textarea
                            value={item.incorrect || ''}
                            onChange={(e) => updateLevelItem(levelIndex, itemIndex, 'incorrect', e.target.value)}
                            rows={3}
                            placeholder="Digite a frase com erro ortográfico/gramatical"
                          />
                        </div>

                        <div>
                          <Label>Frase Corrigida</Label>
                          <Textarea
                            value={item.correct || ''}
                            onChange={(e) => updateLevelItem(levelIndex, itemIndex, 'correct', e.target.value)}
                            rows={3}
                            placeholder="Digite a frase corrigida"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Explicação do Erro (opcional)</Label>
                        <Input
                          value={item.explanation || ''}
                          onChange={(e) => updateLevelItem(levelIndex, itemIndex, 'explanation', e.target.value)}
                          placeholder="Explique brevemente qual é o erro"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeLevelItem(levelIndex, itemIndex)}
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Remover Frase
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Botão para adicionar nova frase nos jogos de desvios */}
                  {formData.template === 'desvios' && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addLevelItem(levelIndex)}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Adicionar Nova Frase
                      </Button>
                    </div>
                  )}

                  {/* Intervenção - Editor de Slots e Peças */}
                  {formData.template === 'intervencao' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Slots da Proposta de Intervenção</Label>
                        <div className="space-y-2">
                          {level.payload.slots?.map((slot: string, slotIndex: number) => (
                            <div key={slotIndex} className="flex gap-2">
                              <Input
                                value={slot}
                                onChange={(e) => updateLevelSlot(levelIndex, slotIndex, e.target.value)}
                                placeholder="Nome do slot (ex: Agente, Ação, Meio...)"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeLevelSlot(levelIndex, slotIndex)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addLevelSlot(levelIndex)}
                          className="mt-2"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Adicionar Slot
                        </Button>
                      </div>

                      <div>
                        <Label>Peças Disponíveis</Label>
                        <div className="space-y-2">
                          {level.payload.pieces?.map((piece: string, pieceIndex: number) => (
                            <div key={pieceIndex} className="flex gap-2">
                              <Input
                                value={piece}
                                onChange={(e) => updateLevelPiece(levelIndex, pieceIndex, e.target.value)}
                                placeholder="Texto da peça"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeLevelPiece(levelIndex, pieceIndex)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addLevelPiece(levelIndex)}
                          className="mt-2"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Adicionar Peça
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Criação com IA (apenas para novos jogos) */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5" />
              Gerar Jogo com IA
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template">Tipo de Jogo</Label>
              <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conectivos">Caça-Conectivos (Competência 4)</SelectItem>
                  <SelectItem value="desvios">Desafio dos Desvios (Competência 1)</SelectItem>
                  <SelectItem value="intervencao">Oficina da Intervenção (Competência 5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Dificuldade (1-5)</Label>
              <Select value={formData.difficulty.toString()} onValueChange={(value) => setFormData({ ...formData, difficulty: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Muito Fácil</SelectItem>
                  <SelectItem value="2">2 - Fácil</SelectItem>
                  <SelectItem value="3">3 - Médio</SelectItem>
                  <SelectItem value="4">4 - Difícil</SelectItem>
                  <SelectItem value="5">5 - Muito Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Turmas Autorizadas</Label>
              <Input
                value={formData.turmas_autorizadas.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  turmas_autorizadas: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                })}
                placeholder="A, B, C, E (deixe vazio para todas)"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="allow_visitor"
                checked={formData.allow_visitor}
                onChange={(e) => setFormData({ ...formData, allow_visitor: e.target.checked })}
              />
              <Label htmlFor="allow_visitor">Permitir Visitantes</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="prompt">Tema ou Conteúdo do Jogo</Label>
            <Textarea
              id="prompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Descreva o tema que você quer abordar. Ex: meio ambiente e sustentabilidade, tecnologia na educação, saúde mental dos jovens, violência doméstica, etc."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button 
              onClick={generateGameWithAI}
              disabled={!aiPrompt.trim() || loading}
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              {loading ? "Gerando..." : "Gerar Jogo"}
            </Button>
          </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GameForm;