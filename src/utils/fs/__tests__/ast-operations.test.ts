/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { promises as fs, readFileSync } from 'node:fs';
import { parse } from 'recast';
import { getAstFromCode, getFileAstAndCodeAsync, getFileAstAndCode } from '../ast-operations';
import { FileOperationError } from '../error-handling';

// Mock dependencies
jest.mock('node:fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
  readFileSync: jest.fn(),
}));

jest.mock('recast', () => ({
  parse: jest.fn(),
}));

// Mock the babel parser
jest.mock('recast/parsers/babel-ts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('ast-operations', () => {
  let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
  let mockReadFileSync: jest.MockedFunction<typeof readFileSync>;
  let mockParse: jest.MockedFunction<typeof parse>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
    mockParse = parse as jest.MockedFunction<typeof parse>;
  });

  describe('getAstFromCode', () => {
    it('should parse valid TypeScript code successfully', () => {
      const code = 'const greeting: string = "Hello, World!";';
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code);

      expect(result).toBe(mockAST);
      expect(mockParse).toHaveBeenCalledWith(code, {
        parser: expect.any(Function),
      });
    });

    it('should parse valid JSX code successfully', () => {
      const code = 'const Button = () => <button>Click me</button>;';
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code, '/test/Button.tsx');

      expect(result).toBe(mockAST);
      expect(mockParse).toHaveBeenCalledWith(code, {
        parser: expect.any(Function),
      });
    });

    it('should throw FileOperationError on parsing failure', () => {
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      const filePath = '/test/invalid.ts';
      
      mockParse.mockImplementation(() => {
        throw parseError;
      });

      expect(() => getAstFromCode(code, filePath)).toThrow(FileOperationError);
      expect(() => getAstFromCode(code, filePath)).toThrow(
        `parseAST failed for ${filePath}: ${parseError.message}`
      );
    });

    it('should throw FileOperationError with inline-code context when no file path', () => {
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      
      mockParse.mockImplementation(() => {
        throw parseError;
      });

      expect(() => getAstFromCode(code)).toThrow(FileOperationError);
      expect(() => getAstFromCode(code)).toThrow(
        `parseAST failed for <inline-code>: ${parseError.message}`
      );
    });

    it('should handle complex TypeScript features', () => {
      const code = `
        interface Props {
          name: string;
          age?: number;
        }
        
        const Component: React.FC<Props> = ({ name, age = 18 }) => {
          return <div>{name} is {age} years old</div>;
        };
      `;
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code, '/test/Component.tsx');

      expect(result).toBe(mockAST);
    });

    it('should handle JavaScript code', () => {
      const code = 'const add = (a, b) => a + b;';
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code, '/test/utils.js');

      expect(result).toBe(mockAST);
    });

    it('should handle empty code', () => {
      const code = '';
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code);

      expect(result).toBe(mockAST);
    });

    it('should handle code with comments and special characters', () => {
      const code = `
        // This is a comment with émojis 🚀
        /* Multi-line comment
           with special chars: αβγ */
        const test = "String with unicode: 你好世界";
      `;
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code);

      expect(result).toBe(mockAST);
    });
  });

  describe('getFileAstAndCodeAsync', () => {
    it('should read file and parse AST asynchronously', async () => {
      const filePath = '/test/component.tsx';
      const code = 'const Component = () => <div>Hello</div>;';
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFile.mockResolvedValue(code as any);
      mockParse.mockReturnValue(mockAST as any);

      const result = await getFileAstAndCodeAsync(filePath);

      expect(result).toEqual([mockAST, code]);
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockParse).toHaveBeenCalledWith(code, {
        parser: expect.any(Function),
      });
    });

    it('should handle file read errors', async () => {
      const filePath = '/test/nonexistent.tsx';
      const readError = new Error('ENOENT: no such file or directory');
      
      mockReadFile.mockRejectedValue(readError);

      await expect(getFileAstAndCodeAsync(filePath)).rejects.toThrow(FileOperationError);
      await expect(getFileAstAndCodeAsync(filePath)).rejects.toThrow(
        `readFileAndParse failed for ${filePath}: ${readError.message}`
      );
    });

    it('should re-throw FileOperationError from getAstFromCode', async () => {
      const filePath = '/test/invalid.tsx';
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      
      mockReadFile.mockResolvedValue(code as any);
      mockParse.mockImplementation(() => {
        throw parseError;
      });

      await expect(getFileAstAndCodeAsync(filePath)).rejects.toThrow(FileOperationError);
      await expect(getFileAstAndCodeAsync(filePath)).rejects.toThrow(
        `parseAST failed for ${filePath}: ${parseError.message}`
      );
    });

    it('should handle large files', async () => {
      const filePath = '/test/large.tsx';
      const largeCode = 'const data = ' + JSON.stringify(new Array(10000).fill('test'));
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFile.mockResolvedValue(largeCode as any);
      mockParse.mockReturnValue(mockAST as any);

      const result = await getFileAstAndCodeAsync(filePath);

      expect(result).toEqual([mockAST, largeCode]);
    });

    it('should handle binary files gracefully', async () => {
      const filePath = '/test/binary.txt';
      const binaryContent = Buffer.from([0, 1, 2, 3, 255]).toString('utf8');
      
      mockReadFile.mockResolvedValue(binaryContent as any);
      mockParse.mockImplementation(() => {
        throw new Error('Invalid character');
      });

      await expect(getFileAstAndCodeAsync(filePath)).rejects.toThrow(FileOperationError);
    });

    it('should handle files with different encodings', async () => {
      const filePath = '/test/unicode.tsx';
      const unicodeContent = 'const emoji = "🎉"; const chinese = "你好"; const arabic = "مرحبا";';
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFile.mockResolvedValue(unicodeContent as any);
      mockParse.mockReturnValue(mockAST as any);

      const result = await getFileAstAndCodeAsync(filePath);

      expect(result).toEqual([mockAST, unicodeContent]);
    });
  });

  describe('getFileAstAndCode', () => {
    it('should read file and parse AST synchronously', () => {
      const filePath = '/test/component.tsx';
      const code = 'const Component = () => <div>Hello</div>;';
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFileSync.mockReturnValue(code);
      mockParse.mockReturnValue(mockAST as any);

      const result = getFileAstAndCode(filePath);

      expect(result).toEqual([mockAST, code]);
      expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockParse).toHaveBeenCalledWith(code, {
        parser: expect.any(Function),
      });
    });

    it('should handle sync file read errors', () => {
      const filePath = '/test/nonexistent.tsx';
      const readError = new Error('ENOENT: no such file or directory');
      
      mockReadFileSync.mockImplementation(() => {
        throw readError;
      });

      expect(() => getFileAstAndCode(filePath)).toThrow(FileOperationError);
      expect(() => getFileAstAndCode(filePath)).toThrow(
        `readFileAndParseSync failed for ${filePath}: ${readError.message}`
      );
    });

    it('should re-throw FileOperationError from getAstFromCode', () => {
      const filePath = '/test/invalid.tsx';
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      
      mockReadFileSync.mockReturnValue(code);
      mockParse.mockImplementation(() => {
        throw parseError;
      });

      expect(() => getFileAstAndCode(filePath)).toThrow(FileOperationError);
      expect(() => getFileAstAndCode(filePath)).toThrow(
        `parseAST failed for ${filePath}: ${parseError.message}`
      );
    });

    it('should handle sync reading of various file types', () => {
      const testCases = [
        { path: '/test/component.tsx', code: 'export const Button = () => <button />;' },
        { path: '/test/utils.ts', code: 'export const helper = () => {};' },
        { path: '/test/config.js', code: 'module.exports = {};' },
        { path: '/test/types.d.ts', code: 'export interface Props {}' },
      ];

      testCases.forEach(({ path, code }, index) => {
        const mockAST = { type: 'Program', body: [], index };
        mockReadFileSync.mockReturnValueOnce(code);
        mockParse.mockReturnValueOnce(mockAST as any);

        const result = getFileAstAndCode(path);

        expect(result).toEqual([mockAST, code]);
      });

      expect(mockReadFileSync).toHaveBeenCalledTimes(testCases.length);
      expect(mockParse).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle permission errors', () => {
      const filePath = '/test/protected.tsx';
      const permissionError = new Error('EACCES: permission denied');
      
      mockReadFileSync.mockImplementation(() => {
        throw permissionError;
      });

      expect(() => getFileAstAndCode(filePath)).toThrow(FileOperationError);
      expect(() => getFileAstAndCode(filePath)).toThrow(
        `readFileAndParseSync failed for ${filePath}: ${permissionError.message}`
      );
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null/undefined file paths in async function', async () => {
      const filePath = null as any;
      const readError = new Error('Invalid file path');
      
      mockReadFile.mockRejectedValue(readError);

      await expect(getFileAstAndCodeAsync(filePath)).rejects.toThrow(FileOperationError);
    });

    it('should handle null/undefined file paths in sync function', () => {
      const filePath = undefined as any;
      const readError = new Error('Invalid file path');
      
      mockReadFileSync.mockImplementation(() => {
        throw readError;
      });

      expect(() => getFileAstAndCode(filePath)).toThrow(FileOperationError);
    });

    it('should handle circular reference in parsed AST', () => {
      const code = 'const obj = {}; obj.self = obj;';
      const circularAST: any = { type: 'Program', body: [] };
      circularAST.self = circularAST;
      
      mockParse.mockReturnValue(circularAST);

      const result = getAstFromCode(code);

      expect(result).toBe(circularAST);
    });

    it('should handle very long file paths', () => {
      const longPath = '/very/long/path/' + 'directory/'.repeat(100) + 'file.tsx';
      const code = 'const test = 42;';
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFileSync.mockReturnValue(code);
      mockParse.mockReturnValue(mockAST as any);

      const result = getFileAstAndCode(longPath);

      expect(result).toEqual([mockAST, code]);
    });

    it('should handle empty file', () => {
      const filePath = '/test/empty.tsx';
      const code = '';
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFileSync.mockReturnValue(code);
      mockParse.mockReturnValue(mockAST as any);

      const result = getFileAstAndCode(filePath);

      expect(result).toEqual([mockAST, code]);
    });

    it('should handle files with only whitespace', () => {
      const filePath = '/test/whitespace.tsx';
      const code = '   \n\t\r\n   ';
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFileSync.mockReturnValue(code);
      mockParse.mockReturnValue(mockAST as any);

      const result = getFileAstAndCode(filePath);

      expect(result).toEqual([mockAST, code]);
    });
  });

  describe('parser integration', () => {
    it('should handle complex nested JSX structures', () => {
      const code = `
        const ComplexComponent = ({ items, onClick }) => (
          <div className="container">
            <header>
              <h1>Title</h1>
              <nav>
                {items.map(item => (
                  <button key={item.id} onClick={() => onClick(item.id)}>
                    {item.label}
                  </button>
                ))}
              </nav>
            </header>
            <main>
              <section>
                <article>
                  <p>Content goes here</p>
                </article>
              </section>
            </main>
          </div>
        );
      `;
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code, '/test/ComplexComponent.tsx');

      expect(result).toBe(mockAST);
    });

    it('should handle TypeScript generics and advanced features', () => {
      const code = `
        interface GenericProps<T extends Record<string, any>> {
          data: T[];
          onSelect: (item: T) => void;
          renderItem?: (item: T, index: number) => React.ReactNode;
        }
        
        function GenericList<T extends { id: string }>({
          data,
          onSelect,
          renderItem = (item) => <span>{item.id}</span>
        }: GenericProps<T>) {
          return (
            <ul>
              {data.map((item, index) => (
                <li key={item.id} onClick={() => onSelect(item)}>
                  {renderItem(item, index)}
                </li>
              ))}
            </ul>
          );
        }
      `;
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code, '/test/GenericList.tsx');

      expect(result).toBe(mockAST);
    });

    it('should handle modern JavaScript features', () => {
      const code = `
        const useCounter = (initialValue = 0) => {
          const [count, setCount] = useState(initialValue);
          
          const increment = useCallback(() => setCount(c => c + 1), []);
          const decrement = useCallback(() => setCount(c => c - 1), []);
          const reset = useCallback(() => setCount(initialValue), [initialValue]);
          
          return { count, increment, decrement, reset };
        };
        
        const Counter = () => {
          const { count, increment, decrement, reset } = useCounter();
          
          return (
            <>
              <span>Count: {count}</span>
              <button onClick={increment}>+</button>
              <button onClick={decrement}>-</button>
              <button onClick={reset}>Reset</button>
            </>
          );
        };
      `;
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = getAstFromCode(code, '/test/Counter.tsx');

      expect(result).toBe(mockAST);
    });
  });

  describe('performance considerations', () => {
    it('should handle multiple concurrent async reads', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/file${i}.tsx`,
        code: `const Component${i} = () => <div>Component ${i}</div>;`,
        ast: { type: 'Program', body: [], index: i },
      }));

      files.forEach((file, index) => {
        mockReadFile.mockResolvedValueOnce(file.code as any);
        mockParse.mockReturnValueOnce(file.ast as any);
      });

      const promises = files.map(file => getFileAstAndCodeAsync(file.path));
      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result).toEqual([files[index].ast, files[index].code]);
      });

      expect(mockReadFile).toHaveBeenCalledTimes(files.length);
      expect(mockParse).toHaveBeenCalledTimes(files.length);
    });

    it('should handle very large code files', async () => {
      const filePath = '/test/huge.tsx';
      const hugeCode = 'const data = ' + JSON.stringify(new Array(50000).fill('large data'));
      const mockAST = { type: 'Program', body: [] };
      
      mockReadFile.mockResolvedValue(hugeCode as any);
      mockParse.mockReturnValue(mockAST as any);

      const start = Date.now();
      const result = await getFileAstAndCodeAsync(filePath);
      const duration = Date.now() - start;

      expect(result).toEqual([mockAST, hugeCode]);
      // Should complete in reasonable time (less than 1 second for mocked operations)
      expect(duration).toBeLessThan(1000);
    });
  });
});