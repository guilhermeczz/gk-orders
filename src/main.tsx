import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { getRouter } from './router';
import './styles.css';

// OTIMIZAÇÃO: Usa o Singleton (instância única) do router, em vez de criar um novo.
const router = getRouter();

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      {/* BLINDAGEM: Removemos o AppProvider daqui! 
        Ele agora vive exclusivamente no __root.tsx, blindado pela autenticação.
      */}
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}