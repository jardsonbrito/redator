import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Settings, Calendar, Send, Lock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WEEKDAYS = [
  { value: 0, label: 'Dom', fullName: 'Domingo' },
  { value: 1, label: 'Seg', fullName: 'Segunda-feira' },
  { value: 2, label: 'Ter', fullName: 'Terça-feira' },
  { value: 3, label: 'Qua', fullName: 'Quarta-feira' },
  { value: 4, label: 'Qui', fullName: 'Quinta-feira' },
  { value: 5, label: 'Sex', fullName: 'Sexta-feira' },
  { value: 6, label: 'Sáb', fullName: 'Sábado' },
];

export const AppSettingsForm = () => {
  const { settings, loading, updateSettings } = useAppSettings();
  
  // Estados locais para edição
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [freeTopicEnabled, setFreeTopicEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setSelectedWeekdays(settings.submission_allowed_weekdays_for_topics);
      setFreeTopicEnabled(settings.free_topic_enabled);
    }
  }, [settings]);

  useEffect(() => {
    if (settings) {
      const weekdaysChanged = JSON.stringify(selectedWeekdays.sort()) !== 
                              JSON.stringify(settings.submission_allowed_weekdays_for_topics.sort());
      const freeTopicChanged = freeTopicEnabled !== settings.free_topic_enabled;
      setHasChanges(weekdaysChanged || freeTopicChanged);
    }
  }, [selectedWeekdays, freeTopicEnabled, settings]);

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(day)) {
        // Impedir remover o último dia
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const handleSave = async () => {
    if (selectedWeekdays.length === 0) {
      return; // Validação já impede isso
    }

    const success = await updateSettings(selectedWeekdays, freeTopicEnabled);
    if (success) {
      setHasChanges(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando configurações de envios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de configuração do Tema Livre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Envio por Tema Livre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Permitir card "Enviar Redação — Tema Livre"
              </Label>
              <p className="text-xs text-muted-foreground">
                Controla se o card de tema livre aparece na home do aluno
              </p>
            </div>
            <Switch
              checked={freeTopicEnabled}
              onCheckedChange={setFreeTopicEnabled}
            />
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {freeTopicEnabled ? (
                <span className="text-green-700">
                  <strong>Ativo:</strong> Alunos podem enviar redações de tema livre em qualquer dia.
                </span>
              ) : (
                <span className="text-red-700">
                  <strong>Desabilitado:</strong> O card aparecerá com cadeado e não será clicável.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Card de configuração dos dias para envios por tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Envios por Tema (Regular/Simulado)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Dias permitidos para envios através do botão "Escreva sobre este tema"
            </Label>
            <p className="text-xs text-muted-foreground">
              Selecione os dias da semana em que alunos podem enviar redações sobre temas específicos
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 max-w-md">
            {WEEKDAYS.map((weekday) => {
              const isSelected = selectedWeekdays.includes(weekday.value);
              const isLastSelected = selectedWeekdays.length === 1 && isSelected;
              
              return (
                <button
                  key={weekday.value}
                  type="button"
                  onClick={() => toggleWeekday(weekday.value)}
                  disabled={isLastSelected}
                  className={`
                    p-2 rounded-lg border text-sm font-medium transition-all
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted border-input'
                    }
                    ${isLastSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  title={`${weekday.fullName} - ${isSelected ? 'Clique para desmarcar' : 'Clique para marcar'}`}
                >
                  {weekday.label}
                </button>
              );
            })}
          </div>

          {selectedWeekdays.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Dias selecionados: </span>
              {selectedWeekdays.map(day => (
                <Badge key={day} variant="secondary" className="text-xs">
                  {WEEKDAYS.find(w => w.value === day)?.fullName}
                </Badge>
              ))}
            </div>
          )}

          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Importante:</strong> Em dias não permitidos, o botão "Escreva sobre este tema" 
              ficará desabilitado com mensagem explicativa. Esta regra não afeta o Tema Livre.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Botão de salvar */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || loading || selectedWeekdays.length === 0}
          className="min-w-[120px]"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Info de última atualização */}
      {settings && (
        <p className="text-xs text-muted-foreground text-center">
          Última atualização: {new Date(settings.updated_at).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
};