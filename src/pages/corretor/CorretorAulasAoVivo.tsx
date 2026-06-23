import { useState } from "react";
import { Navigate } from "react-router-dom";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { AulaVirtualList } from "@/components/admin/AulaVirtualList";
import { AulaVirtualForm } from "@/components/admin/AulaVirtualForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";

const CorretorAulasAoVivo = () => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, nomesTurmasGerenciadas, loading: loadingPerm } = useCorretorPermissoes();
  const [criando, setCriando] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor" replace />;

  const handleSuccess = () => {
    setCriando(false);
    setRefreshKey(k => k + 1);
  };

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
              onSuccess={handleSuccess}
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
        />
      </div>
    </CorretorLayout>
  );
};

export default CorretorAulasAoVivo;
