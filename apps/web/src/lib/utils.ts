import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
