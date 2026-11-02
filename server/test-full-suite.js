// Comprehensive Full System Automated Verification Suite
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runSuite() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED FULL SYSTEM VERIFICATION SUITE');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('====================================================');

  const nodeBinary = process.execPath;
  const serverPath = fs.existsSync(path.resolve(process.cwd(), 'index.js'))
    ? path.resolve(process.cwd(), 'index.js')
    : path.resolve(process.cwd(), 'server', 'index.js');
  const serverCwd = path.dirname(serverPath);

  const serverProcess = spawn(nodeBinary, [serverPath], {
    cwd: serverCwd,
    env: { ...process.env, PORT: TEST_PORT.toString(), ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'pipe'
  });

  let serverStarted = false;
  serverProcess.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('Server is running')) {
      serverStarted = true;
    }
  });

  serverProcess.stderr.on('data', (d) => {
    const errText = d.toString();
    if (!errText.includes('ExperimentalWarning')) {
      console.error('[Server Error Output]:', errText);
    }
  });

  // Wait for server to boot
  for (let i = 0; i < 30; i++) {
    if (serverStarted) break;
    await delay(250);
  }
  await delay(500);

  let passedChecks = 0;
  let totalChecks = 0;

  const assertCheck = (condition, description) => {
    totalChecks++;
    if (!condition) {
      console.error(`  [FAIL] ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
    passedChecks++;
    console.log(`  [PASS] ${description}`);
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Health & CORS Checks
    // -------------------------------------------------------------------------
    console.log('\n[1/10] Testing Health Endpoint & CORS Security Headers...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assertCheck(healthRes.status === 200, 'GET /health returns HTTP 200');
    assertCheck(healthData.status === 'ok', 'Health status is "ok"');
    assertCheck(!healthData.password && !healthData.connectionString, 'No database credentials exposed in health response');

    const corsRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://gym-k1eimpi49-finan4.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });
    const allowHeaders = corsRes.headers.get('access-control-allow-headers') || '';
    assertCheck(allowHeaders.toLowerCase().includes('authorization'), 'CORS allows Authorization header from Vercel frontend');

    // -------------------------------------------------------------------------
    // 2. Admin Authentication & Role Authorization
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Testing Admin Authentication, Role Separation & Password Validation...');
    // Valid Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', username: 'admin', password: 'password' })
    });
    const adminData = await adminLoginRes.json();
    assertCheck(adminLoginRes.status === 200 && adminData.success, 'Admin credentials authenticate successfully');
    assertCheck(typeof adminData.token === 'string' && adminData.token.length > 20, 'Admin JWT token issued');
    assertCheck(adminData.user.role === 'admin', 'Admin role confirmed in login payload');

    // Invalid Admin Password
    const adminBadPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', username: 'admin', password: 'wrong_password_123' })
    });
    assertCheck(adminBadPassRes.status === 401, 'Invalid admin password rejected with HTTP 401');

    // Admin Credentials in Client Portal (Role Authorization)
    const crossAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: 'admin', password: 'password' })
    });
    assertCheck(crossAdminRes.status === 401, 'Admin credentials blocked from Client portal with HTTP 401');

    // -------------------------------------------------------------------------
    // 3. Session Validation & Token Security (/api/auth/me)
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Testing Session Restoration (/api/auth/me) & Token Verification...');
    const authMeAdminRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    const authMeData = await authMeAdminRes.json();
    assertCheck(authMeAdminRes.status === 200, 'GET /api/auth/me validates valid admin Bearer token');
    assertCheck(authMeData.user?.role === 'admin', 'Session restored with correct admin role');

    // Unauthenticated access
    const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
    assertCheck(noTokenRes.status === 401, 'Accessing /api/auth/me without token rejected with HTTP 401');

    // Invalid Token access
    const fakeTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid.fake.token' }
    });
    assertCheck(fakeTokenRes.status === 401, 'Accessing /api/auth/me with forged token rejected with HTTP 401');

    // -------------------------------------------------------------------------
    // 4. Data Sanitization & Secret Isolation
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Verifying Client Directory Sanitization (Zero Password Hashes)...');
    const clientsRes = await fetch(`${BASE_URL}/api/clients`, {
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    const clientsList = await clientsRes.json();
    assertCheck(Array.isArray(clientsList) && clientsList.length > 0, `Admin fetched ${clientsList.length} clients`);
    const exposedSecrets = clientsList.filter(c => c.passwordHash || c.password_hash);
    assertCheck(exposedSecrets.length === 0, 'Zero password hashes exposed in client directory response');

    // -------------------------------------------------------------------------
    // 5. Client Authentication & Alias Support
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Testing Client Authentication, Username Aliases & Password Validation...');
    // Valid Client Login with username
    const clientLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: '@thespring', password: 'password' })
    });
    const clientData = await clientLoginRes.json();
    assertCheck(clientLoginRes.status === 200 && clientData.success, 'Client (@thespring) logged in successfully');
    assertCheck(clientData.user.role === 'client', 'Client role confirmed in payload');
    assertCheck(Boolean(clientData.user.clientId), 'Client ID attached to JWT claims');

    // Valid Client Login with alias (thespring without @)
    const clientAliasRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: 'thespring', password: 'password' })
    });
    assertCheck(clientAliasRes.status === 200, 'Client login without "@" prefix works seamlessly');

    // Valid Client Login with Member ID (e.g. GYM1025)
    const clientMemberIdRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: 'GYM1025', password: 'password', rememberMe: true })
    });
    const clientMemberIdData = await clientMemberIdRes.json();
    assertCheck(clientMemberIdRes.status === 200 && clientMemberIdData.success, 'Client login with Member ID (GYM1025) succeeds');
    assertCheck(typeof clientMemberIdData.token === 'string', 'JWT token generated with Remember Me');

    // Valid Client Login with Email
    const clientEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: 'therese.s@fitbyshahid.com', password: 'password' })
    });
    assertCheck(clientEmailRes.status === 200, 'Client login with Email works seamlessly');

    // Invalid Client Password
    const clientBadPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: '@thespring', password: 'wrong_password_999' })
    });
    assertCheck(clientBadPassRes.status === 401, 'Invalid client password rejected with HTTP 401');

    // Client in Admin Portal
    const crossClientRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', username: '@thespring', password: 'password' })
    });
    assertCheck(crossClientRes.status === 401, 'Client credentials blocked from Admin portal with HTTP 401');

    // -------------------------------------------------------------------------
    // 6. Client Ownership & Role Enforcement
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Testing Client Ownership Verification on Private Data Endpoints...');
    // Client trying to list all clients (must be 403)
    const clientDirectoryAttempt = await fetch(`${BASE_URL}/api/clients`, {
      headers: { 'Authorization': `Bearer ${clientData.token}` }
    });
    assertCheck(clientDirectoryAttempt.status === 403, 'Client forbidden from listing all clients (HTTP 403)');

    // Client accessing self (/api/client/me) (must be 200)
    const clientSelfRes = await fetch(`${BASE_URL}/api/client/me`, {
      headers: { 'Authorization': `Bearer ${clientData.token}` }
    });
    const clientSelfData = await clientSelfRes.json();
    assertCheck(clientSelfRes.status === 200, 'Client successfully fetches self profile via GET /api/client/me');
    assertCheck(clientSelfData.id === clientData.user.clientId, 'Returned self profile matches authenticated client ID');

    // Client attempting to update another client's record (must be 403)
    const crossClientUpdateRes = await fetch(`${BASE_URL}/api/clients/john_doe`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${clientData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: 'john_doe', name: 'Malicious Change' })
    });
    assertCheck(crossClientUpdateRes.status === 403, 'Client forbidden from modifying another client (HTTP 403)');

    // Client attempting to delete another client (must be 403)
    const clientDeleteAttempt = await fetch(`${BASE_URL}/api/clients/john_doe`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${clientData.token}` }
    });
    assertCheck(clientDeleteAttempt.status === 403, 'Client forbidden from deleting client profiles (HTTP 403)');

    // -------------------------------------------------------------------------
    // 7. Client Registration Flow (Username Verification & Password Creation)
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Testing Client Registration Flow...');
    const verifyNotFoundRes = await fetch(`${BASE_URL}/api/auth/verify-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'non_existent_client_xyz' })
    });
    const verifyNotFoundData = await verifyNotFoundRes.json();
    assertCheck(verifyNotFoundData.code === 'NOT_FOUND', 'Unregistered username returns NOT_FOUND code');

    const verifyExistingRes = await fetch(`${BASE_URL}/api/auth/verify-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '@thespring' })
    });
    const verifyExistingData = await verifyExistingRes.json();
    assertCheck(verifyExistingData.code === 'ALREADY_REGISTERED', 'Already registered account returns ALREADY_REGISTERED code');

    // -------------------------------------------------------------------------
    // 7.5. Forgot Password & Secure Token Reset Flow
    // -------------------------------------------------------------------------
    console.log('\n[7.5/10] Testing Forgot Password & Secure Single-Use Token Reset Workflow...');
    // Request reset token for @johndoe
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '@johndoe' })
    });
    const forgotData = await forgotRes.json();
    assertCheck(forgotRes.status === 200 && forgotData.success, 'POST /api/auth/forgot-password generates reset request');
    assertCheck(Boolean(forgotData.resetToken), 'Secure reset token generated');

    const resetToken = forgotData.resetToken;

    // Verify reset token
    const verifyTokenRes = await fetch(`${BASE_URL}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken })
    });
    const verifyTokenData = await verifyTokenRes.json();
    assertCheck(verifyTokenRes.status === 200 && verifyTokenData.valid, 'POST /api/auth/verify-reset-token verifies valid token');

    // Verify invalid/tampered token rejected
    const badTokenRes = await fetch(`${BASE_URL}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'tampered_invalid_token_123456789' })
    });
    assertCheck(badTokenRes.status === 400, 'Tampered/invalid reset token rejected with HTTP 400');

    // Reset password with token to 'newpassword123'
    const doResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'newpassword123' })
    });
    const doResetData = await doResetRes.json();
    assertCheck(doResetRes.status === 200 && doResetData.success, 'POST /api/auth/reset-password updates password successfully');

    // Token reuse must be prevented
    const reuseTokenRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'anotherpassword123' })
    });
    assertCheck(reuseTokenRes.status === 400, 'Reusing an already consumed reset token is strictly forbidden (HTTP 400)');

    // Log in with new password
    const loginNewPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client', username: '@johndoe', password: 'newpassword123' })
    });
    const loginNewPassData = await loginNewPassRes.json();
    assertCheck(loginNewPassRes.status === 200 && loginNewPassData.success, 'Client logs in successfully using newly set password');

    // Restore original password for test repeatability
    const forgotRestoreRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '@johndoe' })
    });
    const restoreData = await forgotRestoreRes.json();
    await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: restoreData.resetToken, newPassword: 'password' })
    });

    // -------------------------------------------------------------------------
    // 8. Full CRUD Operations (Admin & Client)
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Testing Full CRUD Life Cycle for Clients...');
    const testClientId = 'test_runner_client_' + Date.now();
    const newClientPayload = {
      id: testClientId,
      name: 'Automated Test Client',
      username: '@testclient_' + Date.now(),
      memberId: 'GYM9999',
      phone: '555-0199',
      email: 'testclient@gym.local',
      membershipPlan: 'Gold Monthly',
      status: 'Active',
      passwordCreated: false,
      goals: ['Bench 200', 'Squat 300'],
      dailyWorkouts: {
        mon: {
          name: 'Powerlifting Mon',
          duration: '45 mins',
          exercises: [
            { id: 'ex_test_1', name: 'Barbell Squat', sets: 5, reps: '5 reps', weight: '225 lbs', completed: false }
          ]
        }
      },
      metrics: [
        { id: 'weight', name: 'Weight', current: 180, unit: 'lbs', change: -2 }
      ],
      signinHistory: []
    };

    // CREATE (POST /api/clients)
    const createRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newClientPayload)
    });
    assertCheck(createRes.status === 201, 'Admin creates new client record via POST /api/clients (HTTP 201)');

    // READ (GET /api/clients/:id)
    const readRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    const readData = await readRes.json();
    assertCheck(readRes.status === 200 && readData.name === 'Automated Test Client', 'Admin retrieves created client via GET /api/clients/:id');

    // UPDATE (PUT /api/clients/:id)
    const updateRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...newClientPayload, name: 'Automated Test Client Updated' })
    });
    assertCheck(updateRes.status === 200, 'Admin updates client record via PUT /api/clients/:id (HTTP 200)');

    // Verification of update
    const readUpdatedRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    const readUpdatedData = await readUpdatedRes.json();
    assertCheck(readUpdatedData.name === 'Automated Test Client Updated', 'Client update verified in database');

    // -------------------------------------------------------------------------
    // 9. Attendance & Check-in Recording
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Testing Attendance Recording Endpoint...');
    const attendanceRes = await fetch(`${BASE_URL}/api/clients/${testClientId}/attendance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: '10/20/2026', signature: 'AUTO_TEST_RUNNER' })
    });
    const attendanceData = await attendanceRes.json();
    assertCheck(attendanceRes.status === 201 && attendanceData.success, 'Attendance recorded successfully via POST /api/clients/:id/attendance (HTTP 201)');
    assertCheck(attendanceData.attendance.signature === 'AUTO_TEST_RUNNER', 'Attendance record contains correct signature');

    // Client forbidden from recording attendance for another client
    const crossAttendanceRes = await fetch(`${BASE_URL}/api/clients/${testClientId}/attendance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: '10/20/2026', signature: 'FORGED_ATTENDANCE' })
    });
    assertCheck(crossAttendanceRes.status === 403, 'Client forbidden from recording attendance for another client (HTTP 403)');

    // DELETE (DELETE /api/clients/:id)
    const deleteRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    assertCheck(deleteRes.status === 200, 'Admin deletes client record via DELETE /api/clients/:id (HTTP 200)');

    const verifyDeletedRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    assertCheck(verifyDeletedRes.status === 404, 'Deleted client returns HTTP 404 Not Found');

    // -------------------------------------------------------------------------
    // 10. Admin Stats Endpoint & Overall System Integrity
    // -------------------------------------------------------------------------
    console.log('\n[10/11] Testing Admin Stats Endpoint & Database Persistence Integrity...');
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminData.token}` }
    });
    const statsData = await statsRes.json();
    assertCheck(statsRes.status === 200 && statsData.success, 'Admin stats endpoint returns HTTP 200');
    assertCheck(statsData.stats.clientsCount >= 2, `Database maintains persistent records (clients: ${statsData.stats.clientsCount})`);
    assertCheck(statsData.stats.adminsCount >= 1, `Database maintains admin records (admins: ${statsData.stats.adminsCount})`);

    // -------------------------------------------------------------------------
    // 11. Advanced Workout Tracking System (Sets, Sessions, Progress Comparisons)
    // -------------------------------------------------------------------------
    console.log('\n[11/11] Testing Advanced Workout Tracking System...');

    // A. PUT /api/workouts/set-progress (Live set update)
    const setUpdateRes = await fetch(`${BASE_URL}/api/workouts/set-progress`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${clientData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: 'therese_spring',
        dayKey: 'thu',
        exerciseId: 'ex_1',
        setNumber: 1,
        actualReps: 12,
        weight: 14,
        status: 'completed'
      })
    });
    const setUpdateData = await setUpdateRes.json();
    assertCheck(setUpdateRes.status === 200 && setUpdateData.success, 'Client updates individual set progress via PUT /api/workouts/set-progress (HTTP 200)');
    assertCheck(setUpdateData.exercise.setRecords.some(s => s.setNumber === 1 && s.actualReps === 12 && s.weight === 14 && s.status === 'completed'), 'Set 1 updated with actual reps 12 and weight 14kg');
    assertCheck(setUpdateData.exercise.status === 'in_progress' || setUpdateData.exercise.status === 'completed', 'Exercise status calculated correctly');

    // B. Security: Client cannot update sets of another client
    const crossSetRes = await fetch(`${BASE_URL}/api/workouts/set-progress`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${clientData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: 'john_doe',
        dayKey: 'thu',
        exerciseId: 'ex_1',
        setNumber: 1,
        actualReps: 10,
        weight: 20,
        status: 'completed'
      })
    });
    assertCheck(crossSetRes.status === 403, 'Client forbidden from modifying workout set of another client (HTTP 403)');

    // C. POST /api/workouts/skip-exercise with reason
    const skipExRes = await fetch(`${BASE_URL}/api/workouts/skip-exercise`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: 'therese_spring',
        dayKey: 'thu',
        exerciseId: 'ex_4',
        reason: 'Equipment unavailable / in use'
      })
    });
    const skipExData = await skipExRes.json();
    assertCheck(skipExRes.status === 200 && skipExData.success, 'Exercise skipped successfully via POST /api/workouts/skip-exercise (HTTP 200)');
    assertCheck(skipExData.exercise.status === 'skipped', 'Exercise status updated to "skipped"');
    assertCheck(skipExData.exercise.skipReason === 'Equipment unavailable / in use', 'Exercise skip reason stored in database');

    // D. POST /api/workouts/sessions (Save completed workout session)
    const sessionPayload = {
      clientId: 'therese_spring',
      dayKey: 'thu',
      workoutName: 'Lower Body Burn',
      durationSeconds: 1820,
      summary: {
        totalExercises: 4,
        completedExercises: 3,
        skippedExercises: 1,
        totalSets: 11,
        completedSets: 10,
        totalReps: 110,
        totalWeightKg: 950,
        completionPercentage: 91
      },
      setRecords: [
        { exerciseId: 'ex_1', exerciseName: 'Forward Lunge', setNumber: 1, targetReps: 10, actualReps: 12, weight: 14, status: 'completed' },
        { exerciseId: 'ex_1', exerciseName: 'Forward Lunge', setNumber: 2, targetReps: 10, actualReps: 10, weight: 12, status: 'completed' },
        { exerciseId: 'ex_1', exerciseName: 'Forward Lunge', setNumber: 3, targetReps: 10, actualReps: 10, weight: 12, status: 'completed' },
        { exerciseId: 'ex_2', exerciseName: 'Leg Press', setNumber: 1, targetReps: 10, actualReps: 10, weight: 25, status: 'completed' }
      ]
    };

    const saveSessionRes = await fetch(`${BASE_URL}/api/workouts/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionPayload)
    });
    const saveSessionData = await saveSessionRes.json();
    assertCheck(saveSessionRes.status === 201 && saveSessionData.success, 'Workout session saved via POST /api/workouts/sessions (HTTP 201)');
    assertCheck(saveSessionData.session.summary.totalWeightKg === 950, 'Session summary totalWeightKg preserved in database');

    // E. GET /api/workouts/sessions/:clientId
    const getSessionsRes = await fetch(`${BASE_URL}/api/workouts/sessions/therese_spring`, {
      headers: { 'Authorization': `Bearer ${clientData.token}` }
    });
    const getSessionsData = await getSessionsRes.json();
    assertCheck(getSessionsRes.status === 200 && getSessionsData.success, 'Workout sessions retrieved via GET /api/workouts/sessions/:clientId (HTTP 200)');
    assertCheck(getSessionsData.sessions.length >= 2, `Multiple sessions returned in history (${getSessionsData.sessions.length} sessions)`);

    // F. GET /api/workouts/progress-comparison/:clientId
    const compRes = await fetch(`${BASE_URL}/api/workouts/progress-comparison/therese_spring`, {
      headers: { 'Authorization': `Bearer ${clientData.token}` }
    });
    const compData = await compRes.json();
    assertCheck(compRes.status === 200 && compData.success, 'Progress comparison retrieved via GET /api/workouts/progress-comparison/:clientId (HTTP 200)');
    assertCheck(compData.hasComparison === true, 'Session comparison correctly established between current and previous session');
    assertCheck(typeof compData.repsDelta === 'number', `Reps improvement delta computed (${compData.repsDelta} reps)`);
    assertCheck(typeof compData.weightDelta === 'number', `Weight progression volume delta computed (${compData.weightDelta} kg)`);
    assertCheck(Array.isArray(compData.exerciseComparisons) && compData.exerciseComparisons.length > 0, 'Exercise-by-exercise comparison generated');

    console.log('\n====================================================');
    console.log(`ALL AUTOMATED TESTS PASSED: ${passedChecks}/${totalChecks} CHECKS VERIFIED (100%)`);
    console.log('====================================================');

  } catch (err) {
    console.error('\nSUITE EXECUTION ABORTED DUE TO FAILURE:', err.message);
  } finally {
    serverProcess.kill('SIGINT');
    await delay(600);
    process.exit(passedChecks === totalChecks && totalChecks > 0 ? 0 : 1);
  }
}

runSuite();
