# React Ecosystem Migration Scenarios

This directory contains comprehensive migration test cases for React ecosystem libraries and patterns. These scenarios are designed to test jsx-migr8's capabilities with real-world, complex migration patterns.

## 📁 Structure

```
migration-scenarios/
├── react-router-v5-to-v6/         # React Router v5 → v6 migration
├── class-to-hooks/                # Class Components → Hooks migration  
├── hocs-to-hooks/                 # HOCs → Custom Hooks migration
├── styled-to-emotion/             # Styled Components → Emotion migration
├── context-evolution/             # Legacy Context → Modern Context migration
├── migration-scenarios.test.ts    # Comprehensive test suite
└── README.md                      # This file
```

Each scenario directory contains:
- `input/` - Original code using legacy patterns
- `expected/` - Target code using modern patterns  
- `rules/` - jsx-migr8 migration rules (JSON)

## 🔄 Migration Scenarios

### 1. React Router v5 → v6 (`react-router-v5-to-v6/`)

**Complexity**: Complex  
**File**: `App.tsx` (450+ lines)

Migrates a complete React Router v5 application to v6, covering:

- **Component Changes**:
  - `Switch` → `Routes`
  - `Route` component prop → element prop
  - `Redirect` → `Navigate`
  - Nested routing pattern updates

- **Hook Changes**:
  - `useHistory` → `useNavigate`
  - `history.push()` → `navigate()`
  - `history.replace()` → `navigate(path, { replace: true })`
  - `history.goBack()` → `navigate(-1)`

- **HOC Removal**:
  - `withRouter` → direct hook usage
  - `RouteComponentProps` → custom props

- **Pattern Changes**:
  - `exact` prop → `index` prop
  - `match.path` / `match.url` removal
  - Location state typing improvements

**Key Features**:
- Complex nested routing with multiple levels
- Class and functional component examples
- TypeScript integration with proper typing
- Real-world navigation patterns

### 2. Class Components → Hooks (`class-to-hooks/`)

**Complexity**: Complex  
**File**: `UserDashboard.tsx` (400+ lines)

Converts a complex class component to functional component with hooks:

- **Lifecycle Methods**:
  - `componentDidMount` → `useEffect(() => {}, [])`
  - `componentDidUpdate` → `useEffect(() => {})`
  - `componentWillUnmount` → `useEffect(() => { return () => {} }, [])`

- **State Management**:
  - `this.state` → `useState`
  - `this.setState` → state setters
  - Complex state with nested objects

- **Method Conversion**:
  - Class methods → `useCallback`
  - Event handlers → memoized functions
  - Private methods → internal functions

- **External Integration**:
  - Redux `connect` → `useSelector`/`useDispatch`
  - Router props → router hooks
  - Performance optimization with `React.memo`

**Key Features**:
- Complex state management with multiple useState hooks
- Window event listeners and cleanup
- Form handling with validation
- Auto-save functionality with timers
- Responsive design considerations

### 3. HOCs → Custom Hooks (`hocs-to-hooks/`)

**Complexity**: Complex  
**Files**: `withAuth.tsx` → `useAuth.tsx` (600+ lines)

Converts multiple Higher-Order Components to custom hooks:

- **Authentication HOC** (`withAuth` → `useAuth`):
  - User authentication state
  - Permission checking
  - Login/logout functionality
  - Permission-based component guards

- **Data Fetching HOC** (`withData` → `useData`):
  - Generic data fetching
  - Caching mechanisms
  - Polling intervals
  - Error handling and retries
  - Request cancellation

- **Theme HOC** (`withTheme` → `useTheme`):
  - Theme state management
  - LocalStorage persistence
  - Theme switching functionality

- **Composition Patterns**:
  - Multiple HOC composition → multiple hook usage
  - Conditional rendering → guard components
  - Props injection → hook return values

**Key Features**:
- Advanced hook patterns with useCallback/useMemo
- AbortController for request cancellation
- Permission guard components
- Combined hooks for multiple contexts
- Performance optimization strategies

### 4. Styled Components → Emotion (`styled-to-emotion/`)

**Complexity**: Medium  
**File**: `StyledComponents.tsx` → `EmotionComponents.tsx` (500+ lines)

Migrates a complete styled-components setup to Emotion:

- **Import Changes**:
  - `styled-components` → `@emotion/styled` + `@emotion/react`
  - `createGlobalStyle` → `css` + `Global`
  - `DefaultTheme` → `EmotionTheme`

- **Global Styles**:
  - `createGlobalStyle\`...\`` → `css\`...\``
  - `<GlobalStyle />` → `<Global styles={globalStyles} />`

- **Component Patterns**:
  - Styled component definitions (mostly compatible)
  - Theme provider usage
  - CSS-in-JS patterns
  - Animation and keyframes

- **Advanced Features**:
  - Complex prop-based styling
  - Responsive design patterns
  - Component composition
  - Theme-based conditional styling

**Key Features**:
- Comprehensive component library
- Advanced styling patterns
- Animation and keyframes
- Theme system with TypeScript
- Responsive design examples

### 5. Context API Evolution (`context-evolution/`)

**Complexity**: Complex  
**Files**: `LegacyContext.tsx` → `ModernContext.tsx` (500+ lines)

