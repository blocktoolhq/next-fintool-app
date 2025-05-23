import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Fintool Chat Demo - AI Financial Research Assistant',
  description: 'Demo chat application showcasing Fintool\'s AI-powered financial research capabilities. Get instant answers from SEC filings, earnings calls, and financial data.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
