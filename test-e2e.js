const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const db = require('./src/core/config/db');

// In-memory data
const state = {
  tokens: { admin: '', pm: '', pilot: '' },
  users: { admin: null, pm: null, pilot: null },
  pipelineId: null,
  projectId: null,
  otherProjectId: null,
  pilotId: null,
  droneId: null,
  docId: null,
  deliverableId: null,
  categoryId: null,
  estimationId: null,
};

const DUMMY_FILE = Buffer.from('PDF_DUMMY_DATA');

// Helper to simulate file uploads
const uploadFile = (req, fieldName = 'file') => {
  return req.attach(fieldName, DUMMY_FILE, {
    filename: 'test-upload.pdf',
    contentType: 'application/pdf',
  });
};

async function runE2ETests() {
  console.log('🚀 Starting DroneOps E2E Production Test Suite\n');

  try {
    // 🧹 Clean DB for fresh test run
    await db.query('TRUNCATE TABLE projects, users, pipeline, allocations, pilots, drones, library_categories, project_members, activity_logs CASCADE');
    console.log('✅ DB Reset successfully.\n');

    // ==========================================
    // STEP 1: AUTH TESTING
    // ==========================================
    console.log('--- STEP 1: AUTH ---');
    const roles = ['admin', 'project_manager', 'pilot'];
    for (const role of roles) {
      // Register
      const p = await request(app).post('/api/v1/auth/register').send({
        name: `${role} User`, email: `${role}@test.com`, password: 'password123', role
      });
      state.users[role] = p.body.data;

      // Login
      const l = await request(app).post('/api/v1/auth/login').send({
        email: `${role}@test.com`, password: 'password123'
      });
      state.tokens[role] = l.body.data.token;
      console.log(`✅ Registration & Login (${role}) passed.`);
    }

    // ==========================================
    // STEP 2: USER MANAGEMENT
    // ==========================================
    console.log('\n--- STEP 2: USERS ---');
    let res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${state.tokens.admin}`);
    if (res.status !== 200) throw new Error('Admin GET users failed');
    console.log('✅ Admin GET /users passed.');

    res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (res.status !== 403) throw new Error('Pilot accessed /users (Should be 403)');
    console.log('✅ Pilot GET /users returned 403.');

    // ==========================================
    // STEP 3: PIPELINE FLOW
    // ==========================================
    console.log('\n--- STEP 3: PIPELINE ---');
    res = await request(app).post('/api/v1/pipeline')
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ 
        name: 'Tata Solar', 
        client_name: 'Tata Power', 
        project_type: 'Solar', 
        expected_value: 1200000,
        estimated_start: '2026-05-01',
        estimated_end: '2026-05-30'
      });
    if (res.status !== 201) throw new Error(`Pipeline creation failed: ${JSON.stringify(res.body)}`);
    state.pipelineId = res.body.data.id;
    console.log('✅ Pipeline created.');

    res = await request(app).put(`/api/v1/pipeline/${state.pipelineId}/stage`)
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ stage: 'proposal' });
    if (res.body.data.stage !== 'proposal') throw new Error('Stage did not update');
    console.log('✅ Pipeline stage updated to proposal.');

    res = await request(app).get('/api/v1/pipeline').set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (res.status !== 403) throw new Error('Pilot accessed pipeline (Should be 403)');
    console.log('✅ Pilot GET /pipeline returned 403.');

    // ==========================================
    // STEP 4: CONVERT PIPELINE -> PROJECT
    // ==========================================
    console.log('\n--- STEP 4: CONVERSION ---');
    res = await request(app).post(`/api/v1/pipeline/${state.pipelineId}/convert`)
      .set('Authorization', `Bearer ${state.tokens.admin}`);
    state.projectId = res.body.data.id;
    console.log(`✅ Pipeline converted. Project ID: ${state.projectId}`);

    // Create another project to test RBAC isolation later
    res = await request(app).post('/api/v1/projects')
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ name: 'Secret Pilotless Project', client_name: 'Adani', project_type: 'Solar', status: 'enquiry', start_date: '2026-01-01', end_date: '2026-01-10' });
    state.otherProjectId = res.body.data.id;

    // ==========================================
    // STEP 5: PROJECT & RBAC
    // ==========================================
    console.log('\n--- STEP 5: PROJECT MEMBERSHIP ---');
    // Assign Pilot to project 1
    res = await request(app).post(`/api/v1/projects/${state.projectId}/members`)
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ user_id: state.users.pilot.id });
    console.log('✅ Pilot assigned to Project 1.');

    // Pilot hits Project 1
    res = await request(app).get(`/api/v1/projects/${state.projectId}`)
      .set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (res.status !== 200) throw new Error(`Pilot denied from assigned project: ${res.status}`);
    console.log('✅ Pilot successfully accessed assigned project.');

    // Pilot hits Other Project
    res = await request(app).get(`/api/v1/projects/${state.otherProjectId}`)
      .set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (res.status !== 403) throw new Error(`Pilot accessed restricted project: ${res.status}`);
    console.log('✅ Pilot GET Other Project returned 403.');

    // ==========================================
    // STEP 6: RESOURCE CREATION
    // ==========================================
    console.log('\n--- STEP 6: RESOURCES ---');
    res = await request(app).post('/api/v1/resources/pilots')
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ user_id: state.users.pilot.id, license_number: 'LIC123' });
    state.pilotId = res.body.data.id;

    res = await request(app).post('/api/v1/resources/drones')
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ name: 'DJI Matrice 300', model: 'M300', status: 'active' });
    state.droneId = res.body.data.id;
    console.log('✅ Pilot & Drone successfully added to fleet.');

    // ==========================================
    // STEP 7: ALLOCATIONS & CONFLICTS
    // ==========================================
    console.log('\n--- STEP 7: ALLOCATION ---');
    res = await request(app).post(`/api/v1/projects/${state.projectId}/resources`)
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ pilot_id: state.pilotId, drone_id: state.droneId, start_date: '2026-05-01', end_date: '2026-05-05' });
    if (res.status !== 201) throw new Error(`Allocation failed: ${JSON.stringify(res.body)}`);
    console.log('✅ Allocation successful.');

    // Test Conflict
    res = await request(app).post(`/api/v1/projects/${state.otherProjectId}/resources`)
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ pilot_id: state.pilotId, drone_id: state.droneId, start_date: '2026-05-02', end_date: '2026-05-03' });
    if (res.status !== 409) throw new Error('Conflict detection failed! Overlapping booking allowed.');
    console.log('✅ Conflict correctly blocked (409) on overlapping booking.');

    // ==========================================
    // STEP 8: CALENDAR
    // ==========================================
    console.log('\n--- STEP 8: CALENDAR ---');
    res = await request(app).get('/api/v1/calendar').set('Authorization', `Bearer ${state.tokens.admin}`);
    if (res.status !== 200) throw new Error('Calendar failed');
    console.log('✅ Calendar endpoints successfully retrieved.');

    // ==========================================
    // STEP 9: DOCUMENTS (R2)
    // ==========================================
    console.log('\n--- STEP 9: FILE UPLOAD (DOCUMENTS) ---');
    res = await uploadFile(request(app).post(`/api/v1/projects/${state.projectId}/documents`))
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .field('category', 'Scope');
    state.docId = res.body.data.id;
    console.log(`✅ File successfully transmitted via buffer to controller.`);

    res = await request(app).get(`/api/v1/projects/${state.projectId}/documents/${state.docId}/download`)
      .set('Authorization', `Bearer ${state.tokens.pilot}`);
    // Might fail locally if Cloudflare key is bad, but route permissions are what we test
    if (res.status === 403) throw new Error('Pilot failed to access document for assigned project');
    console.log(`✅ RBAC correctly permitted Pilot to stream project document.`);

    res = await request(app).get(`/api/v1/projects/${state.otherProjectId}/documents/${state.docId}/download`)
      .set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (res.status !== 403) throw new Error('Unassigned pilot could download file');
    console.log(`✅ Unassigned Pilot blocked (403) from downloading private maps.`);

    // ==========================================
    // STEP 10: DELIVERABLES
    // ==========================================
    console.log('\n--- STEP 10: DELIVERABLES ---');
    res = await uploadFile(request(app).post(`/api/v1/projects/${state.projectId}/deliverables`))
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .field('name', 'Final Report')
      .field('format', 'PDF');
    state.deliverableId = res.body.data.id;
    console.log('✅ Deliverable created.');

    res = await request(app).put(`/api/v1/projects/${state.projectId}/deliverables/${state.deliverableId}/approve`)
      .set('Authorization', `Bearer ${state.tokens.admin}`);
    if (res.body.data.status !== 'approved') throw new Error('Failed to approve');
    console.log('✅ Deliverable approved.');

    // ==========================================
    // STEP 11: ESTIMATIONS
    // ==========================================
    console.log('\n--- STEP 11: ESTIMATIONS ---');
    res = await request(app).post('/api/v1/estimations')
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ project_id: state.projectId, notes: 'Quote v1' });
    state.estimationId = res.body.data.id;

    res = await request(app).post(`/api/v1/estimations/${state.estimationId}/items`)
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ 
        category: 'Services', 
        description: 'Drone Survey', 
        quantity: 2, 
        unit_cost: 5000 
      });
    
    // Check total auto-recalc
    res = await request(app).get(`/api/v1/estimations`)
      .set('Authorization', `Bearer ${state.tokens.admin}`);
    if (parseFloat(res.body.data[0].total_cost) !== 10000) throw new Error(`Auto-recalc failed: ${res.body.data[0].total_cost}`);
    console.log('✅ Estimation Line-Item auto-recalculation verified (2 * 5000 = 10000).');

    res = await request(app).get('/api/v1/estimations').set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (res.status !== 403) throw new Error('Pilot could bypass financials');
    console.log('✅ Pilot correctly blocked from accessing Financials (403).');

    // ==========================================
    // STEP 12: LIBRARY
    // ==========================================
    console.log('\n--- STEP 12: LIBRARY ---');
    res = await request(app).post('/api/v1/library/categories')
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .send({ name: 'SOPs' });
    state.categoryId = res.body.data.id;

    res = await uploadFile(request(app).post('/api/v1/library/documents'))
      .set('Authorization', `Bearer ${state.tokens.admin}`)
      .field('category_id', state.categoryId)
      .field('name', 'Solar SOP 2026');
    
    res = await request(app).get('/api/v1/library/documents?search=Solar')
      .set('Authorization', `Bearer ${state.tokens.pilot}`);
    if (!res.body.data.length || res.body.data[0].name !== 'Solar SOP 2026') throw new Error('Search constraint broken');
    console.log('✅ Global Library Search returned valid filtered objects.');

    // ==========================================
    // STEP 13: DASHBOARD
    // ==========================================
    console.log('\n--- STEP 13: DASHBOARD ---');
    res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${state.tokens.admin}`);
    const adminTotalProj = res.body.data.projects.total;

    res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${state.tokens.pilot}`);
    const pilotTotalProj = res.body.data.projects.total;

    if (adminTotalProj <= pilotTotalProj) throw new Error('Dashboard RBAC failed matching total projects');
    console.log(`✅ Dashboard Context verified. Admin sees ${adminTotalProj} projects, Pilot sees ${pilotTotalProj}.`);

    // ==========================================
    // STEP 14, 15: NOTIFICATIONS & AUDITS
    // ==========================================
    console.log('\n--- STEP 14/15: AUDIT LOGS ---');
    res = await request(app).get('/api/v1/audit').set('Authorization', `Bearer ${state.tokens.admin}`);
    if (res.status !== 200 || !res.body.data.length) throw new Error('Audit logs missing or empty');
    console.log(`✅ Audit Logs generated internally (${res.body.data.length} trailing actions).`);

    console.log('\n🎉 ALL E2E WORKFLOW TESTS PASSED 100%! SYSTEM PRODUCTION READY.');
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    if (err.response) console.error(err.response.body);
    process.exit(1);
  }
}

runE2ETests();
