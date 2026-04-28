import type { Metadata } from 'next';
import Script from 'next/script';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeProvider } from '@/components/Layout/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'cron-rs Dashboard',
  description: 'Web dashboard for cron-rs systemd timer management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
      </head>
      <body>
        <AntdRegistry>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
