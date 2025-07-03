
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { RegistroPresenca } from "./types";

export const usePresenca = (registrosPresenca: RegistroPresenca[], setRegistrosPresenca: (registros: RegistroPresenca[]) => void) => {
  const { studentData } = useStudentAuth();
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: ""
  });

  // Buscar registros ao inicializar o hook
  useEffect(() => {
    fetchRegistrosPresenca();
  }, [studentData]);

  const fetchRegistrosPresenca = async () => {
    try {
      if (!studentData.visitanteInfo?.email && studentData.userType === 'visitante') return;
      
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email 
        : 'email_nao_disponivel';

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, tipo_registro')
        .eq('email_aluno', email)
        .eq('turma', studentData.turma);

      if (error) throw error;
      setRegistrosPresenca((data || []) as RegistroPresenca[]);
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
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : 'aluno@exemplo.com';

      const { error } = await supabase
        .from('presenca_aulas')
        .insert([{
          aula_id: aulaId,
          nome_aluno: formData.nome.trim(),
          sobrenome_aluno: formData.sobrenome.trim(),
          email_aluno: email,
          turma: studentData.turma,
          tipo_registro: tipo
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error(`Você já registrou ${tipo} para esta aula`);
          return;
        }
        throw error;
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
    return registrosPresenca.some(r => r.aula_id === aulaId && r.tipo_registro === tipo);
  };

  const openPresencaDialog = (tipo: 'entrada' | 'saida', aulaId: string) => {
    setFormData({
      nome: studentData.nomeUsuario.split(' ')[0] || "",
      sobrenome: studentData.nomeUsuario.split(' ').slice(1).join(' ') || ""
    });
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
