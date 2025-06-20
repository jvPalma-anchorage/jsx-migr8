/**
 * Portal Usage and Ref Forwarding Test Cases
 * Tests jsx-migr8's ability to handle React Portals, complex ref patterns, and forwarding refs
 */

import React, { 
  createPortal, 
  useRef, 
  useImperativeHandle, 
  forwardRef, 
  useEffect, 
  useState, 
  useCallback,
  RefObject,
  MutableRefObject,
  Ref
} from 'react';
import { Button as MuiButton, Dialog, Popper, Tooltip } from '@mui/material';
import { Button as AntdButton, Modal, Popover, Drawer } from 'antd';

// ======================
// 1. Basic Portal Patterns
// ======================

// Simple portal to document.body
export const SimplePortal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(
    <div style={{ 
      position: 'fixed', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      background: 'white',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px'
    }}>
      {children}
    </div>,
    document.body
  );
};

// Portal with custom container
export const CustomContainerPortal = ({ 
  containerId, 
  children 
}: { 
  containerId: string; 
  children: React.ReactNode;
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById(containerId);
    if (!element) {
      element = document.createElement('div');
      element.id = containerId;
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.zIndex = '1000';
      document.body.appendChild(element);
    }
    setContainer(element);

    return () => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, [containerId]);

  if (!container) return null;

  return createPortal(
    <div style={{ padding: '10px', background: 'rgba(0,0,0,0.1)' }}>
      {children}
    </div>,
    container
  );
};

// Conditional portal
export const ConditionalPortal = ({ 
  usePortal, 
  children 
}: { 
  usePortal: boolean; 
  children: React.ReactNode;
}) => {
  const content = (
    <div style={{ padding: '10px', border: '2px solid blue' }}>
      {children}
    </div>
  );

  return usePortal ? createPortal(content, document.body) : content;
};

// ======================
// 2. Complex Portal Usage
// ======================

// Portal with component state
export const StatefulPortal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('Initial message');

  const portalContent = (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'lightblue',
      padding: '15px',
      borderRadius: '5px',
      maxWidth: '300px'
    }}>
      <p>{message}</p>
      <MuiButton onClick={() => setMessage(`Updated at ${new Date().toLocaleTimeString()}`)}>
        Update Message
      </MuiButton>
      <AntdButton onClick={() => setIsOpen(false)} danger>
        Close Portal
      </AntdButton>
    </div>
  );

  return (
    <div>
      <MuiButton onClick={() => setIsOpen(true)}>
        Open Stateful Portal
      </MuiButton>
      {isOpen && createPortal(portalContent, document.body)}
    </div>
  );
};

// Portal with event handling
export const EventHandlingPortal = () => {
  const [events, setEvents] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addEvent = useCallback((event: string) => {
    setEvents(prev => [...prev.slice(-4), `${event} at ${new Date().toLocaleTimeString()}`]);
  }, []);

  const portalContent = (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'lightyellow',
        padding: '15px',
        borderRadius: '5px',
        minWidth: '250px'
      }}
      onClick={() => addEvent('Portal clicked')}
      onMouseEnter={() => addEvent('Mouse entered portal')}
      onMouseLeave={() => addEvent('Mouse left portal')}
    >
      <div>
        <h4>Event Log:</h4>
        {events.map((event, index) => (
          <div key={index} style={{ fontSize: '12px' }}>{event}</div>
        ))}
      </div>
      <MuiButton 
        onClick={(e) => {
          e.stopPropagation();
          addEvent('Button clicked');
        }}
        size="small"
      >
        Click Me
      </MuiButton>
      <AntdButton 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
        }}
        size="small"
        type="primary"
      >
        Close
      </AntdButton>
    </div>
  );

  return (
    <div>
      <MuiButton onClick={() => setIsOpen(true)}>
        Open Event Portal
      </MuiButton>
      {isOpen && createPortal(portalContent, document.body)}
    </div>
  );
};

// ======================
// 3. Basic Ref Forwarding
// ======================

// Simple forwardRef component
const ForwardRefButton = forwardRef<HTMLButtonElement, any>(
  ({ children, variant, ...props }, ref) => {
    return (
      <MuiButton ref={ref} variant={variant} {...props}>
        {children}
      </MuiButton>
    );
  }
);

// Antd forwardRef component
const ForwardRefAntdButton = forwardRef<any, any>(
  ({ children, ...props }, ref) => {
    return (
      <AntdButton ref={ref} {...props}>
        {children}
      </AntdButton>
    );
  }
);

