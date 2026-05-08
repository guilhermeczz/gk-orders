import { createFileRoute } from '@tanstack/react-router';
import { CashRegisterPage } from '@/components/CashRegisterPage';

// Arquivo de rota 100% otimizado. 
// A lógica multi-loja e de banco de dados fica toda dentro do componente CashRegisterPage.
export const Route = createFileRoute('/cash-register')({
  component: CashRegisterPage,
});