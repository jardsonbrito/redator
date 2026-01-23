import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Users, FileText, GraduationCap, Loader2, Search, CheckSquare, Square } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import { TURMAS_VALIDAS } from "@/utils/turmaUtils";

interface ExportarAlunosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Aluno {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string;
}

interface Corretor {
  id: string;
  nome: string;
}

interface RedacaoCompleta {
  tipo: 'Regular' | 'Simulado';
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  tema: string;
  data_envio: string;
  data_correcao: string | null;
  status: string;
  texto_redacao: string;
  image_url: string | null;
  redacao_manuscrita_url: string | null;
  render_image_url: string | null;
  // Notas finais
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  nota_total: number | null;
  // Corretor 1
  corretor_1_nome: string | null;
  c1_corretor_1: number | null;
  c2_corretor_1: number | null;
  c3_corretor_1: number | null;
  c4_corretor_1: number | null;
  c5_corretor_1: number | null;
  nota_final_corretor_1: number | null;
  comentario_c1_corretor_1: string | null;
  comentario_c2_corretor_1: string | null;
  comentario_c3_corretor_1: string | null;
  comentario_c4_corretor_1: string | null;
  comentario_c5_corretor_1: string | null;
  elogios_pontos_atencao_corretor_1: string | null;
  // Corretor 2
  corretor_2_nome: string | null;
  c1_corretor_2: number | null;
  c2_corretor_2: number | null;
  c3_corretor_2: number | null;
  c4_corretor_2: number | null;
  c5_corretor_2: number | null;
  nota_final_corretor_2: number | null;
  comentario_c1_corretor_2: string | null;
  comentario_c2_corretor_2: string | null;
  comentario_c3_corretor_2: string | null;
  comentario_c4_corretor_2: string | null;
  comentario_c5_corretor_2: string | null;
  elogios_pontos_atencao_corretor_2: string | null;
  // Outros
  comentario_pedagogico?: string | null;
}

