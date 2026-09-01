import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SkipLink } from '../../skip-link';
import { formatArticleDate, getArticleBySlug, paragraphsFromContent } from '../article-api';

const siteOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Không tìm thấy bài viết' };

  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt ?? paragraphsFromContent(article.content)[0]?.slice(0, 155) ?? undefined;
  const canonical = article.canonicalUrl ?? `${siteOrigin}/tin-tuc/${article.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'article', title, description, url: canonical, publishedTime: article.publishedAt },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = paragraphsFromContent(article.content);
  const canonical = article.canonicalUrl ?? `${siteOrigin}/tin-tuc/${article.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription ?? article.excerpt ?? undefined,
    datePublished: article.publishedAt,
    mainEntityOfPage: canonical,
    publisher: { '@type': 'Organization', name: 'Vườn Măng Đen' },
  };

  return (
    <>
      <SkipLink />
      {/* Fixed, code-authored JSON-LD, not user input — no injection surface here. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="site-header">
        <Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link>
        <nav aria-label="Điều hướng tin tức"><Link href="/tin-tuc">Tin tức</Link></nav>
      </header>
      <main id="noi-dung" tabIndex={-1} className="room-page article-detail">
        <Link href="/tin-tuc">← Tin tức</Link>
        {article.category ? <p className="eyebrow">{article.category.name}</p> : null}
        <h1>{article.title}</h1>
        <p className="article-meta">{formatArticleDate(article.publishedAt)}</p>
        <div className="article-body">
          {paragraphs.length > 0
            ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            : <p>Nội dung đang được cập nhật.</p>}
        </div>
      </main>
    </>
  );
}
