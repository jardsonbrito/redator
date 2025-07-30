import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  nome_completo: string;
  email: string;
  role: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { nome_completo, email, role }: RequestBody = await req.json();

    console.log('Criando professor:', { nome_completo, email, role });

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar se é admin (usando o client normal para verificar a sessão atual)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'authorization_required', message: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário logado é admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_token', message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin principal
    const isMainAdmin = user.email === 'jardsonbrito@gmail.com' || user.email === 'jarvisluz@gmail.com';
    if (!isMainAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'access_denied', message: 'Acesso negado: apenas administradores podem criar professores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se email já existe na tabela professores
    const { data: existingProfessor } = await supabaseAdmin
      .from('professores')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingProfessor) {
      return new Response(
        JSON.stringify({ success: false, error: 'email_exists', message: 'Este e-mail já está sendo usado por outro professor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Criando usuário no Auth...');

    // Criar usuário no Supabase Auth usando Admin API
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: '123456',
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        nome_completo: nome_completo.trim()
      }
    });

    if (createUserError) {
      console.error('Erro ao criar usuário no Auth:', createUserError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'auth_creation_failed', 
          message: `Erro ao criar usuário no Auth: ${createUserError.message}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário criado no Auth:', authUser.user?.id);

    // Inserir professor na tabela professores
    const { error: insertError } = await supabaseAdmin
      .from('professores')
      .insert({
        id: authUser.user.id,
        nome_completo: nome_completo.trim(),
        email: email.toLowerCase().trim(),
        role: role,
        senha_hash: '123456',
        primeiro_login: true,
        ativo: true
      });

    if (insertError) {
      console.error('Erro ao inserir professor na tabela:', insertError);
      
      // Se falhou ao inserir na tabela, tentar limpar o usuário criado no Auth
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log('Usuário removido do Auth devido a erro na inserção');
      } catch (cleanupError) {
        console.error('Erro ao fazer cleanup do usuário:', cleanupError);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'database_insertion_failed', 
          message: `Erro ao salvar professor: ${insertError.message}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Professor criado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Professor criado com sucesso',
        user_id: authUser.user.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'internal_error', 
        message: `Erro interno: ${error.message}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});