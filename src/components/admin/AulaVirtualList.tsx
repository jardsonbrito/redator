
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video } from "lucide-react";
import { FrequenciaModal } from "./FrequenciaModal";
import { AulaCardPadrao } from '@/components/shared/AulaCardPadrao';
import { computeStatus } from "@/utils/aulaStatus";

interface AulaVirtual {
  id: string;
  titulo: string;
  descricao: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  imagem_capa_url: string;
  link_meet: string;
  abrir_aba_externa: boolean;
  ativo: boolean;
  criado_em: string;
  eh_aula_ao_vivo?: boolean;
  status_transmissao?: string;
}

export const AulaVirtualList = ({ refresh, onEdit }: { refresh?: boolean; onEdit?: (aula: AulaVirtual) => void }) => {
  const [aulas, setAulas] = useState<AulaVirtual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [frequenciaModal, setFrequenciaModal] = useState<{
    isOpen: boolean;
    aulaId: string;
    aulaTitle: string;
  }>({
    isOpen: false,
    aulaId: '',
    aulaTitle: ''
  });

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .order('data_aula', { ascending: false });

      if (error) throw error;

      // Ordenar aulas: primeiro as que estão ao vivo, depois por data (mais recente primeiro)
      const aulasOrdenadas = (data || []).sort((a, b) => {
        const statusA = getStatusAula(a);
        const statusB = getStatusAula(b);

        // Prioridade: ao vivo > agendada > encerrada
        const prioridade = { 'ao_vivo': 3, 'agendada': 2, 'encerrada': 1 };
        const prioridadeA = prioridade[statusA as keyof typeof prioridade] || 0;
        const prioridadeB = prioridade[statusB as keyof typeof prioridade] || 0;

        if (prioridadeA !== prioridadeB) {
          return prioridadeB - prioridadeA; // Ordem decrescente de prioridade
        }

        // Se têm a mesma prioridade, ordenar por data (mais recente primeiro)
        return new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime();
      });

      setAulas(aulasOrdenadas);
    } catch (error: any) {
      console.error('Erro ao buscar aulas virtuais:', error);
      toast.error('Erro ao carregar aulas virtuais');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAulaStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('aulas_virtuais')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Aula ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (error: any) {
      console.error('Erro ao alterar status da aula:', error);
      toast.error('Erro ao alterar status da aula');
    }
  };

  const deleteAula = async (id: string) => {
    // Buscar o título da aula para mostrar na confirmação
    const aula = aulas.find(a => a.id === id);
    const tituloAula = aula?.titulo || 'esta aula';

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir "${tituloAula}"?\n\nEsta ação não pode ser desfeita e todos os dados relacionados à aula serão perdidos permanentemente.`
    );

    if (!confirmDelete) {
      return; // Usuário cancelou a exclusão
    }

    try {
      const { error } = await supabase
        .from('aulas_virtuais')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Aula excluída com sucesso!');
      fetchAulas();
    } catch (error: any) {
      console.error('Erro ao excluir aula:', error);
      toast.error('Erro ao excluir aula');
    }
  };

  const openFrequenciaModal = (aula: AulaVirtual) => {
    setFrequenciaModal({
      isOpen: true,
      aulaId: aula.id,
      aulaTitle: aula.titulo
    });
  };

  const closeFrequenciaModal = () => {
    setFrequenciaModal({
      isOpen: false,
      aulaId: '',
      aulaTitle: ''
    });
  };

  const getStatusAula = (aula: AulaVirtual) => {
    try {
      if (!aula.eh_aula_ao_vivo || !aula.data_aula || !aula.horario_inicio || !aula.horario_fim) {
        return 'encerrada';
      }

      const status = computeStatus({
        data_aula: aula.data_aula,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });

      return status;
    } catch (error) {
      console.error('Erro ao calcular status da aula:', error);
      return 'encerrada';
    }
  };

  useEffect(() => {
    fetchAulas();
  }, [refresh]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando aulas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Aulas ao Vivo ({aulas.length})
            </span>
            <Button onClick={fetchAulas} variant="outline" size="sm">
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aulas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhuma aula virtual criada ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aulas.map((aula) => (
                <AulaCardPadrao
                  key={aula.id}
                  aula={aula}
                  perfil="admin"
                  actions={{
                    onEntrarAula: () => window.open(aula.link_meet, '_blank'),
                    onFrequencia: () => openFrequenciaModal(aula),
                    onEditar: () => onEdit && onEdit(aula),
                    onDesativar: () => toggleAulaStatus(aula.id, aula.ativo),
                    onExcluir: () => deleteAula(aula.id)
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FrequenciaModal
        isOpen={frequenciaModal.isOpen}
        onClose={closeFrequenciaModal}
        aulaId={frequenciaModal.aulaId}
        aulaTitle={frequenciaModal.aulaTitle}
      />
    </>
  );
};
