import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  const handleRetry = () => {
    try {
      reset();
      router.invalidate();
    } catch (err) {
      console.error("Error while recovering router:", err);
      reset();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl">⚠️</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Algo deu errado
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente.
        </p>

        {import.meta.env.DEV && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-destructive">
            {error?.message}
          </pre>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={handleRetry}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>

          <a
            href="/"
            className="rounded-md border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Início
          </a>
        </div>

      </div>
    </div>
  );
}

// 🔥 SINGLETON (IMPORTANTE)
// Mantém uma única instância de roteamento na memória do navegador.
let routerInstance: ReturnType<typeof createRouter> | null = null;

export const getRouter = () => {
  if (!routerInstance) {
    routerInstance = createRouter({
      routeTree,
      context: {},
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: DefaultErrorComponent,
    });
  }

  return routerInstance;
};

// Declaração de módulo do TanStack Router para tipagem segura no TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}