const assert = require('assert');
const axios = require('axios');

// Test 1: Authentication Service Health Check
describe('Auth Service', () => {
  it('should return 200 from /login', async () => {
    const response = await axios.post('http://localhost:3000/login', {
      username: 'admin',
      password: 'admin'
    });
    assert.equal(response.status, 200);
  });
});

// Test 2: Upload Service Health Check
describe('Upload Service', () => {
  it('should return HTML form from /', async () => {
    const response = await axios.get('http://localhost:3001');
    assert.equal(response.status, 200);
    assert.match(response.data, /<form/);
  });
});