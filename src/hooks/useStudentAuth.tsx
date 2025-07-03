
import { useState, useEffect, createContext, useContext } from 'react';

interface StudentAuthContextType {
  isStudentLoggedIn: boolean;
  studentData: {
    userType: 'aluno' | 'visitante' | null;
    turma: string | null;
    nomeUsuario: string;
    visitanteInfo?: {
      nome: string;
      email: string;
    };
  };
  loginAsStudent: (turma: string) => void;
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
    visitanteInfo: undefined
  });

  useEffect(() => {
    // Verificar se há uma sessão ativa de estudante no localStorage
    const checkStudentSession = () => {
      const userType = localStorage.getItem("userType");
      const alunoTurma = localStorage.getItem("alunoTurma");
      const visitanteData = localStorage.getItem("visitanteData");

      console.log('Verificando sessão - userType:', userType);
      console.log('Verificando sessão - alunoTurma:', alunoTurma);
      console.log('Verificando sessão - visitanteData:', visitanteData);

      if (userType === "aluno" && alunoTurma) {
        setIsStudentLoggedIn(true);
        setStudentData({
          userType: "aluno",
          turma: alunoTurma,
          nomeUsuario: `Aluno da ${alunoTurma}`
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
          nomeUsuario: ''
        });
        console.log('Nenhuma sessão ativa encontrada');
      }
    };

    checkStudentSession();

    // Adicionar listener para mudanças no localStorage (caso seja modificado em outra aba)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userType" || e.key === "alunoTurma" || e.key === "visitanteData") {
        console.log('Mudança detectada no localStorage:', e.key);
        checkStudentSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loginAsStudent = (turma: string) => {
    console.log('Login como aluno - turma:', turma);
    localStorage.setItem("alunoTurma", turma);
    localStorage.setItem("userType", "aluno");
    localStorage.removeItem("visitanteData");
    
    setIsStudentLoggedIn(true);
    setStudentData({
      userType: "aluno",
      turma: turma,
      nomeUsuario: `Aluno da ${turma}`
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
    localStorage.removeItem("visitanteData");
    
    setIsStudentLoggedIn(false);
    setStudentData({
      userType: null,
      turma: null,
      nomeUsuario: ''
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
