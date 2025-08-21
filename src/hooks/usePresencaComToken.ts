import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(timezone);

interface RegistroPresenca {
  aula_id: string;
  entrada_registrada: boolean;
  saida_registrada: boolean;
  duracao_minutos?: number;
}

interface FormData {
  nome: string;
  sobrenome: string;
}

export const usePresencaComToken = () => {
  const { studentData } = useStudentAuth();
  const { toast } = useToast();
  const [registrosPresenca, setRegistrosPresenca] = useState<RegistroPresenca[]>([]);
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState<FormData>({ nome: '', sobrenome: '' });

  // Buscar registros existentes do aluno
  const fetchRegistrosPresenca = useCallback(async () => {
    if (!studentData.email) return;

    try {
      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at, duracao_minutos')
        .eq('email_aluno', studentData.email.toLowerCase())
        .order('criado_em', { ascending: false });

      if (error) throw error;
      
      const transformedData: RegistroPresenca[] = (data || []).map(record => ({
        aula_id: record.aula_id,
        entrada_registrada: !!record.entrada_at,
        saida_registrada: !!record.saida_at,
        duracao_minutos: record.duracao_minutos || undefined
      }));
      
      setRegistrosPresenca(transformedData);
    } catch (error) {
      console.error('Erro ao buscar registros de presença:', error);
    }
  }, [studentData.email]);

  useEffect(() => {
    fetchRegistrosPresenca();
  }, [fetchRegistrosPresenca]);

  // Função para definir email na sessão via RPC
  const setSessionEmail = async (email: string) => {
    try {
      await supabase.rpc('set_current_user_email', { user_email: email });
    } catch (error) {
      console.error('Erro ao definir email da sessão:', error);
    }
  };

  // Registrar presença (entrada ou saída)
  const registrarPresenca = async (tipo: 'entrada' | 'saida', aulaId: string) => {
    if (!studentData.email || !formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório para registrar presença",
        variant: "destructive"
      });
      return;
    }

    try {
      // Definir email na sessão antes da operação
      await setSessionEmail(studentData.email.toLowerCase());

      // Escolher função RPC baseada no tipo
      const rpcFunction = tipo === 'entrada' ? 'registrar_entrada_com_token' : 'registrar_saida_com_token';
      
      const { data, error } = await supabase.rpc(rpcFunction, {
        p_aula_id: aulaId,
        p_nome: formData.nome.trim(),
        p_sobrenome: formData.sobrenome.trim() || ''
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; error?: string };

      if (!result.success) {
        throw new Error(result.message || `Erro ao registrar ${tipo}`);
      }

      // Sucesso
      toast({
        title: "Sucesso",
        description: result.message,
        variant: "default"
      });

      // Atualizar lista de registros
      await fetchRegistrosPresenca();
      
      // Fechar dialog
      setOpenDialog(null);
      
    } catch (error: any) {
      console.error(`Erro ao registrar ${tipo}:`, error);
      
      let errorMessage = `Erro ao registrar ${tipo}`;
      
      if (error.message?.includes('session_required')) {
        errorMessage = 'Sessão não encontrada. Faça login novamente.';
      } else if (error.message?.includes('duplicate')) {
        errorMessage = `${tipo === 'entrada' ? 'Entrada' : 'Saída'} já foi registrada para esta aula`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Verificar se já registrou entrada/saída para uma aula específica
  const jaRegistrou = useCallback((tipo: 'entrada' | 'saida', aulaId: string): boolean => {
    const registro = registrosPresenca.find(r => r.aula_id === aulaId);
    return tipo === 'entrada' ? !!registro?.entrada_registrada : !!registro?.saida_registrada;
  }, [registrosPresenca]);

  // Abrir dialog de presença
  const openPresencaDialog = (tipo: 'entrada' | 'saida', aulaId: string) => {
    // Pré-preencher dados do aluno se disponível
    const alunoStorage = localStorage.getItem('alunoData');
    if (alunoStorage) {
      try {
        const aluno = JSON.parse(alunoStorage);
        setFormData({
          nome: aluno.nome || '',
          sobrenome: aluno.sobrenome || ''
        });
      } catch (error) {
        console.error('Erro ao carregar dados do aluno:', error);
      }
    }
    
    setOpenDialog({ tipo, aulaId });
  };

  return {
    registrosPresenca,
    openDialog,
    formData,
    setOpenDialog,
    setFormData,
    fetchRegistrosPresenca,
    registrarPresenca,
    jaRegistrou,
    openPresencaDialog
  };
};