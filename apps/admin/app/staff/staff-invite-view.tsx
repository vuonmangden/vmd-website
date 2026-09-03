'use client';

import { useState } from 'react';
import { ApiError } from '../lib/api-client';
import { ROLE_OPTIONS } from './roles';
import { inviteStaff } from './staff-api';

export function StaffInviteView() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleCode, setRoleCode] = useState(ROLE_OPTIONS[0]!.code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const staff = await inviteStaff({ email: email.trim(), fullName: fullName.trim(), roleCode });
      window.location.assign(`/staff/${staff.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mời nhân viên thất bại');
      setBusy(false);
    }
  }

  return (
    <StaffInviteContent
      email={email} onEmailChange={setEmail}
      fullName={fullName} onFullNameChange={setFullName}
      roleCode={roleCode} onRoleCodeChange={setRoleCode}
      busy={busy} error={error}
      onSubmit={() => void handleSubmit()}
    />
  );
}

export function StaffInviteContent({ email, onEmailChange, fullName, onFullNameChange, roleCode, onRoleCodeChange, busy, error, onSubmit }: {
  email: string; onEmailChange: (value: string) => void;
  fullName: string; onFullNameChange: (value: string) => void;
  roleCode: string; onRoleCodeChange: (value: string) => void;
  busy: boolean; error?: string;
  onSubmit: () => void;
}) {
  return (
    <form className="content-page-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      {error ? <p role="alert" className="dashboard-error">{error}</p> : null}
      <label>
        Email
        <input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} disabled={busy} required />
      </label>
      <label>
        Họ tên
        <input type="text" value={fullName} onChange={(event) => onFullNameChange(event.target.value)} disabled={busy} required />
      </label>
      <label>
        Vai trò khởi điểm
        <select value={roleCode} onChange={(event) => onRoleCodeChange(event.target.value)} disabled={busy}>
          {ROLE_OPTIONS.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
        </select>
      </label>
      <button type="submit" disabled={busy}>Gửi lời mời</button>
    </form>
  );
}
