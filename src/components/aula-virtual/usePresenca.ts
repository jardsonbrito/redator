
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Usuário não autenticado:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .or(`aluno_id.eq.${user.id},email_aluno.eq.${user.email}`) // Compatibilidade com legado
        .order('criado_em', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map((record: any) => ({
        aula_id: record.aula_id,
        aluno_id: user.id,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Faça login para registrar presença');
        return;
      }

      if (tipo === 'entrada') {
        const { data, error } = await supabase.rpc('registrar_entrada_email', {
          p_aula_id: aulaId
        });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada');
          return;
        }

        if (data === 'usuario_nao_autenticado') {
          toast.error('Faça login para registrar presença');
        } else if (data === 'entrada_ok') {
          toast.success('Entrada registrada!');
        } else {
          toast.error('Não foi possível registrar a entrada');
        }
      } else {
        const { data, error } = await supabase.rpc('registrar_saida_email', {
          p_aula_id: aulaId
        });

        if (error) {
          console.error('Erro ao registrar saída:', error);
          toast.error('Erro ao registrar saída');
          return;
        }

        if (data === 'usuario_nao_autenticado') {
          toast.error('Faça login para registrar presença');
        } else if (data === 'precisa_entrada') {
          toast.error('Registre a entrada primeiro');
        } else if (data === 'saida_ja_registrada') {
          toast.info('Saída já registrada');
        } else if (data === 'saida_ok') {
          toast.success('Saída registrada!');
        } else {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        setFormData({
          nome: user.user_metadata.nome || user.email?.split('@')[0] || "",
          sobrenome: user.user_metadata.sobrenome || ""
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
