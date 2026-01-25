import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, ArrowRight, GraduationCap } from 'lucide-react';
import { Formulario } from '@/hooks/useProcessoSeletivo';

interface PSListaProcessosProps {
  processos: Formulario[];
  onSelectProcesso: (processoId: string) => void;
  isLoading?: boolean;
}

/**
 * Componente que lista os processos seletivos disponíveis para o candidato escolher.
 * Usado quando há mais de um processo seletivo com inscrições abertas.
 */
export const PSListaProcessos: React.FC<PSListaProcessosProps> = ({
  processos,
  onSelectProcesso,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Processos Seletivos Disponíveis</h1>
        <p className="text-muted-foreground mt-2">
          Existem {processos.length} processos seletivos com inscrições abertas. Escolha em qual deseja se inscrever.
        </p>
      </div>

      {/* Lista de Processos */}
      <div className="grid gap-4 md:grid-cols-2">
        {processos.map((processo) => (
          <Card
            key={processo.id}
            className="hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => onSelectProcesso(processo.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{processo.titulo}</CardTitle>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                  Inscrições Abertas
                </Badge>
              </div>
              {processo.descricao && (
                <CardDescription className="mt-2">
                  {processo.descricao}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Criado em {new Date(processo.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="group-hover:bg-primary group-hover:text-white transition-colors"
                >
                  Participar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Ao clicar em um processo seletivo, você será direcionado para o formulário de inscrição.
        </p>
      </div>
    </div>
  );
};

export default PSListaProcessos;
