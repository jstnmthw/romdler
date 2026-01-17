import type {
  ArtworkAdapter,
  AdapterFactory,
  AdapterSourceConfig,
  LookupParams,
  ArtworkLookupResult,
} from './types.js';

/**
 * Registry for artwork adapter factories.
 * Manages adapter registration and instantiation.
 */
export class AdapterRegistry {
  private factories: Map<string, AdapterFactory> = new Map();
  private instances: Map<string, ArtworkAdapter> = new Map();

  /**
   * Register an adapter factory
   * @param id Unique adapter identifier
   * @param factory Factory function to create adapter instances
   */
  register(id: string, factory: AdapterFactory): void {
    this.factories.set(id, factory);
  }

  /**
   * Check if an adapter is registered
   * @param id Adapter identifier
   */
  has(id: string): boolean {
    return this.factories.has(id);
  }

  /**
   * Get or create an adapter instance
   * @param id Adapter identifier
   * @param options Adapter-specific options
   */
  get(id: string, options?: Record<string, unknown>): ArtworkAdapter | undefined {
    // Return cached instance if available
    if (this.instances.has(id)) {
      return this.instances.get(id);
    }

    // Create new instance from factory
    const factory = this.factories.get(id);
    if (factory === undefined) {
      return undefined;
    }

    const instance = factory(options);
    this.instances.set(id, instance);
    return instance;
  }

  /**
   * Get all registered adapter IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get enabled adapters sorted by priority
   * @param configs Source configurations
   */
  getEnabledAdapters(configs: AdapterSourceConfig[]): ArtworkAdapter[] {
    const enabledConfigs = configs.filter((c) => c.enabled).sort((a, b) => a.priority - b.priority);

    const adapters: ArtworkAdapter[] = [];

    for (const config of enabledConfigs) {
      const adapter = this.get(config.id, config.options);
      if (adapter !== undefined) {
        adapters.push(adapter);
      }
    }

    return adapters;
  }

  /**
   * Initialize all enabled adapters
   * @param configs Source configurations
   * @returns Map of adapter ID to initialization success
   */
  async initializeAll(configs: AdapterSourceConfig[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const adapters = this.getEnabledAdapters(configs);

    for (const adapter of adapters) {
      try {
        const success = await adapter.initialize();
        results.set(adapter.id, success);
      } catch {
        results.set(adapter.id, false);
      }
    }

    return results;
  }

  /**
   * Try adapters in priority order until artwork is found
   * @param params Lookup parameters
   * @param configs Source configurations
   * @returns First successful lookup result, or null if none found
   */
  async lookupWithFallback(
    params: LookupParams,
    configs: AdapterSourceConfig[]
  ): Promise<{ result: ArtworkLookupResult; adapterId: string } | null> {
    const adapters = this.getEnabledAdapters(configs);

    for (const adapter of adapters) {
      // Skip if adapter doesn't support this system
      if (!adapter.supportsSystem(params.systemId)) {
        continue;
      }

      try {
        const result = await adapter.lookup(params);

        if (result !== null && result.found && result.mediaUrl !== undefined) {
          return { result, adapterId: adapter.id };
        }
      } catch {
        // Continue to next adapter on error
        continue;
      }
    }

    return null;
  }

  /**
   * Dispose all adapter instances
   */
  async disposeAll(): Promise<void> {
    for (const adapter of this.instances.values()) {
      if (adapter.dispose !== undefined) {
        await adapter.dispose();
      }
    }
    this.instances.clear();
  }
}

/** Global adapter registry instance */
export const adapterRegistry = new AdapterRegistry();
