import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, ArrowLeft, Copy, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { TurmaForm } from "@/components/professor/TurmaForm";

export const ProfessorTurmas = () => {
  const { professor } = useProfessorAuth();
  const [showForm, setShowForm] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["turmas-professor", professor?.id],
    queryFn: async () => {
      if (!professor?.id) return [];
      const { data, error } = await supabase
        .from("turmas_professores")
        .select("id, nome, codigo_acesso, ativo, criado_em")
        .eq("criado_pelo_professor_id", professor.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!professor?.id,
  });

  const handleSuccess = () => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["turmas-professor", professor?.id] });
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/professor">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Minhas Turmas
              </h1>
            </div>
            <Button
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Turma
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {showForm && (
          <TurmaForm
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : turmas.length === 0 && !showForm ? (
          <Card className="bg-white/80">
            <CardHeader className="text-center">
              <CardTitle className="text-primary">Nenhuma turma cadastrada</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Crie turmas para organizar as redações que serão corrigidas pelo Jarvis.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Turma
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {turmas.map((turma: any) => (
              <Card key={turma.id} className="bg-white/90">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-primary">
                      {turma.nome}
                    </CardTitle>
                    <Badge variant={turma.ativo ? "default" : "secondary"} className="shrink-0">
                      {turma.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Código:</span>
                    <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-semibold tracking-wider">
                      {turma.codigo_acesso}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copiarCodigo(turma.codigo_acesso)}
                      title="Copiar código"
                    >
                      {copiado === turma.codigo_acesso
                        ? <Check className="w-4 h-4 text-green-600" />
                        : <Copy className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criada em {new Date(turma.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
