import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SettingField } from './setting-field';

describe('SettingField', () => {
  it('renders a text input pre-filled with the initial value', () => {
    const markup = renderToStaticMarkup(<SettingField fieldKey="site.name" label="Tên website" kind="text" initialValue="Vườn Măng Đen" onSave={vi.fn()} />);
    expect(markup).toContain('Tên website');
    expect(markup).toContain('value="Vườn Măng Đen"');
    expect(markup).toContain('type="text"');
  });

  it('renders a checked checkbox for a boolean field whose initial value is "true"', () => {
    const markup = renderToStaticMarkup(<SettingField fieldKey="banner.enabled" label="Bật banner" kind="boolean" initialValue="true" onSave={vi.fn()} />);
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('checked=""');
  });

  it('renders a number input for a numeric field', () => {
    const markup = renderToStaticMarkup(<SettingField fieldKey="payment.expiry_hours.room" label="Hết hạn (giờ)" kind="number" initialValue="24" onSave={vi.fn()} />);
    expect(markup).toContain('type="number"');
    expect(markup).toContain('value="24"');
  });

  it('disables the input and save button, and shows the reason, when disabled', () => {
    const markup = renderToStaticMarkup(
      <SettingField fieldKey="app.timezone" label="Múi giờ" kind="text" initialValue="Asia/Ho_Chi_Minh" disabled disabledReason="Chỉ Super Admin được sửa" onSave={vi.fn()} />,
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Chỉ Super Admin được sửa');
  });
});
