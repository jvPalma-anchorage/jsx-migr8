/**
 * Lightweight dependency injection container implementation
 */

import {
  IServiceContainer,
  ServiceToken,
  ServiceRegistration,
  Constructor,
  Factory,
  ServiceLifecycle,
  ServiceNotFoundError,
  CircularDependencyError,
  IService,
} from './types';

export class ServiceContainer implements IServiceContainer {
  private registrations = new Map<string, ServiceRegistration>();
  private singletonInstances = new Map<string, any>();
  private scopedInstances = new Map<string, any>();
  private resolutionStack: string[] = [];
  private disposed = false;

  constructor(private parent?: ServiceContainer) {}

  // Registration methods
  registerSingleton<T>(token: ServiceToken<T>, implementationOrFactory: Constructor<T> | Factory<T>): void {
    this.ensureNotDisposed();
    
    if (typeof implementationOrFactory === 'function' && implementationOrFactory.prototype) {
      // Constructor function
      this.registrations.set(token.name, {
        token,
        implementation: implementationOrFactory as Constructor<T>,
        lifecycle: 'singleton',
      });
    } else {
      // Factory function
      this.registrations.set(token.name, {
        token,
        factory: implementationOrFactory as Factory<T>,
        lifecycle: 'singleton',
      });
    }
  }

  registerTransient<T>(token: ServiceToken<T>, implementationOrFactory: Constructor<T> | Factory<T>): void {
    this.ensureNotDisposed();
    
    if (typeof implementationOrFactory === 'function' && implementationOrFactory.prototype) {
      // Constructor function
      this.registrations.set(token.name, {
        token,
        implementation: implementationOrFactory as Constructor<T>,
        lifecycle: 'transient',
      });
    } else {
      // Factory function
      this.registrations.set(token.name, {
        token,
        factory: implementationOrFactory as Factory<T>,
        lifecycle: 'transient',
      });
    }
  }

  registerScoped<T>(token: ServiceToken<T>, implementationOrFactory: Constructor<T> | Factory<T>): void {
    this.ensureNotDisposed();
    
    if (typeof implementationOrFactory === 'function' && implementationOrFactory.prototype) {
      // Constructor function
      this.registrations.set(token.name, {
        token,
        implementation: implementationOrFactory as Constructor<T>,
        lifecycle: 'scoped',
      });
    } else {
      // Factory function
      this.registrations.set(token.name, {
        token,
        factory: implementationOrFactory as Factory<T>,
        lifecycle: 'scoped',
      });
    }
  }

  // Resolution methods
  resolve<T>(token: ServiceToken<T>): T {
    this.ensureNotDisposed();
    
    const instance = this.tryResolve(token);
    if (instance === undefined) {
      throw new ServiceNotFoundError(token);
    }
    return instance;
  }

  tryResolve<T>(token: ServiceToken<T>): T | undefined {
    this.ensureNotDisposed();
    
    // Check for circular dependencies
    if (this.resolutionStack.includes(token.name)) {
      throw new CircularDependencyError([...this.resolutionStack, token.name]);
    }

    // Look for registration in current container
    let registration = this.registrations.get(token.name);
    
    // If not found, check parent container
    if (!registration && this.parent) {
      return this.parent.tryResolve(token);
    }

    if (!registration) {
      return undefined;
    }

    // Handle different lifecycle types
    switch (registration.lifecycle) {
      case 'singleton':
        return this.resolveSingleton(registration);
      case 'scoped':
        return this.resolveScoped(registration);
      case 'transient':
      default:
        return this.resolveTransient(registration);
    }
  }

  private resolveSingleton<T>(registration: ServiceRegistration<T>): T {
    const existing = this.singletonInstances.get(registration.token.name);
    if (existing) {
      return existing;
    }

    const instance = this.createInstance(registration);
    this.singletonInstances.set(registration.token.name, instance);
    return instance;
  }

  private resolveScoped<T>(registration: ServiceRegistration<T>): T {
    const existing = this.scopedInstances.get(registration.token.name);
    if (existing) {
      return existing;
    }

    const instance = this.createInstance(registration);
    this.scopedInstances.set(registration.token.name, instance);
    return instance;
  }

  private resolveTransient<T>(registration: ServiceRegistration<T>): T {
    return this.createInstance(registration);
  }

  private createInstance<T>(registration: ServiceRegistration<T>): T {
    this.resolutionStack.push(registration.token.name);

    try {
      let instance: T;

      if (registration.factory) {
        // Use factory function
        instance = registration.factory(this);
      } else if (registration.implementation) {
        // Use constructor with dependency injection
        const dependencies = this.resolveDependencies(registration.dependencies || []);
        instance = new registration.implementation(...dependencies);
      } else {
        throw new Error(`Invalid registration for ${registration.token.name}: no implementation or factory provided`);
      }

      // Initialize service if it implements IService
      if (this.isService(instance)) {
        instance.initialize?.();
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  private resolveDependencies(dependencies: ServiceToken<any>[]): any[] {
    return dependencies.map(dep => this.resolve(dep));
  }

  private isService(obj: any): obj is IService {
    return obj && (typeof obj.initialize === 'function' || typeof obj.dispose === 'function');
  }

  // Container management
  createScope(): IServiceContainer {
    this.ensureNotDisposed();
    return new ServiceContainer(this);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    // Dispose all scoped instances
    for (const instance of this.scopedInstances.values()) {
      if (this.isService(instance) && instance.dispose) {
        try {
          await instance.dispose();
        } catch (error) {
          console.warn('Error disposing scoped service:', error);
        }
      }
    }

    // Dispose all singleton instances (only if this is the root container)
    if (!this.parent) {
      for (const instance of this.singletonInstances.values()) {
        if (this.isService(instance) && instance.dispose) {
          try {
            await instance.dispose();
          } catch (error) {
            console.warn('Error disposing singleton service:', error);
          }
        }
      }
    }

    this.scopedInstances.clear();
    this.registrations.clear();
    this.disposed = true;
  }

  // Introspection
  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token.name) || (this.parent?.isRegistered(token) ?? false);
  }

  getRegistrations(): ServiceRegistration[] {
    const registrations = Array.from(this.registrations.values());
    if (this.parent) {
      registrations.push(...this.parent.getRegistrations());
    }
    return registrations;
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error('Cannot use disposed service container');
    }
  }
}

// Factory function for creating a new container
export function createContainer(): IServiceContainer {
  return new ServiceContainer();
}

// Utility functions for service registration
export class ServiceRegistrationBuilder<T> {
  constructor(
    private container: IServiceContainer,
    private token: ServiceToken<T>
  ) {}

  asSingleton(implementationOrFactory: Constructor<T> | Factory<T>): void {
    this.container.registerSingleton(this.token, implementationOrFactory);
  }

  asTransient(implementationOrFactory: Constructor<T> | Factory<T>): void {
    this.container.registerTransient(this.token, implementationOrFactory);
  }

  asScoped(implementationOrFactory: Constructor<T> | Factory<T>): void {
    this.container.registerScoped(this.token, implementationOrFactory);
  }
}

// Helper function for fluent registration
export function register<T>(container: IServiceContainer, token: ServiceToken<T>): ServiceRegistrationBuilder<T> {
  return new ServiceRegistrationBuilder(container, token);
}