import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import { useState } from "react";
import { formatTurmaDisplay } from "@/utils/turmaUtils";

const CorretorAlunos = () => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, nomesTurmasGerenciadas, loading: loadingPerm } = useCorretorPermissoes();
  const [busca, setBusca] = useState("");

  // Hooks ANTES dos early-returns — garante ordem consistente entre renders
  const { data: alunos, isLoading, error } = useQuery({
    queryKey: ["gestor-alunos", nomesTurmasGerenciadas],
    queryFn: async () => {
      if (nomesTurmasGerenciadas.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma, created_at")
        .in("turma", nomesTurmasGerenciadas)
        .eq("user_type", "aluno")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: nomesTurmasGerenciadas.length > 0,
  });


  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor" replace />;

  const alunosFiltrados = (alunos ?? []).filter(
    (a) =>
      a.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <CorretorLayout>
      <div className="space-y-6">

        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 text-violet-300 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Gestão</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-0.5">Alunos da Turma</h1>
              <p className="text-violet-300 text-sm mt-1">
                {nomesTurmasGerenciadas.join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista */}
        <Card className="border-0 ring-1 ring-violet-100 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Alunos ({alunosFiltrados.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center py-10 text-slate-500">Carregando alunos...</p>
            ) : error ? (
              <p className="text-center py-10 text-red-500 text-sm">
                Erro ao carregar alunos. Tente recarregar a página.
              </p>
            ) : alunosFiltrados.length === 0 ? (
              <p className="text-center py-10 text-slate-500">
                {busca ? "Nenhum aluno encontrado." : "Nenhum aluno nesta turma."}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {alunosFiltrados.map((aluno) => (
                  <div
                    key={aluno.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-violet-50/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {aluno.nome || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {aluno.turma && (
                        <Badge variant="outline" className="text-xs">
                          {formatTurmaDisplay(aluno.turma)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CorretorLayout>
  );
};

export default CorretorAlunos;
