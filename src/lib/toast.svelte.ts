export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

let nextId = 1;

class Toasts {
  items = $state<Toast[]>([]);

  private push(kind: Toast['kind'], message: string): void {
    const id = nextId++;
    this.items.push({ id, kind, message });
    // Confirmations fade on their own; errors stay until dismissed so nobody misses them.
    if (kind !== 'error') setTimeout(() => this.dismiss(id), 5000);
  }

  success(message: string): void { this.push('success', message); }
  info(message: string): void { this.push('info', message); }
  error(message: string): void { this.push('error', message); }

  dismiss(id: number): void {
    this.items = this.items.filter((toast) => toast.id !== id);
  }
}

export const toast = new Toasts();
