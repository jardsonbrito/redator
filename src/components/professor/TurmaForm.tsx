import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Copy, Check } from "lucide-react";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";

interface TurmaFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

function gerarCodigoAcesso(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export const TurmaForm = ({ onSuccess, onCancel }: TurmaFormProps) => {
  const [nomeTurma, setNomeTurma] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { toast } = useToast();
  const { professor } = useProfessorAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeTurma.trim() || !professor?.id) return;

    setLoading(true);
    try {
      // Gerar código único — tenta até encontrar um não colidente
      let codigoAcesso = gerarCodigoAcesso();
      let tentativas = 0;

      while (tentativas < 5) {
        const { data: existente } = await supabase
          .from("turmas_professores")
          .select("id")
          .eq("codigo_acesso", codigoAcesso)
          .maybeSingle();

        if (!existente) break;
        codigoAcesso = gerarCodigoAcesso();
        tentativas++;
      }

      const { error } = await supabase
        .from("turmas_professores")
        .insert({
          nome: nomeTurma.trim(),
          codigo_acesso: codigoAcesso,
          ativo: true,
          criado_pelo_professor_id: professor.id,
        });

      if (error) throw error;

      toast({
        title: "Turma criada com sucesso!",
        description: `Turma "${nomeTurma}" criada. Código de acesso: ${codigoAcesso}`,
      });

      setNomeTurma("");
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao criar turma:", error);
      toast({
        title: "Erro ao criar turma",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Criar Nova Turma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nomeTurma">Nome da Turma *</Label>
            <Input
              id="nomeTurma"
              value={nomeTurma}
              onChange={(e) => setNomeTurma(e.target.value)}
              placeholder="Ex: Turma A, Redação 2025, etc."
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Um código de acesso único será gerado automaticamente e poderá ser
            compartilhado com os alunos.
          </p>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!nomeTurma.trim() || loading}
              className="flex-1"
            >
              {loading ? "Criando..." : "Criar Turma"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
