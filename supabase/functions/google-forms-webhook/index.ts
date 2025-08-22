
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FormData {
  nome_aluno: string;
  email_aluno: string;
  turma?: string;
  titulo_exercicio?: string;
  data_realizacao?: string;
  nota?: number;
  exercicio_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Webhook Google Forms chamado');

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse do body da requisição
    const body = await req.json();
    console.log('📦 Dados recebidos:', body);

    // Mapear dados do Google Forms para nossa estrutura
    const formData: FormData = {
      nome_aluno: body.nome || body.name || body['Nome do Aluno'] || '',
      email_aluno: body.email || body['Email'] || body['E-mail'] || '',
      turma: body.turma || body['Turma'] || 'Não informado',
      titulo_exercicio: body.exercicio || body['Exercício'] || body['Título do Exercício'] || 'Exercício Google Forms',
      data_realizacao: body.data || body['Data'] || new Date().toISOString().split('T')[0],
      nota: body.nota ? parseFloat(body.nota) : null,
      exercicio_id: body.exercicio_id || null
    };

    console.log('🔄 Dados mapeados:', formData);

    // Validar dados obrigatórios
    if (!formData.nome_aluno || !formData.email_aluno) {
      console.error('❌ Dados obrigatórios ausentes');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nome e email são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Normalizar email
    formData.email_aluno = formData.email_aluno.toLowerCase().trim();

    // Processar data se fornecida
    if (formData.data_realizacao && formData.data_realizacao !== new Date().toISOString().split('T')[0]) {
      try {
        // Tentar diferentes formatos de data
        let dataObj = null;
        
        if (formData.data_realizacao.includes('/')) {
          const parts = formData.data_realizacao.split('/');
          if (parts.length === 3) {
            // Assumir DD/MM/YYYY
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            dataObj = new Date(year, month, day);
          }
        } else if (formData.data_realizacao.includes('-')) {
          dataObj = new Date(formData.data_realizacao);
        }
        
        if (dataObj && !isNaN(dataObj.getTime())) {
          formData.data_realizacao = dataObj.toISOString().split('T')[0];
        }
      } catch (error) {
        console.log('⚠️ Erro ao processar data, usando data atual:', error);
        formData.data_realizacao = new Date().toISOString().split('T')[0];
      }
    }

    // Inserir dados na tabela radar_dados
    const { data, error } = await supabase
      .from('radar_dados')
      .insert({
        nome_aluno: formData.nome_aluno,
        email_aluno: formData.email_aluno,
        turma: formData.turma,
        titulo_exercicio: formData.titulo_exercicio,
        data_realizacao: formData.data_realizacao,
        nota: formData.nota,
        exercicio_id: formData.exercicio_id,
        importado_por: null // Importação automática via webhook
      })
      .select();

    if (error) {
      console.error('❌ Erro ao inserir dados:', error);
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

    console.log('✅ Dados inseridos com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados recebidos e processados com sucesso',
        data: data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
