import { supabase } from '@/integrations/supabase/client';

const EDGE_FUNCTION_URL =
  'https://kgmxntpmvlnbftjqtyxx.supabase.co/functions/v1/sync-to-blog';

export type BlogSyncTable = 'temas' | 'videos' | 'redacoes';
export type BlogSyncAction = 'sync' | 'unsync';

export interface BlogSyncResult {
  success: boolean;
  blogPostId?: string;
  error?: string;
}

/**
 * Sincroniza um registro do App com o Blog.
 *
 * Fluxo:
 *  1. Obtém token de uso único via RPC create_admin_sync_token (server-side)
 *  2. Chama a Edge Function sync-to-blog com o token no header Authorization
 *  3. Retorna sucesso/erro e o blog_post_id gerado
 */
export async function syncToBlog(params: {
  adminEmail: string;
  table: BlogSyncTable;
  recordId: string;
  action: BlogSyncAction;
}): Promise<BlogSyncResult> {
  const { adminEmail, table, recordId, action } = params;

  // 1. Solicitar token efêmero (10 min, uso único)
  const { data: tokenData, error: tokenError } = await supabase.rpc(
    'create_admin_sync_token',
    { p_admin_email: adminEmail }
  );

  if (tokenError) {
    return { success: false, error: `Erro ao obter token: ${tokenError.message}` };
  }
  if (!tokenData?.success) {
    return { success: false, error: tokenData?.error ?? 'Falha na autenticação.' };
  }

  // 2. Chamar Edge Function com o token
  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.token}`,
      },
      body: JSON.stringify({ table, record_id: recordId, action }),
    });
  } catch (fetchError: unknown) {
    const msg = fetchError instanceof Error ? fetchError.message : 'Erro de rede.';
    return { success: false, error: msg };
  }

  let result: { success?: boolean; blog_post_id?: string; error?: string };
  try {
    result = await response.json();
  } catch {
    return { success: false, error: 'Resposta inválida da função de sincronização.' };
  }

  if (!response.ok || !result.success) {
    return { success: false, error: result.error ?? 'Erro desconhecido na sincronização.' };
  }

  return { success: true, blogPostId: result.blog_post_id };
}
