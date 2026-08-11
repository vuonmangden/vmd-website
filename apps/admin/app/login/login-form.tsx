'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { login } from '../lib/auth-client';

type LoginState = 'idle' | 'submitting' | 'authenticated';

export function LoginForm() {
  const [state, setState] = useState<LoginState>('idle');
  const [error, setError] = useState<string>();
  const [name, setName] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState('submitting');
    setError(undefined);

    const form = new FormData(event.currentTarget);
    try {
      const result = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
      setName(result.actor.fullName);
      setState('authenticated');
      window.location.assign('/');
    } catch {
      setState('idle');
      setError('Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.');
    }
  }

  if (state === 'authenticated') {
    return <p className="auth-success" role="status">Đã đăng nhập với tài khoản {name}.</p>;
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={state === 'submitting'}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required disabled={state === 'submitting'} />
      <label htmlFor="password">Mật khẩu</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required disabled={state === 'submitting'} />
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  );
}
