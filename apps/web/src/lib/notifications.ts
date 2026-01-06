import { toast } from '@/hooks/use-toast';

const DEFAULT_DURATION = 5000;

interface ToastOptions {
  description?: string;
  duration?: number;
}

export function showSuccess(title: string, options?: ToastOptions | string) {
  const opts = typeof options === 'string' ? { description: options } : options;
  return toast({
    title,
    description: opts?.description,
    variant: 'success',
    duration: opts?.duration ?? DEFAULT_DURATION,
  });
}

export function showError(title: string, options?: ToastOptions | string) {
  const opts = typeof options === 'string' ? { description: options } : options;
  return toast({
    title,
    description: opts?.description,
    variant: 'destructive',
    duration: opts?.duration ?? DEFAULT_DURATION,
  });
}

export function showWarning(title: string, options?: ToastOptions | string) {
  const opts = typeof options === 'string' ? { description: options } : options;
  return toast({
    title,
    description: opts?.description,
    variant: 'warning',
    duration: opts?.duration ?? DEFAULT_DURATION,
  });
}

export function showInfo(title: string, options?: ToastOptions | string) {
  const opts = typeof options === 'string' ? { description: options } : options;
  return toast({
    title,
    description: opts?.description,
    variant: 'info',
    duration: opts?.duration ?? DEFAULT_DURATION,
  });
}

export function showLoading(title: string): () => void {
  const { dismiss } = toast({
    title,
    variant: 'default',
    duration: Infinity,
  });
  return dismiss;
}
