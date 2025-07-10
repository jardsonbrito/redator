import jsPDF from 'jspdf';

interface RedacaoData {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  frase_tematica: string;
  redacao_texto: string;
  data_envio: string;
  nota_total?: number;
  nota_c1?: number;
  nota_c2?: number;
  nota_c3?: number;
  nota_c4?: number;
  nota_c5?: number;
  comentario_admin?: string;
  comentario_c1_corretor_1?: string;
  comentario_c2_corretor_1?: string;
  comentario_c3_corretor_1?: string;
  comentario_c4_corretor_1?: string;
  comentario_c5_corretor_1?: string;
  elogios_pontos_atencao_corretor_1?: string;
  comentario_c1_corretor_2?: string;
  comentario_c2_corretor_2?: string;
  comentario_c3_corretor_2?: string;
  comentario_c4_corretor_2?: string;
  comentario_c5_corretor_2?: string;
  elogios_pontos_atencao_corretor_2?: string;
  data_correcao?: string;
  turma?: string;
  tipo_envio?: string;
}

export const downloadRedacaoCorrigida = (redacao: RedacaoData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const lineHeight = 7;
  let currentY = margin;

  // Função para adicionar texto com quebra de linha
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const splitText = doc.splitTextToSize(text, maxWidth);
    doc.text(splitText, x, y);
    return y + (splitText.length * lineHeight);
  };

  // Função para verificar se precisa de nova página
  const checkNewPage = (requiredSpace: number) => {
    if (currentY + requiredSpace > doc.internal.pageSize.height - margin) {
      doc.addPage();
      currentY = margin;
    }
  };

  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LABORATÓRIO DO REDATOR', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  doc.setFontSize(14);
  doc.text('Correção de Redação', pageWidth / 2, currentY, { align: 'center' });
  currentY += 20;

  // Informações do aluno
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ALUNO', margin, currentY);
  currentY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  currentY = addWrappedText(`Nome: ${redacao.nome_aluno}`, margin, currentY, pageWidth - 2 * margin);
  currentY = addWrappedText(`E-mail: ${redacao.email_aluno}`, margin, currentY, pageWidth - 2 * margin);
  if (redacao.turma) {
    currentY = addWrappedText(`Turma: ${redacao.turma}`, margin, currentY, pageWidth - 2 * margin);
  }
  currentY += 10;

  // Informações da redação
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DA REDAÇÃO', margin, currentY);
  currentY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  currentY = addWrappedText(`Tema: ${redacao.frase_tematica}`, margin, currentY, pageWidth - 2 * margin);
  currentY = addWrappedText(`Data de Envio: ${new Date(redacao.data_envio).toLocaleDateString('pt-BR')}`, margin, currentY, pageWidth - 2 * margin);
  if (redacao.data_correcao) {
    currentY = addWrappedText(`Data de Correção: ${new Date(redacao.data_correcao).toLocaleDateString('pt-BR')}`, margin, currentY, pageWidth - 2 * margin);
  }
  if (redacao.tipo_envio) {
    currentY = addWrappedText(`Tipo: ${redacao.tipo_envio}`, margin, currentY, pageWidth - 2 * margin);
  }
  currentY += 10;

  // Texto da redação
  checkNewPage(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TEXTO DA REDAÇÃO', margin, currentY);
  currentY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  currentY = addWrappedText(redacao.redacao_texto, margin, currentY, pageWidth - 2 * margin);
  currentY += 15;

  // Notas (se existirem)
  if (redacao.nota_total !== null && redacao.nota_total !== undefined) {
    checkNewPage(50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AVALIAÇÃO', margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    currentY = addWrappedText(`Nota Total: ${redacao.nota_total}/1000`, margin, currentY, pageWidth - 2 * margin);
    
    if (redacao.nota_c1 !== null) currentY = addWrappedText(`Competência 1: ${redacao.nota_c1}/200`, margin, currentY, pageWidth - 2 * margin);
    if (redacao.nota_c2 !== null) currentY = addWrappedText(`Competência 2: ${redacao.nota_c2}/200`, margin, currentY, pageWidth - 2 * margin);
    if (redacao.nota_c3 !== null) currentY = addWrappedText(`Competência 3: ${redacao.nota_c3}/200`, margin, currentY, pageWidth - 2 * margin);
    if (redacao.nota_c4 !== null) currentY = addWrappedText(`Competência 4: ${redacao.nota_c4}/200`, margin, currentY, pageWidth - 2 * margin);
    if (redacao.nota_c5 !== null) currentY = addWrappedText(`Competência 5: ${redacao.nota_c5}/200`, margin, currentY, pageWidth - 2 * margin);
    currentY += 10;
  }

  // Comentários dos corretores
  const adicionarComentarios = (titulo: string, comentarios: any) => {
    let temComentarios = false;
    
    // Verificar se há comentários
    for (const [key, value] of Object.entries(comentarios)) {
      if (value && typeof value === 'string' && value.trim()) {
        temComentarios = true;
        break;
      }
    }
    
    if (!temComentarios) return;
    
    checkNewPage(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    for (const [key, value] of Object.entries(comentarios)) {
      if (value && typeof value === 'string' && value.trim()) {
        const label = key.replace('comentario_', 'Competência ').replace('_corretor_1', '').replace('_corretor_2', '').replace('elogios_pontos_atencao', 'Elogios e Pontos de Atenção');
        currentY = addWrappedText(`${label}: ${value}`, margin, currentY, pageWidth - 2 * margin);
        currentY += 5;
      }
    }
    currentY += 10;
  };

  // Comentários do Corretor 1
  if (redacao.comentario_c1_corretor_1 || redacao.comentario_c2_corretor_1 || redacao.comentario_c3_corretor_1 || 
      redacao.comentario_c4_corretor_1 || redacao.comentario_c5_corretor_1 || redacao.elogios_pontos_atencao_corretor_1) {
    adicionarComentarios('COMENTÁRIOS - CORRETOR 1', {
      'comentario_c1': redacao.comentario_c1_corretor_1,
      'comentario_c2': redacao.comentario_c2_corretor_1,
      'comentario_c3': redacao.comentario_c3_corretor_1,
      'comentario_c4': redacao.comentario_c4_corretor_1,
      'comentario_c5': redacao.comentario_c5_corretor_1,
      'elogios_pontos_atencao': redacao.elogios_pontos_atencao_corretor_1
    });
  }

  // Comentários do Corretor 2
  if (redacao.comentario_c1_corretor_2 || redacao.comentario_c2_corretor_2 || redacao.comentario_c3_corretor_2 || 
      redacao.comentario_c4_corretor_2 || redacao.comentario_c5_corretor_2 || redacao.elogios_pontos_atencao_corretor_2) {
    adicionarComentarios('COMENTÁRIOS - CORRETOR 2', {
      'comentario_c1': redacao.comentario_c1_corretor_2,
      'comentario_c2': redacao.comentario_c2_corretor_2,
      'comentario_c3': redacao.comentario_c3_corretor_2,
      'comentario_c4': redacao.comentario_c4_corretor_2,
      'comentario_c5': redacao.comentario_c5_corretor_2,
      'elogios_pontos_atencao': redacao.elogios_pontos_atencao_corretor_2
    });
  }

  // Comentário administrativo
  if (redacao.comentario_admin) {
    checkNewPage(20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES ADMINISTRATIVAS', margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    currentY = addWrappedText(redacao.comentario_admin, margin, currentY, pageWidth - 2 * margin);
  }

  // Rodapé
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Laboratório do Redator - Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // Nome do arquivo
  const nomeArquivo = `Redacao_${redacao.nome_aluno.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(redacao.data_envio).toISOString().slice(0, 10)}.pdf`;
  
  // Download
  doc.save(nomeArquivo);
};