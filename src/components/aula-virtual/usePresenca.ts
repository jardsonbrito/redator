
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { RegistroPresenca } from "./types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const usePresenca = (registrosPresenca: RegistroPresenca[], setRegistrosPresenca: (registros: RegistroPresenca[]) => void) => {
  const { studentData } = useStudentAuth();
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: ""
  });
  const [timeStates, setTimeStates] = useState<{[aulaId: string]: {canEntry: boolean, canExit: boolean}}>({});

  // Auto refresh para recalcular estados dos botões
  useEffect(() => {
    const interval = setInterval(() => {
      // Força recalculo dos estados sem recarregar dados
      setTimeStates(prev => ({...prev}));
    }, 15000); // A cada 15 segundos

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeStates(prev => ({...prev}));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Buscar registros ao inicializar o hook
  useEffect(() => {
    fetchRegistrosPresenca();
  }, [studentData]);

  const fetchRegistrosPresenca = async () => {
    try {
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : studentData.email || 'aluno@exemplo.com';

      const { data, error } = await (supabase as any)
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .eq('email_aluno', email);

      if (error) throw error;
      
      const transformedData = (data || []).map((record: any) => ({
        aula_id: record.aula_id,
        aluno_id: '', // Não usado mais
        entrada_at: record.entrada_at || null,
        saida_at: record.saida_at || null
      }));
      
      setRegistrosPresenca(transformedData as RegistroPresenca[]);
    } catch (error: any) {
      console.error('Erro ao buscar registros de presença:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida', aulaId: string, aulaData?: string, horarioInicio?: string, horarioFim?: string) => {
    if (!formData.nome.trim() || !formData.sobrenome.trim()) {
      toast.error("Preencha nome e sobrenome");
      return;
    }

    // Validar horários se fornecidos
    if (aulaData && horarioInicio && horarioFim) {
      const timeState = calculateTimeWindows(aulaData, horarioInicio, horarioFim, aulaId);
      
      if (tipo === 'entrada' && !timeState.canEntry) {
        toast.error('A presença só pode ser registrada a partir do início da aula.');
        return;
      }
      
      if (tipo === 'saida' && !timeState.canExit) {
        toast.error('A saída só pode ser registrada de 10 min antes até 10 min após o término.');
        return;
      }
    }

    try {
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : studentData.email || 'aluno@exemplo.com';
      
      const turma = studentData.userType === 'visitante' ? 'visitante' : studentData.turma;
      const agora = new Date().toISOString();

      if (tipo === 'entrada') {
        // Registrar entrada usando upsert por (aula_id, email_aluno)
        const { error } = await (supabase as any)
          .from('presenca_aulas')
          .upsert([{
            aula_id: aulaId,
            email_aluno: email,
            nome_aluno: formData.nome.trim(),
            sobrenome_aluno: formData.sobrenome.trim(),
            turma: turma,
            entrada_at: agora
          }], { 
            onConflict: 'aula_id,email_aluno',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada. Verifique suas permissões.');
          return;
        }
      } else {
        // Para saída, verificar se existe entrada e atualizar
        const { data: row } = await (supabase as any)
          .from('presenca_aulas')
          .select('entrada_at, saida_at')
          .eq('aula_id', aulaId)
          .eq('email_aluno', email)
          .single();

        if (!(row as any)?.entrada_at) {
          toast.error('Registre a entrada primeiro.');
          return;
        }
        
        if ((row as any)?.saida_at) {
          toast.error('Saída já registrada.');
          return;
        }

        // Atualizar com saída
        const { error } = await (supabase as any)
          .from('presenca_aulas')
          .update({ saida_at: agora })
          .eq('aula_id', aulaId)
          .eq('email_aluno', email);

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

  const podeRegistrarSaida = (aulaId: string) => {
    // Só pode registrar saída se já tiver registrado entrada
    return jaRegistrou(aulaId, 'entrada') && !jaRegistrou(aulaId, 'saida');
  };

  const calculateTimeWindows = useCallback((aulaData: string, horarioInicio: string, horarioFim: string, aulaId: string) => {
    try {
      // Parse com timezone America/Sao_Paulo
      const timezone = 'America/Sao_Paulo';
      
      // Convert from YYYY-MM-DD or DD/MM/YYYY to DD/MM/YYYY format
      let dateFormatted = aulaData;
      if (aulaData.includes('-')) {
        // Convert from YYYY-MM-DD to DD/MM/YYYY
        dateFormatted = aulaData.split('-').reverse().join('/');
      }
      
      const start = dayjs.tz(`${dateFormatted} ${horarioInicio}`, 'DD/MM/YYYY HH:mm', timezone);
      const end = dayjs.tz(`${dateFormatted} ${horarioFim}`, 'DD/MM/YYYY HH:mm', timezone);
      const now = dayjs().tz(timezone);
      
      // Janelas de tempo
      const entryOpenAt = start; // entrada abre no início
      const exitOpenAt = end.subtract(10, 'minute'); // saída abre 10 min antes do fim
      const exitCloseAt = end.add(10, 'minute'); // saída fecha 10 min após o fim
      
      // Verificar registros já existentes
      const registro = registrosPresenca.find(r => r.aula_id === aulaId);
      const hasEntrada = !!registro?.entrada_at;
      const hasSaida = !!registro?.saida_at;
      
      // Calcular flags
      const canEntry = now.isAfter(entryOpenAt) && now.isBefore(end) && !hasEntrada;
      const canExit = now.isAfter(exitOpenAt) && now.isBefore(exitCloseAt) && hasEntrada && !hasSaida;
      
      return { canEntry, canExit };
    } catch (error) {
      console.error('Erro ao calcular janelas de tempo:', error);
      return { canEntry: false, canExit: false };
    }
  }, [registrosPresenca]);

  const podeRegistrarEntradaPorTempo = useCallback((aulaData: string, horarioInicio: string, horarioFim: string) => {
    try {
      const timezone = 'America/Sao_Paulo';
      
      // Convert from YYYY-MM-DD or DD/MM/YYYY to DD/MM/YYYY format
      let dateFormatted = aulaData;
      if (aulaData.includes('-')) {
        // Convert from YYYY-MM-DD to DD/MM/YYYY
        dateFormatted = aulaData.split('-').reverse().join('/');
      }
      
      const start = dayjs.tz(`${dateFormatted} ${horarioInicio}`, 'DD/MM/YYYY HH:mm', timezone);
      const end = dayjs.tz(`${dateFormatted} ${horarioFim}`, 'DD/MM/YYYY HH:mm', timezone);
      const now = dayjs().tz(timezone);
      
      return now.isAfter(start) && now.isBefore(end);
    } catch (error) {
      return false;
    }
  }, []);

  const podeRegistrarSaidaPorTempo = useCallback((aulaData: string, horarioInicio: string, horarioFim: string) => {
    try {
      const timezone = 'America/Sao_Paulo';
      
      // Convert from YYYY-MM-DD or DD/MM/YYYY to DD/MM/YYYY format
      let dateFormatted = aulaData;
      if (aulaData.includes('-')) {
        // Convert from YYYY-MM-DD to DD/MM/YYYY
        dateFormatted = aulaData.split('-').reverse().join('/');
      }
      
      const end = dayjs.tz(`${dateFormatted} ${horarioFim}`, 'DD/MM/YYYY HH:mm', timezone);
      const exitOpenAt = end.subtract(10, 'minute');
      const exitCloseAt = end.add(10, 'minute');
      const now = dayjs().tz(timezone);
      
      return now.isAfter(exitOpenAt) && now.isBefore(exitCloseAt);
    } catch (error) {
      return false;
    }
  }, []);

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
    podeRegistrarSaida,
    podeRegistrarEntradaPorTempo,
    podeRegistrarSaidaPorTempo,
    calculateTimeWindows,
    openPresencaDialog
  };
};
