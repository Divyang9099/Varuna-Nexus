const http = require('http');

const BASE = 'http://localhost:5000/api/v1';
let TOKEN = '';
let PROJECT_ID = '';
let PIPELINE_ID = '';
let ALLOCATION_ID = '';
let ESTIMATION_ID = '';
let CAT_ID = '';

const results = [];

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

function log(label, res, expectStatus = 200) {
  const ok = res.status === expectStatus;
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} [${res.status}] ${label}`);
  if (!ok) console.log('   Response:', JSON.stringify(res.body).slice(0, 200));
  results.push({ label, status: res.status, ok });
}

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log('  DroneOps API Test Suite');
  console.log('══════════════════════════════════════════\n');

  // ── HEALTH ──────────────────────────────────
  console.log('── HEALTH ─────────────────────────────────');
  let r = await req('GET', '/../../health');
  r = await req('GET', '/../../health');
  const health = await new Promise((resolve) => {
    http.get('http://localhost:5000/health', (res) => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    }).on('error', e => resolve({ status: 0, body: e.message }));
  });
  log('GET /health', health, 200);

  // ── AUTH ─────────────────────────────────────
  console.log('\n── AUTH ────────────────────────────────────');
  const reg = await req('POST', '/auth/register', {
    name: 'Test Admin', email: `admin${Date.now()}@droneops.com`,
    password: 'Admin@123', role: 'admin', phone: '9999999999'
  });
  log('POST /auth/register', reg, 201);

  const login = await req('POST', '/auth/login', {
    email: reg.body?.data?.email || 'admin@droneops.com',
    password: 'Admin@123'
  });
  log('POST /auth/login', login, 200);
  TOKEN = login.body?.data?.token || '';
  if (TOKEN) console.log('   🔑 Token acquired');

  const profile = await req('GET', '/auth/profile', null, TOKEN);
  log('GET  /auth/profile', profile, 200);

  // ── PROJECTS ─────────────────────────────────
  console.log('\n── PROJECTS ────────────────────────────────');
  const proj = await req('POST', '/projects', {
    name: 'Solar PV Inspection - Rajasthan',
    client_name: 'Adani Solar', project_type: 'solar',
    status: 'enquiry', start_date: '2026-04-01', end_date: '2026-04-10',
    state: 'Rajasthan'
  }, TOKEN);
  log('POST /projects', proj, 201);
  PROJECT_ID = proj.body?.data?.id || '';

  const getProjects = await req('GET', '/projects', null, TOKEN);
  log('GET  /projects', getProjects, 200);

  const getProject = await req('GET', `/projects/${PROJECT_ID}`, null, TOKEN);
  log(`GET  /projects/:id`, getProject, 200);

  // ── PIPELINE ─────────────────────────────────
  console.log('\n── PIPELINE ────────────────────────────────');
  const pipe = await req('POST', '/pipeline', {
    name: 'Wind Survey - Gujarat', client_name: 'Greenko',
    project_type: 'wind', stage: 'enquiry',
    estimated_value: 500000, win_probability: 60,
    state: 'Gujarat', estimated_start: '2026-05-01', estimated_end: '2026-05-10'
  }, TOKEN);
  log('POST /pipeline', pipe, 201);
  PIPELINE_ID = pipe.body?.data?.id || '';

  const getPipelines = await req('GET', '/pipeline', null, TOKEN);
  log('GET  /pipeline', getPipelines, 200);

  const stageUp = await req('PUT', `/pipeline/${PIPELINE_ID}/stage`, { stage: 'proposal' }, TOKEN);
  log('PUT  /pipeline/:id/stage', stageUp, 200);

  // ── DASHBOARD ────────────────────────────────
  console.log('\n── DASHBOARD ───────────────────────────────');
  const summary = await req('GET', '/dashboard/summary', null, TOKEN);
  log('GET  /dashboard/summary', summary, 200);

  const upcoming = await req('GET', '/dashboard/upcoming', null, TOKEN);
  log('GET  /dashboard/upcoming', upcoming, 200);

  const activity = await req('GET', '/dashboard/activity', null, TOKEN);
  log('GET  /dashboard/activity', activity, 200);

  const utilization = await req('GET', '/dashboard/utilization', null, TOKEN);
  log('GET  /dashboard/utilization', utilization, 200);

  // ── ESTIMATIONS ──────────────────────────────
  console.log('\n── ESTIMATIONS ─────────────────────────────');
  const est = await req('POST', '/estimations', {
    project_id: PROJECT_ID, client_name: 'Adani Solar',
    project_type: 'solar', days: 5, pilot_rate: 5000,
    drone_rate: 7000, travel_cost: 20000, processing_cost: 15000,
    margin_percent: 20, tax_percent: 18
  }, TOKEN);
  log('POST /estimations', est, 201);
  ESTIMATION_ID = est.body?.data?.id || '';

  const getEst = await req('GET', '/estimations', null, TOKEN);
  log('GET  /estimations', getEst, 200);

  const cloneEst = ESTIMATION_ID
    ? await req('POST', `/estimations/${ESTIMATION_ID}/clone`, {}, TOKEN)
    : { status: 'SKIP' };
  if (ESTIMATION_ID) log('POST /estimations/:id/clone', cloneEst, 201);

  // ── LIBRARY ──────────────────────────────────
  console.log('\n── LIBRARY ─────────────────────────────────');
  const cat = await req('POST', '/library/categories', { name: 'Operations' }, TOKEN);
  log('POST /library/categories', cat, 201);
  CAT_ID = cat.body?.data?.id || '';

  const getCats = await req('GET', '/library/categories', null, TOKEN);
  log('GET  /library/categories', getCats, 200);

  const doc = await req('POST', '/library/documents', {
    category_id: CAT_ID, name: 'SOP Manual',
    description: 'Standard Operating Procedure',
    file_url: 'https://example.com/sop.pdf'
  }, TOKEN);
  log('POST /library/documents', doc, 201);

  const getDocs = await req('GET', '/library/documents', null, TOKEN);
  log('GET  /library/documents', getDocs, 200);

  // ── CALENDAR ─────────────────────────────────
  console.log('\n── CALENDAR ────────────────────────────────');
  const cal = await req('GET', '/calendar', null, TOKEN);
  log('GET  /calendar', cal, 200);

  const createEvent = await req('POST', '/calendar/events', {
    title: 'Team Training', event_type: 'training',
    start_date: '2026-04-15', end_date: '2026-04-15'
  }, TOKEN);
  log('POST /calendar/events', createEvent, 201);

  // ── NOTIFICATIONS ────────────────────────────
  console.log('\n── NOTIFICATIONS ───────────────────────────');
  const notifs = await req('GET', '/notifications', null, TOKEN);
  log('GET  /notifications', notifs, 200);

  // ── AUDIT ────────────────────────────────────
  console.log('\n── AUDIT ───────────────────────────────────');
  const audit = await req('GET', '/audit', null, TOKEN);
  log('GET  /audit', audit, 200);

  // ── SUMMARY ──────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log('\n══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed | ${failed} failed`);
  console.log('══════════════════════════════════════════');
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.ok).forEach(r => console.log(`   - [${r.status}] ${r.label}`));
  }
  process.exit(0);
}

run().catch(console.error);
