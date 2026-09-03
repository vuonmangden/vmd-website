'use client';

import { useState } from 'react';
import { ApiError } from '../lib/api-client';
import { createContentPage } from './content-pages-api';

export function ContentPageNewView() {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const page = await createContentPage({ slug: slug.trim(), title: title.trim(), body });
      window.location.assign(`/content-pages/${page.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo trang thất bại');
      setBusy(false);
    }
  }

  return (
    <ContentPageNewContent
      slug={slug}
      onSlugChange={setSlug}
      title={title}
      onTitleChange={setTitle}
      body={body}
      onBodyChange={setBody}
      busy={busy}
      error={error}
      onSubmit={() => void handleSubmit()}
    />
  );
}

export function ContentPageNewContent({ slug, onSlugChange, title, onTitleChange, body, onBodyChange, busy, error, onSubmit }: {
  slug: string;
  onSlugChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  busy: boolean;
  error?: string;
  onSubmit: () => void;
}) {
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
        Nội dung
        <textarea value={body} onChange={(event) => onBodyChange(event.target.value)} disabled={busy} required />
      </label>
      <button type="submit" disabled={busy}>Tạo trang</button>
    </form>
  );
}
