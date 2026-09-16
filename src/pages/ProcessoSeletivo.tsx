import { StudentHeader } from "@/components/StudentHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertCircle } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { PSContainer } from "@/components/processo-seletivo/PSContainer";

const ProcessoSeletivo = () => {
  const { studentData, isStudentLoggedIn } = useStudentAuth();

  // Se não estiver logado, mostrar mensagem
  if (!isStudentLoggedIn || !studentData.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-yellow-100 rounded-full">
                  <AlertCircle className="w-12 h-12 text-yellow-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Acesso Restrito
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                Você precisa estar logado para acessar o processo seletivo.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Visitantes não podem participar do processo seletivo
  if (studentData.userType === 'visitante') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <ClipboardList className="w-12 h-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-primary">
                Processo Seletivo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                O processo seletivo de bolsas está disponível apenas para alunos cadastrados.
              </p>
              <p className="text-sm text-gray-500">
                Entre em contato com a equipe para mais informações sobre como se tornar aluno.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">Processo Seletivo</h1>
          <p className="text-gray-600 mt-1">Bolsas de Estudo</p>
        </div>

        <PSContainer
          userEmail={studentData.email}
          userId={studentData.id}
          userName={studentData.nomeUsuario}
          turma={studentData.turma}
        />
      </main>
    </div>
  );
};

export default ProcessoSeletivo;
