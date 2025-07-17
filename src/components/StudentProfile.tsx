import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudentAvatar } from '@/components/StudentAvatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Users } from 'lucide-react';

export const StudentProfile = () => {
  const { studentData } = useStudentAuth();

  return (
    <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StudentAvatar size="lg" />
            <div>
              <h2 className="text-xl font-bold text-primary">
                {studentData.nomeUsuario || 'Usuário'}
              </h2>
              {studentData.email && (
                <p className="text-sm text-muted-foreground mb-2">
                  {studentData.email}
                </p>
              )}
              <Badge variant="secondary" className="gap-1">
                <Users className="w-3 h-3" />
                {studentData.userType === "aluno" && studentData.turma ? 
                  `Aluno da ${studentData.turma}` : 
                  "Visitante"
                }
              </Badge>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
};