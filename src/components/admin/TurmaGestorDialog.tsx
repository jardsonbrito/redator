import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield } from "lucide-react";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
}

interface TurmaGestorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
  turmaNome: string;
  gestorAtualId: string | null;
  onSuccess: () => void;
}

export const TurmaGestorDialog = ({
  open,
  onOpenChange,
  turmaId,
  turmaNome,
  gestorAtualId,
  onSuccess,
}: TurmaGestorDialogProps) => {
  const [corretoresDaTurma, setCorretoresDaTurma] = useState<Corretor[]>([]);
  const [gestorId, setGestorId] = useState<string>("");
  const [loadingCorretores, setLoadingCorretores] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    const buscarCorretores = async () => {
      setLoadingCorretores(true);
      setGestorId(gestorAtualId ?? "");

      // Busca corretores ativos que têm turmaNome em turmas_autorizadas
      const { data, error } = await supabase
        .from("corretores")
        .select("id, nome_completo, email")
        .eq("ativo", true)
        .contains("turmas_autorizadas", [turmaNome])
        .order("nome_completo");

      if (error) {
        toast({
          title: "Erro ao buscar corretores",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const lista = data ?? [];
        setCorretoresDaTurma(lista);

        // Auto-seleciona quando há exatamente 1 corretor vinculado
        if (lista.length === 1 && !gestorAtualId) {
          setGestorId(lista[0].id);
        }
      }
      setLoadingCorretores(false);
    };

    buscarCorretores();
  }, [open, turmaNome, gestorAtualId]);

  const handleSalvar = async () => {
    if (!gestorId) {
      toast({
        title: "Selecione o gestor",
        description: "É obrigatório definir um gestor para turmas externas.",
        variant: "destructive",
      });
      return;
    }

    // Garante que o gestor escolhido está na lista de autorizados
    const gestorNaLista = corretoresDaTurma.some((c) => c.id === gestorId);
    if (!gestorNaLista) {
      toast({
        title: "Gestor inválido",
        description: "O corretor selecionado não está autorizado para esta turma.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("turmas_alunos")
      .update({ gestor_corretor_id: gestorId })
      .eq("id", turmaId);

    if (error) {
      toast({
        title: "Erro ao definir gestor",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const gestor = corretoresDaTurma.find((c) => c.id === gestorId);
      toast({
        title: "Gestor definido!",
        description: `${gestor?.nome_completo} é agora o gestor da turma "${turmaNome}".`,
      });
      onOpenChange(false);
      setTimeout(onSuccess, 100);
    }
    setSalvando(false);
  };

  const autoSelecionado = corretoresDaTurma.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Gestor da turma — {turmaNome}
          </DialogTitle>
          <DialogDescription>
            O gestor tem acesso administrativo a esta turma dentro do painel
            do corretor. Ele deve obrigatoriamente estar na lista de corretores
            autorizados para a turma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loadingCorretores ? (
            <p className="text-sm text-muted-foreground">
              Carregando corretores autorizados...
            </p>
          ) : corretoresDaTurma.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                Nenhum corretor autorizado para esta turma.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Primeiro vincule ao menos um corretor a esta turma em "Gestão
                de Corretores" → "Disponibilidade". Depois defina o gestor.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Corretor gestor{" "}
                {autoSelecionado && (
                  <span className="text-xs font-normal text-emerald-600">
                    (único autorizado — selecionado automaticamente)
                  </span>
                )}
              </Label>
              <Select
                value={gestorId}
                onValueChange={setGestorId}
                disabled={autoSelecionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor..." />
                </SelectTrigger>
                <SelectContent>
                  {corretoresDaTurma.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_completo}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({c.email})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {corretoresDaTurma.length > 1 && !gestorId && (
                <p className="text-xs text-amber-600">
                  Esta turma tem {corretoresDaTurma.length} corretores
                  autorizados. Selecione qual será o gestor.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando || corretoresDaTurma.length === 0 || !gestorId}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {salvando ? "Salvando..." : "Confirmar gestor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
