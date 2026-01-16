const jwt = require('jsonwebtoken');
const secret = 'your-super-secret-jwt-key-change-in-production';

// Create an expired token (expired 1 hour ago)
const expiredToken = jwt.sign(
  { userId: 'test-user-id' },
  secret,
  { expiresIn: '-1h' }
);

console.log('Expired token:', expiredToken);
