/**
 * Fragment Handling and Nested Fragment Test Cases
 * Tests jsx-migr8's ability to handle React.Fragment, <>, and complex fragment nesting patterns
 */

import React, { Fragment, useState, useMemo, ReactNode } from 'react';
import { Button as MuiButton, Typography, Box, List, ListItem } from '@mui/material';
import { Button as AntdButton, Space, Divider } from 'antd';

// ======================
// 1. Basic Fragment Patterns
// ======================

// React.Fragment explicit usage
export const ExplicitFragment = () => {
  return (
    <React.Fragment>
      <MuiButton variant="contained">First</MuiButton>
      <MuiButton variant="outlined">Second</MuiButton>
      <AntdButton type="primary">Third</AntdButton>
    </React.Fragment>
  );
};

// Fragment shorthand syntax
export const ShorthandFragment = () => {
  return (
    <>
      <MuiButton variant="contained">First</MuiButton>
      <MuiButton variant="outlined">Second</MuiButton>
      <AntdButton type="primary">Third</AntdButton>
    </>
  );
};

// Fragment with key prop (only React.Fragment supports keys)
export const FragmentWithKey = ({ items }: { items: string[] }) => {
  return (
    <div>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <MuiButton>{item}</MuiButton>
          <Divider />
        </React.Fragment>
      ))}
    </div>
  );
};

// Mixed Fragment types
export const MixedFragmentTypes = () => {
  return (
    <div>
      <React.Fragment>
        <MuiButton>React.Fragment</MuiButton>
        <>
          <AntdButton>Shorthand inside Fragment</AntdButton>
          <Fragment>
            <MuiButton>Fragment inside shorthand</MuiButton>
          </Fragment>
        </>
      </React.Fragment>
    </div>
  );
};

// ======================
// 2. Nested Fragment Patterns
// ======================

// Deeply nested fragments
export const DeeplyNestedFragments = () => {
  return (
    <>
      <Typography>Level 1</Typography>
      <React.Fragment>
        <Typography>Level 2</Typography>
        <>
          <Typography>Level 3</Typography>
          <Fragment>
            <Typography>Level 4</Typography>
            <>
              <MuiButton>Deeply Nested Button</MuiButton>
              <React.Fragment>
                <AntdButton>Even Deeper</AntdButton>
                <>
                  <Typography>Level 6</Typography>
                </>
              </React.Fragment>
            </>
          </Fragment>
        </>
      </React.Fragment>
    </>
  );
};

// Conditional nested fragments
export const ConditionalNestedFragments = ({ 
  condition1, 
  condition2, 
  condition3 
}: { 
  condition1: boolean; 
  condition2: boolean; 
  condition3: boolean; 
}) => {
  return (
    <>
      {condition1 && (
        <React.Fragment>
          <MuiButton>Condition 1 True</MuiButton>
          {condition2 ? (
            <>
              <AntdButton>Condition 2 True</AntdButton>
              {condition3 && (
                <Fragment>
                  <Typography>All conditions true</Typography>
                  <MuiButton variant="contained">Success</MuiButton>
                </Fragment>
              )}
            </>
          ) : (
            <React.Fragment>
              <Typography>Condition 2 False</Typography>
              <AntdButton danger>Condition 2 False Button</AntdButton>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </>
  );
};

// Fragment with complex ternary operators
export const FragmentTernaryOperators = ({ mode }: { mode: 'simple' | 'complex' | 'mixed' }) => {
  return (
    <>
      {mode === 'simple' ? (
        <React.Fragment>
          <MuiButton>Simple Mode</MuiButton>
        </React.Fragment>
      ) : mode === 'complex' ? (
        <>
          <Typography>Complex Mode</Typography>
          <React.Fragment>
            <MuiButton variant="outlined">Complex Button 1</MuiButton>
            <AntdButton type="dashed">Complex Button 2</AntdButton>
          </React.Fragment>
        </>
      ) : (
        <Fragment>
          <Typography>Mixed Mode</Typography>
          {mode === 'mixed' && (
            <>
              <MuiButton color="secondary">Mixed Primary</MuiButton>
              <React.Fragment>
                <AntdButton ghost>Mixed Secondary</AntdButton>
                <Divider />
              </React.Fragment>
            </>
          )}
        </Fragment>
      )}
    </>
  );
};

// ======================
// 3. Fragment as Return Values
// ======================

// Function returning fragment
const createFragmentContent = (count: number): ReactNode => {
  if (count === 0) return null;
  
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>
          <MuiButton size="small">Item {i + 1}</MuiButton>
          {i < count - 1 && <Divider />}
        </React.Fragment>
      ))}
    </>
  );
};