// Using forwardRef components
export const BasicRefForwarding = () => {
  const muiButtonRef = useRef<HTMLButtonElement>(null);
  const antdButtonRef = useRef<any>(null);

  const handleFocusMui = () => {
    muiButtonRef.current?.focus();
    console.log('MUI Button focused:', muiButtonRef.current);
  };

  const handleFocusAntd = () => {
    antdButtonRef.current?.focus();
    console.log('Antd Button focused:', antdButtonRef.current);
  };

  return (
    <div>
      <ForwardRefButton ref={muiButtonRef} variant="contained">
        Forward Ref MUI Button
      </ForwardRefButton>
      <ForwardRefAntdButton ref={antdButtonRef} type="primary">
        Forward Ref Antd Button
      </ForwardRefAntdButton>
      <div>
        <MuiButton onClick={handleFocusMui}>Focus MUI</MuiButton>
        <MuiButton onClick={handleFocusAntd}>Focus Antd</MuiButton>
      </div>
    </div>
  );
};

// ======================
// 4. Complex Ref Patterns
// ======================

// Multiple ref forwarding
const MultiRefComponent = forwardRef<
  { button: HTMLButtonElement | null; container: HTMLDivElement | null },
  { children: React.ReactNode; variant?: string }
>(({ children, variant }, ref) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    button: buttonRef.current,
    container: containerRef.current
  }));

  return (
    <div ref={containerRef} style={{ padding: '10px', border: '1px solid gray' }}>
      <MuiButton ref={buttonRef} variant={variant as any}>
        {children}
      </MuiButton>
    </div>
  );
});

export const MultipleRefForwarding = () => {
  const multiRef = useRef<{ button: HTMLButtonElement | null; container: HTMLDivElement | null }>(null);

  const handleInteraction = () => {
    if (multiRef.current) {
      const { button, container } = multiRef.current;
      button?.focus();
      if (container) {
        container.style.backgroundColor = container.style.backgroundColor === 'lightblue' ? '' : 'lightblue';
      }
    }
  };

  return (
    <div>
      <MultiRefComponent ref={multiRef} variant="outlined">
        Multi-Ref Component
      </MultiRefComponent>
      <MuiButton onClick={handleInteraction}>
        Interact with Multi-Ref
      </MuiButton>
    </div>
  );
};

// Ref with useImperativeHandle
interface CustomButtonHandle {
  focus: () => void;
  shake: () => void;
  updateText: (text: string) => void;
  getClickCount: () => number;
}

const CustomImperativeButton = forwardRef<CustomButtonHandle, { 
  initialText: string; 
  onCustomClick?: () => void; 
}>((
  { initialText, onCustomClick },
  ref
) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState(initialText);
  const [clickCount, setClickCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => buttonRef.current?.focus(),
    shake: () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    },
    updateText: (newText: string) => setText(newText),
    getClickCount: () => clickCount
  }));

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    onCustomClick?.();
  };

  return (
    <MuiButton
      ref={buttonRef}
      onClick={handleClick}
      style={{
        transform: isShaking ? 'translateX(5px)' : 'translateX(0)',
        transition: 'transform 0.1s'
      }}
      variant="contained"
    >
      {text} (Clicked: {clickCount})
    </MuiButton>
  );
});

export const ImperativeHandleExample = () => {
  const customButtonRef = useRef<CustomButtonHandle>(null);

  const handleShake = () => customButtonRef.current?.shake();
  const handleUpdateText = () => customButtonRef.current?.updateText(`Updated ${Date.now()}`);
  const handleGetCount = () => {
    const count = customButtonRef.current?.getClickCount();
    alert(`Click count: ${count}`);
  };

  return (
    <div>
      <CustomImperativeButton 
        ref={customButtonRef}
        initialText="Custom Button"
        onCustomClick={() => console.log('Custom click handler')}
      />
      <div>
        <AntdButton onClick={handleShake}>Shake</AntdButton>
        <AntdButton onClick={handleUpdateText}>Update Text</AntdButton>
        <AntdButton onClick={handleGetCount}>Get Count</AntdButton>
      </div>
    </div>
  );
};

// ======================
// 5. Portal + Ref Combinations
// ======================

