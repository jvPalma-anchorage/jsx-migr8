import React, { useState } from 'react';
import styled, { ThemeProvider, createGlobalStyle, css, keyframes } from 'styled-components';
import { darken, lighten, rgba, transparentize } from 'polished';

// Theme definition
const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    black: '#000000'
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1200px'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  borderRadius: '0.375rem',
  boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
  transition: '0.15s ease-in-out'
};

// Global styles with styled-components
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${props => props.theme.colors.light};
    color: ${props => props.theme.colors.dark};
    line-height: 1.6;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: ${props => props.theme.spacing.md};
  }

  p {
    margin-bottom: ${props => props.theme.spacing.md};
  }

  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
    transition: color ${props => props.theme.transition};

    &:hover {
      color: ${props => darken(0.1, props.theme.colors.primary)};
    }
  }
`;

// Keyframe animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
`;

// Container components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 0 ${props => props.theme.spacing.lg};
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -${props => props.theme.spacing.sm};
`;

const Col = styled.div<{ xs?: number; sm?: number; md?: number; lg?: number }>`
  padding: 0 ${props => props.theme.spacing.sm};
  flex: 1;

  ${props => props.xs && css`
    flex: 0 0 ${(props.xs / 12) * 100}%;
    max-width: ${(props.xs / 12) * 100}%;
  `}

  @media (min-width: ${props => props.theme.breakpoints.mobile}) {
    ${props => props.sm && css`
      flex: 0 0 ${(props.sm / 12) * 100}%;
      max-width: ${(props.sm / 12) * 100}%;
    `}
  }

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    ${props => props.md && css`
      flex: 0 0 ${(props.md / 12) * 100}%;
      max-width: ${(props.md / 12) * 100}%;
    `}
  }

  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    ${props => props.lg && css`
      flex: 0 0 ${(props.lg / 12) * 100}%;
      max-width: ${(props.lg / 12) * 100}%;
    `}
  }
`;

// Header component
const Header = styled.header`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => darken(0.1, props.theme.colors.primary)});
  color: ${props => props.theme.colors.white};
  padding: ${props => props.theme.spacing.xl} 0;
  margin-bottom: ${props => props.theme.spacing.xl};
  box-shadow: ${props => props.theme.boxShadow};
  animation: ${fadeIn} 0.6s ease-out;
`;

const HeaderTitle = styled.h1`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.md};
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 2rem;
  }
`;

const HeaderSubtitle = styled.p`
  text-align: center;
  font-size: 1.1rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
`;

// Button variants with complex styling
const baseButtonStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border: 2px solid transparent;
  border-radius: ${props => props.theme.borderRadius};
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all ${props => props.theme.transition};
  outline: none;
  position: relative;
  overflow: hidden;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => transparentize(0.7, props.theme.colors.primary)};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }
`;

const Button = styled.button<{ 
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  outlined?: boolean;
  loading?: boolean;
}>`
  ${baseButtonStyles}

  ${props => {
    const color = props.theme.colors[props.variant || 'primary'];
    
    if (props.outlined) {
      return css`
        background-color: transparent;
        color: ${color};
        border-color: ${color};

        &:hover {
          background-color: ${color};
          color: ${props.theme.colors.white};
          transform: translateY(-2px);
          box-shadow: 0 4px 8px ${rgba(color, 0.3)};
        }

        &:active {
          transform: translateY(0);
        }
      `;
    } else {
      return css`
        background-color: ${color};
        color: ${props.theme.colors.white};
        border-color: ${color};

        &:hover {
          background-color: ${darken(0.1, color)};
          border-color: ${darken(0.1, color)};
          transform: translateY(-2px);
          box-shadow: 0 4px 8px ${rgba(color, 0.3)};
        }

        &:active {
          transform: translateY(0);
          background-color: ${darken(0.15, color)};
        }
      `;
    }
  }}

  ${props => props.size === 'sm' && css`
    padding: ${props.theme.spacing.xs} ${props.theme.spacing.md};
    font-size: 0.875rem;
  `}

  ${props => props.size === 'lg' && css`
    padding: ${props.theme.spacing.md} ${props.theme.spacing.xl};
    font-size: 1.125rem;
  `}

  ${props => props.loading && css`
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      margin: auto;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-right-color: currentColor;
      border-radius: 50%;
      animation: ${spin} 1s linear infinite;
    }
  `}
`;

