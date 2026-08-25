import type { Metadata } from 'next';
import Link from 'next/link';
import { SkipLink } from '../skip-link';
import { formatArticleDate, listArticles } from './article-api';

export const metadata: Metadata = {
  title: 'Tin tức',
  description: 'Tin tức và bài viết từ Vườn Măng Đen — Homestay & BBQ.',
};

export default async function ArticlesPage() {
  const articles = await listArticles().catch(() => []);
  return (
    <>
      <SkipLink />
      <header className="site-header">
        <Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link>
        <nav aria-label="Điều hướng tin tức"><Link href="/">Trang chủ</Link></nav>
      </header>
      <main id="noi-dung" tabIndex={-1} className="room-page">
        <section aria-labelledby="article-title">
          <p className="eyebrow">Tin tức</p>
          <h1 id="article-title">Câu chuyện từ Vườn Măng Đen</h1>
          {articles.length === 0 ? (
            <p className="room-lead">Chưa có bài viết nào được đăng.</p>
          ) : (
            <ul className="article-list">
              {articles.map((article) => (
                <li key={article.slug} className="article-card">
                  {article.category ? <p className="eyebrow">{article.category.name}</p> : null}
                  <h2><Link href={`/tin-tuc/${article.slug}`}>{article.title}</Link></h2>
                  {article.excerpt ? <p>{article.excerpt}</p> : null}
                  <p className="article-meta">{formatArticleDate(article.publishedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
