import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Resend } from "npm:resend@4.0.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequestBody {
  redacao_id: string;
  student_email: string;
  student_name: string;
  tema_titulo: string;
  tipo_envio: 'Regular' | 'Simulado' | 'Exercicio' | 'Lousa';
  corretor_nome: string;
  nota?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = 're_5g8wjotb_Ng2hbcmtot32vzL9SQLRkMbw';

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY nao configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: EmailRequestBody = await req.json();
    
    const {
      redacao_id,
      student_email,
      student_name,
      tema_titulo,
      tipo_envio,
      corretor_nome,
      nota
    } = body;

    if (!student_email || !student_name || !tema_titulo || !corretor_nome) {
      throw new Error('Dados obrigatorios ausentes');
    }

    // Usar nome do corretor diretamente (sem buscar no banco)
    let nomeCorretor = corretor_nome;

    let correctionUrl = 'https://redator.laboratoriodoredator.com';
    
    if (tipo_envio === 'Lousa') {
      correctionUrl += `/lousas?highlight=${redacao_id}`;
    } else {
      correctionUrl += `/minhas-redacoes?highlight=${redacao_id}`;
    }

    const resend = new Resend(resendApiKey);

    // Funcao para corrigir caracteres UTF-8 corrompidos
    const fixUtf8 = (str: string): string => {
      // Primeiro, tentar decodificar corretamente
      try {
        // Se a string contém � caracteres, tentar recuperar os originais
        if (str.includes('�')) {
          // Mapear os padrões mais comuns de corrupção
          return str
            .replace(/Mar�a/g, 'Maria')
            .replace(/Jos�/g, 'José')
            .replace(/Jo�o/g, 'João')
            .replace(/Reda��o/g, 'Redação')
            .replace(/educa��o/g, 'educação')
            .replace(/acentua��o/g, 'acentuação')
            .replace(/C�lia/g, 'Célia')
            .replace(/�/g, 'ã'); // fallback para ã
        }
        
        // Se não tem �, aplicar normalizações padrão
        return str
          .replace(/aa/g, 'ã')  // caso comum: aaa -> ã
          .replace(/ao/g, 'ão') // caso comum: aao -> ão
          .replace(/ee/g, 'ê')  // caso comum: eee -> ê
          .normalize('NFC');
      } catch (e) {
        return str;
      }
    };

    // Determinar tipo e genero - simples
    let tipoTexto, artigo;
    if (tipo_envio === 'Exercicio') {
      tipoTexto = 'exercício';
      artigo = 'Seu';
    } else if (tipo_envio === 'Lousa') {
      tipoTexto = 'lousa';
      artigo = 'Sua';
    } else {
      tipoTexto = 'redação';
      artigo = 'Sua';
    }

    // Corrigir UTF-8 corrompido nos dados recebidos
    const studentNameFixed = fixUtf8(student_name);
    const temaTituloFixed = fixUtf8(tema_titulo);
    const nomeCorretorFixed = fixUtf8(nomeCorretor);
    
    const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${artigo} ${tipoTexto} foi corrigida!</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f6f9fc;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <div style="background-color: #6B46C1; padding: 30px; text-align: center;">
            <img src="https://redator.laboratoriodoredator.com/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" alt="App do Redator" width="120" height="90" style="display: block; margin: 0 auto;">
        </div>
        
        <div style="padding: 40px;">
            <h1 style="color: #333; text-align: center; margin-bottom: 20px;">
                🎉 ${artigo} ${tipoTexto} foi corrigida!
            </h1>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Olá <strong>${studentNameFixed}</strong>, sua ${tipoTexto} acaba de ser corrigida.
            </p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0;">
                <p style="font-weight: 600; margin-bottom: 16px;">📋 Detalhes da Correção</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                <p style="margin: 8px 0;"><strong>📝 Tema:</strong> ${temaTituloFixed}</p>
                <p style="margin: 8px 0;"><strong>📚 Tipo:</strong> ${tipo_envio}</p>
                <p style="margin: 8px 0;"><strong>👨‍🏫 Corretor:</strong> ${nomeCorretorFixed}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${correctionUrl}" style="background: #6B46C1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    Ver Correção Completa
                </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 20px;">
                Clique no botão acima para ter acesso aos detalhes da correção.
            </p>
        </div>
        
        <div style="padding: 30px; border-top: 1px solid #e2e8f0;">
            <p style="color: #dc2626; font-size: 14px; text-align: center; margin: 16px 0;">
                ⚠️ <strong>Importante:</strong> Caso você não reconheça este email, ignore esta mensagem.
            </p>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin: 8px 0;">
                <a href="https://redator.laboratoriodoredator.com" style="color: #6B46C1;">
                    App do Redator
                </a>
                ·
                <a href="mailto:contato@laboratoriodoredator.com" style="color: #6B46C1;">
                    Suporte
                </a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                © 2025 App do Redator - Todos os direitos reservados
            </p>
        </div>
    </div>
</body>
</html>`;

    const emailResult = await resend.emails.send({
      from: 'App do Redator <noreply@laboratoriodoredator.com>',
      to: [student_email],
      subject: `🎉 ${artigo} ${tipoTexto} foi corrigida!`,
      html: emailHtml,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      }
    });

    console.log('✅ Email enviado com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResult.data?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});