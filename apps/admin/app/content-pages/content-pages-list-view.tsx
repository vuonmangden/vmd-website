'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { listContentPages } from './content-pages-api';
import type { ContentPageSummary } from './content-pages-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pages: ContentPageSummary[] };

export function ContentPagesListView() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listContentPages()
      .then((pages) => { if (!cancelled) setState({ status: 'ready', pages }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách' });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="content-pages-page">
      <div className="content-pages-toolbar">
        <Link href="/content-pages/new" className="link-button">+ Trang mới</Link>
      </div>
      <ContentPagesListContent state={state} />
    </div>
  );
}

export function ContentPagesListContent({ state }: { state: ViewState }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  if (state.pages.length === 0) return <p>Chưa có trang nội dung nào.</p>;

  return (
    <table className="bookings-table">
      <thead>
        <tr><th>Slug</th><th>Tiêu đề</th><th>Trạng thái</th><th>Cập nhật</th></tr>
      </thead>
      <tbody>
        {state.pages.map((page) => (
          <tr key={page.id}>
            <td><Link href={`/content-pages/${page.id}`}>{page.slug}</Link></td>
            <td>{page.title}</td>
            <td><span className={`status-badge status-badge-${page.status.toLowerCase()}`}>{page.status}</span></td>
            <td>{page.updatedAt.slice(0, 10)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
