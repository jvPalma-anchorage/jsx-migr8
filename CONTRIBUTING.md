# Contributing to JSX-Migr8

Thank you for your interest in contributing to JSX-Migr8! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- Yarn 4.2.0
- Git
- Docker (optional, for testing containerized builds)

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/jsx-migr8.git
   cd jsx-migr8
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/jvPalma-anchorage/jsx-migr8.git
   ```

4. Install dependencies:
   ```bash
   yarn install
   yarn bootstrap
   ```

5. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### 1. Making Changes

#### Code Style

- We use ESLint and Prettier for code formatting
- Run `yarn lint` before committing
- Run `yarn format` to auto-format code

#### TypeScript Guidelines

- Use strict type checking
- Avoid `any` types
- Document complex types with JSDoc comments
- Export types from dedicated `types.ts` files

#### Component Guidelines (Web Package)

- Use functional components with hooks
- Follow React best practices
- Use Tailwind CSS for styling
- Keep components small and focused

### 2. Testing

#### Running Tests

```bash
# Run all tests
yarn test:all

# Run specific package tests
yarn test           # CLI tests
yarn test:api       # API tests
yarn test:web       # Web tests

# Watch mode
yarn test:watch

# Coverage
yarn test:coverage
```

#### Writing Tests

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example test:
```typescript
describe('ComponentAnalyzer', () => {
  it('should identify all JSX components in a file', async () => {
    // Arrange
    const code = `<Button variant="primary">Click me</Button>`;
    
    // Act
    const result = await analyzeComponents(code);
    
    // Assert
    expect(result.components).toContain('Button');
    expect(result.count).toBe(1);
  });
});
```

### 3. Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Examples:
```bash
feat(cli): add support for TypeScript config files
fix(api): handle null response in migration endpoint
docs(readme): update installation instructions
```

### 4. Pull Request Process

1. Update your branch with latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. Run all checks:
   ```bash
   yarn lint:all
   yarn test:all
   yarn build:all
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request:
   - Use a clear, descriptive title
   - Reference any related issues
   - Include screenshots for UI changes
   - Describe what changes you made and why

#### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with master

## Architecture Guidelines

### Monorepo Structure

```
jsx-migr8/
├── packages/
│   ├── api/          # API service
│   └── web/          # Web frontend
├── src/              # CLI source
├── shared/           # Shared utilities (future)
└── docs/             # Documentation
```

### Package Dependencies

- Packages should be independent
- Shared code goes in `shared/` package
- Use workspace protocol for internal dependencies

### API Design Principles

- RESTful endpoints
- Consistent error handling
- Comprehensive request validation
- WebSocket for real-time features

### State Management (Web)

- Use Zustand for global state
- Keep state minimal and normalized
- Use React Query for server state

## Adding New Features

### 1. CLI Features

1. Add command to `src/cli/index.ts`
2. Implement logic in appropriate module
3. Add tests in `src/__tests__/`
4. Update CLI documentation

### 2. API Endpoints

1. Add route in `packages/api/src/routes/`
2. Implement controller in `packages/api/src/controllers/`
3. Add service logic in `packages/api/src/services/`
4. Write tests
5. Update API documentation

### 3. Web Features

1. Create component in `packages/web/src/components/`
2. Add page if needed in `packages/web/src/pages/`
3. Update routing
4. Add tests
5. Update UI documentation

## Performance Considerations

- Use streaming for large file processing
- Implement proper caching strategies
- Optimize bundle sizes
- Profile memory usage for CLI operations

## Security Guidelines

- Sanitize all user inputs
- Use parameterized queries
- Implement rate limiting
- Follow OWASP best practices
- Never commit sensitive data

## Release Process

1. Create release branch:
   ```bash
   git checkout -b release/v1.2.3
   ```

2. Update version numbers:
   ```bash
   yarn version:all
   ```

3. Update CHANGELOG.md

4. Create PR to master

5. After merge, tag release:
   ```bash
   git tag v1.2.3
   git push upstream v1.2.3
   ```

## Getting Help

- Check existing issues and discussions
- Join our Discord server (coming soon)
- Reach out to maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (coming soon)

Thank you for contributing to JSX-Migr8!