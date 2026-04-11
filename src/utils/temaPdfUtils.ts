import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FullTema {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  cabecalho_enem?: string | null;
  texto_1?: string | null;
  texto_1_fonte?: string | null;
  texto_2?: string | null;
  texto_2_fonte?: string | null;
  texto_3?: string | null;
  texto_3_fonte?: string | null;
  texto_4?: string | null;
  texto_4_fonte?: string | null;
  texto_5?: string | null;
  texto_5_fonte?: string | null;
  motivator1_url?: string | null;
  motivator2_url?: string | null;
  motivator3_url?: string | null;
  motivator4_url?: string | null;
  motivator5_url?: string | null;
  cover_url?: string | null;
  cover_file_path?: string | null;
  imagem_texto_4_url?: string | null;
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

function sanitizeSource(text?: string | null): string {
  return (text ?? '')
    .replace(/Dispon[ií]vel em:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveCoverUrl(tema: FullTema): string | null {
  if (tema.cover_file_path) {
    return supabase.storage.from('themes').getPublicUrl(tema.cover_file_path).data.publicUrl;
  }
  return tema.cover_url || tema.imagem_texto_4_url || null;
}

// Tenta converter uma URL de imagem em data URL (embedded) para garantir renderização no print.
// Funciona para imagens do Supabase (mesma origem ou CORS aberto).
// Para imagens externas com CORS bloqueado, retorna a URL original e o browser tenta carregar direto.
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

interface Motivador {
  label: string;
  text: string | null | undefined;
  fonte: string | null | undefined;
  imgUrl: string | null | undefined;
}

function buildMotivadores(tema: FullTema): Motivador[] {
  return [
    { label: 'Texto I',   text: tema.texto_1, fonte: tema.texto_1_fonte, imgUrl: tema.motivator1_url },
    { label: 'Texto II',  text: tema.texto_2, fonte: tema.texto_2_fonte, imgUrl: tema.motivator2_url },
    { label: 'Texto III', text: tema.texto_3, fonte: tema.texto_3_fonte, imgUrl: tema.motivator3_url },
    { label: 'Texto IV',  text: tema.texto_4, fonte: tema.texto_4_fonte, imgUrl: tema.motivator4_url },
    { label: 'Texto V',   text: tema.texto_5, fonte: tema.texto_5_fonte, imgUrl: tema.motivator5_url },
  ].filter(m => m.text || m.imgUrl);
}

async function resolveMotivadorImages(motivadores: Motivador[]): Promise<Motivador[]> {
  return Promise.all(
    motivadores.map(async (m) => {
      if (!m.imgUrl) return m;
      const resolved = await tryImageAsDataUrl(m.imgUrl);
      return { ...m, imgUrl: resolved };
    })
  );
}

function getLayoutClass(tema: FullTema, motivadores: Motivador[]): string {
  const totalChars = motivadores.reduce(
    (acc, m) => acc + (m.text?.length ?? 0) + (m.fonte?.length ?? 0), 0
  );
  const themeIsLong = tema.frase_tematica.length > 90;
  const useSingleCol = totalChars > 2800;
  return [themeIsLong ? 'long-theme' : '', useSingleCol ? 'single-column compact' : '']
    .filter(Boolean).join(' ');
}

// ─── Componentes HTML ─────────────────────────────────────────────────────────

function renderMotivadorCard(m: Motivador): string {
  const imgHtml = m.imgUrl
    ? `<img class="motivator-image" src="${esc(m.imgUrl)}" alt="" onerror="this.style.display='none'" />`
    : '';
  const sourceClean = sanitizeSource(m.fonte);
  return `
    <article class="motivator-card">
      <div class="motivator-head">${esc(m.label)}</div>
      <div class="motivator-body">
        ${imgHtml}
        ${m.text ? `<p class="motivator-text">${esc(m.text)}</p>` : ''}
        ${sourceClean ? `<div class="motivator-source"><strong>Fonte:</strong> ${esc(sourceClean)}</div>` : ''}
      </div>
    </article>`;
}

// ─── Construção do HTML ───────────────────────────────────────────────────────

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildHtml(tema: FullTema, motivadores: Motivador[]): string {
  const logoUrl = `${window.location.origin}/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png`;
  const coverUrl = resolveCoverUrl(tema);
  const layoutClass = getLayoutClass(tema, motivadores);
  const year = new Date().getFullYear();
  const eixo = capitalize(tema.eixo_tematico || '');

  const coverHtml = coverUrl
    ? `<div class="cover-banner"><img src="${esc(coverUrl)}" alt="Capa" onerror="this.parentElement.style.display='none'" /></div>`
    : '';

  // Instrução padronizada sem citar o tema (evita redundância com o destaque abaixo)
  const instrucaoEnem = `<p class="proposal-text">Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para a defesa de seu ponto de vista, sobre <strong>o tema apresentado a seguir</strong>:</p>`;

  const motivadoresHtml = motivadores.length > 0 ? `
    <section class="motivators-section">
      <h2 class="section-title">Textos Motivadores</h2>
      <div class="motivators-grid">
        ${motivadores.map(renderMotivadorCard).join('')}
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(tema.frase_tematica)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

@page {
  size: A4;
  margin: 13mm 13mm 13mm 13mm;
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

/* ── PROPOSAL BOX ─────────────────────────────────── */
.proposal-box {
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

.proposal-text {
  font-size: 11.5px;
  line-height: 1.67;
  margin: 0 0 11px;
  color: #302d3e;
  text-align: justify;
}

/* ── THEME HIGHLIGHT ──────────────────────────────── */
.theme-highlight {
  background: var(--purple-soft);
  border: 1.5px solid #e2d5f4;
  border-radius: 10px;
  padding: 15px 16px;
  text-align: center;
}

.theme-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.3px;
  font-weight: 800;
  color: var(--purple-mid);
  margin-bottom: 7px;
}

.theme-title {
  font-size: 20px;
  line-height: 1.22;
  font-weight: 800;
  color: var(--purple);
  margin: 0;
  font-style: normal;
  text-decoration: none;
}

.long-theme .theme-title { font-size: 17px; }

/* ── MOTIVATORS ───────────────────────────────────── */
.motivators-section { page-break-before: avoid; }

.motivators-section .section-title { margin-bottom: 11px; }

.motivators-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}

.single-column .motivators-grid { grid-template-columns: 1fr; }

.motivator-card {
  background: var(--card);
  border: 1px solid #ddd5ee;
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}

.motivator-head {
  background: linear-gradient(135deg, #5c3aa6 0%, var(--purple-mid) 100%);
  color: white;
  font-weight: 700;
  font-size: 11.5px;
  padding: 7px 12px;
}

.motivator-body { padding: 10px 12px 9px; }

.motivator-image {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  background: var(--purple-soft);
  border-radius: 6px;
  margin-bottom: 8px;
  display: block;
}

.motivator-text {
  font-size: 11.3px;
  line-height: 1.65;
  color: #2e2c3a;
  margin: 0 0 8px;
  text-align: justify;
}

.compact .motivator-text {
  font-size: 10.8px;
  line-height: 1.55;
}

.motivator-source {
  font-size: 9.8px;
  line-height: 1.45;
  color: var(--muted);
  border-top: 1px solid #ece6f8;
  padding-top: 7px;
}

.motivator-source strong { color: var(--purple-mid); }

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

/* ── SCREEN: preview A4 centralizado ─────────────── */
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
  /* Mobile: sem padding lateral excessivo */
  @media (max-width: 600px) {
    body { padding: 0; }
    .page {
      border-radius: 0;
      padding: 20px 16px 32px;
      box-shadow: none;
    }
    .motivators-grid { grid-template-columns: 1fr !important; }
    .header-title { font-size: 16px; }
    .theme-title { font-size: 16px; }
    .long-theme .theme-title { font-size: 14px; }
  }
}

/* ── PRINT ────────────────────────────────────────── */
@media print {
  html, body { background: white !important; padding: 0 !important; margin: 0 !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: none !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
}
</style>
</head>
<body>
<div class="page ${layoutClass}">

  <header class="header">
    <div class="header-body">
      <h1 class="header-title">TEMAS DE REDAÇÃO</h1>
      <div class="header-sub">App do Redator · ${year}</div>
      <div class="meta-bar">${esc(eixo)} &nbsp;|&nbsp; Proposta ENEM</div>
    </div>
    <img class="header-logo" src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
  </header>

  ${coverHtml}

  <section class="proposal-box">
    <h2 class="section-title">Proposta (ENEM)</h2>
    ${instrucaoEnem}
    <div class="theme-highlight">
      <div class="theme-label">Tema</div>
      <h3 class="theme-title">${esc(tema.frase_tematica)}</h3>
    </div>
  </section>

  ${motivadoresHtml}

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

export async function generateTemaPDF(tema: FullTema, win?: Window | null): Promise<void> {
  const raw = buildMotivadores(tema);
  const motivadores = await resolveMotivadorImages(raw);
  const html = buildHtml(tema, motivadores);

  const target = win ?? window.open('', '_blank');
  if (!target) {
    throw new Error('Popup bloqueado. Permita popups para este site e tente novamente.');
  }

  target.document.open();
  target.document.write(html);
  target.document.close();
}

// ─── Buscar tema completo do Supabase ─────────────────────────────────────────

export async function fetchFullTema(id: string): Promise<FullTema | null> {
  const { data, error } = await supabase
    .from('temas')
    .select(`
      id, frase_tematica, eixo_tematico, cabecalho_enem,
      texto_1, texto_1_fonte, texto_2, texto_2_fonte,
      texto_3, texto_3_fonte, texto_4, texto_4_fonte,
      texto_5, texto_5_fonte,
      motivator1_url, motivator2_url, motivator3_url,
      motivator4_url, motivator5_url,
      cover_url, cover_file_path, imagem_texto_4_url
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as FullTema;
}
