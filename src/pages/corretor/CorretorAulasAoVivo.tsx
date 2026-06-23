import { useState } from "react";
import { Navigate } from "react-router-dom";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { AulaVirtualList } from "@/components/admin/AulaVirtualList";
import { AulaVirtualForm } from "@/components/admin/AulaVirtualForm";
import { AulaVirtualEditForm } from "@/components/admin/AulaVirtualEditForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";

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
  permite_visitante: boolean;
  ativo: boolean;
  eh_aula_ao_vivo?: boolean;
  aula_mae_id?: string | null;
  aula_gravada_id?: string | null;
}

const CorretorAulasAoVivo = () => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, nomesTurmasGerenciadas, loading: loadingPerm } = useCorretorPermissoes();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<AulaVirtual | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor" replace />;

  const handleCriarSuccess = () => {
    setCriando(false);
    setRefreshKey(k => k + 1);
  };

  const handleEditarSuccess = () => {
    setEditando(null);
    setRefreshKey(k => k + 1);
  };

  if (editando) {
    return (
      <CorretorLayout>
        <AulaVirtualEditForm
          aula={editando}
          turmasRestricao={nomesTurmasGerenciadas}
          onSuccess={handleEditarSuccess}
          onCancel={() => setEditando(null)}
        />
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Gestão</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-0.5">Aulas ao Vivo</h1>
            </div>
            {!criando && (
              <Button
                variant="ghost"
                size="sm"
                className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shrink-0 gap-2"
                onClick={() => setCriando(true)}
              >
                <Plus className="w-4 h-4" />
                Nova Aula ao Vivo
              </Button>
            )}
          </div>
        </div>

        {/* Formulário de criação */}
        {criando && (
          <div className="border border-violet-200 rounded-xl bg-white p-1">
            <AulaVirtualForm
              turmasRestricao={nomesTurmasGerenciadas}
              onSuccess={handleCriarSuccess}
            />
            <div className="px-4 pb-4">
              <Button variant="outline" size="sm" onClick={() => setCriando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de aulas ao vivo */}
        <AulaVirtualList
          key={refreshKey}
          turmasRestricao={nomesTurmasGerenciadas}
          onEdit={(aula) => setEditando(aula)}
        />
      </div>
    </CorretorLayout>
  );
};

export default CorretorAulasAoVivo;
