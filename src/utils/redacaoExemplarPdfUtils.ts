import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FullRedacaoExemplar {
  id: string;
  frase_tematica: string;
  eixo_tematico?: string | null;
  conteudo?: string | null;
  autor?: string | null;
  foto_autor?: string | null;
  dica_de_escrita?: string | null;
  pdf_url?: string | null;
  nota_total?: number | null;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  data_envio?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str?: string | null): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function tryImageAsDataUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

function capitalize(str?: string | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNota(nota?: number | null): string {
  return nota != null ? String(nota) : '—';
}

// ─── Construção do HTML ───────────────────────────────────────────────────────

function buildHtml(
  redacao: FullRedacaoExemplar,
  coverDataUrl: string | null,
  fotoDataUrl: string | null
): string {
  const logoUrl = `${window.location.origin}/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png`;
  const year = new Date().getFullYear();
  const eixo = capitalize(redacao.eixo_tematico);

  const coverHtml = coverDataUrl
    ? `<div class="cover-banner"><img src="${esc(coverDataUrl)}" alt="Imagem" onerror="this.parentElement.style.display='none'" /></div>`
    : '';

  const fotoHtml = fotoDataUrl
    ? `<img class="autor-foto" src="${esc(fotoDataUrl)}" alt="${esc(redacao.autor)}" onerror="this.style.display='none'" />`
    : `<div class="autor-foto-placeholder">${esc((redacao.autor || 'A').charAt(0).toUpperCase())}</div>`;

  const autorHtml = redacao.autor
    ? `<div class="autor-row">${fotoHtml}<span class="autor-nome">Por: <strong>${esc(redacao.autor)}</strong></span></div>`
    : '';

  // Parágrafos do conteúdo
  const paragraphs = (redacao.conteudo || '')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const conteudoHtml = paragraphs.length > 0
    ? paragraphs.map(p => `<p class="essay-paragraph">${esc(p)}</p>`).join('')
    : '<p class="essay-paragraph sem-conteudo"><em>Conteúdo não disponível.</em></p>';

  const dicaParas = (redacao.dica_de_escrita || '')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const dicaHtml = dicaParas.length > 0
    ? `<section class="dica-box">
        <h2 class="section-title">Dica de Escrita</h2>
        ${dicaParas.map(p => `<p class="dica-text">${esc(p)}</p>`).join('')}
       </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(redacao.frase_tematica)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

@page {
  size: A4;
  margin: 0;
}

:root {
  --purple:      #3f0776;
  --purple-mid:  #662f96;
  --purple-soft: #f4f0fb;
  --purple-line: #ddd0f0;
  --text:        #1e1c27;
  --muted:       #655e74;
  --bg:          #ffffff;
  --card:        #fdfcff;
  --shadow:      0 3px 10px rgba(63,7,118,0.09);
  --r-lg:        12px;
  --r-md:        9px;
}

* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  color: var(--text);
  font-size: 12px;
  line-height: 1.5;
}

/* ── HEADER ───────────────────────────────────────── */
.header {
  background: linear-gradient(155deg, #3f0776 0%, #7630b8 100%);
  border-radius: var(--r-lg);
  padding: 13px 18px 11px;
  margin-bottom: 11px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: white;
}

.header-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
  background: rgba(255,255,255,0.12);
  border-radius: 8px;
  padding: 4px;
}

.header-body { flex: 1; }

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.6px;
  line-height: 1.15;
}

.header-sub {
  font-size: 11px;
  opacity: 0.88;
  margin-top: 3px;
  font-weight: 500;
}

.meta-bar {
  margin-top: 9px;
  background: rgba(255,255,255,0.13);
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 999px;
  padding: 5px 14px;
  text-align: center;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* ── COVER ────────────────────────────────────────── */
.cover-banner {
  border-radius: var(--r-lg);
  overflow: hidden;
  margin-bottom: 11px;
  background: var(--purple-soft);
}

.cover-banner img {
  width: 100%;
  max-height: 160px;
  object-fit: contain;
  display: block;
}

/* ── TEMA BOX ─────────────────────────────────────── */
.tema-box {
  background: var(--bg);
  border: 1.5px solid var(--purple-line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 14px 16px 13px;
  margin-bottom: 13px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  color: var(--purple);
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before,
.section-title::after {
  content: '';
  height: 1px;
  background: var(--purple-line);
  flex: 1;
}

.theme-highlight {
  background: var(--purple-soft);
  border: 1.5px solid #e2d5f4;
  border-radius: 10px;
  padding: 12px 16px;
  text-align: center;
}

.theme-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.3px;
  font-weight: 800;
  color: var(--purple-mid);
  margin-bottom: 6px;
}

.theme-title {
  font-size: 18px;
  line-height: 1.22;
  font-weight: 800;
  color: var(--purple);
  margin: 0;
}

/* ── AUTOR ────────────────────────────────────────── */
.autor-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.autor-foto {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--purple-line);
  flex-shrink: 0;
}

.autor-foto-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5c3aa6 0%, var(--purple-mid) 100%);
  color: white;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.autor-nome {
  font-size: 11.5px;
  color: var(--muted);
}

.autor-nome strong { color: var(--text); }

/* ── ESSAY ────────────────────────────────────────── */
.essay-box {
  background: var(--card);
  border: 1px solid #ddd5ee;
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  padding: 14px 16px;
  margin-bottom: 13px;
}

.essay-paragraph {
  font-size: 11.5px;
  line-height: 1.75;
  color: #2e2c3a;
  margin: 0 0 10px;
  text-align: justify;
  text-indent: 2em;
}

.essay-paragraph:last-child { margin-bottom: 0; }
.sem-conteudo { color: var(--muted); font-style: italic; text-indent: 0; }

/* ── DICA ─────────────────────────────────────────── */
.dica-box {
  background: #fffbeb;
  border: 1.5px solid #fde68a;
  border-radius: var(--r-md);
  padding: 13px 15px;
  margin-bottom: 13px;
  break-inside: avoid;
}

.dica-text {
  font-size: 11px;
  line-height: 1.7;
  color: #78350f;
  text-align: justify;
  text-indent: 2em;
  margin: 0 0 8px;
}

.dica-text:first-of-type { text-indent: 0; }
.dica-text:last-child { margin-bottom: 0; }

/* ── NOTAS (removido mas mantido vazio para compatibilidade) ── */
.nota-total {
  background: linear-gradient(135deg, #f4f0fb 0%, #e2d5f4 100%);
  border-color: #c4aeed;
}

.nota-label {
  display: block;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--purple-mid);
  margin-bottom: 4px;
}

.nota-val {
  display: block;
  font-size: 16px;
  font-weight: 800;
  color: var(--purple);
}

/* ── FOOTER ───────────────────────────────────────── */
.footer {
  margin-top: 11px;
  padding-top: 7px;
  border-top: 1.5px solid var(--purple-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9.5px;
  color: var(--muted);
}

.footer strong { color: var(--purple-mid); font-weight: 700; }

/* ── SCREEN ───────────────────────────────────────── */
@media screen {
  html, body {
    background: #dde0e6;
    padding: 0;
    margin: 0;
  }
  body {
    padding: 28px 12px 48px;
    min-height: 100vh;
  }
  .page {
    max-width: 794px;
    margin: 0 auto;
    background: white;
    box-shadow: 0 6px 40px rgba(0,0,0,0.22);
    border-radius: 6px;
    padding: 36px 40px;
  }
  @media (max-width: 600px) {
    body { padding: 0; }
    .page {
      border-radius: 0;
      padding: 20px 16px 32px;
      box-shadow: none;
    }
    .notas-grid { grid-template-columns: repeat(3, 1fr); }
  }
}

/* ── PRINT ────────────────────────────────────────── */
@media print {
  html, body {
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 210mm !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm !important;
    max-width: 210mm !important;
    padding: 13mm 13mm 28mm !important; /* bottom extra para o rodapé fixo */
    box-sizing: border-box !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
  }
  img { max-width: 100% !important; height: auto !important; }

  /* Rodapé fixo: aparece em TODAS as páginas */
  .footer {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    padding: 6px 13mm !important;
    margin: 0 !important;
    background: white !important;
    border-top: 1.5px solid var(--purple-line) !important;
    z-index: 1000;
  }

  /* Seções que não devem ser cortadas */
  .tema-box,
  .dica-box {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
</head>
<body>
<div class="page">

  <header class="header">
    <div class="header-body">
      <h1 class="header-title">REDAÇÃO EXEMPLAR</h1>
      <div class="header-sub">App do Redator · ${year}</div>
      ${eixo ? `<div class="meta-bar">Eixo temático: ${esc(eixo)}</div>` : ''}
    </div>
    <img class="header-logo" src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
  </header>

  ${coverHtml}

  <section class="tema-box">
    <h2 class="section-title">Tema</h2>
    ${autorHtml}
    <div class="theme-highlight">
      <div class="theme-label">Frase Temática</div>
      <h3 class="theme-title">${esc(redacao.frase_tematica)}</h3>
    </div>
  </section>

  <section class="essay-box">
    <h2 class="section-title">Redação</h2>
    ${conteudoHtml}
  </section>

  ${dicaHtml}

  <footer class="footer">
    <div><strong>Linguagens, Códigos e suas Tecnologias</strong></div>
    <div>App do Redator · ${year}</div>
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

export async function generateRedacaoExemplarPDF(
  redacao: FullRedacaoExemplar,
  win?: Window | null
): Promise<void> {
  const [coverDataUrl, fotoDataUrl] = await Promise.all([
    redacao.pdf_url ? tryImageAsDataUrl(redacao.pdf_url) : Promise.resolve(null),
    redacao.foto_autor ? tryImageAsDataUrl(redacao.foto_autor) : Promise.resolve(null),
  ]);

  const html = buildHtml(redacao, coverDataUrl, fotoDataUrl);

  const target = win ?? window.open('', '_blank');
  if (!target) {
    throw new Error('Popup bloqueado. Permita popups para este site e tente novamente.');
  }

  target.document.open();
  target.document.write(html);
  target.document.close();
}

// ─── Buscar redação completa do Supabase ─────────────────────────────────────

export async function fetchFullRedacaoExemplar(id: string): Promise<FullRedacaoExemplar | null> {
  const { data, error } = await supabase
    .from('redacoes')
    .select(`
      id, frase_tematica, eixo_tematico, conteudo,
      autor, foto_autor, dica_de_escrita, pdf_url,
      nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5,
      data_envio
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as FullRedacaoExemplar;
}
