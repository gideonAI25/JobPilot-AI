import { JobSourceAdapter } from './types';
import { JobicyAdapter } from './adapters/jobicyAdapter';
import { WeWorkRemotelyAdapter } from './adapters/weWorkRemotelyAdapter';
import { RemotiveAdapter } from './adapters/remotiveAdapter';

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

  /**
   * Registers all standard production adapters into the registry.
   */
  public registerDefaults(): void {
    this.register(new JobicyAdapter());
    this.register(new WeWorkRemotelyAdapter());
    this.register(new RemotiveAdapter());
  }
}

export const adapterRegistry = new AdapterRegistry();

// Initialize default permitted job source adapters
adapterRegistry.registerDefaults();
