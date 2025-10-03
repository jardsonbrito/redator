import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: Gerar Imagem A4 de Redação
 *
 * Fallback server-side para gerar imagem A4 quando o frontend não conseguir.
 * Recebe texto e retorna imagem JPEG em formato A4 padronizado.
 */

interface RequestBody {
  texto: string;
  fraseTematica?: string;
  nomeAluno?: string;
}

// Configuração A4 em SVG (mais leve que Canvas no Deno)
const CONFIG_A4 = {
  larguraMm: 210,
  alturaMm: 297,
  margemMm: 25,
  tamanhoFonte: 11,
  lineHeight: 1.15,
};

/**
 * Gera SVG do texto formatado em A4
 */
function gerarSVGA4(texto: string, fraseTematica?: string): string {
  const { larguraMm, alturaMm, margemMm, tamanhoFonte, lineHeight } = CONFIG_A4;

  const larguraTextoMm = larguraMm - (margemMm * 2);
  const alturaTextoMm = alturaMm - (margemMm * 2);

  // Aproximação: 1pt = 0.3527mm
  const tamanhoFonteMm = tamanhoFonte * 0.3527;
  const espacamentoLinhaMm = tamanhoFonteMm * lineHeight;

  // Caracteres por linha (aproximação baseada em fonte monospace)
  const caracteresLinha = Math.floor(larguraTextoMm / (tamanhoFonteMm * 0.6));

  // Quebrar texto em linhas
  const linhas: string[] = [];
  let yAtual = margemMm;

  // Adicionar frase temática se fornecida
  if (fraseTematica) {
    const linhasTematica = quebrarTexto(fraseTematica, caracteresLinha);
    linhasTematica.forEach(linha => {
      linhas.push(`<text x="${margemMm}" y="${yAtual}" font-weight="bold">${escaparXML(linha)}</text>`);
      yAtual += espacamentoLinhaMm;
    });
    yAtual += espacamentoLinhaMm; // Espaço extra
  }

  // Adicionar texto principal
  const linhasTexto = quebrarTexto(texto, caracteresLinha);
  linhasTexto.forEach(linha => {
    if (yAtual + espacamentoLinhaMm <= alturaMm - margemMm) {
      linhas.push(`<text x="${margemMm}" y="${yAtual}">${escaparXML(linha)}</text>`);
      yAtual += espacamentoLinhaMm;
    }
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${larguraMm}mm" height="${alturaMm}mm" viewBox="0 0 ${larguraMm} ${alturaMm}">
      <rect width="100%" height="100%" fill="white"/>
      <g font-family="Times New Roman, Times, serif" font-size="${tamanhoFonte}pt" fill="black">
        ${linhas.join('\n        ')}
      </g>
    </svg>
  `;
}

/**
 * Quebra texto em linhas de tamanho máximo
 */
function quebrarTexto(texto: string, maxCaracteres: number): string[] {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let linhaAtual = '';

  palavras.forEach(palavra => {
    const testeAtual = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

    if (testeAtual.length > maxCaracteres && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = testeAtual;
    }
  });

  if (linhaAtual) {
    linhas.push(linhaAtual);
  }

  return linhas;
}

/**
 * Escapa caracteres especiais para XML
 */
function escaparXML(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converte SVG para PNG usando API externa (resvg.io ou similar)
 * Nota: Em produção, considere usar serviço dedicado ou biblioteca nativa
 */
async function converterSVGParaJPEG(svg: string): Promise<Uint8Array> {
  // Por enquanto, retorna o SVG como resposta
  // Em produção, integrar com serviço de conversão ou usar biblioteca Deno
  const encoder = new TextEncoder();
  return encoder.encode(svg);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { texto, fraseTematica, nomeAluno }: RequestBody = await req.json();

    if (!texto || texto.trim().length === 0) {
      throw new Error('Texto da redação é obrigatório');
    }

    // Validar limite de palavras
    const palavras = texto.trim().split(/\s+/).length;
    if (palavras > 500) {
      throw new Error(`Texto excede limite de 500 palavras (${palavras} palavras encontradas)`);
    }

    // Gerar SVG
    const svg = gerarSVGA4(texto, fraseTematica);

    // Por enquanto, retorna SVG (em produção, converter para JPEG)
    // Nota: Implementar conversão SVG→JPEG com biblioteca adequada
    const imagemBuffer = await converterSVGParaJPEG(svg);

    return new Response(imagemBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="redacao_${nomeAluno || 'aluno'}_${Date.now()}.svg"`,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar imagem:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao gerar imagem da redação',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