// Portal with forwarded refs
const PortalWithRef = forwardRef<HTMLDivElement, { 
  children: React.ReactNode; 
  containerId?: string; 
}>(({ children, containerId = 'default-portal' }, ref) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const internalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let element = document.getElementById(containerId);
    if (!element) {
      element = document.createElement('div');
      element.id = containerId;
      element.style.position = 'fixed';
      element.style.top = '50px';
      element.style.right = '50px';
      element.style.zIndex = '1001';
      document.body.appendChild(element);
    }
    setContainer(element);

    return () => {
      if (element && element.parentNode && !document.getElementById(containerId)) {
        element.parentNode.removeChild(element);
      }
    };
  }, [containerId]);

  useImperativeHandle(ref, () => internalRef.current!);

  if (!container) return null;

  return createPortal(
    <div 
      ref={internalRef}
      style={{ 
        background: 'white', 
        padding: '15px', 
        border: '2px solid green',
        borderRadius: '8px'
      }}
    >
      {children}
    </div>,
    container
  );
});

export const PortalRefCombination = () => {
  const [showPortal, setShowPortal] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  const handlePortalInteraction = () => {
    if (portalRef.current) {
      portalRef.current.style.backgroundColor = 
        portalRef.current.style.backgroundColor === 'lightcoral' ? 'white' : 'lightcoral';
    }
  };

  return (
    <div>
      <MuiButton onClick={() => setShowPortal(!showPortal)}>
        {showPortal ? 'Hide' : 'Show'} Portal with Ref
      </MuiButton>
      
      {showPortal && (
        <PortalWithRef ref={portalRef} containerId="ref-portal">
          <p>Portal content with forwarded ref</p>
          <MuiButton onClick={handlePortalInteraction}>
            Change Portal Background
          </MuiButton>
          <AntdButton onClick={() => setShowPortal(false)} danger>
            Close
          </AntdButton>
        </PortalWithRef>
      )}
    </div>
  );
};

// ======================
// 6. Advanced Ref Patterns
// ======================

// Ref callback patterns
export const RefCallbackPatterns = () => {
  const [elements, setElements] = useState<HTMLElement[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const refCallback = useCallback((element: HTMLButtonElement | null, index: number) => {
    setElements(prev => {
      const newElements = [...prev];
      if (element) {
        newElements[index] = element;
      } else {
        newElements[index] = null as any;
      }
      return newElements.filter(Boolean);
    });
  }, []);

  const focusElement = (index: number) => {
    if (elements[index]) {
      (elements[index] as any).focus?.();
      setFocusedIndex(index);
    }
  };

  return (
    <div>
      <h4>Ref Callback Pattern</h4>
      {[...Array(5)].map((_, index) => (
        <MuiButton
          key={index}
          ref={(el) => refCallback(el, index)}
          variant={focusedIndex === index ? 'contained' : 'outlined'}
          onClick={() => focusElement(index)}
          style={{ margin: '2px' }}
        >
          Button {index + 1}
        </MuiButton>
      ))}
      <div>
        <AntdButton onClick={() => focusElement(0)}>Focus First</AntdButton>
        <AntdButton onClick={() => focusElement(elements.length - 1)}>Focus Last</AntdButton>
      </div>
    </div>
  );
};

// Ref sharing between components
const useSharedRef = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [sharedElement, setSharedElement] = useState<T | null>(null);

  const setRef = useCallback((element: T | null) => {
    ref.current = element;
    setSharedElement(element);
  }, []);

  return { ref: setRef, element: sharedElement, refObject: ref };
};

export const SharedRefPattern = () => {
  const { ref: sharedRef, element, refObject } = useSharedRef<HTMLButtonElement>();
  const [interactionCount, setInteractionCount] = useState(0);

  const handleSharedInteraction = () => {
    if (element) {
      element.style.transform = 'scale(1.1)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
      setInteractionCount(prev => prev + 1);
    }
  };

  return (
    <div>
      <MuiButton 
        ref={sharedRef}
        variant="contained"
        onClick={handleSharedInteraction}
      >
        Shared Ref Button (Interactions: {interactionCount})
      </MuiButton>
      
      <div>
        <AntdButton 
          onClick={() => refObject.current?.click()}
          type="dashed"
        >
          Trigger via Ref Object
        </AntdButton>
        <AntdButton 
          onClick={() => element?.focus()}
          type="default"
        >
          Focus via Element
        </AntdButton>
      </div>
    </div>
  );
};

// ======================
// 7. Dynamic Portal and Ref Management
// ======================

