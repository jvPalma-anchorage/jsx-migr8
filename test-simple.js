// Simple test to check if API is working
fetch('http://localhost:3000/health')
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err.message));