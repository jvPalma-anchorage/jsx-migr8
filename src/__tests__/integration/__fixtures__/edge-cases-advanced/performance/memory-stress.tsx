/**
 * Memory and performance stress tests
 * Tests tool's ability to handle extreme memory pressure and large-scale operations
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Button, Grid, List, ListItem } from '@mui/material';
import { Button as AntButton, Table } from 'antd';

// Generate massive array of components
const MASSIVE_ARRAY_SIZE = 10000;

// Memory-intensive component with large props
export const MemoryIntensiveComponent = memo(() => {
  // Create large objects in props
  const massiveProps = useMemo(() => {
    const props: any = {};
    for (let i = 0; i < 1000; i++) {
      props[`prop${i}`] = {
        value: `value${i}`,
        nested: {
          deep: {
            array: new Array(100).fill(i),
            string: 'x'.repeat(1000)
          }
        }
      };
    }
    return props;
  }, []);

  return (
    <Button {...massiveProps}>
      Memory Intensive Button
    </Button>
  );
});

// Circular reference patterns
export const CircularReferenceComponent = () => {
  const obj: any = { name: 'root' };
  obj.self = obj;
  obj.children = [obj, obj, obj];
  
  const Component: any = (props: any) => <Button {...props} />;
  Component.CircularRef = Component;
  
  return (
    <div>
      <Component data={obj}>Circular Props</Component>
      <Component.CircularRef>Self Reference</Component.CircularRef>
    </div>
  );
};

// Infinite component generation
export const InfiniteComponentGenerator = () => {
  const components = [];
  
  // This could theoretically run forever if not careful
  function* componentGenerator() {
    let i = 0;
    while (i < MASSIVE_ARRAY_SIZE) {
      yield (
        <Button key={i} onClick={() => console.log(i)}>
          Generated {i}
        </Button>
      );
      i++;
    }
  }

  const generator = componentGenerator();
  for (let i = 0; i < 100; i++) {
    const { value, done } = generator.next();
    if (!done) components.push(value);
  }

  return <>{components}</>;
};

// Deep cloning stress test
export const DeepCloningStress = () => {
  const createDeepStructure = (depth: number): any => {
    if (depth === 0) return { value: 'leaf' };
    
    return {
      level: depth,
      child: createDeepStructure(depth - 1),
      array: Array(10).fill(null).map(() => createDeepStructure(depth - 1)),
      component: <Button>Level {depth}</Button>
    };
  };

  const deepStructure = createDeepStructure(20);

  return (
    <div>
      {JSON.stringify(deepStructure).slice(0, 100)}...
    </div>
  );
};

// Memory leak patterns
export const MemoryLeakPatterns = () => {
  // Accumulating closures
  const closures: (() => void)[] = [];
  
  for (let i = 0; i < 1000; i++) {
    const largeData = new Array(1000).fill(i);
    closures.push(() => {
      console.log(largeData);
    });
  }

  // Event listeners without cleanup
  React.useEffect(() => {
    const handlers: ((e: Event) => void)[] = [];
    
    for (let i = 0; i < 100; i++) {
      const handler = (e: Event) => console.log(i, e);
      handlers.push(handler);
      window.addEventListener('click', handler);
    }

    // Intentionally not cleaning up to test memory handling
  }, []);

  return (
    <Button onClick={() => closures.forEach(fn => fn())}>
      Trigger Closures
    </Button>
  );
};

// Massive DOM tree generation
export const MassiveDOMTree = () => {
  const generateTree = (depth: number, breadth: number): JSX.Element => {
    if (depth === 0) {
      return <Button size="small">Leaf</Button>;
    }

    return (
      <Grid container>
        {Array.from({ length: breadth }, (_, i) => (
          <Grid item key={i}>
            {generateTree(depth - 1, breadth)}
          </Grid>
        ))}
      </Grid>
    );
  };

  // This creates an exponentially growing tree
  return generateTree(5, 4); // 4^5 = 1024 leaf nodes
};

// String concatenation stress
export const StringConcatenationStress = () => {
  let massiveString = '';
  
  for (let i = 0; i < 10000; i++) {
    massiveString += `<Button variant="contained" color="primary" data-index="${i}">Item ${i}</Button>`;
  }

  // Creating massive inline styles
  const style: any = {};
  for (let i = 0; i < 1000; i++) {
    style[`--custom-var-${i}`] = `${i}px`;
  }

  return (
    <div style={style}>
      <div dangerouslySetInnerHTML={{ __html: massiveString.slice(0, 1000) }} />
    </div>
  );
};

// Recursive memoization stress
export const RecursiveMemoization = memo(({ level = 0 }: { level?: number }) => {
  const memoizedValue = useMemo(() => {
    const compute = (n: number): number => {
      if (n <= 1) return n;
      return compute(n - 1) + compute(n - 2);
    };
    
    return compute(30); // Fibonacci without optimization
  }, []);

  if (level > 10) return <Button>Max depth</Button>;

  return (
    <div>
      <Button>Level {level} - Fib: {memoizedValue}</Button>
      <RecursiveMemoization level={level + 1} />
    </div>
  );
});

// Concurrent operations stress
export const ConcurrentOperationsStress = () => {
  const operations = Array.from({ length: 100 }, (_, i) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(
          <Button key={i} variant={i % 2 === 0 ? 'contained' : 'outlined'}>
            Async {i}
          </Button>
        );
      }, Math.random() * 1000);
    });
  });

  const [components, setComponents] = React.useState<JSX.Element[]>([]);

  React.useEffect(() => {
    Promise.all(operations).then(results => {
      setComponents(results as JSX.Element[]);
    });
  }, []);

  return <div>{components}</div>;
};

// Table with massive data
export const MassiveTableStress = () => {
  const columns = Array.from({ length: 50 }, (_, i) => ({
    title: `Column ${i}`,
    dataIndex: `col${i}`,
    key: `col${i}`,
    render: (text: any) => <Button size="small">{text}</Button>
  }));

  const data = Array.from({ length: 1000 }, (_, rowIndex) => {
    const row: any = { key: rowIndex };
    columns.forEach((col, colIndex) => {
      row[col.dataIndex] = `R${rowIndex}C${colIndex}`;
    });
    return row;
  });

  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: 5000, y: 500 }}
    />
  );
};

// Memory allocation patterns
export const MemoryAllocationPatterns = () => {
  // Typed arrays
  const float32Array = new Float32Array(1000000);
  const uint8Array = new Uint8Array(1000000);
  
  // ArrayBuffers
  const buffer = new ArrayBuffer(1024 * 1024); // 1MB
  const view = new DataView(buffer);
  
  // WeakMaps to test garbage collection
  const weakMap = new WeakMap();
  const objects = Array.from({ length: 1000 }, () => ({ id: Math.random() }));
  
  objects.forEach(obj => {
    weakMap.set(obj, <Button>Weak ref</Button>);
  });

  return (
    <div>
      <Button>
        Allocated {float32Array.byteLength + uint8Array.byteLength + buffer.byteLength} bytes
      </Button>
    </div>
  );
};