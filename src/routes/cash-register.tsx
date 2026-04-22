import { createFileRoute } from '@tanstack/react-router';
import { CashRegisterPage } from '@/components/CashRegisterPage';

export const Route = createFileRoute('/cash-register')({
  component: CashRegisterPage,
});