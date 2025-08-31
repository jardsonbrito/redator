import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GamepadIcon } from "lucide-react";
import GameList from "./GameList";
import GameForm from "./GameForm";

const GamificationAdmin: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'stats'>('list');
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();

  const handleNew = () => {
    setSelectedGameId(undefined);
    setCurrentView('form');
  };

  const handleEdit = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentView('form');
  };

  const handleStats = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentView('stats');
  };

  const handleSuccess = () => {
    setCurrentView('list');
    setSelectedGameId(undefined);
  };

  const handleCancel = () => {
    setCurrentView('list');
    setSelectedGameId(undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GamepadIcon className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Gamificação</CardTitle>
          </div>
        </CardHeader>
      </Card>

      {currentView === 'list' && (
        <GameList 
          onEdit={handleEdit}
          onNew={handleNew}
          onStats={handleStats}
        />
      )}

      {currentView === 'form' && (
        <GameForm
          gameId={selectedGameId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}

      {currentView === 'stats' && selectedGameId && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas do Jogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <GamepadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Funcionalidade de estatísticas será implementada em breve
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GamificationAdmin;