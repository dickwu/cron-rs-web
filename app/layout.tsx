import type { Metadata } from 'next';
import Script from 'next/script';
import { ThemeBoot } from '@/components/Layout/ThemeBoot';
import { Providers } from '@/components/Layout/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'cron-rs · dashboard',
  description: 'Web dashboard for cron-rs systemd timer management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" data-density="comfortable">
      <head>
        <link
          rel="preload"
          href="/fonts/FiraCode-latin-wght.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
      </head>
      <body>
        <ThemeBoot />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
