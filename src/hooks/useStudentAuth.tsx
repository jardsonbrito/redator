
import { useState, useEffect, createContext, useContext } from 'react';

interface StudentAuthContextType {
  isStudentLoggedIn: boolean;
  studentData: {
    id: string;
    userType: 'aluno' | 'visitante' | null;
    turma: string | null;
    nomeUsuario: string;
    email?: string;
    sessionToken?: string | null;
    visitanteInfo?: {
      nome: string;
      email: string;
    };
  };
  loginAsStudent: (turma: string, nome: string, email: string) => Promise<void>;
  loginAsVisitante: (nome: string, email: string, whatsapp?: string) => Promise<void>;
  logoutStudent: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false);
  const [studentData, setStudentData] = useState<StudentAuthContextType['studentData']>({
    id: '',
    userType: null,
    turma: null,
    nomeUsuario: '',
    email: undefined,
    visitanteInfo: undefined
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verificar se há uma sessão ativa de estudante no localStorage
    const checkStudentSession = async () => {
      const userType = localStorage.getItem("userType");
      const alunoTurma = localStorage.getItem("alunoTurma");
      const alunoData = localStorage.getItem("alunoData");
      const visitanteData = localStorage.getItem("visitanteData");

      console.log('🔍 Verificando sessão persistente - userType:', userType);
      console.log('🔍 Verificando sessão persistente - alunoTurma:', alunoTurma);
      console.log('🔍 Verificando sessão persistente - alunoData:', alunoData);
      console.log('🔍 Verificando sessão persistente - visitanteData:', visitanteData);

      if (userType === "aluno" && alunoTurma && alunoData) {
        try {
          const dados = JSON.parse(alunoData);

          // Buscar turma atualizada do banco de dados
          let turmaAtual = alunoTurma;
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: profileData } = await supabase
              .from('profiles')
              .select('turma')
              .eq('email', dados.email)
              .eq('user_type', 'aluno')
              .maybeSingle();

            if (profileData?.turma && profileData.turma !== alunoTurma) {
              console.log('🔄 Turma atualizada no banco:', profileData.turma, '(localStorage tinha:', alunoTurma, ')');
              turmaAtual = profileData.turma;
              // Atualizar localStorage com a turma correta
              localStorage.setItem("alunoTurma", turmaAtual);
            }
          } catch (dbError) {
            console.warn('⚠️ Não foi possível verificar turma no banco:', dbError);
          }

          setIsStudentLoggedIn(true);
          setStudentData({
            id: dados.email, // usar email como ID para alunos
            userType: "aluno",
            turma: turmaAtual,
            nomeUsuario: dados.nome,
            email: dados.email,
            sessionToken: dados.sessionToken || null
          });
          console.log('✅ Sessão de aluno restaurada persistentemente');
          console.log('🔍 [useStudentAuth] Dados restaurados:', {
            email: dados.email,
            turma: turmaAtual,
            nome: dados.nome,
            tipoTurma: typeof turmaAtual,
            turmaValue: turmaAtual
          });
        } catch (error) {
          console.error('❌ Erro ao parsear dados do aluno:', error);
          // Limpar dados corrompidos
          localStorage.removeItem("alunoData");
          localStorage.removeItem("userType");
          localStorage.removeItem("alunoTurma");
        }
      } else if (userType === "visitante" && visitanteData) {
        try {
          const dados = JSON.parse(visitanteData);
          
          // Verificar se os dados necessários existem
          if (!dados || !dados.email || !dados.nome) {
            throw new Error('Dados de visitante incompletos');
          }
          
          setIsStudentLoggedIn(true);
          setStudentData({
            id: dados.email, // usar email como ID para visitantes
            userType: "visitante",
            turma: "visitante",
            nomeUsuario: dados.nome,
            email: dados.email, // ✅ ADICIONAR EMAIL AQUI
            visitanteInfo: dados
          });
          console.log('✅ Sessão de visitante restaurada persistentemente');
        } catch (error) {
          console.error('❌ Erro ao parsear dados do visitante:', error);
          // Limpar dados corrompidos
          localStorage.removeItem("visitanteData");
          localStorage.removeItem("userType");
          localStorage.removeItem("alunoTurma");
          setIsStudentLoggedIn(false);
          setStudentData({
            id: '',
            userType: null,
            turma: null,
            nomeUsuario: '',
            email: undefined
          });
        }
      } else {
        setIsStudentLoggedIn(false);
        setStudentData({
          id: '',
          userType: null,
          turma: null,
          nomeUsuario: '',
          email: undefined
        });
        console.log('❌ Nenhuma sessão ativa encontrada');
      }
      
      setIsInitialized(true);
    };

    checkStudentSession();

    // Adicionar listener para mudanças no localStorage (caso seja modificado em outra aba)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userType" || e.key === "alunoTurma" || e.key === "alunoData" || e.key === "visitanteData") {
        console.log('🔄 Mudança detectada no localStorage:', e.key);
        checkStudentSession(); // função assíncrona, não precisa de await aqui
      }
    };

    // Adicionar listener para beforeunload para garantir persistência e registrar logout
    const handleBeforeUnload = async () => {
      // Garantir que dados estão salvos antes da página fechar
      if (isStudentLoggedIn) {
        console.log('💾 Salvando sessão antes de fechar página');

        // Registrar logout quando a página for fechada
        const loginSessionId = localStorage.getItem('loginSessionId');
        if (loginSessionId) {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            // Usar sendBeacon para garantir que a requisição seja enviada mesmo com a página fechando
            const data = JSON.stringify({ session_id: loginSessionId });
            navigator.sendBeacon('/api/logout', data);

            // Fallback: tentar via RPC normal
            await supabase.rpc('register_student_logout', {
              p_session_id: loginSessionId
            });
          } catch (error) {
            console.warn('⚠️ Erro ao registrar logout no beforeunload:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStudentLoggedIn]);

  // Função para garantir que o perfil existe no banco
  const ensureProfileExists = async (email: string, nome: string, turma: string) => {
    try {
      console.log("🔍 Verificando se perfil existe para:", email);
      const { supabase } = await import('@/integrations/supabase/client');

      // Primeiro verifica se já existe
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .eq("user_type", "aluno")
        .maybeSingle();

      if (existingProfile) {
        console.log("✅ Perfil já existe:", existingProfile.id);
        return existingProfile.id;
      }

      // Se não existe, tenta criar
      console.log("⚠️ Perfil não encontrado. Criando novo perfil para:", email);
      
      const { data: newProfile, error: insertError } = await supabase
        .rpc('create_simple_profile', {
          p_nome: nome || 'Aluno',
          p_email: email,
          p_turma: turma || ''
        });

      if (insertError) {
        console.error("❌ Erro ao criar perfil:", insertError.message);
        return null;
      }

      console.log("✅ Perfil criado com sucesso:", newProfile?.[0]?.id);
      return newProfile?.[0]?.id;
    } catch (error) {
      console.error("❌ Erro inesperado ao verificar/criar perfil:", error);
      return null;
    }
  };

  const loginAsStudent = async (turma: string, nome: string, email: string) => {
    console.log('🔐 Login como aluno - turma:', turma, 'nome:', nome, 'email:', email);

    const alunoInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      turma: turma
    };

    let sessionToken = null;
    let loginSessionId = null;

    try {
      // Garantir que o perfil existe no banco de dados
      await ensureProfileExists(email.trim().toLowerCase(), nome.trim(), turma);

      // Verificação automática de contas duplicadas e merge
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: mergeResult } = await supabase.rpc('auto_merge_student_accounts', {
        student_email: email.trim().toLowerCase()
      });

      if (mergeResult && typeof mergeResult === 'object' && 'auto_merged' in mergeResult && mergeResult.auto_merged) {
        console.log('✅ Redações anteriores reconectadas automaticamente:', mergeResult.total_redacoes_merged);
      }

      // Criar token de sessão para registro de presença
      try {
        const { data: tokenResult, error: tokenError } = await supabase.rpc('create_session_token', {
          p_student_email: email.trim().toLowerCase(),
          p_student_name: nome.trim(),
          p_turma: turma
        });

        if (tokenError) {
          console.warn('⚠️ Erro ao criar token de sessão:', tokenError);
        } else if (tokenResult && typeof tokenResult === 'object' && 'success' in tokenResult && tokenResult.success) {
          const result = tokenResult as { success: boolean; token: string };
          sessionToken = result.token;
          console.log('✅ Token de sessão criado com sucesso');

          // Armazenar token em cookie com configurações seguras
          document.cookie = `student_session_token=${sessionToken}; path=/; max-age=86400; SameSite=Strict`;
        }
      } catch (tokenError) {
        console.warn('⚠️ Erro ao criar token de sessão (não crítico):', tokenError);
      }

      // Registrar sessão de login
      try {
        const { data: loginResult, error: loginError } = await supabase.rpc('register_student_login', {
          p_student_email: email.trim().toLowerCase(),
          p_student_name: nome.trim(),
          p_turma: turma,
          p_user_type: 'aluno',
          p_session_token: sessionToken
        });

        if (loginError) {
          console.warn('⚠️ Erro ao registrar sessão de login:', loginError);
        } else {
          loginSessionId = loginResult;
          console.log('✅ Sessão de login registrada:', loginSessionId);
          // Armazenar ID da sessão no localStorage para usar no logout
          localStorage.setItem('loginSessionId', loginSessionId);
        }
      } catch (loginError) {
        console.warn('⚠️ Erro ao registrar sessão de login (não crítico):', loginError);
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação automática:', error);
      // Não bloquear o login se a verificação falhar
    }
    
    // Garantir persistência com múltiplas estratégias
    localStorage.setItem("alunoTurma", turma);
    localStorage.setItem("alunoData", JSON.stringify({...alunoInfo, sessionToken}));
    localStorage.setItem("userType", "aluno");
    localStorage.removeItem("visitanteData");

    // Também salvar timestamp para auditoria
    localStorage.setItem("loginTimestamp", new Date().toISOString());

    console.log('🔍 [useStudentAuth] Login - salvando dados:', {
      turma: turma,
      tipoTurma: typeof turma,
      alunoInfo: alunoInfo,
      localStorage_alunoTurma: localStorage.getItem("alunoTurma"),
      localStorage_userType: localStorage.getItem("userType")
    });

    setIsStudentLoggedIn(true);
    setStudentData({
      id: email.toLowerCase(), // usar email como ID para alunos
      userType: "aluno",
      turma: turma,
      nomeUsuario: nome,
      email: email.toLowerCase(),
      sessionToken: sessionToken
    });
  };

  const loginAsVisitante = async (nome: string, email: string, whatsapp?: string) => {
    console.log('🔐 Login como visitante - nome:', nome, 'email:', email);
    const visitanteInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      tipo: "visitante"
    };

    let sessionId = null;
    let loginSessionId = null;

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      // Salvar sessão de visitante no banco usando a função RPC
      console.log('💾 Salvando sessão de visitante no banco...');
      const { data: sessaoResult, error: sessaoError } = await supabase.rpc('gerenciar_sessao_visitante', {
        p_email_visitante: email.trim().toLowerCase(),
        p_nome_visitante: nome.trim(),
        p_whatsapp: whatsapp?.trim() || null
      });

      if (sessaoError) {
        console.warn('⚠️ Erro ao salvar sessão no banco:', sessaoError);
        // Gerar session_id local como fallback
        sessionId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else if (sessaoResult && typeof sessaoResult === 'object' && sessaoResult !== null && 'success' in sessaoResult && sessaoResult.success) {
        sessionId = (sessaoResult as any).session_id;
        console.log('✅ Sessão salva no banco:', (sessaoResult as any).action, 'Session ID:', sessionId);
      } else {
        console.warn('⚠️ Resposta inesperada da função RPC:', sessaoResult);
        // Gerar session_id local como fallback
        sessionId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Verificação automática de contas duplicadas e merge para visitantes também
      const { data: mergeResult } = await supabase.rpc('auto_merge_student_accounts', {
        student_email: email.trim().toLowerCase()
      });

      if (mergeResult && typeof mergeResult === 'object' && mergeResult !== null && 'auto_merged' in mergeResult && mergeResult.auto_merged) {
        console.log('✅ Redações anteriores reconectadas automaticamente para visitante:', mergeResult.total_redacoes_merged);
      }

      // Registrar sessão de login para visitante
      try {
        const { data: loginResult, error: loginError } = await supabase.rpc('register_student_login', {
          p_student_email: email.trim().toLowerCase(),
          p_student_name: nome.trim(),
          p_turma: 'visitante',
          p_user_type: 'visitante',
          p_session_token: null
        });

        if (loginError) {
          console.warn('⚠️ Erro ao registrar sessão de login:', loginError);
        } else {
          loginSessionId = loginResult;
          console.log('✅ Sessão de login registrada:', loginSessionId);
          // Armazenar ID da sessão no localStorage para usar no logout
          localStorage.setItem('loginSessionId', loginSessionId);
        }
      } catch (loginError) {
        console.warn('⚠️ Erro ao registrar sessão de login (não crítico):', loginError);
      }
    } catch (error) {
      console.warn('⚠️ Erro na gestão de sessão/merge para visitante:', error);
      // Gerar session_id local como fallback
      sessionId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Garantir persistência com múltiplas estratégias, incluindo session_id
    const visitanteCompleteInfo = {
      ...visitanteInfo,
      sessionId: sessionId
    };
    
    localStorage.setItem("visitanteData", JSON.stringify(visitanteCompleteInfo));
    localStorage.setItem("userType", "visitante");
    localStorage.setItem("alunoTurma", "visitante");
    localStorage.setItem("loginTimestamp", new Date().toISOString());

    setIsStudentLoggedIn(true);
    setStudentData({
      id: email.toLowerCase(), // usar email como ID para visitantes
      userType: "visitante",
      turma: "visitante",
      nomeUsuario: nome,
      email: email.toLowerCase(), // ✅ ADICIONAR EMAIL AQUI TAMBÉM
      visitanteInfo: visitanteCompleteInfo
    });
  };

  const logoutStudent = async () => {
    console.log('🚪 Logout do estudante');

    // Registrar logout na sessão
    try {
      const loginSessionId = localStorage.getItem('loginSessionId');
      if (loginSessionId) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase.rpc('register_student_logout', {
          p_session_id: loginSessionId
        });

        if (error) {
          console.warn('⚠️ Erro ao registrar logout:', error);
        } else {
          console.log('✅ Logout registrado com sucesso');
        }
      } else if (studentData.email) {
        // Se não tiver session_id, usar email como fallback
        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase.rpc('register_student_logout_by_email', {
          p_student_email: studentData.email
        });

        if (error) {
          console.warn('⚠️ Erro ao registrar logout por email:', error);
        } else {
          console.log('✅ Logout registrado com sucesso (por email)');
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao registrar logout (não crítico):', error);
    }

    // Limpar todos os dados de sessão do estudante
    localStorage.removeItem("userType");
    localStorage.removeItem("alunoTurma");
    localStorage.removeItem("alunoData");
    localStorage.removeItem("visitanteData");
    localStorage.removeItem("loginTimestamp");
    localStorage.removeItem("loginSessionId");

    // Limpar cache do avatar
    localStorage.removeItem("student_avatar_url");

    // Limpar token de sessão do cookie
    document.cookie = 'student_session_token=; path=/; max-age=0; SameSite=Strict';

    setIsStudentLoggedIn(false);
    setStudentData({
      id: '',
      userType: null,
      turma: null,
      nomeUsuario: '',
      email: undefined,
      sessionToken: null
    });
  };

  // Não renderizar até a inicialização estar completa
  if (!isInitialized) {
    return <div>Carregando...</div>;
  }

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