Modernizes legacy Context API usage:

- **Legacy Patterns** (React < 16.3):
  - `getChildContext()` → Context Provider
  - `childContextTypes` → TypeScript interfaces
  - `contextTypes` → `useContext`
  - PropTypes → TypeScript types

- **Modern Patterns**:
  - `createContext` with TypeScript
  - Custom hooks for context consumption
  - `useReducer` for complex state
  - Performance optimizations

- **Advanced Features**:
  - Combined context providers
  - Selector-based context hooks
  - Error boundaries for context
  - Context composition patterns

**Key Features**:
- Multiple context examples
- Performance optimization techniques
- TypeScript integration
- Error handling patterns
- Selector-based subscriptions

## 🧪 Testing

The migration scenarios include comprehensive tests in `migration-scenarios.test.ts`:

### Test Categories

1. **File Structure Validation**
   - Verifies all required files exist
   - Validates file formats and basic structure

2. **Content Validation**
   - Checks for specific patterns in input files
   - Verifies expected transformations in output files
   - Validates migration rule completeness

3. **Migration Rule Validation**
   - Tests rule JSON structure
   - Validates lookup configurations
   - Checks transformation rule coverage

4. **Complexity Assessment**
   - Ensures appropriate complexity distribution
   - Validates comprehensive pattern coverage

5. **Integration Test Preparation**
   - Verifies realistic codebase examples
   - Checks TypeScript integration
   - Validates component hierarchies

### Running Tests

```bash
# Run all migration scenario tests
npm test -- migration-scenarios

# Run specific scenario tests
npm test -- migration-scenarios --testNamePattern="React Router"

# Run with coverage
npm test -- migration-scenarios --coverage
```

## 🎯 Usage with jsx-migr8

These scenarios can be used to test jsx-migr8's migration capabilities:

### 1. Test Individual Scenarios

```bash
# Test React Router migration
jsx-migr8 --input=migration-scenarios/react-router-v5-to-v6/input \
          --rules=migration-scenarios/react-router-v5-to-v6/rules \
          --dry-run

# Test class to hooks migration  
jsx-migr8 --input=migration-scenarios/class-to-hooks/input \
          --rules=migration-scenarios/class-to-hooks/rules \
          --dry-run
```

### 2. Validate Output

```bash
# Compare generated output with expected
diff generated-output/ migration-scenarios/*/expected/
```

### 3. Performance Testing

```bash
# Test on large codebases
time jsx-migr8 --input=large-codebase --rules=scenario-rules --yolo
```

## 📊 Metrics

### Complexity Metrics

| Scenario | Lines of Code | Components | Patterns | Difficulty |
|----------|---------------|------------|----------|------------|
| React Router v5→v6 | 450+ | 12+ | 8 | Complex |
| Class→Hooks | 400+ | 6+ | 9 | Complex |
| HOCs→Hooks | 600+ | 8+ | 7 | Complex |
| Styled→Emotion | 500+ | 15+ | 6 | Medium |
| Context Evolution | 500+ | 10+ | 8 | Complex |

### Pattern Coverage

- **Component Patterns**: Class components, functional components, HOCs, render props
- **Hook Patterns**: useState, useEffect, useCallback, useMemo, useReducer, custom hooks
- **State Management**: Redux, Context API, local state
- **Styling**: styled-components, Emotion, CSS-in-JS
- **Routing**: React Router v5/v6, nested routing, programmatic navigation
- **TypeScript**: Interfaces, generics, type assertions, prop types

## 🔧 Extending Scenarios

### Adding New Scenarios

1. Create directory structure:
   ```
   new-scenario/
   ├── input/
   │   └── Component.tsx
   ├── expected/
   │   └── Component.tsx
   └── rules/
       └── migration-rules.json
   ```

2. Add to test file:
   ```typescript
   const newScenario: MigrationScenario = {
     name: 'New Migration',
     inputPath: 'new-scenario/input/Component.tsx',
     expectedPath: 'new-scenario/expected/Component.tsx', 
     rulesPath: 'new-scenario/rules/migration-rules.json',
     description: 'Description of migration',
     complexity: 'medium',
     patterns: ['pattern1', 'pattern2']
   };
   ```

3. Update this README with documentation

### Guidelines for Scenarios

- **Realistic**: Use real-world code patterns
- **Comprehensive**: Cover edge cases and complex scenarios
- **Documented**: Include detailed comments explaining patterns
- **Testable**: Ensure clear input/output validation
- **TypeScript**: Include proper type definitions
- **Performance**: Consider performance implications

## 📚 Additional Resources

- [jsx-migr8 Documentation](../../README.md)
- [React Migration Guides](https://react.dev/blog)
- [React Router Migration Guide](https://reactrouter.com/en/main/upgrading/v5)
- [Emotion Migration Guide](https://emotion.sh/docs/migrating-to-emotion-11)
- [Hooks Migration Guide](https://react.dev/reference/react)

## 🤝 Contributing

When contributing new migration scenarios:

1. Follow the established directory structure
2. Include comprehensive test cases
3. Document all patterns and transformations
4. Ensure TypeScript compatibility
5. Add performance considerations
6. Update this README

For questions or suggestions, please open an issue in the jsx-migr8 repository.