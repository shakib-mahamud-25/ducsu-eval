import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white">{children}</body>
    </html>
  );
}
