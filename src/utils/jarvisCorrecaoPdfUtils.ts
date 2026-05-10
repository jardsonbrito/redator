// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface JarvisCorrecaoPdfData {
  id: string;
  autor_nome: string;
  tema: string;
  corrigida_em: string | null;
  transcricao_confirmada: string | null;
  transcricao_ocr_original: string | null;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  correcao_ia: any;
  numero_versao?: number;
  tipo_correcao?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str?: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatarNota(nota?: number | null, max = 200): string {
  return nota != null ? `${nota}/${max}` : '—';
}

function notaCor(nota: number | null | undefined, max = 200): string {
  if (nota == null) return '#64748b';
  const pct = nota / max;
  if (pct >= 0.8) return '#15803d';
  if (pct >= 0.5) return '#b45309';
  return '#dc2626';
}

function notaBg(nota: number | null | undefined, max = 200): string {
  if (nota == null) return '#f8fafc';
  const pct = nota / max;
  if (pct >= 0.8) return '#f0fdf4';
  if (pct >= 0.5) return '#fffbeb';
  return '#fef2f2';
}

function formatarTipoErro(tipo: string): string {
  const labels: Record<string, string> = {
    ortografia: 'Ortografia', acentuacao: 'Acentuação', pontuacao: 'Pontuação',
    concordancia: 'Concordância', regencia: 'Regência', crase: 'Crase',
    pronome: 'Pronome', verbal: 'Verbal', sintatico: 'Sintático', vocabulario: 'Vocabulário',
    conectivo_inadequado: 'Conectivo inadequado', ausencia_de_conectivo: 'Ausência de conectivo',
    ausencia_de_elo: 'Ausência de elo interparagrafal', repeticao: 'Repetição de conectivos',
    ambiguidade_referencial: 'Ambiguidade referencial', retomada_incorreta: 'Retomada incorreta',
    articulacao_fragil: 'Articulação frágil',
  };
  if (!tipo) return tipo;
  const sep = tipo.indexOf(' — ');
  if (sep === -1) return labels[tipo] ?? tipo;
  const prefix = tipo.slice(0, sep);
  const rawSuffix = tipo.slice(sep + 3);
  return `${prefix} — ${labels[rawSuffix] ?? rawSuffix}`;
}

function paragrafos(texto?: string | null): string[] {
  return (texto || '').split(/\n+/).map(p => p.trim()).filter(Boolean);
}

// ─── Renderização de seções HTML ──────────────────────────────────────────────

function renderTextoOriginal(texto: string | null | undefined): string {
  if (!texto) return '';
  const paras = paragrafos(texto);
  if (!paras.length) return '';
  return `
  <section class="section-box">
    <h2 class="section-title">Texto Original</h2>
    ${paras.map(p => `<p class="essay-paragraph">${esc(p)}</p>`).join('')}
  </section>`;
}

function renderNotasGrid(c: JarvisCorrecaoPdfData): string {
  const notas = [
    { label: 'Nota Final', valor: c.nota_total, max: 1000, destaque: true },
    { label: 'C1', valor: c.nota_c1, max: 200, destaque: false },
    { label: 'C2', valor: c.nota_c2, max: 200, destaque: false },
    { label: 'C3', valor: c.nota_c3, max: 200, destaque: false },
    { label: 'C4', valor: c.nota_c4, max: 200, destaque: false },
    { label: 'C5', valor: c.nota_c5, max: 200, destaque: false },
  ];

  const cards = notas.map(n => {
    if (n.destaque) {
      return `<div class="nota-card nota-total-card">
        <span class="nota-label-text">${esc(n.label)}</span>
        <span class="nota-valor-total">${n.valor ?? '—'}</span>
        <span class="nota-max">/1000</span>
      </div>`;
    }
    const bg = notaBg(n.valor, n.max);
    const cor = notaCor(n.valor, n.max);
    return `<div class="nota-card" style="background:${bg}; border-color: ${cor}33;">
      <span class="nota-label-text">${esc(n.label)}</span>
      <span class="nota-valor" style="color:${cor}">${n.valor ?? '—'}</span>
      <span class="nota-max">/200</span>
    </div>`;
  }).join('');

  return `
  <section class="section-box">
    <h2 class="section-title">Notas</h2>
    <div class="notas-grid">${cards}</div>
  </section>`;
}

