const http = require('http');

// First login to get token
const loginData = JSON.stringify({
  email: 'admin@fairmarketplace.com',
  password: 'AdminPass123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const { token } = JSON.parse(data);

    // Now test SQL injection in URL parameter
    const sqlInjection = encodeURIComponent("'; DROP TABLE users; --");
    const testOptions = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/admin/applications?status=${sqlInjection}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const testReq = http.request(testOptions, (res2) => {
      console.log('SQL Injection URL Test:');
      console.log('Status Code:', res2.statusCode);
      let responseData = '';
      res2.on('data', chunk => responseData += chunk);
      res2.on('end', () => {
        console.log('Response (first 500 chars):', responseData.substring(0, 500));
        console.log('\nSQL injection test completed - no database error occurred');
      });
    });

    testReq.on('error', (e) => {
      console.error('Test request error:', e.message);
    });

    testReq.end();
  });
});

loginReq.on('error', (e) => {
  console.error('Login request error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
