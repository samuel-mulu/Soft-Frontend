'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { BRAND_MARK, BRAND_OWNER, getLogoPath } from '@/lib/brand';
import { Button } from '@/components/ui/button';

type Mode = 'customer' | 'staff';

export default function Login() {
  const [mode, setMode] = useState<Mode>('customer');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submitCustomer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<any>('/auth/customer-login', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      saveSession(data.accessToken, data.user);
      router.replace('/portal');
    } catch (e: any) {
      const msg = e.message || 'Sign in failed';
      toast.error(
        msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('no active')
          ? 'We could not find an active account for this number.'
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      saveSession(data.accessToken, data.user);
      router.replace('/sell');
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
        <button
          type="button"
          className="login-staff-trigger"
          onClick={() => setMode((m) => (m === 'customer' ? 'staff' : 'customer'))}
          aria-label={mode === 'customer' ? 'Team sign-in' : 'Customer sign-in'}
          title={mode === 'customer' ? 'Team sign-in' : 'Customer sign-in'}
        >
          <KeyRound size={18} strokeWidth={2} />
        </button>

        <div className="login-card-head">
          <img src={getLogoPath()} alt="" className="login-card-logo" width={48} height={48} />
          <div className="min-w-0">
            <p className="login-card-brand">{BRAND_MARK}</p>
            <h1 className="login-card-title leading-tight">{BRAND_OWNER}</h1>
            <p className="muted text-xs mt-1 font-semibold">{mode === 'customer' ? 'My account' : 'Team sign in'}</p>
          </div>
        </div>

        {mode === 'customer' ? (
          <form onSubmit={submitCustomer} className="login-form">
            <p className="login-hint muted text-sm leading-relaxed">
              Enter the mobile number on your account (starts with <strong>09</strong> or <strong>10</strong>).
            </p>
            <div>
              <label className="label" htmlFor="login-phone">
                Phone number
              </label>
              <input
                id="login-phone"
                className="field login-field"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
              />
            </div>
            <Button type="submit" disabled={busy} className="login-submit w-full">
              {busy ? 'Checking…' : 'View balance & history'}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitStaff} className="login-form">
            <p className="login-hint muted text-sm">Cashier and owner workspace access.</p>
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
            <Button type="submit" disabled={busy} className="login-submit w-full">
              {busy ? 'Signing in…' : 'Continue'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
