import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Variaveis de ambiente ausentes.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse({ error: 'Usuario nao autenticado.' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabaseUserClient = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: loggedUser },
      error: loggedUserError,
    } = await supabaseUserClient.auth.getUser();

    if (loggedUserError || !loggedUser) {
      return jsonResponse({ error: 'Sessao invalida.' }, 401);
    }

    const { userId } = await req.json();

    if (!userId) {
      return jsonResponse({ error: 'ID do usuario nao informado.' }, 400);
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, username, auth_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetUserError) {
      console.error('Erro ao buscar usuario alvo:', targetUserError);
      return jsonResponse({ error: 'Erro ao buscar usuario.' }, 500);
    }

    if (!targetUser) {
      return jsonResponse({ error: 'Usuario nao encontrado.' }, 404);
    }

    const targetName = String(targetUser.nome || '').trim().toLowerCase();
    const targetUsername = String(targetUser.username || '').trim().toLowerCase();

    if (targetName === 'desenvolvedor' || targetUsername === 'dev') {
      return jsonResponse(
        { error: 'O acesso do Desenvolvedor e protegido e nao pode ser removido.' },
        403
      );
    }

    const authUserId = String(targetUser.auth_user_id || '').trim();

    if (!authUserId) {
      return jsonResponse(
        { error: 'Usuario sem vinculo com Auth. Verifique o cadastro antes de excluir.' },
        400
      );
    }

    const { error: deleteLinkError } = await supabaseAdmin
      .from('usuario_lojas')
      .delete()
      .eq('usuario_id', userId);

    if (deleteLinkError) {
      console.error('Erro ao excluir vinculos usuario_lojas:', deleteLinkError);
      return jsonResponse({ error: 'Erro ao excluir vinculos do usuario.' }, 500);
    }

    const { error: deleteTableError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (deleteTableError) {
      console.error('Erro ao excluir da tabela usuarios:', deleteTableError);
      return jsonResponse({ error: 'Erro ao excluir usuario da tabela.' }, 500);
    }

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (deleteAuthError) {
      console.error('Erro ao excluir usuario do Auth:', deleteAuthError);
      return jsonResponse(
        { error: 'Usuario removido da tabela, mas nao foi possivel remover do Auth.' },
        500
      );
    }

    return jsonResponse({
      success: true,
      deletedUserId: userId,
      deletedAuthUserId: authUserId,
      deletedCurrentUser: String(loggedUser.id) === String(authUserId),
    });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return jsonResponse({ error: 'Erro inesperado ao excluir usuario.' }, 500);
  }
});
