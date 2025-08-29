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

    let correctionUrl = 'https://redator.laboratoriodoredator.com';
    
    if (tipo_envio === 'Lousa') {
      correctionUrl += `/lousas?highlight=${redacao_id}`;
    } else {
      correctionUrl += `/minhas-redacoes?highlight=${redacao_id}`;
    }

    const resend = new Resend(resendApiKey);

    // Determinar tipo e gênero correto
    const isExercicio = tipo_envio === 'Exercicio' || tipo_envio === 'exercicio'
    const isLousa = tipo_envio === 'Lousa' || tipo_envio === 'lousa'
    
    let tipoTexto, tipoArticle
    if (isExercicio) {
      tipoTexto = 'exercício'
      tipoArticle = 'Seu'
    } else if (isLousa) {
      tipoTexto = 'lousa'  
      tipoArticle = 'Sua'
    } else {
      tipoTexto = 'redação'
      tipoArticle = 'Sua'
    }
    
    // Template HTML puro otimizado para email com estrutura de tabelas
    const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${tipoArticle} ${tipoTexto} foi corrigid${isExercicio ? 'o' : 'a'}!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f6f9fc;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px;">
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #6B46C1;">
                            <img src="https://redator.laboratoriodoredator.com/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" alt="App do Redator" width="120" height="90" style="display: block; margin: 0 auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding-bottom: 20px;">
                                        <h1 style="color: #333333; font-size: 24px; font-weight: 600; line-height: 1.4; margin: 0; font-family: Arial, sans-serif;">
                                            🎉 ${tipoArticle} ${tipoTexto} foi corrigid${isExercicio ? 'o' : 'a'}!
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding-bottom: 20px;">
                                        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">
                                            Olá <strong>${student_name}</strong>, ${isExercicio ? 'seu' : 'sua'} ${tipoTexto} acaba de ser corrigid${isExercicio ? 'o' : 'a'}.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            ${nota ? `
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 20px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px;">
                                            <tr>
                                                <td style="padding: 16px; text-align: center;">
                                                    <p style="color: #0369a1; font-size: 18px; font-weight: 600; margin: 0; font-family: Arial, sans-serif;">
                                                        📊 Nota recebida: ${nota}/1000
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>` : ''}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                            <tr>
                                                <td style="padding: 24px;">
                                                    <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; font-family: Arial, sans-serif;">📋 Detalhes da Correcao</p>
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="border-top: 1px solid #e2e8f0; padding: 16px 0 0 0;">
                                                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 8px 0; font-family: Arial, sans-serif;">
                                                                    📝 Tema: ${tema_titulo}
                                                                </p>
                                                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 8px 0; font-family: Arial, sans-serif;">
                                                                    📚 Tipo: ${tipo_envio}
                                                                </p>
                                                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 8px 0; font-family: Arial, sans-serif;">
                                                                    👨‍🏫 Corretor: ${corretor_nome}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 32px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="background-color: #6B46C1; border-radius: 6px;">
                                                    <a href="${correctionUrl}" style="display: inline-block; padding: 12px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; font-family: Arial, sans-serif;">Ver Correcao Completa</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px 40px 40px; border-top: 1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding-bottom: 8px;">
                                        <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">
                                            <a href="https://redator.laboratoriodoredator.com" style="color: #6B46C1; text-decoration: underline;">App do Redator</a>
                                            -
                                            <a href="mailto:contato@laboratoriodoredator.com" style="color: #6B46C1; text-decoration: underline;">Suporte</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">
                                            2025 App do Redator - Todos os direitos reservados
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const emailResult = await resend.emails.send({
      from: 'App do Redator <noreply@laboratoriodoredator.com>',
      to: [student_email],
      subject: `🎉 ${tipoArticle} ${tipoTexto} foi corrigid${isExercicio ? 'o' : 'a'}!`,
      html: emailHtml,
      tags: [
        { name: 'category', value: 'correction-notification' },
        { name: 'student', value: student_email },
        { name: 'tipo_envio', value: tipo_envio }
      ]
    });

    const { error: logError } = await supabase
      .from('email_logs')
      .insert([
        {
          email_id: emailResult.data?.id || null,
          recipient_email: student_email,
          student_name: student_name,
          email_type: 'correction_notification',
          redacao_id: redacao_id,
          tema_titulo: tema_titulo,
          tipo_envio: tipo_envio,
          corretor_nome: corretor_nome,
          nota: nota,
          sent_at: new Date().toISOString(),
          status: 'sent'
        }
      ]);

    if (logError) {
      console.error('Erro ao registrar envio do email:', logError);
    }

    console.log(`✅ Email de correcao enviado para ${student_email} - Redacao: ${tema_titulo}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de notificacao enviado com sucesso',
        email_id: emailResult.data?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar email de correcao:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});