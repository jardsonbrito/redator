
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StudentAuthContextType {
  isStudentLoggedIn: boolean;
  studentData: {
    userType: 'aluno' | 'visitante' | null;
    turma: string | null;
    nomeUsuario: string;
    nomeCompleto?: string;
    email?: string;
    visitanteInfo?: {
      nome: string;
      email: string;
    };
  };
  loginAsStudent: (turma: string, email?: string) => void;
  loginAsVisitante: (nome: string, email: string) => void;
  logoutStudent: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false);
  const [studentData, setStudentData] = useState<StudentAuthContextType['studentData']>({
    userType: null,
    turma: null,
    nomeUsuario: '',
    nomeCompleto: undefined,
    email: undefined,
    visitanteInfo: undefined
  });

  useEffect(() => {
  // Verificar se há uma sessão ativa de estudante no localStorage
    const checkStudentSession = async () => {
      const userType = localStorage.getItem("userType");
      const alunoTurma = localStorage.getItem("alunoTurma");
      const alunoEmail = localStorage.getItem("alunoEmail");
      const visitanteData = localStorage.getItem("visitanteData");

      console.log('Verificando sessão - userType:', userType);
      console.log('Verificando sessão - alunoTurma:', alunoTurma);
      console.log('Verificando sessão - visitanteData:', visitanteData);

      if (userType === "aluno" && alunoTurma) {
        let nomeCompleto = '';
        let email = '';
        
        // Buscar dados do aluno no Supabase se temos o email
        if (alunoEmail) {
          try {
            const { data: aluno } = await supabase
              .from("profiles")
              .select("nome, sobrenome, email")
              .eq("email", alunoEmail)
              .eq("turma", alunoTurma)
              .eq("user_type", "aluno")
              .eq("is_authenticated_student", true)
              .maybeSingle();
            
            if (aluno) {
              nomeCompleto = `${aluno.nome} ${aluno.sobrenome}`.trim();
              email = aluno.email;
            }
          } catch (error) {
            console.error('Erro ao buscar dados do aluno:', error);
          }
        }
        
        setIsStudentLoggedIn(true);
        setStudentData({
          userType: "aluno",
          turma: alunoTurma,
          nomeUsuario: nomeCompleto || `Aluno da ${alunoTurma}`,
          nomeCompleto,
          email
        });
        console.log('Sessão de aluno restaurada');
      } else if (userType === "visitante" && visitanteData) {
        try {
          const dados = JSON.parse(visitanteData);
          setIsStudentLoggedIn(true);
          setStudentData({
            userType: "visitante",
            turma: "visitante",
            nomeUsuario: dados.nome,
            visitanteInfo: dados
          });
          console.log('Sessão de visitante restaurada');
        } catch (error) {
          console.error('Erro ao parsear dados do visitante:', error);
          // Limpar dados corrompidos
          localStorage.removeItem("visitanteData");
          localStorage.removeItem("userType");
          setIsStudentLoggedIn(false);
          setStudentData({
            userType: null,
            turma: null,
            nomeUsuario: ''
          });
        }
        } else {
        setIsStudentLoggedIn(false);
        setStudentData({
          userType: null,
          turma: null,
          nomeUsuario: '',
          nomeCompleto: undefined,
          email: undefined
        });
        console.log('Nenhuma sessão ativa encontrada');
      }
    };

    checkStudentSession();

    // Adicionar listener para mudanças no localStorage (caso seja modificado em outra aba)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userType" || e.key === "alunoTurma" || e.key === "alunoEmail" || e.key === "visitanteData") {
        console.log('Mudança detectada no localStorage:', e.key);
        checkStudentSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loginAsStudent = async (turma: string, email?: string) => {
    console.log('Login como aluno - turma:', turma, 'email:', email);
    localStorage.setItem("alunoTurma", turma);
    localStorage.setItem("userType", "aluno");
    localStorage.removeItem("visitanteData");
    
    if (email) {
      localStorage.setItem("alunoEmail", email);
    }
    
    let nomeCompleto = '';
    let studentEmail = email || '';
    
    // Buscar dados do aluno no Supabase se temos o email
    if (email) {
      try {
        const { data: aluno } = await supabase
          .from("profiles")
          .select("nome, sobrenome, email")
          .eq("email", email)
          .eq("turma", turma)
          .eq("user_type", "aluno")
          .eq("is_authenticated_student", true)
          .maybeSingle();
        
        if (aluno) {
          nomeCompleto = `${aluno.nome} ${aluno.sobrenome}`.trim();
          studentEmail = aluno.email;
        }
      } catch (error) {
        console.error('Erro ao buscar dados do aluno:', error);
      }
    }
    
    setIsStudentLoggedIn(true);
    setStudentData({
      userType: "aluno",
      turma: turma,
      nomeUsuario: nomeCompleto || `Aluno da ${turma}`,
      nomeCompleto,
      email: studentEmail
    });
  };

  const loginAsVisitante = (nome: string, email: string) => {
    console.log('Login como visitante - nome:', nome, 'email:', email);
    const visitanteInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      tipo: "visitante"
    };

    localStorage.setItem("visitanteData", JSON.stringify(visitanteInfo));
    localStorage.setItem("userType", "visitante");
    localStorage.setItem("alunoTurma", "visitante");

    setIsStudentLoggedIn(true);
    setStudentData({
      userType: "visitante",
      turma: "visitante",
      nomeUsuario: nome,
      visitanteInfo: visitanteInfo
    });
  };

  const logoutStudent = () => {
    console.log('Logout do estudante');
    // Limpar todos os dados de sessão do estudante
    localStorage.removeItem("userType");
    localStorage.removeItem("alunoTurma");
    localStorage.removeItem("alunoEmail");
    localStorage.removeItem("visitanteData");
    
    setIsStudentLoggedIn(false);
    setStudentData({
      userType: null,
      turma: null,
      nomeUsuario: '',
      nomeCompleto: undefined,
      email: undefined
    });
  };

  return (
    <StudentAuthContext.Provider value={{
      isStudentLoggedIn,
      studentData,
      loginAsStudent,
      loginAsVisitante,
      logoutStudent
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};
