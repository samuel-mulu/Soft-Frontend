'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      saveSession(data.accessToken, data.user);
      router.replace('/dashboard');
    } catch (e: any) {
      const msg = e.message || 'Sign in failed';
      toast.error(
        msg.includes('401') || msg.toLowerCase().includes('invalid')
          ? 'Invalid username or password.'
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-screen-bg" aria-hidden />
      <div className="login-card">
        <div className="login-card-head">
          <img src="/logo.svg" alt="" className="login-card-logo" width={48} height={48} />
          <div>
            <p className="login-card-brand">FlowStock</p>
            <h1 className="login-card-title">Sign in</h1>
          </div>
        </div>

        <form onSubmit={submit} className="login-form">
          <div>
            <label className="label" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              className="field login-field"
              required
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>

          <div>
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                className="field login-field pr-12"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                className="field-password-toggle login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn btn-primary login-submit">
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
