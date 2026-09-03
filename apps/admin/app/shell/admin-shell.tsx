'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useCurrentActor } from '../admin-route';
import { logout } from '../lib/auth-client';
import { NAV_LINKS } from './nav-links';

export function AdminShell({ children }: { children: ReactNode }) {
  const actor = useCurrentActor();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      window.location.assign('/login');
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav" aria-label="Điều hướng quản trị">
        <p className="admin-wordmark">Vườn Măng Đen</p>
        <nav>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="admin-body">
        <header className="admin-header">
          <div>
            <p className="admin-actor-name">{actor.fullName}</p>
            <p className="admin-actor-roles">{actor.roles.join(', ')}</p>
          </div>
          <button type="button" onClick={() => void handleLogout()} disabled={loggingOut}>
            {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