// Card component with advanced styling
const Card = styled.div<{ elevated?: boolean; hoverable?: boolean }>`
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.borderRadius};
  overflow: hidden;
  transition: all ${props => props.theme.transition};
  margin-bottom: ${props => props.theme.spacing.lg};
  animation: ${fadeIn} 0.6s ease-out;
  
  ${props => props.elevated ? css`
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  ` : css`
    box-shadow: ${props.theme.boxShadow};
  `}

  ${props => props.hoverable && css`
    cursor: pointer;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
  `}
`;

const CardHeader = styled.div<{ color?: string }>`
  padding: ${props => props.theme.spacing.lg};
  background-color: ${props => props.color || props.theme.colors.light};
  border-bottom: 1px solid ${props => rgba(props.theme.colors.dark, 0.1)};

  h3 {
    margin-bottom: ${props => props.theme.spacing.sm};
    color: ${props => props.color ? props.theme.colors.white : 'inherit'};
  }

  p {
    margin-bottom: 0;
    opacity: ${props => props.color ? 0.9 : 0.7};
    color: ${props => props.color ? props.theme.colors.white : 'inherit'};
  }
`;

const CardBody = styled.div`
  padding: ${props => props.theme.spacing.lg};
`;

const CardFooter = styled.div`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  background-color: ${props => props.theme.colors.light};
  border-top: 1px solid ${props => rgba(props.theme.colors.dark, 0.1)};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// Form components
const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => props.theme.spacing.sm};
  font-weight: 500;
  color: ${props => props.theme.colors.dark};
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 2px solid ${props => props.hasError ? props.theme.colors.danger : rgba(props.theme.colors.dark, 0.1)};
  border-radius: ${props => props.theme.borderRadius};
  font-size: 1rem;
  transition: all ${props => props.theme.transition};
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? props.theme.colors.danger : props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => transparentize(0.7, props.hasError ? props.theme.colors.danger : props.theme.colors.primary)};
  }

  &::placeholder {
    color: ${props => rgba(props.theme.colors.dark, 0.5)};
  }
`;

const TextArea = styled.textarea<{ hasError?: boolean }>`
  width: 100%;
  min-height: 120px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 2px solid ${props => props.hasError ? props.theme.colors.danger : rgba(props.theme.colors.dark, 0.1)};
  border-radius: ${props => props.theme.borderRadius};
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  transition: all ${props => props.theme.transition};
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? props.theme.colors.danger : props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => transparentize(0.7, props.hasError ? props.theme.colors.danger : props.theme.colors.primary)};
  }

  &::placeholder {
    color: ${props => rgba(props.theme.colors.dark, 0.5)};
  }
`;

const Select = styled.select<{ hasError?: boolean }>`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 2px solid ${props => props.hasError ? props.theme.colors.danger : rgba(props.theme.colors.dark, 0.1)};
  border-radius: ${props => props.theme.borderRadius};
  font-size: 1rem;
  background-color: ${props => props.theme.colors.white};
  cursor: pointer;
  transition: all ${props => props.theme.transition};
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? props.theme.colors.danger : props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => transparentize(0.7, props.hasError ? props.theme.colors.danger : props.theme.colors.primary)};
  }
`;

const ErrorMessage = styled.span`
  display: block;
  margin-top: ${props => props.theme.spacing.xs};
  color: ${props => props.theme.colors.danger};
  font-size: 0.875rem;
`;

