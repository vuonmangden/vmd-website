import { adminApi } from '../lib/api-client';

export interface ContentPageSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ContentPageDetail extends ContentPageSummary {
  body: string;
  createdAt: string;
}

export interface CreateContentPageInput {
  slug: string;
  title: string;
  body: string;
}

export interface UpdateContentPageInput {
  title?: string;
  body?: string;
}

export function listContentPages(): Promise<ContentPageSummary[]> {
  return adminApi<ContentPageSummary[]>('/admin/content-pages');
}

export function getContentPage(id: string): Promise<ContentPageDetail> {
  return adminApi<ContentPageDetail>(`/admin/content-pages/${encodeURIComponent(id)}`);
}

export function createContentPage(input: CreateContentPageInput): Promise<ContentPageDetail> {
  return adminApi<ContentPageDetail>('/admin/content-pages', { method: 'POST', body: JSON.stringify(input) });
}

export function updateContentPage(id: string, input: UpdateContentPageInput): Promise<ContentPageDetail> {
  return adminApi<ContentPageDetail>(`/admin/content-pages/${encodeURIComponent(id)}/update`, { method: 'POST', body: JSON.stringify(input) });
}

export function publishContentPage(id: string): Promise<ContentPageDetail> {
  return adminApi<ContentPageDetail>(`/admin/content-pages/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({}) });
}

export function unpublishContentPage(id: string): Promise<ContentPageDetail> {
  return adminApi<ContentPageDetail>(`/admin/content-pages/${encodeURIComponent(id)}/unpublish`, { method: 'POST', body: JSON.stringify({}) });
}

export function archiveContentPage(id: string): Promise<{ id: string; status: string }> {
  return adminApi<{ id: string; status: string }>(`/admin/content-pages/${encodeURIComponent(id)}/archive`, { method: 'POST', body: JSON.stringify({}) });
}
