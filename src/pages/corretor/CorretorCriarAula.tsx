import { Navigate, useNavigate } from "react-router-dom";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { AulaFormModern } from "@/components/admin/AulaFormModern";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";

const CorretorCriarAula = () => {
  const navigate = useNavigate();
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, nomesTurmasGerenciadas, loading: loadingPerm } = useCorretorPermissoes();

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor" replace />;

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Gestão</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-0.5">Nova Aula Gravada</h1>
        </div>
        <AulaFormModern
          turmasRestricao={nomesTurmasGerenciadas}
          onSuccess={() => navigate("/corretor/aulas")}
        />
      </div>
    </CorretorLayout>
  );
};

export default CorretorCriarAula;
