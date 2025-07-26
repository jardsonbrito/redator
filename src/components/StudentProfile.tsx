import { Card, CardContent } from '@/components/ui/card';
import { StudentAvatar } from '@/components/StudentAvatar';
import { useStudentAuth } from '@/hooks/useStudentAuth';

export const StudentProfile = () => {
  const { studentData } = useStudentAuth();

  return (
    <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <StudentAvatar size="md" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary mb-2">
              {studentData.nomeUsuario || 'Aluno'}
            </h2>
            <p className="text-base text-muted-foreground">
              {studentData.userType === "aluno" && studentData.turma ? 
                studentData.turma : 
                "Visitante"
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};