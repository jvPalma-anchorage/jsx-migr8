import React from 'react';
import styled, { 
  css, 
  keyframes, 
  ThemeProvider, 
  createGlobalStyle,
  DefaultTheme
} from 'styled-components';

// Theme definition
const theme: DefaultTheme = {
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
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  breakpoints: {
    mobile: '576px',
    tablet: '768px',
    desktop: '992px',
    wide: '1200px'
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    fontSize: {
      small: '12px',
      medium: '16px',
      large: '20px',
      xlarge: '24px'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700
    }
  }
};

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.fontSize.medium};
    color: ${({ theme }) => theme.colors.dark};
    background-color: ${({ theme }) => theme.colors.light};
    line-height: 1.5;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: ${({ theme }) => theme.spacing.md};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

// Animations
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

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

// Mixins
const centerContent = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const textEllipsis = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const shadowMixin = css`
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// Styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 0 ${({ theme }) => theme.spacing.sm};
  }
`;

const Header = styled.header<{ sticky?: boolean }>`
  background-color: ${({ theme }) => theme.colors.white};
  border-bottom: 1px solid ${({ theme }) => theme.colors.light};
  padding: ${({ theme }) => theme.spacing.md} 0;
  ${shadowMixin}
  
  ${({ sticky }) => sticky && css`
    position: sticky;
    top: 0;
    z-index: 100;
  `}
`;

const Navigation = styled.nav`
  ${centerContent}
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const NavLink = styled.a<{ active?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: 4px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s ease;
  
  ${({ active, theme }) => active && css`
    background-color: ${theme.colors.primary};
    color: ${theme.colors.white};
  `}

  &:hover {
    background-color: ${({ theme, active }) => 
      active ? theme.colors.primary : theme.colors.light};
    text-decoration: none;
    transform: translateY(-1px);
  }
`;

const Button = styled.button<{
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
}>`
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  ${centerContent}
  gap: ${({ theme }) => theme.spacing.sm};
  position: relative;
  
  /* Size variants */
  ${({ size, theme }) => {
    switch (size) {
      case 'small':
        return css`
          padding: ${theme.spacing.xs} ${theme.spacing.sm};
          font-size: ${theme.typography.fontSize.small};
        `;
      case 'large':
        return css`
          padding: ${theme.spacing.md} ${theme.spacing.xl};
          font-size: ${theme.typography.fontSize.large};
        `;
      default:
        return css`
          padding: ${theme.spacing.sm} ${theme.spacing.md};
          font-size: ${theme.typography.fontSize.medium};
        `;
    }
  }}

  /* Color variants */
  ${({ variant, theme }) => {
    switch (variant) {
      case 'secondary':
        return css`
          background-color: ${theme.colors.secondary};
          color: ${theme.colors.white};
          
          &:hover {
            background-color: ${theme.colors.dark};
          }
        `;
      case 'danger':
        return css`
          background-color: ${theme.colors.danger};
          color: ${theme.colors.white};
          
          &:hover {
            background-color: #c82333;
          }
        `;
      case 'outline':
        return css`
          background-color: transparent;
          color: ${theme.colors.primary};
          border: 2px solid ${theme.colors.primary};
          
          &:hover {
            background-color: ${theme.colors.primary};
            color: ${theme.colors.white};
          }
        `;
      default:
        return css`
          background-color: ${theme.colors.primary};
          color: ${theme.colors.white};
          
          &:hover {
            background-color: #0056b3;
          }
        `;
    }
  }}

  ${({ fullWidth }) => fullWidth && css`
    width: 100%;
  `}

  ${({ loading }) => loading && css`
    pointer-events: none;
    opacity: 0.7;
    
    &::after {
      content: '';
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: ${spin} 1s linear infinite;
      margin-left: ${({ theme }) => theme.spacing.sm};
    }
  `}

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      transform: none;
    }
  }
`;

const Card = styled.div<{ elevated?: boolean; interactive?: boolean }>`
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: 8px;
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.light};
  
  ${({ elevated }) => elevated && shadowMixin}
  
  ${({ interactive, theme }) => interactive && css`
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
  `}
`;

const CardHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.light};
`;

const CardTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.dark};
  font-size: ${({ theme }) => theme.typography.fontSize.large};
`;

const CardContent = styled.div`
  color: ${({ theme }) => theme.colors.dark};
  line-height: 1.6;
`;

