import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './styles.css';

const siteOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: 'Vườn Măng Đen — Homestay & BBQ', template: '%s — Vườn Măng Đen' },
  description: 'Nơi nghỉ dưỡng, giao lưu kết nối bạn bè.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
