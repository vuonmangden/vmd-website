import { adminApi } from '../lib/api-client';

export interface SiteSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface SystemSetting {
  key: string;
  category: string;
  value: unknown;
  isSecretReference: boolean;
  updatedAt: string;
}

export function listSiteSettings(): Promise<SiteSetting[]> {
  return adminApi<SiteSetting[]>('/admin/site-settings');
}

export function updateSiteSetting(key: string, value: unknown): Promise<SiteSetting> {
  return adminApi<SiteSetting>('/admin/site-settings', { method: 'PUT', body: JSON.stringify({ key, value }) });
}

export function listSystemSettings(): Promise<SystemSetting[]> {
  return adminApi<SystemSetting[]>('/admin/settings');
}

export function updateSystemSetting(key: string, value: unknown, expectedUpdatedAt?: string): Promise<SystemSetting> {
  return adminApi<SystemSetting>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ key, value, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }),
  });
}