function renderCompetencia(key: string, num: string, ia: any, erros: any[], estrutura: any, usaClassPorComp: boolean): string {
  const comp = ia?.competencias?.[key];
  if (!comp) return '';

  const getErros = () => {
    if (usaClassPorComp) return erros.filter((e: any) => e.competencia_relacionada === key);
    const map: Record<string, string[]> = { c1: ['c1'], c2: ['c2'], c3: ['c3'], c4: ['c4', 'coesão', 'coerência'], c5: ['c5'] };
    return erros.filter((e: any) => (map[key] ?? [key]).some(k => (e.tipo ?? '').includes(k)));
  };

  const errosDaComp = key === 'c1' || key === 'c4' ? getErros() : [];
  const nota = comp.nota ?? 0;
  const cor = notaCor(nota);

  let content = `
  <div class="comp-header">
    <div class="comp-badge">Competência ${num}</div>
    <div class="comp-nota" style="color:${cor}">${nota} <span class="comp-nota-max">/200</span></div>
  </div>`;

  if (comp.justificativa) {
    content += `<div class="comp-block">
      <p class="block-label">Comentário</p>
      ${paragrafos(comp.justificativa).map(p => `<p class="block-text">${esc(p)}</p>`).join('')}
    </div>`;
  }

  if (key === 'c2' && estrutura) {
    if (estrutura.estrutura_dissertativo_argumentativa) {
      const s = estrutura.estrutura_dissertativo_argumentativa;
      content += `<div class="comp-block">
        <p class="block-label">Estrutura dissertativo-argumentativa (${esc(s.status)})</p>
        <p class="block-text">${esc(s.descricao)}</p>
      </div>`;
    }
    if (estrutura.tese_identificada) {
      content += `<div class="comp-block">
        <p class="block-label">Tese identificada</p>
        <p class="block-text-italic">"${esc(estrutura.tese_identificada)}"</p>
      </div>`;
    }
    if (estrutura.uso_repertorio) {
      content += `<div class="comp-block">
        <p class="block-label">Uso de Repertório</p>
        <p class="block-text">${esc(estrutura.uso_repertorio)}</p>
      </div>`;
    }
  }

  if (key === 'c3' && estrutura?.argumentos?.length > 0) {
    content += `<div class="comp-block">
      <p class="block-label">Argumentos identificados</p>
      <ul class="bullet-list">
        ${estrutura.argumentos.map((a: string) => `<li>${esc(a)}</li>`).join('')}
      </ul>
    </div>`;
  }

  if (key === 'c5' && estrutura?.proposta_intervencao) {
    content += `<div class="comp-block">
      <p class="block-label">Elementos da Proposta de Intervenção</p>
      <p class="block-text">${esc(estrutura.proposta_intervencao)}</p>
    </div>`;
  }

  if (errosDaComp.length > 0) {
    content += `<div class="comp-block">
      <p class="block-label">Erros identificados (${errosDaComp.length})</p>
      <div class="erros-list">
        ${errosDaComp.map((e: any) => `
        <div class="erro-item">
          <div class="erro-tipo">${esc(formatarTipoErro(e.tipo) || 'Erro')}${e.paragrafo ? ` <span class="erro-para">${esc(e.paragrafo)}</span>` : ''}</div>
          ${e.trecho_original ? `<p class="erro-trecho">"${esc(e.trecho_original)}"</p>` : ''}
          ${e.descricao ? `<p class="erro-desc">${esc(e.descricao)}</p>` : ''}
          ${e.sugestao ? `<p class="erro-sug">✓ ${esc(e.sugestao)}</p>` : ''}
        </div>`).join('')}
      </div>
    </div>`;
  }

  if (comp.sugestoes?.length > 0) {
    content += `<div class="comp-block">
      <p class="block-label">Orientações para melhoria</p>
      <ul class="check-list">
        ${comp.sugestoes.map((s: string) => `<li>${esc(s)}</li>`).join('')}
      </ul>
    </div>`;
  }

  return `<section class="comp-section">${content}</section>`;
}

