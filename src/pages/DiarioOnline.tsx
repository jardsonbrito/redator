import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedFeatureRoute } from "@/components/ProtectedFeatureRoute";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { BoletimEscolarView } from "@/components/shared/BoletimEscolarView";

const DiarioOnline = () => {
  usePageTitle("Boletim Escolar");

  const { studentData } = useStudentAuth();
  const email = studentData?.email ?? null;
  const turma = studentData?.turma ?? null;

  return (
    <ProtectedRoute>
      <ProtectedFeatureRoute feature="diario_online" featureName="Boletim Escolar">
        <div className="min-h-screen bg-muted/30">
          <StudentHeader pageTitle="Boletim Escolar" />
          <main className="container mx-auto px-4 py-6 pb-24 max-w-5xl">
            <BoletimEscolarView email={email} turma={turma} />
          </main>
          <BottomNavigation />
        </div>
      </ProtectedFeatureRoute>
    </ProtectedRoute>
  );
};

export default DiarioOnline;
