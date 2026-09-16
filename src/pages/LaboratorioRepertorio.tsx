import { StudentHeader } from "@/components/StudentHeader";
import { LaboratorioList } from "@/components/repertorio/laboratorio/LaboratorioList";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

const LaboratorioRepertorio = () => {
  usePageTitle("Laboratório de Repertório");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Laboratório de Repertório" />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laboratório de Repertório</h1>
            <p className="text-muted-foreground mt-1">
              Cada aula percorre 3 etapas: Contexto → Repertório → Aplicação.
            </p>
          </div>
          <LaboratorioList />
        </div>
      </main>
    </div>
  );
};

export default LaboratorioRepertorio;