// Navigation components
const Nav = styled.nav`
  background-color: ${props => props.theme.colors.white};
  box-shadow: ${props => props.theme.boxShadow};
  padding: ${props => props.theme.spacing.md} 0;
  margin-bottom: ${props => props.theme.spacing.xl};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const NavItem = styled.li``;

const NavLink = styled.a<{ active?: boolean }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius};
  font-weight: 500;
  transition: all ${props => props.theme.transition};
  position: relative;

  ${props => props.active ? css`
    color: ${props.theme.colors.primary};
    background-color: ${lighten(0.4, props.theme.colors.primary)};
  ` : css`
    color: ${props.theme.colors.dark};
    
    &:hover {
      color: ${props.theme.colors.primary};
      background-color: ${lighten(0.45, props.theme.colors.primary)};
    }
  `}

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    width: 0;
    height: 2px;
    background-color: ${props => props.theme.colors.primary};
    transform: translateX(-50%);
    transition: width ${props => props.theme.transition};
  }

  &:hover::after,
  ${props => props.active && css`&::after`} {
    width: 80%;
  }
`;

// Progress and status components
const ProgressBar = styled.div<{ progress: number; color?: string }>`
  width: 100%;
  height: 8px;
  background-color: ${props => rgba(props.theme.colors.dark, 0.1)};
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.progress}%;
    background-color: ${props => props.color || props.theme.colors.primary};
    transition: width 0.3s ease;
    border-radius: 4px;
  }
`;

const Badge = styled.span<{ 
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.size === 'sm' ? '0.25rem 0.5rem' : props.size === 'lg' ? '0.5rem 1rem' : '0.375rem 0.75rem'};
  font-size: ${props => props.size === 'sm' ? '0.75rem' : props.size === 'lg' ? '1rem' : '0.875rem'};
  font-weight: 500;
  line-height: 1;
  color: ${props => props.theme.colors.white};
  background-color: ${props => props.theme.colors[props.variant || 'primary']};
  border-radius: ${props => props.theme.borderRadius};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const Spinner = styled.div<{ size?: 'sm' | 'md' | 'lg' }>`
  display: inline-block;
  width: ${props => props.size === 'sm' ? '1rem' : props.size === 'lg' ? '2rem' : '1.5rem'};
  height: ${props => props.size === 'sm' ? '1rem' : props.size === 'lg' ? '2rem' : '1.5rem'};
  border: 2px solid ${props => rgba(props.theme.colors.primary, 0.3)};
  border-top-color: ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

// Modal and overlay components
const Overlay = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: ${props => props.visible ? 1 : 0};
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  transition: opacity ${props => props.theme.transition};
`;

const Modal = styled.div<{ visible: boolean }>`
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  transform: ${props => props.visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)'};
  transition: transform ${props => props.theme.transition};
`;

const ModalHeader = styled.div`
  padding: ${props => props.theme.spacing.lg};
  border-bottom: 1px solid ${props => rgba(props.theme.colors.dark, 0.1)};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    margin: 0;
  }
`;

const ModalBody = styled.div`
  padding: ${props => props.theme.spacing.lg};
`;

const ModalFooter = styled.div`
  padding: ${props => props.theme.spacing.lg};
  border-top: 1px solid ${props => rgba(props.theme.colors.dark, 0.1)};
  display: flex;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing.sm};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  color: ${props => rgba(props.theme.colors.dark, 0.6)};
  transition: color ${props => props.theme.transition};

  &:hover {
    color: ${props => props.theme.colors.dark};
  }
`;

// Notification toast
const Toast = styled.div<{ 
  visible: boolean; 
  type?: 'success' | 'error' | 'warning' | 'info' 
}>`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: ${props => {
    switch(props.type) {
      case 'success': return props.theme.colors.success;
      case 'error': return props.theme.colors.danger;
      case 'warning': return props.theme.colors.warning;
      case 'info': return props.theme.colors.info;
      default: return props.theme.colors.primary;
    }
  }};
  color: ${props => props.theme.colors.white};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1001;
  transform: ${props => props.visible ? 'translateX(0)' : 'translateX(100%)'};
  transition: transform ${props => props.theme.transition};
  min-width: 300px;
`;

