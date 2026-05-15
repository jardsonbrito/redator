import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // Extrai token do path: /functions/v1/correcao-og/:token
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const token = parts[parts.length - 1];

  if (!token || token === "correcao-og") {
    return new Response("Token inválido", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: rows } = await supabase
    .from("jarvis_correcao_links")
    .select("ativo, correcao:jarvis_correcoes(autor_nome, tema, nota_total)")
    .eq("token", token)
    .eq("ativo", true)
    .limit(1);

  const link = rows?.[0] as any;
  const correcao = link?.correcao;

  const spaUrl = `https://redator.laboratoriodoredator.com/correcao-publica/${token}`;

  let title = "Correção de Redação";
  let desc = "Laboratório do Professor de Redação";

  if (correcao) {
    title = esc(`${correcao.autor_nome} — ${correcao.tema}`);
    desc = esc(`Nota: ${correcao.nota_total ?? "—"}/1000 · Laboratório do Professor de Redação`);
  }

  const canonical = esc(spaUrl);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="Laboratório do Professor de Redação" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta http-equiv="refresh" content="0; url=${canonical}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(spaUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
