import type { Metadata } from 'next';
import { Lora, Inter } from 'next/font/google';
import AnalyticsInit from '@/components/AnalyticsInit';
import './globals.css';

const displayFont = Lora({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sansFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DUCSU 2025 Leadership Evaluation',
  description:
    'Anonymous evaluation platform for DUCSU central elected leaders. Rate and review leadership performance securely.',
  openGraph: {
    title: 'DUCSU 2025 Leadership Evaluation',
    description: 'Rate DUCSU leadership performance anonymously',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-paper font-sans text-ink">
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
