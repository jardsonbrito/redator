import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  EditIcon, 
  EyeIcon, 
  PlayIcon, 
  CopyIcon, 
  DownloadIcon, 
  ArchiveIcon, 
  CheckCircleIcon, 
  CircleIcon,
  GamepadIcon,
  PlusIcon,
  BarChartIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Game {
  id: string;
  title: string;
  template: 'conectivos' | 'desvios' | 'intervencao';
  status: 'draft' | 'published' | 'archived';
  difficulty: number;
  competencies: number[];
  turmas_autorizadas: string[];
  allow_visitor: boolean;
  created_at: string;
  updated_at: string;
  game_levels: any[];
}

interface GameListProps {
  onEdit: (gameId: string) => void;
  onNew: () => void;
  onStats: (gameId: string) => void;
}

const GameList: React.FC<GameListProps> = ({ onEdit, onNew, onStats }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          game_levels(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames((data || []).map(game => ({
        ...game,
        template: game.template as 'conectivos' | 'desvios' | 'intervencao',
        status: game.status as 'draft' | 'published' | 'archived'
      })));
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de jogos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (gameId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const { error } = await supabase
        .from('games')
        .update({ status: newStatus })
        .eq('id', gameId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Status do jogo alterado para ${newStatus}`,
        variant: "default"
      });

      loadGames();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do jogo",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (gameId: string) => {
    try {
      // Get original game and levels
      const { data: originalGame, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          game_levels(*)
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      // Create duplicate game
      const { data: newGame, error: newGameError } = await supabase
        .from('games')
        .insert({
          title: `${originalGame.title} (Cópia)`,
          template: originalGame.template,
          status: 'draft',
          difficulty: originalGame.difficulty,
          competencies: originalGame.competencies,
          tags: originalGame.tags,
          turmas_autorizadas: originalGame.turmas_autorizadas,
          allow_visitor: originalGame.allow_visitor,
          created_by: originalGame.created_by
        })
        .select()
        .single();

      if (newGameError) throw newGameError;

      // Duplicate levels
      for (const level of originalGame.game_levels) {
        await supabase
          .from('game_levels')
          .insert({
            game_id: newGame.id,
            title: level.title,
            payload: level.payload,
            status: 'draft',
            level_index: level.level_index
          });
      }

      toast({
        title: "Sucesso",
        description: "Jogo duplicado com sucesso",
        variant: "default"
      });

      loadGames();
    } catch (error) {
      console.error('Erro ao duplicar jogo:', error);
      toast({
        title: "Erro",
        description: "Erro ao duplicar jogo",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!gameToDelete) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Jogo excluído com sucesso",
        variant: "default"
      });

      setGameToDelete(null);
      loadGames();
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir jogo",
        variant: "destructive"
      });
    }
  };

  const exportToCSV = async (gameId: string) => {
    try {
      // TODO: Implement CSV export functionality
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Exportação para CSV será implementada em breve",
        variant: "default"
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar dados",
        variant: "destructive"
      });
    }
  };

  const getTemplateInfo = (template: string) => {
    switch (template) {
      case 'conectivos':
        return { name: 'Caça-Conectivos', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🔗' };
      case 'desvios':
        return { name: 'Desafio dos Desvios', color: 'bg-red-100 text-red-800 border-red-200', icon: '⚠️' };
      case 'intervencao':
        return { name: 'Oficina da Intervenção', color: 'bg-green-100 text-green-800 border-green-200', icon: '🎯' };
      default:
        return { name: 'Jogo', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '🎮' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Publicado</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Rascunho</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Arquivado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || game.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || game.template === templateFilter;
    
    return matchesSearch && matchesStatus && matchesTemplate;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando jogos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <GamepadIcon className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Gerenciar Jogos</CardTitle>
            </div>
            <Button onClick={onNew}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Criar Jogo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar jogos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Jogo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="conectivos">Caça-Conectivos</SelectItem>
                <SelectItem value="desvios">Desafio dos Desvios</SelectItem>
                <SelectItem value="intervencao">Oficina da Intervenção</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center">
              Total: {filteredGames.length} jogos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games Grid */}
      <div className="grid gap-4">
        {filteredGames.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <GamepadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum jogo encontrado</p>
              <Button onClick={onNew} className="mt-4">
                <PlusIcon className="h-4 w-4 mr-2" />
                Criar Primeiro Jogo
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredGames.map((game) => {
            const templateInfo = getTemplateInfo(game.template);
            const publishedLevels = game.game_levels?.filter(level => level.status === 'published').length || 0;
            
            return (
              <Card key={game.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-[auto_1fr_auto] gap-4 items-start">
                    {/* Game Icon and Info */}
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{templateInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{game.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge className={templateInfo.color}>
                            {templateInfo.name}
                          </Badge>
                          {getStatusBadge(game.status)}
                        </div>
                      </div>
                    </div>

                    {/* Game Details */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Dificuldade: {game.difficulty}/5</span>
                        <span>Competências: {game.competencies.join(', ')}</span>
                        <span>{publishedLevels} fases publicadas</span>
                        {game.allow_visitor && <span>Visitantes permitidos</span>}
                      </div>
                      {game.turmas_autorizadas.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {game.turmas_autorizadas.map(turma => (
                            <Badge key={turma} variant="outline" className="text-xs">
                              Turma {turma}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Criado em: {new Date(game.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(game.id)}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStats(game.id)}
                        >
                          <BarChartIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(game.id)}
                        >
                          <CopyIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportToCSV(game.id)}
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        {game.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(game.id, 'published')}
                            className="flex-1"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Publicar
                          </Button>
                        )}
                        
                        {game.status === 'published' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(game.id, 'draft')}
                            className="flex-1"
                          >
                            <CircleIcon className="h-4 w-4 mr-1" />
                            Despublicar
                          </Button>
                        )}

                        {game.status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(game.id, 'archived')}
                            className="flex-1"
                          >
                            <ArchiveIcon className="h-4 w-4 mr-1" />
                            Arquivar
                          </Button>
                        )}

                        {game.status === 'archived' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(game.id, 'draft')}
                            className="flex-1"
                          >
                            Desarquivar
                          </Button>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setGameToDelete(game.id)}
                        className="w-full"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!gameToDelete} onOpenChange={(open) => !open && setGameToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este jogo? Esta ação não pode ser desfeita.
              Todas as fases e estatísticas relacionadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GameList;