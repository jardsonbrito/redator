
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video } from "lucide-react";
import { FrequenciaModal } from "./FrequenciaModal";
import { AdminAulaVirtualCard } from "./AdminAulaVirtualCard";

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
      setAulas(data || []);
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
              Aulas Virtuais ({aulas.length})
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
                <AdminAulaVirtualCard
                  key={aula.id}
                  aula={aula}
                  onEdit={onEdit}
                  onToggleStatus={toggleAulaStatus}
                  onDelete={deleteAula}
                  onOpenFrequencia={openFrequenciaModal}
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
