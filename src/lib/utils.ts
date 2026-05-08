import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utilitário padrão para mesclar classes do Tailwind de forma segura.
// Já está perfeitamente otimizado na memória e não realiza chamadas externas.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}