export const FragmentFromFunction = ({ count }: { count: number }) => {
  return (
    <Box>
      <Typography>Generated Fragment Content:</Typography>
      {createFragmentContent(count)}
    </Box>
  );
};

// Component returning fragments conditionally
const ConditionalFragmentComponent = ({ type }: { type: 'fragment' | 'div' | 'none' }) => {
  switch (type) {
    case 'fragment':
      return (
        <>
          <MuiButton>Fragment Return</MuiButton>
          <AntdButton>Fragment Button</AntdButton>
        </>
      );
    case 'div':
      return (
        <div>
          <MuiButton>Div Return</MuiButton>
          <AntdButton>Div Button</AntdButton>
        </div>
      );
    case 'none':
      return null;
    default:
      return <Fragment />;
  }
};

export const FragmentReturnTypes = () => {
  return (
    <div>
      <ConditionalFragmentComponent type="fragment" />
      <Divider />
      <ConditionalFragmentComponent type="div" />
      <Divider />
      <ConditionalFragmentComponent type="none" />
    </div>
  );
};

// ======================
// 4. Fragment with Spread Operators
// ======================

// Fragment with spread props
export const FragmentWithSpread = ({ 
  buttons, 
  ...containerProps 
}: { 
  buttons: Array<{ label: string; variant?: string; props?: any }> 
} & any) => {
  return (
    <div {...containerProps}>
      <>
        {buttons.map((button, index) => (
          <React.Fragment key={index}>
            <MuiButton 
              variant={button.variant as any || 'contained'}
              {...button.props}
            >
              {button.label}
            </MuiButton>
            {index < buttons.length - 1 && <span style={{ margin: '0 8px' }} />}
          </React.Fragment>
        ))}
      </>
    </div>
  );
};

// Fragment with computed children
export const FragmentWithComputedChildren = ({ 
  items,
  renderItem
}: { 
  items: any[];
  renderItem?: (item: any, index: number) => ReactNode;
}) => {
  const defaultRenderItem = (item: any, index: number) => (
    <MuiButton key={index}>{String(item)}</MuiButton>
  );

  const renderFunction = renderItem || defaultRenderItem;

  return (
    <>
      {items.map((item, index) => (
        <Fragment key={index}>
          {renderFunction(item, index)}
          {index % 3 === 0 && index > 0 && <br />}
        </Fragment>
      ))}
    </>
  );
};

// ======================
// 5. Fragment Performance Patterns
// ======================

// Memoized fragment components
const MemoizedFragmentItem = React.memo(({ 
  item, 
  index 
}: { 
  item: { id: string; label: string; type: 'mui' | 'antd' }; 
  index: number;
}) => {
  return (
    <React.Fragment>
      {item.type === 'mui' ? (
        <MuiButton variant={index % 2 === 0 ? 'contained' : 'outlined'}>
          {item.label}
        </MuiButton>
      ) : (
        <AntdButton type={index % 2 === 0 ? 'primary' : 'default'}>
          {item.label}
        </AntdButton>
      )}
      {index % 5 === 0 && <Divider />}
    </React.Fragment>
  );
});

export const MemoizedFragmentList = ({ 
  items 
}: { 
  items: Array<{ id: string; label: string; type: 'mui' | 'antd' }> 
}) => {
  return (
    <>
      {items.map((item, index) => (
        <MemoizedFragmentItem key={item.id} item={item} index={index} />
      ))}
    </>
  );
};

// Lazy-loaded fragment content
const LazyFragmentContent = React.lazy(() => 
  Promise.resolve({
    default: () => (
      <>
        <MuiButton>Lazy Fragment Content</MuiButton>
        <AntdButton>Lazy Button</AntdButton>
      </>
    )
  })
);

