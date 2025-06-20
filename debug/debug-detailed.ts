import { buildGraph } from "./src/graph/buildGraph";
import { initContext } from "./src/context/globalContext";
import { getCompName } from "./src/utils/pathUtils";

(async () => {
  await initContext();
  const graph = buildGraph('/data/data/com.termux/files/home/jsx-migr8/test-react-project', ['node_modules', '.git']);
  
  console.log('=== ANALYZING JSX ELEMENTS ===');
  
  // Look for any JSX elements with empty or problematic component names
  const emptyNames = graph.jsx.filter(jsx => !jsx.componentName || jsx.componentName.trim() === '');
  const problematicNames = graph.jsx.filter(jsx => 
    jsx.componentName.includes('*') || 
    jsx.componentName === 'default' || 
    jsx.componentName === 'undefined' ||
    jsx.componentName === 'null'
  );
  
  console.log(`Empty component names: ${emptyNames.length}`);
  console.log(`Problematic component names: ${problematicNames.length}`);
  
  if (emptyNames.length > 0) {
    console.log('\n=== EMPTY COMPONENT NAMES ===');
    emptyNames.forEach((jsx, i) => {
      console.log(`[${i}] ComponentName: "${jsx.componentName}"`);
      console.log(`    File: ${jsx.file.split('/').pop()}`);
      console.log(`    ImportRef: pkg="${jsx.importRef.pkg}", imported="${jsx.importRef.imported}", local="${jsx.importRef.local}", type="${jsx.importRef.importedType}"`);
      console.log(`    Recalculated name: "${getCompName(jsx.importRef.local, jsx.importRef.imported, jsx.importRef.importedType)}"`);
      console.log('');
    });
  }
  
  if (problematicNames.length > 0) {
    console.log('\n=== PROBLEMATIC COMPONENT NAMES ===');
    problematicNames.forEach((jsx, i) => {
      console.log(`[${i}] ComponentName: "${jsx.componentName}"`);
      console.log(`    File: ${jsx.file.split('/').pop()}`);
      console.log(`    ImportRef: pkg="${jsx.importRef.pkg}", imported="${jsx.importRef.imported}", local="${jsx.importRef.local}", type="${jsx.importRef.importedType}"`);
      console.log(`    Recalculated name: "${getCompName(jsx.importRef.local, jsx.importRef.imported, jsx.importRef.importedType)}"`);
      console.log('');
    });
  }
  
  // Check all unique component names
  const allComponentNames = [...new Set(graph.jsx.map(jsx => jsx.componentName))];
  console.log('\n=== ALL UNIQUE COMPONENT NAMES ===');
  allComponentNames.sort().forEach(name => {
    const count = graph.jsx.filter(jsx => jsx.componentName === name).length;
    console.log(`"${name}" (${count} usages)`);
  });
  
  // Show statistics about component names
  console.log('\n=== COMPONENT NAME STATISTICS ===');
  console.log(`Total JSX elements: ${graph.jsx.length}`);
  console.log(`Unique component names: ${allComponentNames.length}`);
  console.log(`Empty names: ${emptyNames.length}`);
  console.log(`Names with special characters: ${allComponentNames.filter(name => name.includes('*') || name.includes('.') || name.includes('/')).length}`);
})();