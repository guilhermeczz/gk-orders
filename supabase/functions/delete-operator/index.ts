import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente ausentes.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
      return new Response(
        JSON.stringify({ error: 'Sessão inválida.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário não informado.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, username')
      .eq('id', userId)
      .maybeSingle();

    if (targetUserError) {
      console.error('Erro ao buscar usuário alvo:', targetUserError);

      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuário.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const targetName = String(targetUser.nome || '').trim().toLowerCase();
    const targetUsername = String(targetUser.username || '').trim().toLowerCase();

    if (targetName === 'desenvolvedor' || targetUsername === 'dev') {
      return new Response(
        JSON.stringify({
          error: 'O acesso do Desenvolvedor é protegido e não pode ser removido.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: deleteTableError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (deleteTableError) {
      console.error('Erro ao excluir da tabela usuarios:', deleteTableError);

      return new Response(
        JSON.stringify({ error: 'Erro ao excluir usuário da tabela.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Erro ao excluir usuário do Auth:', deleteAuthError);

      return new Response(
        JSON.stringify({
          error:
            'Usuário removido da tabela, mas não foi possível remover do Auth.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedUserId: userId,
        deletedCurrentUser: String(loggedUser.id) === String(userId),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro inesperado:', error);

    return new Response(
      JSON.stringify({ error: 'Erro inesperado ao excluir usuário.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});