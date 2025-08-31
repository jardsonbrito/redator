import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GamepadIcon, PlayIcon, TrophyIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import GameCard from "./GameCard";

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
  const { studentData } = useStudentAuth();

  useEffect(() => {
    loadGames();
    loadGameStats();
  }, [studentData.turma]);

  const loadGames = async () => {
    try {
      setLoading(true);
      
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          game_levels(*)
        `)
        .eq('status', 'published')
        .or(`turmas_autorizadas.cs.{${studentData.turma || 'Visitante'}},allow_visitor.eq.true`)
        .order('created_at', { ascending: true });

      if (gamesError) throw gamesError;

      // Map games with their levels
      const mappedGames = (gamesData || []).map(game => ({
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

  const handlePlayGame = (gameId: string) => {
    // Navigate to game play page
    console.log('Playing game:', gameId);
    // This would typically navigate to a game playing interface
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
      </CardContent>
    </Card>
  );
};

export default GamificationCard;