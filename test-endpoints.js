const request = require('supertest');
const app = require('./src/app');
const db = require('./src/core/config/db');
const listEndpoints = require('express-list-endpoints');

async function runTests() {
  console.log('🔄 Starting API Tests...');
  const endpoints = listEndpoints(app);
  let passed = 0;
  let failed = 0;
  
  // Create a fake test user token for authentication
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: '11111111-1111-1111-1111-111111111111', role: 'admin' }, 
    process.env.JWT_SECRET || 'varuna_ops_super_secret_jwt_key_2024',
    { expiresIn: '1h' }
  );

  const testPayload = {};

  const uuid = '22222222-2222-2222-2222-222222222222'; // random uuid for params

  const fs = require('fs');
  const failureLog = [];

  for (const endpoint of endpoints) {
    for (const method of endpoint.methods) {
      if (['OPTIONS', 'HEAD'].includes(method)) continue;

      // Fix nested router path parsing (e.g. RegExp...)
      let pathTemplate = endpoint.path;
      if (pathTemplate.includes('RegExp')) {
        const parts = pathTemplate.split(' RegExp(');
        const prefix = parts[0].trim();
        const rxAndSuffix = parts[1];
        
        let sub = '';
        if (rxAndSuffix.includes('scope')) sub = '/scope';
        else if (rxAndSuffix.includes('resources')) sub = '/resources';
        else if (rxAndSuffix.includes('documents')) sub = '/documents';
        else if (rxAndSuffix.includes('deliverables')) sub = '/deliverables';
        else if (rxAndSuffix.includes('members')) sub = '/members';
        else if (rxAndSuffix.includes('map')) sub = '/map';
        
        const suffixMatch = rxAndSuffix.match(/\) (.+)$/);
        const suffix = suffixMatch ? suffixMatch[1] : '';
        
        pathTemplate = prefix + '/:id' + sub + (suffix ? '/' + suffix.replace(/^\//, '') : '');
      }

      let path = pathTemplate
        .replace(/:id/g, uuid)
        .replace(/:allocationId/g, uuid)
        .replace(/:docId/g, uuid)
        .replace(/:userId/g, uuid)
        .replace(/:itemId/g, uuid)
        .replace(/:projectId/g, uuid)
        .replace(/:droneId/g, uuid)
        .replace(/:pilotId/g, uuid);

      // Clean up multiple slashes just in case
      path = path.replace(/([^:]\/)\/+/g, '$1');

      try {
        let req = request(app)[method.toLowerCase()](path);
        req.set('Authorization', `Bearer ${token}`);
        req.set('Content-Type', 'application/json');

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          req.send(testPayload);
        }

        const res = await req;

        if (res.status >= 500) {
          failureLog.push({ method, path, status: res.status, error: res.body?.message || res.text || 'Unknown Server Error' });
          failed++;
        } else if (res.status === 404 && res.body?.success === false && res.body?.message === 'Route not found') {
          failureLog.push({ method, path, status: 404, error: 'Route not mapped to express handler properly' });
          failed++;
        } else {
          // 400 (validation), 403 (RBAC), 404 (not found by ID) = expected & correct behavior
          passed++;
        }
      } catch (err) {
        failureLog.push({ method, path, status: 'CRASH', error: err.message });
        failed++;
      }
    }
  }

  console.log(`\n📊 Tests Summary: ${passed} Passed, ${failed} Failed/Errors.`);
  fs.writeFileSync('test-errors.json', JSON.stringify(failureLog, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
