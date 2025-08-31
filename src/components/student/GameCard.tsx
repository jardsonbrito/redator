import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GamepadIcon, PlayIcon, TrophyIcon, StarIcon } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";

interface GameCardProps {
  game: {
    id: string;
    title: string;
    template: 'conectivos' | 'desvios' | 'intervencao';
    difficulty: number;
    competencies: number[];
    levels: number;
    totalPlays?: number;
    bestScore?: number;
  };
  onPlay: (gameId: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  const { studentData } = useStudentAuth();

  const getTemplateInfo = (template: string) => {
    switch (template) {
      case 'conectivos':
        return {
          name: 'Caça-Conectivos',
          description: 'Reforce a Competência 4 (coesão)',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '🔗'
        };
      case 'desvios':
        return {
          name: 'Desafio dos Desvios',
          description: 'Reforce a Competência 1 (norma culta)',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '⚠️'
        };
      case 'intervencao':
        return {
          name: 'Oficina da Intervenção',
          description: 'Reforce a Competência 5 (proposta de intervenção)',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🎯'
        };
      default:
        return {
          name: 'Jogo',
          description: 'Jogo educativo',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '🎮'
        };
    }
  };

  const templateInfo = getTemplateInfo(game.template);

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < difficulty 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{templateInfo.icon}</span>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                {game.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {templateInfo.description}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={templateInfo.color}>
            {templateInfo.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Difficulty */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">Dificuldade:</span>
              <div className="flex gap-1">
                {getDifficultyStars(game.difficulty)}
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{game.levels} fases disponíveis</span>
            {game.totalPlays && (
              <span>{game.totalPlays} jogadas</span>
            )}
            {game.bestScore && (
              <div className="flex items-center gap-1">
                <TrophyIcon className="h-4 w-4 text-yellow-500" />
                <span>{game.bestScore} pts</span>
              </div>
            )}
          </div>

          {/* Play Button */}
          <Button 
            onClick={() => onPlay(game.id)}
            className="w-full"
            variant="default"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Jogar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameCard;