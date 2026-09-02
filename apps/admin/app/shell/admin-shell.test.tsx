import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActorContext } from '../admin-route';
import { AdminShell } from './admin-shell';
import { NAV_LINKS } from './nav-links';

const ACTOR = {
  staffProfileId: 'profile-1',
  authUserId: '00000000-0000-4000-8000-000000000001',
  fullName: 'Nguyễn Văn Quản Lý',
  email: 'manager@example.test',
  roles: ['MANAGER'],
  permissions: ['report.read'],
};

describe('AdminShell', () => {
  it('renders every shipped nav link, the signed-in staff name/roles, and a logout control', () => {
    const markup = renderToStaticMarkup(
      <ActorContext.Provider value={ACTOR}>
        <AdminShell><p>Nội dung</p></AdminShell>
      </ActorContext.Provider>,
    );

    for (const link of NAV_LINKS) {
      expect(markup).toContain(`href="${link.href}"`);
      expect(markup).toContain(link.label);
    }
    expect(markup).toContain('Nguyễn Văn Quản Lý');
    expect(markup).toContain('MANAGER');
    expect(markup).toContain('Đăng xuất');
    expect(markup).toContain('Nội dung');
  });
});
