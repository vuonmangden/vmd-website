import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StaffInviteContent } from './staff-invite-view';

const NOOP_PROPS = {
  email: '', onEmailChange: vi.fn(),
  fullName: '', onFullNameChange: vi.fn(),
  roleCode: 'RECEPTION', onRoleCodeChange: vi.fn(),
  busy: false, onSubmit: vi.fn(),
};

describe('StaffInviteContent', () => {
  it('renders the email, full name, and role fields with their current values', () => {
    const markup = renderToStaticMarkup(<StaffInviteContent {...NOOP_PROPS} email="a@vuonmangden.com" fullName="Nguyễn Văn A" />);
    expect(markup).toContain('value="a@vuonmangden.com"');
    expect(markup).toContain('value="Nguyễn Văn A"');
    expect(markup).toMatch(/<option value="RECEPTION" selected="">/);
  });

  it('lists every seeded role as an option', () => {
    const markup = renderToStaticMarkup(<StaffInviteContent {...NOOP_PROPS} />);
    expect(markup).toContain('Super Admin');
    expect(markup).toContain('Marketing / Content');
  });

  it('disables every field while busy', () => {
    const markup = renderToStaticMarkup(<StaffInviteContent {...NOOP_PROPS} busy />);
    expect(markup.match(/disabled=""/g)?.length).toBe(4);
  });

  it('renders an error alongside the form, not in place of it', () => {
    const markup = renderToStaticMarkup(<StaffInviteContent {...NOOP_PROPS} error="Email đã tồn tại" />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Email đã tồn tại');
    expect(markup).toContain('Gửi lời mời');
  });
});
