'use client';

import { useEffect, useState } from 'react';
import { useCurrentActor } from '../admin-route';
import { ApiError } from '../lib/api-client';
import { SYSTEM_SETTING_FIELDS, SITE_SETTING_FIELDS, extractAmount, extractHours } from './fields';
import { SettingField } from './setting-field';
import { listSiteSettings, listSystemSettings, updateSiteSetting, updateSystemSetting } from './settings-api';
import type { SiteSetting, SystemSetting } from './settings-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; siteSettings: SiteSetting[]; systemSettings: SystemSetting[] };

export function SettingsView() {
  const actor = useCurrentActor();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all([listSiteSettings(), listSystemSettings()])
      .then(([siteSettings, systemSettings]) => { if (!cancelled) setState({ status: 'ready', siteSettings, systemSettings }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải cài đặt' });
      });
    return () => { cancelled = true; };
  }, []);

  return <SettingsContent state={state} isSuperAdmin={actor.roles.includes('SUPER_ADMIN')} />;
}

export function SettingsContent({ state, isSuperAdmin }: { state: ViewState; isSuperAdmin: boolean }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải cài đặt…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { siteSettings, systemSettings } = state;
  const siteByKey = new Map(siteSettings.map((setting) => [setting.key, setting]));
  const systemByKey = new Map(systemSettings.map((setting) => [setting.key, setting]));

  return (
    <div className="settings-page">
      <section>
        <h2 className="dashboard-section-title">Cài đặt trang web</h2>
        <div className="settings-list">
          {SITE_SETTING_FIELDS.map((field) => {
            const current = siteByKey.get(field.key);
            const locked = Boolean(field.superAdminOnly) && !isSuperAdmin;
            return (
              <SettingField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                kind={field.kind}
                initialValue={toDraft(current?.value, field.kind)}
                disabled={locked}
                disabledReason={locked ? 'Chỉ Super Admin được sửa' : undefined}
                onSave={(draft) => updateSiteSetting(field.key, field.kind === 'boolean' ? draft === 'true' : draft).then(() => undefined)}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="dashboard-section-title">Cài đặt hệ thống</h2>
        <div className="settings-list">
          {SYSTEM_SETTING_FIELDS.map((field) => {
            const current = systemByKey.get(field.key);
            const isSecret = current?.isSecretReference ?? false;
            return (
              <SettingField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                kind={field.kind === 'text' ? 'text' : 'number'}
                initialValue={isSecret ? '' : toSystemDraft(current?.value, field.kind)}
                disabled={isSecret}
                disabledReason={isSecret ? 'Giá trị bí mật — không hiển thị, sửa qua kênh an toàn' : undefined}
                onSave={(draft) => updateSystemSetting(field.key, toSystemValue(field.kind, draft)).then(() => undefined)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function toDraft(value: unknown, kind: 'text' | 'boolean'): string {
  if (kind === 'boolean') return value === true ? 'true' : 'false';
  return typeof value === 'string' ? value : '';
}

function toSystemDraft(value: unknown, kind: 'text' | 'hours' | 'amount'): string {
  if (kind === 'hours') return extractHours(value)?.toString() ?? '';
  if (kind === 'amount') return extractAmount(value)?.toString() ?? '';
  return typeof value === 'string' ? value : '';
}

function toSystemValue(kind: 'text' | 'hours' | 'amount', draft: string): unknown {
  if (kind === 'hours') return { hours: Number(draft) };
  if (kind === 'amount') return { amount: Number(draft) };
  return draft;
}
