'use client';

import { useState } from 'react';

export interface SettingFieldProps {
  fieldKey: string;
  label: string;
  kind: 'text' | 'boolean' | 'number';
  initialValue: string;
  disabled?: boolean;
  disabledReason?: string;
  /** Receives the raw draft (checkbox -> 'true'/'false', number -> the typed string) — the caller knows how to shape it for its own endpoint. */
  onSave: (draft: string) => Promise<void>;
}

export function SettingField({ fieldKey, label, kind, initialValue, disabled, disabledReason, onSave }: SettingFieldProps) {
  const [draft, setDraft] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      await onSave(draft);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  const isDisabled = disabled || saving;

  return (
    <div className="setting-row">
      <label htmlFor={fieldKey}>{label}</label>
      {kind === 'boolean' ? (
        <input
          id={fieldKey}
          type="checkbox"
          checked={draft === 'true'}
          disabled={isDisabled}
          onChange={(event) => { setDraft(event.target.checked ? 'true' : 'false'); setSaved(false); }}
        />
      ) : (
        <input
          id={fieldKey}
          type={kind === 'number' ? 'number' : 'text'}
          value={draft}
          disabled={isDisabled}
          onChange={(event) => { setDraft(event.target.value); setSaved(false); }}
        />
      )}
      <button type="button" onClick={() => void handleSave()} disabled={isDisabled}>
        {saving ? 'Đang lưu…' : 'Lưu'}
      </button>
      {saved ? <span className="setting-saved">Đã lưu</span> : null}
      {error ? <span role="alert" className="setting-error">{error}</span> : null}
      {disabled && disabledReason ? <span className="setting-disabled-reason">{disabledReason}</span> : null}
    </div>
  );
}
