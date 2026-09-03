'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import {
  archiveArticle,
  extractArticleText,
  getArticle,
  listArticleCategories,
  publishArticle,
  unpublishArticle,
  updateArticle,
} from './articles-api';
import type { ArticleCategory, ArticleDetail } from './articles-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; article: ArticleDetail };

export type CategoriesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; categories: ArticleCategory[] };

export function ArticleDetailView({ id }: { id: string }) {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [categoriesState, setCategoriesState] = useState<CategoriesState>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [saved, setSaved] = useState(false);

  function load(): void {
    setState({ status: 'loading' });
    getArticle(id)
      .then((article) => {
        setState({ status: 'ready', article });
        setTitle(article.title);
        setContentText(extractArticleText(article.content));
        setExcerpt(article.excerpt ?? '');
        setCategoryId(article.categoryId ?? '');
        setSeoTitle(article.seoTitle ?? '');
        setSeoDescription(article.seoDescription ?? '');
        setCanonicalUrl(article.canonicalUrl ?? '');
      })
      .catch((error: unknown) => setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải bài viết' }));
  }

  useEffect(load, [id]);

  useEffect(() => {
    listArticleCategories()
      .then((categories) => setCategoriesState({ status: 'ready', categories }))
      .catch((error: unknown) => setCategoriesState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải chuyên mục' }));
  }, []);

  async function handleSave(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    setSaved(false);
    try {
      const article = await updateArticle(id, {
        title: title.trim(),
        content: { text: contentText },
        excerpt: excerpt.trim(),
        categoryId: categoryId || null,
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        canonicalUrl: canonicalUrl.trim(),
      });
      setState({ status: 'ready', article });
      setSaved(true);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await publishArticle(id);
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Xuất bản thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await unpublishArticle(id);
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Chuyển về nháp thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await archiveArticle(id);
      window.location.assign('/articles');
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Lưu trữ thất bại');
      setBusy(false);
    }
  }

  return (
    <ArticleDetailContent
      state={state}
      categoriesState={categoriesState}
      title={title} onTitleChange={(value) => { setTitle(value); setSaved(false); }}
      contentText={contentText} onContentTextChange={(value) => { setContentText(value); setSaved(false); }}
      excerpt={excerpt} onExcerptChange={(value) => { setExcerpt(value); setSaved(false); }}
      categoryId={categoryId} onCategoryIdChange={(value) => { setCategoryId(value); setSaved(false); }}
      seoTitle={seoTitle} onSeoTitleChange={(value) => { setSeoTitle(value); setSaved(false); }}
      seoDescription={seoDescription} onSeoDescriptionChange={(value) => { setSeoDescription(value); setSaved(false); }}
      canonicalUrl={canonicalUrl} onCanonicalUrlChange={(value) => { setCanonicalUrl(value); setSaved(false); }}
      busy={busy}
      actionError={actionError}
      saved={saved}
      onSave={() => void handleSave()}
      onPublish={() => void handlePublish()}
      onUnpublish={() => void handleUnpublish()}
      onArchive={() => void handleArchive()}
    />
  );
}

export function ArticleDetailContent({
  state, categoriesState,
  title, onTitleChange,
  contentText, onContentTextChange,
  excerpt, onExcerptChange,
  categoryId, onCategoryIdChange,
  seoTitle, onSeoTitleChange,
  seoDescription, onSeoDescriptionChange,
  canonicalUrl, onCanonicalUrlChange,
  busy, actionError, saved,
  onSave, onPublish, onUnpublish, onArchive,
}: {
  state: ViewState;
  categoriesState: CategoriesState;
  title: string; onTitleChange: (value: string) => void;
  contentText: string; onContentTextChange: (value: string) => void;
  excerpt: string; onExcerptChange: (value: string) => void;
  categoryId: string; onCategoryIdChange: (value: string) => void;
  seoTitle: string; onSeoTitleChange: (value: string) => void;
  seoDescription: string; onSeoDescriptionChange: (value: string) => void;
  canonicalUrl: string; onCanonicalUrlChange: (value: string) => void;
  busy: boolean; actionError?: string; saved: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải bài viết…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { article } = state;
  const isDraft = article.status === 'DRAFT';
  const isPublished = article.status === 'PUBLISHED';
  const categories = categoriesState.status === 'ready'
    ? categoriesState.categories.filter((c) => c.status === 'ACTIVE' || c.id === categoryId)
    : [];

  return (
    <div className="content-page-detail">
      <div className="content-page-detail-header">
        <div>
          <p className="content-page-slug">/{article.slug}</p>
          <span className={`status-badge status-badge-${article.status.toLowerCase()}`}>{article.status}</span>
        </div>
        <div className="content-page-actions">
          {isDraft ? <button type="button" onClick={onPublish} disabled={busy}>Xuất bản</button> : null}
          {isPublished ? <button type="button" onClick={onUnpublish} disabled={busy}>Chuyển về nháp</button> : null}
          <button type="button" className="button-danger" onClick={onArchive} disabled={busy}>Lưu trữ</button>
        </div>
      </div>

      {actionError ? <p role="alert" className="dashboard-error">{actionError}</p> : null}

      <form className="content-page-form" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
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
        <button type="submit" disabled={busy}>Lưu</button>
        {saved ? <span className="setting-saved">Đã lưu</span> : null}
      </form>
    </div>
  );
}
