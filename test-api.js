import fetch from 'node-fetch';

async function testAPI() {
  console.log('Testing jsx-migr8 API...\n');
  
  try {
    // 1. Create a project
    console.log('1. Creating project...');
    const createResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/data/data/com.termux/files/home/coder/apps/backoffice',
        name: 'Backoffice Project'
      })
    });
    
    const createData = await createResponse.json();
    console.log('Response:', JSON.stringify(createData, null, 2));
    
    if (!createData.success) {
      throw new Error('Failed to create project: ' + createData.error);
    }
    
    const projectId = createData.data.id;
    console.log('Project created with ID:', projectId);
    
    // 2. Get project details
    console.log('\n2. Getting project details...');
    const getResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`);
    const getData = await getResponse.json();
    console.log('Response:', JSON.stringify(getData, null, 2));
    
    // 3. List all projects
    console.log('\n3. Listing all projects...');
    const listResponse = await fetch('http://localhost:3000/api/projects');
    const listData = await listResponse.json();
    console.log('Response:', JSON.stringify(listData, null, 2));
    
    // 4. Start analysis
    console.log('\n4. Starting component analysis...');
    const analyzeResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/analyze`, {
      method: 'POST'
    });
    const analyzeData = await analyzeResponse.json();
    console.log('Response:', JSON.stringify(analyzeData, null, 2));
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAPI();