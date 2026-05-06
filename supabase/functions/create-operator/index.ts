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

function normalizeUsername(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .trim();
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        success: false,
        error: 'Configuração da função incompleta no Supabase.',
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();

    const nome = String(body.nome || '').trim();
    const username = normalizeUsername(body.username || '');
    const senha = String(body.senha || '');
    const lojaId = String(body.lojaId || '').trim();
    const perfil = String(body.perfil || 'operador').trim();

    if (!nome || !username || !senha || !lojaId) {
      return jsonResponse({
        success: false,
        error: 'Informe nome, usuário, senha e loja.',
      });
    }

    if (senha.length < 6) {
      return jsonResponse({
        success: false,
        error: 'A senha precisa ter no mínimo 6 caracteres.',
      });
    }

    const { data: existingUsuario, error: existingUsuarioError } =
      await supabaseAdmin
        .from('usuarios')
        .select('id, username, auth_user_id')
        .eq('username', username)
        .maybeSingle();

    if (existingUsuarioError) {
      console.error('Erro ao validar usuário existente:', existingUsuarioError);

      return jsonResponse({
        success: false,
        error: 'Não foi possível validar se o usuário já existe.',
      });
    }

    if (existingUsuario) {
      return jsonResponse({
        success: false,
        error: 'Este usuário já existe. Use outro nome de usuário.',
      });
    }

    const email = `${username}@gk.com`;

    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          full_name: nome,
          username,
        },
      });

    if (createError) {
      const message = String(createError.message || '').toLowerCase();

      if (
        message.includes('already') ||
        message.includes('registered') ||
        message.includes('exists')
      ) {
        return jsonResponse({
          success: false,
          error:
            'Este usuário já existe no Auth. Apague ele no Supabase Auth ou use outro nome de usuário.',
        });
      }

      console.error('Erro ao criar usuário no Auth:', createError);

      return jsonResponse({
        success: false,
        error: createError.message || 'Erro ao criar usuário no Auth.',
      });
    }

    const authUserId = createdUser.user?.id;

    if (!authUserId) {
      return jsonResponse({
        success: false,
        error: 'Usuário criado sem ID no Auth.',
      });
    }

    const { data: insertedUsuario, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          nome,
          username,
          loja_id: lojaId,
          perfil,
          ativo: true,
          auth_user_id: authUserId,
        },
      ])
      .select('id')
      .single();

    if (usuarioError) {
      console.error('Erro ao salvar usuário na tabela usuarios:', usuarioError);

      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return jsonResponse({
        success: false,
        error:
          usuarioError.message ||
          'Usuário criado no Auth, mas não foi salvo na tabela usuarios.',
      });
    }

    const { error: vinculoError } = await supabaseAdmin
      .from('usuario_lojas')
      .upsert(
        [
          {
            usuario_id: insertedUsuario.id,
            loja_id: lojaId,
            perfil,
            ativo: true,
          },
        ],
        {
          onConflict: 'usuario_id,loja_id',
        }
      );

    if (vinculoError) {
      console.error('Erro ao criar vínculo usuario_lojas:', vinculoError);

      await supabaseAdmin.from('usuarios').delete().eq('id', insertedUsuario.id);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return jsonResponse({
        success: false,
        error:
          vinculoError.message ||
          'Usuário criado, mas não foi possível vincular à loja.',
      });
    }

    return jsonResponse({
      success: true,
      authUserId,
      usuarioId: insertedUsuario.id,
      message: 'Operador criado com sucesso.',
    });
  } catch (error) {
    console.error('Erro inesperado na create-operator:', error);

    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Erro inesperado.',
    });
  }
});