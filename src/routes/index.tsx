// @ts-ignore
import React from 'react';

if (typeof window !== 'undefined' && !window.crypto.randomUUID) {
  // @ts-ignore
  window.crypto.randomUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  Loader2,
  UserRound,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  LockKeyhole,
} from 'lucide-react';

export const Route = createFileRoute('/')({
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleLogin = async () => {
    if (!loginUser.trim() || !loginPass.trim()) {
      toast.error('Preencha usuário e senha.');
      return;
    }

    setLoading(true);

    try {
      const success = await login(loginUser.trim(), loginPass);

      if (success) {
        navigate({ to: '/dashboard' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white px-12 py-4 text-[15px] font-medium text-black outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/15';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Fundo visual abstrato GK Orders */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,106,0,0.28),transparent_32%),radial-gradient(circle_at_80%_75%,rgba(255,180,80,0.12),transparent_32%),linear-gradient(135deg,#050505_0%,#0d0d10_48%,#050505_100%)]" />

        <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20" />
        <div className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

        <div className="absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute -right-32 bottom-20 h-[420px] w-[420px] rounded-full bg-orange-400/10 blur-[130px]" />

        <div className="absolute inset-0 opacity-[0.055] bg-[linear-gradient(to_right,rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.9)_1px,transparent_1px)] bg-[size:76px_76px]" />

        <div className="absolute left-[7%] top-[18%] hidden select-none text-[230px] font-black leading-none tracking-[-0.12em] text-white/[0.035] lg:block">
          GK
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_430px]">
          {/* Área de marca, sem cards */}
          <section className="hidden lg:block">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-4 rounded-[1.7rem] border border-white/10 bg-white/[0.045] px-5 py-4 shadow-2xl backdrop-blur-xl">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-primary text-2xl font-black text-black shadow-[0_0_45px_rgba(255,106,0,0.35)]">
                  GK
                </div>

                <div>
                  <p className="text-[30px] font-semibold tracking-tight text-white">
                    GK Orders
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                    Sistema operacional
                  </p>
                </div>
              </div>

              <div className="mt-16">
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Acesso seguro
                </p>

                <h1 className="max-w-2xl text-[54px] font-semibold leading-[1.04] tracking-[-0.04em] text-white">
                  A gestão da sua operação começa aqui.
                </h1>

                <p className="mt-6 max-w-xl text-[17px] leading-8 text-gray-400">
                  Entre no GK Orders para acessar sua loja, acompanhar sua operação
                  e manter tudo organizado em um ambiente moderno e seguro.
                </p>
              </div>

              <div className="mt-12 flex items-center gap-3 text-sm font-medium text-gray-400">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]" />
                Plataforma online e protegida
              </div>
            </div>
          </section>

          {/* Login */}
          <section className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary text-4xl font-black text-black shadow-[0_0_45px_rgba(255,106,0,0.35)]">
                GK
              </div>

              <h1 className="text-3xl font-semibold tracking-tight">GK Orders</h1>
              <p className="mt-2 text-sm text-gray-400">
                Sistema operacional da sua loja.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-primary/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2.3rem] border border-white/10 bg-white/[0.07] shadow-[0_35px_140px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
                <div className="border-b border-white/10 bg-black/25 px-7 py-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-primary text-2xl font-black text-black shadow-[0_0_40px_rgba(255,106,0,0.32)]">
                      GK
                    </div>

                    <div>
                      <p className="text-[27px] font-semibold tracking-tight text-white">
                        GK Orders
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                        Login
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-[30px] font-semibold tracking-tight text-white">
                      Bem-vindo
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Acesse sua conta para continuar.
                    </p>
                  </div>
                </div>

                <div className="px-7 py-7">
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LockKeyhole className="h-4.5 w-4.5" />
                    </div>

                    <p className="text-sm font-medium text-gray-300">
                      Acesso exclusivo para usuários autorizados.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Usuário
                      </label>

                      <div className="relative">
                        <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={loginUser}
                          onChange={(e) => setLoginUser(e.target.value)}
                          placeholder="Digite seu usuário"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Senha
                      </label>

                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          type="password"
                          placeholder="Digite sua senha"
                          className={inputClass}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-black shadow-[0_0_32px_rgba(255,106,0,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_46px_rgba(255,106,0,0.48)] active:scale-[0.99] disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Acessar sistema
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-5 text-center">
                    <p className="text-xs text-gray-500">
                      © {new Date().getFullYear()} GK Orders. Todos os direitos reservados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}