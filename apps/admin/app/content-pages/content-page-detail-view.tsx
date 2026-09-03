'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { archiveContentPage, getContentPage, publishContentPage, unpublishContentPage, updateContentPage } from './content-pages-api';
import type { ContentPageDetail } from './content-pages-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; page: ContentPageDetail };

export function ContentPageDetailView({ id }: { id: string }) {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [saved, setSaved] = useState(false);

  function load(): void {
    setState({ status: 'loading' });
    getContentPage(id)
      .then((page) => {
        setState({ status: 'ready', page });
        setTitle(page.title);
        setBody(page.body);
      })
      .catch((error: unknown) => setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải trang' }));
  }

  useEffect(load, [id]);

  async function handleSave(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    setSaved(false);
    try {
      const page = await updateContentPage(id, { title: title.trim(), body });
      setState({ status: 'ready', page });
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
      await publishContentPage(id);
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
      await unpublishContentPage(id);
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
      await archiveContentPage(id);
      window.location.assign('/content-pages');
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Lưu trữ thất bại');
      setBusy(false);
    }
  }

  return (
    <ContentPageDetailContent
      state={state}
      title={title}
      onTitleChange={(value) => { setTitle(value); setSaved(false); }}
      body={body}
      onBodyChange={(value) => { setBody(value); setSaved(false); }}
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

export function ContentPageDetailContent({ state, title, onTitleChange, body, onBodyChange, busy, actionError, saved, onSave, onPublish, onUnpublish, onArchive }: {
  state: ViewState;
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  busy: boolean;
  actionError?: string;
  saved: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải trang…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { page } = state;
  const isDraft = page.status === 'DRAFT';
  const isPublished = page.status === 'PUBLISHED';

  return (
    <div className="content-page-detail">
      <div className="content-page-detail-header">
        <div>
          <p className="content-page-slug">/{page.slug}</p>
          <span className={`status-badge status-badge-${page.status.toLowerCase()}`}>{page.status}</span>
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
          Nội dung
          <textarea value={body} onChange={(event) => onBodyChange(event.target.value)} disabled={busy} required />
        </label>
        <button type="submit" disabled={busy}>Lưu</button>
        {saved ? <span className="setting-saved">Đã lưu</span> : null}
      </form>
    </div>
  );
}
