import { JobSourceAdapter } from './types';

class AdapterRegistry {
  private adapters = new Map<string, JobSourceAdapter>();

  public register(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.metadata.id, adapter);
  }

  public get(id: string): JobSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAll(): JobSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  public clear(): void {
    this.adapters.clear();
  }
}

export const adapterRegistry = new AdapterRegistry();
