import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BOT_RE =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Googlebot|Bingbot|Applebot|ia_archiver/i;

// Converte todos os chars não-ASCII em entidades HTML (evita problema de charset)
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[^\x00-\x7F]/g, (c) => `&#${c.codePointAt(0) ?? 65533};`);
}

const LOGO =
  "https://redator.laboratoriodoredator.com/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const token = parts[parts.length - 1];

  if (!token || token === "correcao-og") {
    return new Response("Token invalido", { status: 400 });
  }

  const spaUrl = `https://redator.laboratoriodoredator.com/correcao-publica/${token}`;
  const ua = req.headers.get("user-agent") ?? "";
  const isBot = BOT_RE.test(ua);

  // Humano: redireciona direto para a SPA (sem passar HTML pelo proxy)
  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { Location: spaUrl },
    });
  }

  // Bot: busca dados e devolve HTML com meta OG
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: rows } = await supabase
    .from("jarvis_correcao_links")
    .select("ativo, correcao:jarvis_correcoes(autor_nome, tema)")
    .eq("token", token)
    .eq("ativo", true)
    .limit(1);

  const correcao = (rows?.[0] as any)?.correcao;

  const title = correcao
    ? esc(`${correcao.autor_nome} — ${correcao.tema}`)
    : esc("Correção de Redação");
  const desc = esc("Laboratório do Professor de Redação");
  const canonical = esc(spaUrl);
  const logo = esc(LOGO);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${logo}" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:site_name" content="Laborat&#243;rio do Professor de Reda&#231;&#227;o" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${logo}" />
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
