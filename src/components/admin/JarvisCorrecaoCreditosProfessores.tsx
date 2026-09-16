import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Minus, Search } from "lucide-react";
import { toast } from "sonner";

export const JarvisCorrecaoCreditosProfessores = () => {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("");
  const [professorSelecionado, setProfessorSelecionado] = useState<any>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [observacao, setObservacao] = useState("");

  // Buscar professores com créditos
  const { data: professores, isLoading } = useQuery({
    queryKey: ["professores-jarvis-creditos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professores")
        .select("id, email, nome_completo, ativo, jarvis_correcao_creditos")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  // Mutation para adicionar créditos
  const adicionarCreditos = useMutation({
    mutationFn: async ({
      professorId,
      quantidade,
      observacao,
    }: {
      professorId: string;
      quantidade: number;
      observacao: string;
    }) => {
      // Buscar admin logado
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: admin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!admin) throw new Error("Admin não encontrado");

      // Chamar função SQL
      const { data, error } = await supabase.rpc("adicionar_creditos_professor", {
        p_professor_id: professorId,
        p_quantidade: quantidade,
        p_admin_id: admin.id,
        p_observacao: observacao,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores-jarvis-creditos"] });
      toast.success("Créditos atualizados com sucesso!");
      setProfessorSelecionado(null);
      setQuantidade(0);
      setObservacao("");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const professoresFiltrados =
    professores?.filter(
      (p) =>
        p.nome_completo?.toLowerCase().includes(filtro.toLowerCase()) ||
        p.email?.toLowerCase().includes(filtro.toLowerCase())
    ) || [];

  const handleAdicionarCreditos = () => {
    if (!professorSelecionado || quantidade === 0) return;

    adicionarCreditos.mutate({
      professorId: professorSelecionado.id,
      quantidade,
      observacao: observacao || (quantidade > 0 ? "Adição de créditos" : "Remoção de créditos"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Créditos - Jarvis Correção (Professores)</CardTitle>
          <CardDescription>
            Gerencie os créditos disponíveis para correção de redações com IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professoresFiltrados.map((professor) => (
                <TableRow key={professor.id}>
                  <TableCell className="font-medium">{professor.nome_completo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{professor.email}</TableCell>
                  <TableCell>
                    <Badge variant={professor.ativo ? "default" : "secondary"}>
                      {professor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-lg font-bold">
                      {professor.jarvis_correcao_creditos || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfessorSelecionado(professor);
                          setQuantidade(10);
                          setObservacao("Adição de créditos");
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfessorSelecionado(professor);
                          setQuantidade(-10);
                          setObservacao("Remoção de créditos");
                        }}
                        disabled={(professor.jarvis_correcao_creditos || 0) === 0}
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {professoresFiltrados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum professor encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de gerenciamento */}
      <Dialog
        open={!!professorSelecionado}
        onOpenChange={(open) => {
          if (!open) {
            setProfessorSelecionado(null);
            setQuantidade(0);
            setObservacao("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Créditos</DialogTitle>
            <DialogDescription>
              {professorSelecionado?.nome_completo} ({professorSelecionado?.email})
              <br />
              Créditos atuais:{" "}
              <span className="font-bold">{professorSelecionado?.jarvis_correcao_creditos || 0}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
                placeholder="Digite a quantidade (positivo para adicionar, negativo para remover)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use valores positivos para adicionar e negativos para remover
              </p>
            </div>

            <div>
              <Label>Observação</Label>
              <Input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Motivo da alteração (opcional)"
              />
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Novo saldo:</p>
              <p className="text-2xl font-bold">
                {(professorSelecionado?.jarvis_correcao_creditos || 0) + quantidade}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProfessorSelecionado(null);
                setQuantidade(0);
                setObservacao("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdicionarCreditos}
              disabled={quantidade === 0 || adicionarCreditos.isPending}
            >
              {adicionarCreditos.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
