import { adminApi } from '../lib/api-client';

export interface StaffSummary {
  id: string;
  fullName: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roles: string[];
}

export interface StaffListResult {
  items: StaffSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface StaffRoleAssignment {
  assignedAt: string;
  role: { code: string; name: string };
  assigner: { id: string; fullName: string } | null;
}

export interface StaffDetail {
  id: string;
  fullName: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roleAssignments: StaffRoleAssignment[];
}

export interface StaffListFilters {
  status?: string;
  page?: number;
}

const PAGE_SIZE = 50;

export function listStaff(filters: StaffListFilters): Promise<StaffListResult> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(PAGE_SIZE));
  return adminApi<StaffListResult>(`/admin/staff?${params.toString()}`);
}

export function getStaff(id: string): Promise<StaffDetail> {
  return adminApi<StaffDetail>(`/admin/staff/${encodeURIComponent(id)}`);
}

export function inviteStaff(input: { email: string; fullName: string; roleCode: string }): Promise<{ id: string; email: string; fullName: string; status: string }> {
  return adminApi(`/admin/staff/invite`, { method: 'POST', body: JSON.stringify(input) });
}

export function changeStaffStatus(id: string, status: string, reason?: string): Promise<{ id: string; status: string }> {
  return adminApi(`/admin/staff/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(reason ? { status, reason } : { status }),
  });
}

export function assignStaffRole(id: string, roleCode: string): Promise<{ assigned: true }> {
  return adminApi(`/admin/staff/${encodeURIComponent(id)}/roles`, { method: 'POST', body: JSON.stringify({ roleCode }) });
}

export function revokeStaffRole(id: string, roleCode: string): Promise<{ revoked: true }> {
  return adminApi(`/admin/staff/${encodeURIComponent(id)}/roles/${encodeURIComponent(roleCode)}`, { method: 'DELETE' });
}
