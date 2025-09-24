// helpers for API calls
export async function whoAmI() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) return null;
    const { user } = await r.json();
    return user;
  } catch (e) {
    console.error("Failed to check user status", e);
    return null;
  }
}

export async function login(username, password) {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return { ok: r.ok, data: await r.json() };
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error("Logout failed", e);
  }
}

