import Image from 'next/image';
import { SkipLink } from './skip-link';

const socialLinks = [
  { href: 'https://www.facebook.com/MangDenGarden/', label: 'Facebook' },
  { href: 'https://www.tiktok.com/@vuonmangden', label: 'TikTok' },
  { href: 'https://www.instagram.com/vuonmangden', label: 'Instagram' },
] as const;

export default function Page() {
  return (
    <>
      <SkipLink />

      <header className="site-header">
        <a className="wordmark" href="#dau-trang" aria-label="Vườn Măng Đen — về đầu trang">
          <span>Vườn Măng Đen</span>
          <small>Homestay &amp; BBQ</small>
        </a>

        <nav aria-label="Điều hướng chính">
          <a href="#gioi-thieu">Giới thiệu</a>
          <a href="#lien-he">Liên hệ</a>
        </nav>
      </header>

      <main id="noi-dung" tabIndex={-1}>
        <section id="dau-trang" className="hero" aria-labelledby="tieu-de-chinh">
          <div className="hero-copy">
            <p className="eyebrow">Vườn Măng Đen — Homestay &amp; BBQ</p>
            <h1 id="tieu-de-chinh">Nơi nghỉ dưỡng, giao lưu kết nối bạn bè</h1>
            <p className="hero-description">
              Vườn Măng Đen — Homestay &amp; BBQ.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="tel:19009085">
                Gọi 1900 9085
              </a>
              <a
                className="button button-secondary"
                href="https://maps.app.goo.gl/DtzdH58QEz2p1iYW8"
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem trên Google Maps
              </a>
            </div>
          </div>

          <div className="logo-panel">
            <Image
              src="/brand/vuon-mang-den-logo.png"
              alt="Logo Vườn Măng Đen — Homestay & BBQ"
              width={1254}
              height={1254}
              priority
            />
          </div>
        </section>

        <section id="gioi-thieu" className="introduction" aria-labelledby="gioi-thieu-title">
          <div>
            <p className="eyebrow">Giới thiệu</p>
            <h2 id="gioi-thieu-title">Vườn Măng Đen — Homestay &amp; BBQ</h2>
          </div>
          <p>Nơi nghỉ dưỡng, giao lưu kết nối bạn bè.</p>
          <ul className="experience-list" aria-label="Không gian tại Vườn Măng Đen">
            <li>Homestay</li>
            <li>BBQ</li>
            <li>Kết nối</li>
          </ul>
        </section>

        <section id="lien-he" className="contact" aria-labelledby="lien-he-title">
          <div>
            <p className="eyebrow">Liên hệ</p>
            <h2 id="lien-he-title">Vườn Măng Đen</h2>
          </div>

          <address>
            <a href="tel:19009085">1900 9085</a>
            <a href="mailto:vuongmangden.com@gmail.com">vuongmangden.com@gmail.com</a>
            <a
              href="https://maps.app.goo.gl/DtzdH58QEz2p1iYW8"
              target="_blank"
              rel="noopener noreferrer"
            >
              26 Đường Phạm Văn Đồng, Măng Đen, Quảng Ngãi
            </a>
          </address>

          <nav className="social-links" aria-label="Mạng xã hội Vườn Măng Đen">
            {socialLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </section>
      </main>

      <footer className="site-footer">
        <p>Vườn Măng Đen — Homestay &amp; BBQ</p>
      </footer>
    </>
  );
}
