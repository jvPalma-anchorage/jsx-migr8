import http from 'http';

console.log('Testing API on http://localhost:3000');

// Test 1: Health check
function testHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Health check response:', res.statusCode, data);
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (err) => {
      console.error('Health check error:', err.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.error('Health check timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Create project
function createProject() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      path: '/data/data/com.termux/files/home/coder/apps/backoffice',
      name: 'Test Project'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Create project response:', res.statusCode, data);
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.data?.id);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('Create project error:', err.message);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('\n1. Testing health endpoint...');
  const healthOk = await testHealth();
  console.log(healthOk ? '✓ Health check passed' : '✗ Health check failed');
  
  if (!healthOk) {
    console.log('\nAPI server is not responding. Please ensure it is running.');
    return;
  }
  
  console.log('\n2. Creating project...');
  const projectId = await createProject();
  console.log(projectId ? `✓ Project created: ${projectId}` : '✗ Project creation failed');
}

runTests().catch(console.error);