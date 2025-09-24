import React, { useState } from 'react';
import { login, whoAmI } from '../api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please enter a username and password.');
      return;
    }
    
    const { ok, data } = await login(username, password);

    if (ok) {
      // following successful login, fetch user obj
      const user = await whoAmI();
      onLoginSuccess(user);
    } else {
      setError(data.error || 'Login failed');
    }
  };

  return (
    <main className="container-fluid">
      <header className="container-fluid site-header">
        <nav>
          <ul>
            <li><strong>Plant Pal 🌱</strong></li>
          </ul>
        </nav>
        <p className="muted">Track plants, water on time.</p>
      </header>
      <section id="login-view">
        <article className="card">
          <h2>Login</h2>
          <p className="muted">New usernames are created automatically. You’ll be told if that happens.</p>
          <form onSubmit={handleLocalLogin}>
            <div className="grid grid-2">
              <label>
                Username
                <input
                  type="text"
                  required
                  maxLength="60"
                  placeholder="e.g., Joshua"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength="4"
                  placeholder="••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="grid grid-2 auth-row">
              <button className="contrast" type="submit">Sign in</button>
              <a role="button" id="github-login" href="/auth/github">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                </svg>
                Sign in with GitHub
              </a>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        </article>
      </section>
    </main>
  );
}

