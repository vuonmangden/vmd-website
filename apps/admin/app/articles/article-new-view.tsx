'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { createArticle, listArticleCategories } from './articles-api';
import type { ArticleCategory } from './articles-api';

export type CategoriesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; categories: ArticleCategory[] };

export function ArticleNewView() {
  const [categoriesState, setCategoriesState] = useState<CategoriesState>({ status: 'loading' });
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    listArticleCategories()
      .then((categories) => setCategoriesState({ status: 'ready', categories }))
      .catch((err: unknown) => setCategoriesState({ status: 'error', message: err instanceof ApiError ? err.message : 'Không thể tải chuyên mục' }));
  }, []);

  async function handleSubmit(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const article = await createArticle({
        slug: slug.trim(),
        title: title.trim(),
        content: { text: contentText },
        ...(excerpt.trim() ? { excerpt: excerpt.trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(seoTitle.trim() ? { seoTitle: seoTitle.trim() } : {}),
        ...(seoDescription.trim() ? { seoDescription: seoDescription.trim() } : {}),
        ...(canonicalUrl.trim() ? { canonicalUrl: canonicalUrl.trim() } : {}),
      });
      window.location.assign(`/articles/${article.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo bài viết thất bại');
      setBusy(false);
    }
  }

  return (
    <ArticleNewContent
      categoriesState={categoriesState}
      slug={slug} onSlugChange={setSlug}
      title={title} onTitleChange={setTitle}
      contentText={contentText} onContentTextChange={setContentText}
      excerpt={excerpt} onExcerptChange={setExcerpt}
      categoryId={categoryId} onCategoryIdChange={setCategoryId}
      seoTitle={seoTitle} onSeoTitleChange={setSeoTitle}
      seoDescription={seoDescription} onSeoDescriptionChange={setSeoDescription}
      canonicalUrl={canonicalUrl} onCanonicalUrlChange={setCanonicalUrl}
      busy={busy} error={error}
      onSubmit={() => void handleSubmit()}
    />
  );
}

export function ArticleNewContent({
  categoriesState,
  slug, onSlugChange,
  title, onTitleChange,
  contentText, onContentTextChange,
  excerpt, onExcerptChange,
  categoryId, onCategoryIdChange,
  seoTitle, onSeoTitleChange,
  seoDescription, onSeoDescriptionChange,
  canonicalUrl, onCanonicalUrlChange,
  busy, error, onSubmit,
}: {
  categoriesState: CategoriesState;
  slug: string; onSlugChange: (value: string) => void;
  title: string; onTitleChange: (value: string) => void;
  contentText: string; onContentTextChange: (value: string) => void;
  excerpt: string; onExcerptChange: (value: string) => void;
  categoryId: string; onCategoryIdChange: (value: string) => void;
  seoTitle: string; onSeoTitleChange: (value: string) => void;
  seoDescription: string; onSeoDescriptionChange: (value: string) => void;
  canonicalUrl: string; onCanonicalUrlChange: (value: string) => void;
  busy: boolean; error?: string;
  onSubmit: () => void;
}) {
  const categories = categoriesState.status === 'ready' ? categoriesState.categories.filter((c) => c.status === 'ACTIVE') : [];

  return (
    <form className="content-page-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      {error ? <p role="alert" className="dashboard-error">{error}</p> : null}
      <label>
        Slug
        <input type="text" value={slug} onChange={(event) => onSlugChange(event.target.value)} disabled={busy} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label>
        Tiêu đề
        <input type="text" value={title} onChange={(event) => onTitleChange(event.target.value)} disabled={busy} required />
      </label>
      <label>
        Chuyên mục
        <select value={categoryId} onChange={(event) => onCategoryIdChange(event.target.value)} disabled={busy || categoriesState.status !== 'ready'}>
          <option value="">Không phân loại</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      {categoriesState.status === 'error' ? <p className="setting-disabled-reason">{categoriesState.message}</p> : null}
      <label>
        Tóm tắt
        <textarea value={excerpt} onChange={(event) => onExcerptChange(event.target.value)} disabled={busy} />
      </label>
      <label>
        Nội dung
        <textarea value={contentText} onChange={(event) => onContentTextChange(event.target.value)} disabled={busy} required />
      </label>
      <label>
        SEO — Tiêu đề
        <input type="text" value={seoTitle} onChange={(event) => onSeoTitleChange(event.target.value)} disabled={busy} />
      </label>
      <label>
        SEO — Mô tả
        <textarea value={seoDescription} onChange={(event) => onSeoDescriptionChange(event.target.value)} disabled={busy} />
      </label>
      <label>
        SEO — URL chuẩn (canonical)
        <input type="text" value={canonicalUrl} onChange={(event) => onCanonicalUrlChange(event.target.value)} disabled={busy} />
      </label>
      <button type="submit" disabled={busy}>Tạo bài viết</button>
    </form>
  );
}