export const LazyFragment = () => {
  return (
    <React.Suspense fallback={<div>Loading fragment...</div>}>
      <LazyFragmentContent />
    </React.Suspense>
  );
};

// ======================
// 6. Fragment Edge Cases
// ======================

// Empty fragments
export const EmptyFragments = ({ showContent }: { showContent: boolean }) => {
  return (
    <div>
      <React.Fragment />
      <Fragment></Fragment>
      <></>
      {showContent && (
        <>
          <MuiButton>Content in conditional fragment</MuiButton>
        </>
      )}
      {!showContent && <React.Fragment />}
    </div>
  );
};

// Fragment with only text nodes
export const FragmentTextNodes = () => {
  return (
    <>
      Plain text in fragment
      <React.Fragment>
        Text in React.Fragment
        {' '}
        <strong>Bold text</strong>
        {' '}
        More text
      </React.Fragment>
      <>
        Text in shorthand fragment
        <em>Italic text</em>
      </>
    </>
  );
};

// Fragment with comments and whitespace
export const FragmentWithComments = () => {
  return (
    <>
      {/* Comment in fragment */}
      <MuiButton>Before comment</MuiButton>
      <React.Fragment>
        {/* Nested comment */}
        <AntdButton>After comment</AntdButton>
        {/* Another comment */}
      </React.Fragment>
      {/* Final comment */}
    </>
  );
};

