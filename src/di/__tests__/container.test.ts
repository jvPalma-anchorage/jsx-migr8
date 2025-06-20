/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import {
  ServiceContainer,
  createContainer,
  ServiceRegistrationBuilder,
  register,
} from '../container';
import {
  ServiceToken,
  ServiceNotFoundError,
  CircularDependencyError,
  IService,
} from '../types';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(async () => {
    await container.dispose();
  });

  describe('constructor', () => {
    it('should create container without parent', () => {
      const newContainer = new ServiceContainer();
      expect(newContainer).toBeInstanceOf(ServiceContainer);
    });

    it('should create container with parent', () => {
      const parent = new ServiceContainer();
      const child = new ServiceContainer(parent);
      expect(child).toBeInstanceOf(ServiceContainer);
    });
  });

  describe('singleton registration and resolution', () => {
    it('should register and resolve singleton service with constructor', () => {
      class TestService {
        constructor(public value: string = 'test') {}
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerSingleton(token, TestService);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).toBeInstanceOf(TestService);
      expect(instance1.value).toBe('test');
      expect(instance1).toBe(instance2); // Same instance
    });

    it('should register and resolve singleton service with factory', () => {
      interface TestService {
        getValue(): string;
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      const factory = jest.fn(() => ({
        getValue: () => 'factory-value',
      }));

      container.registerSingleton(token, factory);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1.getValue()).toBe('factory-value');
      expect(instance1).toBe(instance2); // Same instance
      expect(factory).toHaveBeenCalledTimes(1); // Factory called only once
      expect(factory).toHaveBeenCalledWith(container);
    });

    it('should handle singleton service with dependencies', () => {
      class DependencyService {
        getValue() { return 'dependency'; }
      }

      class MainService {
        constructor(private dependency: DependencyService) {}
        getValue() { return this.dependency.getValue(); }
      }

      const depToken: ServiceToken<DependencyService> = { name: 'DependencyService' };
      const mainToken: ServiceToken<MainService> = { name: 'MainService' };

      container.registerSingleton(depToken, DependencyService);
      container.registerSingleton(mainToken, () => new MainService(container.resolve(depToken)));

      const instance = container.resolve(mainToken);
      expect(instance.getValue()).toBe('dependency');
    });
  });

  describe('transient registration and resolution', () => {
    it('should register and resolve transient service with constructor', () => {
      class TestService {
        constructor(public id: number = Math.random()) {}
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerTransient(token, TestService);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).toBeInstanceOf(TestService);
      expect(instance2).toBeInstanceOf(TestService);
      expect(instance1).not.toBe(instance2); // Different instances
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should register and resolve transient service with factory', () => {
      interface TestService {
        getId(): number;
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      const factory = jest.fn(() => ({
        getId: () => Math.random(),
      }));

      container.registerTransient(token, factory);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).not.toBe(instance2); // Different instances
      expect(factory).toHaveBeenCalledTimes(2); // Factory called for each instance
      expect(factory).toHaveBeenCalledWith(container);
    });
  });

  describe('scoped registration and resolution', () => {
    it('should register and resolve scoped service', () => {
      class TestService {
        constructor(public id: number = Math.random()) {}
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerScoped(token, TestService);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).toBeInstanceOf(TestService);
      expect(instance1).toBe(instance2); // Same instance within scope
    });

    it('should create different instances in different scopes', () => {
      class TestService {
        constructor(public id: number = Math.random()) {}
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerScoped(token, TestService);

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const instance1 = scope1.resolve(token);
      const instance2 = scope2.resolve(token);

      expect(instance1).toBeInstanceOf(TestService);
      expect(instance2).toBeInstanceOf(TestService);
      expect(instance1).not.toBe(instance2); // Different instances in different scopes
    });
  });

  describe('tryResolve', () => {
    it('should return undefined for unregistered service', () => {
      const token: ServiceToken<any> = { name: 'UnregisteredService' };
      const result = container.tryResolve(token);
      expect(result).toBeUndefined();
    });

    it('should return instance for registered service', () => {
      class TestService {}
      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerSingleton(token, TestService);

      const result = container.tryResolve(token);
      expect(result).toBeInstanceOf(TestService);
    });

    it('should resolve from parent container', () => {
      class TestService {}
      const token: ServiceToken<TestService> = { name: 'TestService' };
      
      const parent = new ServiceContainer();
      parent.registerSingleton(token, TestService);
      
      const child = new ServiceContainer(parent);
      
      const result = child.tryResolve(token);
      expect(result).toBeInstanceOf(TestService);
    });
  });

  describe('resolve', () => {
    it('should throw ServiceNotFoundError for unregistered service', () => {
      const token: ServiceToken<any> = { name: 'UnregisteredService' };
      
      expect(() => container.resolve(token)).toThrow(ServiceNotFoundError);
      expect(() => container.resolve(token)).toThrow('Service not found: UnregisteredService');
    });

    it('should resolve registered service', () => {
      class TestService {}
      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerSingleton(token, TestService);

      const result = container.resolve(token);
      expect(result).toBeInstanceOf(TestService);
    });
  });

  describe('circular dependency detection', () => {
    it('should detect circular dependencies', () => {
      const tokenA: ServiceToken<any> = { name: 'ServiceA' };
      const tokenB: ServiceToken<any> = { name: 'ServiceB' };

      container.registerSingleton(tokenA, () => container.resolve(tokenB));
      container.registerSingleton(tokenB, () => container.resolve(tokenA));

      expect(() => container.resolve(tokenA)).toThrow(CircularDependencyError);
    });

    it('should provide detailed circular dependency chain', () => {
      const tokenA: ServiceToken<any> = { name: 'ServiceA' };
      const tokenB: ServiceToken<any> = { name: 'ServiceB' };
      const tokenC: ServiceToken<any> = { name: 'ServiceC' };

      container.registerSingleton(tokenA, () => container.resolve(tokenB));
      container.registerSingleton(tokenB, () => container.resolve(tokenC));
      container.registerSingleton(tokenC, () => container.resolve(tokenA));

      try {
        container.resolve(tokenA);
        fail('Expected CircularDependencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError);
        expect(error.message).toContain('ServiceA -> ServiceB -> ServiceC -> ServiceA');
      }
    });
  });

  describe('service lifecycle', () => {
    it('should call initialize on services that implement IService', () => {
      class TestService implements IService {
        initialize = jest.fn();
        dispose = jest.fn();
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerSingleton(token, TestService);

      const instance = container.resolve(token);
      expect(instance.initialize).toHaveBeenCalled();
    });

    it('should not call initialize on services that do not implement IService', () => {
      class TestService {
        initialize = jest.fn();
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerSingleton(token, TestService);

      const instance = container.resolve(token);
      // Should not call initialize because it doesn't implement IService interface
      // (no dispose method)
      expect(instance.initialize).not.toHaveBeenCalled();
    });

    it('should handle services without initialize method', () => {
      class TestService implements IService {
        dispose = jest.fn();
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerSingleton(token, TestService);

      expect(() => container.resolve(token)).not.toThrow();
    });
  });

  describe('disposal', () => {
    it('should dispose scoped services', async () => {
      class TestService implements IService {
        initialize = jest.fn();
        dispose = jest.fn();
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerScoped(token, TestService);

      const instance = container.resolve(token);
      await container.dispose();

      expect(instance.dispose).toHaveBeenCalled();
    });

    it('should dispose singleton services only in root container', async () => {
      class TestService implements IService {
        initialize = jest.fn();
        dispose = jest.fn();
      }

      const token: ServiceToken<TestService> = { name: 'TestService' };
      
      const parent = new ServiceContainer();
      parent.registerSingleton(token, TestService);
      
      const child = new ServiceContainer(parent);
      
      const parentInstance = parent.resolve(token);
      const childInstance = child.resolve(token);
      
      expect(parentInstance).toBe(childInstance); // Same singleton instance
      
      await child.dispose();
      expect(parentInstance.dispose).not.toHaveBeenCalled(); // Not disposed by child
      
      await parent.dispose();
      expect(parentInstance.dispose).toHaveBeenCalled(); // Disposed by parent
    });

    it('should handle disposal errors gracefully', async () => {
      class TestService implements IService {
        initialize = jest.fn();
        dispose = jest.fn().mockRejectedValue(new Error('Disposal failed'));
      }

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const token: ServiceToken<TestService> = { name: 'TestService' };
      container.registerScoped(token, TestService);

      container.resolve(token);
      await container.dispose();

      expect(consoleSpy).toHaveBeenCalledWith('Error disposing scoped service:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should prevent operations after disposal', async () => {
      await container.dispose();

      expect(() => container.resolve({ name: 'TestService' })).toThrow('Cannot use disposed service container');
      expect(() => container.registerSingleton({ name: 'TestService' }, class {})).toThrow('Cannot use disposed service container');
      expect(() => container.createScope()).toThrow('Cannot use disposed service container');
    });

    it('should allow multiple dispose calls', async () => {
      await container.dispose();
      await expect(container.dispose()).resolves.not.toThrow();
    });
  });

  describe('introspection', () => {
    it('should check if service is registered', () => {
      class TestService {}
      const token: ServiceToken<TestService> = { name: 'TestService' };

      expect(container.isRegistered(token)).toBe(false);
      
      container.registerSingleton(token, TestService);
      expect(container.isRegistered(token)).toBe(true);
    });

    it('should check parent container for registrations', () => {
      class TestService {}
      const token: ServiceToken<TestService> = { name: 'TestService' };
      
      const parent = new ServiceContainer();
      parent.registerSingleton(token, TestService);
      
      const child = new ServiceContainer(parent);
      
      expect(child.isRegistered(token)).toBe(true);
    });

    it('should get all registrations', () => {
      class ServiceA {}
      class ServiceB {}
      
      const tokenA: ServiceToken<ServiceA> = { name: 'ServiceA' };
      const tokenB: ServiceToken<ServiceB> = { name: 'ServiceB' };
      
      container.registerSingleton(tokenA, ServiceA);
      container.registerTransient(tokenB, ServiceB);
      
      const registrations = container.getRegistrations();
      expect(registrations).toHaveLength(2);
      expect(registrations.map(r => r.token.name)).toEqual(['ServiceA', 'ServiceB']);
    });

    it('should include parent registrations', () => {
      class ServiceA {}
      class ServiceB {}
      
      const tokenA: ServiceToken<ServiceA> = { name: 'ServiceA' };
      const tokenB: ServiceToken<ServiceB> = { name: 'ServiceB' };
      
      const parent = new ServiceContainer();
      parent.registerSingleton(tokenA, ServiceA);
      
      const child = new ServiceContainer(parent);
      child.registerTransient(tokenB, ServiceB);
      
      const registrations = child.getRegistrations();
      expect(registrations).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle registration without implementation or factory', () => {
      const token: ServiceToken<any> = { name: 'TestService' };
      
      // Manually create invalid registration
      (container as any).registrations.set(token.name, {
        token,
        lifecycle: 'singleton',
      });

      expect(() => container.resolve(token)).toThrow('Invalid registration for TestService: no implementation or factory provided');
    });

    it('should distinguish between constructor and factory functions', () => {
      class TestService {
        static create() { return new TestService(); }
      }

      const arrowFunction = () => ({ value: 'arrow' });
      const regularFunction = function() { return ({ value: 'regular' }); };

      const token1: ServiceToken<any> = { name: 'TestService1' };
      const token2: ServiceToken<any> = { name: 'TestService2' };
      const token3: ServiceToken<any> = { name: 'TestService3' };

      container.registerSingleton(token1, TestService); // Constructor
      container.registerSingleton(token2, arrowFunction); // Factory
      container.registerSingleton(token3, regularFunction); // Factory

      expect(container.resolve(token1)).toBeInstanceOf(TestService);
      expect(container.resolve(token2)).toEqual({ value: 'arrow' });
      expect(container.resolve(token3)).toEqual({ value: 'regular' });
    });

    it('should handle constructor that throws during instantiation', () => {
      class FailingService {
        constructor() {
          throw new Error('Constructor failed');
        }
      }

      const token: ServiceToken<FailingService> = { name: 'FailingService' };
      container.registerSingleton(token, FailingService);

      expect(() => container.resolve(token)).toThrow('Constructor failed');
    });

    it('should handle factory that throws during creation', () => {
      const token: ServiceToken<any> = { name: 'FailingService' };
      const failingFactory = jest.fn(() => {
        throw new Error('Factory failed');
      });

      container.registerSingleton(token, failingFactory);

      expect(() => container.resolve(token)).toThrow('Factory failed');
    });
  });

  describe('createScope', () => {
    it('should create child container', () => {
      const scope = container.createScope();
      expect(scope).toBeInstanceOf(ServiceContainer);
      expect(scope).not.toBe(container);
    });

    it('should inherit parent registrations', () => {
      class TestService {}
      const token: ServiceToken<TestService> = { name: 'TestService' };
      
      container.registerSingleton(token, TestService);
      const scope = container.createScope();
      
      expect(scope.isRegistered(token)).toBe(true);
      expect(scope.resolve(token)).toBeInstanceOf(TestService);
    });
  });
});

describe('ServiceRegistrationBuilder', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(async () => {
    await container.dispose();
  });

  it('should register service as singleton', () => {
    class TestService {}
    const token: ServiceToken<TestService> = { name: 'TestService' };
    
    const builder = new ServiceRegistrationBuilder(container, token);
    builder.asSingleton(TestService);
    
    const instance1 = container.resolve(token);
    const instance2 = container.resolve(token);
    
    expect(instance1).toBe(instance2);
  });

  it('should register service as transient', () => {
    class TestService {}
    const token: ServiceToken<TestService> = { name: 'TestService' };
    
    const builder = new ServiceRegistrationBuilder(container, token);
    builder.asTransient(TestService);
    
    const instance1 = container.resolve(token);
    const instance2 = container.resolve(token);
    
    expect(instance1).not.toBe(instance2);
  });

  it('should register service as scoped', () => {
    class TestService {}
    const token: ServiceToken<TestService> = { name: 'TestService' };
    
    const builder = new ServiceRegistrationBuilder(container, token);
    builder.asScoped(TestService);
    
    const instance1 = container.resolve(token);
    const instance2 = container.resolve(token);
    
    expect(instance1).toBe(instance2); // Same in scope
  });
});

describe('utility functions', () => {
  describe('createContainer', () => {
    it('should create new container instance', () => {
      const container = createContainer();
      expect(container).toBeInstanceOf(ServiceContainer);
    });
  });

  describe('register', () => {
    it('should return ServiceRegistrationBuilder', () => {
      const container = createContainer();
      const token: ServiceToken<any> = { name: 'TestService' };
      
      const builder = register(container, token);
      expect(builder).toBeInstanceOf(ServiceRegistrationBuilder);
    });

    it('should enable fluent registration syntax', () => {
      class TestService {}
      const container = createContainer();
      const token: ServiceToken<TestService> = { name: 'TestService' };
      
      register(container, token).asSingleton(TestService);
      
      expect(container.isRegistered(token)).toBe(true);
      expect(container.resolve(token)).toBeInstanceOf(TestService);
    });
  });
});

describe('edge cases and performance', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(async () => {
    await container.dispose();
  });

  it('should handle large number of services', () => {
    const services: any[] = [];
    
    // Register 1000 services
    for (let i = 0; i < 1000; i++) {
      class TestService {
        constructor(public id: number = i) {}
      }
      
      const token: ServiceToken<TestService> = { name: `TestService${i}` };
      container.registerSingleton(token, TestService);
      services.push({ token, TestService });
    }
    
    // Resolve all services
    for (const { token } of services) {
      const instance = container.resolve(token);
      expect(instance).toBeDefined();
    }
  });

  it('should handle deep dependency chains', () => {
    interface Service {
      getValue(): string;
    }

    // Create chain of 50 services, each depending on the next
    const services: ServiceToken<Service>[] = [];
    
    for (let i = 0; i < 50; i++) {
      const token: ServiceToken<Service> = { name: `Service${i}` };
      services.push(token);
      
      if (i === 49) {
        // Last service has no dependencies
        container.registerSingleton(token, () => ({
          getValue: () => `service${i}`,
        }));
      } else {
        // Each service depends on the next one
        container.registerSingleton(token, () => ({
          getValue: () => `service${i}-${container.resolve(services[i + 1]).getValue()}`,
        }));
      }
    }
    
    const result = container.resolve(services[0]);
    expect(result.getValue()).toContain('service0');
    expect(result.getValue()).toContain('service49');
  });

  it('should handle concurrent resolution requests', async () => {
    class TestService {
      constructor(public id: number = Math.random()) {}
    }
    
    const token: ServiceToken<TestService> = { name: 'TestService' };
    container.registerSingleton(token, TestService);
    
    // Resolve the same singleton service concurrently
    const promises = Array.from({ length: 100 }, () => 
      Promise.resolve().then(() => container.resolve(token))
    );
    
    const instances = await Promise.all(promises);
    
    // All instances should be the same (singleton)
    const firstInstance = instances[0];
    expect(instances.every(instance => instance === firstInstance)).toBe(true);
  });

  it('should handle complex object graphs', () => {
    interface DatabaseService {
      query(sql: string): string;
    }

    interface LoggerService {
      log(message: string): void;
    }

    interface UserService {
      getUser(id: number): { id: number; name: string };
    }

    interface EmailService {
      sendEmail(to: string, subject: string): void;
    }

    interface NotificationService {
      notify(userId: number, message: string): void;
    }

    const dbToken: ServiceToken<DatabaseService> = { name: 'DatabaseService' };
    const loggerToken: ServiceToken<LoggerService> = { name: 'LoggerService' };
    const userToken: ServiceToken<UserService> = { name: 'UserService' };
    const emailToken: ServiceToken<EmailService> = { name: 'EmailService' };
    const notificationToken: ServiceToken<NotificationService> = { name: 'NotificationService' };

    // Register services with complex dependencies
    container.registerSingleton(dbToken, () => ({
      query: (sql: string) => `result for: ${sql}`,
    }));

    container.registerSingleton(loggerToken, () => ({
      log: (message: string) => console.log(message),
    }));

    container.registerSingleton(userToken, () => ({
      getUser: (id: number) => {
        const db = container.resolve(dbToken);
        const logger = container.resolve(loggerToken);
        logger.log(`Getting user ${id}`);
        return { id, name: `User ${id}` };
      },
    }));

    container.registerSingleton(emailToken, () => ({
      sendEmail: (to: string, subject: string) => {
        const logger = container.resolve(loggerToken);
        logger.log(`Sending email to ${to}: ${subject}`);
      },
    }));

    container.registerSingleton(notificationToken, () => ({
      notify: (userId: number, message: string) => {
        const userService = container.resolve(userToken);
        const emailService = container.resolve(emailToken);
        const logger = container.resolve(loggerToken);
        
        const user = userService.getUser(userId);
        emailService.sendEmail(`${user.name}@example.com`, message);
        logger.log(`Notification sent to user ${userId}`);
      },
    }));

    // Use the notification service
    const notificationService = container.resolve(notificationToken);
    expect(() => notificationService.notify(1, 'Test message')).not.toThrow();
  });
});