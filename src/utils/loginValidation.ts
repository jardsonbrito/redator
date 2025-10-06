/**
 * Script de validação automática do sistema de login
 * Testa casos de sucesso e falha
 */

import { supabase } from "@/integrations/supabase/client";
import { compareTurmas, extractTurmaLetter } from "@/utils/turmaUtils";

interface TestCase {
  description: string;
  email: string;
  turma: string;
  expectedResult: 'success' | 'email_not_found' | 'wrong_class';
}

interface ValidationResult {
  testsPassed: number;
  testsFailed: number;
  results: Array<{
    test: string;
    status: 'PASS' | 'FAIL';
    message: string;
  }>;
}

export const validateLoginSystem = async (): Promise<ValidationResult> => {
  const testCases: TestCase[] = [
    // Casos de sucesso - usando formato normalizado
    {
      description: "Login válido - Turma A",
      email: "abiliode@laboratoriodoredator.com",
      turma: "A", // Formato normalizado
      expectedResult: 'success'
    },
    {
      description: "Login válido - Turma B",
      email: "alessandra@laboratoriodoredator.com",
      turma: "B", // Formato normalizado
      expectedResult: 'success'
    },
    {
      description: "Login válido - Turma C",
      email: "anajuliafreitas@laboratoriodoredator.com",
      turma: "C", // Formato normalizado
      expectedResult: 'success'
    },
    {
      description: "Login válido - Turma D",
      email: "adriellybraz@laboratoriodoredator.com",
      turma: "D", // Formato normalizado
      expectedResult: 'success'
    },
    // Casos de falha - email não existe
    {
      description: "Email inexistente",
      email: "emailinexistente@laboratoriodoredator.com",
      turma: "A", // Formato normalizado
      expectedResult: 'email_not_found'
    },
    // Casos de falha - turma incorreta
    {
      description: "Turma incorreta para email válido",
      email: "abiliode@laboratoriodoredator.com", // Este aluno está na Turma A
      turma: "B", // Mas tentando logar na Turma B (formato normalizado)
      expectedResult: 'wrong_class'
    }
  ];

  const results: ValidationResult = {
    testsPassed: 0,
    testsFailed: 0,
    results: []
  };

  for (const testCase of testCases) {
    try {
      // Simular a lógica de login
      const { data: aluno, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .eq("email", testCase.email.trim().toLowerCase())
        .eq("user_type", "aluno")
        .maybeSingle();

      let actualResult: 'success' | 'email_not_found' | 'wrong_class';

      if (error) {
        throw error;
      }

      if (!aluno) {
        actualResult = 'email_not_found';
      } else if (!compareTurmas(aluno.turma, testCase.turma)) {
        actualResult = 'wrong_class';
      } else {
        actualResult = 'success';
      }

      // Verificar se o resultado é o esperado
      const testPassed = actualResult === testCase.expectedResult;
      
      results.results.push({
        test: testCase.description,
        status: testPassed ? 'PASS' : 'FAIL',
        message: testPassed 
          ? `✅ Resultado esperado: ${testCase.expectedResult}`
          : `❌ Esperado: ${testCase.expectedResult}, Obtido: ${actualResult}`
      });

      if (testPassed) {
        results.testsPassed++;
      } else {
        results.testsFailed++;
      }

    } catch (error) {
      results.results.push({
        test: testCase.description,
        status: 'FAIL',
        message: `❌ Erro inesperado: ${error}`
      });
      results.testsFailed++;
    }
  }

  return results;
};

// Função para verificar a integridade do banco de dados
export const validateDatabaseIntegrity = async () => {
  try {
    const { data: stats, error } = await supabase
      .from("profiles")
      .select("turma, user_type")
      .eq("user_type", "aluno");

    if (error) throw error;

    const turmaStats = stats.reduce((acc: any, aluno: any) => {
      const letra = extractTurmaLetter(aluno.turma);
      if (letra) {
        acc[letra] = (acc[letra] || 0) + 1;
      }
      return acc;
    }, {});

    console.log("📊 Estatísticas do banco de dados:");
    console.log(`Total de alunos: ${stats.length}`);
    console.log("Distribuição por turma:", turmaStats);

    return {
      totalAlunos: stats.length,
      distribuicao: turmaStats,
      status: 'OK'
    };
  } catch (error) {
    console.error("❌ Erro na validação do banco:", error);
    return { status: 'ERROR', error };
  }
};