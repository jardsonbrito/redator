import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudentAvatar } from '@/components/StudentAvatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Users, Camera } from 'lucide-react';

export const StudentProfile = () => {
  const { studentData } = useStudentAuth();
  const { user } = useAuth();
  const [hasAvatar, setHasAvatar] = useState(false);

  useEffect(() => {
    const checkAvatar = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        setHasAvatar(!!data?.avatar_url);
      }
    };

    checkAvatar();
  }, [user]);

  return (
    <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <StudentAvatar size="lg" />
              {!hasAvatar && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary/10 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-primary border border-primary/20">
                  <Camera className="w-3 h-3 inline mr-1" />
                  Adicionar foto
                </div>
              )}
            </div>
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