function renderAnaliseGlobal(ia: any): string {
  const COMP_LABELS: Record<string, string> = {
    geral: 'Orientações Gerais', c1: 'Competência 1', c2: 'Competência 2',
    c3: 'Competência 3', c4: 'Competência 4', c5: 'Competência 5',
  };
  const ORDEM = ['geral', 'c1', 'c2', 'c3', 'c4', 'c5'];

  let content = '';

  if (ia.orientacoes_selecionadas) {
    const grupos = ORDEM.filter(k => (ia.orientacoes_selecionadas[k] ?? []).length > 0)
      .map(k => ({ label: COMP_LABELS[k], items: ia.orientacoes_selecionadas[k] as string[] }));

    if (grupos.length > 0) {
      content += `<div class="comp-block">
        <p class="block-label">Orientações pedagógicas</p>
        ${grupos.map(g => `
          <p class="orientacao-grupo-label">${esc(g.label)}</p>
          <ul class="check-list">${g.items.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        `).join('')}
      </div>`;
    }
  } else if (ia.sugestoes_objetivas?.length > 0) {
    content += `<div class="comp-block">
      <p class="block-label">Orientações gerais de melhoria</p>
      <ul class="check-list">${ia.sugestoes_objetivas.map((s: string) => `<li>${esc(s)}</li>`).join('')}</ul>
    </div>`;
  }

  if (ia.resumo_geral) {
    content += `<div class="comp-block">
      <p class="block-label" style="color:#4B0082">Comentário pedagógico final</p>
      <p class="block-text">${esc(ia.resumo_geral)}</p>
    </div>`;
  }

  if (!content) return '';

  return `
  <section class="section-box analise-global">
    <h2 class="section-title">Análise Global</h2>
    ${content}
  </section>`;
}

// ─── HTML completo ────────────────────────────────────────────────────────────

function buildHtml(c: JarvisCorrecaoPdfData): string {
  const logoUrl = `${window.location.origin}/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png`;
  const year = new Date().getFullYear();

  const dataCorrecao = c.corrigida_em
    ? new Date(c.corrigida_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const textoOriginal = c.transcricao_confirmada || c.transcricao_ocr_original;

  // Normaliza correcao_ia (mesma lógica do DetalhesCorrecao)
  let ia: any = c.correcao_ia;
  if (ia?.resposta_bruta && typeof ia.resposta_bruta === 'string') {
    try {
      let text = ia.resposta_bruta.trim();
      if (text.startsWith('```')) {
        const nl = text.indexOf('\n');
        if (nl !== -1) {
          text = text.slice(nl + 1).trim();
          const lf = text.lastIndexOf('```');
          if (lf !== -1) text = text.slice(0, lf).trim();
        }
      }
      if (text.startsWith('{')) {
        const p = JSON.parse(text);
        if (p && typeof p === 'object' && !Array.isArray(p)) ia = p;
      }
    } catch {}
  }

  const erros: any[] = ia?.erros || [];
  const estrutura = ia?.estrutura;
  const errosComComp = erros.filter((e: any) => !!e.competencia_relacionada);
  const usaClassPorComp = errosComComp.length === erros.length && erros.length > 0;

  const revisaoLabel = c.tipo_correcao === 'recorrecao' && c.numero_versao
    ? `<span class="revisao-badge">Revisão #${c.numero_versao}</span>`
    : '';

  const competenciasHtml = ia?.competencias
    ? ['c1', 'c2', 'c3', 'c4', 'c5'].map((key, i) =>
        renderCompetencia(key, String(i + 1), ia, erros, estrutura, usaClassPorComp)
      ).join('')
    : ia?.resposta_bruta
      ? `<section class="section-box"><h2 class="section-title">Correção</h2><p class="block-text" style="white-space:pre-wrap">${esc(String(ia.resposta_bruta))}</p></section>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(c.autor_nome)} - ${esc(c.tema)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

@page { size: A4; margin: 0; }

:root {
  --purple:      #4B0082;
  --purple-mid:  #7630b8;
  --purple-soft: #f4f0fb;
  --purple-line: #ddd0f0;
  --text:        #1e1c27;
  --muted:       #655e74;
  --shadow:      0 2px 8px rgba(75,0,130,0.09);
  --r:           10px;
}

* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  color: var(--text);
  font-size: 11.5px;
  line-height: 1.55;
}

/* ── HEADER ── */
.header {
  background: linear-gradient(155deg, #3f0776 0%, #7630b8 100%);
  border-radius: var(--r);
  padding: 12px 16px 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}
.header-logo {
  width: 38px; height: 38px;
  object-fit: contain; flex-shrink: 0;
  background: rgba(255,255,255,0.12);
  border-radius: 7px; padding: 4px;
}
.header-body { flex: 1; }
.header-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.4px; line-height: 1.2; }

/* ── IDENTIFICAÇÃO ── */
.identificacao {
  background: white;
  border: 1.5px solid var(--purple-line);
  border-radius: var(--r);
  padding: 12px 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
}
.aluno-nome { font-size: 17px; font-weight: 800; color: var(--purple); margin: 0 0 3px; }
.tema-texto { font-size: 11.5px; font-weight: 600; color: #444; margin: 0 0 4px; }
.meta-row { display: flex; gap: 14px; flex-wrap: wrap; }
.meta-item { font-size: 10px; color: var(--muted); }
.meta-item strong { color: var(--text); font-weight: 700; }
.revisao-badge {
  display: inline-block;
  background: #ede9fe; color: #5b21b6;
  font-size: 9px; font-weight: 800;
  padding: 2px 8px; border-radius: 999px;
  letter-spacing: 0.3px;
}

/* ── SECTION BOX ── */
.section-box {
  background: white;
  border: 1px solid var(--purple-line);
  border-radius: var(--r);
  padding: 12px 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
  break-inside: avoid;
}
.section-title {
  margin: 0 0 10px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  color: var(--purple);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title::before, .section-title::after {
  content: ''; height: 1px;
  background: var(--purple-line); flex: 1;
}

/* ── NOTAS ── */
.notas-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.nota-card {
  border: 1px solid var(--purple-line);
  border-radius: 8px;
  padding: 8px 4px;
  text-align: center;
  background: var(--purple-soft);
}
.nota-total-card {
  background: linear-gradient(160deg, #4B0082, #7630b8);
  border-color: #4B0082;
}
.nota-label-text {
  display: block;
  font-size: 8.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  margin-bottom: 4px;
}
.nota-total-card .nota-label-text { color: rgba(255,255,255,0.75); }
.nota-valor { display: block; font-size: 18px; font-weight: 800; }
.nota-valor-total { display: block; font-size: 20px; font-weight: 800; color: white; }
.nota-max {
  display: block;
  font-size: 8px;
  color: var(--muted);
  margin-top: 1px;
}
.nota-total-card .nota-max { color: rgba(255,255,255,0.6); }

/* ── TEXTO ORIGINAL ── */
.essay-paragraph {
  font-size: 11px;
  line-height: 1.8;
  color: #2e2c3a;
  margin: 0 0 9px;
  text-align: justify;
  text-indent: 2em;
}
.essay-paragraph:last-child { margin-bottom: 0; }

/* ── COMPETÊNCIAS ── */
.comp-section {
  background: #fbf8ff;
  border: 1px solid var(--purple-line);
  border-radius: var(--r);
  padding: 12px 14px;
  margin-bottom: 8px;
  break-inside: avoid;
}
.comp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--purple-line);
}
.comp-badge {
  background: var(--purple);
  color: white;
  font-size: 9.5px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}
.comp-nota {
  font-size: 20px;
  font-weight: 800;
}
.comp-nota-max {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
}
.comp-block { margin-bottom: 10px; }
.comp-block:last-child { margin-bottom: 0; }
.block-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--muted);
  margin: 0 0 5px;
}
.block-text {
  font-size: 11px;
  line-height: 1.7;
  color: #3a3645;
  margin: 0 0 5px;
}
.block-text:last-child { margin-bottom: 0; }
.block-text-italic {
  font-size: 11px;
  line-height: 1.7;
  color: #555;
  font-style: italic;
  margin: 0;
}

/* ── LISTAS ── */
.bullet-list, .check-list {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 11px;
  line-height: 1.7;
  color: #3a3645;
}
.bullet-list li { margin-bottom: 3px; }
.check-list { list-style: none; padding: 0; }
.check-list li::before {
  content: '✓ ';
  color: #15803d;
  font-weight: 700;
}
.check-list li { margin-bottom: 3px; }

/* ── ORIENTAÇÃO GRUPO ── */
.orientacao-grupo-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--purple);
  margin: 8px 0 4px;
}

/* ── ERROS ── */
.erros-list { display: flex; flex-direction: column; gap: 6px; }
.erro-item {
  border-left: 3px solid #f87171;
  background: white;
  padding: 6px 10px;
  border-radius: 0 6px 6px 0;
}
.erro-tipo {
  font-size: 10px;
  font-weight: 800;
  color: #dc2626;
  margin-bottom: 2px;
}
.erro-para {
  font-size: 9px;
  font-weight: 600;
  background: #f1f5f9;
  color: #64748b;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
}
.erro-trecho {
  font-size: 10px;
  font-style: italic;
  color: #78716c;
  margin: 2px 0;
}
.erro-desc { font-size: 10.5px; color: #44403c; margin: 2px 0; }
.erro-sug { font-size: 10.5px; font-weight: 600; color: #15803d; margin: 3px 0 0; }

/* ── ANÁLISE GLOBAL ── */
.analise-global { background: #fbf8ff; }

/* ── FOOTER ── */
.footer {
  margin-top: 10px;
  padding-top: 7px;
  border-top: 1.5px solid var(--purple-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  color: var(--muted);
}
.footer strong { color: var(--purple-mid); }

/* ── SCREEN ── */
@media screen {
  html, body { background: #dde0e6; padding: 0; margin: 0; }
  body { padding: 24px 12px 48px; min-height: 100vh; }
  .page {
    max-width: 794px; margin: 0 auto;
    background: white;
    box-shadow: 0 6px 40px rgba(0,0,0,0.22);
    border-radius: 6px;
    padding: 32px 36px;
  }
  @media (max-width: 600px) {
    body { padding: 0; }
    .page { border-radius: 0; padding: 18px 14px 28px; box-shadow: none; }
    .notas-grid { grid-template-columns: repeat(3, 1fr); }
  }
}

/* ── PRINT ── */
@media print {
  html, body {
    background: white !important; padding: 0 !important; margin: 0 !important;
    width: 210mm !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page {
    width: 210mm !important; max-width: 210mm !important;
    padding: 12mm 13mm 26mm !important;
    box-shadow: none !important; border-radius: 0 !important; margin: 0 !important;
  }
  img { max-width: 100% !important; height: auto !important; }
  .footer {
    position: fixed !important; bottom: 0 !important;
    left: 0 !important; right: 0 !important;
    padding: 5px 13mm !important; margin: 0 !important;
    background: white !important;
    border-top: 1.5px solid var(--purple-line) !important;
    z-index: 1000;
  }
  .comp-section, .section-box { break-inside: avoid; page-break-inside: avoid; }
}
</style>
</head>
<body>
<div class="page">

  <header class="header">
    <img class="header-logo" src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
    <div class="header-body">
      <h1 class="header-title">Laboratório do Professor de Redação</h1>
    </div>
  </header>

  <div class="identificacao">
    <p class="aluno-nome">${esc(c.autor_nome || 'Redator')}</p>
    <p class="tema-texto">${esc(c.tema)}</p>
    <div class="meta-row">
      ${dataCorrecao ? `<span class="meta-item"><strong>Data:</strong> ${dataCorrecao}</span>` : ''}
      ${c.nota_total != null ? `<span class="meta-item"><strong>Nota:</strong> ${c.nota_total}/1000</span>` : ''}
      ${revisaoLabel}
    </div>
  </div>

  ${renderNotasGrid(c)}

  ${renderTextoOriginal(textoOriginal)}

  ${competenciasHtml}

  ${renderAnaliseGlobal(ia)}

  <footer class="footer">
    <div><strong>Laboratório do Professor de Redação</strong></div>
    <div>${year}</div>
  </footer>

</div>
<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 900);
  };
</script>
</body>
</html>`;
}

// ─── Exportação principal ─────────────────────────────────────────────────────

export function generateJarvisCorrecaoPDF(correcao: JarvisCorrecaoPdfData): void {
  const html = buildHtml(correcao);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Popup bloqueado. Permita popups para este site e tente novamente.');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function gerarNomeArquivoPdf(autorNome?: string | null, tema?: string | null): string {
  const nome = (autorNome || 'Correção Jarvis').replace(/[<>:"/\\|?*]/g, '').trim();
  const temaStr = (tema || 'Redação').replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 80);
  return `${nome} - ${temaStr}.pdf`;
}