const Grid = styled.div<{ columns?: number; gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${({ columns = 1 }) => columns}, 1fr);
  gap: ${({ gap, theme }) => gap || theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const FlexBox = styled.div<{
  direction?: 'row' | 'column';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap?: string;
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${({ direction = 'row' }) => direction};
  justify-content: ${({ justify = 'flex-start' }) => justify};
  align-items: ${({ align = 'stretch' }) => align};
  gap: ${({ gap, theme }) => gap || theme.spacing.md};
  
  ${({ wrap }) => wrap && css`
    flex-wrap: wrap;
  `}
`;

const Input = styled.input<{ hasError?: boolean; fullWidth?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme, hasError }) => 
    hasError ? theme.colors.danger : theme.colors.light};
  border-radius: 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.medium};
  font-family: inherit;
  transition: all 0.2s ease;
  
  ${({ fullWidth }) => fullWidth && css`
    width: 100%;
  `}

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => 
      hasError ? theme.colors.danger : theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme, hasError }) => 
      hasError ? `${theme.colors.danger}20` : `${theme.colors.primary}20`};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.secondary};
  }
`;

const Label = styled.label<{ required?: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.dark};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: block;
  
  ${({ required, theme }) => required && css`
    &::after {
      content: ' *';
      color: ${theme.colors.danger};
    }
  `}
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.typography.fontSize.small};
  margin-top: ${({ theme }) => theme.spacing.xs};
  display: block;
`;

const Badge = styled.span<{
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
}>`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: 12px;
  font-size: ${({ theme }) => theme.typography.fontSize.small};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${({ variant = 'primary', theme }) => {
    const color = theme.colors[variant];
    return css`
      background-color: ${color}20;
      color: ${color};
      border: 1px solid ${color}40;
    `;
  }}
`;

const LoadingSpinner = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  ${centerContent}
  
  &::after {
    content: '';
    width: ${({ size }) => {
      switch (size) {
        case 'small': return '16px';
        case 'large': return '48px';
        default: return '32px';
      }
    }};
    height: ${({ size }) => {
      switch (size) {
        case 'small': return '16px';
        case 'large': return '48px';
        default: return '32px';
      }
    }};
    border: 3px solid ${({ theme }) => theme.colors.light};
    border-top: 3px solid ${({ theme }) => theme.colors.primary};
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
  }
`;

const AnimatedDiv = styled.div<{ delay?: number }>`
  animation: ${fadeIn} 0.5s ease forwards;
  animation-delay: ${({ delay = 0 }) => delay}ms;
`;

const PulseButton = styled(Button)`
  animation: ${pulse} 2s infinite;
`;

// Example usage component
const ExampleApp: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({ name: '', email: '' });
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Container>
        <Header sticky>
          <Navigation>
            <NavLink href="/" active>Home</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </Navigation>
        </Header>

        <AnimatedDiv delay={100}>
          <Grid columns={2} gap="32px">
            <Card elevated interactive>
              <CardHeader>
                <FlexBox justify="space-between" align="center">
                  <CardTitle>User Profile</CardTitle>
                  <Badge variant="success">Active</Badge>
                </FlexBox>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <FlexBox direction="column" gap="16px">
                    <div>
                      <Label required>Name</Label>
                      <Input
                        fullWidth
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        hasError={!!errors.name}
                        placeholder="Enter your name"
                      />
                      {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                    </div>
                    
                    <div>
                      <Label required>Email</Label>
                      <Input
                        fullWidth
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        hasError={!!errors.email}
                        placeholder="Enter your email"
                      />
                      {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                    </div>

                    <FlexBox gap="12px">
                      <Button type="submit" loading={loading} fullWidth>
                        Save Profile
                      </Button>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </FlexBox>
                  </FlexBox>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <FlexBox direction="column" gap="12px">
                  <Button variant="primary" size="large">
                    Primary Action
                  </Button>
                  <Button variant="secondary" size="medium">
                    Secondary Action
                  </Button>
                  <Button variant="danger" size="small">
                    Delete
                  </Button>
                  <PulseButton variant="outline">
                    Special Action
                  </PulseButton>
                </FlexBox>
                
                {loading && <LoadingSpinner size="medium" />}
              </CardContent>
            </Card>
          </Grid>
        </AnimatedDiv>
      </Container>
    </ThemeProvider>
  );
};

export default ExampleApp;
export {
  theme,
  GlobalStyle,
  Container,
  Header,
  Navigation,
  NavLink,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Grid,
  FlexBox,
  Input,
  Label,
  ErrorMessage,
  Badge,
  LoadingSpinner,
  AnimatedDiv,
  PulseButton
};