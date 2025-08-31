import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlayIcon, TrophyIcon, TimerIcon, StarIcon, CheckCircleIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useToast } from "@/hooks/use-toast";

interface GameLevel {
  id: string;
  title: string;
  level_index: number;
  payload: any;
}

interface Game {
  id: string;
  title: string;
  template: 'conectivos' | 'desvios' | 'intervencao';
  difficulty: number;
  competencies: number[];
}

interface GamePlayProps {
  game: Game;
  level: GameLevel;
  onComplete: (score: number, timeSpent: number) => void;
  onExit: () => void;
}

const GamePlay: React.FC<GamePlayProps> = ({ game, level, onComplete, onExit }) => {
  const [playState, setPlayState] = useState<any>({});
  const [startTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const renderConectivosGame = () => {
    const { sentences } = level.payload;
    if (!sentences || sentences.length === 0) return <div>Jogo não configurado</div>;

    const sentence = sentences[0];
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Complete a frase:</h3>
          <div className="text-xl p-4 bg-muted rounded-lg">
            {sentence.text.replace('___', selectedAnswer || '___')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[...sentence.answers, ...sentence.distractors].map((option, index) => (
            <Button
              key={index}
              variant={selectedAnswer === option ? "default" : "outline"}
              onClick={() => setSelectedAnswer(option)}
              className="p-4 text-center"
            >
              {option}
            </Button>
          ))}
        </div>

        <Button
          onClick={() => {
            const isCorrect = sentence.answers.includes(selectedAnswer);
            const newScore = isCorrect ? score + 100 : score;
            setScore(newScore);
            
            setTimeout(() => {
              onComplete(newScore, Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
          }}
          disabled={!selectedAnswer}
          className="w-full"
        >
          Confirmar Resposta
        </Button>
      </div>
    );
  };

  const renderDesviosGame = () => {
    const { items } = level.payload;
    if (!items || items.length === 0) return <div>Jogo não configurado</div>;

    const item = items[0];
    const [userCorrection, setUserCorrection] = useState<string>('');

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Corrija a frase:</h3>
          <div className="text-xl p-4 bg-red-50 border border-red-200 rounded-lg">
            {item.incorrect}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sua correção:</label>
          <textarea
            value={userCorrection}
            onChange={(e) => setUserCorrection(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={3}
            placeholder="Digite aqui a frase corrigida..."
          />
        </div>

        <Button
          onClick={() => {
            const similarity = userCorrection.toLowerCase().includes(item.correct.toLowerCase());
            const newScore = similarity ? score + 100 : score;
            setScore(newScore);
            
            setTimeout(() => {
              onComplete(newScore, Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
          }}
          disabled={!userCorrection.trim()}
          className="w-full"
        >
          Confirmar Correção
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          Dica: {item.explanation}
        </div>
      </div>
    );
  };

  const renderIntervencaoGame = () => {
    const { slots, pieces, valid_sets } = level.payload;
    if (!slots || !pieces) return <div>Jogo não configurado</div>;

    const [assignments, setAssignments] = useState<Record<string, string>>({});

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Monte a proposta de intervenção:</h3>
        </div>

        <div className="grid gap-4">
          {slots.map((slot: string) => (
            <div key={slot} className="space-y-2">
              <label className="block text-sm font-medium">{slot}:</label>
              <select
                value={assignments[slot] || ''}
                onChange={(e) => setAssignments({ ...assignments, [slot]: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione...</option>
                {pieces.map((piece: string, index: number) => (
                  <option key={index} value={piece}>{piece}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <Button
          onClick={() => {
            const validSet = valid_sets[0];
            let correctCount = 0;
            
            slots.forEach((slot: string) => {
              if (assignments[slot] === validSet[slot]) {
                correctCount++;
              }
            });

            const newScore = (correctCount / slots.length) * 100;
            setScore(Math.floor(newScore));
            
            setTimeout(() => {
              onComplete(Math.floor(newScore), Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
          }}
          disabled={slots.some((slot: string) => !assignments[slot])}
          className="w-full"
        >
          Confirmar Proposta
        </Button>
      </div>
    );
  };

  const renderGameContent = () => {
    switch (game.template) {
      case 'conectivos':
        return renderConectivosGame();
      case 'desvios':
        return renderDesviosGame();
      case 'intervencao':
        return renderIntervencaoGame();
      default:
        return <div>Tipo de jogo não suportado</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PlayIcon className="h-5 w-5" />
                {game.title} - {level.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TimerIcon className="h-4 w-4" />
                  {Math.floor((Date.now() - startTime) / 1000)}s
                </span>
                <span className="flex items-center gap-1">
                  <TrophyIcon className="h-4 w-4" />
                  {score} pts
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: game.difficulty }, (_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowExitDialog(true)}>
              Sair
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderGameContent()}
        </CardContent>
      </Card>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do Jogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu progresso será perdido. Tem certeza que deseja sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Jogando</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GamePlay;