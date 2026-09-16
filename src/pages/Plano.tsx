import { StudentHeader } from "@/components/StudentHeader";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PlanoEstudoCard } from "@/components/PlanoEstudoCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const Plano = () => {
  const { studentData } = useStudentAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 pb-20">
        <StudentHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {studentData.userType === 'aluno' && <PlanoEstudoCard />}
        </main>

        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
};

export default Plano;
