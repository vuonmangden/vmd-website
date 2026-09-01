import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SkipLink } from '../../skip-link';
import { getContentPageBySlug, paragraphsFromText, truncateForDescription } from '../content-page-api';

const siteOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getContentPageBySlug(slug);
  if (!page) return { title: 'Không tìm thấy trang' };

  const canonical = `${siteOrigin}/trang/${page.slug}`;
  const description = truncateForDescription(page.body);
  return {
    title: page.title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', title: page.title, description, url: canonical },
  };
}

export default async function ContentPageDetail({ params }: Props) {
  const { slug } = await params;
  const page = await getContentPageBySlug(slug);
  if (!page) notFound();

  const paragraphs = paragraphsFromText(page.body);
  const canonical = `${siteOrigin}/trang/${page.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: truncateForDescription(page.body),
    url: canonical,
  };

  return (
    <>
      <SkipLink />
      {/* Fixed, code-authored JSON-LD, not user input — no injection surface here. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="site-header">
        <Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link>
        <nav aria-label="Điều hướng"><Link href="/">Trang chủ</Link></nav>
      </header>
      <main id="noi-dung" tabIndex={-1} className="room-page article-detail">
        <h1>{page.title}</h1>
        <div className="article-body">
          {paragraphs.length > 0
            ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            : <p>Nội dung đang được cập nhật.</p>}
        </div>
      </main>
    </>
  );
}
