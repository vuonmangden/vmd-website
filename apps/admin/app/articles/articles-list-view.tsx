'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { listArticles } from './articles-api';
import type { ArticleSummary } from './articles-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; articles: ArticleSummary[] };

export function ArticlesListView() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listArticles()
      .then((articles) => { if (!cancelled) setState({ status: 'ready', articles }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách' });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="content-pages-page">
      <div className="articles-toolbar">
        <Link href="/articles/categories">Quản lý chuyên mục</Link>
        <Link href="/articles/new" className="link-button">+ Bài viết mới</Link>
      </div>
      <ArticlesListContent state={state} />
    </div>
  );
}

export function ArticlesListContent({ state }: { state: ViewState }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  if (state.articles.length === 0) return <p>Chưa có bài viết nào.</p>;

  return (
    <table className="bookings-table">
      <thead>
        <tr><th>Tiêu đề</th><th>Chuyên mục</th><th>Trạng thái</th><th>Cập nhật</th></tr>
      </thead>
      <tbody>
        {state.articles.map((article) => (
          <tr key={article.id}>
            <td><Link href={`/articles/${article.id}`}>{article.title}</Link></td>
            <td>{article.category?.name ?? '—'}</td>
            <td><span className={`status-badge status-badge-${article.status.toLowerCase()}`}>{article.status}</span></td>
            <td>{article.updatedAt.slice(0, 10)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
