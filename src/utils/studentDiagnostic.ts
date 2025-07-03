
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail } from "./emailValidator";

interface StudentDiagnostic {
  totalStudents: number;
  studentsWithProblematicEmails: any[];
  duplicateEmails: any[];
  emailsWithSpaces: any[];
  emailsWithSpecialChars: any[];
  testResults: any[];
}

export const diagnoseStudentData = async (): Promise<StudentDiagnostic> => {
  console.log('🔍 DIAGNÓSTICO COMPLETO - Iniciando análise...');
  
  try {
    // Buscar todos os alunos
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id, nome, email, turma")
      .eq("user_type", "aluno");

    if (error) {
      console.error('🚨 Erro ao buscar alunos:', error);
      throw error;
    }

    const totalStudents = students?.length || 0;
    console.log(`📊 Total de alunos encontrados: ${totalStudents}`);

    // Analisar emails problemáticos
    const studentsWithProblematicEmails = students?.filter(student => {
      const email = student.email;
      const normalized = normalizeEmail(email);
      return email !== normalized;
    }) || [];

    // Buscar emails duplicados
    const emailCounts: { [key: string]: any[] } = {};
    students?.forEach(student => {
      const normalizedEmail = normalizeEmail(student.email);
      if (!emailCounts[normalizedEmail]) {
        emailCounts[normalizedEmail] = [];
      }
      emailCounts[normalizedEmail].push(student);
    });

    const duplicateEmails = Object.entries(emailCounts)
      .filter(([_, students]) => students.length > 1)
      .map(([email, students]) => ({ email, students }));

    // Emails com espaços
    const emailsWithSpaces = students?.filter(student => 
      student.email.includes(' ') || student.email !== student.email.trim()
    ) || [];

    // Emails com caracteres especiais
    const emailsWithSpecialChars = students?.filter(student => 
      /[^\w@.-]/.test(student.email.replace(/[@.-]/g, ''))
    ) || [];

    // Teste de conectividade com alguns emails
    const testResults = [];
    const testEmails = students?.slice(0, 5) || [];
    
    for (const student of testEmails) {
      const testResult = await testStudentLogin(student.email);
      testResults.push({
        email: student.email,
        nome: student.nome,
        turma: student.turma,
        testResult
      });
    }

    const diagnostic: StudentDiagnostic = {
      totalStudents,
      studentsWithProblematicEmails,
      duplicateEmails,
      emailsWithSpaces,
      emailsWithSpecialChars,
      testResults
    };

    console.log('📊 DIAGNÓSTICO COMPLETO:', diagnostic);
    return diagnostic;

  } catch (error) {
    console.error('🚨 Erro no diagnóstico:', error);
    throw error;
  }
};

const testStudentLogin = async (email: string) => {
  try {
    const normalizedEmail = normalizeEmail(email);
    
    const { data: student, error } = await supabase
      .from("profiles")
      .select("id, nome, email, turma")
      .eq("email", normalizedEmail)
      .eq("user_type", "aluno")
      .maybeSingle();

    return {
      success: !!student,
      error: error?.message || null,
      found: !!student,
      originalEmail: email,
      normalizedEmail: normalizedEmail,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      found: false,
      originalEmail: email,
      normalizedEmail: normalizeEmail(email),
      timestamp: new Date().toISOString()
    };
  }
};

export const fixStudentEmails = async (): Promise<boolean> => {
  console.log('🔧 CORREÇÃO - Iniciando normalização dos emails...');
  
  try {
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id, nome, email, turma")
      .eq("user_type", "aluno");

    if (error) {
      console.error('🚨 Erro ao buscar alunos para correção:', error);
      throw error;
    }

    let fixedCount = 0;

    for (const student of students || []) {
      const originalEmail = student.email;
      const normalizedEmail = normalizeEmail(originalEmail);

      if (originalEmail !== normalizedEmail) {
        console.log(`🔧 Corrigindo email: ${originalEmail} → ${normalizedEmail}`);
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email: normalizedEmail })
          .eq("id", student.id);

        if (updateError) {
          console.error(`🚨 Erro ao corrigir email para ${student.nome}:`, updateError);
        } else {
          fixedCount++;
          console.log(`✅ Email corrigido para ${student.nome}`);
        }
      }
    }

    console.log(`✅ CORREÇÃO CONCLUÍDA: ${fixedCount} emails corrigidos`);
    return true;

  } catch (error) {
    console.error('🚨 Erro na correção dos emails:', error);
    return false;
  }
};

// Executar diagnóstico automático em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setTimeout(async () => {
    try {
      await diagnoseStudentData();
    } catch (error) {
      console.error('Erro no diagnóstico automático:', error);
    }
  }, 2000);
}