// Animated elements
const BouncyElement = styled.div`
  animation: ${bounce} 2s infinite;
  display: inline-block;
`;

const FadeInElement = styled.div<{ delay?: number }>`
  animation: ${fadeIn} 0.6s ease-out;
  animation-delay: ${props => props.delay || 0}s;
  animation-fill-mode: both;
`;

// Main App Component
const StyledComponentsApp: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    category: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [progress, setProgress] = useState(75);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setModalVisible(false);
      setToastType('success');
      setToastVisible(true);
      
      setTimeout(() => {
        setToastVisible(false);
      }, 3000);
      
      setFormData({ name: '', email: '', message: '', category: '' });
    }, 2000);
  };

  const showToast = (type: typeof toastType) => {
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      
      <Header>
        <Container>
          <FadeInElement>
            <HeaderTitle>
              <BouncyElement>🎨</BouncyElement> Styled Components Demo
            </HeaderTitle>
            <HeaderSubtitle>
              A comprehensive showcase of advanced styled-components patterns and features
              for migration testing to Emotion CSS-in-JS.
            </HeaderSubtitle>
          </FadeInElement>
        </Container>
      </Header>

      <Nav>
        <Container>
          <NavList>
            <NavItem>
              <NavLink href="#home" active>Home</NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#components">Components</NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#forms">Forms</NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#about">About</NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#contact">Contact</NavLink>
            </NavItem>
          </NavList>
        </Container>
      </Nav>

      <Container>
        <Row>
          <Col md={8}>
            <FadeInElement delay={0.1}>
              <Card elevated hoverable>
                <CardHeader color={theme.colors.primary}>
                  <h3>Welcome to Styled Components</h3>
                  <p>Explore the power of CSS-in-JS with advanced styling patterns</p>
                </CardHeader>
                <CardBody>
                  <p>
                    This demo application showcases various styled-components patterns including:
                    theming, animations, responsive design, conditional styling, and complex
                    component compositions.
                  </p>
                  
                  <h4>Features Demonstrated:</h4>
                  <ul>
                    <li>Global styles with createGlobalStyle</li>
                    <li>Theme provider and theme consumption</li>
                    <li>Keyframe animations and transitions</li>
                    <li>Conditional styling with props</li>
                    <li>Media queries and responsive design</li>
                    <li>CSS helper functions from polished</li>
                    <li>Complex component compositions</li>
                    <li>Form styling and validation states</li>
                  </ul>

                  <div style={{ marginTop: '2rem' }}>
                    <h4>Progress Example:</h4>
                    <ProgressBar progress={progress} />
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: theme.colors.secondary }}>
                      Progress: {progress}%
                    </p>
                  </div>
                </CardBody>
                <CardFooter>
                  <div>
                    <Badge variant="primary" size="sm">Featured</Badge>
                    <Badge variant="success" size="sm" style={{ marginLeft: '0.5rem' }}>
                      Ready
                    </Badge>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setModalVisible(true)}
                  >
                    Open Form
                  </Button>
                </CardFooter>
              </Card>
            </FadeInElement>

            <FadeInElement delay={0.2}>
              <Card>
                <CardHeader>
                  <h3>Button Variations</h3>
                  <p>Different button styles and states</p>
                </CardHeader>
                <CardBody>
                  <Row>
                    <Col md={6}>
                      <h5>Solid Buttons</h5>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <Button variant="primary" size="sm">Primary</Button>
                        <Button variant="secondary" size="sm">Secondary</Button>
                        <Button variant="success" size="sm">Success</Button>
                        <Button variant="danger" size="sm">Danger</Button>
                      </div>
                      
                      <h5>Loading Button</h5>
                      <Button variant="primary" loading>
                        Processing...
                      </Button>
                    </Col>
                    <Col md={6}>
                      <h5>Outlined Buttons</h5>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <Button variant="primary" outlined size="sm">Primary</Button>
                        <Button variant="warning" outlined size="sm">Warning</Button>
                        <Button variant="info" outlined size="sm">Info</Button>
                        <Button variant="danger" outlined size="sm">Danger</Button>
                      </div>
                      
                      <h5>Size Variations</h5>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Button variant="primary" size="sm">Small</Button>
                        <Button variant="primary" size="md">Medium</Button>
                        <Button variant="primary" size="lg">Large</Button>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </FadeInElement>
          </Col>

          <Col md={4}>
            <FadeInElement delay={0.3}>
              <Card>
                <CardHeader color={theme.colors.info}>
                  <h3>Quick Actions</h3>
                  <p>Try out different components</p>
                </CardHeader>
                <CardBody>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Button 
                      variant="success" 
                      onClick={() => showToast('success')}
                    >
                      Show Success Toast
                    </Button>
                    <Button 
                      variant="warning" 
                      onClick={() => showToast('warning')}
                    >
                      Show Warning Toast
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => showToast('error')}
                    >
                      Show Error Toast
                    </Button>
                    <Button 
                      variant="info" 
                      onClick={() => showToast('info')}
                    >
                      Show Info Toast
                    </Button>
                  </div>
                  
                  <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <h5>Loading Spinner</h5>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                      <Spinner size="sm" />
                      <Spinner size="md" />
                      <Spinner size="lg" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </FadeInElement>

            <FadeInElement delay={0.4}>
              <Card>
                <CardHeader color={theme.colors.secondary}>
                  <h3>Status Indicators</h3>
                  <p>Various status and progress indicators</p>
                </CardHeader>
                <CardBody>
                  <div style={{ marginBottom: '1rem' }}>
                    <h5>Badges</h5>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Badge variant="primary">New</Badge>
                      <Badge variant="success">Active</Badge>
                      <Badge variant="warning">Pending</Badge>
                      <Badge variant="danger">Urgent</Badge>
                      <Badge variant="info" size="lg">Featured</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h5>Progress Bars</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <ProgressBar progress={25} color={theme.colors.danger} />
                      <ProgressBar progress={50} color={theme.colors.warning} />
                      <ProgressBar progress={75} color={theme.colors.success} />
                      <ProgressBar progress={100} color={theme.colors.primary} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </FadeInElement>
          </Col>
        </Row>
      </Container>

      {/* Modal */}
      <Overlay visible={modalVisible} onClick={() => setModalVisible(false)}>
        <Modal visible={modalVisible} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              <h2>Contact Form</h2>
              <CloseButton onClick={() => setModalVisible(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  hasError={!!errors.name}
                />
                {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  hasError={!!errors.email}
                />
                {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  hasError={!!errors.category}
                >
                  <option value="">Select a category</option>
                  <option value="general">General Inquiry</option>
                  <option value="support">Support</option>
                  <option value="billing">Billing</option>
                  <option value="feedback">Feedback</option>
                </Select>
                {errors.category && <ErrorMessage>{errors.category}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="message">Message</Label>
                <TextArea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Enter your message"
                  hasError={!!errors.message}
                />
                {errors.message && <ErrorMessage>{errors.message}</ErrorMessage>}
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setModalVisible(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                loading={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </Overlay>

      {/* Toast Notification */}
      <Toast visible={toastVisible} type={toastType}>
        {toastType === 'success' && 'Message sent successfully!'}
        {toastType === 'error' && 'An error occurred. Please try again.'}
        {toastType === 'warning' && 'Warning: Please check your input.'}
        {toastType === 'info' && 'Information: This is an info message.'}
      </Toast>
    </ThemeProvider>
  );
};

export default StyledComponentsApp;