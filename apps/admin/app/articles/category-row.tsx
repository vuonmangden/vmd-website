'use client';

import { useState } from 'react';
import type { ArticleCategory, UpdateArticleCategoryInput } from './articles-api';

export interface CategoryRowProps {
  category: ArticleCategory;
  onSave: (patch: UpdateArticleCategoryInput) => Promise<void>;
}

export function CategoryRow({ category, onSave }: CategoryRowProps) {
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [status, setStatus] = useState(category.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      await onSave({ name: name.trim(), sortOrder: Number(sortOrder) || 0, status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="category-row">
      <span className="category-row-slug">{category.slug}</span>
      <input
        type="text"
        aria-label={`Tên chuyên mục ${category.slug}`}
        value={name}
        disabled={saving}
        onChange={(event) => { setName(event.target.value); setSaved(false); }}
      />
      <input
        type="number"
        aria-label={`Thứ tự ${category.slug}`}
        value={sortOrder}
        disabled={saving}
        onChange={(event) => { setSortOrder(event.target.value); setSaved(false); }}
      />
      <select
        aria-label={`Trạng thái ${category.slug}`}
        value={status}
        disabled={saving}
        onChange={(event) => { setStatus(event.target.value); setSaved(false); }}
      >
        <option value="ACTIVE">Hoạt động</option>
        <option value="INACTIVE">Ẩn</option>
      </select>
      <button type="button" onClick={() => void handleSave()} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
      {saved ? <span className="setting-saved">Đã lưu</span> : null}
      {error ? <span role="alert" className="setting-error">{error}</span> : null}
    </div>
  );
}