// Fragment with mixed content types
export const FragmentMixedContent = ({ 
  data 
}: { 
  data: Array<{ type: 'button' | 'text' | 'component'; content: string; props?: any }> 
}) => {
  return (
    <>
      {data.map((item, index) => (
        <React.Fragment key={index}>
          {item.type === 'button' && (
            <MuiButton {...item.props}>{item.content}</MuiButton>
          )}
          {item.type === 'text' && (
            <Typography component="span">{item.content}</Typography>
          )}
          {item.type === 'component' && (
            <>
              <AntdButton>{item.content}</AntdButton>
              <Fragment>
                <span> (nested)</span>
              </Fragment>
            </>
          )}
          {index < data.length - 1 && (
            <Fragment>
              {' | '}
            </Fragment>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

// ======================
// 7. Complex Fragment Compositions
// ======================

// Fragment-based layout system
export const FragmentLayoutSystem = ({ 
  layout 
}: { 
  layout: Array<{
    section: string;
    items: Array<{ component: 'MuiButton' | 'AntdButton'; props: any; children: ReactNode }>;
  }>
}) => {
  return (
    <>
      {layout.map((section, sectionIndex) => (
        <React.Fragment key={section.section}>
          <Typography variant="h6">{section.section}</Typography>
          <>
            {section.items.map((item, itemIndex) => (
              <Fragment key={itemIndex}>
                {item.component === 'MuiButton' ? (
                  <MuiButton {...item.props}>{item.children}</MuiButton>
                ) : (
                  <AntdButton {...item.props}>{item.children}</AntdButton>
                )}
                {itemIndex < section.items.length - 1 && (
                  <React.Fragment>
                    <span style={{ margin: '0 4px' }} />
                  </React.Fragment>
                )}
              </Fragment>
            ))}
          </>
          {sectionIndex < layout.length - 1 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
            </>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

// Dynamic fragment generation
export const DynamicFragmentGeneration = ({ 
  pattern,
  count 
}: { 
  pattern: 'alternating' | 'grouped' | 'nested';
  count: number;
}) => {
  const generatePattern = useMemo(() => {
    const items = [];
    
    for (let i = 0; i < count; i++) {
      switch (pattern) {
        case 'alternating':
          items.push(
            <React.Fragment key={i}>
              {i % 2 === 0 ? (
                <MuiButton size="small">MUI {i}</MuiButton>
              ) : (
                <AntdButton size="small">Antd {i}</AntdButton>
              )}
            </React.Fragment>
          );
          break;
          
        case 'grouped':
          if (i % 3 === 0) {
            items.push(
              <Fragment key={i}>
                <MuiButton>Group {Math.floor(i / 3)}</MuiButton>
                <AntdButton>Item 1</AntdButton>
                <AntdButton>Item 2</AntdButton>
              </Fragment>
            );
          }
          break;
          
        case 'nested':
          items.push(
            <React.Fragment key={i}>
              <>
                <MuiButton>Outer {i}</MuiButton>
                <Fragment>
                  <AntdButton>Inner {i}</AntdButton>
                  <>
                    <Typography variant="caption">Deep {i}</Typography>
                  </>
                </Fragment>
              </>
            </React.Fragment>
          );
          break;
      }
    }
    
    return items;
  }, [pattern, count]);

  return <>{generatePattern}</>;
};

// Main test component
export const FragmentPatternTests = () => {
  const [showConditional, setShowConditional] = useState(true);
  const [mode, setMode] = useState<'simple' | 'complex' | 'mixed'>('simple');
  
  const sampleData = [
    { type: 'button', content: 'Button Item', props: { variant: 'contained' } },
    { type: 'text', content: 'Text Item' },
    { type: 'component', content: 'Component Item' }
  ] as const;

  const layoutData = [
    {
      section: 'Primary Actions',
      items: [
        { component: 'MuiButton' as const, props: { variant: 'contained' }, children: 'Save' },
        { component: 'AntdButton' as const, props: { type: 'primary' }, children: 'Submit' }
      ]
    },
    {
      section: 'Secondary Actions',
      items: [
        { component: 'MuiButton' as const, props: { variant: 'outlined' }, children: 'Cancel' },
        { component: 'AntdButton' as const, props: { type: 'default' }, children: 'Reset' }
      ]
    }
  ];

  return (
    <div>
      <Typography variant="h4">Fragment Pattern Tests</Typography>
      
      <section>
        <Typography variant="h5">1. Basic Fragments</Typography>
        <ExplicitFragment />
        <Divider />
        <ShorthandFragment />
        <Divider />
        <FragmentWithKey items={['Key 1', 'Key 2', 'Key 3']} />
      </section>

      <section>
        <Typography variant="h5">2. Nested Fragments</Typography>
        <DeeplyNestedFragments />
        <Divider />
        <ConditionalNestedFragments 
          condition1={showConditional} 
          condition2={true} 
          condition3={showConditional} 
        />
        <Divider />
        <FragmentTernaryOperators mode={mode} />
      </section>

      <section>
        <Typography variant="h5">3. Fragment Returns</Typography>
        <FragmentFromFunction count={3} />
        <Divider />
        <FragmentReturnTypes />
      </section>

      <section>
        <Typography variant="h5">4. Fragment with Spread</Typography>
        <FragmentWithSpread 
          buttons={[
            { label: 'Button 1', variant: 'contained' },
            { label: 'Button 2', variant: 'outlined' }
          ]} 
        />
        <Divider />
        <FragmentWithComputedChildren items={['A', 'B', 'C', 'D', 'E']} />
      </section>

      <section>
        <Typography variant="h5">5. Performance Patterns</Typography>
        <MemoizedFragmentList items={[
          { id: '1', label: 'Memoized 1', type: 'mui' },
          { id: '2', label: 'Memoized 2', type: 'antd' }
        ]} />
        <Divider />
        <LazyFragment />
      </section>

      <section>
        <Typography variant="h5">6. Edge Cases</Typography>
        <EmptyFragments showContent={showConditional} />
        <Divider />
        <FragmentTextNodes />
        <Divider />
        <FragmentWithComments />
        <Divider />
        <FragmentMixedContent data={sampleData} />
      </section>

      <section>
        <Typography variant="h5">7. Complex Compositions</Typography>
        <FragmentLayoutSystem layout={layoutData} />
        <Divider />
        <DynamicFragmentGeneration pattern="alternating" count={5} />
      </section>

      <div>
        <MuiButton onClick={() => setShowConditional(!showConditional)}>
          Toggle Conditional: {showConditional ? 'ON' : 'OFF'}
        </MuiButton>
        <MuiButton onClick={() => {
          const modes: Array<'simple' | 'complex' | 'mixed'> = ['simple', 'complex', 'mixed'];
          const currentIndex = modes.indexOf(mode);
          setMode(modes[(currentIndex + 1) % modes.length]);
        }}>
          Cycle Mode: {mode}
        </MuiButton>
      </div>
    </div>
  );
};

export default FragmentPatternTests;