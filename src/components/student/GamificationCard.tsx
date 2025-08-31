import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GamepadIcon, PlayIcon, TrophyIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useToast } from "@/hooks/use-toast";
import GameCard from "./GameCard";
import GamePlay from "./GamePlay";

interface Game {
  id: string;
  title: string;
  template: 'conectivos' | 'desvios' | 'intervencao';
  difficulty: number;
  competencies: number[];
  levels: any[];
  totalPlays?: number;
  bestScore?: number;
}

const GamificationCard: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [currentLevel, setCurrentLevel] = useState<any>(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const { studentData } = useStudentAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadGames();
    loadGameStats();
  }, [studentData.turma]);

  const loadGames = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os jogos publicados primeiro e filtrar no frontend
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          game_levels(*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (gamesError) throw gamesError;

      // Filtrar jogos baseado na turma do aluno
      const filteredGames = (gamesData || []).filter(game => {
        // Se permite visitante, sempre mostrar
        if (game.allow_visitor) return true;
        
        // Se não tem turma ou é visitante, só mostrar se permite visitante
        if (!studentData.turma || studentData.turma === 'Visitante') {
          return game.allow_visitor;
        }
        
        // Se tem turma, verificar se está autorizada
        // Comparar tanto a turma completa quanto apenas a letra (ex: "Turma E" vs "E")
        const alunoTurma = studentData.turma;
        const alunoTurmaLetra = alunoTurma.replace('Turma ', ''); // Remove "Turma " para ficar só a letra
        
        return game.turmas_autorizadas && (
          game.turmas_autorizadas.includes(alunoTurma) || 
          game.turmas_autorizadas.includes(alunoTurmaLetra)
        );
      });

      // Map games with their levels
      const mappedGames = filteredGames.map(game => ({
        id: game.id,
        title: game.title,
        template: game.template as 'conectivos' | 'desvios' | 'intervencao',
        difficulty: game.difficulty,
        competencies: game.competencies,
        levels: game.game_levels?.filter((level: any) => level.status === 'published') || []
      }));

      setGames(mappedGames);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGameStats = async () => {
    if (!studentData.email) return;

    try {
      const { count, error } = await supabase
        .from('game_plays')
        .select('*', { count: 'exact', head: true })
        .eq('student_email', studentData.email)
        .not('finished_at', 'is', null);

      if (error) throw error;
      setGamesPlayed(count || 0);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handlePlayGame = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !game.levels || game.levels.length === 0) {
      toast({
        title: "Erro",
        description: "Este jogo não possui fases disponíveis",
        variant: "destructive"
      });
      return;
    }

    // Começar na primeira fase
    const firstLevel = game.levels[0];
    setCurrentGame(game);
    setCurrentLevel(firstLevel);
    setCurrentLevelIndex(0);
    setCurrentScore(0);
    setGameDialogOpen(true);
  };

  const handleNextLevel = (score: number) => {
    if (!currentGame) return;
    
    const nextIndex = currentLevelIndex + 1;
    setCurrentScore(score);
    
    if (nextIndex < currentGame.levels.length) {
      // Avançar para próxima fase
      const nextLevel = currentGame.levels[nextIndex];
      setCurrentLevel(nextLevel);
      setCurrentLevelIndex(nextIndex);
      
      toast({
        title: "Parabéns!",
        description: `Fase ${currentLevelIndex + 1} concluída! Avançando para a Fase ${nextIndex + 1}`,
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    }
  };

  const handleGameComplete = async (score: number, timeSpent: number) => {
    if (!currentGame || !currentLevel || !studentData.email) return;

    try {
      // Registrar jogada no banco
      const { error } = await supabase
        .from('game_plays')
        .insert({
          game_id: currentGame.id,
          level_id: currentLevel.id,
          student_email: studentData.email,
          student_name: studentData.nomeUsuario || 'Jogador',
          student_class: studentData.turma,
          finished_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
          result: { score, completed: true, total_levels: currentGame.levels.length },
          score_points: score
        });

      if (error) throw error;

      toast({
        title: "🎉 Jogo Concluído!",
        description: `Todas as ${currentGame.levels.length} fases foram concluídas com ${score} pontos em ${timeSpent}s!`,
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      // Atualizar estatísticas
      loadGameStats();
      
    } catch (error) {
      console.error('Erro ao salvar jogada:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar progresso do jogo",
        variant: "destructive"
      });
    } finally {
      setGameDialogOpen(false);
      setCurrentGame(null);
      setCurrentLevel(null);
      setCurrentLevelIndex(0);
      setCurrentScore(0);
    }
  };

  const handleGameExit = () => {
    setGameDialogOpen(false);
    setCurrentGame(null);
    setCurrentLevel(null);
    setCurrentLevelIndex(0);
    setCurrentScore(0);
  };

  if (loading) {
    return (
      <Card className="h-auto">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GamepadIcon className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl font-bold text-foreground">
              Gamificação
            </CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <TrophyIcon className="h-4 w-4 mr-1" />
            {gamesPlayed} jogos concluídos
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {games.length === 0 ? (
            <div className="text-center py-8">
              <GamepadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum jogo disponível no momento
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={{
                    ...game,
                    levels: game.levels.length
                  }}
                  onPlay={handlePlayGame}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dialog do jogo */}
        <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Jogando: {currentGame?.title}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              {currentGame && currentLevel && (
                <GamePlay
                  game={currentGame}
                  level={currentLevel}
                  onComplete={handleGameComplete}
                  onExit={handleGameExit}
                  onNextLevel={handleNextLevel}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default GamificationCard;