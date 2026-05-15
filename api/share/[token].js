// Vercel Serverless Function: serve OG meta tags para bots (WhatsApp, etc.)
// e redireciona humanos para a SPA.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  "https://kgmxntpmvlnbftjqtyxx.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbXhudHBtdmxuYmZ0anF0eXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5Nzk3MzQsImV4cCI6MjA2NjU1NTczNH0.57rSKhhANhbPH4-KMS8D6EuxW1dhAimML-rPNSlnEX0";

const BOT_RE =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Googlebot|Bingbot|Applebot|ia_archiver/i;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).send("Token inválido");
  }

  const ua = req.headers["user-agent"] || "";
  const isBot = BOT_RE.test(ua);

  if (!isBot) {
    // Humano: redireciona para a SPA
    return res.redirect(302, `/correcao-publica/${token}`);
  }

  // Bot: consulta Supabase e retorna HTML com meta OG
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/jarvis_correcao_links` +
      `?select=ativo,correcao:jarvis_correcoes(autor_nome,tema,nota_total)` +
      `&token=eq.${encodeURIComponent(token)}&ativo=eq.true&limit=1`;

    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    const rows = await resp.json();
    const link = Array.isArray(rows) ? rows[0] : null;
    const correcao = link?.correcao;

    if (!correcao) {
      return res.status(404).send("Link não encontrado ou desativado");
    }

    const title = esc(`${correcao.autor_nome} — ${correcao.tema}`);
    const desc = esc(
      `Nota: ${correcao.nota_total ?? "—"}/1000 · Laboratório do Professor de Redação`
    );
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["host"] || "redator.laboratoriodoredator.com";
    const canonicalUrl = esc(`${proto}://${host}/correcao-publica/${token}`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Laboratório do Professor de Redação" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
</head>
<body>
  <script>window.location.replace("${canonicalUrl.replace(/"/g, '\\"')}");</script>
</body>
</html>`);
  } catch (err) {
    console.error("og-share error:", err);
    return res.status(500).send("Erro interno");
  }
}
