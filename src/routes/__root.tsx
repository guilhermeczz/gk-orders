import React from "react";
import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AppProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";

import "../styles.css";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <AppProvider>
        <Outlet />

        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            classNames: {
              toast:
                "rounded-xl border shadow-xl font-medium",
              title:
                "font-black",
              description:
                "font-medium",
              success:
                "bg-green-600 text-white border-green-500",
              error:
                "bg-red-600 text-white border-red-500",
              warning:
                "bg-yellow-500 text-black border-yellow-400",
              info:
                "bg-blue-600 text-white border-blue-500",
            },
          }}
        />
      </AppProvider>
    </AuthProvider>
  );
}