import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { GraduationCap, Plus } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { AulaGravadaCardPadrao } from "@/components/shared/AulaGravadaCardPadrao";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { useNavigate } from "react-router-dom";

const CorretorAulas = () => {
  const navigate = useNavigate();
  const { nomesTurmasGerenciadas, podeGerenciar } = useCorretorPermissoes();

  const { data: aulas, isLoading, error } = useQuery({
    queryKey: ['aulas-corretor-gestor', nomesTurmasGerenciadas],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('*, modulos(nome)')
        .eq('ativo', true)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      const todas = (data || []).map(aula => ({ ...aula, modulo: aula.modulos?.nome || '' }));

      // Filtra somente aulas vinculadas às turmas gerenciadas
      if (nomesTurmasGerenciadas.length === 0) return todas;
      return todas.filter(a => {
        const turmasAula = a.turmas_autorizadas as string[] | null;
        if (!turmasAula || turmasAula.length === 0) return true;
        return turmasAula.some(t => nomesTurmasGerenciadas.includes(t));
      });
    },
    enabled: nomesTurmasGerenciadas.length > 0,
  });

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