// Dynamic portal manager
export const DynamicPortalManager = () => {
  const [portals, setPortals] = useState<Array<{
    id: string;
    content: React.ReactNode;
    position: { x: number; y: number };
    ref: RefObject<HTMLDivElement>;
  }>>([]);

  const addPortal = () => {
    const id = `portal-${Date.now()}`;
    const ref = { current: null } as RefObject<HTMLDivElement>;
    
    setPortals(prev => [...prev, {
      id,
      ref,
      position: { 
        x: Math.random() * (window.innerWidth - 200), 
        y: Math.random() * (window.innerHeight - 200) 
      },
      content: (
        <div style={{ background: 'lightgreen', padding: '10px', borderRadius: '5px' }}>
          <p>Dynamic Portal {id}</p>
          <MuiButton 
            size="small" 
            onClick={() => removePortal(id)}
            variant="outlined"
          >
            Close
          </MuiButton>
        </div>
      )
    }]);
  };

  const removePortal = (id: string) => {
    setPortals(prev => prev.filter(portal => portal.id !== id));
  };

  const movePortal = (id: string) => {
    setPortals(prev => prev.map(portal => 
      portal.id === id 
        ? { 
            ...portal, 
            position: { 
              x: Math.random() * (window.innerWidth - 200), 
              y: Math.random() * (window.innerHeight - 200) 
            } 
          }
        : portal
    ));
  };

  return (
    <div>
      <div>
        <MuiButton onClick={addPortal} variant="contained">
          Add Dynamic Portal
        </MuiButton>
        <AntdButton onClick={() => setPortals([])} danger>
          Clear All Portals
        </AntdButton>
        <span style={{ marginLeft: '10px' }}>Active Portals: {portals.length}</span>
      </div>

      {portals.map(portal => 
        createPortal(
          <div
            key={portal.id}
            ref={portal.ref}
            style={{
              position: 'fixed',
              left: portal.position.x,
              top: portal.position.y,
              zIndex: 1002,
              cursor: 'move'
            }}
            onClick={() => movePortal(portal.id)}
          >
            {portal.content}
          </div>,
          document.body
        )
      )}
    </div>
  );
};

// Main test component
export const PortalRefPatternTests = () => {
  const [activeSection, setActiveSection] = useState<string>('basic');

  const sections = {
    basic: 'Basic Portals',
    complex: 'Complex Portals', 
    refs: 'Ref Forwarding',
    advanced: 'Advanced Patterns',
    combined: 'Combined Patterns',
    dynamic: 'Dynamic Management'
  };

  return (
    <div>
      <h2>Portal and Ref Pattern Tests</h2>
      
      <div style={{ marginBottom: '20px' }}>
        {Object.entries(sections).map(([key, label]) => (
          <MuiButton
            key={key}
            onClick={() => setActiveSection(key)}
            variant={activeSection === key ? 'contained' : 'outlined'}
            style={{ margin: '2px' }}
            size="small"
          >
            {label}
          </MuiButton>
        ))}
      </div>

      {activeSection === 'basic' && (
        <div>
          <h3>Basic Portal Patterns</h3>
          <SimplePortal>
            <p>Simple Portal Content</p>
            <MuiButton>Portal Button</MuiButton>
          </SimplePortal>
          <CustomContainerPortal containerId="test-container">
            <AntdButton type="primary">Custom Container Portal</AntdButton>
          </CustomContainerPortal>
          <ConditionalPortal usePortal={true}>
            <p>Conditional Portal (using portal)</p>
          </ConditionalPortal>
        </div>
      )}

      {activeSection === 'complex' && (
        <div>
          <h3>Complex Portal Usage</h3>
          <StatefulPortal />
          <EventHandlingPortal />
        </div>
      )}

      {activeSection === 'refs' && (
        <div>
          <h3>Ref Forwarding</h3>
          <BasicRefForwarding />
          <MultipleRefForwarding />
          <ImperativeHandleExample />
        </div>
      )}

      {activeSection === 'advanced' && (
        <div>
          <h3>Advanced Patterns</h3>
          <RefCallbackPatterns />
          <SharedRefPattern />
        </div>
      )}

      {activeSection === 'combined' && (
        <div>
          <h3>Combined Patterns</h3>
          <PortalRefCombination />
        </div>
      )}

      {activeSection === 'dynamic' && (
        <div>
          <h3>Dynamic Management</h3>
          <DynamicPortalManager />
        </div>
      )}
    </div>
  );
};

export default PortalRefPatternTests;