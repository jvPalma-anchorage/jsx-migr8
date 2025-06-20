/**
 * Security-enhanced interactive prompts
 * Wraps inquirer prompts with input validation and sanitization
 */

import { input, select, SelectOptions, InputOptions } from "@inquirer/prompts";
import { validators, sanitizers, logSecurityEvent } from "../validation";

/**
 * Secure input prompt with validation and sanitization
 */
export async function secureInput(options: InputOptions<string> & {
  sanitize?: boolean;
  maxLength?: number;
  allowEmpty?: boolean;
}): Promise<string> {
  const {
    sanitize = true,
    maxLength = 1000,
    allowEmpty = false,
    ...inquirerOptions
  } = options;

  // Add security validation to the original validate function
  const originalValidate = inquirerOptions.validate;
  inquirerOptions.validate = (value: string) => {
    try {
      // First run the original validation if provided
      if (originalValidate && typeof originalValidate === 'function') {
        const originalResult = originalValidate(value);
        if (originalResult !== true) {
          return originalResult;
        }
      }

      // Validate input with our security system
      const validationResult = validators.userInput(value);
      if (!validationResult.success) {
        logSecurityEvent(
          'secure-input-validation',
          'warn',
          'User input validation failed',
          { error: validationResult.error, inputLength: value.length }
        );
        return `Invalid input: ${validationResult.error}`;
      }

      // Check length
      if (value.length > maxLength) {
        return `Input too long (max ${maxLength} characters)`;
      }

      // Check if empty is allowed
      if (!allowEmpty && value.trim().length === 0) {
        return 'Input cannot be empty';
      }

      return true;
    } catch (error) {
      logSecurityEvent(
        'secure-input-error',
        'error',
        'Error during input validation',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return 'Validation error occurred';
    }
  };

  // Add security transformation to the original transformer
  const originalTransformer = inquirerOptions.transformer;
  inquirerOptions.transformer = (value: string, answers?: any, flags?: { isFinal?: boolean }) => {
    try {
      let transformedValue = value;

      // Apply original transformer first if provided
      if (originalTransformer && typeof originalTransformer === 'function') {
        transformedValue = originalTransformer(value, answers, flags);
      }

      // Apply sanitization if enabled
      if (sanitize) {
        transformedValue = sanitizers.userInput(transformedValue);
      }

      return transformedValue;
    } catch (error) {
      logSecurityEvent(
        'secure-input-transform-error',
        'warn',
        'Error during input transformation',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return value; // Return original value if transformation fails
    }
  };

  try {
    const result = await input(inquirerOptions);
    
    // Final sanitization before returning
    const finalResult = sanitize ? sanitizers.userInput(result) : result;
    
    logSecurityEvent(
      'secure-input-success',
      'info',
      'User input collected successfully',
      { inputLength: finalResult.length }
    );
    
    return finalResult;
  } catch (error) {
    logSecurityEvent(
      'secure-input-error',
      'error',
      'Error during secure input collection',
      { error: error instanceof Error ? error.message : String(error) }
    );
    throw error;
  }
}

/**
 * Secure select prompt
 */
export async function secureSelect<T>(options: SelectOptions<T>): Promise<T> {
  try {
    // Validate the choices for suspicious content
    if (options.choices && Array.isArray(options.choices)) {
      for (const choice of options.choices) {
        if (typeof choice === 'object' && choice !== null) {
          const choiceObj = choice as any;
          if (typeof choiceObj.name === 'string') {
            try {
              validators.userInput(choiceObj.name);
            } catch (error) {
              logSecurityEvent(
                'secure-select-choice-validation',
                'warn',
                'Suspicious choice detected in select prompt',
                { choice: choiceObj.name.substring(0, 100) }
              );
            }
          }
          if (typeof choiceObj.description === 'string') {
            try {
              validators.userInput(choiceObj.description);
            } catch (error) {
              logSecurityEvent(
                'secure-select-description-validation',
                'warn',
                'Suspicious description detected in select prompt',
                { description: choiceObj.description.substring(0, 100) }
              );
            }
          }
        }
      }
    }

    const result = await select(options);
    
    logSecurityEvent(
      'secure-select-success',
      'info',
      'User selection completed successfully',
      { hasResult: !!result }
    );
    
    return result;
  } catch (error) {
    logSecurityEvent(
      'secure-select-error',
      'error',
      'Error during secure select operation',
      { error: error instanceof Error ? error.message : String(error) }
    );
    throw error;
  }
}

/**
 * Secure component name input with additional validation
 */
export async function secureComponentNameInput(options: Omit<InputOptions<string>, 'validate' | 'transformer'> & {
  allowEmpty?: boolean;
}): Promise<string> {
  const { allowEmpty = false, ...inputOptions } = options;
  
  return secureInput({
    ...inputOptions,
    maxLength: 100,
    allowEmpty,
    validate: (value: string) => {
      const validationResult = validators.componentName(value);
      if (!validationResult.success) {
        return `Invalid component name: ${validationResult.error}`;
      }
      return true;
    },
    transformer: (value: string) => sanitizers.componentName(value)
  });
}

/**
 * Secure package name input with additional validation
 */
export async function securePackageNameInput(options: Omit<InputOptions<string>, 'validate' | 'transformer'> & {
  allowEmpty?: boolean;
}): Promise<string> {
  const { allowEmpty = false, ...inputOptions } = options;
  
  return secureInput({
    ...inputOptions,
    maxLength: 214, // npm package name limit
    allowEmpty,
    validate: (value: string) => {
      if (!allowEmpty && value.trim().length === 0) {
        return 'Package name is required';
      }
      if (value.trim().length === 0) {
        return true; // Allow empty if explicitly allowed
      }
      
      const validationResult = validators.packageName(value);
      if (!validationResult.success) {
        return `Invalid package name: ${validationResult.error}`;
      }
      return true;
    },
    transformer: (value: string) => value.trim().length === 0 ? value : sanitizers.packageName(value)
  });
}

/**
 * Secure file path input with additional validation
 */
export async function secureFilePathInput(options: Omit<InputOptions<string>, 'validate' | 'transformer'> & {
  allowEmpty?: boolean;
  baseDir?: string;
  allowedExtensions?: string[];
}): Promise<string> {
  const { allowEmpty = false, baseDir, allowedExtensions, ...inputOptions } = options;
  
  return secureInput({
    ...inputOptions,
    maxLength: 4096, // Common path length limit
    allowEmpty,
    validate: (value: string) => {
      if (!allowEmpty && value.trim().length === 0) {
        return 'File path is required';
      }
      if (value.trim().length === 0) {
        return true; // Allow empty if explicitly allowed
      }
      
      const validationResult = validators.filePath(value);
      if (!validationResult.success) {
        return `Invalid file path: ${validationResult.error}`;
      }
      return true;
    },
    transformer: (value: string) => value.trim().length === 0 ? value : sanitizers.filePath(value)
  });
}

/**
 * Secure confirmation input (for YOLO operations)
 */
export async function secureConfirmationInput(message: string): Promise<boolean> {
  const response = await secureInput({
    message,
    maxLength: 10,
    allowEmpty: false,
    validate: (value: string) => {
      const normalized = value.trim().toLowerCase();
      if (!['yes', 'no', 'y', 'n'].includes(normalized)) {
        return 'Please type "yes" or "no"';
      }
      return true;
    },
    transformer: (value: string) => value.trim().toLowerCase()
  });
  
  return ['yes', 'y'].includes(response);
}

/**
 * Batch secure input for package collection
 */
export async function securePackageCollection(
  prompt: string,
  existingPackages: string[] = []
): Promise<string[]> {
  const packages: string[] = [...existingPackages];
  
  logSecurityEvent(
    'secure-package-collection-start',
    'info',
    'Starting secure package collection',
    { existingCount: existingPackages.length }
  );
  
  while (true) {
    if (packages.length > 0) {
      console.info('   • Current packages:');
      packages.forEach((pkg) => console.info(`     - ${pkg}`));
    }
    
    try {
      const pkg = await securePackageNameInput({
        message: prompt,
        allowEmpty: true
      });
      
      if (!pkg.trim()) {
        break; // Empty input ends collection
      }
      
      // Check for duplicates
      if (!packages.includes(pkg)) {
        packages.push(pkg);
        logSecurityEvent(
          'secure-package-added',
          'info',
          'Package added to collection',
          { package: pkg, totalCount: packages.length }
        );
      } else {
        console.warn(`Package "${pkg}" already added`);
      }
      
      // Prevent excessive package collection
      if (packages.length >= 50) {
        console.warn('Maximum number of packages reached (50)');
        break;
      }
    } catch (error) {
      logSecurityEvent(
        'secure-package-collection-error',
        'error',
        'Error during package collection',
        { error: error instanceof Error ? error.message : String(error) }
      );
      break;
    }
  }
  
  logSecurityEvent(
    'secure-package-collection-complete',
    'info',
    'Package collection completed',
    { finalCount: packages.length }
  );
  
  return packages;
}