export function ExportarAlunosModal({ isOpen, onClose }: ExportarAlunosModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("redacoes");

  // Lista de alunos
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [selectedAlunoIds, setSelectedAlunoIds] = useState<Set<string>>(new Set());
  const [searchAluno, setSearchAluno] = useState("");

  // Filtros para redações
  const [turmaFiltro, setTurmaFiltro] = useState<string>("todas");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [incluirRegulares, setIncluirRegulares] = useState(true);
  const [incluirSimulados, setIncluirSimulados] = useState(true);
  const [apenasCorrigidas, setApenasCorrigidas] = useState(false);

  const turmas = [...TURMAS_VALIDAS];

  // Carregar alunos quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadAlunos();
    }
  }, [isOpen]);

  const loadAlunos = async () => {
    setLoadingAlunos(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, email, turma')
        .eq('user_type', 'aluno')
        .order('nome', { ascending: true });

      if (error) throw error;
      setAlunos(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setLoadingAlunos(false);
    }
  };

  // Filtrar alunos por turma e busca
  const filteredAlunos = useMemo(() => {
    return alunos.filter(aluno => {
      const matchesTurma = turmaFiltro === "todas" || aluno.turma === turmaFiltro;
      const matchesSearch = !searchAluno ||
        `${aluno.nome} ${aluno.sobrenome}`.toLowerCase().includes(searchAluno.toLowerCase()) ||
        aluno.email.toLowerCase().includes(searchAluno.toLowerCase());
      return matchesTurma && matchesSearch;
    });
  }, [alunos, turmaFiltro, searchAluno]);

  // Selecionar/deselecionar aluno
  const toggleAlunoSelection = (id: string) => {
    setSelectedAlunoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Selecionar todos os alunos filtrados
  const selectAllFiltered = () => {
    const newSet = new Set(selectedAlunoIds);
    filteredAlunos.forEach(a => newSet.add(a.id));
    setSelectedAlunoIds(newSet);
  };

  // Deselecionar todos
  const deselectAll = () => {
    setSelectedAlunoIds(new Set());
  };

  // Obter emails dos alunos selecionados
  const getSelectedEmails = () => {
    return alunos
      .filter(a => selectedAlunoIds.has(a.id))
      .map(a => a.email.toLowerCase());
  };

  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year}_${hours}${minutes}${seconds}`;
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Nenhum dado encontrado",
        description: "Não há dados para exportar com os filtros selecionados.",
        variant: "destructive",
      });
      return false;
    }

    const headers = Object.keys(data[0]).join(';');
    const csvContent = [headers, ...data.map(row =>
      Object.values(row).map(value =>
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : (value ?? '')
      ).join(';')
    )].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${formatDate()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  };

  const exportarListaAlunos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'aluno')
        .order('nome', { ascending: true });

      if (error) throw error;

      const csvData = data.map(item => ({
        'Nome Completo': `${item.nome || ''} ${item.sobrenome || ''}`.trim(),
        'E-mail': item.email || '',
        'Turma': item.turma || '',
        'Status': item.ativo ? 'Ativo' : 'Inativo',
        'Data de Cadastro': item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''
      }));

      if (downloadCSV(csvData, 'alunos_lista')) {
        toast({
          title: "Exportação concluída",
          description: `${csvData.length} alunos exportados com sucesso!`,
        });
        onClose();
      }
    } catch (error) {
      console.error('Erro ao exportar alunos:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os alunos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função auxiliar para quebrar texto em linhas
  const splitTextIntoLines = (text: string, maxWidth: number, pdf: jsPDF): string[] => {
    if (!text) return [];
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        lines.push('');
        return;
      }
      const splitLines = pdf.splitTextToSize(paragraph, maxWidth);
      lines.push(...splitLines);
    });

    return lines;
  };

  // Função para adicionar nova página se necessário
  const checkAddPage = (pdf: jsPDF, yPos: number, neededSpace: number, pageHeight: number, margin: number): number => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      return margin + 10;
    }
    return yPos;
  };

  // Função para carregar imagem como base64
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      return null;
    }
  };

  // Função para obter dimensões da imagem
  const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = base64;
    });
  };

  const exportarRedacoesPDF = async () => {
    if (!incluirRegulares && !incluirSimulados) {
      toast({
        title: "Selecione ao menos um tipo",
        description: "Selecione redações regulares e/ou de simulado para exportar.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAlunoIds.size === 0) {
      toast({
        title: "Selecione ao menos um aluno",
        description: "Selecione os alunos cujas redações deseja exportar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedEmails = getSelectedEmails();
      const todasRedacoes: RedacaoCompleta[] = [];

      // Buscar todos os corretores para mapear IDs para nomes
      const { data: corretores } = await supabase
        .from('corretores')
        .select('id, nome');

      const corretorMap = new Map<string, string>();
      corretores?.forEach(c => corretorMap.set(c.id, c.nome));

      // Buscar redações regulares
      if (incluirRegulares) {
        let query = supabase
          .from('redacoes_enviadas')
          .select('*')
          .order('data_envio', { ascending: false });

        if (dataInicio) {
          query = query.gte('data_envio', dataInicio);
        }

        if (dataFim) {
          query = query.lte('data_envio', dataFim + 'T23:59:59');
        }

        if (apenasCorrigidas) {
          query = query.eq('corrigida', true);
        }

        const { data: regulares, error: errorRegulares } = await query;

        if (errorRegulares) throw errorRegulares;

        if (regulares) {
          regulares
            .filter(r => selectedEmails.includes(r.email_aluno?.toLowerCase() || ''))
            .forEach(r => {
              todasRedacoes.push({
                tipo: 'Regular',
                nome_aluno: r.nome_aluno || '',
                email_aluno: r.email_aluno || '',
                turma: r.turma || '',
                tema: r.frase_tematica || '',
                data_envio: r.data_envio ? new Date(r.data_envio).toLocaleDateString('pt-BR') : '',
                data_correcao: r.data_correcao ? new Date(r.data_correcao).toLocaleDateString('pt-BR') : null,
                status: r.status || '',
                texto_redacao: r.redacao_texto || '',
                image_url: r.image_url,
                redacao_manuscrita_url: r.redacao_manuscrita_url,
                render_image_url: r.render_image_url,
                nota_c1: r.nota_c1,
                nota_c2: r.nota_c2,
                nota_c3: r.nota_c3,
                nota_c4: r.nota_c4,
                nota_c5: r.nota_c5,
                nota_total: r.nota_total,
                corretor_1_nome: r.corretor_id_1 ? corretorMap.get(r.corretor_id_1) || 'Corretor 1' : null,
                c1_corretor_1: r.c1_corretor_1,
                c2_corretor_1: r.c2_corretor_1,
                c3_corretor_1: r.c3_corretor_1,
                c4_corretor_1: r.c4_corretor_1,
                c5_corretor_1: r.c5_corretor_1,
                nota_final_corretor_1: r.nota_final_corretor_1,
                comentario_c1_corretor_1: r.comentario_c1_corretor_1,
                comentario_c2_corretor_1: r.comentario_c2_corretor_1,
                comentario_c3_corretor_1: r.comentario_c3_corretor_1,
                comentario_c4_corretor_1: r.comentario_c4_corretor_1,
                comentario_c5_corretor_1: r.comentario_c5_corretor_1,
                elogios_pontos_atencao_corretor_1: r.elogios_pontos_atencao_corretor_1,
                corretor_2_nome: r.corretor_id_2 ? corretorMap.get(r.corretor_id_2) || 'Corretor 2' : null,
                c1_corretor_2: r.c1_corretor_2,
                c2_corretor_2: r.c2_corretor_2,
                c3_corretor_2: r.c3_corretor_2,
                c4_corretor_2: r.c4_corretor_2,
                c5_corretor_2: r.c5_corretor_2,
                nota_final_corretor_2: r.nota_final_corretor_2,
                comentario_c1_corretor_2: r.comentario_c1_corretor_2,
                comentario_c2_corretor_2: r.comentario_c2_corretor_2,
                comentario_c3_corretor_2: r.comentario_c3_corretor_2,
                comentario_c4_corretor_2: r.comentario_c4_corretor_2,
                comentario_c5_corretor_2: r.comentario_c5_corretor_2,
                elogios_pontos_atencao_corretor_2: r.elogios_pontos_atencao_corretor_2,
              });
            });
        }
      }

      // Buscar redações de simulado
      if (incluirSimulados) {
        let query = supabase
          .from('redacoes_simulado')
          .select(`
            *,
            simulados!inner(titulo, frase_tematica)
          `)
          .order('data_envio', { ascending: false });

        if (dataInicio) {
          query = query.gte('data_envio', dataInicio);
        }

        if (dataFim) {
          query = query.lte('data_envio', dataFim + 'T23:59:59');
        }

        if (apenasCorrigidas) {
          query = query.not('nota_total', 'is', null);
        }

        const { data: simulados, error: errorSimulados } = await query;

        if (errorSimulados) throw errorSimulados;

        if (simulados) {
          simulados
            .filter(s => selectedEmails.includes(s.email_aluno?.toLowerCase() || ''))
            .forEach(s => {
              todasRedacoes.push({
                tipo: 'Simulado',
                nome_aluno: s.nome_aluno || '',
                email_aluno: s.email_aluno || '',
                turma: s.turma || '',
                tema: s.simulados?.titulo || s.simulados?.frase_tematica || '',
                data_envio: s.data_envio ? new Date(s.data_envio).toLocaleDateString('pt-BR') : '',
                data_correcao: s.data_correcao ? new Date(s.data_correcao).toLocaleDateString('pt-BR') : null,
                status: s.nota_total ? 'Corrigida' : 'Pendente',
                texto_redacao: s.texto || '',
                image_url: s.image_url,
                redacao_manuscrita_url: s.redacao_manuscrita_url,
                render_image_url: s.render_image_url,
                nota_c1: s.nota_c1,
                nota_c2: s.nota_c2,
                nota_c3: s.nota_c3,
                nota_c4: s.nota_c4,
                nota_c5: s.nota_c5,
                nota_total: s.nota_total,
                corretor_1_nome: s.corretor_id_1 ? corretorMap.get(s.corretor_id_1) || 'Corretor 1' : null,
                c1_corretor_1: s.c1_corretor_1,
                c2_corretor_1: s.c2_corretor_1,
                c3_corretor_1: s.c3_corretor_1,
                c4_corretor_1: s.c4_corretor_1,
                c5_corretor_1: s.c5_corretor_1,
                nota_final_corretor_1: s.nota_final_corretor_1,
                comentario_c1_corretor_1: s.comentario_c1_corretor_1,
                comentario_c2_corretor_1: s.comentario_c2_corretor_1,
                comentario_c3_corretor_1: s.comentario_c3_corretor_1,
                comentario_c4_corretor_1: s.comentario_c4_corretor_1,
                comentario_c5_corretor_1: s.comentario_c5_corretor_1,
                elogios_pontos_atencao_corretor_1: s.elogios_pontos_atencao_corretor_1,
                corretor_2_nome: s.corretor_id_2 ? corretorMap.get(s.corretor_id_2) || 'Corretor 2' : null,
                c1_corretor_2: s.c1_corretor_2,
                c2_corretor_2: s.c2_corretor_2,
                c3_corretor_2: s.c3_corretor_2,
                c4_corretor_2: s.c4_corretor_2,
                c5_corretor_2: s.c5_corretor_2,
                nota_final_corretor_2: s.nota_final_corretor_2,
                comentario_c1_corretor_2: s.comentario_c1_corretor_2,
                comentario_c2_corretor_2: s.comentario_c2_corretor_2,
                comentario_c3_corretor_2: s.comentario_c3_corretor_2,
                comentario_c4_corretor_2: s.comentario_c4_corretor_2,
                comentario_c5_corretor_2: s.comentario_c5_corretor_2,
                elogios_pontos_atencao_corretor_2: s.elogios_pontos_atencao_corretor_2,
                comentario_pedagogico: s.comentario_pedagogico,
              });
            });
        }
      }

      if (todasRedacoes.length === 0) {
        toast({
          title: "Nenhuma redação encontrada",
          description: "Não há redações para exportar com os filtros selecionados.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Ordenar por nome do aluno e depois por data de envio
      todasRedacoes.sort((a, b) => {
        const nameCompare = a.nome_aluno.localeCompare(b.nome_aluno);
        if (nameCompare !== 0) return nameCompare;
        const dateA = a.data_envio ? new Date(a.data_envio.split('/').reverse().join('-')) : new Date(0);
        const dateB = b.data_envio ? new Date(b.data_envio.split('/').reverse().join('-')) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Gerar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Título do documento
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório de Redações', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Exportado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      pdf.text(`Total de redações: ${todasRedacoes.length}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Loop através de cada redação
      for (let i = 0; i < todasRedacoes.length; i++) {
        const redacao = todasRedacoes[i];

        // Verificar se precisa de nova página para o cabeçalho
        yPos = checkAddPage(pdf, yPos, 60, pageHeight, margin);

        // Separador entre redações
        if (i > 0) {
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
        }

        // Cabeçalho da redação
        pdf.setFillColor(240, 240, 250);
        pdf.rect(margin, yPos, contentWidth, 25, 'F');

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Redação ${i + 1} de ${todasRedacoes.length}`, margin + 3, yPos + 6);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Tipo: ${redacao.tipo}`, margin + 3, yPos + 12);
        pdf.text(`Status: ${redacao.status}`, margin + 60, yPos + 12);

        if (redacao.nota_total !== null) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 100, 0);
          pdf.text(`Nota Total: ${redacao.nota_total}`, pageWidth - margin - 30, yPos + 12);
        }

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Aluno: ${redacao.nome_aluno}`, margin + 3, yPos + 18);
        pdf.text(`E-mail: ${redacao.email_aluno}`, margin + 3, yPos + 23);
        pdf.text(`Turma: ${redacao.turma || '-'}`, pageWidth - margin - 25, yPos + 18);

        yPos += 30;

        // Datas
        pdf.setFontSize(9);
        pdf.text(`Data de Envio: ${redacao.data_envio}`, margin, yPos);
        if (redacao.data_correcao) {
          pdf.text(`Data de Correção: ${redacao.data_correcao}`, margin + 60, yPos);
        }
        yPos += 7;

        // Tema
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tema:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        const temaLines = splitTextIntoLines(redacao.tema, contentWidth - 15, pdf);
        yPos += 5;
        temaLines.forEach(line => {
          yPos = checkAddPage(pdf, yPos, 5, pageHeight, margin);
          pdf.text(line, margin + 2, yPos);
          yPos += 4;
        });
        yPos += 5;

        // Texto da redação ou indicação de manuscrita
        yPos = checkAddPage(pdf, yPos, 20, pageHeight, margin);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Texto da Redação:', margin, yPos);
        yPos += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        // Verificar se é redação manuscrita/foto
        const temImagem = redacao.image_url || redacao.redacao_manuscrita_url || redacao.render_image_url;
        const temTexto = redacao.texto_redacao && redacao.texto_redacao.trim().length > 0;

        if (temTexto) {
          const textoLines = splitTextIntoLines(redacao.texto_redacao, contentWidth - 4, pdf);
          textoLines.forEach(line => {
            yPos = checkAddPage(pdf, yPos, 5, pageHeight, margin);
            pdf.text(line, margin + 2, yPos);
            yPos += 4;
          });
        } else if (temImagem) {
          // Priorizar render_image_url (imagem com marcações do corretor)
          const imageUrl = redacao.render_image_url || redacao.redacao_manuscrita_url || redacao.image_url;

          pdf.setFont('helvetica', 'bold');
          pdf.text('[Redação Manuscrita/Foto]', margin + 2, yPos);
          yPos += 6;

          // Tentar carregar e incluir a imagem no PDF
          if (imageUrl) {
            try {
              const base64Image = await loadImageAsBase64(imageUrl);

              if (base64Image) {
                const dimensions = await getImageDimensions(base64Image);

                if (dimensions.width > 0 && dimensions.height > 0) {
                  // Calcular dimensões proporcionais para caber na página
                  const maxImgWidth = contentWidth - 10;
                  const maxImgHeight = 150; // Altura máxima da imagem em mm

                  let imgWidth = maxImgWidth;
                  let imgHeight = (dimensions.height / dimensions.width) * imgWidth;

                  // Se a altura exceder o máximo, ajustar proporcionalmente
                  if (imgHeight > maxImgHeight) {
                    imgHeight = maxImgHeight;
                    imgWidth = (dimensions.width / dimensions.height) * imgHeight;
                  }

                  // Verificar se precisa de nova página para a imagem
                  yPos = checkAddPage(pdf, yPos, imgHeight + 10, pageHeight, margin);

                  // Centralizar a imagem
                  const imgX = margin + (contentWidth - imgWidth) / 2;

                  // Adicionar borda ao redor da imagem
                  pdf.setDrawColor(200, 200, 200);
                  pdf.rect(imgX - 1, yPos - 1, imgWidth + 2, imgHeight + 2);

                  // Adicionar a imagem ao PDF
                  pdf.addImage(base64Image, 'PNG', imgX, yPos, imgWidth, imgHeight);
                  yPos += imgHeight + 5;

                  // Indicar que é a imagem com marcações se for render_image_url
                  if (redacao.render_image_url && imageUrl === redacao.render_image_url) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text('(Imagem com marcações do corretor)', margin + 2, yPos);
                    pdf.setTextColor(0, 0, 0);
                    yPos += 5;
                  }
                } else {
                  throw new Error('Dimensões inválidas');
                }
              } else {
                throw new Error('Falha ao carregar imagem');
              }
            } catch (imgError) {
              // Fallback: mostrar URL se não conseguir carregar a imagem
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
              pdf.text('(Não foi possível carregar a imagem. URL:', margin + 2, yPos);
              yPos += 4;

              const urlLines = splitTextIntoLines(imageUrl, contentWidth - 6, pdf);
              urlLines.forEach(line => {
                yPos = checkAddPage(pdf, yPos, 4, pageHeight, margin);
                pdf.setTextColor(0, 0, 150);
                pdf.text(line, margin + 4, yPos);
                yPos += 3.5;
              });
              pdf.setTextColor(0, 0, 0);
              pdf.text(')', margin + 2, yPos);
              yPos += 4;
            }
          }
        } else {
          pdf.text('Texto não disponível', margin + 2, yPos);
          yPos += 4;
        }
        yPos += 8;

        // Notas por competência (se existirem)
        if (redacao.nota_total !== null) {
          yPos = checkAddPage(pdf, yPos, 25, pageHeight, margin);

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Notas Finais:', margin, yPos);
          yPos += 6;

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');

          // Tabela de notas
          const notasText = [
            `C1: ${redacao.nota_c1 ?? '-'}`,
            `C2: ${redacao.nota_c2 ?? '-'}`,
            `C3: ${redacao.nota_c3 ?? '-'}`,
            `C4: ${redacao.nota_c4 ?? '-'}`,
            `C5: ${redacao.nota_c5 ?? '-'}`,
          ];

          notasText.forEach((nota, idx) => {
            const xOffset = margin + (idx % 3) * 60;
            if (idx % 3 === 0 && idx > 0) yPos += 5;
            pdf.text(nota, xOffset, yPos);
          });
          yPos += 10;

          // Corretor 1
          if (redacao.corretor_1_nome) {
            yPos = checkAddPage(pdf, yPos, 40, pageHeight, margin);

            pdf.setFillColor(245, 245, 255);
            pdf.rect(margin, yPos - 3, contentWidth, 8, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text(`Corretor 1: ${redacao.corretor_1_nome}`, margin + 2, yPos + 2);
            if (redacao.nota_final_corretor_1 !== null) {
              pdf.text(`Nota: ${redacao.nota_final_corretor_1}`, pageWidth - margin - 25, yPos + 2);
            }
            yPos += 10;

            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');

            // Notas do corretor 1
            const notasC1 = `C1: ${redacao.c1_corretor_1 ?? '-'} | C2: ${redacao.c2_corretor_1 ?? '-'} | C3: ${redacao.c3_corretor_1 ?? '-'} | C4: ${redacao.c4_corretor_1 ?? '-'} | C5: ${redacao.c5_corretor_1 ?? '-'}`;
            pdf.text(notasC1, margin + 2, yPos);
            yPos += 5;

            // Comentários do corretor 1
            const comentariosC1 = [
              redacao.comentario_c1_corretor_1 ? `C1: ${redacao.comentario_c1_corretor_1}` : null,
              redacao.comentario_c2_corretor_1 ? `C2: ${redacao.comentario_c2_corretor_1}` : null,
              redacao.comentario_c3_corretor_1 ? `C3: ${redacao.comentario_c3_corretor_1}` : null,
              redacao.comentario_c4_corretor_1 ? `C4: ${redacao.comentario_c4_corretor_1}` : null,
              redacao.comentario_c5_corretor_1 ? `C5: ${redacao.comentario_c5_corretor_1}` : null,
            ].filter(Boolean);

            if (comentariosC1.length > 0) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('Comentários por competência:', margin + 2, yPos);
              yPos += 4;
              pdf.setFont('helvetica', 'normal');

              comentariosC1.forEach(comentario => {
                const lines = splitTextIntoLines(comentario!, contentWidth - 6, pdf);
                lines.forEach(line => {
                  yPos = checkAddPage(pdf, yPos, 4, pageHeight, margin);
                  pdf.text(line, margin + 4, yPos);
                  yPos += 3.5;
                });
              });
              yPos += 2;
            }

            // Elogios e pontos de atenção
            if (redacao.elogios_pontos_atencao_corretor_1) {
              yPos = checkAddPage(pdf, yPos, 10, pageHeight, margin);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Elogios e Pontos de Atenção:', margin + 2, yPos);
              yPos += 4;
              pdf.setFont('helvetica', 'normal');

              const elogiosLines = splitTextIntoLines(redacao.elogios_pontos_atencao_corretor_1, contentWidth - 6, pdf);
              elogiosLines.forEach(line => {
                yPos = checkAddPage(pdf, yPos, 4, pageHeight, margin);
                pdf.text(line, margin + 4, yPos);
                yPos += 3.5;
              });
            }
            yPos += 5;
          }

          // Corretor 2
          if (redacao.corretor_2_nome) {
            yPos = checkAddPage(pdf, yPos, 40, pageHeight, margin);

            pdf.setFillColor(255, 245, 245);
            pdf.rect(margin, yPos - 3, contentWidth, 8, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text(`Corretor 2: ${redacao.corretor_2_nome}`, margin + 2, yPos + 2);
            if (redacao.nota_final_corretor_2 !== null) {
              pdf.text(`Nota: ${redacao.nota_final_corretor_2}`, pageWidth - margin - 25, yPos + 2);
            }
            yPos += 10;

            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');

            // Notas do corretor 2
            const notasC2 = `C1: ${redacao.c1_corretor_2 ?? '-'} | C2: ${redacao.c2_corretor_2 ?? '-'} | C3: ${redacao.c3_corretor_2 ?? '-'} | C4: ${redacao.c4_corretor_2 ?? '-'} | C5: ${redacao.c5_corretor_2 ?? '-'}`;
            pdf.text(notasC2, margin + 2, yPos);
            yPos += 5;

            // Comentários do corretor 2
            const comentariosC2 = [
              redacao.comentario_c1_corretor_2 ? `C1: ${redacao.comentario_c1_corretor_2}` : null,
              redacao.comentario_c2_corretor_2 ? `C2: ${redacao.comentario_c2_corretor_2}` : null,
              redacao.comentario_c3_corretor_2 ? `C3: ${redacao.comentario_c3_corretor_2}` : null,
              redacao.comentario_c4_corretor_2 ? `C4: ${redacao.comentario_c4_corretor_2}` : null,
              redacao.comentario_c5_corretor_2 ? `C5: ${redacao.comentario_c5_corretor_2}` : null,
            ].filter(Boolean);

            if (comentariosC2.length > 0) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('Comentários por competência:', margin + 2, yPos);
              yPos += 4;
              pdf.setFont('helvetica', 'normal');

              comentariosC2.forEach(comentario => {
                const lines = splitTextIntoLines(comentario!, contentWidth - 6, pdf);
                lines.forEach(line => {
                  yPos = checkAddPage(pdf, yPos, 4, pageHeight, margin);
                  pdf.text(line, margin + 4, yPos);
                  yPos += 3.5;
                });
              });
              yPos += 2;
            }

            // Elogios e pontos de atenção
            if (redacao.elogios_pontos_atencao_corretor_2) {
              yPos = checkAddPage(pdf, yPos, 10, pageHeight, margin);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Elogios e Pontos de Atenção:', margin + 2, yPos);
              yPos += 4;
              pdf.setFont('helvetica', 'normal');

              const elogiosLines = splitTextIntoLines(redacao.elogios_pontos_atencao_corretor_2, contentWidth - 6, pdf);
              elogiosLines.forEach(line => {
                yPos = checkAddPage(pdf, yPos, 4, pageHeight, margin);
                pdf.text(line, margin + 4, yPos);
                yPos += 3.5;
              });
            }
            yPos += 5;
          }

          // Comentário pedagógico (simulados)
          if (redacao.comentario_pedagogico) {
            yPos = checkAddPage(pdf, yPos, 15, pageHeight, margin);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.text('Comentário Pedagógico:', margin, yPos);
            yPos += 4;
            pdf.setFont('helvetica', 'normal');

            const pedLines = splitTextIntoLines(redacao.comentario_pedagogico, contentWidth - 4, pdf);
            pedLines.forEach(line => {
              yPos = checkAddPage(pdf, yPos, 4, pageHeight, margin);
              pdf.text(line, margin + 2, yPos);
              yPos += 3.5;
            });
            yPos += 3;
          }

        }

        yPos += 15;
      }

      // Salvar PDF
      pdf.save(`redacoes_completas_${formatDate()}.pdf`);

      toast({
        title: "PDF gerado com sucesso!",
        description: `${todasRedacoes.length} redações exportadas de ${selectedAlunoIds.size} aluno(s).`,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao exportar redações:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as redações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportarRelatorioPorAluno = async () => {
    if (selectedAlunoIds.size === 0) {
      toast({
        title: "Selecione ao menos um aluno",
        description: "Selecione os alunos para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Usar apenas os alunos selecionados
      const alunosSelecionados = alunos.filter(a => selectedAlunoIds.has(a.id));

      // Buscar todas as redações regulares
      const { data: regulares } = await supabase
        .from('redacoes_enviadas')
        .select('email_aluno, nota_total, corrigida')
        .eq('corrigida', true);

      // Buscar todas as redações de simulado
      const { data: simulados } = await supabase
        .from('redacoes_simulado')
        .select('email_aluno, nota_total')
        .not('nota_total', 'is', null);

      // Criar mapa de estatísticas por email
      const estatisticas = new Map<string, {
        totalRegulares: number;
        totalSimulados: number;
        somaNotasRegulares: number;
        somaNotasSimulados: number;
        maiorNotaRegular: number;
        maiorNotaSimulado: number;
      }>();

      // Processar redações regulares
      regulares?.forEach(r => {
        const email = r.email_aluno?.toLowerCase();
        if (!email) return;

        if (!estatisticas.has(email)) {
          estatisticas.set(email, {
            totalRegulares: 0,
            totalSimulados: 0,
            somaNotasRegulares: 0,
            somaNotasSimulados: 0,
            maiorNotaRegular: 0,
            maiorNotaSimulado: 0
          });
        }

        const stats = estatisticas.get(email)!;
        stats.totalRegulares++;
        if (r.nota_total) {
          stats.somaNotasRegulares += r.nota_total;
          stats.maiorNotaRegular = Math.max(stats.maiorNotaRegular, r.nota_total);
        }
      });

      // Processar redações de simulado
      simulados?.forEach(s => {
        const email = s.email_aluno?.toLowerCase();
        if (!email) return;

        if (!estatisticas.has(email)) {
          estatisticas.set(email, {
            totalRegulares: 0,
            totalSimulados: 0,
            somaNotasRegulares: 0,
            somaNotasSimulados: 0,
            maiorNotaRegular: 0,
            maiorNotaSimulado: 0
          });
        }

        const stats = estatisticas.get(email)!;
        stats.totalSimulados++;
        if (s.nota_total) {
          stats.somaNotasSimulados += s.nota_total;
          stats.maiorNotaSimulado = Math.max(stats.maiorNotaSimulado, s.nota_total);
        }
      });

      // Gerar relatório
      const relatorio = alunosSelecionados?.map(aluno => {
        const email = aluno.email?.toLowerCase();
        const stats = estatisticas.get(email) || {
          totalRegulares: 0,
          totalSimulados: 0,
          somaNotasRegulares: 0,
          somaNotasSimulados: 0,
          maiorNotaRegular: 0,
          maiorNotaSimulado: 0
        };

        const mediaRegulares = stats.totalRegulares > 0
          ? Math.round(stats.somaNotasRegulares / stats.totalRegulares)
          : 0;
        const mediaSimulados = stats.totalSimulados > 0
          ? Math.round(stats.somaNotasSimulados / stats.totalSimulados)
          : 0;
        const totalRedacoes = stats.totalRegulares + stats.totalSimulados;
        const mediaGeral = totalRedacoes > 0
          ? Math.round((stats.somaNotasRegulares + stats.somaNotasSimulados) / totalRedacoes)
          : 0;

        return {
          'Nome Completo': `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim(),
          'E-mail': aluno.email || '',
          'Turma': aluno.turma || '',
          'Total Redações': totalRedacoes,
          'Redações Regulares': stats.totalRegulares,
          'Redações Simulado': stats.totalSimulados,
          'Média Regulares': mediaRegulares || '',
          'Média Simulados': mediaSimulados || '',
          'Média Geral': mediaGeral || '',
          'Maior Nota Regular': stats.maiorNotaRegular || '',
          'Maior Nota Simulado': stats.maiorNotaSimulado || '',
        };
      }) || [];

      if (downloadCSV(relatorio, 'relatorio_alunos_resumo')) {
        toast({
          title: "Exportação concluída",
          description: `Relatório de ${relatorio.length} alunos exportado com sucesso!`,
        });
        onClose();
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Exportar Dados de Alunos
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo de exportação desejado
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lista" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Lista de Alunos
            </TabsTrigger>
            <TabsTrigger value="redacoes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Redações (PDF)
            </TabsTrigger>
            <TabsTrigger value="resumo" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Resumo por Aluno
            </TabsTrigger>
          </TabsList>

          {/* Lista de Alunos */}
          <TabsContent value="lista" className="space-y-4 mt-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">O que será exportado:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Nome completo do aluno</li>
                <li>E-mail</li>
                <li>Turma</li>
                <li>Status (ativo/inativo)</li>
                <li>Data de cadastro</li>
              </ul>
            </div>

            <Button
              onClick={exportarListaAlunos}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar Lista de Alunos (CSV)
            </Button>
          </TabsContent>

          {/* Redações com Notas */}
          <TabsContent value="redacoes" className="space-y-4 mt-4">
            {/* Seleção de Alunos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selecionar Alunos ({selectedAlunoIds.size} selecionado{selectedAlunoIds.size !== 1 ? 's' : ''})</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    <Square className="w-3 h-3 mr-1" />
                    Nenhum
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno por nome ou e-mail..."
                    value={searchAluno}
                    onChange={(e) => setSearchAluno(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {turmas.map(t => (
                      <SelectItem key={t} value={t}>Turma {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[180px] border rounded-md p-2">
                {loadingAlunos ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAlunos.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Nenhum aluno encontrado
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredAlunos.map(aluno => (
                      <div
                        key={aluno.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                          selectedAlunoIds.has(aluno.id) ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => toggleAlunoSelection(aluno.id)}
                      >
                        <Checkbox
                          checked={selectedAlunoIds.has(aluno.id)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleAlunoSelection(aluno.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {aluno.nome} {aluno.sobrenome}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {aluno.email}
                          </div>
                        </div>
                        <div className="text-xs px-2 py-0.5 bg-muted rounded">
                          {aluno.turma || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Filtros adicionais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    placeholder="Início"
                  />
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    placeholder="Fim"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Redação</Label>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="regulares"
                      checked={incluirRegulares}
                      onCheckedChange={(checked) => setIncluirRegulares(checked as boolean)}
                    />
                    <label htmlFor="regulares" className="text-sm cursor-pointer">
                      Regulares
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="simulados"
                      checked={incluirSimulados}
                      onCheckedChange={(checked) => setIncluirSimulados(checked as boolean)}
                    />
                    <label htmlFor="simulados" className="text-sm cursor-pointer">
                      Simulados
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="corrigidas"
                      checked={apenasCorrigidas}
                      onCheckedChange={(checked) => setApenasCorrigidas(checked as boolean)}
                    />
                    <label htmlFor="corrigidas" className="text-sm cursor-pointer">
                      Apenas corrigidas
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">O PDF incluirá:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Dados do aluno (nome, e-mail, turma)</li>
                <li>Tema e texto completo da redação</li>
                <li>Datas de envio e correção</li>
                <li>Notas por competência (C1 a C5) e nota total</li>
                <li>Corretor 1 e 2 (notas e comentários por competência)</li>
                <li>Elogios e pontos de atenção de cada corretor</li>
                <li>Comentário pedagógico (quando houver)</li>
              </ul>
            </div>

            <Button
              onClick={exportarRedacoesPDF}
              disabled={isLoading || (!incluirRegulares && !incluirSimulados) || selectedAlunoIds.size === 0}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {selectedAlunoIds.size === 0
                ? 'Selecione alunos para exportar'
                : `Exportar PDF Completo (${selectedAlunoIds.size} aluno${selectedAlunoIds.size !== 1 ? 's' : ''})`
              }
            </Button>
          </TabsContent>

          {/* Resumo por Aluno */}
          <TabsContent value="resumo" className="space-y-4 mt-4">
            {/* Seleção de Alunos (mesmo componente) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selecionar Alunos ({selectedAlunoIds.size} selecionado{selectedAlunoIds.size !== 1 ? 's' : ''})</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    <Square className="w-3 h-3 mr-1" />
                    Nenhum
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno..."
                    value={searchAluno}
                    onChange={(e) => setSearchAluno(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {turmas.map(t => (
                      <SelectItem key={t} value={t}>Turma {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[180px] border rounded-md p-2">
                {loadingAlunos ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAlunos.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Nenhum aluno encontrado
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredAlunos.map(aluno => (
                      <div
                        key={aluno.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                          selectedAlunoIds.has(aluno.id) ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => toggleAlunoSelection(aluno.id)}
                      >
                        <Checkbox
                          checked={selectedAlunoIds.has(aluno.id)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleAlunoSelection(aluno.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {aluno.nome} {aluno.sobrenome}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {aluno.email}
                          </div>
                        </div>
                        <div className="text-xs px-2 py-0.5 bg-muted rounded">
                          {aluno.turma || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">O que será exportado:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Nome, e-mail e turma de cada aluno selecionado</li>
                <li>Total de redações enviadas</li>
                <li>Quantidade de regulares e simulados</li>
                <li>Média das notas (regulares, simulados, geral)</li>
                <li>Maior nota obtida em cada tipo</li>
              </ul>
            </div>

            <Button
              onClick={exportarRelatorioPorAluno}
              disabled={isLoading || selectedAlunoIds.size === 0}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {selectedAlunoIds.size === 0
                ? 'Selecione alunos para exportar'
                : `Exportar Resumo CSV (${selectedAlunoIds.size} aluno${selectedAlunoIds.size !== 1 ? 's' : ''})`
              }
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
