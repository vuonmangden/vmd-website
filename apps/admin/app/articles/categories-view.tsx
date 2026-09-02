'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { CategoryRow } from './category-row';
import { createArticleCategory, listArticleCategories, updateArticleCategory } from './articles-api';
import type { ArticleCategory, UpdateArticleCategoryInput } from './articles-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; categories: ArticleCategory[] };

export function CategoriesView() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function load(): void {
    setState({ status: 'loading' });
    listArticleCategories()
      .then((categories) => setState({ status: 'ready', categories }))
      .catch((err: unknown) => setState({ status: 'error', message: err instanceof ApiError ? err.message : 'Không thể tải chuyên mục' }));
  }

  useEffect(load, []);

  async function handleCreate(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await createArticleCategory({ name: name.trim(), slug: slug.trim(), ...(description.trim() ? { description: description.trim() } : {}) });
      setName('');
      setSlug('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo chuyên mục thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleRowSave(id: string, patch: UpdateArticleCategoryInput): Promise<void> {
    await updateArticleCategory(id, patch);
    load();
  }

  return (
    <div className="categories-page">
      <CategoriesListContent state={state} onRowSave={handleRowSave} />
      <form className="content-page-form" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
        <h2 className="dashboard-section-title">Thêm chuyên mục</h2>
        {error ? <p role="alert" className="dashboard-error">{error}</p> : null}
        <label>
          Tên
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} disabled={busy} required />
        </label>
        <label>
          Slug
          <input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={busy} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </label>
        <label>
          Mô tả
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} />
        </label>
        <button type="submit" disabled={busy}>Thêm chuyên mục</button>
      </form>
    </div>
  );
}

export function CategoriesListContent({ state, onRowSave }: {
  state: ViewState;
  onRowSave: (id: string, patch: UpdateArticleCategoryInput) => Promise<void>;
}) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải chuyên mục…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  if (state.categories.length === 0) return <p>Chưa có chuyên mục nào.</p>;

  return (
    <div className="category-list">
      {state.categories.map((category) => (
        <CategoryRow key={category.id} category={category} onSave={(patch) => onRowSave(category.id, patch)} />
      ))}
    </div>
  );
}
