import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { GraduationCap, Plus } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { AulaGravadaCardPadrao } from "@/components/shared/AulaGravadaCardPadrao";
import { AulaFormModern } from "@/components/admin/AulaFormModern";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { toast } from "sonner";

type AulaEditando = {
  id: string;
  titulo: string;
  descricao?: string;
  modulo_id?: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
  ativo?: boolean;
  cover_source?: string | null;
  cover_file_path?: string | null;
};

const CorretorAulas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { corretor, loading } = useCorretorAuth();
  const { nomesTurmasGerenciadas, podeGerenciar, loading: loadingPerm } = useCorretorPermissoes();
  const [editando, setEditando] = useState<AulaEditando | null>(null);

  const QUERY_KEY = ['aulas-corretor-gestor', nomesTurmasGerenciadas];

  const { data: aulas, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('*, modulos(nome)')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      const todas = (data || []).map(aula => ({ ...aula, modulo: aula.modulos?.nome || '' }));

      if (nomesTurmasGerenciadas.length === 0) return todas;
      return todas.filter(a => {
        const turmasAula = a.turmas_autorizadas as string[] | null;
        if (!turmasAula || turmasAula.length === 0) return true;
        return turmasAula.some(t => nomesTurmasGerenciadas.includes(t));
      });
    },
    enabled: nomesTurmasGerenciadas.length > 0,
  });

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;

  const handleEditar = (id: string) => {
    const aula = aulas?.find(a => a.id === id);
    if (aula) setEditando(aula as AulaEditando);
  };

  const handleExcluir = async (id: string) => {
    const aula = aulas?.find(a => a.id === id);
    if (!window.confirm(`Excluir "${aula?.titulo || 'esta aula'}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.rpc('corretor_excluir_aula', { p_id: id });
    if (error) { toast.error('Erro ao excluir aula'); return; }
    toast.success('Aula excluída com sucesso!');
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const handleDesativar = async (id: string) => {
    const aula = aulas?.find(a => a.id === id);
    const novoStatus = !aula?.ativo;
    const { error } = await supabase.rpc('corretor_toggle_aula_status', { p_id: id, p_ativo: novoStatus });
    if (error) { toast.error('Erro ao alterar status'); return; }
    toast.success(`Aula ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`);
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  if (editando) {
    return (
      <CorretorLayout>
        <AulaFormModern
          aulaEditando={editando}
          turmasRestricao={nomesTurmasGerenciadas}
          onSuccess={() => {
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          }}
          onCancelEdit={() => setEditando(null)}
        />
      </CorretorLayout>
    );
  }

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Aulas Gravadas</h1>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
          </div>
        </div>
      </CorretorLayout>
    );
  }

  if (error) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar aulas. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  const aulasOrdenadas = aulas || [];

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Aulas Gravadas</h1>
          {podeGerenciar && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => navigate("/corretor/aulas/nova")}
            >
              <Plus className="w-4 h-4" />
              Nova Aula
            </Button>
          )}
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {aulasOrdenadas.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Nenhuma aula disponível
                </h3>
                <p className="text-gray-500">
                  As aulas aparecerão aqui quando forem publicadas para esta turma.
                </p>
              </CardContent>
            </Card>
          ) : (
            aulasOrdenadas.map((aula) => (
              <AulaGravadaCardPadrao
                key={aula.id}
                aula={aula}
                perfil="corretor"
                actions={{
                  onAssistir: () => window.open(aula.link_conteudo, '_blank'),
                  onBaixarPdf: aula.pdf_url ? () => window.open(aula.pdf_url, '_blank') : undefined,
                  ...(podeGerenciar ? {
                    onEditar: handleEditar,
                    onDesativar: handleDesativar,
                    onExcluir: handleExcluir,
                  } : {}),
                }}
              />
            ))
          )}
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorAulas;
