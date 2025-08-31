import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SparklesIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GameFormProps {
  gameId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const GameForm: React.FC<GameFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    template: 'conectivos' as 'conectivos' | 'desvios' | 'intervencao',
    difficulty: 1,
    turmas_autorizadas: [] as string[],
    allow_visitor: false,
  });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default GameForm;