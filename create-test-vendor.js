const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ data: JSON.parse(data || '{}'), status: res.statusCode }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  // Login as admin
  const loginResult = await makeRequest({
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'admin@fairmarketplace.com', password: 'AdminPass123!' }));

  const token = loginResult.data.token;
  console.log('Got admin token');

  // Create test vendor
  const vendorResult = await makeRequest({
    hostname: 'localhost',
    port: 3002,
    path: '/api/admin/test-vendor',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  }, '{}');

  console.log('Create vendor status:', vendorResult.status);
  console.log('Vendor data:', JSON.stringify(vendorResult.data, null, 2));
}

main();
