
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RegistroPresenca } from "./types";

export const usePresenca = (registrosPresenca: RegistroPresenca[], setRegistrosPresenca: (registros: RegistroPresenca[]) => void) => {
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: ""
  });

  // Buscar registros ao inicializar o hook
  useEffect(() => {
    fetchRegistrosPresenca();
  }, []);

  const fetchRegistrosPresenca = async () => {
    try {
      // Buscar email do aluno logado no localStorage
      const alunoData = localStorage.getItem("alunoData");
      if (!alunoData) {
        console.log('Nenhum aluno logado encontrado');
        return;
      }

      const dados = JSON.parse(alunoData);
      const emailAluno = dados.email;

      if (!emailAluno) {
        console.log('Email do aluno não encontrado');
        return;
      }

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .eq('email_aluno', emailAluno)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map((record: any) => ({
        aula_id: record.aula_id,
        aluno_id: emailAluno, // usar email como ID
        entrada_at: record.entrada_at || null,
        saida_at: record.saida_at || null
      }));
      
      setRegistrosPresenca(transformedData as RegistroPresenca[]);
    } catch (error: any) {
      console.error('Erro ao buscar registros de presença:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida', aulaId: string) => {
    try {
      // Obter token de sessão do cookie
      const getSessionToken = (): string | null => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'student_session_token') {
            return value;
          }
        }
        return null;
      };

      const sessionToken = getSessionToken();
      
      if (!sessionToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      if (tipo === 'entrada') {
        const { data, error } = await supabase.rpc('registrar_entrada_com_token', {
          p_aula_id: aulaId,
          p_session_token: sessionToken
        });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada');
          return;
        }

        switch (data) {
          case 'entrada_ok':
            toast.success('Entrada registrada!');
            break;
          case 'entrada_ja_registrada':
            toast.info('Entrada já registrada');
            break;
          case 'token_invalido_ou_expirado':
            toast.error('Sessão expirada. Faça login novamente.');
            break;
          case 'aula_nao_encontrada':
            toast.error('Aula não encontrada');
            break;
          case 'aula_nao_iniciou':
            toast.error('Aula ainda não iniciou (tolerância de 10 minutos)');
            break;
          case 'janela_encerrada':
            toast.error('Janela de registro encerrada');
            break;
          default:
            toast.error('Não foi possível registrar a entrada');
        }
      } else {
        const { data, error } = await supabase.rpc('registrar_saida_com_token', {
          p_aula_id: aulaId,
          p_session_token: sessionToken
        });

        if (error) {
          console.error('Erro ao registrar saída:', error);
          toast.error('Erro ao registrar saída');
          return;
        }

        switch (data) {
          case 'saida_ok':
            toast.success('Saída registrada!');
            break;
          case 'saida_ja_registrada':
            toast.info('Saída já registrada');
            break;
          case 'token_invalido_ou_expirado':
            toast.error('Sessão expirada. Faça login novamente.');
            break;
          case 'aula_nao_encontrada':
            toast.error('Aula não encontrada');
            break;
          case 'aula_nao_iniciou':
            toast.error('Aula ainda não iniciou');
            break;
          case 'janela_encerrada':
            toast.error('Janela de registro encerrada');
            break;
          case 'precisa_entrada':
            toast.error('Registre a entrada primeiro');
            break;
          default:
            toast.error('Não foi possível registrar a saída');
        }
      }

      setOpenDialog(null);
      setFormData({ nome: "", sobrenome: "" });
      fetchRegistrosPresenca();
    } catch (error: any) {
      console.error('Erro ao registrar presença:', error);
      toast.error('Erro ao registrar presença');
    }
  };

  const jaRegistrou = (aulaId: string, tipo: 'entrada' | 'saida') => {
    const registro = registrosPresenca.find(r => r.aula_id === aulaId);
    if (!registro) return false;
    
    if (tipo === 'entrada') {
      return !!registro.entrada_at;
    } else {
      return !!registro.saida_at;
    }
  };

  const openPresencaDialog = async (tipo: 'entrada' | 'saida', aulaId: string) => {
    try {
      // Buscar dados do aluno logado no localStorage
      const alunoData = localStorage.getItem("alunoData");
      if (alunoData) {
        const dados = JSON.parse(alunoData);
        setFormData({
          nome: dados.nome || dados.email?.split('@')[0] || "",
          sobrenome: "" // Não temos sobrenome no sistema atual
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
    setOpenDialog({ tipo, aulaId });
  };

  return {
    openDialog,
    setOpenDialog,
    formData,
    setFormData,
    fetchRegistrosPresenca,
    registrarPresenca,
    jaRegistrou,
    openPresencaDialog
  };
};
