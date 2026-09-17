const API_URL = 'http://localhost:3000/v1';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function getOrRegisterUser(email, username, displayName, password) {
  // Try login first
  console.log(`Attempting login for ${username}...`);
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (loginRes.ok && loginRes.data?.accessToken) {
    console.log(`Logged in as ${username}`);
    return loginRes.data;
  }

  // Register if login failed
  console.log(`Registering new user ${username}...`);
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      username,
      displayName,
      password,
    }),
  });

  if (!regRes.ok) {
    throw new Error(`Failed to register ${username}: ${JSON.stringify(regRes.data)}`);
  }

  console.log(`Registered ${username}`);
  return regRes.data;
}

async function main() {
  try {
    const user1Data = await getOrRegisterUser(
      'user1@example.com',
      'user1',
      'Alice User',
      'Password123!',
    );
    const user2Data = await getOrRegisterUser(
      'user2@example.com',
      'user2',
      'Bob User',
      'Password123!',
    );

    console.log('User 1 ID:', user1Data.user.id);
    console.log('User 2 ID:', user2Data.user.id);

    // Follow each other
    await request(`/users/${user2Data.user.id}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Data.accessToken}` },
    });
    await request(`/users/${user1Data.user.id}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Data.accessToken}` },
    });

    // Create direct conversation
    console.log('Creating direct conversation between User 1 and User 2...');
    const convRes = await request('/conversations/direct', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Data.accessToken}` },
      body: JSON.stringify({ participantId: user2Data.user.id }),
    });

    if (convRes.ok && convRes.data?.id) {
      console.log('Direct conversation created/retrieved:', convRes.data.id);
      // Send a test message
      await request(`/conversations/${convRes.data.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user1Data.accessToken}` },
        body: JSON.stringify({ body: 'Привет! Готов протестировать звонок?' }),
      });
      console.log('Test message sent!');
    } else {
      console.log('Direct conv response:', convRes.status, convRes.data);
    }

    const payload = {
      user1: user1Data,
      user2: user2Data,
    };

    console.log('\n--- SEED SUCCESS ---');
    console.log(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

main();
