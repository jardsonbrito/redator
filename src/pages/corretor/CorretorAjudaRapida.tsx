import { MensagensCorretor } from "@/components/ajuda-rapida/MensagensCorretor";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorAjudaRapida = () => {
  return (
    <CorretorLayout>
      <div className="space-y-5">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Comunicação</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">Recados dos Alunos</h1>
        </div>
        <MensagensCorretor />
      </div>
    </CorretorLayout>
  );
};

export default CorretorAjudaRapida;