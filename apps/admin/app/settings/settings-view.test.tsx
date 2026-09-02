import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SettingsContent } from './settings-view';
import type { SiteSetting, SystemSetting } from './settings-api';

const SITE_SETTINGS: SiteSetting[] = [
  { key: 'site.name', value: 'Vườn Măng Đen', updatedAt: '2026-09-01T00:00:00.000Z' },
  { key: 'banner.enabled', value: true, updatedAt: '2026-09-01T00:00:00.000Z' },
  { key: 'app.timezone', value: 'Asia/Ho_Chi_Minh', updatedAt: '2026-09-01T00:00:00.000Z' },
];

const SYSTEM_SETTINGS: SystemSetting[] = [
  { key: 'payment.expiry_hours.room', category: 'payment', value: { hours: 24 }, isSecretReference: false, updatedAt: '2026-09-01T00:00:00.000Z' },
  { key: 'bbq.deposit_amount_per_table', category: 'bbq', value: null, isSecretReference: true, updatedAt: '2026-09-01T00:00:00.000Z' },
];

describe('SettingsContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<SettingsContent state={{ status: 'loading' }} isSuperAdmin={false} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<SettingsContent state={{ status: 'error', message: 'Lỗi' }} isSuperAdmin={false} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders every site and system field with its current value pre-filled', () => {
    const markup = renderToStaticMarkup(
      <SettingsContent state={{ status: 'ready', siteSettings: SITE_SETTINGS, systemSettings: SYSTEM_SETTINGS }} isSuperAdmin={true} />,
    );

    expect(markup).toContain('Tên website');
    expect(markup).toContain('value="Vườn Măng Đen"');
    expect(markup).toContain('Hết hạn thanh toán phòng (giờ)');
    expect(markup).toContain('value="24"');
  });

  it('locks a Super-Admin-only field for a non-Super-Admin actor', () => {
    const markup = renderToStaticMarkup(
      <SettingsContent state={{ status: 'ready', siteSettings: SITE_SETTINGS, systemSettings: [] }} isSuperAdmin={false} />,
    );

    expect(markup).toContain('Chỉ Super Admin được sửa');
  });

  it('does not lock the Super-Admin-only field for a Super Admin', () => {
    const markup = renderToStaticMarkup(
      <SettingsContent state={{ status: 'ready', siteSettings: SITE_SETTINGS, systemSettings: [] }} isSuperAdmin={true} />,
    );

    expect(markup).not.toContain('Chỉ Super Admin được sửa');
  });

  it('masks a secret-reference system setting instead of showing its value', () => {
    const markup = renderToStaticMarkup(
      <SettingsContent state={{ status: 'ready', siteSettings: [], systemSettings: SYSTEM_SETTINGS }} isSuperAdmin={true} />,
    );

    expect(markup).toContain('Giá trị bí mật — không hiển thị, sửa qua kênh an toàn');
  });
});
