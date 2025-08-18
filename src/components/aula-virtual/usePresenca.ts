
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
    if (!formData.nome.trim() || !formData.sobrenome.trim()) {
      toast.error("Preencha nome e sobrenome");
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const agora = new Date().toISOString();

      if (tipo === 'entrada') {
        // Registrar entrada usando UPSERT por (aula_id, aluno_id)
        const { error } = await supabase
          .from('presenca_aulas')
          .upsert([{
            aula_id: aulaId,
            aluno_id: user.id,
            email_aluno: user.email,
            nome_aluno: formData.nome.trim(),
            sobrenome_aluno: formData.sobrenome.trim(),
            turma: 'Aluno', // Pode ser ajustado conforme necessário
            entrada_at: agora
          }], { 
            onConflict: 'aula_id,aluno_id'
          });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada. Verifique suas permissões.');
          return;
        }
      } else {
        // Para saída, verificar se existe entrada e atualizar
        const { data: row, error: selectError } = await supabase
          .from('presenca_aulas')
          .select('entrada_at, saida_at')
          .eq('aula_id', aulaId)
          .eq('aluno_id', user.id)
          .single();

        if (selectError) {
          console.error('Erro ao buscar registro:', selectError);
          toast.error('Erro ao buscar registro de presença');
          return;
        }

        if (!row?.entrada_at) {
          toast.error('Registre a entrada primeiro.');
          return;
        }
        
        if (row?.saida_at) {
          toast.info('Saída já registrada.');
          return;
        }

        // Atualizar com saída
        const { error } = await supabase
          .from('presenca_aulas')
          .update({ saida_at: agora })
          .eq('aula_id', aulaId)
          .eq('aluno_id', user.id);

        if (error) {
          console.error('Erro ao registrar saída:', error);
          toast.error('Erro ao registrar saída. Verifique suas permissões.');
          return;
        }
      }

      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
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
